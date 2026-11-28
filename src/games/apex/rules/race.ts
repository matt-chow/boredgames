/**
 * One race: setup and the deterministic turn-by-turn resolution (APEX.md §1–8, §12). Functions here mutate the race
 * they are given; the engine clones state before calling them. All randomness comes from `race.rng`.
 *
 * A round (AX-TURN): everyone commits a gear and cards in secret, then each driver in race order takes a turn: reveal,
 * Stress, the move, reactions (cool, boost, catch-up) in any order, the slipstream offer, the corner check, then an
 * optional discard and refill. Decisions come in through `turnAct`; anything with no choice resolves by itself.
 */
import { randInt, seedRng, shuffle, type RngState } from '../../../engine/rng';
import { baseDeck, cardFx, committable, HEAT, isValued, STRESS, valueOf, type Card } from './cards';
import { resolveCircuit, type Circuit } from './content/circuits';
import { EVENTS, RIVALS, SECTOR_MODS, WEATHER } from './content/paddock';
import { sumFit, UPGRADE_BY_ID, type Fit, type ModuleId } from './content/upgrades';

export type Modules = Record<ModuleId, boolean>;
export type Risk = 'cautious' | 'balanced' | 'bold';
export type Level = 'novice' | 'club' | 'works';

export interface AiSpec {
  risk: Risk;
  level: Level;
}

export interface CarSpec {
  /** The human seat driving it, or null for a computer car. */
  seat: number | null;
  name: string;
  number: number;
  livery: number;
  upgrades: string[];
  rival?: string;
  ai?: AiSpec;
}

export interface RaceSetup {
  circuit: string;
  laps: number;
  seed: string;
  /** In grid order: index 0 starts on pole. */
  cars: CarSpec[];
  modules: Modules;
  event: string | null;
}

/** AX-PLAN: the secret part of a turn. Everything else is decided in the open, during the turn. */
export interface Plan {
  gear: number;
  /** Hand indices to commit; empty means limp (AX-PLAN-3). */
  cards: number[];
}

export interface Stats {
  grid: number;
  overtakes: number;
  bestCharge: number;
  spins: number;
  boosts: number;
  drafts: number;
  cooled: number;
  topSpeed: number;
  bestDist: number;
  atLimit: number;
  cornerPaid: number;
  maxCornerPay: number;
  gear4: number;
  ledLap: boolean;
  ledR1: boolean;
}

/** One public step of a turn, in the order it happened; the table animates these one by one. */
export type TurnEvent =
  | { k: 'pay'; n: number }
  | { k: 'flip'; card: Card }
  | { k: 'move' | 'boost' | 'catchup' | 'draft'; to: number; lane: number }
  | { k: 'cool'; n: number }
  | { k: 'corner'; at: number; limit: number; paid: number }
  | { k: 'spin'; to: number; lane: number; stress: number }
  | { k: 'heat'; n: number; why: 'gravel' | 'flood' }
  | { k: 'discard'; n: number }
  | { k: 'finish'; over: number };

/** What happened to one car this round. Public once revealed. */
export interface Resolved {
  car: number;
  gear: number;
  /** Heat paid up front: the shift and any card costs. */
  shift: number;
  cards: Card[];
  flipped: Card[];
  boost: boolean;
  speed: number;
  dist: number;
  from: number;
  to: number;
  corners: { at: number; limit: number; paid: number }[];
  spun: boolean;
  drafted: number;
  cooled: number;
  catchup: boolean;
  finished: boolean;
  limp: boolean;
  events: TurnEvent[];
}

export interface Car {
  id: number;
  seat: number | null;
  name: string;
  number: number;
  livery: number;
  rival?: string;
  ai?: AiSpec;
  upgrades: string[];
  fit: Partial<Fit>;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  /** Committed and thrown-away cards, out of play until the turn ends (AX-DECK-1). */
  play: Card[];
  engine: number;
  handSize: number;
  gear: number;
  /** Progress: lap × length + space. The grid is below 0; the finish line is laps × length. */
  pos: number;
  lane: number;
  arrived: number;
  spun: boolean;
  reliefLap: number;
  freeBoostLap: number;
  done: { place: number; round: number; over: number } | null;
  stats: Stats;
}

export type Stage = 'react' | 'draft' | 'discard';

/** The driver whose turn it is, and what they may still do (AX-TURN-2). All of it is public. */
export interface Turn {
  car: number;
  stage: Stage;
  /** Where the move started; the corner check covers everything from here (AX-TURN-6). */
  start: number;
  lane0: number;
  /** Speed for corners, and card grip and draft bonus from the committed cards. */
  speed: number;
  grip: number;
  draftBonus: number;
  /** Cooling this turn can still use (AX-COOL-1). */
  cool: number;
  boosted: boolean;
  catchup: 'none' | 'open' | 'taken';
  offer: { len: number; hazard: number } | null;
}

