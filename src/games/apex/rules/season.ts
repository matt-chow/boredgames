/**
 * Championship seasons (AX-CH) and the paddock draws a single race shares: grid, event and press objectives. Pure; the
 * season carries its own RNG, and each race gets a seed derived from the season's.
 */
import { randInt, seedRng, shuffle, type RngState } from '../../../engine/rng';
import { resolveCircuit } from './content/circuits';
import { eventPool, PRESS, SPONSORS, type Need } from './content/paddock';
import { UPGRADE_BY_ID, upgradePool, type Pool } from './content/upgrades';
import type { AiSpec, Car, Modules, Race, RaceSetup } from './race';

export const POINTS = [9, 6, 4, 3, 2, 1, 0, 0];
export const MAX_UPGRADES = 4;
export const MAX_BONUS = 2;
export const SEASON_LENGTHS = [3, 5, 8];

export interface Paddock {
  modules: Modules;
  pools: Record<Pool, boolean>;
  sponsors: boolean;
  press: boolean;
  events: boolean;
  /** null: each circuit's default. */
  laps: number | null;
}

export interface Driver {
  seat: number | null;
  name: string;
  number: number;
  livery: number;
  rival?: string;
  ai?: AiSpec;
  upgrades: string[];
  sponsor: string | null;
  points: number;
  /** Finishing place in each race so far (1-based). */
  places: number[];
}

export interface RaceResult {
  circuit: string;
  event: string | null;
  press: string[];
  /** By driver: place, race points and bonus points. */
  rows: { place: number; points: number; bonus: number; earned: string[] }[];
}

export interface Draft {
  offer: string[];
  /** Drivers still to pick, in pick order. */
  order: number[];
}

export interface Season {
  seed: string;
  rng: RngState;
  races: string[];
  index: number;
  paddock: Paddock;
  drivers: Driver[];
  results: RaceResult[];
  /** The face-down upgrade stack for drafts. */
  stack: string[];
  draft: Draft | null;
  /** Drawn for the next race. */
  next: { event: string | null; press: string[]; grid: number[] } | null;
  over: boolean;
}

/** AX-CH-5/6: draw the event and press objectives for a race. */
export function drawPaddock(rng: RngState, p: Paddock, champ: boolean, last: boolean) {
  const has = { championship: champ, press: p.press, sponsors: p.sponsors && champ, notLast: !last, ...p.modules } as Record<Need, boolean>;
  const pool = p.events ? eventPool(has) : [];
  const event = pool.length ? pool[randInt(rng, pool.length)].id : null;
  const press = p.press ? shuffle(rng, PRESS.map((x) => x.id)).slice(0, event === 'pressday' ? 3 : 2) : [];
  return { event, press };
}

export function newSeason(seed: string, races: string[], paddock: Paddock, drivers: Omit<Driver, 'upgrades' | 'sponsor' | 'points' | 'places'>[]): Season {
  const rng = seedRng(`season:${seed}`);
  // Sponsors go to people first, then computer cars, while they last.
  const sponsors = paddock.sponsors ? shuffle(rng, SPONSORS.map((s) => s.id)) : [];
  const byPeople = drivers.map((d, i) => [d.seat == null ? 1 : 0, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, i]) => i);
  const sponsorOf: (string | null)[] = drivers.map(() => null);
  byPeople.forEach((i, k) => (sponsorOf[i] = sponsors[k] ?? null));
  const s: Season = {
    seed,
    rng,
    races: [...races],
    index: 0,
    paddock,
    drivers: drivers.map((d, i) => ({ ...d, upgrades: [], sponsor: sponsorOf[i], points: 0, places: [] })),
    results: [],
    stack: shuffle(rng, upgradePool(paddock.pools, paddock.modules).map((u) => u.id)),
    draft: null,
    next: null,
    over: false,
  };
  prepareNext(s);
  return s;
}

/** AX-CH-2: standings, best first. */
export function standings(s: Season): number[] {
  return s.drivers
    .map((_, i) => i)
    .sort((a, b) => {
      const A = s.drivers[a], B = s.drivers[b];
      if (A.points !== B.points) return B.points - A.points;
      for (let place = 1; place <= s.drivers.length; place++) {
        const d = B.places.filter((x) => x === place).length - A.places.filter((x) => x === place).length;
        if (d) return d;
      }
      return (A.places.at(-1) ?? 0) - (B.places.at(-1) ?? 0) || a - b;
    });
}

function prepareNext(s: Season) {
  const last = s.index === s.races.length - 1;
  const { event, press } = drawPaddock(s.rng, s.paddock, true, last);
  // AX-GRID-2: race one drawn, then reverse standings (the leader starts last).
  const grid = s.index === 0 || event === 'shuffle' ? shuffle(s.rng, s.drivers.map((_, i) => i)) : standings(s).reverse();
  s.next = { event, press, grid };
}

/** The race to run next. Grid slot k holds driver grid[k]; car ids are grid slots. */
export function raceSetup(s: Season): RaceSetup {
  const next = s.next!;
  const circuit = s.races[s.index];
  return {
    circuit,
    laps: s.paddock.laps ?? resolveCircuit(circuit).laps,
    seed: `${s.seed}:${s.index}`,
    modules: s.paddock.modules,
    event: next.event,
    cars: next.grid.map((d) => {
      const x = s.drivers[d];
      return { seat: x.seat, name: x.name, number: x.number, livery: x.livery, upgrades: [...x.upgrades], ...(x.rival ? { rival: x.rival } : {}), ...(x.ai ? { ai: x.ai } : {}) };
    }),
  };
}

const crossed = (c: Car) => !!c.done && c.done.over >= 0;

