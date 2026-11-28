import { describe, expect, it } from 'vitest';
import { apex } from '../../src/games/apex';
import { aiPlan } from '../../src/games/apex/rules/ai';
import { HEAT } from '../../src/games/apex/rules/cards';
import { defaultConfig, migrate, STATE_VERSION, type AAction, type AConfig, type AState } from '../../src/games/apex/rules/engine';
import { newRace, type Race } from '../../src/games/apex/rules/race';
import * as v1 from '../../src/games/apex/rules/race-v1';

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
    expect(apex.historyAction!({ type: 'plan', step: 1, gear: 2, cards: [0, 1] })).toEqual({ type: 'plan' });
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
    expect(s.race!.round > 1 || s.race!.phase === 'turn').toBe(true);
    expect(apex.apply(s, 0, { type: 'retract', step })).toMatchObject({ ok: false });
    expect(before.race!.round).toBe(1); // apply never mutates
  });

  it('AX-NET-1 an action for another step or the wrong phase is refused', () => {
    const s = start(1, { mode: 'solo', cars: 3 });
    expect(apex.apply(s, 0, { type: 'retract', step: s.step + 1 })).toMatchObject({ ok: false, code: 'stale' });
    // A Continue that arrives after the podium has closed is stale, never "nothing to get ready for".
    expect(apex.apply(s, 0, { type: 'ready', step: s.step })).toMatchObject({ ok: false, code: 'stale' });
    expect(apex.apply(s, 0, { type: 'plan', step: s.step, gear: 4, cards: [0, 0, 0, 0] })).toMatchObject({ ok: false, code: 'illegal' });
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
    expect(s.race!.round > 1 || s.race!.phase === 'turn').toBe(true);
    expect([...s.timedOut].sort()).toEqual([0, 1]);
  });

  it('AX-NET-3 the host hands an absent car to the computer, and its driver takes it back', () => {
    let s = apex.tick!(start(2, { cars: 3 }), 0, [true, false])!;
    expect(apex.apply(s, 1, { type: 'autopilot', step: s.step, seat: 0, on: true })).toMatchObject({ ok: false });
    expect(apex.apply(s, 0, { type: 'autopilot', step: s.step, seat: 0, on: true })).toMatchObject({ ok: false, code: 'present' });
    s = act(s, 0, { type: 'autopilot', step: s.step, seat: 1, on: true });
    expect(apex.actors(s)).toEqual([0]);
    s = act(s, 0, planFor(s, 0));
    expect(s.race!.round > 1 || s.race!.phase === 'turn').toBe(true);
    s = apex.tick!(s, 0, [true, true]) ?? s;
    s = act(s, 1, { type: 'autopilot', step: s.step, seat: 1, on: false });
    expect(s.autopilot).toEqual([]);
  });

  it('AX-TURN-1 a doubled Lock In or a decision from an old step is refused and changes nothing', () => {
    let s = start(2, { cars: 3 });
    const plan = planFor(s, 0);
    s = act(s, 0, plan);
    const again = apex.apply(s, 0, plan);
    expect(again.ok && [again.state.race, again.state.step]).toEqual([s.race, s.step]); // the same plan again is a no-op
    s = act(s, 1, planFor(s, 1));
    // Every plan is in: drivers now take their turns one at a time, in race order.
    for (let i = 0; i < 200 && s.race!.phase === 'turn'; i++) {
      const seat = apex.actors(s)[0];
      const v = apex.project(s, seat);
      expect(v.race!.turn!.car).toBe(s.race!.turn!.car);
      expect(apex.actors(s)).toEqual([s.race!.cars[s.race!.turn!.car].seat]);
      const move = apex.bot!(v)!.actions[0];
      const pos = s.race!.cars.map((c) => c.pos);
      expect(apex.apply(s, seat, { ...move, step: s.step - 1 } as AAction)).toMatchObject({ ok: false, code: 'stale' });
      expect(apex.apply(s, 1 - seat, move)).toMatchObject({ ok: false });
      expect(s.race!.cars.map((c) => c.pos)).toEqual(pos);
      s = act(s, seat, move);
      expect(apex.apply(s, seat, move)).toMatchObject({ ok: false });
    }
    expect(s.race!.phase).toBe('plan');
    expect(s.race!.round).toBe(2);
  });

  it('AX-TURN-2 every seat sees the same turn: whose it is, its stage and its options', () => {
    let s = start(2, { cars: 3 });
    s = act(s, 0, planFor(s, 0));
    s = act(s, 1, planFor(s, 1));
    const turns = [0, 1, null].map((seat) => apex.project(s, seat).race!.turn);
    expect(turns[0]).not.toBeNull();
    expect(turns[1]).toEqual(turns[0]);
    expect(turns[2]).toEqual(turns[0]);
  });

  it('AX-COOL-2 cooling takes the most by itself unless the driver cools by hand', () => {
    const rigged = (manual: boolean) => {
      let s = start(1, { mode: 'solo', cars: 2 }, 'cool');
      if (manual) s = act(s, 0, { type: 'cooling', step: s.step, manual: true });
      const c = s.race!.cars.find((x) => x.seat === 0)!;
      c.hand = ['P1', HEAT, HEAT, 'P1', 'P1', 'P1', 'P1'];
      c.engine = 3;
      c.gear = 1;
      return act(s, 0, { type: 'plan', step: s.step, gear: 1, cards: [0] });
    };
    const auto = rigged(false);
    const car = (s: AState) => s.race!.cars.find((x) => x.seat === 0)!;
    expect(car(auto).hand).not.toContain(HEAT); // gear 1 cools up to 3: both went back to the engine
    const hand = rigged(true);
    // The table waits for this driver's choice, with both Heat on offer.
    expect(hand.race!.turn).toMatchObject({ car: car(hand).id, stage: 'react' });
    expect(apex.project(hand, 0).race!.turn!.options.cool).toBe(2);
  });

  it('AX-PRV-2 the turn and its events show no hand, deck or deck order but the driver’s own', () => {
    let s = start(2, { cars: 4 }, 'turn-seed');
    for (let i = 0; i < 400 && s.phase === 'race'; i++) {
      for (const seat of [0, 1, null]) {
        const v = apex.project(s, seat);
        const json = JSON.stringify(v.race);
        for (const c of s.race!.cars) {
          if (c.deck.length > 3) expect(json).not.toContain(JSON.stringify(c.deck));
          if (c.seat !== seat && c.hand.length > 3) expect(json).not.toContain(JSON.stringify(c.hand));
        }
        expect(json).not.toContain('"plans"');
        expect(json).not.toContain('"replay"');
      }
      const seat = apex.actors(s)[0];
      if (seat == null) break;
      s = act(s, seat, apex.bot!(apex.project(s, seat))!.actions[0]);
    }
  });

  it('AX-STATE-2 a saved v1.2 race, even mid-slipstream, loads into the turn engine and plays to the end', () => {
    const s = start(2, { cars: 4 }, 'old-save');
    const r = s.race!;
    const old = v1.newRace({
      circuit: r.circuit, laps: 1, seed: 'old', modules: r.modules, event: null,
      cars: r.cars.map((c) => ({ seat: c.seat, name: c.name, number: c.number, livery: c.livery, upgrades: [], ai: c.ai })),
    });
    for (let k = 0; k < 40 && old.phase === 'plan'; k++) {
      for (const c of old.cars) {
        if (c.done) continue;
        const ok = c.hand.map((x, i) => [x, i] as const).filter(([x]) => x !== HEAT).map(([, i]) => i);
        const g = Math.min(ok.length, c.gear + 1, 4);
        v1.setPlan(old, c.id, g ? { gear: g, cards: ok.slice(0, g), discard: [], boost: false } : { gear: 1, cards: [], discard: [], boost: false });
        if (g && v1.planError(old, c.id, old.plans[c.id]!)) v1.setPlan(old, c.id, { gear: c.gear, cards: ok.slice(0, c.gear), discard: [], boost: false });
      }
      v1.reveal(old);
    }
    const saved = structuredClone({ ...s, race: old as unknown as Race, manualCool: undefined }) as unknown as AState;
    expect(STATE_VERSION).toBe(2);
    const m = migrate(saved, 1);
    expect([m.race!.phase === 'plan' || m.race!.phase === 'over', m.race!.turn, m.manualCool, m.step]).toEqual([true, null, [], s.step + 1]);
    expect(m.race!.plans.every((p) => p === null)).toBe(true);
    const done = playOut(m);
    expect(apex.results(done)).not.toBeNull();
    expect(done.replays).toHaveLength(0); // a race begun under other rules has no faithful replay
  });

  it('AX-SIM-1 races with every module, 2–6 drivers and computer cars never stall', () => {
    for (let k = 0; k < 8; k++) {
      const n = 1 + (k % 4);
      const s = playOut(start(n, { mode: n === 1 ? 'solo' : 'quick', cars: n + 2 + (k % 3), laps: 1 + (k % 2) }, `sim${k}`));
      expect(apex.isOver(s)).toBe(true);
      expect(s.race!.cars.every((c) => c.done)).toBe(true);
    }
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
