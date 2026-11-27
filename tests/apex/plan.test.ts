import { describe, expect, it } from 'vitest';
import { aiView } from '../../src/games/apex/rules/ai';
import { newRace, reveal, setPlan, type Plan } from '../../src/games/apex/rules/race';
import { estimate } from '../../src/games/apex/ui/plan';

const OFF = { storm: false, mountains: false, dust: false, rivals: false };
const HAND = ['P4', 'P3', 'P4', 'P2', 'P3', 'P1', 'C'];

/** The dashboard's preview must agree with the engine for every plan it can fully see (no Stress, no boost). */
describe('dashboard estimate', () => {
  it('matches the resolved speed, distance, catch-up and corner costs', () => {
    let checked = 0;
    for (let pos = 0; pos < 60; pos += 3) {
      for (let gear = 1; gear <= 4; gear++) {
        const r = newRace({
          circuit: 'ashford', laps: 2, seed: `p${pos}`, modules: OFF, event: null,
          cars: [0, 1].map((i) => ({ seat: i, name: `D${i}`, number: i + 1, livery: i, upgrades: [] })),
        });
        r.round = 2; // no launch bonus
        Object.assign(r.cars[0], { pos, lane: 0, gear: Math.max(1, gear - 1), hand: [...HAND] });
        Object.assign(r.cars[1], { pos: pos + 30, lane: 0 }); // far away: no draft, no blocking
        const plan: Plan = { gear, cards: Array.from({ length: gear }, (_, i) => i), discard: [], boost: false };
        const est = estimate(aiView(r, 0), plan);
        expect(est.error).toBeNull();
        setPlan(r, 0, plan);
        setPlan(r, 1, { gear: 1, cards: [0], discard: [], boost: false });
        reveal(r);
        const res = r.last.find((x) => x.car === 0)!;
        expect(est.speed).toBe(res.speed);
        expect(est.catchup).toBe(res.catchup);
        if (res.spun || res.drafted) continue;
        expect(est.dist).toBe(res.to - res.from);
        expect(est.checks.reduce((s, c) => s + c.cost, 0)).toBe(res.corners.reduce((s, c) => s + c.paid, 0));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});
