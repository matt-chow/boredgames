/**
 * Apex '66 as a room game: phases, actions, the projection, the planning timer, autopilot and retention
 * (APEX_ARCHITECTURE.md §2, §5). Computer cars are not seats: the engine plans them itself from their own view.
 */
import type { ApplyResult, PlayerResult } from '../../../engine/types';
import { seedRng, shuffle } from '../../../engine/rng';
import { aiDraft, aiPlan, aiView, type AiView } from './ai';
import { CIRCUIT_IDS, resolveCircuit } from './content/circuits';
import { RIVALS } from './content/paddock';
import {
  newRace, planError, react, reveal, setPlan,
  type AiSpec, type Level, type Modules, type Plan, type Race, type RaceSetup, type Resolved, type Risk,
} from './race';
import {
  aiPick, newSeason, pick, pickError, raceSetup, scoreRace, standings,
  type Draft, type Driver, type RaceResult, type Season,
} from './season';

export const STATE_VERSION = 1;
export const MAX_CARS = 8;
export const TIMERS = [0, 30, 60, 90] as const;
export const SEASON_LENGTHS = [3, 5, 8] as const;
const DAY = 24 * 3600_000;
const COMPUTER_NAMES = ['Hal Porter', 'Rosa Lindqvist', 'Tomás Ferreira', 'Agnes Moreau', 'Wim Dekker', 'Lucia Rinaldi', 'Ivo Brandt', 'Mae Calloway'];

export type Mode = 'quick' | 'solo' | 'championship' | 'school';

export interface AConfig {
  mode: Mode;
  circuit: string;
  /** null: the circuit's default (AX-FIN-4). */
  laps: number | null;
  /** Championship length; 0 means the custom list in `races`. */
  length: number;
  races: string[];
  /** Total cars; computer cars fill the grid beyond the people. */
  cars: number;
  aiRisk: Risk;
  aiLevel: Level;
  /** Planning timer in seconds; 0 is off (AX-PLAN-6). */
  timer: number;
  storm: boolean;
  mountains: boolean;
  dust: boolean;
  rivals: boolean;
  basic: boolean;
  advanced: boolean;
  environmental: boolean;
  sponsors: boolean;
  press: boolean;
  events: boolean;
}

export interface Replay {
  format: 'apex66-replay';
  version: 1;
  setup: RaceSetup;
  rounds: Race['replay'];
}

export interface AState {
  config: AConfig;
  seats: number;
  season: Season;
  race: Race | null;
  phase: 'race' | 'podium' | 'draft' | 'over';
  /** Every action names this; it changes whenever earlier intents would be out of date (AX-NET-1). */
  step: number;
  ready: number[];
  online: boolean[];
  /** Seats the computer drives while their person is away (AX-NET-3). */
  autopilot: number[];
  shelved: boolean;
  deadline: number | null;
  /** Seats whose last plan the timer chose; cleared when someone plans again. */
  timedOut: number[];
  replays: Replay[];
}

export type AAction =
  | { type: 'plan'; step: number; gear: number; cards: number[]; discard: number[]; boost: boolean }
  | { type: 'retract'; step: number }
  | { type: 'react'; step: number; take: boolean }
  | { type: 'pick'; step: number; take: string | null; give: string | null }
  | { type: 'ready'; step: number }
  | { type: 'shelve'; step: number }
  | { type: 'autopilot'; step: number; seat: number; on: boolean };

export interface CarView {
  id: number;
  seat: number | null;
  name: string;
  number: number;
  livery: number;
  rival?: string;
  upgrades: string[];
  pos: number;
  lane: number;
  gear: number;
  engine: number;
  hand: number;
  deck: number;
  discard: number;
  planned: boolean;
  spun: boolean;
  done: Race['cars'][number]['done'];
  stats: Race['cars'][number]['stats'];
}

