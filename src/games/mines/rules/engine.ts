/** Miners & Saboteurs rules. Rule IDs (MS-*) are defined in docs/MINES.md. */
import { randInt, seedRng, shuffle } from '../../../engine/rng';
import type { ApplyResult, PlayerResult } from '../../../engine/types';
import { normalizeText } from '../../../shared/protocol';
import { crystalsShowing, GOAL_SPOTS, goldJoined, handSpots, key, misfit, reach, revealReached } from './board';
import {
  ACTION, CLASSIC_DECK, CLASSIC_POOL, classicHand, EXPANDED_ROLES, EXPANSION_DECK, expandedPay, isTunnel, REWARD_CARDS, SABOTEUR_PAY,
  type GoalKind, type Role, type Tool,
} from './cards';
import { REACTIONS, type Card, type LogLine, type MAction, type MConfig, type MState, type MView, type RoundRecord, type Seat } from './types';

export const CHAT_MAX = 300;
export const CHAT_KEEP = 200;
export const LOG_KEEP = 120;
/** Expanded: cards set aside unseen at the start of each round (MS-X-SETUP1). */
export const SET_ASIDE = 10;
export const EXPANDED_HAND = 6;
export const DUEL_HAND = 6;
/** Duel pay (MS-D-PAY1). */
export const DUEL_FINDER = 3;
export const DUEL_OTHER = 1;

const refuse = (code: string, error: string): ApplyResult<MState> => ({ ok: false, code, error });

export const handSize = (c: MConfig, n: number) => (c.mode === 'classic' ? classicHand(n) : c.mode === 'duel' ? DUEL_HAND : EXPANDED_HAND);

const expand = (list: [string, number][]) => list.flatMap(([k, n]) => Array<string>(n).fill(k));
export const deckKinds = (mode: MConfig['mode']) => [...expand(CLASSIC_DECK), ...(mode === 'expanded' ? expand(EXPANSION_DECK) : [])];
const rewardCards = () => REWARD_CARDS.flatMap(([v, n]) => Array<number>(n).fill(v));

export function setup(n: number, seed: string, config: MConfig, now = 0): MState {
  const rng = seedRng(seed);
  const s: MState = {
    config, rng, n, round: 0, phase: 'play', turn: 0, current: 0, opener: 0, since: now,
    deck: [], removed: [], discards: 0, cells: {}, goals: [],
    seats: Array.from({ length: n }, (): Seat => ({ hand: [], role: null, broken: [], theft: false, trap: false, gold: 0, rewards: [], seen: [] })),
    spareRoles: [], rewardDeck: config.mode === 'classic' ? shuffle(rng, rewardCards()) : [],
    draft: null, thieves: [], theftOrder: [], lastActor: 0, pending: null, log: [], rounds: [], chat: [], nextId: 1,
  };
  // MS-TURN1: who opens the first round is drawn by lot.
  startRound(s, randInt(rng, n), now);
  stamp(s, 0, now);
  return s;
}

