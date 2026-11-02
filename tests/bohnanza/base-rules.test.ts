import { describe, expect, it } from 'vitest';
import { BEANS, coinsFor } from '../../src/games/bohnanza/rules/cards';
import { DEFAULT_CONFIG } from '../../src/games/bohnanza/rules/config';
import { setup } from '../../src/games/bohnanza/rules/engine';
import { assertConservation, bad, fieldBeans, handBeans, make, ok } from './helpers';

const base = (n: number, seed = 's') => setup({ playerCount: n, seed, config: { ...DEFAULT_CONFIG } });

describe('R1 setup', () => {
  it('R1.1 base deck has 104 cards in 8 types with printed counts', () => {
    const s = base(4);
    const counts: Record<string, number> = {};
    for (const b of Object.values(s.cards)) counts[b] = (counts[b] ?? 0) + 1;
    expect(Object.keys(s.cards)).toHaveLength(104);
    expect(counts).toEqual({ blue: 20, chili: 18, stink: 16, green: 14, soy: 12, blackeyed: 10, red: 8, garden: 6 });
    for (const [b, c] of Object.entries(counts)) expect(BEANS[b as keyof typeof BEANS].count).toBe(c);
  });

  it('R1.2 three players get three fields; four and five get two', () => {
    expect(base(3).players.every((p) => p.fields.length === 3)).toBe(true);
    expect(base(4).players.every((p) => p.fields.length === 2)).toBe(true);
    expect(base(5).players.every((p) => p.fields.length === 2)).toBe(true);
  });

  it('R1.3 deals five cards each and leaves the rest as the draw pile', () => {
    for (const n of [3, 4, 5]) {
      const s = base(n);
      expect(s.players.every((p) => p.hand.length === 5)).toBe(true);
      expect(s.deck).toHaveLength(104 - 5 * n);
      assertConservation(s);
    }
  });

  it('R1.4 starting player is random and seeded; play passes to the left', () => {
    const starts = new Set(Array.from({ length: 40 }, (_, i) => base(5, 'seed' + i).start));
    expect(starts.size).toBeGreaterThan(1);
    expect(base(4, 'x').start).toBe(base(4, 'x').start);
  });

  it('R1.5 card ids carry no bean information', () => {
    const s = base(4);
    for (const id of Object.keys(s.cards)) expect(id).toMatch(/^c[0-9a-z]+$/);
    // Same id set across seeds but different bean assignment.
    const t = base(4, 'other');
    const diff = Object.keys(s.cards).filter((id) => s.cards[id] !== t.cards[id]).length;
    expect(diff).toBeGreaterThan(50);
  });

  it('R1.6 invalid player counts and the Duel are rejected', () => {
    expect(() => setup({ playerCount: 2, seed: 'x', config: { ...DEFAULT_CONFIG } })).toThrow();
    expect(() => setup({ playerCount: 6, seed: 'x', config: { ...DEFAULT_CONFIG } })).toThrow();
    expect(() => setup({ playerCount: 4, seed: 'x', config: { ...DEFAULT_CONFIG, duel: true } })).toThrow(/2-player/);
  });
});

describe('R2 hand order', () => {
  it('R2.1 drawn cards go to the back of the hand in draw order (see also R6.1)', () => {
    let s = make({ hands: [[], [], [], []], deck: ['soy', 'green', 'chili', 'stink', 'blue', ...Array(10).fill('red')], phase: 'resolve' });
    s = ok(s, 0, { type: 'endTurn' });
    expect(handBeans(s, 0)).toEqual(['soy', 'green', 'chili']);
  });

  it('R2.3 only the front card can be planted from hand, and a third plant is refused', () => {
    let s = make({ hands: [['red', 'soy', 'blue'], [], [], []] });
    s = ok(s, 0, { type: 'plant', field: 0 });
    expect(fieldBeans(s, 0)).toEqual([['red'], []]);
    s = ok(s, 0, { type: 'plant', field: 1 });
    expect(fieldBeans(s, 0)).toEqual([['red'], ['soy']]);
    bad(s, 0, { type: 'plant', field: 0 }, 'plant-limit');
    expect(handBeans(s, 0)).toEqual(['blue']);
  });
});

