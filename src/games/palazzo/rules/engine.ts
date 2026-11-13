/** Palazzo rules. Rule IDs (PZ-*) are defined in docs/PALAZZO.md. */
import { randInt, seedRng, shuffle } from '../../../engine/rng';
import type { ApplyResult, PlayerResult } from '../../../engine/types';
import { normalizeText } from '../../../shared/protocol';
import { COPIES, KINDS, ROLE_ORDER, whyNot, type Kind, type Role } from './roles';
import {
  CHAT_KEEP,
  CHAT_MAX,
  LOG_KEEP,
  REACTIONS,
  type Card,
  type LogEntry,
  type Loss,
  type PAction,
  type PConfig,
  type PState,
  type PView,
  type Seat,
  type Window,
} from './types';

/** A window that resumes after a pause never has less than this left (PZ-NET3). */
export const RESUME_MIN_MS = 5000;

const refuse = (code: string, error: string): ApplyResult<PState> => ({ ok: false, code, error });
const done = (s: PState): ApplyResult<PState> => ({ ok: true, state: s, undoable: false });

export const hidden = (x: Seat) => x.hand.filter((c) => !c.up);
export const isOut = (x: Seat) => !x.hand.some((c) => !c.up);
const living = (s: PState) => s.seats.flatMap((x, i) => (isOut(x) ? [] : [i]));
const facts = (s: PState) => s.seats.map((x) => ({ coins: x.coins, hidden: hidden(x).length }));

type Entry = LogEntry extends infer E ? (E extends unknown ? Omit<E, 'id' | 'at'> : never) : never;
function log(s: PState, e: Entry, now: number) {
  s.log.push({ ...e, id: s.nextId++, at: now } as LogEntry);
  if (s.log.length > LOG_KEEP) s.log.splice(0, s.log.length - LOG_KEEP);
}

export function setup(n: number, seed: string, config: PConfig, now = 0, winners: number[] = []): PState {
  const rng = seedRng(seed);
  // PZ-SET1: fifteen cards, three of each role. Ids are their own permutation, so an id says nothing about a role.
  const roles = shuffle(rng, ROLE_ORDER.flatMap((r) => Array<Role>(COPIES).fill(r)));
  const ids = shuffle(rng, roles.map((_, i) => i + 1));
  const deck = roles.map((role, i): Card => ({ id: ids[i], role, up: false }));
  const draft = config.draft && n === 2;
  // PZ-SET5: the last game's winner opens a rematch; otherwise the opener is drawn by lot.
  const first = winners.length === 1 && winners[0] < n ? winners[0] : randInt(rng, n);
  const seats = Array.from({ length: n }, (_, i): Seat => ({ hand: deck.splice(0, draft ? 3 : 2), coins: n === 2 && i === first ? 1 : 2 }));
  const s: PState = {
    n, config, rng, deck, seats,
    phase: draft ? 'draft' : 'turn',
    step: 1, turn: 1, current: first,
    drafting: draft ? [0, 1] : [],
    pend: null, window: null, losses: [], seen: [],
    online: seats.map(() => true), pause: null, winner: null, at: now,
    log: [], chat: [], nextId: 1,
  };
  log(s, { t: 'start', seat: first, draft }, now);
  return s;
}

export function apply(state: PState, seat: number, action: PAction, now = 0): ApplyResult<PState> {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return refuse('bad-action', 'Unknown action.');
  if (!Number.isInteger(seat) || seat < 0 || seat >= state.n) return refuse('not-seated', 'You are not playing.');
  const s = structuredClone(state);
  s.at = now;
  if (action.type === 'chat' || action.type === 'react') return talk(s, seat, action, now);
  if (s.phase === 'over') return refuse('over', 'The game is over.');
  // PZ-NET1: every decision has its own step, so a late or repeated answer can't land on the next one.
  if (action.step !== s.step) return refuse('stale', 'Too late: the table has already moved on.');
  if (s.pause) return refuse('paused', 'The table is paused until everyone is back.');
  if (isOut(s.seats[seat])) return refuse('out', 'You are out of the game and can only watch.');
  switch (action.type) {
    case 'declare':
      return declare(s, seat, action, now);
    case 'respond':
      return respond(s, seat, action, now);
    case 'reveal':
      return reveal(s, seat, action.card, now);
    case 'return':
      return s.phase === 'draft' ? draftReturn(s, seat, action.card, now) : parleyReturn(s, seat, action.card, now);
    default:
      return refuse('bad-action', 'Unknown action.');
  }
}

