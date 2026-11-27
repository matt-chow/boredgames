import { describe, expect, it } from 'vitest';
import { apex } from '../../src/games/apex';
import { aiPlan } from '../../src/games/apex/rules/ai';
import { defaultConfig, type AAction, type AConfig, type AState } from '../../src/games/apex/rules/engine';
import { newRace } from '../../src/games/apex/rules/race';

const DAY = 24 * 3600_000;
const cfg = (over: Partial<AConfig> = {}): AConfig => ({ ...defaultConfig(2), laps: 1, ...over });
const start = (n: number, over: Partial<AConfig> = {}, seed = 'eng') => apex.setup({ playerCount: n, seed, config: cfg(over) });

function act(s: AState, seat: number, a: AAction): AState {
  const r = apex.apply(s, seat, a);
  if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
  return r.state;
}

const planFor = (s: AState, seat: number) => ({ type: 'plan' as const, step: s.step, ...aiPlan(apex.project(s, seat).me!.ai) });

/** Play every seat as the room's bot would, until the event ends. */
function playOut(s: AState, limit = 5000): AState {
  for (let i = 0; i < limit && !apex.isOver(s); i++) {
    const seat = apex.actors(s)[0];
    if (seat == null) throw new Error(`stuck in ${s.phase}`);
    const move = apex.bot!(apex.project(s, seat))!;
    s = act(s, seat, move.actions[0]);
  }
  return s;
}