describe('R3 planting', () => {
  it('R3.1 one kind per field; the same kind may occupy two fields', () => {
    let s = make({ hands: [['red', 'red'], [], [], []], fields: [[['soy'], []], [[], []], [[], []], [[], []]] });
    bad(s, 0, { type: 'plant', field: 0 }, 'field-mismatch');
    ok(s, 0, { type: 'plant', field: 1 });
    s = make({ hands: [['red', 'red'], [], [], []] });
    s = ok(s, 0, { type: 'plant', field: 0 });
    s = ok(s, 0, { type: 'plant', field: 1 });
    expect(fieldBeans(s, 0)).toEqual([['red'], ['red']]);
  });

  it('R3.2 the first card is mandatory: cannot turn over cards before planting it', () => {
    const s = make({ hands: [['red'], [], [], []] });
    bad(s, 0, { type: 'flip' }, 'must-plant');
  });

  it('R3.3 with no compatible field the player must harvest first', () => {
    let s = make({ hands: [['red'], [], [], []], fields: [[['soy', 'soy'], ['blue', 'blue']], [[], []], [[], []], [[], []]] });
    bad(s, 0, { type: 'plant', field: 0 }, 'field-mismatch');
    s = ok(s, 0, { type: 'harvest', field: 0 });
    expect(s.players[0].coins).toHaveLength(1); // 2 soy = 1 coin
    s = ok(s, 0, { type: 'plant', field: 0 });
    expect(fieldBeans(s, 0)).toEqual([['red'], ['blue', 'blue']]);
  });

  it('R3.4 an empty hand skips phase 1', () => {
    const s = make({ hands: [[], [], [], []] });
    const t = ok(s, 0, { type: 'flip' });
    expect(t.phase).toBe('trade');
    expect(t.faceUp).toHaveLength(2);
  });

  it('only the active player plants from hand', () => {
    const s = make({ hands: [['red'], ['red'], [], []] });
    bad(s, 1, { type: 'plant', field: 0 }, 'not-your-turn');
  });
});

describe('R7 harvesting', () => {
  it('R7.2 beanometers match the printed cards', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => coinsFor('stink', c))).toEqual([0, 0, 1, 1, 2, 2, 3, 4, 4]);
    expect([2, 3, 6, 8, 9].map((c) => coinsFor('chili', c))).toEqual([0, 1, 2, 3, 4]);
    expect([1, 2, 3, 4].map((c) => coinsFor('garden', c))).toEqual([0, 2, 3, 3]);
    expect([3, 4, 6, 8, 10].map((c) => coinsFor('blue', c))).toEqual([0, 1, 2, 3, 4]);
    expect([2, 3, 4, 5].map((c) => coinsFor('red', c))).toEqual([1, 2, 3, 4]);
    expect([2, 4, 5, 6].map((c) => coinsFor('blackeyed', c))).toEqual([1, 2, 3, 4]);
    expect([2, 4, 6, 7].map((c) => coinsFor('soy', c))).toEqual([1, 2, 3, 4]);
    expect([3, 5, 6, 7].map((c) => coinsFor('green', c))).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map((c) => coinsFor('cocoa', c))).toEqual([0, 2, 3, 4]);
    expect([4, 7, 9, 11].map((c) => coinsFor('wax', c))).toEqual([1, 2, 3, 4]);
    expect([4, 7, 10, 12].map((c) => coinsFor('coffee', c))).toEqual([1, 2, 3, 4]);
  });

  it('R7.2/R7.3 coin cards go to the coin stack, the rest to the discard pile; the field empties', () => {
    let s = make({ fields: [[['chili', 'chili', 'chili'], []], [[], []], [[], []], [[], []]] });
    s = ok(s, 0, { type: 'harvest', field: 0 });
    expect(s.players[0].coins).toHaveLength(1);
    expect(s.discard).toHaveLength(2);
    expect(s.players[0].fields[0]).toEqual([]);
    assertConservation(s);
  });

  it('R7.1 any player may harvest at any time, even off-turn', () => {
    let s = make({ active: 0, fields: [[[], []], [['red', 'red'], []], [[], []], [[], []]] });
    s = ok(s, 1, { type: 'harvest', field: 0 });
    expect(s.players[1].coins).toHaveLength(1);
  });

  it('R7.4 bean protection: a single bean is protected while another field has more', () => {
    const s = make({ fields: [[['red'], ['soy', 'soy']], [[], []], [[], []], [[], []]] });
    bad(s, 0, { type: 'harvest', field: 0 }, 'protected');
    ok(s, 0, { type: 'harvest', field: 1 });
    // All fields single (or empty): any single may be harvested.
    const t = make({ fields: [[['red'], ['soy']], [[], []], [[], []], [[], []]] });
    ok(t, 0, { type: 'harvest', field: 0 });
    const u = make({ fields: [[['red'], []], [[], []], [[], []], [[], []]] });
    ok(u, 0, { type: 'harvest', field: 0 });
  });

  it('cannot harvest an empty field', () => {
    bad(make(), 0, { type: 'harvest', field: 0 }, 'empty-field');
  });
});

