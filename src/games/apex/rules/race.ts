/**
 * One race: setup and the deterministic round resolution (APEX.md §1–8, §12). Functions here mutate the race they are
 * given; the engine clones state before calling them. All randomness comes from `race.rng`.
 */
import { randInt, seedRng, shuffle, type RngState } from '../../../engine/rng';
import { baseDeck, cardFx, committable, isValued, STRAIN, STRESS, valueOf, type Card } from './cards';
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
  /** Rounds the field gets after the first finisher (AX-FIN-3). */
  finishRounds?: number;
}

export interface Plan {
  gear: number;
  /** Hand indices to commit; empty means limp (AX-PLAN-3). */
  cards: number[];
  /** Hand indices to throw away at the end of the round. */
  discard: number[];
  boost: boolean;
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

/** What happened to one car in the last resolved round. Public once revealed. */
export interface Resolved {
  car: number;
  gear: number;
  shift: number;
  cards: Card[];
  flipped: Card[];
  boost: boolean;
  speed: number;
  dist: number;
  from: number;
  to: number;
  /** Positions along the way, for drawing the path: after the move, after the draft. */
  corners: { at: number; limit: number; paid: number }[];
  spun: boolean;
  drafted: number;
  cooled: number;
  catchup: boolean;
  finished: boolean;
  limp: boolean;
  hazard: number;
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
  /** Committed and thrown-away cards, out of play until the round ends (AX-DECK-1). */
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

interface Working {
  car: number;
  speed: number;
  cardGrip: number;
  cardDraft: number;
  cool: number;
  catchup: boolean;
  start: number;
  rec: Resolved;
}

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
  phase: 'plan' | 'react' | 'over';
  rng: RngState;
  seed: string;
  seq: number;
  plans: (Plan | null)[];
  res: { order: number[]; idx: number; catchup: number[]; before: number[]; finishers: [number, number, number][]; cur: Working | null } | null;
  /** A driver deciding whether to take a draft that would overspeed a corner (AX-DRF-2). */
  pending: { car: number; len: number; hazard: number } | null;
  last: Resolved[];
  endRound: number | null;
  finished: number[];
  replay: { plans: (Plan | null)[]; reacts: [number, boolean][] }[];
  finishRounds: number;
}

export const HAND = 7;
export const ENGINE = 6;
export const GEAR_COOL = [3, 1, 0, 0];

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
    pending: null,
    last: [],
    endRound: null,
    finished: [],
    replay: [],
    finishRounds: s.finishRounds ?? 2,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Queries

/** The public parts of a race that rules queries need; the AI gets only these. */
export type Track = Pick<Race, 'circuit' | 'laps' | 'n' | 'modules' | 'weather' | 'sectors' | 'cornerDelta'>;

export const circuitOf = (r: Track): Circuit => resolveCircuit(r.circuit);
export const spaceOf = (r: Track, pos: number) => ((pos % r.n) + r.n) % r.n;
export const weatherOf = (r: Track) => WEATHER.find((w) => w.id === r.weather) ?? WEATHER[0];

export function lanesAt(r: Race, space: number): number {
  return r.modules.mountains && circuitOf(r).tunnel[space] ? 1 : 2;
}

/** The lowest free lane of a space, ignoring one car, or -1. Cars a lap apart share the physical space. */
export function freeLane(r: Race, pos: number, except: number): number {
  const sp = spaceOf(r, pos);
  for (let l = 0; l < lanesAt(r, sp); l++)
    if (!r.cars.some((o) => o.id !== except && !o.done && spaceOf(r, o.pos) === sp && o.lane === l)) return l;
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

/** Strain cost of shifting to gear `g`, or null if the shift is not allowed (AX-GEAR-2). */
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
  const last = Math.min(to, r.laps * r.n - 1);
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

/** Can this car drive at all, other than limping? Some gear it can reach with enough committable cards and Strain. */
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
  if (typeof p !== 'object' || !p || !Array.isArray(p.cards) || !Array.isArray(p.discard)) return 'Malformed plan.';
  const idx = [...p.cards, ...p.discard];
  if (idx.some((i) => !Number.isInteger(i) || i < 0 || i >= c.hand.length) || new Set(idx).size !== idx.length)
    return 'Pick each card from your hand once.';
  const strainOut = p.discard.filter((i) => c.hand[i] === STRAIN).length;
  if (strainOut > (c.fit.dumpStrain ?? 0)) return 'Strain cannot be thrown away.';
  if (p.cards.length === 0) {
    if (canDrive(c)) return 'You have cards to drive with: commit as many cards as your gear.';
    if (p.boost) return 'A limping car cannot boost.';
    return null;
  }
  const sc = shiftCost(c, p.gear);
  if (sc == null) return 'You can shift at most one gear for free, or two for 1 Strain.';
  if (p.cards.length !== p.gear) return `Gear ${p.gear} commits exactly ${p.gear} card${p.gear > 1 ? 's' : ''}.`;
  if (p.cards.some((i) => !committable(c.hand[i]))) return 'Strain cannot be committed.';
  const cost = sc + p.cards.reduce((s, i) => s + (cardFx(c.hand[i])?.cost ?? 0), 0);
  if (cost > c.engine) return 'Your engine has too little Strain left for that.';
  if (p.boost && r.modules.mountains && circuitOf(r).tunnel[spaceOf(r, c.pos)] && !c.fit.tunnelBoost)
    return 'No boosting from inside a tunnel.';
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

// ---------------------------------------------------------------------------------------------------------------------
// Resolution

export function allPlanned(r: Race): boolean {
  return r.cars.every((c) => c.done || r.plans[c.id]);
}

/** Lock a plan (or clear it with null). The caller checks `planError` first. */
export function setPlan(r: Race, carId: number, p: Plan | null) {
  r.plans[carId] = p ? { gear: p.cards.length ? p.gear : 1, cards: [...p.cards], discard: [...p.discard], boost: !!p.boost } : null;
}

/** AX-PLAN-5: every plan is in; reveal and resolve until done or a driver must decide. */
export function reveal(r: Race) {
  const order = raceOrder(r).filter((id) => !r.cars[id].done);
  const k = order.length >= 2 ? Math.min(order.length - 1, (order.length >= 5 ? 2 : 1) + (r.event === 'fever' ? 1 : 0)) : 0;
  r.replay.push({ plans: r.plans.map((p) => (p ? { ...p, cards: [...p.cards], discard: [...p.discard] } : null)), reacts: [] });
  r.res = { order, idx: 0, catchup: order.slice(order.length - k), before: raceOrder(r), finishers: [], cur: null };
  r.last = [];
  advance(r);
}

/** Answer a pending draft decision and carry on resolving. */
export function react(r: Race, take: boolean) {
  const p = r.pending!;
  r.pending = null;
  r.phase = 'plan';
  r.replay[r.replay.length - 1].reacts.push([p.car, take]);
  const w = r.res!.cur!;
  if (take) draft(r, r.cars[p.car], w, p.len);
  finishCar(r, w);
  r.res!.idx++;
  advance(r);
}

function advance(r: Race) {
  const res = r.res!;
  while (res.idx < res.order.length) {
    const c = r.cars[res.order[res.idx]];
    const w = startCar(r, c, r.plans[c.id]!);
    res.cur = w;
    const offer = draftOffer(r, c, w);
    if (offer) {
      if (offer.hazard > 0) {
        r.pending = { car: c.id, len: offer.len, hazard: offer.hazard };
        r.phase = 'react';
        r.step++;
        return;
      }
      draft(r, c, w, offer.len);
    }
    finishCar(r, w);
    res.idx++;
  }
  endRound(r);
}

function startCar(r: Race, c: Car, p: Plan): Working {
  const limp = p.cards.length === 0;
  const catchup = r.res!.catchup.includes(c.id);
  const cards = p.cards.map((i) => c.hand[i]);
  const rec: Resolved = {
    car: c.id, gear: limp ? 1 : p.gear, shift: 0, cards, flipped: [], boost: false, speed: 0, dist: 0, from: c.pos,
    to: c.pos, corners: [], spun: false, drafted: 0, cooled: 0, catchup, finished: false, limp, hazard: 0,
  };
  // Committed and thrown-away cards leave the hand now; they reach the discard at the end of the round.
  const out = new Set([...p.cards, ...p.discard]);
  c.play.push(...cards, ...p.discard.map((i) => c.hand[i]));
  c.hand = c.hand.filter((_, i) => !out.has(i));
  c.spun = false;
  let speed = 0, value = 0, cool = 0, cardGrip = 0, cardDraft = 0;
  if (limp) {
    speed = value = 1;
  } else {
    const pay = (shiftCost(c, p.gear) ?? 0) + cards.reduce((s, x) => s + (cardFx(x)?.cost ?? 0), 0);
    rec.shift = pay;
    payStrain(c, pay);
    for (const x of cards) {
      const fx = cardFx(x);
      if (fx) {
        speed += fx.speed ?? fx.value;
        value += fx.value;
        cool += fx.cool ?? 0;
        cardGrip += fx.grip ?? 0;
        cardDraft += fx.draft ?? 0;
      }
      const flips = x === STRESS ? 1 : fx?.flips ?? 0;
      for (let f = 0; f < flips; f++) {
        const v = flip(r, c, rec);
        speed += v;
        value += v;
      }
    }
    if (p.boost) {
      const lap = Math.floor(Math.max(0, c.pos) / r.n);
      const free = c.fit.freeBoostPerLap && c.freeBoostLap !== lap;
      if (free || c.engine > 0) {
        if (free) c.freeBoostLap = lap;
        else payStrain(c, 1);
        rec.boost = true;
        c.stats.boosts++;
        for (let f = 0; f < 1 + (c.fit.boostFlips ?? 0); f++) {
          const v = flip(r, c, rec);
          speed += v;
          value += v;
        }
      }
    }
  }
  const dist = value + (catchup ? 1 + (c.fit.catchDist ?? 0) : 0) + (r.round === 1 ? c.fit.launch ?? 0 : 0);
  rec.speed = speed;
  rec.dist = dist;
  const g = rec.gear;
  cool +=
    GEAR_COOL[g - 1] + ((g === 1 ? c.fit.cool1 : g === 2 ? c.fit.cool2 : g === 3 ? c.fit.cool3 : 0) ?? 0) + (c.fit.coolAll ?? 0);
  if ((weatherOf(r).limit ?? 0) < 0) cool += c.fit.rainCool ?? 0;
  const w: Working = { car: c.id, speed, cardGrip, cardDraft, cool, catchup, start: c.pos, rec };
  move(r, c, w, dist);
  return w;
}

function payStrain(c: Car, n: number) {
  const k = Math.min(n, c.engine);
  c.engine -= k;
  for (let i = 0; i < k; i++) c.discard.push(STRAIN);
}

/** Move `dist` spaces with blocking, corner checks and spins (AX-MOV, AX-CRN, AX-SPN, AX-FIN-1). */
function move(r: Race, c: Car, w: Working, dist: number) {
  const from = c.pos;
  const line = r.laps * r.n;
  const target = from + dist;
  let stop = from, lane = c.lane;
  if (target >= line) stop = target;
  else
    for (let q = target; q > from; q--) {
      const l = freeLane(r, q, c.id);
      if (l >= 0) {
        stop = q;
        lane = l;
        break;
      }
    }
  for (const cp of checkpoints(r, c, from, stop, w.speed, w.cardGrip)) {
    let cost = cp.cost;
    const lap = Math.floor(cp.m / r.n);
    if (cost > 0 && cp.corner >= 0 && c.fit.overspeedRelief && c.reliefLap !== lap) {
      c.reliefLap = lap;
      cost = Math.max(0, cost - c.fit.overspeedRelief);
    }
    if (cp.corner >= 0) {
      if (w.speed === cp.limit) c.stats.atLimit++;
      w.rec.corners.push({ at: spaceOf(r, cp.m), limit: cp.limit, paid: cost > c.engine ? 0 : cost });
    }
    if (cost > c.engine) return spin(r, c, w, cp.m, from);
    payStrain(c, cost);
    if (cp.corner >= 0) {
      c.stats.cornerPaid += cost;
      c.stats.maxCornerPay = Math.max(c.stats.maxCornerPay, cost);
    }
  }
  if (stop >= line) {
    c.pos = target;
    c.done = { place: 0, round: r.round, over: target - line };
    r.res!.finishers.push([c.id, target - line, r.res!.idx]);
    w.rec.finished = true;
  } else if (stop !== from) {
    c.pos = stop;
    c.lane = lane;
    c.arrived = ++r.seq;
  }
  w.rec.to = c.pos;
}

function spin(r: Race, c: Car, w: Working, m: number, from: number) {
  let stop = from, lane = c.lane;
  for (let q = m - 1; q > from; q--) {
    const l = freeLane(r, q, c.id);
    if (l >= 0) {
      stop = q;
      lane = l;
      break;
    }
  }
  if (stop !== from) {
    c.pos = stop;
    c.lane = lane;
    c.arrived = ++r.seq;
  }
  const n = Math.max(0, (w.rec.gear <= 2 ? 1 : 2) - (c.fit.spinRelief ?? 0));
  for (let i = 0; i < n; i++) c.hand.push(STRAIN);
  c.spun = true;
  c.stats.spins++;
  w.rec.spun = true;
  w.rec.to = c.pos;
}

/** AX-DRF-1: a draft on offer after the move, with the Strain it would cost (`hazard` > 0 means a real choice). */
export function draftOffer(r: Race, c: Car, w: Working): { len: number; hazard: number } | null {
  // Interpretation: only a car that moved this round can draft (AX-DRF-1 "after moving").
  if (c.spun || c.done || c.pos <= w.start) return null;
  if (weatherOf(r).noDraft && !c.fit.rainDraft) return null;
  const sp = spaceOf(r, c.pos);
  const near = r.cars.some(
    (o) => o.id !== c.id && !o.done && (spaceOf(r, o.pos) === sp || spaceOf(r, o.pos) === spaceOf(r, c.pos + 1)),
  );
  if (!near) return null;
  const circ = circuitOf(r);
  const tail = r.sectors[circ.sector[sp]] === 'tail' ? 1 : 0;
  const len = 2 + (c.fit.draft ?? 0) + w.cardDraft + tail;
  if (r.modules.mountains && !c.fit.tunnelDraft)
    for (let m = c.pos; m <= c.pos + len; m++) if (circ.tunnel[spaceOf(r, m)]) return null;
  const hazard = checkpoints(r, c, c.pos, c.pos + len, w.speed, w.cardGrip).reduce((s, x) => s + x.cost, 0);
  return { len, hazard };
}

function draft(r: Race, c: Car, w: Working, len: number) {
  const before = c.pos;
  move(r, c, w, len);
  w.rec.drafted = c.done ? len : c.pos - before;
  if (w.rec.drafted > 0) c.stats.drafts++;
}

function finishCar(r: Race, w: Working) {
  const c = r.cars[w.car];
  const rec = w.rec;
  rec.dist = c.pos - w.start;
  const end = spaceOf(r, c.pos);
  const circ = circuitOf(r);
  if (!c.done) {
    // AX-MOD-3 gravel and AX-MOD-1 flooding put Strain from the pit stock in the discard.
    const gravelAt = r.event === 'duststorm' ? 5 : 7;
    if (r.modules.dust && circ.gravel[end] && w.speed >= gravelAt && !c.fit.noGravel) c.discard.push(STRAIN);
    if (r.sectors[circ.sector[end]] === 'flood' && w.speed >= 8 && !c.fit.noFlood) c.discard.push(STRAIN);
  }
  const cool = w.cool + (w.catchup && !c.spun ? 1 + (c.fit.catchCool ?? 0) : 0);
  let cooled = 0;
  for (let i = c.hand.length - 1; i >= 0 && cooled < cool; i--)
    if (c.hand[i] === STRAIN) {
      c.hand.splice(i, 1);
      c.engine++;
      cooled++;
    }
  rec.cooled = cooled;
  c.stats.cooled += cooled;
  c.stats.topSpeed = Math.max(c.stats.topSpeed, w.speed);
  c.stats.bestDist = Math.max(c.stats.bestDist, rec.dist);
  if (rec.gear === 4) c.stats.gear4++;
  c.gear = c.spun ? 1 : rec.gear;
  r.last.push(rec);
  r.res!.cur = null;
}

function endRound(r: Race) {
  const res = r.res!;
  // AX-FIN-2: same-round finishers by overshoot, then resolution order.
  res.finishers.sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  for (const [id] of res.finishers) {
    r.finished.push(id);
    r.cars[id].done!.place = r.finished.length;
  }
  if (res.finishers.length && r.endRound == null) r.endRound = r.round + r.finishRounds;
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
  // AX-END-1
  for (const c of r.cars) {
    c.discard.push(...c.play);
    c.play = [];
    if (!c.done) refill(r, c);
  }
  r.res = null;
  r.plans = r.cars.map(() => null);
  const running = r.cars.filter((c) => !c.done);
  if (!running.length || (r.endRound != null && r.round >= r.endRound)) {
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
