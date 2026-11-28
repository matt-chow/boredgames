import { describe, expect, it } from 'vitest';
import { HEAT } from '../../src/games/apex/rules/cards';
import {
  freeLane, newRace, planError, raceOrder, reveal, setPlan, shiftCost, turnAct, turnError, turnOptions,
  type Car, type Plan, type Race, type TurnAct,
} from '../../src/games/apex/rules/race';

const OFF = { storm: false, mountains: false, dust: false, rivals: false };

/** Ashford: 60 spaces, corners at 21 (5), 35 (3), 43 (4), 52 (6). */
function mk(cars = 2, laps = 1, seed = 't'): Race {
  return newRace({
    circuit: 'ashford',
    laps,
    seed,
    modules: OFF,
    event: null,
    cars: Array.from({ length: cars }, (_, i) => ({ seat: i, name: `D${i}`, number: i + 1, livery: i, upgrades: [] })),
  });
}

/** Give a car exact cards: hand, deck, position. */
function rig(r: Race, id: number, o: Partial<Car>) {
  Object.assign(r.cars[id], o);
}

const P = (gear: number, cards: number[]): Plan => ({ gear, cards });

/** The tests' default driver: cool all it can, take catch-up, take only a free slipstream, throw nothing away. */
function auto(r: Race): TurnAct {
  const t = r.turn!;
  const o = turnOptions(r);
  if (t.stage === 'react') return o.cool ? { do: 'cool', n: o.cool } : o.catchup ? { do: 'catchup' } : { do: 'go' };
  if (t.stage === 'draft') return { do: 'draft', take: t.offer!.hazard === 0 };
  return { do: 'finish', discard: [] };
}

/** Take turn decisions, a car's scripted ones first and then `auto`, until `stop` holds or the round ends. */
function play(r: Race, scripts: Record<number, TurnAct[]> = {}, stop?: (r: Race) => boolean) {
  while (r.phase === 'turn' && !stop?.(r)) {
    const id = r.turn!.car;
    const a = scripts[id]?.length ? scripts[id].shift()! : auto(r);
    const err = turnError(r, a);
    if (err) throw new Error(`car ${id} ${a.do}: ${err}`);
    turnAct(r, a);
  }
}

function plan(r: Race, plans: Record<number, Plan>) {
  for (const c of r.cars) {
    if (c.done) continue;
    const p = plans[c.id] ?? P(1, [0]);
    const err = planError(r, c.id, p);
    if (err) throw new Error(`car ${c.id}: ${err}`);
    setPlan(r, c.id, p);
  }
  reveal(r);
}

/** Plan every running car (others coast in gear 1 on their first card), reveal and play the round out. */
function round(r: Race, plans: Record<number, Plan>, scripts: Record<number, TurnAct[]> = {}) {
  plan(r, plans);
  play(r, scripts);
}

/** Plan and reveal, then stop at this car's turn in this stage. */
function upTo(r: Race, plans: Record<number, Plan>, car: number, stage: string) {
  plan(r, plans);
  play(r, {}, (x) => x.turn!.car === car && x.turn!.stage === stage);
  expect([r.turn?.car, r.turn?.stage]).toEqual([car, stage]);
}

const HAND = ['P1', 'P2', 'P3', 'P4', 'P1', 'P2', 'P3'];
const last = (r: Race, id: number) => r.last.find((x) => x.car === id)!;

