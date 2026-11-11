/** Sealed Correspondence rules. Rule IDs (SC-*) are defined in docs/SEALED.md. */
import { randInt, seedRng, shuffle } from '../../../engine/rng';
import type { ApplyResult, PlayerResult } from '../../../engine/types';
import { normalizeText } from '../../../shared/protocol';
import { DEFAULT_TARGET, deckKinds, KINDS, NAMEABLE, value, type Kind } from './cards';
import { REACTIONS, type Card, type LogLine, type SAction, type SConfig, type Seat, type SState, type SView } from './types';

export const CHAT_MAX = 300;
export const CHAT_KEEP = 200;
export const LOG_KEEP = 150;

const refuse = (code: string, error: string): ApplyResult<SState> => ({ ok: false, code, error });

export const targetFor = (c: SConfig, n: number) => c.target || DEFAULT_TARGET[n];

export function setup(n: number, seed: string, config: SConfig, now = 0): SState {
  const rng = seedRng(seed);
  const s: SState = {
    config, rng, n, target: targetFor(config, n), round: 0, phase: 'play', turn: 0, current: 0, since: now,
    deck: [], reserve: null, faceUp: [],
    seats: Array.from({ length: n }, (): Seat => ({ hand: [], pile: [], out: false, guarded: false, favors: 0, secrets: [] })),
    next: null, log: [], rounds: [], chat: [], nextId: 1,
  };
  // SC-TURN1: the first round's opener is drawn by lot.
  deal(s, randInt(rng, n), now);
  return s;
}

/** SC-SET1–5: a fresh round. Everything a round leaves behind is cleared. */
function deal(s: SState, first: number, now: number) {
  s.round++;
  const kinds = shuffle(s.rng, deckKinds(s.config.ruleset));
  // Ids come from their own permutation, so an id says nothing about a card or where it sat in the deck (SC-SEC2).
  const ids = shuffle(s.rng, kinds.map((_, i) => s.round * 100 + i));
  s.deck = kinds.map((kind, i): Card => ({ id: ids[i], kind }));
  s.reserve = s.deck.shift()!;
  s.faceUp = s.n === 2 ? s.deck.splice(0, 3) : [];
  for (const x of s.seats) Object.assign(x, { hand: [s.deck.shift()!], pile: [], out: false, guarded: false, secrets: [] });
  s.phase = 'play';
  s.next = null;
  log(s, { t: 'round', round: s.round, start: first });
  startTurn(s, first, now);
}

const log = (s: SState, e: LogLine) => {
  s.log.push({ ...e, id: s.nextId++ });
  if (s.log.length > LOG_KEEP) s.log.splice(0, s.log.length - LOG_KEEP);
};

/** SC-TURN2: protection ends as your turn begins, then you draw. The deck is never empty here (SC-END1). */
function startTurn(s: SState, seat: number, now: number) {
  const x = s.seats[seat];
  x.guarded = false;
  x.hand.push(s.deck.shift()!);
  s.current = seat;
  s.since = now;
}

/** SC-OUT1: out of the round. The cards held are laid face up, with no effect. */
function knockOut(s: SState, seat: number) {
  const x = s.seats[seat];
  for (const card of x.hand) {
    x.pile.push({ card, how: 'discarded' });
    log(s, { t: 'discard', seat, kind: card.kind });
  }
  x.hand = [];
  x.out = true;
  x.guarded = false;
  log(s, { t: 'out', seat });
}

/** Players another player's card may choose: still in and not under the Confessor (SC-TGT1, SC-TGT2). */
export const choosable = (s: { seats: { out: boolean; guarded: boolean }[] }, by: number) =>
  s.seats.flatMap((x, i) => (i !== by && !x.out && !x.guarded ? [i] : []));

/** SC-DOW1: the Dowager must go when the other card is the Ambassador or the Magistrate. */
export function playable(hand: Card[]): number[] {
  const forced = hand.some((c) => c.kind === 'dowager') && hand.some((c) => c.kind === 'ambassador' || c.kind === 'magistrate');
  return hand.filter((c) => !forced || c.kind === 'dowager').map((c) => c.id);
}

