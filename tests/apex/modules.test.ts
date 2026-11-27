import { describe, expect, it } from 'vitest';
import { aiDraft, aiPlan, aiView } from '../../src/games/apex/rules/ai';
import { STRAIN, STRESS } from '../../src/games/apex/rules/cards';
import { CIRCUIT_IDS, resolveCircuit } from '../../src/games/apex/rules/content/circuits';
import {
  cornerLimit, newRace, planError, react, reveal, setPlan, type Car, type Modules, type Plan, type Race,
} from '../../src/games/apex/rules/race';

const OFF: Modules = { storm: false, mountains: false, dust: false, rivals: false };
const STALL = { hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] };
const P = (gear: number, cards: number[], x: Partial<Plan> = {}): Plan => ({ gear, cards, discard: [], boost: false, ...x });

function mk(circuit: string, modules: Partial<Modules>, cars = 1, seed = 'm', rival?: string): Race {
  return newRace({
    circuit, laps: 2, seed, modules: { ...OFF, ...modules }, event: null,
    cars: Array.from({ length: cars }, (_, i) => ({ seat: i, name: `D${i}`, number: i, livery: i, upgrades: [], rival })),
  });
}
const rig = (r: Race, id: number, o: Partial<Car>) => Object.assign(r.cars[id], o);
function round(r: Race, plans: Record<number, Plan>) {
  for (const c of r.cars) {
    const p = plans[c.id] ?? P(1, [0]);
    const err = planError(r, c.id, p);
    if (err) throw new Error(err);
    setPlan(r, c.id, p);
  }
  reveal(r);
}
const last = (r: Race, id: number) => r.last.find((x) => x.car === id)!;
const firstOf = (flags: boolean[]) => flags.findIndex(Boolean);
const withFlag = (key: 'tunnel' | 'gravel') => CIRCUIT_IDS.find((id) => resolveCircuit(id)[key].some(Boolean))!;
const withPass = () => CIRCUIT_IDS.find((id) => resolveCircuit(id).pass.some((x) => x != null))!;