describe('AX-CAR cars and decks', () => {
  it('AX-CAR-1 every car starts with the same 16 cards', () => {
    const r = mk(4);
    for (const c of r.cars) {
      const all = [...c.hand, ...c.deck].sort();
      expect(all).toEqual(['C', 'P1', 'P1', 'P1', 'P2', 'P2', 'P2', 'P3', 'P3', 'P3', 'P4', 'P4', 'P4', 'P5', 'S', 'S']);
    }
  });

  it('AX-CAR-2 the engine holds 6 Heat; paying moves Heat engine → discard, cooling hand → engine', () => {
    const r = mk(1);
    expect(r.cars[0].engine).toBe(6);
    rig(r, 0, { hand: [...HAND], deck: ['P1', 'P1', 'P1', 'P1'], gear: 1 });
    round(r, { 0: P(3, [0, 1, 2]) }); // two-gear shift: 1 Heat
    expect(r.cars[0].engine).toBe(5);
    expect(r.cars[0].discard.filter((x) => x === HEAT)).toHaveLength(1);
    rig(r, 0, { hand: ['X', 'X', 'P1', 'P2', 'P3', 'P4', 'P1'], gear: 2 });
    round(r, { 0: P(1, [2]) }); // gear 1 cools 3, only 2 in hand
    expect(r.cars[0].engine).toBe(7);
    expect(r.cars[0].hand).not.toContain(HEAT);
  });

  it('AX-CAR-3 hands of 7 dealt from the seed', () => {
    const a = mk(2, 1, 's1'), b = mk(2, 1, 's1'), c = mk(2, 1, 's2');
    expect(a.cars[0].hand).toHaveLength(7);
    expect(a.cars[0].hand).toEqual(b.cars[0].hand);
    expect(a.cars.map((x) => x.deck.join())).not.toEqual(c.cars.map((x) => x.deck.join()));
  });

  it('AX-CAR-4 Coast is worth 1 and cools 1', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['C', 'P1', 'P1', 'X', 'X', 'P1', 'P1'], deck: ['P1', 'P1', 'P1'], gear: 2, engine: 4 });
    round(r, { 0: P(2, [0, 1]) });
    expect(last(r, 0).speed).toBe(2);
    expect(last(r, 0).cooled).toBe(2); // gear 2 cools 1, Coast 1
  });
});

describe('AX-GEAR and AX-PLAN', () => {
  it('AX-GEAR-1 cars start in gear 1', () => {
    expect(mk(3).cars.every((c) => c.gear === 1)).toBe(true);
  });

  it('AX-GEAR-2 ±1 is free, ±2 costs 1 Heat, ±3 is refused, an empty engine allows only ±1', () => {
    const r = mk(1);
    const c = r.cars[0];
    rig(r, 0, { hand: [...HAND], gear: 1 });
    expect([shiftCost(c, 1), shiftCost(c, 2), shiftCost(c, 3), shiftCost(c, 4)]).toEqual([0, 0, 1, null]);
    expect(planError(r, 0, P(4, [0, 1, 2, 3]))).toMatch(/shift/);
    rig(r, 0, { engine: 0 });
    expect(planError(r, 0, P(3, [0, 1, 2]))).toMatch(/engine/);
    expect(planError(r, 0, P(2, [0, 1]))).toBeNull();
  });

  it('AX-PLAN-1 your gear is exactly the number of cards you commit', () => {
    const r = mk(1);
    rig(r, 0, { hand: [...HAND], gear: 2 });
    expect(planError(r, 0, P(2, [0]))).toMatch(/exactly 2/);
    expect(planError(r, 0, P(2, [0, 1, 2]))).toMatch(/exactly 2/);
    expect(planError(r, 0, P(2, [0, 1]))).toBeNull();
  });

  it('AX-PLAN-2 Heat cannot be committed', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['X', 'P1', 'P2', 'X', 'X', 'X', 'X'], gear: 2 });
    expect(planError(r, 0, P(2, [0, 1]))).toMatch(/Heat/);
    expect(planError(r, 0, P(2, [1, 2]))).toBeNull();
    expect(planError(r, 0, P(3, [1, 2, 3]))).toMatch(/Heat/);
  });

  it('AX-PLAN-3 a clogged hand limps: gear 1, distance 1, cools as gear 1', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['X', 'X', 'X', 'X', 'X', 'X', 'X'], gear: 3, pos: 5, deck: ['P1', 'P1', 'P1', 'P1'] });
    expect(planError(r, 0, P(3, []))).toBeNull();
    upTo(r, { 0: P(3, []) }, 0, 'react');
    expect(turnOptions(r).boost).toBe(false); // a limping car cannot boost
    play(r);
    const x = last(r, 0);
    expect([x.limp, x.speed, x.dist, x.cooled, r.cars[0].pos, r.cars[0].gear]).toEqual([true, 1, 1, 3, 6, 1]);
    // Limping is refused while any real plan exists.
    rig(r, 0, { hand: [...HAND] });
    expect(planError(r, 0, P(1, []))).toMatch(/cards to drive/);
  });

  it('AX-TURN-7 cards are thrown away at Finish Turn, after the move; Heat cannot be', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['P1', 'P4', 'P4', 'X', 'P2', 'P3', 'P1'], deck: ['P5', 'P5', 'P5', 'P5', 'P5'], discard: [] });
    upTo(r, { 0: P(3, [0, 4, 5]) }, 0, 'discard'); // gear 3 cools nothing, so the Heat stays in hand
    expect(turnError(r, { do: 'finish', discard: [2] })).toMatch(/Heat/);
    expect(turnError(r, { do: 'finish', discard: [0, 0] })).not.toBeNull();
    expect(turnError(r, { do: 'boost' })).not.toBeNull();
    expect(r.cars[0].hand).toEqual(['P4', 'P4', 'X', 'P1']);
    play(r, { 0: [{ do: 'finish', discard: [0, 1] }] });
    expect([...r.cars[0].discard].sort()).toEqual(['P1', 'P2', 'P3', 'P4', 'P4', 'X']); // the X paid for the two-gear shift
    expect(r.cars[0].hand).toEqual(['X', 'P1', 'P5', 'P5', 'P5', 'P5', 'P5']); // AX-END-1 the rest keep their order
  });

  it('AX-PLAN-5 a plan can be retracted before the reveal', () => {
    const r = mk(2);
    setPlan(r, 0, P(1, [0]));
    setPlan(r, 0, null);
    expect(r.plans[0]).toBeNull();
  });
});