export interface AView {
  seat: number | null;
  mode: Mode;
  phase: AState['phase'];
  step: number;
  config: AConfig;
  race: {
    circuit: string; laps: number; n: number; round: number; phase: Race['phase']; weather: string; sectors: string[];
    event: string | null; cornerDelta: number[]; modules: Modules; endRound: number | null; finished: number[];
    cars: CarView[]; last: Resolved[]; pending: Race['pending'];
  } | null;
  /** Your own car, if you drive one: hand in order, deck contents sorted, your locked plan. */
  me: { car: number; hand: string[]; discard: string[]; plan: Plan | null; ai: AiView } | null;
  season: {
    champ: boolean; races: string[]; index: number; over: boolean; standings: number[];
    drivers: Omit<Driver, 'ai'>[]; results: RaceResult[]; draft: Draft | null; next: { event: string | null; press: string[]; grid: number[] } | null;
  };
  /** This race's press objectives. */
  press: string[];
  ready: number[];
  online: boolean[];
  autopilot: number[];
  shelved: boolean;
  deadline: number | null;
  timedOut: number[];
  /** Finished races only (AX-REP-2). */
  replays: Replay[];
}

// ---------------------------------------------------------------------------------------------------------------------
// Config

export function defaultConfig(playerCount: number): AConfig {
  return {
    mode: 'quick', circuit: 'ashford', laps: null, length: 3, races: [], cars: Math.min(MAX_CARS, Math.max(playerCount, 6)),
    aiRisk: 'balanced', aiLevel: 'club', timer: 0,
    storm: true, mountains: true, dust: true, rivals: true, basic: true, advanced: true, environmental: true,
    sponsors: true, press: true, events: true,
  };
}

export function validateConfig(c: AConfig, n: number): string | null {
  if ((c.mode === 'solo' || c.mode === 'school') && n !== 1) return c.mode === 'school' ? 'Driving School is for one driver.' : 'Solo is for one driver.';
  if (c.mode !== 'school' && c.cars < n) return `There are ${n} drivers: the grid needs at least ${n} cars.`;
  if (c.mode === 'solo' && c.cars < 2) return 'Solo needs at least one computer car.';
  if (c.mode === 'championship' && c.length === 0 && !c.races.length) return 'Choose the circuits for the custom season.';
  return null;
}

export function sanitizeConfig(raw: Record<string, unknown>): { config: Partial<AConfig> } | { error: string } {
  const out: Partial<AConfig> = {};
  const int = (v: unknown) => typeof v === 'number' && Number.isInteger(v);
  if (raw.mode !== undefined) {
    if (!['quick', 'solo', 'championship', 'school'].includes(raw.mode as string)) return { error: 'That mode is not one of the choices.' };
    out.mode = raw.mode as Mode;
  }
  if (raw.circuit !== undefined) {
    if (!CIRCUIT_IDS.includes(raw.circuit as string)) return { error: 'That circuit does not exist.' };
    out.circuit = raw.circuit as string;
  }
  if (raw.laps !== undefined) {
    if (raw.laps !== null && !(int(raw.laps) && (raw.laps as number) >= 1 && (raw.laps as number) <= 5)) return { error: 'Laps are 1 to 5.' };
    out.laps = raw.laps as number | null;
  }
  if (raw.length !== undefined) {
    if (![0, ...SEASON_LENGTHS].includes(raw.length as number)) return { error: 'A season is 3, 5 or 8 races, or custom.' };
    out.length = raw.length as number;
  }
  if (raw.races !== undefined) {
    const r = raw.races;
    if (!Array.isArray(r) || r.length > 12 || r.some((x) => !CIRCUIT_IDS.includes(x))) return { error: 'A custom season lists up to 12 circuits.' };
    out.races = r as string[];
  }
  if (raw.cars !== undefined) {
    if (!(int(raw.cars) && (raw.cars as number) >= 1 && (raw.cars as number) <= MAX_CARS)) return { error: `A grid has 1 to ${MAX_CARS} cars.` };
    out.cars = raw.cars as number;
  }
  if (raw.aiRisk !== undefined) {
    if (!['cautious', 'balanced', 'bold'].includes(raw.aiRisk as string)) return { error: 'That risk is not one of the choices.' };
    out.aiRisk = raw.aiRisk as Risk;
  }
  if (raw.aiLevel !== undefined) {
    if (!['novice', 'club', 'works'].includes(raw.aiLevel as string)) return { error: 'That level is not one of the choices.' };
    out.aiLevel = raw.aiLevel as Level;
  }
  if (raw.timer !== undefined) {
    if (!(TIMERS as readonly unknown[]).includes(raw.timer)) return { error: 'The timer is off, 30, 60 or 90 seconds.' };
    out.timer = raw.timer as number;
  }
  return { config: out };
}