const isSeat = (s: SState, v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < s.n;

export function apply(state: SState, seat: number, action: SAction, now = 0): ApplyResult<SState> {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return refuse('bad-action', 'Unknown action.');
  if (!isSeat(state, seat)) return refuse('not-seated', 'You are not playing.');
  const s = structuredClone(state);
  if (action.type === 'chat' || action.type === 'react') return talk(s, seat, action, now);
  if (s.phase === 'over') return refuse('over', 'The game is over.');
  if (action.turn !== s.turn) return refuse('stale', 'The table has moved on since then.');
  const r = action.type === 'play' ? play(s, seat, action, now) : action.type === 'file' ? file(s, seat, action, now) : action.type === 'deal' ? nextRound(s, seat, now) : refuse('bad-action', 'Unknown action.');
  if (r.ok) s.turn++;
  return r;
}

function talk(s: SState, seat: number, a: Extract<SAction, { type: 'chat' | 'react' }>, now: number): ApplyResult<SState> {
  if (a.type === 'chat') {
    const text = normalizeText(a.text, CHAT_MAX);
    if (!text) return refuse('bad-chat', 'Say something first.');
    s.chat.push({ id: s.nextId++, seat, text, at: now });
  } else {
    if (!REACTIONS.includes(a.key as (typeof REACTIONS)[number])) return refuse('bad-react', 'Unknown reaction.');
    s.chat.push({ id: s.nextId++, seat, react: a.key, at: now });
  }
  if (s.chat.length > CHAT_KEEP) s.chat.splice(0, s.chat.length - CHAT_KEEP);
  return { ok: true, state: s, undoable: false };
}

const done = (s: SState): ApplyResult<SState> => ({ ok: true, state: s, undoable: false });

function play(s: SState, seat: number, a: Extract<SAction, { type: 'play' }>, now: number): ApplyResult<SState> {
  if (s.phase !== 'play') return refuse('wrong-phase', 'Finish filing your cards first.');
  if (seat !== s.current) return refuse('not-your-turn', 'It is not your turn.');
  const me = s.seats[seat];
  const card = me.hand.find((c) => c.id === a.card);
  if (!card) return refuse('bad-card', 'That card is not in your hand.');
  if (!playable(me.hand).includes(card.id)) return refuse('dowager', 'With the Ambassador or the Magistrate in hand, you must play the Dowager.');
  const info = KINDS[card.kind];
  const open = choosable(s, seat);
  let target: number | undefined;
  if (info.targets === 'any') {
    // SC-MAG2: the Magistrate may always choose its owner, and must when no one else can be chosen.
    if (a.target !== seat && !open.includes(a.target as number)) return refuse('bad-target', 'Choose a player who is still in and not under the Confessor.');
    target = a.target;
  } else if (info.targets === 'other') {
    // SC-TGT3: with no one to choose, the card is played for no effect.
    if (open.length && !open.includes(a.target as number)) return refuse('bad-target', 'Choose another player who is still in and not under the Confessor.');
    if (!open.length && a.target !== undefined) return refuse('bad-target', 'No one can be chosen right now: play it without a target.');
    target = open.length ? a.target : undefined;
  } else if (a.target !== undefined) return refuse('bad-target', 'That card does not choose anyone.');
  if (card.kind === 'censor' && target !== undefined && !NAMEABLE.includes(a.guess as Kind)) return refuse('bad-guess', 'Name a character other than the Censor.');

  me.hand = me.hand.filter((c) => c !== card);
  me.pile.push({ card, how: 'played' });
  const line: Extract<LogLine, { t: 'play' }> = { t: 'play', seat, kind: card.kind, ...(target !== undefined ? { on: target } : {}) };
  if (info.targets === 'other' && target === undefined) line.idle = true;
  const them = target !== undefined ? s.seats[target] : null;

  switch (card.kind) {
    case 'heir': // SC-HEIR1
      log(s, line);
      knockOut(s, seat);
      break;
    case 'confessor': // SC-CON1
      me.guarded = true;
      log(s, line);
      break;
    case 'censor': // SC-CEN1
      if (them) {
        line.guess = a.guess;
        line.hit = them.hand[0].kind === a.guess;
      }
      log(s, line);
      if (line.hit) knockOut(s, target!);
      break;
    case 'scribe': // SC-SCR1
      log(s, line);
      if (them) me.secrets.push({ t: 'read', seat: target!, kind: them.hand[0].kind });
      break;
    case 'duelist': {
      // SC-DUE1: both see both cards; the table learns only who lost, and the loser's card as they go out.
      log(s, line);
      if (!them) break;
      const mine = me.hand[0].kind;
      const theirs = them.hand[0].kind;
      me.secrets.push({ t: 'duel', seat: target!, mine, theirs });
      them.secrets.push({ t: 'duel', seat, mine: theirs, theirs: mine });
      const loser = value(mine) < value(theirs) ? seat : value(theirs) < value(mine) ? target! : null;
      log(s, { t: 'duel', seat, on: target!, loser });
      if (loser !== null) knockOut(s, loser);
      break;
    }
    case 'ambassador': // SC-AMB1
      log(s, line);
      if (them) {
        const [mine, theirs] = [me.hand[0], them.hand[0]];
        me.hand = [theirs];
        them.hand = [mine];
        me.secrets.push({ t: 'trade', seat: target!, gave: mine.kind, got: theirs.kind });
        them.secrets.push({ t: 'trade', seat, gave: theirs.kind, got: mine.kind });
      }
      break;
    case 'magistrate': {
      // SC-MAG1: the discard has no effect of its own, except that a discarded Heir is out (SC-HEIR1).
      log(s, line);
      const gone = them!.hand.shift()!;
      them!.pile.push({ card: gone, how: 'discarded' });
      log(s, { t: 'discard', seat: target!, kind: gone.kind });
      if (gone.kind === 'heir') knockOut(s, target!);
      else {
        // SC-MAG3: with the deck empty, the replacement is the reserve card.
        const fresh = s.deck.shift() ?? s.reserve;
        if (fresh === s.reserve) s.reserve = null;
        if (fresh) them!.hand.push(fresh);
      }
      break;
    }
    case 'archivist': {
      // SC-ARC1: draw up to two; then the same player keeps one and files the rest (SC-ARC2). The Dowager rule does not apply.
      log(s, line);
      const drawn = s.deck.splice(0, 2);
      if (!drawn.length) break;
      me.hand.push(...drawn);
      s.phase = 'file';
      s.since = now;
      return done(s);
    }
    default: // dowager, informant: no effect when played.
      log(s, line);
  }
  endTurn(s, now);
  return done(s);
}

function file(s: SState, seat: number, a: Extract<SAction, { type: 'file' }>, now: number): ApplyResult<SState> {
  if (s.phase !== 'file' || seat !== s.current) return refuse('wrong-phase', 'There is nothing to file right now.');
  const me = s.seats[seat];
  const keep = me.hand.find((c) => c.id === a.keep);
  const rest = me.hand.filter((c) => c !== keep);
  const under = Array.isArray(a.under) ? a.under : [];
  if (!keep || under.length !== rest.length || new Set(under).size !== under.length || !under.every((id) => rest.some((c) => c.id === id)))
    return refuse('bad-file', 'Keep one card and put every other card under the deck.');
  me.hand = [keep];
  for (const id of under) s.deck.push(rest.find((c) => c.id === id)!);
  log(s, { t: 'file', seat, n: under.length });
  s.phase = 'play';
  endTurn(s, now);
  return done(s);
}

/** SC-END1: the round ends when one player is left, or when a finished turn leaves the deck empty. */
function endTurn(s: SState, now: number) {
  const left = s.seats.flatMap((x, i) => (x.out ? [] : [i]));
  if (left.length <= 1 || !s.deck.length) return endRound(s, left);
  let next = s.current;
  do next = (next + 1) % s.n;
  while (s.seats[next].out);
  startTurn(s, next, now);
}

function endRound(s: SState, left: number[]) {
  const showdown = left.length > 1;
  const shown = s.seats.map((x) => (showdown && !x.out ? x.hand[0].kind : null));
  // SC-END2: at a showdown every player tied for the highest card wins the round.
  const best = Math.max(...left.map((i) => value(s.seats[i].hand[0].kind)));
  const winners = showdown ? left.filter((i) => value(s.seats[i].hand[0].kind) === best) : left;
  // SC-INF1: an Informant favor needs exactly one surviving player who played or discarded one.
  const spies = left.filter((i) => s.seats[i].pile.some((p) => p.card.kind === 'informant'));
  const informant = spies.length === 1 ? spies[0] : null;
  for (const i of winners) s.seats[i].favors++;
  if (informant !== null) s.seats[informant].favors++;
  s.rounds.push({ round: s.round, end: showdown ? 'showdown' : 'last', shown, winners, informant, reserve: s.reserve?.kind ?? null });
  // SC-WIN2: everyone who has reached the target when it is first reached wins together.
  if (s.seats.some((x) => x.favors >= s.target)) {
    s.phase = 'over';
    return;
  }
  s.phase = 'between';
  // SC-TURN3: a round's winner opens the next; tied winners are chosen between by lot.
  s.next = winners[winners.length === 1 ? 0 : randInt(s.rng, winners.length)];
}

function nextRound(s: SState, seat: number, now: number): ApplyResult<SState> {
  if (s.phase !== 'between') return refuse('wrong-phase', 'The round is still being played.');
  if (seat !== s.next) return refuse('not-your-turn', 'The next round is dealt by its first player.');
  deal(s, seat, now);
  return done(s);
}

export function actors(s: SState): number[] {
  if (s.phase === 'over') return [];
  return [s.phase === 'between' ? s.next! : s.current];
}

export function project(s: SState, viewer: number | null): SView {
  const me = viewer !== null && viewer >= 0 && viewer < s.n ? s.seats[viewer] : null;
  const mine = viewer !== null && me && s.phase === 'play' && s.current === viewer;
  return {
    config: s.config,
    n: s.n,
    target: s.target,
    round: s.round,
    phase: s.phase,
    turn: s.turn,
    current: s.current,
    since: s.since,
    deck: s.deck.length,
    reserve: !!s.reserve,
    faceUp: s.faceUp,
    players: s.seats.map((x, seat) => ({ seat, hand: x.hand.length, pile: x.pile, out: x.out, guarded: x.guarded, favors: x.favors })),
    next: s.next,
    log: s.log,
    rounds: s.rounds,
    chat: s.chat,
    me: me
      ? { seat: viewer!, hand: me.hand, secrets: me.secrets, playable: mine ? playable(me.hand) : [], targets: choosable(s, viewer!) }
      : null,
  };
}

export function results(s: SState): PlayerResult[] | null {
  if (s.phase !== 'over') return null;
  const favors = s.seats.map((x) => x.favors);
  return favors.map((f, seat) => ({
    seat,
    score: f,
    rank: 1 + favors.filter((g) => g > f).length,
    winner: f >= s.target,
    detail: `${f} favor${f === 1 ? '' : 's'}`,
  }));
}