describe('AX-RES resolution', () => {
  it('AX-RES-1 the leader resolves first; ties on the same space go to the racing line, then who arrived first', () => {
    const r = mk(3);
    rig(r, 0, { pos: 2, lane: 1, arrived: 1 });
    rig(r, 1, { pos: 2, lane: 0, arrived: 5 });
    rig(r, 2, { pos: 7, lane: 0, arrived: 9 });
    expect(raceOrder(r)).toEqual([2, 1, 0]);
    round(r, {});
    expect(r.last.map((x) => x.car)).toEqual([2, 1, 0]);
  });

  it('AX-STR-1 Stress turns cards until a valued one; every turned card is discarded', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['S', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], deck: ['X', 'S', 'P3', 'P2'], gear: 1 });
    round(r, { 0: P(1, [0]) });
    expect(last(r, 0).flipped).toEqual(['X', 'S', 'P3']);
    expect(last(r, 0).speed).toBe(3);
    expect(r.cars[0].discard).toEqual(expect.arrayContaining(['X', 'S', 'P3']));
  });

  it('AX-STR-1 with no valued card anywhere, Stress adds 0', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: ['S'], gear: 1 });
    round(r, { 0: P(1, [0]) });
    expect(last(r, 0).speed).toBe(0);
  });

  it('AX-BST-1 a boost is a choice after the move: 1 Heat, turn a card, more speed and distance; none with an empty engine', () => {
    const r = mk(1);
    rig(r, 0, { hand: [...HAND], deck: ['P4', 'P1', 'P1', 'P1'], gear: 1 });
    round(r, { 0: P(1, [0]) }, { 0: [{ do: 'boost' }] });
    expect([last(r, 0).boost, last(r, 0).speed, last(r, 0).dist, r.cars[0].engine]).toEqual([true, 5, 5, 5]);
    expect(last(r, 0).events.map((e) => e.k)).toEqual(['move', 'pay', 'flip', 'boost']);
    // With nothing to pay with, there is no boost to offer and the turn needs no decision.
    rig(r, 0, { hand: [...HAND], deck: ['P4', 'P1', 'P1', 'P1'], engine: 0, gear: 1 });
    round(r, { 0: P(1, [0]) });
    expect([last(r, 0).boost, last(r, 0).speed]).toEqual([false, 1]);
  });

  it('AX-SPD-1 corners check speed; distance can differ (brakes)', () => {
    const r = newRace({
      circuit: 'ashford', laps: 1, seed: 'b', modules: OFF, event: null,
      cars: [{ seat: 0, name: 'A', number: 1, livery: 0, upgrades: ['b03'] }],
    });
    rig(r, 0, { hand: ['b03', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], pos: 31, gear: 1, engine: 6 });
    round(r, { 0: P(1, [0]) }); // value 4, speed 2, crosses Tower Hairpin (limit 3)
    expect([last(r, 0).speed, r.cars[0].pos, r.cars[0].engine]).toEqual([2, 35, 6]);
  });
});

