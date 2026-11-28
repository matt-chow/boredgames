import { describe, expect, it } from 'vitest';
import { finishTurns } from './drive';
import { aiPlan, aiView } from '../../src/games/apex/rules/ai';
import { CIRCUIT_IDS, resolveCircuit } from '../../src/games/apex/rules/content/circuits';
import { newRace, planError, reveal, setPlan, type Modules, type Race, type Risk, type Level } from '../../src/games/apex/rules/race';

const OFF: Modules = { storm: false, mountains: false, dust: false, rivals: false };
const ON: Modules = { storm: true, mountains: true, dust: true, rivals: true };
const RISKS: Risk[] = ['cautious', 'balanced', 'bold'];
const LEVELS: Level[] = ['novice', 'club', 'works'];

export function aiRace(circuit: string, modules: Modules, cars: number, seed: string): Race {
  const r = newRace({
    circuit, laps: resolveCircuit(circuit).laps, seed, modules, event: null,
    cars: Array.from({ length: cars }, (_, i) => ({
      seat: null, name: `C${i}`, number: i + 1, livery: i, upgrades: [], rival: ['ortega', 'weiss', 'whitlock', 'arashiro', 'delacroix', 'bellini', 'vanaalst', 'mokoena'][i],
      ai: { risk: RISKS[i % 3], level: LEVELS[(i + 1) % 3] },
    })),
  });
  while (r.phase !== 'over' && r.round < 200) {
    for (const c of r.cars) {
      if (c.done) continue;
      const p = aiPlan(aiView(r, c.id));
      const err = planError(r, c.id, p);
      if (err) throw new Error(`${circuit} r${r.round} car ${c.id}: ${err}`);
      setPlan(r, c.id, p);
    }
    reveal(r);
    finishTurns(r);
  }
  return r;
}

describe('AX-AI computer drivers', () => {
  for (const id of CIRCUIT_IDS)
    for (const [label, mods] of [['off', OFF], ['on', ON]] as const)
      it(`AX-AI-1 an all-computer grid finishes ${id} with modules ${label}`, () => {
        const r = aiRace(id, mods, 6, `ai-${id}-${label}`);
        expect(r.phase).toBe('over');
        expect(r.finished).toHaveLength(6);
        expect(r.round).toBeLessThan(80);
      });

  it('AX-AI-1 the view carries no other car’s cards and no deck order', () => {
    const r = aiRace('ashford', OFF, 2, 'view');
    const v = aiView(newRace({ circuit: 'ashford', laps: 1, seed: 'v', modules: OFF, event: null, cars: r.cars.map(() => ({ seat: null, name: 'x', number: 1, livery: 0, upgrades: [] })) }), 0);
    expect(Object.keys(v.cars[1]).sort()).toEqual(['done', 'id', 'pos']);
    expect(v.me.pool).toEqual([...v.me.pool].sort());
    expect(JSON.stringify(v)).not.toContain('deck');
  });

  it('AX-AI-2 a works driver beats a novice over a season of seeds', () => {
    let works = 0;
    for (let s = 0; s < 12; s++) {
      const r = newRace({
        circuit: 'bellavista', laps: 2, seed: `duel${s}`, modules: OFF, event: null,
        cars: [0, 1].map((i) => ({ seat: null, name: `C${i}`, number: i, livery: i, upgrades: [], ai: { risk: 'balanced' as Risk, level: (i === (s & 1) ? 'works' : 'novice') as Level } })),
      });
      while (r.phase !== 'over') {
        for (const c of r.cars) if (!c.done) setPlan(r, c.id, aiPlan(aiView(r, c.id)));
        reveal(r);
        finishTurns(r);
      }
      if (r.finished[0] === (s & 1)) works++;
    }
    expect(works).toBeGreaterThanOrEqual(8);
  });
});