export type TurnAct =
  | { do: 'cool'; n: number }
  | { do: 'boost' }
  | { do: 'catchup' }
  /** Done reacting. */
  | { do: 'go' }
  | { do: 'draft'; take: boolean }
  /** Finish Turn, throwing away these hand indices. */
  | { do: 'finish'; discard: number[] };

export interface Race {
  circuit: string;
  laps: number;
  n: number;
  modules: Modules;
  weather: string;
  /** Modifier id for each of the three sectors. */
  sectors: string[];
  event: string | null;
  /** Per corner: change to its limit from events. */
  cornerDelta: number[];
  cars: Car[];
  round: number;
  /** Bumped at every state change a player acts on (AX-NET-1). */
  step: number;
  phase: 'plan' | 'turn' | 'over';
  rng: RngState;
  seed: string;
  seq: number;
  plans: (Plan | null)[];
  /** The round's driving order, fixed when it starts (AX-TURN-1), and who gets catch-up. */
  res: { order: number[]; idx: number; catchup: number[]; before: number[] } | null;
  turn: Turn | null;
  /** This round's turns so far, in driving order. */
  last: Resolved[];
  finished: number[];
  replay: { plans: (Plan | null)[]; acts: [number, TurnAct][] }[];
  /** Set on a race migrated mid-way from the v1 rules: its record cannot be replayed. */
  noReplay?: boolean;
}

export const HAND = 7;
export const ENGINE = 6;
export const GEAR_COOL = [3, 1, 0, 0];
/** shortcut: a backstop against a race that never ends; no real race comes near it. */
const MAX_ROUNDS = 200;

const pick = <T extends { weight: number }>(rng: RngState, list: T[]): T => {
  let r = randInt(rng, list.reduce((s, x) => s + x.weight, 0));
  for (const x of list) if ((r -= x.weight) < 0) return x;
  return list[0];
};