describe('AX-MOV and AX-LAP', () => {
  it('AX-MOV-1 you move exactly your distance and may pass cars', () => {
    const r = mk(2);
    rig(r, 0, { pos: 2, hand: ['P4', ...HAND.slice(1)] });
    rig(r, 1, { pos: 4, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    round(r, { 0: P(1, [0]) });
    expect(r.cars[0].pos).toBe(7); // 4 + catch-up
  });

  it('AX-MOV-2 a full destination drops you to the nearest free lane behind', () => {
    const r = mk(4);
    rig(r, 0, { pos: 0, lane: 0, hand: ['P4', ...HAND.slice(1)], gear: 1 });
    rig(r, 1, { pos: 5, lane: 0 });
    rig(r, 2, { pos: 5, lane: 1 });
    rig(r, 3, { pos: 4, lane: 0 });
    // Cars 1–3 resolve first with a Stress that turns nothing, so they stay put.
    r.weather = 'drizzle'; // no drafting, so the blocked stop is the final one
    for (const id of [1, 2, 3]) rig(r, id, { hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    round(r, { 0: P(1, [0]), 1: P(1, [0]), 2: P(1, [0]), 3: P(1, [0]) });
    expect([r.cars[0].pos, r.cars[0].lane]).toEqual([4, 1]);
  });

  it('AX-MOV-3 with every space between full you stay put', () => {
    const r = mk(5);
    rig(r, 0, { pos: 0, lane: 0, hand: ['P1', ...HAND.slice(1)] });
    const jam = [[1, 0], [1, 1], [2, 0], [2, 1]];
    jam.forEach(([pos, lane], k) => rig(r, k + 1, { pos, lane, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] }));
    round(r, { 0: P(1, [0]), 1: P(1, [0]), 2: P(1, [0]), 3: P(1, [0]), 4: P(1, [0]) });
    expect([r.cars[0].pos, r.cars[0].lane]).toEqual([0, 0]);
  });

  it('AX-LAP-1 crossing the line adds a lap and corners repeat', () => {
    const r = mk(1, 2);
    rig(r, 0, { pos: 57, hand: ['P5', ...HAND.slice(1)], gear: 1 });
    round(r, { 0: P(1, [0]) });
    expect(r.cars[0].pos).toBe(62);
    expect(Math.floor(r.cars[0].pos / r.n)).toBe(1);
    rig(r, 0, { pos: 79, hand: ['P5', 'P5', ...HAND.slice(2)], gear: 2, engine: 6 });
    round(r, { 0: P(2, [0, 1]) }); // 10 through space 81 = corner 21 (limit 5) on lap 2
    expect(last(r, 0).corners).toEqual([{ at: 21, limit: 5, paid: 5 }]);
  });
});

describe('AX-CRN and AX-SPN', () => {
  it('AX-CRN-1 a painted bend without a marker costs nothing', () => {
    const r = mk(1);
    rig(r, 0, { pos: 23, hand: ['P4', 'P4', 'P3', 'P1', 'P1', 'P1', 'P1'], gear: 2 });
    round(r, { 0: P(3, [0, 1, 2]) }); // speed 11 through the big bend at 29–31, no marker before 35
    expect([r.cars[0].pos, last(r, 0).corners]).toEqual([34, []]);
  });

  it('AX-CRN-2 overspeed pays the difference from the engine', () => {
    const r = mk(1);
    rig(r, 0, { pos: 30, hand: ['P3', 'P3', ...HAND.slice(2)], gear: 2, engine: 6 });
    round(r, { 0: P(2, [0, 1]) }); // speed 6 over corner 35 (limit 3)
    expect([r.cars[0].pos, r.cars[0].engine]).toEqual([36, 3]);
  });

  it('AX-SPN-1/2 an engine that cannot pay spins: stop before the corner, Stress into hand, back to gear 1', () => {
    const r = mk(1);
    rig(r, 0, { pos: 30, hand: ['P4', 'P4', 'P4', 'P1', 'P1', 'P1', 'P1'], gear: 3, engine: 2 });
    round(r, { 0: P(3, [0, 1, 2]) }); // speed 12 at limit 3 costs 9
    const c = r.cars[0];
    expect([c.pos, c.gear, last(r, 0).spun, c.stats.spins]).toEqual([34, 1, true, 1]);
    expect(c.engine).toBe(2);
    // AX-SPN-2: 2 Stress into the hand from gear 3; nothing was cooled, so no Heat came out of the hand.
    expect([c.hand.filter((x) => x === 'S').length, c.hand.length]).toEqual([2, 7]);
  });

  it('AX-CRN-3 several corners in one move: pay one, spin at the next', () => {
    const r = mk(1);
    rig(r, 0, { pos: 30, hand: ['P5', 'P4', 'P4', 'P1', 'P1', 'P1', 'P1'], gear: 3, engine: 9 });
    round(r, { 0: P(3, [0, 1, 2]) }); // 13: corner 35 (3) costs 10 > 9 → spin at the first
    expect(r.cars[0].pos).toBe(34);
    rig(r, 0, { pos: 34, hand: ['P5', 'P2', 'P1', 'P1', 'P1', 'P1', 'P1'], gear: 2, engine: 5 });
    round(r, { 0: P(2, [0, 1]) }); // 7 through 35 (3): pays 4, then 43 not reached (41)
    expect([r.cars[0].pos, r.cars[0].engine]).toEqual([41, 1]);
    rig(r, 0, { pos: 41, hand: ['P5', 'P2', 'P1', 'P1', 'P1', 'P1', 'P1'], gear: 2, engine: 3 });
    round(r, { 0: P(2, [0, 1]) }); // 7 through 43 (4): pays 3, 52 not reached (48)
    expect(r.cars[0].pos).toBe(48);
  });
});

describe('AX-DRF and AX-OVT', () => {
  it('AX-DRF-1 a car level or one space ahead offers 2 more spaces', () => {
    const r = mk(2);
    rig(r, 1, { pos: 8, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 0, { pos: 3, lane: 0, hand: ['P4', ...HAND.slice(1)] });
    round(r, { 0: P(1, [0]), 1: P(1, [0]) });
    expect([r.cars[0].pos, last(r, 0).drafted, r.cars[0].stats.drafts]).toEqual([10, 2, 1]); // 4 + catch-up, then 2
  });

  it('AX-DRF-2 the slipstream offer shows the extra corner Heat it would cost, and the choice is recorded', () => {
    const r = mk(2);
    rig(r, 1, { pos: 33, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 0, { pos: 28, lane: 0, hand: ['P4', ...HAND.slice(1)], engine: 6 });
    upTo(r, { 0: P(1, [0]), 1: P(1, [0]) }, 0, 'draft');
    expect(r.turn!.offer).toEqual({ len: 2, hazard: 1 });
    const step = r.step;
    play(r, { 0: [{ do: 'draft', take: true }] });
    expect([r.cars[0].pos, r.cars[0].engine, r.phase, r.step > step]).toEqual([35, 5, 'plan', true]);
    expect(r.replay[0].acts).toContainEqual([0, { do: 'draft', take: true }]);
  });

  it('AX-DRF-2 declining the draft leaves the car where it moved', () => {
    const r = mk(2);
    rig(r, 1, { pos: 33, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 0, { pos: 28, lane: 0, hand: ['P4', ...HAND.slice(1)], engine: 6 });
    round(r, { 0: P(1, [0]), 1: P(1, [0]) }, { 0: [{ do: 'catchup' }, { do: 'go' }, { do: 'draft', take: false }] });
    expect(r.cars[0].pos).toBe(33);
  });

  it('AX-OVT-1 every car passed in the round counts as an overtake', () => {
    const r = mk(3);
    rig(r, 1, { pos: 5, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 2, { pos: 6, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 0, { pos: 0, lane: 0, hand: ['P5', 'P5', ...HAND.slice(2)], gear: 2 });
    round(r, { 0: P(2, [0, 1]), 1: P(1, [0]), 2: P(1, [0]) });
    expect([r.cars[0].stats.overtakes, r.cars[0].stats.bestCharge]).toEqual([2, 2]);
  });
});

describe('AX-COOL, AX-ADR, AX-END, AX-DECK', () => {
  it('AX-COOL-1 gear 1 cools 3, gear 2 cools 1, gears 3–4 cool 0', () => {
    for (const [gear, want] of [[1, 3], [2, 1], [3, 0], [4, 0]]) {
      const r = mk(1);
      const hand = ['P1', 'P1', 'P1', 'P1', 'X', 'X', 'X', 'X'];
      rig(r, 0, { hand, handSize: 8, gear, pos: 0, engine: 2, deck: ['P1', 'P1', 'P1', 'P1', 'P1'] });
      round(r, { 0: P(gear, [0, 1, 2, 3].slice(0, gear)) });
      expect(last(r, 0).cooled, `gear ${gear}`).toBe(want);
    }
  });

  it('AX-ADR-1 the last car gets +1 distance and +1 cooling; the last two with 5+ cars', () => {
    const r = mk(2);
    rig(r, 0, { pos: 10, hand: [...HAND] });
    rig(r, 1, { pos: 0, hand: ['P1', 'X', 'P1', 'P1', 'P1', 'P1', 'P1'] });
    round(r, {});
    expect([last(r, 1).catchup, last(r, 1).dist, last(r, 1).cooled]).toEqual([true, 2, 1]);
    expect(last(r, 0).catchup).toBe(false);
    const f = mk(5);
    round(f, {});
    expect(f.last.filter((x) => x.catchup)).toHaveLength(2);
  });

  it('AX-END-1 everyone draws back up to 7, received cards go to the end of the hand', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['P3', 'P2', 'P1', 'P4', 'P1', 'P2', 'P3'], deck: ['P5', 'C', 'P4'] });
    round(r, { 0: P(1, [1]) });
    expect(r.cars[0].hand).toEqual(['P3', 'P1', 'P4', 'P1', 'P2', 'P3', 'P5']);
  });

  it('AX-DECK-1 an empty deck is rebuilt from the discard; cards in play stay out', () => {
    const r = mk(1);
    rig(r, 0, { hand: ['S', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], deck: [], discard: ['P2'], gear: 1 });
    round(r, { 0: P(1, [0]) });
    expect(last(r, 0).flipped).toEqual(['P2']);
    // The committed Stress went to the discard at the end of the round, then the refill rebuilt the deck from it.
    expect(r.cars[0].hand).toHaveLength(7);
  });
});

describe('AX-FIN', () => {
  it('AX-FIN-1/2 same-round finishers rank by distance past the line, then racing line, then resolution order', () => {
    const r = mk(3, 1);
    rig(r, 0, { pos: 58, lane: 0, hand: ['P3', ...HAND.slice(1)] }); // over 1
    rig(r, 1, { pos: 57, lane: 0, hand: ['P5', ...HAND.slice(1)] }); // over 2
    rig(r, 2, { pos: 56, lane: 0, hand: ['P4', ...HAND.slice(1)] }); // 4 + catch-up: over 1, resolves after car 0
    round(r, { 0: P(1, [0]), 1: P(1, [0]), 2: P(1, [0]) });
    expect(r.finished).toEqual([1, 0, 2]);
    expect(r.phase).toBe('over');
  });

  it('AX-END-2 the race runs until every car has finished; earlier rounds rank first', () => {
    const r = mk(3, 1);
    rig(r, 0, { pos: 58, hand: ['P3', ...HAND.slice(1)] });
    rig(r, 1, { pos: 50, lane: 0 });
    rig(r, 2, { pos: 45, lane: 0 });
    round(r, { 0: P(1, [0]) });
    expect([r.finished, r.cars[0].done]).toEqual([[0], { place: 1, round: 1, over: 1 }]);
    for (let k = 0; k < 40 && r.phase === 'plan'; k++) round(r, Object.fromEntries(r.cars.filter((c) => !c.done).map((c) => [c.id, autoPlan(r, c.id)])));
    expect(r.phase).toBe('over');
    expect(r.finished[0]).toBe(0);
    expect(r.cars.every((c) => c.done && c.done.over >= 0)).toBe(true);
    expect(r.cars[r.finished[1]].done!.round).toBeLessThanOrEqual(r.cars[r.finished[2]].done!.round);
  });

  it('AX-FIN-6 no slipstream across the finish line', () => {
    const r = mk(2, 1);
    rig(r, 1, { pos: 58, lane: 0, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 0, { pos: 54, lane: 0, hand: ['P4', ...HAND.slice(1)] });
    upTo(r, { 0: P(1, [0]), 1: P(1, [0]) }, 0, 'react');
    play(r, { 0: [{ do: 'go' }] }, (x) => x.turn?.stage === 'discard');
    expect([r.cars[0].pos, last(r, 0).drafted, r.turn?.stage]).toEqual([58, 0, 'discard']);
  });

  it('AX-FIN-1 a finished car never blocks', () => {
    const r = mk(2, 1);
    rig(r, 0, { pos: 58, hand: ['P3', ...HAND.slice(1)] });
    round(r, { 0: P(1, [0]) });
    expect(r.cars[0].done).not.toBeNull();
    expect(raceOrder(r)[0]).toBe(0);
    // AX-FIN-5: its space is free once its finishing round is over.
    expect(freeLane(r, r.cars[0].pos, 1)).toBe(0);
  });
});

describe('interpretations and determinism', () => {
  it('AX-DRF-1 a car that did not move cannot draft', () => {
    const r = mk(2);
    rig(r, 0, { pos: 10, lane: 0 });
    rig(r, 1, { pos: 10, lane: 1, hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    rig(r, 0, { hand: ['S', 'X', 'X', 'X', 'X', 'X', 'X'], deck: ['X'], discard: [] });
    round(r, {});
    expect(r.cars.map((c) => c.pos)).toEqual([10, 11]); // car 1 only moves its catch-up space
    expect(r.last.every((x) => x.drafted === 0)).toBe(true);
  });

  it('AX-TURN-5 cooling and catch-up come before the corner check, so a spun car keeps both', () => {
    const r = mk(2);
    rig(r, 1, { pos: 50 });
    rig(r, 0, { pos: 30, hand: ['P5', 'P4', 'X', 'X', 'X', 'X', 'P1'], gear: 2, engine: 0 });
    round(r, { 0: P(2, [0, 1]) }); // speed 9 at 35 (limit 3), empty engine → spin; gear 2 cools 1
    expect([last(r, 0).spun, last(r, 0).catchup, last(r, 0).cooled]).toEqual([true, true, 2]);
  });

  it('AX-TURN-3 the move comes first, with no corner checked until the reactions are done', () => {
    const r = mk(2);
    rig(r, 1, { pos: 50 });
    rig(r, 0, { pos: 30, hand: ['P4', 'P4', 'X', 'P1', 'P1', 'P1', 'P1'], gear: 1, engine: 6 });
    upTo(r, { 0: P(2, [0, 1]) }, 0, 'react'); // speed 8 across Tower (35, limit 3)
    expect([r.cars[0].pos, r.cars[0].engine, last(r, 0).corners]).toEqual([38, 6, []]);
    expect(turnOptions(r).cost).toBe(5);
  });

  it('AX-TURN-4 a stage with nothing to decide is skipped', () => {
    const r = mk(2);
    // Gear 3 cools nothing, the engine is empty so no boost, and the leader gets no catch-up: straight to Finish turn.
    rig(r, 1, { pos: 44, hand: ['P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], gear: 2, engine: 0 });
    rig(r, 0, { pos: 0 });
    upTo(r, { 1: P(3, [0, 1, 2]) }, 1, 'discard');
    expect(r.last.find((x) => x.car === 1)!.events.map((e) => e.k)).toEqual(['move']);
  });

  it('AX-TURN-6 the corner check covers boost and slipstream at the final speed', () => {
    const r = mk(2);
    rig(r, 1, { pos: 50 });
    rig(r, 0, { pos: 30, hand: ['P2', 'P1', 'P1', 'P1', 'P1', 'P1', 'P1'], deck: ['P3'], gear: 1, engine: 6 });
    upTo(r, { 0: P(1, [0]) }, 0, 'react'); // speed 2, at 32: short of Tower (35, limit 3)
    turnAct(r, { do: 'boost' }); // +3: speed 5, now at 35
    play(r, { 0: [{ do: 'go' }] }, (x) => x.turn?.stage === 'discard');
    expect(last(r, 0).corners).toEqual([{ at: 35, limit: 3, paid: 2 }]);
    expect(r.cars[0].engine).toBe(3); // 1 for the boost, 2 at the corner
  });

  it('the same seed and plans replay to the same race', () => {
    const run = () => {
      const r = mk(4, 1, 'replay');
      while (r.phase !== 'over' && r.round < 60) {
        for (const c of r.cars) if (!c.done) setPlan(r, c.id, autoPlan(r, c.id));
        reveal(r);
        play(r);
      }
      return JSON.stringify(r);
    };
    const a = run();
    expect(JSON.parse(a).phase).toBe('over');
    expect(run()).toBe(a);
  });
});

/** A simple legal plan: the highest gear reachable with the cards held. */
function autoPlan(r: Race, id: number): Plan {
  const c = r.cars[id];
  const ok = c.hand.map((x, i) => [x, i] as const).filter(([x]) => x !== HEAT).map(([, i]) => i);
  for (let g = Math.min(4, c.gear + 1); g >= 1; g--) {
    const p = P(g, ok.slice(0, g));
    if (ok.length >= g && !planError(r, id, p)) return p;
  }
  return P(1, []);
}