/** PZ-CHAT1–3: chat and reactions at any time. An eliminated player only reaches other eliminated players. */
function talk(s: PState, seat: number, a: Extract<PAction, { type: 'chat' | 'react' }>, now: number): ApplyResult<PState> {
  const ghost = isOut(s.seats[seat]) && s.phase !== 'over' ? { ghost: true } : {};
  if (a.type === 'chat') {
    const text = normalizeText(a.text, CHAT_MAX);
    if (!text) return refuse('bad-chat', 'Say something first.');
    s.chat.push({ id: s.nextId++, seat, text, at: now, ...ghost });
  } else {
    if (!REACTIONS.includes(a.key)) return refuse('bad-react', 'Unknown reaction.');
    s.chat.push({ id: s.nextId++, seat, react: a.key, at: now, ...ghost });
  }
  if (s.chat.length > CHAT_KEEP) s.chat.splice(0, s.chat.length - CHAT_KEEP);
  return done(s);
}

/** PZ-TURN1–3, PZ-ACT1–3: the player whose turn it is names one action and pays its cost. */
function declare(s: PState, seat: number, a: Extract<PAction, { type: 'declare' }>, now: number): ApplyResult<PState> {
  if (s.phase !== 'turn' || seat !== s.current) return refuse('not-your-turn', 'It is not your turn.');
  if (!Object.hasOwn(KINDS, a.kind)) return refuse('bad-action', 'Unknown action.');
  const k = KINDS[a.kind];
  const why = whyNot(facts(s), seat, a.kind, a.target);
  if (why) return refuse('illegal', why);
  s.seats[seat].coins -= k.cost;
  s.pend = { kind: a.kind, actor: seat, ...(k.target ? { target: a.target } : {}), stage: k.role ? 'challenge' : k.blockBy ? 'block' : 'resolve' };
  log(s, { t: 'declare', seat, kind: a.kind, ...(k.target ? { target: a.target } : {}) }, now);
  advance(s, now);
  return done(s);
}

/** PZ-RESP1–4: answers in a response window. */
function respond(s: PState, seat: number, a: Extract<PAction, { type: 'respond' }>, now: number): ApplyResult<PState> {
  const w = s.window;
  if (s.phase !== 'window' || !w) return refuse('no-window', 'There is nothing to answer right now.');
  if (!w.open.includes(seat)) return refuse('not-yours', 'This decision is not yours.');
  if (w.passed.includes(seat)) return refuse('answered', 'You already let it stand.');
  if (a.choice === 'pass') {
    w.passed.push(seat);
    if (w.passed.length === w.open.length) close(s, now);
    return done(s);
  }
  if (a.choice === 'challenge' && w.kind !== 'block') return challenge(s, seat, now);
  if (a.choice === 'block' && w.kind === 'block') {
    const p = s.pend!;
    p.blocker = seat;
    p.stage = 'counter';
    s.window = null;
    log(s, { t: 'block', seat, role: KINDS[p.kind].blockRole! }, now);
    advance(s, now);
    return done(s);
  }
  return refuse('bad-action', a.choice === 'block' ? 'This cannot be blocked now.' : 'There is no claim to challenge now.');
}

/** PZ-RESP3: everyone let it stand, or the clock ran out (PZ-TIME2). */
function close(s: PState, now: number) {
  const p = s.pend!;
  const kind = s.window!.kind;
  s.window = null;
  if (kind === 'challenge') p.stage = KINDS[p.kind].blockBy ? 'block' : 'resolve';
  else if (kind === 'block') p.stage = 'resolve';
  else {
    log(s, { t: 'blocked', seat: p.actor, kind: p.kind }, now);
    p.stage = 'done';
  }
  advance(s, now);
}