describe('AX-MOD-1 Storm Front', () => {
  it('off: clear weather and dry sectors on every seed', () => {
    for (let s = 0; s < 20; s++) {
      const r = mk('ashford', {}, 1, `w${s}`);
      expect([r.weather, ...r.sectors]).toEqual(['clear', 'none', 'none', 'none']);
    }
  });

  it('on: weather is drawn from the seed, every kind appears, floods only under Storm', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) {
      const r = mk('ashford', { storm: true }, 1, `w${s}`);
      seen.add(r.weather);
      if (r.sectors.includes('flood')) expect(r.weather).toBe('storm');
      expect(mk('ashford', { storm: true }, 1, `w${s}`).weather).toBe(r.weather);
    }
    expect([...seen].sort()).toEqual(['clear', 'drizzle', 'heatwave', 'overcast', 'rain', 'storm']);
  });

  it('weather never changes during a race', () => {
    const r = mk('ashford', { storm: true }, 2, 'steady');
    const w = [r.weather, ...r.sectors].join();
    for (let k = 0; k < 10 && r.phase !== 'over'; k++) {
      for (const c of r.cars) if (!c.done) setPlan(r, c.id, aiPlan(aiView(r, c.id)));
      reveal(r);
      while (r.phase === 'react') react(r, false);
    }
    expect([r.weather, ...r.sectors].join()).toBe(w);
  });

  it('rain lowers every limit by 1 (min 1); rain grip ignores it; a wet patch lowers its sector', () => {
    const r = mk('ashford', { storm: true });
    r.weather = 'clear';
    r.sectors = ['none', 'none', 'none'];
    const dry = resolveCircuit('ashford').corners.map((_, k) => cornerLimit(r, r.cars[0], k));
    r.weather = 'rain';
    expect(resolveCircuit('ashford').corners.map((_, k) => cornerLimit(r, r.cars[0], k))).toEqual(dry.map((x) => Math.max(1, x - 1)));
    expect(cornerLimit(r, { fit: { rainGrip: true } }, 0)).toBe(dry[0]);
    r.weather = 'clear';
    const k = 0, sec = resolveCircuit('ashford').sector[resolveCircuit('ashford').corners[k].at];
    r.sectors[sec] = 'wet';
    expect(cornerLimit(r, r.cars[0], k)).toBe(dry[k] - 1);
  });

  it('drizzle and rain stop drafting', () => {
    const r = mk('ashford', { storm: true }, 2);
    r.weather = 'drizzle';
    r.sectors = ['none', 'none', 'none'];
    rig(r, 1, { pos: 8, lane: 0, ...STALL });
    rig(r, 0, { pos: 3, lane: 0, hand: ['P4', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'] });
    round(r, {});
    expect([r.cars[0].pos, last(r, 0).drafted]).toEqual([8, 0]);
  });

  it('a flooded sector puts 1 Strain in the discard when a move ends there at speed 8+', () => {
    const r = mk('ashford', { storm: true });
    r.weather = 'storm';
    r.sectors = ['flood', 'flood', 'flood'];
    rig(r, 0, { pos: 0, gear: 2, hand: ['P4', 'P4', 'P1', 'P1', 'P1', 'P1', 'P1'], discard: [], deck: ['P1', 'P1', 'P1', 'P1'] });
    round(r, { 0: P(2, [0, 1]) });
    expect(r.cars[0].discard.filter((x) => x === STRAIN)).toHaveLength(1);
  });
});

describe('AX-MOD-2 Through the Mountains', () => {
  const id = withFlag('tunnel');
  const t = firstOf(resolveCircuit(id).tunnel);

  it('tunnels are one lane wide when on, two when off', () => {
    for (const [on, want] of [[true, [t - 1, 0]], [false, [t, 1]]] as const) {
      const r = mk(id, { mountains: on }, 2);
      rig(r, 1, { pos: t, lane: 0, ...STALL });
      rig(r, 0, { pos: t - 4, lane: 0, hand: ['P3', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], engine: 9 });
      r.weather = 'drizzle'; // no drafting
      round(r, {});
      // 3 + catch-up reaches the tunnel space; a second car only fits there with two lanes.
      expect([r.cars[0].pos, r.cars[0].lane]).toEqual(want);
    }
  });

  it('no boost when the move starts in a tunnel', () => {
    const r = mk(id, { mountains: true });
    rig(r, 0, { pos: t, hand: ['P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'] });
    expect(planError(r, 0, P(1, [0], { boost: true }))).toMatch(/tunnel/);
    expect(planError(mk(id, {}), 0, P(1, [0], { boost: true }))).toBeNull();
  });

  it('no drafting into a tunnel', () => {
    const r = mk(id, { mountains: true }, 2);
    rig(r, 1, { pos: t - 1, lane: 0, ...STALL });
    rig(r, 0, { pos: t - 6, lane: 0, hand: ['P4', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], engine: 9 });
    round(r, {});
    expect(last(r, 0).drafted).toBe(0);
  });

  it('a mountain pass caps speed: overspeed pays from the engine, once per pass', () => {
    const pid = withPass();
    const c = resolveCircuit(pid);
    const p = c.pass.findIndex((x) => x != null);
    const cap = c.pass[p]!;
    const r = mk(pid, { mountains: true });
    rig(r, 0, { pos: p - 1, gear: 4, engine: 30, hand: ['P5', 'P5', 'P5', 'P5', 'P1', 'P1', 'P1'] });
    const before = r.cars[0].engine;
    round(r, { 0: P(4, [0, 1, 2, 3]) });
    const corners = last(r, 0).corners.reduce((s, x) => s + x.paid, 0);
    expect(before - r.cars[0].engine - corners).toBe(20 - cap);
    expect(mk(pid, {}).cars[0].engine).toBe(6);
  });
});

describe('AX-MOD-3 Dust & Gravel', () => {
  it('each deck gets one more Stress', () => {
    const count = (r: Race) => [...r.cars[0].hand, ...r.cars[0].deck].filter((x) => x === STRESS).length;
    expect([count(mk('ashford', {})), count(mk('ashford', { dust: true }))]).toEqual([2, 3]);
  });

  it('ending on gravel at speed 7+ puts 1 Strain in the discard; at 6 it does not', () => {
    const id = withFlag('gravel');
    const g = firstOf(resolveCircuit(id).gravel);
    for (const [hand, want] of [[['P4', 'P3'], 1], [['P3', 'P3'], 0]] as const) {
      const r = mk(id, { dust: true });
      r.cars[0].fit = {};
      rig(r, 0, { pos: g - Number(hand[0][1]) - Number(hand[1][1]), gear: 2, engine: 20, discard: [], hand: [...hand, 'P1', 'P1', 'P1', 'P1', 'P1'] });
      round(r, { 0: P(2, [0, 1]) });
      expect(r.cars[0].pos).toBe(g);
      expect(r.cars[0].discard.filter((x) => x === STRAIN).length - last(r, 0).corners.reduce((s, x) => s + x.paid, 0)).toBe(want);
    }
  });

  it('an overspent corner on gravel costs 1 more', () => {
    const id = CIRCUIT_IDS.find((x) => resolveCircuit(x).corners.some((k) => resolveCircuit(x).gravel[k.at]));
    expect(id).toBeDefined();
    const c = resolveCircuit(id!);
    const k = c.corners.find((q) => c.gravel[q.at])!;
    const paid = (dust: boolean) => {
      const r = mk(id!, { dust });
      rig(r, 0, { pos: k.at - 2, gear: 2, engine: 20, hand: ['P5', 'P5', 'P1', 'P1', 'P1', 'P1', 'P1'] });
      round(r, { 0: P(2, [0, 1]) });
      return last(r, 0).corners[0].paid;
    };
    expect(paid(true)).toBe(paid(false) + 1);
  });
});

describe('AX-MOD-4 Racing Rivals', () => {
  it('rival abilities apply only with the module on', () => {
    expect(mk('ashford', { rivals: true }, 1, 'r', 'delacroix').cars[0].engine).toBe(8);
    expect(mk('ashford', {}, 1, 'r', 'delacroix').cars[0].engine).toBe(6);
  });
});

describe('AX-MOD all 16 combinations', () => {
  const combos = Array.from({ length: 16 }, (_, b) => ({
    storm: !!(b & 1), mountains: !!(b & 2), dust: !!(b & 4), rivals: !!(b & 8),
  }));
  for (const m of combos) {
    const label = Object.entries(m).filter(([, v]) => v).map(([k]) => k).join('+') || 'none';
    it(`AX-MOD-0 every circuit finishes with ${label}`, () => {
      for (const id of CIRCUIT_IDS) {
        const r = newRace({
          circuit: id, laps: resolveCircuit(id).laps, seed: `${label}-${id}`, modules: m, event: null,
          cars: Array.from({ length: 4 }, (_, i) => ({
            seat: null, name: `C${i}`, number: i, livery: i, upgrades: [], rival: ['ortega', 'bellini', 'vanaalst', 'mokoena'][i],
            ai: { risk: (['cautious', 'balanced', 'bold'] as const)[i % 3], level: 'club' as const },
          })),
        });
        while (r.phase !== 'over' && r.round < 120) {
          for (const c of r.cars) {
            if (c.done) continue;
            const p = aiPlan(aiView(r, c.id));
            expect(planError(r, c.id, p)).toBeNull();
            setPlan(r, c.id, p);
          }
          reveal(r);
          while (r.phase === 'react') react(r, aiDraft(aiView(r, r.pending!.car), r.pending!.hazard));
        }
        expect(r.phase, id).toBe('over');
        // Card conservation: every card a car owns is somewhere (Strain aside).
        for (const c of r.cars) expect([...c.hand, ...c.deck, ...c.discard, ...c.play].filter((x) => x !== STRAIN).length).toBeGreaterThanOrEqual(15);
      }
    });
  }
});