// ---------------------------------------------------------------------------------------------------------------------
// Setup

export function setup(seats: number, seed: string, cfg: AConfig): AState {
  const school = cfg.mode === 'school';
  const c: AConfig = school
    ? { ...cfg, circuit: 'ashford', laps: 1, cars: 3, aiRisk: 'cautious', aiLevel: 'novice', timer: 0, storm: false, mountains: false, dust: false, rivals: false, sponsors: false, press: false, events: false }
    : cfg;
  const rng = seedRng(`grid:${seed}`);
  const rivals = c.rivals ? shuffle(rng, RIVALS.map((r) => r.id)) : [];
  const names = shuffle(rng, [...COMPUTER_NAMES]);
  const ai: AiSpec = { risk: c.aiRisk, level: c.aiLevel };
  const total = school ? 3 : Math.max(seats, c.cars);
  const drivers = Array.from({ length: total }, (_, i) => {
    if (i < seats) return { seat: i, name: `Driver ${i + 1}`, number: i + 1, livery: i };
    const k = i - seats;
    const rival = rivals[k];
    return {
      seat: null, name: rival ? RIVALS.find((r) => r.id === rival)!.driver : names[k], number: i + 1, livery: i, ai,
      ...(rival ? { rival } : {}),
    };
  });
  const champ = c.mode === 'championship';
  const races = champ ? (c.length === 0 ? c.races : shuffle(rng, [...CIRCUIT_IDS]).slice(0, c.length)) : [c.circuit];
  const paddock = {
    modules: { storm: c.storm, mountains: c.mountains, dust: c.dust, rivals: c.rivals },
    pools: { basic: c.basic, advanced: c.advanced, environmental: c.environmental },
    sponsors: c.sponsors, press: c.press, events: c.events, laps: c.laps,
  };
  // Driving School always runs the same race (AX-MODE-1).
  const season = newSeason(school ? 'driving-school' : seed, races, paddock, drivers, champ);
  const s: AState = {
    config: c, seats, season, race: null, phase: 'race', step: 1, ready: [], online: Array(seats).fill(true),
    autopilot: [], shelved: false, deadline: null, timedOut: [], replays: [],
  };
  startRace(s);
  settle(s);
  return s;
}

function startRace(s: AState) {
  s.race = newRace(raceSetup(s.season));
  s.phase = 'race';
  s.ready = [];
}

// ---------------------------------------------------------------------------------------------------------------------
// Flow

const carOf = (s: AState, seat: number) => s.race?.cars.find((c) => c.seat === seat) ?? null;
const driverOf = (s: AState, seat: number) => s.season.drivers.findIndex((d) => d.seat === seat);
/** A car the computer drives right now: a computer car, or a person's car on autopilot. */
const computerDriven = (s: AState, seat: number | null) => seat == null || s.autopilot.includes(seat);
const specOf = (s: AState, seat: number | null, own?: AiSpec): AiSpec => own ?? (seat == null ? { risk: s.config.aiRisk, level: s.config.aiLevel } : { risk: 'balanced', level: 'club' });