describe('R4 trading', () => {
  const trading = () => {
    let s = make({
      hands: [['red', 'soy', 'chili'], ['blue', 'green', 'red'], ['stink'], ['garden']],
      deck: ['soy', 'blue', ...Array(20).fill('green')],
    });
    s = ok(s, 0, { type: 'plant', field: 0 }); // red
    s = ok(s, 0, { type: 'flip' }); // soy, blue face up
    return s;
  };

  it('R4.1 two cards are turned over and belong to the active player', () => {
    const s = trading();
    expect(s.faceUp.map((id) => s.cards[id])).toEqual(['soy', 'blue']);
    expect(s.phase).toBe('trade');
  });

  it('R4.2 non-active players cannot trade with each other', () => {
    const s = trading();
    bad(s, 1, { type: 'offer', to: 2, give: [s.players[1].hand[0]], wantCards: [], wantTypes: {} }, 'not-active-trade');
  });

  it('R4.3/R4.5 active trades a face-up card plus a hand card (any position) for one bean', () => {
    let s = trading();
    const soyUp = s.faceUp[0];
    const chiliInHand = s.players[0].hand[1]; // second card in hand
    s = ok(s, 0, { type: 'offer', to: 1, give: [soyUp, chiliInHand], wantCards: [], wantTypes: { red: 1 } });
    const redOf1 = s.players[1].hand[2];
    s = ok(s, 1, { type: 'accept', offer: 1, cards: [redOf1] });
    expect(s.players[0].pending).toEqual([redOf1]);
    expect(s.players[1].pending).toEqual([soyUp, chiliInHand]);
    // R2.2 order of remaining hand cards preserved
    expect(handBeans(s, 0)).toEqual(['soy']);
    expect(handBeans(s, 1)).toEqual(['blue', 'green']);
    assertConservation(s);
  });

  it('R4.4 received cards cannot be traded again; field cards cannot be traded', () => {
    let s = trading();
    s = ok(s, 0, { type: 'offer', to: 1, give: [s.faceUp[0]], wantCards: [], wantTypes: {} });
    s = ok(s, 1, { type: 'accept', offer: 1, cards: [] });
    const received = s.players[1].pending[0];
    bad(s, 1, { type: 'offer', to: 0, give: [received], wantCards: [], wantTypes: {} }, 'not-tradeable');
    const fieldCard = s.players[0].fields[0][0];
    bad(s, 0, { type: 'offer', to: 2, give: [fieldCard], wantCards: [], wantTypes: {} }, 'not-tradeable');
  });

  it('R4.6 cards move only when the recipient accepts with exactly the requested beans', () => {
    let s = trading();
    s = ok(s, 0, { type: 'offer', to: 1, give: [s.faceUp[0]], wantCards: [], wantTypes: { red: 1 } });
    expect(s.faceUp).toHaveLength(2);
    bad(s, 1, { type: 'accept', offer: 1, cards: [s.players[1].hand[0]] }, 'wrong-cards'); // blue, not red
    bad(s, 2, { type: 'accept', offer: 1, cards: [] }, 'not-yours');
    s = ok(s, 1, { type: 'reject', offer: 1 });
    bad(s, 1, { type: 'accept', offer: 1, cards: [s.players[1].hand[2]] }, 'bad-offer');
  });

  it('R4.7 donations need acceptance; non-active players may only donate to the active player', () => {
    let s = trading();
    s = ok(s, 2, { type: 'offer', to: 0, give: [s.players[2].hand[0]], wantCards: [], wantTypes: {} });
    s = ok(s, 0, { type: 'accept', offer: 1, cards: [] });
    expect(s.players[0].pending.map((id) => s.cards[id])).toEqual(['stink']);
    bad(s, 3, { type: 'offer', to: 1, give: [s.players[3].hand[0]], wantCards: [], wantTypes: {} }, 'not-active-trade');
  });

  it('R4.8 trading may continue after the face-up cards are gone; only the active player ends it', () => {
    let s = trading();
    s = ok(s, 0, { type: 'offer', to: 1, give: [...s.faceUp], wantCards: [], wantTypes: {} });
    s = ok(s, 1, { type: 'accept', offer: 2 - 1, cards: [] });
    expect(s.faceUp).toHaveLength(0);
    s = ok(s, 3, { type: 'offer', to: 0, give: [s.players[3].hand[0]], wantCards: [], wantTypes: { soy: 1 } });
    s = ok(s, 0, { type: 'accept', offer: 2, cards: [s.players[0].hand[0]] });
    bad(s, 1, { type: 'endTrading' }, 'not-your-turn');
    s = ok(s, 0, { type: 'endTrading' });
    expect(s.phase).toBe('resolve');
  });

  it('R4.9 counteroffers close the original; double spending is impossible', () => {
    let s = trading();
    const soyUp = s.faceUp[0];
    s = ok(s, 0, { type: 'offer', to: 1, give: [soyUp], wantCards: [], wantTypes: { red: 1 } });
    s = ok(s, 0, { type: 'offer', to: 2, give: [soyUp], wantCards: [], wantTypes: {} });
    s = ok(s, 1, { type: 'offer', to: 0, give: [s.players[1].hand[0]], wantCards: [soyUp], wantTypes: {}, replyTo: 1 });
    expect(s.offers.find((o) => o.id === 1)!.status).toBe('countered');
    s = ok(s, 2, { type: 'accept', offer: 2, cards: [] }); // soy goes to player 2
    expect(s.offers.find((o) => o.id === 3)!.status).toBe('void'); // counter wanted the soy
    bad(s, 0, { type: 'accept', offer: 3, cards: [] }, 'bad-offer');
    assertConservation(s);
  });

  it('non-active players may request a turned-over card by id', () => {
    let s = trading();
    const blueUp = s.faceUp[1];
    s = ok(s, 1, { type: 'offer', to: 0, give: [s.players[1].hand[1]], wantCards: [blueUp], wantTypes: {} });
    s = ok(s, 0, { type: 'accept', offer: 1, cards: [] });
    expect(s.players[1].pending).toEqual([blueUp]);
  });

  it('trading is only possible in phase 2', () => {
    const s = make({ hands: [['red'], ['blue'], [], []] });
    bad(s, 0, { type: 'offer', to: 1, give: [s.players[0].hand[0]], wantCards: [], wantTypes: {} }, 'wrong-phase');
  });

  it('empty offers are refused', () => {
    const s = trading();
    bad(s, 0, { type: 'offer', to: 1, give: [], wantCards: [], wantTypes: {} }, 'empty-offer');
  });
});