/** AX-CH-6: is a sponsor or press condition met? */
export function earned(r: Race, c: Car, id: string): boolean {
  const s = c.stats;
  switch (id) {
    case 'velox': return crossed(c) && s.spins === 0;
    case 'marlowe': return s.overtakes >= 5;
    case 'aurora': return s.ledLap;
    case 'castellan': return crossed(c) && c.engine >= 4;
    case 'kestrel': return s.gear4 >= 4;
    case 'halden': return crossed(c) && s.maxCornerPay <= 1;
    case 'holeshot': return s.ledR1;
    case 'charge': return s.bestCharge >= 3;
    case 'cool': return s.cooled >= 6;
    case 'limit': return s.atLimit >= 3;
    case 'slip': return s.drafts >= 3;
    case 'flat': return s.topSpeed >= 14;
    case 'comeback': return s.grid + 1 - c.done!.place >= 3;
    case 'fastest': return s.bestDist > 0 && s.bestDist === Math.max(...r.cars.map((o) => o.stats.bestDist));
    case 'nerve': return s.boosts >= 3;
    case 'clean': return crossed(c) && s.cornerPaid === 0;
  }
  return false;
}

/** Bonus points for one car: each condition once, gala sponsors 2, at most MAX_BONUS (anti-farming). */
export function bonusFor(r: Race, c: Car, sponsor: string | null, press: string[]) {
  const got = [...(sponsor ? [sponsor] : []), ...press].filter((id) => earned(r, c, id));
  const pts = got.reduce((t, id) => t + (id === sponsor && r.event === 'gala' ? 2 : 1), 0);
  return { earned: got, bonus: Math.min(MAX_BONUS, pts) };
}

/** Record a finished race and open the draft (AX-CH-2, AX-CH-3). */
export function scoreRace(s: Season, r: Race) {
  if (r.phase !== 'over' || s.draft || s.over) throw new Error('No race to score.');
  const next = s.next!;
  const rows = s.drivers.map(() => ({ place: 0, points: 0, bonus: 0, earned: [] as string[] }));
  next.grid.forEach((d, carId) => {
    const c = r.cars[carId];
    const b = bonusFor(r, c, s.drivers[d].sponsor, next.press);
    rows[d] = { place: c.done!.place, points: POINTS[c.done!.place - 1] ?? 0, bonus: b.bonus, earned: b.earned };
  });
  rows.forEach((row, d) => {
    s.drivers[d].points += row.points + row.bonus;
    s.drivers[d].places.push(row.place);
  });
  s.results.push({ circuit: s.races[s.index], event: next.event, press: next.press, rows });
  s.next = null;
  if (s.index === s.races.length - 1) {
    s.over = true;
    return;
  }
  const size = s.drivers.length + 1 + (next.event === 'parts' ? 2 : 0);
  s.draft = { offer: s.stack.splice(0, size), order: standings(s).reverse() };
  if (!s.draft.offer.length) closeDraft(s);
}

/** Why a draft pick is refused, or null. `give` is required when the car already holds MAX_UPGRADES. */
export function pickError(s: Season, driver: number, take: string | null, give: string | null): string | null {
  const d = s.draft;
  if (!d || d.order[0] !== driver) return 'It is not your pick.';
  if (take == null) return null; // passing is always allowed
  if (!d.offer.includes(take)) return 'That upgrade is not on offer.';
  const held = s.drivers[driver].upgrades;
  if (held.length >= MAX_UPGRADES && (give == null || !held.includes(give))) return 'Return one of your four upgrades first.';
  if (held.length < MAX_UPGRADES && give != null) return 'You still have room for that upgrade.';
  return null;
}

export function pick(s: Season, driver: number, take: string | null, give: string | null) {
  const d = s.draft!;
  const me = s.drivers[driver];
  if (take != null) {
    d.offer.splice(d.offer.indexOf(take), 1);
    if (give != null) {
      me.upgrades.splice(me.upgrades.indexOf(give), 1);
      s.stack.push(give);
    }
    me.upgrades.push(take);
  }
  d.order.shift();
  if (!d.order.length || !d.offer.length) closeDraft(s);
}

function closeDraft(s: Season) {
  // Unpicked upgrades go to the bottom of the stack.
  s.stack.push(...(s.draft?.offer ?? []));
  s.draft = null;
  s.index++;
  prepareNext(s);
}

/** A rough worth of an upgrade, for computer picks. */
export function upgradeWorth(id: string): number {
  const u = UPGRADE_BY_ID[id];
  if (!u) return 0;
  const card = u.card ? u.card.value + (u.card.cool ?? 0) + (u.card.grip ?? 0) + (u.card.draft ?? 0) / 2 + (u.card.flips ?? 0) * 2 - (u.card.cost ?? 0) * 1.5 : 0;
  const fit = Object.values(u.fit ?? {}).reduce<number>((t, v) => t + (typeof v === 'number' ? v : 1.5), 0);
  return card + fit * 1.5;
}

/** The computer's draft pick: the best offer, swapping out its weakest upgrade only for a better one. */
export function aiPick(s: Season, driver: number): { take: string | null; give: string | null } {
  const offer = [...s.draft!.offer].sort((a, b) => upgradeWorth(b) - upgradeWorth(a) || (a < b ? -1 : 1));
  const take = offer[0] ?? null;
  const held = s.drivers[driver].upgrades;
  if (take == null || held.length < MAX_UPGRADES) return { take, give: null };
  const worst = [...held].sort((a, b) => upgradeWorth(a) - upgradeWorth(b))[0];
  return upgradeWorth(take) > upgradeWorth(worst) ? { take, give: worst } : { take: null, give: null };
}
