import { describe, expect, it } from 'vitest';
import { aiView } from '../../src/games/apex/rules/ai';
import { newRace, reveal, setPlan, turnAct, turnOptions, type Plan, type Race } from '../../src/games/apex/rules/race';
import { estimate } from '../../src/games/apex/ui/plan';

const OFF = { storm: false, mountains: false, dust: false, rivals: false };
const HAND = ['P4', 'P3', 'P4', 'P2', 'P3', 'P1', 'C'];

/** Play the round with no optional extras: cool all, no boost, no catch-up, no slipstream, nothing thrown away. */
function plain(r: Race) {
  while (r.phase === 'turn') {
    const t = r.turn!;
    const o = turnOptions(r);
    if (t.stage === 'react') turnAct(r, o.cool ? { do: 'cool', n: o.cool } : { do: 'go' });
    else if (t.stage === 'draft') turnAct(r, { do: 'draft', take: false });
    else turnAct(r, { do: 'finish', discard: [] });
  }
}

function race(pos: number, gear: number, hand: string[], seed = `p${pos}`) {
  const r = newRace({
    circuit: 'ashford', laps: 2, seed, modules: OFF, event: null,
    cars: [0, 1].map((i) => ({ seat: i, name: `D${i}`, number: i + 1, livery: i, upgrades: [] })),
  });
  r.round = 2; // no launch bonus
  Object.assign(r.cars[0], { pos, lane: 0, gear: Math.max(1, gear - 1), hand: [...hand] });
  Object.assign(r.cars[1], { pos: pos + 30, lane: 0 }); // far away: no draft, no blocking
  return r;
}

/** The dashboard's preview must agree with the engine (AX-PLAN-7). */
describe('AX-PLAN-7 dashboard estimate', () => {
  it('a plan it can fully see has one speed, one destination and the exact corner bill', () => {
    let checked = 0;
    for (let pos = 0; pos < 60; pos += 3) {
      for (let gear = 1; gear <= 4; gear++) {
        const r = race(pos, gear, HAND);
        const plan: Plan = { gear, cards: Array.from({ length: gear }, (_, i) => i) };
        const est = estimate(aiView(r, 0), plan);
        expect(est.error).toBeNull();
        expect([est.speed[0], est.dist[0], est.to[0]]).toEqual([est.speed[1], est.dist[1], est.to[1]]);
        setPlan(r, 0, plan);
        setPlan(r, 1, { gear: 1, cards: [0] });
        reveal(r);
        plain(r);
        const res = r.last.find((x) => x.car === 0)!;
        expect(est.speed[0]).toBe(res.speed);
        if (res.spun) continue;
        expect(est.to[0]).toBe(res.to);
        expect(est.cost[0]).toBe(res.corners.reduce((s, c) => s + c.paid, 0));
        expect(est.risk).toBe(est.cost[0] ? 'certain' : 'safe');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it('Stress gives a speed range that holds the real outcome, from the pool and never the deck order', () => {
    for (let s = 0; s < 30; s++) {
      const r = race(20, 2, ['S', 'P3', 'P1', 'P1', 'P1', 'P1', 'P1'], `stress${s}`);
      const plan: Plan = { gear: 2, cards: [0, 1] };
      const est = estimate(aiView(r, 0), plan);
      expect(est.unknown).toBe(1);
      expect(est.speed[1]).toBeGreaterThan(est.speed[0]);
      // Same contents in any order give the same preview.
      const shuffled = race(20, 2, ['S', 'P3', 'P1', 'P1', 'P1', 'P1', 'P1'], `stress${s}`);
      shuffled.cars[0].deck.reverse();
      expect(estimate(aiView(shuffled, 0), plan)).toEqual(est);
      setPlan(r, 0, plan);
      setPlan(r, 1, { gear: 1, cards: [0] });
      reveal(r);
      plain(r);
      const res = r.last.find((x) => x.car === 0)!;
      expect(res.speed).toBeGreaterThanOrEqual(est.speed[0]);
      expect(res.speed).toBeLessThanOrEqual(est.speed[1]);
    }
  });

  it('a car still to move blocks the landing; overspeed is safe, possible or certain', () => {
    const r = race(70, 1, HAND); // lap 2, space 10
    Object.assign(r.cars[1], { pos: 14, lane: 0 }); // a lap down at space 14, so behind us in the race
    r.cars.push({ ...structuredClone(r.cars[1]), id: 2, seat: 2, pos: 14, lane: 1 });
    expect(estimate(aiView(r, 0), { gear: 1, cards: [0] }).to).toEqual([73, 73]); // P4 to space 14 is full
    const fast = race(30, 2, ['S', 'P4', 'P1', 'P1', 'P1', 'P1', 'P1']);
    expect(estimate(aiView(fast, 0), { gear: 2, cards: [0, 1] }).risk).toBe('certain'); // 5+ at Tower (3)
    const slow = race(32, 1, ['S', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1']);
    expect(estimate(aiView(slow, 0), { gear: 1, cards: [0] }).risk).toBe('possible'); // 1–5 at Tower (3)
  });
});