export function newRace(s: RaceSetup): Race {
  const c = resolveCircuit(s.circuit);
  const rng = seedRng(s.seed);
  const storm = s.modules.storm;
  const weather = storm ? pick(rng, WEATHER) : WEATHER[0];
  const sectors = [0, 1, 2].map(() =>
    storm ? pick(rng, SECTOR_MODS.filter((m) => !m.storm || weather.flood)).id : 'none',
  );
  const event = s.event ? EVENTS.find((e) => e.id === s.event) ?? null : null;
  const cornerDelta = c.corners.map(() => 0);
  if (event?.special === 'oil') cornerDelta[randInt(rng, c.corners.length)] = -1;
  if (event?.special === 'resurfaced') cornerDelta[randInt(rng, c.corners.length)] = 1;
  const cars: Car[] = s.cars.map((spec, i) => {
    const ups = spec.upgrades.map((u) => UPGRADE_BY_ID[u]).filter(Boolean);
    const rival = s.modules.rivals && spec.rival ? RIVALS.find((r) => r.id === spec.rival) : undefined;
    const fit = sumFit([...ups.map((u) => u.fit), rival?.fit, event?.fit, weather.fit]);
    const deck = baseDeck();
    for (let k = 0; k < (fit.removeStress ?? 0); k++) deck.splice(deck.lastIndexOf(STRESS), 1);
    if (s.modules.dust && !fit.noDustStress) deck.push(STRESS);
    for (const u of ups) if (u.card) deck.push(u.id);
    shuffle(rng, deck);
    const handSize = HAND + (fit.hand ?? 0);
    return {
      id: i,
      seat: spec.seat,
      name: spec.name,
      number: spec.number,
      livery: spec.livery,
      ...(rival ? { rival: rival.id } : {}),
      ...(spec.ai ? { ai: spec.ai } : {}),
      upgrades: [...spec.upgrades],
      fit,
      deck: deck.slice(handSize),
      hand: deck.slice(0, handSize),
      discard: [],
      play: [],
      engine: Math.max(1, ENGINE + (fit.engine ?? 0)),
      handSize,
      gear: event?.special === 'practice' ? 2 : 1,
      pos: -1 - Math.floor(i / 2),
      lane: i % 2,
      arrived: i,
      spun: false,
      reliefLap: -99,
      freeBoostLap: -99,
      done: null,
      stats: {
        grid: i, overtakes: 0, bestCharge: 0, spins: 0, boosts: 0, drafts: 0, cooled: 0, topSpeed: 0, bestDist: 0,
        atLimit: 0, cornerPaid: 0, maxCornerPay: 0, gear4: 0, ledLap: false, ledR1: false,
      },
    };
  });
  return {
    circuit: s.circuit,
    laps: s.laps,
    n: c.length,
    modules: s.modules,
    weather: weather.id,
    sectors,
    event: event?.id ?? null,
    cornerDelta,
    cars,
    round: 1,
    step: 1,
    phase: 'plan',
    rng,
    seed: s.seed,
    seq: cars.length,
    plans: cars.map(() => null),
    res: null,
    turn: null,
    last: [],
    finished: [],
    replay: [],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Queries

/** The public parts of a race that rules queries need; the AI gets only these. */
export type Track = Pick<Race, 'circuit' | 'laps' | 'n' | 'modules' | 'weather' | 'sectors' | 'cornerDelta'>;

export const circuitOf = (r: Track): Circuit => resolveCircuit(r.circuit);
export const spaceOf = (r: Track, pos: number) => ((pos % r.n) + r.n) % r.n;
export const weatherOf = (r: Track) => WEATHER.find((w) => w.id === r.weather) ?? WEATHER[0];
const lineOf = (r: Track) => r.laps * r.n;

export function lanesAt(r: Pick<Race, 'modules' | 'circuit'>, space: number): number {
  return r.modules.mountains && circuitOf(r as Track).tunnel[space] ? 1 : 2;
}

/** AX-FIN-5: a car that finished still holds its space until the end of the round it finished in. */
const occupies = (r: Pick<Race, 'round'>, o: Pick<Car, 'done'>) => !o.done || o.done.round === r.round;

/** The lowest free lane of a space, ignoring one car, or -1. Cars a lap apart share the physical space. */
export function freeLane(r: Race, pos: number, except: number): number {
  const sp = spaceOf(r, pos);
  for (let l = 0; l < lanesAt(r, sp); l++)
    if (!r.cars.some((o) => o.id !== except && occupies(r, o) && spaceOf(r, o.pos) === sp && o.lane === l)) return l;
  return -1;
}

/** AX-RES-1: finishers first (by place), then progress, lane, arrival. */
export function raceOrder(r: Race): number[] {
  return [...r.cars]
    .sort((a, b) => {
      if (a.done || b.done) return (a.done?.place ?? 99) - (b.done?.place ?? 99);
      return b.pos - a.pos || a.lane - b.lane || a.arrived - b.arrived;
    })
    .map((c) => c.id);
}

/** Heat cost of shifting to gear `g`, or null if the shift is not allowed (AX-GEAR-2). */
export function shiftCost(c: Pick<Car, 'gear' | 'fit'>, g: number): number | null {
  const d = Math.abs(g - c.gear);
  if (!Number.isInteger(g) || g < 1 || g > 4) return null;
  if (d <= 1) return 0;
  if (d === 2) return Math.max(0, 1 + (c.fit.shift2 ?? 0));
  return c.fit.shift3 ? c.fit.shift3 : null;
}

/** The effective limit of corner `k` for this car this move (AX-CRN, AX-MOD-1, upgrades). */
export function cornerLimit(r: Track, c: Pick<Car, 'fit'>, k: number, cardGrip = 0): number {
  const cc = circuitOf(r).corners[k];
  const rain = (weatherOf(r).limit ?? 0) !== 0 && !c.fit.rainGrip ? weatherOf(r).limit! : 0;
  const wet = r.sectors[circuitOf(r).sector[cc.at]] === 'wet' ? -1 : 0;
  const tight = cc.limit <= 3 ? c.fit.gripTight ?? 0 : 0;
  return Math.max(1, cc.limit + r.cornerDelta[k] + rain + wet) + (c.fit.grip ?? 0) + tight + cardGrip;
}

function cornerAt(r: Track, space: number): number {
  return circuitOf(r).corners.findIndex((k) => k.at === space);
}

/** Overspeed checkpoints crossed moving from `from` (exclusive) to `to` (inclusive): corners and pass entries. */
export function checkpoints(r: Track, c: Pick<Car, 'fit'>, from: number, to: number, speed: number, cardGrip: number) {
  const out: { m: number; corner: number; limit: number; cost: number }[] = [];
  const circ = circuitOf(r);
  // AX-FIN-1: nothing past the line is checked.
  const last = Math.min(to, lineOf(r) - 1);
  for (let m = from + 1; m <= last; m++) {
    const sp = spaceOf(r, m);
    const k = cornerAt(r, sp);
    if (k >= 0) {
      const limit = cornerLimit(r, c, k, cardGrip);
      const extra = r.modules.dust && circ.gravel[sp] && !c.fit.gravelCorners ? 1 : 0;
      out.push({ m, corner: k, limit, cost: speed > limit ? speed - limit + extra : 0 });
    }
    const cap = r.modules.mountains ? circ.pass[sp] : null;
    // Interpretation: a pass is checked once per move, at the first pass space the move enters.
    if (cap != null && (m === from + 1 || circ.pass[spaceOf(r, m - 1)] == null)) {
      const lim = cap + (c.fit.passCap ?? 0);
      out.push({ m, corner: -1, limit: lim, cost: speed > lim ? Math.max(0, speed - lim - (c.fit.passRelief ?? 0)) : 0 });
    }
  }
  return out;
}

/** The corner bill for a move, with the once-a-lap overspeed relief applied (AX-CRN-2). Does not pay it. */
export function cornerBill(r: Track, c: Pick<Car, 'fit' | 'reliefLap'>, from: number, to: number, speed: number, grip: number) {
  let relief = c.reliefLap;
  return checkpoints(r, c, from, to, speed, grip).map((cp) => {
    const lap = Math.floor(cp.m / r.n);
    let cost = cp.cost;
    let relieved = false;
    if (cost > 0 && cp.corner >= 0 && c.fit.overspeedRelief && relief !== lap) {
      relief = lap;
      relieved = true;
      cost = Math.max(0, cost - c.fit.overspeedRelief);
    }
    return { ...cp, cost, relieved, lap };
  });
}

/** Can this car drive at all, other than limping? Some gear it can reach with enough committable cards and Heat. */
export function canDrive(c: Pick<Car, 'hand' | 'engine' | 'gear' | 'fit'>): boolean {
  const costs = c.hand.filter(committable).map((x) => cardFx(x)?.cost ?? 0).sort((a, b) => a - b);
  for (let g = 1; g <= 4; g++) {
    const sc = shiftCost(c, g);
    if (sc == null || costs.length < g) continue;
    if (sc + costs.slice(0, g).reduce((s, x) => s + x, 0) <= c.engine) return true;
  }
  return false;
}

/** Why a plan is not legal for this car now, or null (AX-GEAR, AX-PLAN). */
export function planError(r: Race, carId: number, p: Plan): string | null {
  const c = r.cars[carId];
  if (!c || c.done) return 'That car is not racing.';
  if (typeof p !== 'object' || !p || !Array.isArray(p.cards)) return 'Malformed plan.';
  if (p.cards.some((i) => !Number.isInteger(i) || i < 0 || i >= c.hand.length) || new Set(p.cards).size !== p.cards.length)
    return 'Pick each card from your hand once.';
  if (p.cards.length === 0) return canDrive(c) ? 'You have cards to drive with: commit as many cards as your gear.' : null;
  const sc = shiftCost(c, p.gear);
  if (sc == null) return 'You can shift at most one gear for free, or two for 1 Heat.';
  if (p.cards.length !== p.gear) return `Gear ${p.gear} commits exactly ${p.gear} card${p.gear > 1 ? 's' : ''}.`;
  if (p.cards.some((i) => !committable(c.hand[i]))) return 'Heat cannot be committed.';
  const cost = sc + p.cards.reduce((s, i) => s + (cardFx(c.hand[i])?.cost ?? 0), 0);
  if (cost > c.engine) return 'Your engine has too little Heat left for that.';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Deck handling

/** Draw or turn the top card, rebuilding the deck from the discard when empty (AX-DECK-1). */
function topCard(r: Race, c: Car): Card | null {
  if (!c.deck.length) {
    if (!c.discard.length) return null;
    c.deck = shuffle(r.rng, c.discard);
    c.discard = [];
  }
  return c.deck.shift()!;
}

/** Turn cards until a valued one (AX-STR-1). Every turned card goes to the discard. */
function flip(r: Race, c: Car, rec: Resolved): number {
  for (;;) {
    if (!c.deck.length && !c.discard.some(isValued)) return 0;
    const x = topCard(r, c);
    if (x == null) return 0;
    c.discard.push(x);
    rec.flipped.push(x);
    rec.events.push({ k: 'flip', card: x });
    if (isValued(x)) return valueOf(x);
  }
}

function refill(r: Race, c: Car) {
  while (c.hand.length < c.handSize) {
    const x = topCard(r, c);
    if (x == null) break;
    c.hand.push(x);
  }
}

function payHeat(c: Car, n: number) {
  const k = Math.min(n, c.engine);
  c.engine -= k;
  for (let i = 0; i < k; i++) c.discard.push(HEAT);
}

// ---------------------------------------------------------------------------------------------------------------------
// Resolution

export function allPlanned(r: Race): boolean {
  return r.cars.every((c) => c.done || r.plans[c.id]);
}

/** Lock a plan (or clear it with null). The caller checks `planError` first. */
export function setPlan(r: Race, carId: number, p: Plan | null) {
  r.plans[carId] = p ? { gear: p.cards.length ? p.gear : 1, cards: [...p.cards] } : null;
}

/** AX-PLAN-5 and AX-TURN-1: every plan is in; fix the order and run turns until a driver must decide. */
export function reveal(r: Race) {
  const order = raceOrder(r).filter((id) => !r.cars[id].done);
  const k = order.length >= 2 ? Math.min(order.length - 1, (order.length >= 5 ? 2 : 1) + (r.event === 'fever' ? 1 : 0)) : 0;
  r.replay.push({ plans: r.plans.map((p) => (p ? { gear: p.gear, cards: [...p.cards] } : null)), acts: [] });
  r.res = { order, idx: 0, catchup: order.slice(order.length - k), before: raceOrder(r) };
  r.last = [];
  r.phase = 'turn';
  advance(r);
}

const recOf = (r: Race) => r.last[r.last.length - 1];
const tunnelAt = (r: Race, pos: number) => r.modules.mountains && !!circuitOf(r).tunnel[spaceOf(r, pos)];

/** What the driver whose turn it is may do now (AX-TURN-4). */
export function turnOptions(r: Race) {
  const t = r.turn!;
  const c = r.cars[t.car];
  const rec = recOf(r);
  const react = t.stage === 'react';
  const heat = c.hand.filter((x) => x === HEAT).length;
  const lap = Math.floor(Math.max(0, c.pos) / r.n);
  const free = !!c.fit.freeBoostPerLap && c.freeBoostLap !== lap;
  return {
    cool: react ? Math.min(t.cool, heat) : 0,
    boost: react && !t.boosted && !rec.limp && (free || c.engine > 0) && (!tunnelAt(r, t.start) || !!c.fit.tunnelBoost),
    freeBoost: free,
    catchup: react && t.catchup === 'open',
    /** Extra corner Heat catch-up would add (an upper bound: blocking can only shorten it). */
    catchupCost: react && t.catchup === 'open'
      ? cornerBill(r, c, t.start, c.pos + 1 + (c.fit.catchDist ?? 0), t.speed, t.grip).reduce((s, x) => s + x.cost, 0) -
        cornerBill(r, c, t.start, c.pos, t.speed, t.grip).reduce((s, x) => s + x.cost, 0)
      : 0,
    /** Heat the corners crossed so far would cost at the current speed; more than the engine holds means a spin. */
    cost: cornerBill(r, c, t.start, c.pos, t.speed, t.grip).reduce((s, x) => s + x.cost, 0),
  };
}

/** Why a turn decision is not legal now, or null. */
export function turnError(r: Race, a: TurnAct): string | null {
  const t = r.turn;
  if (r.phase !== 'turn' || !t) return 'It is nobody’s turn.';
  if (!a || typeof a !== 'object') return 'Malformed decision.';
  const o = turnOptions(r);
  const c = r.cars[t.car];
  switch (a.do) {
    case 'cool':
      return Number.isInteger(a.n) && a.n >= 1 && a.n <= o.cool ? null : 'You cannot cool that much now.';
    case 'boost':
      return o.boost ? null : 'You cannot boost now.';
    case 'catchup':
      return o.catchup ? null : 'Catch-up is not yours to take.';
    case 'go':
      return t.stage === 'react' ? null : 'You have already moved on.';
    case 'draft':
      return t.stage === 'draft' ? null : 'There is no slipstream on offer.';
    case 'finish': {
      if (t.stage !== 'discard') return 'Finish your move first.';
      const d = a.discard;
      if (!Array.isArray(d) || d.some((i) => !Number.isInteger(i) || i < 0 || i >= c.hand.length) || new Set(d).size !== d.length)
        return 'Pick each card from your hand once.';
      if (d.filter((i) => c.hand[i] === HEAT).length > (c.fit.dumpStrain ?? 0)) return 'Heat cannot be thrown away.';
      return null;
    }
    default:
      return 'Unknown decision.';
  }
}

/** Apply a turn decision. The caller checks `turnError` first. */
export function turnAct(r: Race, a: TurnAct) {
  const t = r.turn!;
  const c = r.cars[t.car];
  const rec = recOf(r);
  r.replay[r.replay.length - 1].acts.push([t.car, structuredClone(a)]);
  switch (a.do) {
    case 'cool': {
      // Hand → engine, taking Heat from the right of the hand so the rest keeps its order.
      let n = a.n;
      for (let i = c.hand.length - 1; i >= 0 && n > 0; i--)
        if (c.hand[i] === HEAT) {
          c.hand.splice(i, 1);
          c.engine++;
          n--;
        }
      t.cool -= a.n;
      rec.cooled += a.n;
      c.stats.cooled += a.n;
      rec.events.push({ k: 'cool', n: a.n });
      break;
    }
    case 'boost': {
      // AX-BST-1: 1 Heat, then turn cards like Stress; it adds speed and distance.
      const lap = Math.floor(Math.max(0, c.pos) / r.n);
      const free = !!c.fit.freeBoostPerLap && c.freeBoostLap !== lap;
      if (free) c.freeBoostLap = lap;
      else payHeat(c, 1);
      rec.events.push({ k: 'pay', n: free ? 0 : 1 });
      t.boosted = true;
      rec.boost = true;
      c.stats.boosts++;
      let v = 0;
      for (let f = 0; f < 1 + (c.fit.boostFlips ?? 0); f++) v += flip(r, c, rec);
      t.speed += v;
      rec.speed = t.speed;
      go(r, c, v, 'boost');
      break;
    }
    case 'catchup':
      t.catchup = 'taken';
      rec.catchup = true;
      t.cool += 1 + (c.fit.catchCool ?? 0);
      go(r, c, 1 + (c.fit.catchDist ?? 0), 'catchup');
      break;
    case 'go':
      toDraft(r);
      break;
    case 'draft':
      if (a.take && t.offer) {
        const before = c.pos;
        go(r, c, t.offer.len, 'draft');
        rec.drafted = c.pos - before;
        if (rec.drafted > 0) c.stats.drafts++;
      }
      toDiscard(r);
      break;
    case 'finish':
      endTurn(r, a.discard);
      break;
  }
  advance(r);
}

/** Resolve everything that needs no decision, then stop for the next one (or the next round). */
function advance(r: Race) {
  const res = r.res!;
  for (;;) {
    const t = r.turn;
    if (!t) {
      if (res.idx >= res.order.length) return endRound(r);
      startTurn(r, r.cars[res.order[res.idx]]);
      continue;
    }
    const c = r.cars[t.car];
    if (t.stage === 'react') {
      const o = turnOptions(r);
      if (!o.cool && !o.boost && !o.catchup) {
        toDraft(r);
        continue;
      }
    }
    // AX-TURN-7: a car past the line has nothing to throw away; nothing left that may go means no decision either.
    if (t.stage === 'discard' && (c.pos >= lineOf(r) || !c.hand.some((x) => x !== HEAT || (c.fit.dumpStrain ?? 0) > 0))) {
      endTurn(r, []);
      continue;
    }
    r.step++;
    return;
  }
}

function startTurn(r: Race, c: Car) {
  const p = r.plans[c.id]!;
  const limp = p.cards.length === 0;
  const cards = p.cards.map((i) => c.hand[i]);
  const rec: Resolved = {
    car: c.id, gear: limp ? 1 : p.gear, shift: 0, cards, flipped: [], boost: false, speed: 0, dist: 0, from: c.pos,
    to: c.pos, corners: [], spun: false, drafted: 0, cooled: 0, catchup: false, finished: false, limp, events: [],
  };
  r.last.push(rec);
  // Committed cards leave the hand now and reach the discard when the turn ends.
  c.play.push(...cards);
  c.hand = c.hand.filter((_, i) => !p.cards.includes(i));
  c.spun = false;
  let speed = 0, value = 0, cool = 0, grip = 0, draftBonus = 0;
  if (limp) {
    speed = value = 1;
  } else {
    const pay = (shiftCost(c, p.gear) ?? 0) + cards.reduce((s, x) => s + (cardFx(x)?.cost ?? 0), 0);
    rec.shift = pay;
    payHeat(c, pay);
    if (pay) rec.events.push({ k: 'pay', n: pay });
    for (const x of cards) {
      const fx = cardFx(x);
      if (fx) {
        speed += fx.speed ?? fx.value;
        value += fx.value;
        cool += fx.cool ?? 0;
        grip += fx.grip ?? 0;
        draftBonus += fx.draft ?? 0;
      }
      const flips = x === STRESS ? 1 : fx?.flips ?? 0;
      for (let f = 0; f < flips; f++) {
        const v = flip(r, c, rec);
        speed += v;
        value += v;
      }
    }
  }
  const g = rec.gear;
  cool +=
    GEAR_COOL[g - 1] + ((g === 1 ? c.fit.cool1 : g === 2 ? c.fit.cool2 : g === 3 ? c.fit.cool3 : 0) ?? 0) + (c.fit.coolAll ?? 0);
  if ((weatherOf(r).limit ?? 0) < 0) cool += c.fit.rainCool ?? 0;
  rec.speed = speed;
  r.turn = {
    car: c.id, stage: 'react', start: c.pos, lane0: c.lane, speed, grip, draftBonus, cool, boosted: false,
    catchup: r.res!.catchup.includes(c.id) ? 'open' : 'none', offer: null,
  };
  go(r, c, value + (r.round === 1 ? c.fit.launch ?? 0 : 0), 'move');
}

/** AX-MOV-1: move up to `dist` spaces, stopping short of full spaces. No corner is checked yet. */
function go(r: Race, c: Car, dist: number, k: 'move' | 'boost' | 'catchup' | 'draft') {
  const from = c.pos;
  for (let q = from + dist; q > from; q--) {
    const l = freeLane(r, q, c.id);
    if (l >= 0) {
      c.pos = q;
      c.lane = l;
      c.arrived = ++r.seq;
      break;
    }
  }
  recOf(r).to = c.pos;
  recOf(r).events.push({ k, to: c.pos, lane: c.lane });
}

function toDraft(r: Race) {
  const t = r.turn!;
  t.stage = 'draft';
  t.offer = draftOffer(r);
  if (!t.offer) toDiscard(r);
}

/** AX-DRF-1: a slipstream on offer after the reactions, with the extra Heat it would cost at the corners. */
export function draftOffer(r: Race): { len: number; hazard: number } | null {
  const t = r.turn!;
  const c = r.cars[t.car];
  // Interpretation: only a car that moved this turn can draft (AX-DRF-1 "after moving").
  if (c.pos <= t.start || c.pos >= lineOf(r)) return null;
  if (weatherOf(r).noDraft && !c.fit.rainDraft) return null;
  const sp = spaceOf(r, c.pos);
  const near = r.cars.some(
    (o) => o.id !== c.id && occupies(r, o) && (spaceOf(r, o.pos) === sp || spaceOf(r, o.pos) === spaceOf(r, c.pos + 1)),
  );
  if (!near) return null;
  const circ = circuitOf(r);
  const tail = r.sectors[circ.sector[sp]] === 'tail' ? 1 : 0;
  const len = 2 + (c.fit.draft ?? 0) + t.draftBonus + tail;
  // AX-FIN-6: no slipstream across the finish line.
  if (c.pos + len >= lineOf(r)) return null;
  if (r.modules.mountains && !c.fit.tunnelDraft)
    for (let m = c.pos; m <= c.pos + len; m++) if (circ.tunnel[spaceOf(r, m)]) return null;
  const sum = (to: number) => cornerBill(r, c, t.start, to, t.speed, t.grip).reduce((s, x) => s + x.cost, 0);
  return { len, hazard: sum(c.pos + len) - sum(c.pos) };
}

/** AX-TURN-6: the corner check over the whole move at the final speed, then gravel and flooding. */
function toDiscard(r: Race) {
  const t = r.turn!;
  const c = r.cars[t.car];
  const rec = recOf(r);
  t.stage = 'discard';
  t.offer = null;
  for (const cp of cornerBill(r, c, t.start, c.pos, t.speed, t.grip)) {
    if (cp.relieved) c.reliefLap = cp.lap;
    const spin = cp.cost > c.engine;
    if (cp.corner >= 0) {
      if (t.speed === cp.limit) c.stats.atLimit++;
      const row = { at: spaceOf(r, cp.m), limit: cp.limit, paid: spin ? 0 : cp.cost };
      rec.corners.push(row);
      rec.events.push({ k: 'corner', ...row });
    }
    if (spin) return spinOut(r, c, cp.m);
    payHeat(c, cp.cost);
    if (cp.corner >= 0) {
      c.stats.cornerPaid += cp.cost;
      c.stats.maxCornerPay = Math.max(c.stats.maxCornerPay, cp.cost);
    } else if (cp.cost) rec.events.push({ k: 'pay', n: cp.cost });
  }
  if (c.pos >= lineOf(r)) return;
  // AX-MOD-3 gravel and AX-MOD-1 flooding put Heat from the pit stock in the discard.
  const end = spaceOf(r, c.pos);
  const circ = circuitOf(r);
  const gravelAt = r.event === 'duststorm' ? 5 : 7;
  if (r.modules.dust && circ.gravel[end] && t.speed >= gravelAt && !c.fit.noGravel) {
    c.discard.push(HEAT);
    rec.events.push({ k: 'heat', n: 1, why: 'gravel' });
  }
  if (r.sectors[circ.sector[end]] === 'flood' && t.speed >= 8 && !c.fit.noFlood) {
    c.discard.push(HEAT);
    rec.events.push({ k: 'heat', n: 1, why: 'flood' });
  }
}

/** AX-SPN-1: back to the last free space before the corner, gear 1, and Stress from the pit stock into the hand. */
function spinOut(r: Race, c: Car, m: number) {
  const t = r.turn!;
  const rec = recOf(r);
  c.pos = t.start;
  c.lane = t.lane0;
  for (let q = m - 1; q > t.start; q--) {
    const l = freeLane(r, q, c.id);
    if (l >= 0) {
      c.pos = q;
      c.lane = l;
      break;
    }
  }
  c.arrived = ++r.seq;
  const n = Math.max(0, (rec.gear <= 2 ? 1 : 2) - (c.fit.spinRelief ?? 0));
  for (let i = 0; i < n; i++) c.hand.push(STRESS);
  c.spun = true;
  c.stats.spins++;
  rec.spun = true;
  rec.to = c.pos;
  rec.events.push({ k: 'spin', to: c.pos, lane: c.lane, stress: n });
}

/** AX-TURN-7 and AX-END-1: throw away, played cards to the discard, refill, and the next driver. */
function endTurn(r: Race, discard: number[]) {
  const t = r.turn!;
  const c = r.cars[t.car];
  const rec = recOf(r);
  if (discard.length) {
    c.play.push(...discard.map((i) => c.hand[i]));
    c.hand = c.hand.filter((_, i) => !discard.includes(i));
    rec.events.push({ k: 'discard', n: discard.length });
  }
  c.discard.push(...c.play);
  c.play = [];
  rec.dist = c.pos - t.start;
  rec.to = c.pos;
  const line = lineOf(r);
  if (c.pos >= line) {
    c.done = { place: 0, round: r.round, over: c.pos - line };
    rec.finished = true;
    rec.events.push({ k: 'finish', over: c.pos - line });
  } else refill(r, c);
  c.stats.topSpeed = Math.max(c.stats.topSpeed, t.speed);
  c.stats.bestDist = Math.max(c.stats.bestDist, rec.dist);
  if (rec.gear === 4) c.stats.gear4++;
  c.gear = c.spun ? 1 : rec.gear;
  r.turn = null;
  r.res!.idx++;
}

function endRound(r: Race) {
  const res = r.res!;
  // AX-FIN-2: this round's finishers by distance past the line, then racing line (lane), then driving order.
  const now = res.order.filter((id) => r.cars[id].done?.round === r.round);
  now.sort((a, b) => r.cars[b].done!.over - r.cars[a].done!.over || r.cars[a].lane - r.cars[b].lane || res.order.indexOf(a) - res.order.indexOf(b));
  for (const id of now) {
    r.finished.push(id);
    r.cars[id].done!.place = r.finished.length;
  }
  // AX-OVT-1
  const after = raceOrder(r);
  const at = (list: number[], id: number) => list.indexOf(id);
  for (const c of r.cars) {
    const passed = r.cars.filter((o) => o !== c && at(res.before, o.id) < at(res.before, c.id) && at(after, o.id) > at(after, c.id)).length;
    c.stats.overtakes += passed;
    c.stats.bestCharge = Math.max(c.stats.bestCharge, passed);
  }
  const leader = r.cars[after[0]];
  if (r.round === 1) leader.stats.ledR1 = true;
  const crossed = r.last.find((x) => x.car === leader.id);
  if (crossed && Math.floor(crossed.from / r.n) < Math.floor(leader.pos / r.n) && crossed.from >= 0) leader.stats.ledLap = true;
  r.res = null;
  r.plans = r.cars.map(() => null);
  // AX-END-2: the race runs until every car has finished.
  if (!r.cars.some((c) => !c.done) || r.round >= MAX_ROUNDS) {
    for (const id of raceOrder(r)) {
      const c = r.cars[id];
      if (c.done) continue;
      r.finished.push(id);
      c.done = { place: r.finished.length, round: r.round, over: -1 };
    }
    r.phase = 'over';
  } else {
    r.round++;
    r.phase = 'plan';
  }
  r.step++;
}

export type TurnOptions = ReturnType<typeof turnOptions>;