/** Run everything the computer can do until a person must act. */
function settle(s: AState) {
  for (let guard = 0; guard < 10_000; guard++) {
    if (s.phase === 'race') {
      const r = s.race!;
      if (r.phase === 'react') {
        const c = r.cars[r.pending!.car];
        if (!computerDriven(s, c.seat)) return;
        react(r, aiDraft(aiView(r, c.id, specOf(s, c.seat, c.ai)), r.pending!.hazard));
        continue;
      }
      if (r.phase === 'plan') {
        if (r.cars.some((c) => !c.done && !r.plans[c.id] && !computerDriven(s, c.seat))) return;
        for (const c of r.cars)
          if (!c.done && !r.plans[c.id]) setPlan(r, c.id, aiPlan(aiView(r, c.id, specOf(s, c.seat, c.ai))));
        s.deadline = null;
        reveal(r);
        continue;
      }
      // The race is over.
      s.replays.push({ format: 'apex66-replay', version: 1, setup: raceSetup(s.season), rounds: r.replay });
      scoreRace(s.season, r);
      if (!s.season.champ) {
        s.phase = 'over';
        return;
      }
      s.phase = 'podium';
      s.ready = [];
      continue;
    }
    if (s.phase === 'podium') {
      const waiting = s.season.drivers.some((d) => d.seat != null && !computerDriven(s, d.seat) && !s.ready.includes(d.seat));
      if (waiting) return;
      s.shelved = false;
      s.phase = s.season.over ? 'over' : 'draft';
      continue;
    }
    if (s.phase === 'draft') {
      const d = s.season.draft;
      if (!d) {
        startRace(s);
        continue;
      }
      const who = d.order[0];
      if (!computerDriven(s, s.season.drivers[who].seat)) return;
      const p = aiPick(s.season, who);
      pick(s.season, who, p.take, p.give);
      continue;
    }
    return;
  }
}

const progressKey = (s: AState) =>
  `${s.phase}:${s.race?.step}:${s.race?.round}:${s.season.index}:${s.season.draft?.order.length ?? -1}`;

const fail = (code: string, error: string): ApplyResult<AState> => ({ ok: false, code, error });

export function apply(state: AState, seat: number, raw: AAction): ApplyResult<AState> {
  const a = raw as AAction;
  if (!a || typeof a !== 'object' || typeof a.type !== 'string') return fail('bad-request', 'Unknown action.');
  if (a.step !== state.step) return fail('stale', 'The table moved on before that arrived.');
  if (state.phase === 'over') return fail('over', 'The event is over.');
  const s: AState = structuredClone(state);
  const r = s.race;
  const before = progressKey(s);
  switch (a.type) {
    case 'plan':
    case 'retract': {
      const c = carOf(s, seat);
      if (s.phase !== 'race' || r!.phase !== 'plan' || !c || c.done) return fail('not-now', 'There is nothing to plan right now.');
      if (s.autopilot.includes(seat)) return fail('autopilot', 'The computer is driving your car. Take it back first.');
      if (a.type === 'retract') {
        if (!r!.plans[c.id]) return fail('no-plan', 'You have no plan to take back.');
        setPlan(r!, c.id, null);
        break;
      }
      const plan: Plan = { gear: a.gear, cards: a.cards, discard: a.discard, boost: !!a.boost };
      const err = planError(r!, c.id, plan);
      if (err) return fail('illegal', err);
      setPlan(r!, c.id, plan);
      s.timedOut = [];
      break;
    }
    case 'react': {
      const c = carOf(s, seat);
      if (s.phase !== 'race' || r!.phase !== 'react' || !c || r!.pending!.car !== c.id) return fail('not-now', 'There is no draft for you to decide.');
      react(r!, !!a.take);
      break;
    }
    case 'pick': {
      if (s.phase !== 'draft') return fail('not-now', 'There is no draft now.');
      const d = driverOf(s, seat);
      const err = pickError(s.season, d, a.take ?? null, a.give ?? null);
      if (err) return fail('illegal', err);
      pick(s.season, d, a.take ?? null, a.give ?? null);
      break;
    }
    case 'ready':
      // A late or repeated Continue after the podium has closed is stale, not an error (AX-NET-1).
      if (s.phase !== 'podium') return fail('stale', 'The table moved on before that arrived.');
      if (!s.ready.includes(seat)) s.ready.push(seat);
      break;
    case 'shelve':
      if (s.phase !== 'podium') return fail('not-now', 'A season can only be shelved between races.');
      s.shelved = true;
      break;
    case 'autopilot': {
      const t = a.seat;
      if (!Number.isInteger(t) || t < 0 || t >= s.seats) return fail('bad-request', 'Choose a driver.');
      if (a.on) {
        // AX-NET-3: hand an absent car to the computer, approved by the host (seat 0), or by anyone while the host is away.
        if (s.online[t]) return fail('present', 'That driver is here.');
        if (seat !== 0 && s.online[0]) return fail('not-host', 'Only the host can hand a car to the computer.');
        if (!s.autopilot.includes(t)) s.autopilot.push(t);
      } else {
        if (t !== seat) return fail('not-yours', 'Only that driver can take their car back.');
        s.autopilot = s.autopilot.filter((x) => x !== t);
      }
      break;
    }
    default:
      return fail('bad-request', 'Unknown action.');
  }
  settle(s);
  if (progressKey(s) !== before) s.step++;
  return { ok: true, state: s, undoable: false };
}