describe('R5/R6 planting received cards and drawing', () => {
  it('R5.1 everybody plants received cards and the active player plants kept cards, in any order', () => {
    let s = make({
      hands: [['red'], ['blue'], [], []],
      deck: ['soy', 'green', ...Array(20).fill('chili')],
    });
    s = ok(s, 0, { type: 'plant', field: 0 });
    s = ok(s, 0, { type: 'flip' });
    const [soy, green] = s.faceUp;
    s = ok(s, 0, { type: 'offer', to: 1, give: [soy], wantCards: [], wantTypes: { blue: 1 } });
    s = ok(s, 1, { type: 'accept', offer: 1, cards: [s.players[1].hand[0]] });
    s = ok(s, 0, { type: 'endTrading' });
    expect(s.players[0].pending.map((id) => s.cards[id]).sort()).toEqual(['blue', 'green']);
    bad(s, 0, { type: 'endTurn' }, 'pending');
    s = ok(s, 1, { type: 'plantPending', card: soy, field: 1 });
    s = ok(s, 0, { type: 'plantPending', card: green, field: 1 });
    const blue = s.players[0].pending[0];
    bad(s, 0, { type: 'plantPending', card: blue, field: 0 }, 'field-mismatch'); // red there
    s = ok(s, 0, { type: 'harvest', field: 0 }); // single red; other field single green → allowed
    s = ok(s, 0, { type: 'plantPending', card: blue, field: 0 });
    s = ok(s, 0, { type: 'endTurn' });
    expect(s.active).toBe(1);
    expect(s.phase).toBe('plant');
    assertConservation(s);
  });

  it('R6.1 the active player draws three cards to the back of the hand, then play passes left', () => {
    let s = make({ n: 3, hands: [['red', 'blue'], [], []], deck: ['soy', 'green', 'chili', 'stink', 'garden', ...Array(20).fill('red')] });
    s = ok(s, 0, { type: 'plant', field: 0 });
    s = ok(s, 0, { type: 'flip' });
    s = ok(s, 0, { type: 'endTrading' });
    for (const id of [...s.players[0].pending]) s = ok(s, 0, { type: 'plantPending', card: id, field: s.cards[id] === 'soy' ? 1 : 2 });
    s = ok(s, 0, { type: 'endTurn' });
    expect(handBeans(s, 0)).toEqual(['blue', 'chili', 'stink', 'garden']);
    expect(s.active).toBe(1);
    // wraps around
    s.active = 2;
    s.phase = 'resolve';
    s = ok(s, 2, { type: 'endTurn' });
    expect(s.active).toBe(0);
  });
});