/** PZ-CHAL1–5: the first challenge settles the claim at once. */
function challenge(s: PState, seat: number, now: number): ApplyResult<PState> {
  const p = s.pend!;
  const onBlock = s.window!.kind === 'counter';
  const claimant = onBlock ? p.blocker! : p.actor;
  const role = (onBlock ? KINDS[p.kind].blockRole : KINDS[p.kind].role)!;
  const hand = s.seats[claimant].hand;
  const slot = hand.findIndex((c) => !c.up && c.role === role);
  s.window = null;
  log(s, { t: 'challenge', seat, of: claimant, role, truthful: slot >= 0 }, now);
  if (slot >= 0) {
    // PZ-CHAL2: the shown card goes back into the deck, which is shuffled, and a fresh card takes its place.
    s.deck.push(hand[slot]);
    shuffle(s.rng, s.deck);
    hand[slot] = s.deck.shift()!;
    lapse(s, claimant);
    log(s, { t: 'replace', seat: claimant }, now);
    s.losses.push({ seat, why: 'challenge' });
    if (onBlock) {
      log(s, { t: 'blocked', seat: p.actor, kind: p.kind }, now);
      p.stage = 'done';
    } else p.stage = KINDS[p.kind].blockBy ? 'block' : 'resolve';
  } else {
    s.losses.push({ seat: claimant, why: 'challenge' });
    if (onBlock) p.stage = 'resolve';
    else {
      // PZ-STRK2: a Strike exposed as a bluff gives its 3 coins back.
      const refund = p.kind === 'strike' ? KINDS.strike.cost : 0;
      s.seats[p.actor].coins += refund;
      log(s, { t: 'failed', seat: p.actor, kind: p.kind, refund }, now);
      p.stage = 'done';
    }
  }
  advance(s, now);
  return done(s);
}

/** PZ-LOSE1: the losing player picks which hidden card to turn face up. */
function reveal(s: PState, seat: number, card: number, now: number): ApplyResult<PState> {
  const l = s.losses[0];
  if (s.phase !== 'lose' || !l || l.seat !== seat) return refuse('not-yours', 'You have no card to lose right now.');
  const c = s.seats[seat].hand.find((x) => x.id === card && !x.up);
  if (!c) return refuse('bad-card', 'Choose one of your hidden cards.');
  turnUp(s, l, c, now);
  s.losses.shift();
  advance(s, now);
  return done(s);
}

function turnUp(s: PState, l: Loss, c: Card, now: number) {
  c.up = true;
  lapse(s, l.seat);
  log(s, { t: 'lose', seat: l.seat, role: c.role, why: l.why }, now);
  if (isOut(s.seats[l.seat])) {
    s.seats[l.seat].outAt = s.nextId;
    // PZ-SPEC1: an eliminated player becomes a spectator and keeps no private knowledge.
    s.seen = s.seen.filter((x) => x.by !== l.seat);
    log(s, { t: 'out', seat: l.seat }, now);
  }
}

/** PZ-SENT3: anything seen of a player's hidden cards stops counting once any of them changes. */
function lapse(s: PState, seat: number) {
  for (const x of s.seen) if (x.seat === seat) x.lapsed = true;
}

/** PZ-PARL1–3: return one hidden card or the drawn one. A returned hand card's slot takes the drawn card. */
function parleyReturn(s: PState, seat: number, card: number, now: number): ApplyResult<PState> {
  const p = s.pend;
  if (s.phase !== 'parley' || !p?.drawn || p.actor !== seat) return refuse('not-yours', 'You have nothing to return right now.');
  const hand = s.seats[seat].hand;
  const slot = hand.findIndex((c) => c.id === card && !c.up);
  if (card === p.drawn.id) s.deck.push(p.drawn);
  else if (slot >= 0) {
    s.deck.push(hand[slot]);
    hand[slot] = p.drawn;
  } else return refuse('bad-card', 'Return one of your hidden cards or the card you drew.');
  shuffle(s.rng, s.deck);
  // Nobody else knows which card went back, so whatever anyone saw of this hand lapses either way.
  lapse(s, seat);
  delete p.drawn;
  p.stage = 'done';
  advance(s, now);
  return done(s);
}

/** PZ-SET4: each player returns one of their three opening cards. */
function draftReturn(s: PState, seat: number, card: number, now: number): ApplyResult<PState> {
  if (!s.drafting.includes(seat)) return refuse('not-yours', 'You have already chosen your two cards.');
  const hand = s.seats[seat].hand;
  const slot = hand.findIndex((c) => c.id === card);
  if (slot < 0) return refuse('bad-card', 'Return one of your three cards.');
  s.deck.push(...hand.splice(slot, 1));
  s.drafting = s.drafting.filter((x) => x !== seat);
  if (!s.drafting.length) {
    shuffle(s.rng, s.deck);
    s.phase = 'turn';
    s.step++;
    log(s, { t: 'drafted' }, now);
  }
  return done(s);
}