function startRound(s: MState, first: number, now: number) {
  s.round++;
  // Card ids follow shuffled order, so an id never tells anyone what a card is (MS-SEC2).
  s.deck = shuffle(s.rng, deckKinds(s.config.mode)).map((kind, i): Card => ({ id: s.round * 1000 + i, kind }));
  s.removed = s.config.mode === 'expanded' ? s.deck.splice(0, SET_ASIDE) : [];
  s.discards = 0;
  s.cells = { [key(0, 0)]: { kind: 'entrance', rot: 0 } };
  const kinds = shuffle(s.rng, ['gold', 'coalL', 'coalR'] as GoalKind[]);
  s.goals = GOAL_SPOTS.map((p, i) => ({ ...p, kind: kinds[i], revealed: false }));
  let roles: (Role | null)[] = Array(s.n).fill(null);
  s.spareRoles = [];
  if (s.config.mode !== 'duel') {
    const pool: Role[] =
      s.config.mode === 'classic'
        ? [...Array(CLASSIC_POOL[s.n][0]).fill('miner'), ...Array(CLASSIC_POOL[s.n][1]).fill('saboteur')]
        : EXPANDED_ROLES.flatMap(([r, c]) => Array<Role>(c).fill(r));
    shuffle(s.rng, pool);
    roles = pool.slice(0, s.n);
    s.spareRoles = pool.slice(s.n);
    // MS-C-ROLE2, MS-X-ROLE2: someone at the table is always a saboteur. If none was dealt, one dealt role trades places
    // with a set-aside saboteur, so the pool and its hidden leftovers keep their make-up.
    if (!roles.includes('saboteur')) {
      const i = randInt(s.rng, s.n);
      const j = s.spareRoles.indexOf('saboteur');
      [roles[i], s.spareRoles[j]] = [s.spareRoles[j], roles[i]!];
    }
  }
  const size = handSize(s.config, s.n);
  s.seats.forEach((x, i) => {
    x.hand = s.deck.splice(0, size);
    x.role = roles[i];
    x.broken = [];
    x.theft = false;
    x.trap = false;
  });
  s.theftOrder = [];
  s.thieves = [];
  s.draft = null;
  s.pending = null;
  s.phase = 'play';
  s.current = first;
  s.opener = first;
  s.lastActor = first;
  s.since = now;
  pushLog(s, { t: 'round', round: s.round, start: first });
}

const pushLog = (s: MState, e: LogLine) => {
  s.log.push({ ...e, id: s.nextId++, at: 0 });
  if (s.log.length > LOG_KEEP) s.log.splice(0, s.log.length - LOG_KEEP);
};

/** Classic and duel: a broken tool stops digging. Expanded: so does being locked in (MS-C-TOOL1, MS-X-TRAP1). */
export const cannotDig = (x: Seat) => x.broken.length > 0 || x.trap;

const takeCards = (x: Seat, ids: number[]): Card[] | null => {
  if (new Set(ids).size !== ids.length) return null;
  const idx = ids.map((id) => x.hand.findIndex((c) => c.id === id));
  if (idx.some((i) => i < 0)) return null;
  const out = idx.map((i) => x.hand[i]);
  x.hand = x.hand.filter((c) => !ids.includes(c.id));
  return out;
};

/** Time every log line written since id `from`; the rules below the turn loop never see the clock. */
const stamp = (s: MState, from: number, now: number) => {
  for (const e of s.log) if (e.id >= from) e.at = now;
};

/** Returns how many were drawn: fewer than asked once the deck runs out. */
const draw = (s: MState, x: Seat, n: number) => {
  let got = 0;
  for (; got < n && s.deck.length; got++) x.hand.push(s.deck.shift()!);
  return got;
};