describe('R8 deck exhaustion and R9 end of game', () => {
  it('R8.1 the discard pile is reshuffled when the last card is drawn', () => {
    let s = make({ hands: [[], [], [], []], deck: ['soy', 'blue'], discard: ['red', 'red', 'red'] });
    s = ok(s, 0, { type: 'flip' });
    expect(s.exhaustions).toBe(1);
    expect(s.deck).toHaveLength(3);
    expect(s.discard).toHaveLength(0);
  });

  it('R8.2 third exhaustion during phase 2: finish phases 2 and 3 with one card, then end', () => {
    let s = make({ hands: [[], ['red'], [], []], deck: ['soy'], discard: ['blue', 'blue'], exhaustions: 2 });
    s = ok(s, 0, { type: 'flip' });
    expect(s.faceUp).toHaveLength(1);
    expect(s.finalTurn).toBe(true);
    expect(s.phase).toBe('trade');
    s = ok(s, 1, { type: 'offer', to: 0, give: [s.players[1].hand[0]], wantCards: [], wantTypes: {} });
    s = ok(s, 0, { type: 'accept', offer: 1, cards: [] });
    s = ok(s, 0, { type: 'endTrading' });
    expect(s.phase).toBe('resolve');
    s = ok(s, 0, { type: 'plantPending', card: s.players[0].pending[0], field: 0 });
    s = ok(s, 0, { type: 'plantPending', card: s.players[0].pending[0], field: 1 });
    expect(s.phase).toBe('over');
    expect(s.result).not.toBeNull();
  });

  it('R8.2 third exhaustion during phase 4 ends the game immediately', () => {
    let s = make({ hands: [[], [], [], []], deck: ['soy', 'blue', 'red'], discard: [], exhaustions: 2, phase: 'resolve' });
    s.deck = s.deck.slice(0, 2);
    s = ok(s, 0, { type: 'endTurn' });
    expect(s.phase).toBe('over');
    expect(s.players[0].hand).toHaveLength(2);
  });

  it('R8.2 the deck runs out three times in the base game for every player count', () => {
    for (const n of [3, 4, 5]) expect(base(n).exhaustLimit).toBe(3);
  });

  it('R9.1 final harvest of all fields; hand cards do not count', () => {
    let s = make({
      hands: [[], ['red', 'red', 'red'], [], []],
      fields: [[['red'], ['soy', 'soy']], [['blue', 'blue', 'blue', 'blue'], ['red']], [[], []], [[], []]],
      deck: ['green'],
      exhaustions: 2,
      phase: 'resolve',
    });
    s = ok(s, 0, { type: 'endTurn' });
    expect(s.phase).toBe('over');
    // Final harvest ignores bean protection: player 0 gets 0 (1 red) + 1 (2 soy); player 1 gets 1 (4 blue) + 0.
    const score = (seat: number) => s.result!.find((r) => r.seat === seat)!.score;
    expect(score(0)).toBe(1);
    expect(score(1)).toBe(1);
    expect(s.players.every((p) => p.fields.every((f) => f.length === 0))).toBe(true);
  });

  it('R9.2/R9.3 most coins wins; ties go to the tied player furthest clockwise from the start player', () => {
    let s = make({ n: 4, start: 1, active: 1, phase: 'resolve', deck: ['green'], exhaustions: 2 });
    const give = (seat: number, k: number) => {
      for (let i = 0; i < k; i++) {
        const id = `coin-${seat}-${i}`;
        s.cards[id] = 'red';
        s.players[seat].coins.push(id);
      }
    };
    give(0, 2);
    give(2, 2);
    give(3, 1);
    s = ok(s, 1, { type: 'endTurn' });
    // Distances from seat 1: seat2=1, seat3=2, seat0=3 → seat 0 wins the 2–2 tie with seat 2.
    const res = s.result!;
    expect(res.map((r) => r.seat)).toEqual([0, 2, 3, 1]);
    expect(res[0].winner).toBe(true);
    expect(res[1].winner).toBe(false);
    expect(res[0].detail).toMatch(/furthest/);
  });
});