function openWindow(s: PState, kind: Window['kind'], open: number[], now: number) {
  s.window = { kind, open, passed: [], deadline: now + s.config.timer * 1000 };
  s.phase = 'window';
  s.step++;
}

/** Run every automatic step until someone has a decision to make, or the game ends. */
function advance(s: PState, now: number) {
  for (;;) {
    if (ended(s, now)) return;
    // PZ-LOSE1–2: losses come first, in the order they arose.
    while (s.losses.length) {
      const l = s.losses[0];
      const h = hidden(s.seats[l.seat]);
      if (h.length > 1) {
        if (s.phase !== 'lose') {
          s.phase = 'lose';
          s.step++;
        }
        return;
      }
      if (h.length === 1) turnUp(s, l, h[0], now);
      s.losses.shift();
      if (ended(s, now)) return;
    }
    const p = s.pend;
    if (!p) return nextTurn(s, now);
    const k = KINDS[p.kind];
    const alive = (i: number | undefined) => i !== undefined && !isOut(s.seats[i]);
    switch (p.stage) {
      case 'challenge':
        return openWindow(s, 'challenge', living(s).filter((i) => i !== p.actor), now);
      case 'block': {
        const may = k.blockBy === 'any' ? living(s).filter((i) => i !== p.actor) : k.blockBy === 'target' && alive(p.target) ? [p.target!] : [];
        if (may.length) return openWindow(s, 'block', may, now);
        p.stage = 'resolve';
        break;
      }
      case 'counter':
        return openWindow(s, 'counter', living(s).filter((i) => i !== p.blocker), now);
      case 'resolve':
        resolve(s, now);
        break;
      case 'parley':
        if (s.phase !== 'parley') {
          s.phase = 'parley';
          s.step++;
        }
        return;
      case 'done':
        s.pend = null;
        break;
    }
  }
}

/** PZ-ACT*, PZ-ROLE*: the action takes effect. PZ-STRK4: one aimed at a player who is already out fizzles. */
function resolve(s: PState, now: number) {
  const p = s.pend!;
  const me = s.seats[p.actor];
  p.stage = 'done';
  if (KINDS[p.kind].target && isOut(s.seats[p.target!])) return log(s, { t: 'fizzle', seat: p.actor, kind: p.kind }, now);
  const gain = (n: number) => {
    me.coins += n;
    log(s, { t: 'coins', seat: p.actor, n }, now);
  };
  switch (p.kind) {
    case 'income':
      return gain(1);
    case 'levy':
      return gain(2);
    case 'collect':
      return gain(3);
    case 'seize': {
      const t = s.seats[p.target!];
      const n = Math.min(2, t.coins);
      t.coins -= n;
      me.coins += n;
      return log(s, { t: 'coins', seat: p.actor, n, from: p.target }, now);
    }
    case 'strike':
    case 'depose':
      s.losses.push({ seat: p.target!, why: p.kind });
      return;
    case 'parley':
      gain(1);
      p.drawn = s.deck.shift()!;
      p.stage = 'parley';
      return log(s, { t: 'parley', seat: p.actor }, now);
    case 'inspect': {
      const h = hidden(s.seats[p.target!]);
      const c = h[randInt(s.rng, h.length)];
      s.seen = s.seen.filter((x) => !(x.by === p.actor && x.seat === p.target));
      s.seen.push({ by: p.actor, seat: p.target!, card: c.id, role: c.role, lapsed: false });
      return log(s, { t: 'inspect', seat: p.actor, target: p.target! }, now);
    }
  }
}

/** PZ-WIN0: the last player with influence wins at once, even partway through an action. */
function ended(s: PState, now: number) {
  const left = living(s);
  if (left.length > 1) return false;
  s.phase = 'over';
  s.winner = left[0] ?? null;
  s.pend = null;
  s.window = null;
  s.losses = [];
  s.step++;
  if (s.winner !== null) log(s, { t: 'win', seat: s.winner }, now);
  return true;
}

function nextTurn(s: PState, now: number) {
  let next = s.current;
  do next = (next + 1) % s.n;
  while (isOut(s.seats[next]));
  s.current = next;
  s.turn++;
  s.phase = 'turn';
  s.step++;
  void now;
}

/** Seats whose own decision the table is waiting on. Windows are optional and never count (PZ-NET4). */
function mandatory(s: PState): number[] {
  if (s.phase === 'draft') return s.drafting;
  if (s.phase === 'turn') return [s.current];
  if (s.phase === 'lose') return [s.losses[0].seat];
  if (s.phase === 'parley') return [s.pend!.actor];
  return [];
}