/** AX-NET-2 and AX-PLAN-6: who is here, the pause, and the planning timer. */
export function tick(state: AState, now: number, online: boolean[]): AState | null {
  const s: AState = structuredClone(state);
  s.online = online.slice(0, s.seats);
  const r = s.race;
  const planning = s.phase === 'race' && r?.phase === 'plan' && s.config.timer > 0;
  const missing = planning ? r!.cars.filter((c) => !c.done && !r!.plans[c.id] && !computerDriven(s, c.seat)) : [];
  const paused = missing.some((c) => !s.online[c.seat!]);
  if (!planning || paused || !missing.length) s.deadline = null;
  else if (s.deadline == null) s.deadline = now + s.config.timer * 1000;
  else if (now >= s.deadline) {
    const before = progressKey(s);
    s.timedOut = missing.map((c) => c.seat!);
    for (const c of missing) setPlan(r!, c.id, aiPlan(aiView(r!, c.id, { risk: 'cautious', level: 'club' })));
    settle(s);
    if (progressKey(s) !== before) s.step++;
  }
  return JSON.stringify(s) === JSON.stringify(state) ? null : s;
}

export const wakeAt = (s: AState) => s.deadline;

export function actors(s: AState): number[] {
  const r = s.race;
  if (s.phase === 'race' && r) {
    if (r.phase === 'react') {
      const seat = r.cars[r.pending!.car].seat;
      return seat != null && !s.autopilot.includes(seat) ? [seat] : [];
    }
    return r.cars.filter((c) => c.seat != null && !c.done && !r.plans[c.id] && !s.autopilot.includes(c.seat)).map((c) => c.seat!);
  }
  if (s.phase === 'podium')
    return Array.from({ length: s.seats }, (_, i) => i).filter((i) => !s.ready.includes(i) && !s.autopilot.includes(i));
  if (s.phase === 'draft' && s.season.draft) {
    const seat = s.season.drivers[s.season.draft.order[0]].seat;
    return seat != null && !s.autopilot.includes(seat) ? [seat] : [];
  }
  return [];
}

// ---------------------------------------------------------------------------------------------------------------------
// Views and results

