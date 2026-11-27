import { describe, expect, it } from 'vitest';
import { seedRng } from '../../src/engine/rng';
import { aiDraft, aiPlan, aiView } from '../../src/games/apex/rules/ai';
import { CIRCUIT_IDS } from '../../src/games/apex/rules/content/circuits';
import { newRace, react, reveal, setPlan, type Race } from '../../src/games/apex/rules/race';
import {
  aiPick, bonusFor, drawPaddock, MAX_UPGRADES, newSeason, pick, pickError, POINTS, raceSetup, scoreRace, standings,
  type Paddock, type Season,
} from '../../src/games/apex/rules/season';

const PADDOCK: Paddock = {
  modules: { storm: true, mountains: true, dust: true, rivals: true },
  pools: { basic: true, advanced: true, environmental: true },
  sponsors: true, press: true, events: true, laps: 1,
};
const drivers = (n: number, people = 1) =>
  Array.from({ length: n }, (_, i) => ({
    seat: i < people ? i : null, name: `D${i}`, number: i + 1, livery: i,
    ...(i >= people ? { ai: { risk: 'balanced' as const, level: 'club' as const } } : {}),
  }));

function runRace(s: Season): Race {
  const r = newRace(raceSetup(s));
  while (r.phase !== 'over') {
    for (const c of r.cars) if (!c.done) setPlan(r, c.id, aiPlan(aiView(r, c.id, { risk: 'balanced', level: 'club' })));
    reveal(r);
    while (r.phase === 'react') react(r, aiDraft(aiView(r, r.pending!.car), r.pending!.hazard));
  }
  return r;
}

function runSeason(seed: string, races: string[], n = 5): Season {
  const s = newSeason(seed, races, PADDOCK, drivers(n));
  while (!s.over) {
    scoreRace(s, runRace(s));
    while (s.draft) {
      const d = s.draft.order[0];
      const p = aiPick(s, d);
      expect(pickError(s, d, p.take, p.give)).toBeNull();
      pick(s, d, p.take, p.give);
    }
  }
  return s;
}

describe('AX-CH championship', () => {
  it('AX-CH-1 a season runs every race on its list and ends', () => {
    const s = runSeason('full', ['ashford', 'redwood', 'noordzee']);
    expect(s.results.map((x) => x.circuit)).toEqual(['ashford', 'redwood', 'noordzee']);
    expect(s.drivers.every((d) => d.places.length === 3)).toBe(true);
  });

  it('AX-CH-2 points 9-6-4-3-2-1-0-0 plus bonuses; the standings break ties on wins, then seconds', () => {
    const s = runSeason('pts', ['ashford', 'bellavista']);
    for (const res of s.results) for (const row of res.rows) expect(row.points).toBe(POINTS[row.place - 1]);
    s.drivers.forEach((d, i) => expect(d.points).toBe(s.results.reduce((t, r) => t + r.rows[i].points + r.rows[i].bonus, 0)));
    const t = newSeason('tie', ['ashford', 'ashford'], PADDOCK, drivers(3));
    t.drivers[0].points = t.drivers[1].points = t.drivers[2].points = 10;
    t.drivers[0].places = [2, 2];
    t.drivers[1].places = [1, 3];
    t.drivers[2].places = [3, 1];
    // 1 and 2 have a win each; then seconds: none each; then thirds: one each; then last race: 2 won it.
    expect(standings(t)).toEqual([2, 1, 0]);
  });

  it('AX-CH-3 the draft reveals cars+1 upgrades and picks in reverse standings', () => {
    const s = newSeason('draft', ['ashford', 'redwood'], PADDOCK, drivers(4));
    scoreRace(s, runRace(s));
    expect(s.draft!.offer.length).toBe(s.results[0].event === 'parts' ? 7 : 5);
    expect(s.draft!.order).toEqual(standings(s).reverse());
    expect(pickError(s, s.draft!.order[1], s.draft!.offer[0], null)).toMatch(/not your pick/);
  });

  it('AX-CH-4 at most 4 upgrades; a fifth needs one returned', () => {
    const s = newSeason('cap', ['ashford', 'redwood'], PADDOCK, drivers(2));
    scoreRace(s, runRace(s));
    const d = s.draft!.order[0];
    s.drivers[d].upgrades = ['b01', 'b02', 'b04', 'b05'];
    const take = s.draft!.offer[0];
    expect(pickError(s, d, take, null)).toMatch(/Return/);
    expect(pickError(s, d, take, 'b01')).toBeNull();
    pick(s, d, take, 'b01');
    expect(s.drivers[d].upgrades).toHaveLength(MAX_UPGRADES);
    expect(s.drivers[d].upgrades).toContain(take);
    expect(s.stack).toContain('b01');
  });

  it('AX-CH-4 upgrades reach the next race’s cars', () => {
    const s = newSeason('carry', ['ashford', 'redwood'], PADDOCK, drivers(2));
    scoreRace(s, runRace(s));
    while (s.draft) pick(s, s.draft.order[0], s.draft.offer[0], null);
    const setup = raceSetup(s);
    setup.cars.forEach((c, slot) => expect(c.upgrades).toEqual(s.drivers[s.next!.grid[slot]].upgrades));
  });

  it('AX-CH-5 events and press are drawn only when on, and incompatible events are filtered', () => {
    const off = { ...PADDOCK, events: false, press: false };
    for (let i = 0; i < 50; i++) {
      const rng = seedRng(`p${i}`);
      expect(drawPaddock(rng, off, true, false)).toEqual({ event: null, press: [] });
      const quick = drawPaddock(rng, PADDOCK, false, true);
      expect(['shuffle', 'gala', 'parts']).not.toContain(quick.event);
      expect(drawPaddock(rng, PADDOCK, true, true).event).not.toBe('parts');
      const none = drawPaddock(rng, { ...PADDOCK, modules: { storm: false, mountains: false, dust: false, rivals: false } }, true, false);
      expect(none.event).not.toBe('duststorm');
      expect(quick.press.length).toBe(quick.event === 'pressday' ? 3 : 2);
    }
  });

  it('AX-CH-6 each driver holds one sponsor; bonuses pay at most 2 per race', () => {
    const s = newSeason('sp', ['ashford'], PADDOCK, drivers(8, 2));
    const held = s.drivers.map((d) => d.sponsor).filter(Boolean);
    expect(new Set(held).size).toBe(6);
    expect(s.drivers[0].sponsor && s.drivers[1].sponsor).toBeTruthy();
    const r = runRace(s);
    const c = r.cars[0];
    Object.assign(c.stats, { overtakes: 9, ledR1: true, boosts: 5, drafts: 5, gear4: 9 });
    const b = bonusFor(r, c, 'marlowe', ['holeshot', 'nerve', 'slip']);
    expect(b.earned.length).toBeGreaterThanOrEqual(4);
    expect(b.bonus).toBe(2);
    expect(bonusFor(r, c, null, []).bonus).toBe(0);
  });

  it('AX-GRID-2 race one is drawn; later grids are reverse standings', () => {
    const s = newSeason('grid', ['ashford', 'redwood'], { ...PADDOCK, events: false }, drivers(5));
    scoreRace(s, runRace(s));
    while (s.draft) pick(s, s.draft.order[0], null, null);
    expect(s.next!.grid).toEqual(standings(s).reverse());
  });

  it('a season is reproducible from its seed', () => {
    const races = CIRCUIT_IDS.slice(0, 3);
    expect(JSON.stringify(runSeason('same', races, 4))).toBe(JSON.stringify(runSeason('same', races, 4)));
  });
});