/** PZ-NET2–4, PZ-TIME2: follow who is connected, pause or resume, and close a window whose time is up. */
export function tick(state: PState, now: number, online: boolean[]): PState | null {
  let s: PState | null = null;
  const edit = () => (s ??= structuredClone(state));
  if (online.length === state.n && online.some((x, i) => x !== state.online[i])) edit().online = [...online];
  if (state.phase === 'over') return s;
  const cur = (): PState => s ?? state;
  const away = (cur().config.disconnect === 'pause' ? living(cur()) : mandatory(cur())).filter((i) => !cur().online[i] && !isOut(cur().seats[i]));
  const pause = cur().pause;
  if (away.length && !pause) {
    const x = edit();
    x.pause = { since: now, seats: away };
    if (x.window) x.window.left = Math.max(0, x.window.deadline - now);
    log(x, { t: 'pause', seats: away }, now);
  } else if (away.length && pause && away.join() !== pause.seats.join()) edit().pause!.seats = away;
  else if (!away.length && pause) {
    const x = edit();
    x.pause = null;
    if (x.window) {
      x.window.deadline = now + Math.max(RESUME_MIN_MS, x.window.left ?? 0);
      delete x.window.left;
    }
    log(x, { t: 'resume' }, now);
  }
  const w = cur().window;
  if (!cur().pause && w && now >= w.deadline) {
    const x = edit();
    log(x, { t: 'timeout', window: w.kind }, now);
    close(x, now);
  }
  if (s) (s as PState).at = now;
  return s;
}

export const wakeAt = (s: PState) => (s.phase !== 'over' && !s.pause && s.window ? s.window.deadline : null);

export function actors(s: PState): number[] {
  if (s.phase === 'window') return s.window!.open.filter((i) => !s.window!.passed.includes(i));
  return s.phase === 'over' ? [] : mandatory(s);
}

/** PZ-NET6, PZ-SENT2, PZ-SPEC1–2: what one seat (or an unseated observer) may know. */
export function project(s: PState, viewer: number | null): PView {
  const seated = viewer !== null && viewer >= 0 && viewer < s.n ? viewer : null;
  const ghost = seated !== null && isOut(s.seats[seated]);
  const p = s.pend;
  return {
    n: s.n,
    you: seated,
    config: s.config,
    phase: s.phase,
    step: s.step,
    turn: s.turn,
    current: s.current,
    players: s.seats.map((x, i) => ({ coins: x.coins, cards: x.hand.map((c) => (c.up ? c.role : null)), out: isOut(x), online: s.online[i] })),
    deck: s.deck.length,
    drafting: s.drafting,
    pend: p ? { kind: p.kind, actor: p.actor, stage: p.stage, ...(p.target !== undefined ? { target: p.target } : {}), ...(p.blocker !== undefined ? { blocker: p.blocker } : {}) } : null,
    window: s.window ? structuredClone(s.window) : null,
    losing: s.phase === 'lose' ? s.losses[0] : null,
    pause: s.pause,
    winner: s.winner,
    at: s.at,
    log: s.log,
    chat: s.chat.filter((c) => !c.ghost || ghost || s.phase === 'over'),
    me:
      seated === null
        ? null
        : {
            hand: structuredClone(s.seats[seated].hand),
            ...(p?.drawn && p.actor === seated ? { drawn: { ...p.drawn } } : {}),
            seen: s.seen.filter((x) => x.by === seated).map((x) => ({ seat: x.seat, role: x.role, lapsed: x.lapsed })),
          },
  };
}

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];

/** PZ-WIN0: the winner first, then everyone else by how long they lasted. */
export function results(s: PState): PlayerResult[] | null {
  if (s.phase !== 'over') return null;
  const order = s.seats.map((_, i) => i).sort((a, b) => (b === s.winner ? 1 : 0) - (a === s.winner ? 1 : 0) || (s.seats[b].outAt ?? 0) - (s.seats[a].outAt ?? 0));
  return order.map((seat, i) => ({
    seat,
    score: s.n - 1 - i,
    rank: i + 1,
    winner: seat === s.winner,
    detail: seat === s.winner ? 'Last one standing' : i === 1 ? 'Out last' : `Out ${ORDINAL[s.n - i - 1] ?? ''}`.trim(),
  }));
}

export type { Kind };