/** AX-PRV-1: hands, deck order, unrevealed plans and seeds of races in progress never leave here. */
export function project(s: AState, viewer: number | null): AView {
  const r = s.race;
  const mine = viewer == null ? null : carOf(s, viewer);
  // A finished car has nothing left to plan, so its driver gets no dashboard (AX-FIN-1).
  const live = r && r.phase !== 'over' && s.phase === 'race' && !mine?.done;
  return {
    seat: viewer,
    mode: s.config.mode,
    phase: s.phase,
    step: s.step,
    config: s.config,
    race: r && {
      circuit: r.circuit, laps: r.laps, n: r.n, round: r.round, phase: r.phase, weather: r.weather, sectors: r.sectors,
      event: r.event, cornerDelta: r.cornerDelta, modules: r.modules, endRound: r.endRound, finished: r.finished,
      cars: r.cars.map((c) => ({
        id: c.id, seat: c.seat, name: c.name, number: c.number, livery: c.livery, ...(c.rival ? { rival: c.rival } : {}),
        upgrades: c.upgrades, pos: c.pos, lane: c.lane, gear: c.gear, engine: c.engine, hand: c.hand.length,
        deck: c.deck.length, discard: c.discard.length, planned: !!r.plans[c.id], spun: c.spun, done: c.done, stats: c.stats,
      })),
      last: r.last,
      pending: r.pending,
    },
    me:
      mine && r && live
        ? { car: mine.id, hand: [...mine.hand], discard: [...mine.discard].sort(), plan: r.plans[mine.id], ai: aiView(r, mine.id, specOf(s, mine.seat)) }
        : null,
    season: {
      champ: s.season.champ, races: s.season.races, index: s.season.index, over: s.season.over, standings: standings(s.season),
      drivers: s.season.drivers.map(({ ai: _ai, ...d }) => d), results: s.season.results, draft: s.season.draft,
      next: s.season.next && { event: s.season.next.event, press: s.season.next.press, grid: s.season.next.grid },
    },
    press: s.season.next?.press ?? s.season.results.at(-1)?.press ?? [],
    ready: s.ready,
    online: s.online,
    autopilot: s.autopilot,
    shelved: s.shelved,
    deadline: s.deadline,
    timedOut: s.timedOut,
    replays: s.replays,
  };
}

export function results(s: AState): PlayerResult[] | null {
  if (s.phase !== 'over') return null;
  const order = standings(s.season);
  const last = s.season.results.at(-1)!;
  return Array.from({ length: s.seats }, (_, seat) => {
    const d = driverOf(s, seat);
    const rank = order.indexOf(d) + 1;
    const pts = s.season.drivers[d].points;
    return {
      seat, rank, winner: rank === 1, score: s.season.champ ? pts : last.rows[d].place === 1 ? 1 : 0,
      detail: s.season.champ ? `${pts} pts, P${rank} of ${order.length}` : `P${last.rows[d].place} of ${order.length}`,
    };
  });
}

/** AX-RET-1 for a started room. */
export function retainMs(s: AState, status: 'playing' | 'over'): number {
  if (status === 'over') return s.season.champ ? 7 * DAY : DAY;
  if (s.phase === 'race') return 7 * DAY;
  return s.shelved ? 90 * DAY : 30 * DAY;
}

/** Bot seats (a quitter's seat, the hub's "add a bot") play with the same driver, from the seat's own view. */
export function botActions(v: AView): AAction[] {
  const step = v.step;
  if (v.phase === 'race' && v.race && v.me) {
    if (v.race.phase === 'react' && v.race.pending?.car === v.me.car) return [{ type: 'react', step, take: aiDraft(v.me.ai, v.race.pending.hazard) }];
    if (v.race.phase === 'plan' && !v.me.plan) return [{ type: 'plan', step, ...aiPlan(v.me.ai) }];
  }
  if (v.phase === 'podium' && v.seat != null && !v.ready.includes(v.seat)) return [{ type: 'ready', step }];
  if (v.phase === 'draft' && v.season.draft && v.seat != null) {
    const d = v.season.drivers.findIndex((x) => x.seat === v.seat);
    if (v.season.draft.order[0] === d) return [{ type: 'pick', step, ...aiPick(v.season, d) }];
  }
  return [];
}

export { resolveCircuit };