const isSeat = (s: MState, v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < s.n;

/** The move is done: draw, then pass to the next seat that still holds cards, or end a round with nothing left (MS-TURN2/3). */
function endTurn(s: MState, seat: number, draws: number, now: number) {
  const n = draw(s, s.seats[seat], draws);
  s.lastActor = seat;
  if (!s.deck.length && s.seats.every((x) => !x.hand.length)) {
    pushLog(s, { t: 'draw', seat, n, next: null });
    return endRound(s, 'dry', null, now);
  }
  let next = seat;
  do next = (next + 1) % s.n;
  while (!s.seats[next].hand.length);
  pushLog(s, { t: 'draw', seat, n, next });
  s.current = next;
  s.since = now;
}

export function apply(state: MState, seat: number, action: MAction, now = 0): ApplyResult<MState> {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return refuse('bad-action', 'Unknown action.');
  if (!isSeat(state, seat)) return refuse('not-seated', 'You are not playing.');
  const s = structuredClone(state);
  if (action.type === 'chat' || action.type === 'react') return talk(s, seat, action, now);
  if (s.phase === 'over') return refuse('over', 'The game is over.');
  if (action.turn !== s.turn) return refuse('stale', 'The table has moved on since then.');
  if (action.type === 'timeout') {
    if (!s.config.timer || now < s.since + s.config.timer * 1000) return refuse('early', 'There is still time on the clock.');
    const first = s.nextId;
    const r = autoMove(s, now);
    if (r.ok) stamp(s, first, now);
    return r;
  }
  const first = s.nextId;
  const r =
    s.phase === 'draft' ? pick(s, seat, action, now) : s.phase === 'theft' ? steal(s, seat, action, now) : play(s, seat, action, now);
  if (r.ok) stamp(s, first, now);
  return r;
}

function talk(s: MState, seat: number, a: Extract<MAction, { type: 'chat' | 'react' }>, now: number): ApplyResult<MState> {
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

/** The clock ran out: the seat that is up makes the least meaningful move there is (MS-TIME2). */
function autoMove(s: MState, now: number): ApplyResult<MState> {
  if (s.phase === 'draft') return pick(s, s.draft!.picker, { type: 'pick', turn: s.turn, index: 0 }, now, true);
  if (s.phase === 'theft') return steal(s, s.thieves[0], { type: 'steal', turn: s.turn, from: null }, now, true);
  const x = s.seats[s.current];
  return play(s, s.current, { type: 'pass', turn: s.turn, cards: [x.hand[0].id] }, now, true);
}

/** The single non-strategic move for a seat that is up, used by the timer and by an absent player's stand-in. */
export function autoAction(s: { phase: MState['phase']; turn: number }, hand: Card[]): MAction | null {
  if (s.phase === 'draft') return { type: 'pick', turn: s.turn, index: 0 };
  if (s.phase === 'theft') return { type: 'steal', turn: s.turn, from: null };
  if (s.phase === 'play' && hand.length) return { type: 'pass', turn: s.turn, cards: [hand[0].id] };
  return null;
}

function play(s: MState, seat: number, a: MAction, now: number, auto = false): ApplyResult<MState> {
  if (seat !== s.current) return refuse('not-your-turn', 'It is not your turn.');
  const me = s.seats[seat];
  const ok = (): ApplyResult<MState> => {
    s.turn++;
    return { ok: true, state: s, undoable: false };
  };
  switch (a.type) {
    case 'path': {
      const card = me.hand.find((c) => c.id === a.card);
      if (!card || !isTunnel(card.kind)) return refuse('bad-card', 'That tunnel card is not in your hand.');
      if (me.trap) return refuse('trapped', 'You are locked in and cannot lay tunnels.');
      if (me.broken.length) return refuse('broken', 'Mend your tools before you lay tunnels.');
      if (!Number.isInteger(a.x) || !Number.isInteger(a.y) || (a.rot !== 0 && a.rot !== 1)) return refuse('bad-spot', 'Choose a square and a turn.');
      const why = misfit(s.cells, s.goals, reach(s.cells), card.kind, a.x, a.y, a.rot);
      if (why) return refuse('misfit', why);
      const fits = handSpots(s.cells, s.goals, me.hand.filter((c) => isTunnel(c.kind)))[card.id];
      if (!fits.some((p) => p.x === a.x && p.y === a.y && p.rot === a.rot)) return refuse('outside', 'Build inside the starting area while one of your tunnels fits there.');
      takeCards(me, [card.id]);
      s.cells[key(a.x, a.y)] = { kind: card.kind, rot: a.rot, by: seat };
      pushLog(s, { t: 'path', seat, kind: card.kind, x: a.x, y: a.y, rot: a.rot });
      for (const i of revealReached(s.cells, s.goals)) pushLog(s, { t: 'reveal', goal: i, kind: s.goals[i].kind });
      s.lastActor = seat;
      if (s.goals.some((g) => g.kind === 'gold' && g.revealed)) endRound(s, 'gold', seat, now);
      else endTurn(s, seat, 1, now);
      return ok();
    }
    case 'act': {
      const card = me.hand.find((c) => c.id === a.card);
      const def = card && ACTION[card.kind as keyof typeof ACTION];
      if (!card || !def) return refuse('bad-card', 'That action card is not in your hand.');
      const why = playAction(s, seat, card, a);
      if (why) return refuse('bad-target', why);
      // Trade Satchels: the other player draws, the one who played it does not (MS-X-SWAP1).
      endTurn(s, seat, card.kind === 'swapHands' ? 0 : 1, now);
      return ok();
    }
    case 'pass': {
      const max = s.config.mode === 'expanded' ? 3 : 1;
      if (!Array.isArray(a.cards) || a.cards.length < 1 || a.cards.length > max)
        return refuse('bad-pass', max === 1 ? 'Pass by discarding one card.' : 'Pass by discarding one to three cards.');
      if (!takeCards(me, a.cards)) return refuse('bad-card', 'Those cards are not in your hand.');
      s.discards += a.cards.length;
      pushLog(s, { t: 'pass', seat, n: a.cards.length, ...(auto ? { auto } : {}) });
      endTurn(s, seat, a.cards.length, now);
      return ok();
    }
    case 'clear': {
      if (s.config.mode !== 'expanded') return refuse('bad-action', 'That move is only in the expanded rules.');
      if (!Array.isArray(a.cards) || a.cards.length !== 2) return refuse('bad-pass', 'Discard exactly two cards.');
      const has = a.clear === 'theft' ? me.theft : a.clear === 'trap' ? me.trap : me.broken.includes(a.clear);
      if (!has) return refuse('bad-target', 'There is no such card in front of you.');
      if (!takeCards(me, a.cards)) return refuse('bad-card', 'Those cards are not in your hand.');
      if (a.clear === 'theft') clearTheft(s, seat);
      else if (a.clear === 'trap') me.trap = false;
      else me.broken = me.broken.filter((t) => t !== a.clear);
      s.discards += 3;
      pushLog(s, { t: 'clear', seat, card: a.clear });
      endTurn(s, seat, 1, now);
      return ok();
    }
    default:
      return refuse('bad-action', 'You cannot do that now.');
  }
}

const clearTheft = (s: MState, seat: number) => {
  s.seats[seat].theft = false;
  s.theftOrder = s.theftOrder.filter((x) => x !== seat);
};

/** Validate and carry out an action card. Returns why it can't be played, or null once done. */
function playAction(s: MState, seat: number, card: Card, a: Extract<MAction, { type: 'act' }>): string | null {
  const def = ACTION[card.kind as keyof typeof ACTION];
  const me = s.seats[seat];
  const on = a.on;
  const target = isSeat(s, on) ? s.seats[on] : null;
  const log: LogLine = { t: 'act', seat, kind: def.kind };
  if (def.target === 'otherPlayer' && (!target || on === seat)) return 'Choose another player.';
  if (def.target === 'anyPlayer' && !target) return 'Choose a player.';
  switch (def.kind) {
    case 'breakPick':
    case 'breakLamp':
    case 'breakCart': {
      const tool = def.tools![0];
      // MS-C-ACT1: never two of the same card in front of one player.
      if (target!.broken.includes(tool)) return 'That tool is already broken.';
      target!.broken.push(tool);
      Object.assign(log, { on, tool });
      break;
    }
    case 'fixPick':
    case 'fixLamp':
    case 'fixCart':
    case 'fixPickLamp':
    case 'fixPickCart':
    case 'fixLampCart': {
      const tool: Tool | undefined = def.tools!.length === 1 ? def.tools![0] : a.tool;
      if (!tool || !def.tools!.includes(tool)) return 'Choose which tool to mend.';
      if (!target!.broken.includes(tool)) return 'That tool is not broken.';
      target!.broken = target!.broken.filter((t) => t !== tool);
      s.discards++;
      Object.assign(log, { on, tool });
      break;
    }
    case 'survey': {
      const g = Number.isInteger(a.goal) ? s.goals[a.goal!] : undefined;
      if (!g || g.revealed) return 'Choose a destination that is still face down.';
      me.seen.push({ t: 'survey', round: s.round, goal: a.goal!, kind: g.kind });
      log.goal = a.goal;
      break;
    }
    case 'caveIn': {
      const c = Number.isInteger(a.x) && Number.isInteger(a.y) ? s.cells[key(a.x!, a.y!)] : undefined;
      if (!c || !isTunnel(c.kind)) return 'Choose a tunnel card on the board: never the entrance or a destination.';
      delete s.cells[key(a.x!, a.y!)];
      s.discards++;
      Object.assign(log, { x: a.x, y: a.y });
      break;
    }
    case 'theft':
      if (me.theft) return 'You already have a Pickpocket in front of you.';
      me.theft = true;
      s.theftOrder.push(seat);
      break;
    case 'guard':
      if (!target!.theft) return 'That player has no Pickpocket in front of them.';
      clearTheft(s, on!);
      s.discards++;
      log.on = on;
      break;
    case 'swapHands': {
      takeCards(me, [card.id]);
      [me.hand, target!.hand] = [target!.hand, me.hand];
      const got = draw(s, target!, 1);
      s.discards++;
      log.on = on;
      pushLog(s, log);
      pushLog(s, { t: 'draw', seat: on!, n: got, next: null });
      return null;
    }
    case 'inspect':
      me.seen.push({ t: 'inspect', round: s.round, seat: on!, role: target!.role! });
      log.on = on;
      break;
    case 'swapRole': {
      if (!s.spareRoles.length) return 'There are no unused roles left.';
      // MS-X-HAT1: the old role is set aside face down; the new one comes from the roles nobody was dealt.
      const fresh = s.spareRoles.splice(randInt(s.rng, s.spareRoles.length), 1)[0];
      target!.role = fresh;
      log.on = on;
      break;
    }
    case 'trap':
      if (target!.trap) return 'That player is already locked in.';
      target!.trap = true;
      log.on = on;
      break;
    case 'free':
      if (!target!.trap) return 'That player is not locked in.';
      target!.trap = false;
      s.discards++;
      log.on = on;
      break;
  }
  takeCards(me, [card.id]);
  // Breaks, Pickpockets and locks stay in front of their player; everything else is discarded.
  if (!['breakPick', 'breakLamp', 'breakCart', 'theft', 'trap'].includes(def.kind)) s.discards++;
  pushLog(s, log);
  return null;
}

const nextMiner = (s: MState, from: number) => {
  // MS-C-DRAFT1: the cards travel against the turn order, to miners only.
  for (let i = 1; i <= s.n; i++) {
    const seat = (((from - i) % s.n) + s.n) % s.n;
    if (s.seats[seat].role === 'miner') return seat;
  }
  return from;
};

function endRound(s: MState, end: 'gold' | 'dry', finder: number | null, now: number) {
  const rec: RoundRecord = {
    round: s.round, end, start: s.opener, finder, roles: s.seats.map((x) => x.role), winners: [], payouts: [], steals: [], crystals: crystalsShowing(s.cells),
  };
  s.pending = rec;
  s.since = now;
  const pay = (seat: number, gold: number, why: string) => {
    if (gold <= 0) return;
    s.seats[seat].gold += gold;
    rec.payouts.push({ seat, gold, why });
  };
  if (s.config.mode === 'duel') {
    if (finder !== null) {
      rec.winners = [finder];
      pay(finder, DUEL_FINDER, 'reached the gold');
      pay(1 - finder, DUEL_OTHER, 'dug alongside');
    }
    return finishRound(s, now);
  }
  if (s.config.mode === 'classic') {
    const roles = s.seats.map((x) => x.role);
    if (end === 'gold') {
      rec.winners = roles.flatMap((r, i) => (r === 'miner' ? [i] : []));
      const count = Math.min(s.n, 9);
      // shortcut: a fresh reward deck once the 28 run out (only past round 3); a real table would have stopped there.
      if (s.rewardDeck.length < count) s.rewardDeck.push(...shuffle(s.rng, rewardCards()));
      s.draft = { cards: s.rewardDeck.splice(0, count).sort((a, b) => b - a), picker: roles[finder!] === 'miner' ? finder! : nextMiner(s, finder!) };
      s.phase = 'draft';
      return;
    }
    rec.winners = roles.flatMap((r, i) => (r === 'saboteur' ? [i] : []));
    // MS-C-PAY2. With no saboteur dealt, nobody is paid for a dry round (MS-C-PAY3).
    for (const w of rec.winners) pay(w, SABOTEUR_PAY[rec.winners.length], 'saboteur');
    return finishRound(s, now);
  }
  expandedPayout(s, rec, finder);
  // MS-X-THEFT1: the last Pickpocket laid steals first, then the rest in turn order.
  const thieves = s.seats.flatMap((x, i) => (x.theft && !x.trap ? [i] : []));
  const lead = [...s.theftOrder].reverse().find((t) => thieves.includes(t));
  s.thieves = lead === undefined ? [] : Array.from({ length: s.n }, (_, i) => (lead + i) % s.n).filter((t) => thieves.includes(t));
  return nextThief(s, now);
}

/** Expanded payout (MS-X-WIN1..5, MS-X-PAY1..3). */
function expandedPayout(s: MState, rec: RoundRecord, finder: number | null) {
  const role = (i: number) => s.seats[i].role;
  const free = (i: number) => !s.seats[i].trap;
  const all = s.seats.map((_, i) => i);
  let teams: ('green' | 'blue')[] = [];
  if (finder !== null) {
    const green = goldJoined(s.cells, s.goals, 'blue');
    const blue = goldJoined(s.cells, s.goals, 'green');
    const r = role(finder);
    if (r === 'green' || r === 'blue') {
      const other = r === 'green' ? 'blue' : 'green';
      const mine = r === 'green' ? green : blue;
      const theirs = r === 'green' ? blue : green;
      teams = mine ? [r] : theirs ? [other] : [];
    } else teams = [...(green ? ['green' as const] : []), ...(blue ? ['blue' as const] : [])];
  }
  const winners =
    finder !== null
      ? all.filter((i) => free(i) && (teams.includes(role(i) as 'green') || (role(i) === 'foreman' && teams.length > 0) || role(i) === 'opportunist'))
      : all.filter((i) => free(i) && (role(i) === 'saboteur' || role(i) === 'opportunist'));
  rec.winners = winners;
  const each = expandedPay(winners.length);
  for (const w of winners) {
    const cut = role(w) === 'foreman' ? 1 : role(w) === 'opportunist' ? 2 : 0;
    const gold = Math.max(0, each - cut);
    if (gold > 0) {
      s.seats[w].gold += gold;
      rec.payouts.push({ seat: w, gold, why: role(w)! });
    }
  }
  // MS-X-SEEK1: crystal seekers are paid by the crystals showing, split between the seekers dealt, rounded down.
  const seekers = all.filter((i) => role(i) === 'seeker');
  const share = seekers.length ? Math.floor(rec.crystals / seekers.length) : 0;
  for (const w of seekers.filter(free))
    if (share > 0) {
      s.seats[w].gold += share;
      rec.payouts.push({ seat: w, gold: share, why: 'seeker' });
    }
}

/** Skip thieves with nobody to rob; the round is done once no thief is left. */
function nextThief(s: MState, now: number) {
  while (s.thieves.length && !s.seats.some((x, i) => i !== s.thieves[0] && x.gold > 0)) {
    s.pending!.steals.push({ seat: s.thieves[0], from: null });
    s.thieves.shift();
  }
  if (s.thieves.length) {
    s.phase = 'theft';
    s.since = now;
    return;
  }
  finishRound(s, now);
}

function pick(s: MState, seat: number, a: MAction, now: number, auto = false): ApplyResult<MState> {
  const d = s.draft!;
  if (seat !== d.picker) return refuse('not-your-turn', 'It is not your pick.');
  if (a.type !== 'pick' || !Number.isInteger(a.index) || a.index < 0 || a.index >= d.cards.length) return refuse('bad-pick', 'Choose one of the reward cards.');
  const [v] = d.cards.splice(a.index, 1);
  s.seats[seat].gold += v;
  s.seats[seat].rewards.push(v);
  pushLog(s, { t: 'pick', seat, ...(auto ? { auto } : {}) });
  s.turn++;
  if (d.cards.length) {
    d.picker = nextMiner(s, seat);
    s.since = now;
  } else {
    s.draft = null;
    finishRound(s, now);
  }
  return { ok: true, state: s, undoable: false };
}

function steal(s: MState, seat: number, a: MAction, now: number, auto = false): ApplyResult<MState> {
  if (seat !== s.thieves[0]) return refuse('not-your-turn', 'It is not your turn to steal.');
  if (a.type !== 'steal') return refuse('bad-action', 'Choose who to steal from.');
  if (a.from !== null && (!isSeat(s, a.from) || a.from === seat || s.seats[a.from].gold <= 0)) return refuse('bad-target', 'Choose a player who has gold.');
  if (a.from !== null) {
    s.seats[a.from].gold--;
    s.seats[seat].gold++;
  }
  s.pending!.steals.push({ seat, from: a.from });
  pushLog(s, { t: 'steal', seat, from: a.from, ...(auto ? { auto } : {}) } as LogLine);
  s.thieves.shift();
  s.turn++;
  nextThief(s, now);
  return { ok: true, state: s, undoable: false };
}

/** Record the round, then end the game or deal the next round (MS-END1/2). */
function finishRound(s: MState, now: number) {
  s.rounds.push(s.pending!);
  s.pending = null;
  s.turn++;
  const target = s.config.target > 0 && s.seats.some((x) => x.gold >= s.config.target);
  if (s.round >= s.config.rounds || target) {
    s.phase = 'over';
    return;
  }
  // MS-TURN4: the next round opens with the player after whoever played last.
  startRound(s, (s.lastActor + 1) % s.n, now);
}

export function actors(s: MState): number[] {
  if (s.phase === 'play') return [s.current];
  if (s.phase === 'draft') return [s.draft!.picker];
  if (s.phase === 'theft') return [s.thieves[0]];
  return [];
}

export function project(s: MState, viewer: number | null): MView {
  const me = viewer !== null && isSeat(s, viewer) ? s.seats[viewer] : null;
  const over = s.phase === 'over';
  const myTurn = me && s.phase === 'play' && s.current === viewer;
  const mySpots = myTurn && !cannotDig(me) ? handSpots(s.cells, s.goals, me.hand.filter((c) => isTunnel(c.kind))) : {};
  return {
    config: s.config,
    n: s.n,
    round: s.round,
    phase: s.phase,
    turn: s.turn,
    current: s.phase === 'play' ? s.current : (actors(s)[0] ?? -1),
    since: s.since,
    deck: s.deck.length,
    discards: s.discards,
    cells: Object.entries(s.cells).map(([k, c]) => {
      const [x, y] = k.split(',').map(Number);
      // Who laid it is public (the log says so too); setup cards have no `by` (MS-ATTR1).
      return { x, y, kind: c.kind, rot: c.rot, ...(c.by !== undefined ? { by: c.by } : {}) };
    }),
    goals: s.goals.map((g) => (g.revealed ? { x: g.x, y: g.y, revealed: true, kind: g.kind } : { x: g.x, y: g.y, revealed: false })),
    players: s.seats.map((x, seat) => ({
      seat, hand: x.hand.length, broken: [...x.broken], theft: x.theft, trap: x.trap,
      ...(s.config.mode === 'expanded' ? { hasGold: x.gold > 0 } : {}),
    })),
    draft: s.draft ? { picker: s.draft.picker, left: s.draft.cards.length } : null,
    thief: s.phase === 'theft' ? s.thieves[0] : null,
    log: s.log.slice(),
    rounds: s.rounds,
    chat: s.chat,
    me: me
      ? {
          seat: viewer!,
          hand: me.hand.slice(),
          role: me.role,
          gold: me.gold,
          rewards: me.rewards.slice(),
          seen: me.seen.slice(),
          spots: mySpots,
          ...(s.draft?.picker === viewer ? { draft: s.draft.cards.slice() } : {}),
        }
      : null,
    final: over ? { gold: s.seats.map((x) => x.gold), rewards: s.seats.map((x) => x.rewards.slice()) } : null,
  };
}

export function results(s: MState): PlayerResult[] | null {
  if (s.phase !== 'over') return null;
  const best = Math.max(...s.seats.map((x) => x.gold));
  return s.seats.map((x, seat) => ({
    seat,
    score: x.gold,
    rank: 1 + s.seats.filter((o) => o.gold > x.gold).length,
    winner: x.gold === best,
    detail: `${x.gold} gold`,
  }));
}