describe('Apex room engine', () => {
  it('AX-GRID-1 people take the first cars and computer cars fill the grid', () => {
    const s = start(2, { cars: 5 });
    expect(s.race!.cars).toHaveLength(5);
    expect(s.race!.cars.filter((c) => c.seat != null).map((c) => c.seat).sort()).toEqual([0, 1]);
    expect(s.race!.cars.filter((c) => c.seat == null).every((c) => c.ai)).toBe(true);
    expect(apex.validateConfig(cfg({ cars: 3 }), 4)).toMatch(/at least 4/);
    expect(start(6, { cars: 8 }).race!.cars).toHaveLength(8);
  });

  it('AX-PRV-1 a view shows only its own hand, never deck order, other hands, plans or the seed', () => {
    let s = start(3, { cars: 6 }, 'private-seed');
    const mine = s.race!.cars.find((c) => c.seat === 0)!;
    s = act(s, 0, planFor(s, 0));
    for (const seat of [1, 2, null]) {
      const v = apex.project(s, seat);
      const json = JSON.stringify(v);
      expect(json).not.toContain('private-seed');
      expect(json).not.toContain('"rng"');
      expect(json).not.toContain('"plans"');
      expect(json).not.toContain(JSON.stringify(mine.hand));
      expect(v.race!.cars.every((c) => typeof c.hand === 'number' && typeof c.deck === 'number')).toBe(true);
      if (seat != null) expect(v.me!.hand).toEqual(s.race!.cars.find((c) => c.seat === seat)!.hand);
    }
    expect(apex.project(s, 1).race!.cars[mine.id].planned).toBe(true);
    expect(apex.project(s, 0).me!.plan).not.toBeNull();
    expect(apex.project(s, null).me).toBeNull();
    expect(apex.historyAction!({ type: 'plan', step: 1, gear: 2, cards: [0, 1], discard: [], boost: false })).toEqual({ type: 'plan' });
  });

  it('AX-PLAN-4 / AX-UNDO-1 a plan can be taken back until the reveal, and computer cars plan after the people', () => {
    let s = start(2, { cars: 4 });
    const step = s.step;
    s = act(s, 0, planFor(s, 0));
    expect(s.race!.round).toBe(1);
    expect(s.race!.cars.filter((c) => c.seat == null).every((c) => !s.race!.plans[c.id])).toBe(true);
    s = act(s, 0, { type: 'retract', step });
    expect(apex.actors(s).sort()).toEqual([0, 1]);
    s = act(s, 0, planFor(s, 0));
    const before = s;
    s = act(s, 1, planFor(s, 1));
    expect(s.step).toBeGreaterThan(step);
    expect(s.race!.round > 1 || s.race!.phase === 'react').toBe(true);
    expect(apex.apply(s, 0, { type: 'retract', step })).toMatchObject({ ok: false });
    expect(before.race!.round).toBe(1); // apply never mutates
  });

  it('AX-NET-1 an action for another step or the wrong phase is refused', () => {
    const s = start(1, { mode: 'solo', cars: 3 });
    expect(apex.apply(s, 0, { type: 'retract', step: s.step + 1 })).toMatchObject({ ok: false, code: 'stale' });
    // A Continue that arrives after the podium has closed is stale, never "nothing to get ready for".
    expect(apex.apply(s, 0, { type: 'ready', step: s.step })).toMatchObject({ ok: false, code: 'stale' });
    expect(apex.apply(s, 0, { type: 'plan', step: s.step, gear: 4, cards: [0, 0, 0, 0], discard: [], boost: false })).toMatchObject({ ok: false, code: 'illegal' });
  });

  it('AX-FIN-1 a driver whose car has finished gets no dashboard and no plan to make while the others race on', () => {
    let seen = false;
    for (let k = 0; k < 20 && !seen; k++) {
      let s = start(2, { cars: 4 }, `fin${k}`);
      for (let i = 0; i < 2000 && s.phase === 'race'; i++) {
        for (const seat of [0, 1]) {
          if (!s.race!.cars.find((c) => c.seat === seat)!.done || s.race!.phase !== 'plan') continue;
          seen = true;
          expect(apex.project(s, seat).me).toBeNull();
          expect(apex.bot!(apex.project(s, seat))?.actions ?? []).toEqual([]);
          expect(apex.actors(s)).not.toContain(seat);
        }
        const seat = apex.actors(s)[0];
        if (seat == null) break;
        s = act(s, seat, apex.bot!(apex.project(s, seat))!.actions[0]);
      }
    }
    expect(seen).toBe(true);
  });

  it('AX-PLAN-6 the timer is off by default; when on, it pauses for an absent driver and then plans for the late', () => {
    expect(defaultConfig(2).timer).toBe(0);
    const off = start(2);
    expect(apex.wakeAt!(apex.tick!(off, 0, [true, true]) ?? off)).toBeNull();
    let s = apex.tick!(start(2, { timer: 30 }), 1000, [true, true])!;
    expect(s.deadline).toBe(31_000);
    expect(apex.tick!(s, 2000, [true, false])!.deadline).toBeNull();
    s = apex.tick!(s, 31_000, [true, true])!;
    expect(s.race!.round > 1 || s.race!.phase === 'react').toBe(true);
    expect([...s.timedOut].sort()).toEqual([0, 1]);
  });

  it('AX-NET-3 the host hands an absent car to the computer, and its driver takes it back', () => {
    let s = apex.tick!(start(2, { cars: 3 }), 0, [true, false])!;
    expect(apex.apply(s, 1, { type: 'autopilot', step: s.step, seat: 0, on: true })).toMatchObject({ ok: false });
    expect(apex.apply(s, 0, { type: 'autopilot', step: s.step, seat: 0, on: true })).toMatchObject({ ok: false, code: 'present' });
    s = act(s, 0, { type: 'autopilot', step: s.step, seat: 1, on: true });
    expect(apex.actors(s)).toEqual([0]);
    s = act(s, 0, planFor(s, 0));
    expect(s.race!.round > 1 || s.race!.phase === 'react').toBe(true);
    s = apex.tick!(s, 0, [true, true]) ?? s;
    s = act(s, 1, { type: 'autopilot', step: s.step, seat: 1, on: false });
    expect(s.autopilot).toEqual([]);
  });

  it('AX-MODE-1 Driving School is one fixed lap at Ashford with two gentle computer cars', () => {
    const a = start(1, { mode: 'school' }, 'x');
    const b = start(1, { mode: 'school' }, 'y');
    expect(a.race!.circuit).toBe('ashford');
    expect(a.race!.laps).toBe(1);
    expect(a.race!.cars).toHaveLength(3);
    expect(a.race!.cars.map((c) => c.hand)).toEqual(b.race!.cars.map((c) => c.hand));
    expect(a.race!.cars.filter((c) => c.seat == null).every((c) => c.ai!.level === 'novice')).toBe(true);
    expect(apex.validateConfig(cfg({ mode: 'school' }), 2)).toMatch(/one driver/);
  });

  it('a quick race plays to a result; a championship drafts between races and ends', () => {
    const q = playOut(start(2, { cars: 4 }));
    expect(apex.results(q)!.map((r) => r.seat).sort()).toEqual([0, 1]);
    expect(q.replays).toHaveLength(1);
    const c = playOut(start(2, { mode: 'championship', length: 3, cars: 5 }, 'champ'));
    expect(c.season.results).toHaveLength(3);
    expect(c.replays).toHaveLength(3);
    expect(c.season.drivers.some((d) => d.upgrades.length)).toBe(true);
    const res = apex.results(c)!;
    expect(res.filter((r) => r.winner).length).toBeLessThanOrEqual(1);
    expect(res.every((r) => r.score === c.season.drivers.find((d) => d.seat === r.seat)!.points)).toBe(true);
  });

  it('AX-REP-1 a race replay’s seed is a hash, never the room seed', () => {
    const s = playOut(start(2, { mode: 'championship', length: 3, cars: 4 }, 'room-seed'));
    for (const rep of s.replays) {
      expect(rep.setup.seed).not.toContain('room-seed');
      expect(newRace(rep.setup).seed).toBe(rep.setup.seed);
    }
    expect(new Set(s.replays.map((r) => r.setup.seed)).size).toBe(3);
  });

  it('AX-RET-1 retention: race 7 days, between races 30, shelved 90, finished race 1, finished season 7', () => {
    const s = start(1, { mode: 'championship', length: 3, cars: 3 });
    expect(apex.retainMs!(s, 'playing')).toBe(7 * DAY);
    expect(apex.retainMs!({ ...s, phase: 'podium' }, 'playing')).toBe(30 * DAY);
    expect(apex.retainMs!({ ...s, phase: 'podium', shelved: true }, 'playing')).toBe(90 * DAY);
    expect(apex.retainMs!(s, 'over')).toBe(7 * DAY);
    expect(apex.retainMs!(start(1, { mode: 'solo', cars: 3 }), 'over')).toBe(DAY);
  });

  it('config is cleaned at the boundary', () => {
    expect(apex.sanitizeConfig!({ cars: 9 })).toHaveProperty('error');
    expect(apex.sanitizeConfig!({ circuit: 'nowhere' })).toHaveProperty('error');
    expect(apex.sanitizeConfig!({ timer: 45 })).toHaveProperty('error');
    expect(apex.sanitizeConfig!({ mode: 'championship', length: 5, circuit: 'kalahari', laps: null })).toEqual({
      config: { mode: 'championship', length: 5, circuit: 'kalahari', laps: null },
    });
  });
});
