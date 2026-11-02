import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, setupSpec, validateConfig, type BohnanzaConfig } from '../../src/games/bohnanza/rules/config';
import { activeDrawCount, canClaimCoin, setup } from '../../src/games/bohnanza/rules/engine';
import { assertConservation, bad, fieldBeans, handBeans, make, ok } from './helpers';

const cfg = (c: Partial<BohnanzaConfig>): BohnanzaConfig => ({ ...DEFAULT_CONFIG, ...c });
const count = (c: Partial<BohnanzaConfig>, n: number) => {
  const s = setup({ playerCount: n, seed: 'v', config: cfg(c) });
  const out: Record<string, number> = {};
  for (const b of Object.values(s.cards)) out[b] = (out[b] ?? 0) + 1;
  return out;
};

describe('V0 variant compatibility', () => {
  it('base game is valid for 3–5 players', () => {
    for (const n of [3, 4, 5]) expect(validateConfig(DEFAULT_CONFIG, n)).toBeNull();
  });
  it('allowed combinations', () => {
    for (const n of [3, 4, 5]) {
      expect(validateConfig(cfg({ magpie: true }), n)).toBeNull();
      expect(validateConfig(cfg({ beanCoin: true }), n)).toBeNull();
      expect(validateConfig(cfg({ threeNewBeans: true }), n)).toBeNull();
      expect(validateConfig(cfg({ threeNewBeans: true, magpie: true }), n)).toBeNull();
    }
    for (const n of [4, 5]) {
      expect(validateConfig(cfg({ fieldBean: true }), n)).toBeNull();
      expect(validateConfig(cfg({ fieldBean: true, magpie: true }), n)).toBeNull();
    }
  });
  it('unsupported combinations are refused', () => {
    expect(validateConfig(cfg({ fieldBean: true }), 3)).toMatch(/4–5/);
    expect(validateConfig(cfg({ fieldBean: true, threeNewBeans: true }), 4)).toBeTruthy();
    expect(validateConfig(cfg({ beanCoin: true, threeNewBeans: true }), 4)).toBeTruthy();
    expect(validateConfig(cfg({ beanCoin: true, fieldBean: true }), 4)).toBeTruthy();
    expect(validateConfig(cfg({ beanCoin: true, magpie: true }), 4)).toBeTruthy();
    for (const n of [3, 4, 5]) expect(validateConfig(cfg({ duel: true }), n)).toMatch(/2-player/);
  });
  it('the base game is unchanged when every variant is off', () => {
    expect(setupSpec(DEFAULT_CONFIG, 4)).toEqual({
      composition: { blue: 20, chili: 18, stink: 16, green: 14, soy: 12, blackeyed: 10, red: 8, garden: 6 },
      fields: 2,
      exhaustLimit: 3,
      drawMode: 'three',
    });
  });
});

describe('V1 Three New Bean Types', () => {
  it('V1.1 deck: 3 players add Brandy + Coffee; 4–5 add Cocoa + Brandy', () => {
    const c3 = count({ threeNewBeans: true }, 3);
    expect(c3.coffee).toBe(24);
    expect(c3.wax).toBe(22);
    expect(c3.cocoa).toBeUndefined();
    for (const n of [4, 5]) {
      const c = count({ threeNewBeans: true }, n);
      expect(c.cocoa).toBe(4);
      expect(c.wax).toBe(22);
      expect(c.coffee).toBeUndefined();
    }
  });

  it('V1.2 phase 4: each player draws one card, starting with the active player', () => {
    let s = make({ n: 4, active: 2, start: 0, config: { threeNewBeans: true }, phase: 'resolve', deck: ['red', 'soy', 'green', 'chili', 'blue', 'blue'] });
    s = ok(s, 2, { type: 'endTurn' });
    expect(handBeans(s, 2)).toEqual(['red']);
    expect(handBeans(s, 3)).toEqual(['soy']);
    expect(handBeans(s, 0)).toEqual(['green']);
    expect(handBeans(s, 1)).toEqual(['chili']);
    expect(s.active).toBe(3);
  });

  it('V1.3 with 3 players the game ends when the deck runs out the second time', () => {
    expect(setupSpec(cfg({ threeNewBeans: true }), 3).exhaustLimit).toBe(2);
    expect(setupSpec(cfg({ threeNewBeans: true }), 4).exhaustLimit).toBe(3);
    let s = make({ n: 3, config: { threeNewBeans: true }, phase: 'resolve', deck: ['red', 'soy'], exhaustions: 1 });
    s = ok(s, 0, { type: 'endTurn' });
    expect(s.phase).toBe('over');
    expect(handBeans(s, 0)).toEqual(['red']);
    expect(handBeans(s, 1)).toEqual(['soy']);
    expect(s.players[2].hand).toHaveLength(0);
  });
});

describe('V2 Field Bean', () => {
  it('V2.1 deck: base + 3 Field + 22 Brandy; two fields; each-player draw', () => {
    const c = count({ fieldBean: true }, 4);
    expect(c.field).toBe(3);
    expect(c.wax).toBe(22);
    expect(c.coffee).toBeUndefined();
    expect(c.cocoa).toBeUndefined();
    const spec = setupSpec(cfg({ fieldBean: true }), 5);
    expect(spec.fields).toBe(2);
    expect(spec.drawMode).toBe('each');
  });

  it('V2.2 harvesting two Field Beans grants a third field and no coins', () => {
    let s = make({ config: { fieldBean: true }, fields: [[['field', 'field'], []], [[], []], [[], []], [[], []]] });
    s = ok(s, 0, { type: 'harvest', field: 0 });
    expect(s.players[0].fields).toHaveLength(3);
    expect(s.players[0].coins).toHaveLength(0);
    expect(s.discard).toHaveLength(2);
    assertConservation(s);
  });

  it('V2.3 three Field Beans pay three coins; a second third field is never granted', () => {
    let s = make({ config: { fieldBean: true }, fields: [[['field', 'field', 'field'], []], [[], []], [[], []], [[], []]] });
    s = ok(s, 0, { type: 'harvest', field: 0 });
    expect(s.players[0].coins).toHaveLength(3);
    expect(s.players[0].fields).toHaveLength(2);
    s = make({ config: { fieldBean: true }, fields: [[['field', 'field'], [], []], [[], []], [[], []], [[], []]] });
    s = ok(s, 0, { type: 'harvest', field: 0 });
    expect(s.players[0].fields).toHaveLength(3);
  });

  it('V2.4 one Field Bean pays nothing', () => {
    let s = make({ config: { fieldBean: true }, fields: [[['field'], []], [[], []], [[], []], [[], []]] });
    s = ok(s, 0, { type: 'harvest', field: 0 });
    expect(s.players[0].coins).toHaveLength(0);
    expect(s.players[0].fields).toHaveLength(2);
  });
});

describe('V4 AMIGO Bean Coin', () => {
  it('V4.1 starts with the player to the right of the starting player', () => {
    for (let i = 0; i < 10; i++) {
      const s = setup({ playerCount: 4, seed: 'coin' + i, config: cfg({ beanCoin: true }) });
      expect(s.coin!.owner).toBe((s.start + 3) % 4);
    }
  });

  it('V4.2 claim threshold: 6 with 3 players, 5 with 4–5', () => {
    // 4 players: 10 blue (4) + 2 red (1) = 5
    const s4 = make({ config: { beanCoin: true }, coinOwner: 2, fields: [[Array(10).fill('blue'), ['red', 'red']], [[], []], [[], []], [[], []]] });
    expect(canClaimCoin(s4, 0)).toBe(true);
    const s4b = make({ config: { beanCoin: true }, coinOwner: 2, fields: [[Array(8).fill('blue'), ['red', 'red']], [[], []], [[], []], [[], []]] });
    expect(canClaimCoin(s4b, 0)).toBe(false);
    bad(s4b, 0, { type: 'claimCoin' }, 'coin-value');
    const s3 = make({ n: 3, config: { beanCoin: true }, coinOwner: 2, fields: [[Array(10).fill('blue'), ['red', 'red'], []], [[], [], []], [[], [], []]] });
    expect(canClaimCoin(s3, 0)).toBe(false);
    // only the active player
    expect(canClaimCoin(s4, 1)).toBe(false);
  });

  const claimable = (holderHand: string[]) =>
    make({
      config: { beanCoin: true },
      coinOwner: 2,
      hands: [['soy'], [], holderHand as never, []],
      fields: [[Array(10).fill('blue'), ['red', 'red']], [[], []], [[], []], [[], []]],
    });

  it('V4.3 holder may hand over the coin without resisting', () => {
    let s = claimable(['green']);
    s = ok(s, 0, { type: 'claimCoin' });
    expect(s.coin!.claim).toBe(true);
    bad(s, 0, { type: 'plant', field: 1 }, 'coin-pending');
    bad(s, 1, { type: 'coinRespond', resist: false }, 'not-yours');
    s = ok(s, 2, { type: 'coinRespond', resist: false });
    expect(s.coin!.owner).toBe(0);
    expect(handBeans(s, 2)).toEqual(['green']);
  });

  it('V4.4 resisting with a non-Blue card: coin moves, claimant must plant the card', () => {
    let s = claimable(['green']);
    s = ok(s, 0, { type: 'claimCoin' });
    s = ok(s, 2, { type: 'coinRespond', resist: true });
    expect(s.coin!.owner).toBe(0);
    expect(s.players[2].hand).toHaveLength(0);
    expect(s.coin!.mustPlant).not.toBeNull();
    bad(s, 0, { type: 'flip' }, 'coin-plant');
    bad(s, 0, { type: 'plantCoinCard', field: 0 }, 'field-mismatch');
    s = ok(s, 0, { type: 'harvest', field: 1 });
    s = ok(s, 0, { type: 'plantCoinCard', field: 1 });
    expect(fieldBeans(s, 0)[1]).toEqual(['green']);
    assertConservation(s);
  });

  it('V4.5 resisting with a Blue Bean: holder keeps the coin, claimant blocked for the turn', () => {
    let s = claimable(['blue']);
    s = ok(s, 0, { type: 'claimCoin' });
    s = ok(s, 2, { type: 'coinRespond', resist: true });
    expect(s.coin!.owner).toBe(2);
    expect(s.coin!.blocked).toBe(true);
    s = ok(s, 0, { type: 'plantCoinCard', field: 0 }); // blue on blue
    bad(s, 0, { type: 'claimCoin' }, 'coin-blocked');
    expect(fieldBeans(s, 0)[0]).toHaveLength(11);
  });

  it('V4.6 a holder with an empty hand cannot resist', () => {
    let s = claimable([]);
    s = ok(s, 0, { type: 'claimCoin' });
    expect(s.coin!.owner).toBe(0);
    expect(s.coin!.claim).toBe(false);
  });

  it('V4.7 phase-4 draw: holder draws 4; fields worth < 1 coin draw 2; otherwise 3', () => {
    const holder = make({ config: { beanCoin: true }, coinOwner: 0, phase: 'resolve' });
    expect(activeDrawCount(holder)).toBe(4);
    const poor = make({ config: { beanCoin: true }, coinOwner: 2, phase: 'resolve' });
    expect(activeDrawCount(poor)).toBe(2);
    const normal = make({ config: { beanCoin: true }, coinOwner: 2, phase: 'resolve', fields: [[['red', 'red'], []], [[], []], [[], []], [[], []]] });
    expect(activeDrawCount(normal)).toBe(3);
    const s = ok(poor, 0, { type: 'endTurn' });
    expect(s.players[0].hand).toHaveLength(2);
    // Without the variant the active player always draws 3.
    expect(activeDrawCount(make({ phase: 'resolve' }))).toBe(3);
  });

  it('V4.8 the Bean Coin wins ties but is worth no points', () => {
    let s = make({ config: { beanCoin: true }, coinOwner: 1, start: 0, phase: 'resolve', deck: ['red'], exhaustions: 2 });
    for (const seat of [1, 3]) {
      const id = `coin-${seat}`;
      s.cards[id] = 'red';
      s.players[seat].coins.push(id);
    }
    s = ok(s, 0, { type: 'endTurn' });
    expect(s.result![0].seat).toBe(1);
    expect(s.result![0].score).toBe(1);
    expect(s.result![0].detail).toMatch(/Bean Coin/);
  });

  it('V4.9 the blocked flag resets for the next turn', () => {
    let s = claimable(['blue']);
    s = ok(s, 0, { type: 'claimCoin' });
    s = ok(s, 2, { type: 'coinRespond', resist: true });
    s = ok(s, 0, { type: 'plantCoinCard', field: 0 });
    s.phase = 'resolve';
    s = ok(s, 0, { type: 'endTurn' });
    expect(s.coin!.blocked).toBe(false);
  });
});

describe('V5 Magpie Bean', () => {
  it('V5.1 six Magpie Beans join any deck', () => {
    expect(count({ magpie: true }, 4).magpie).toBe(6);
    expect(count({ magpie: true, threeNewBeans: true }, 3).magpie).toBe(6);
    expect(count({ magpie: true, fieldBean: true }, 5).magpie).toBe(6);
  });

  const table = () =>
    make({
      config: { magpie: true },
      hands: [['magpie', 'red'], [], [], []],
      fields: [
        [['soy'], []],
        [['soy', 'soy'], ['blue']],
        [['chili', 'chili'], []],
        [['green'], []],
      ],
    });

  it('V5.2 a Magpie is never planted and must be played when it is the front card', () => {
    const s = table();
    bad(s, 0, { type: 'plant', field: 1 }, 'magpie-front');
    bad(s, 0, { type: 'flip' }, 'must-plant');
  });

  it('V5.3 play: discard the Magpie, steal one card from each of up to two players into own fields', () => {
    let s = table();
    s = ok(s, 0, { type: 'playMagpie' });
    expect(s.discard.map((id) => s.cards[id])).toEqual(['magpie']);
    expect(s.planted).toBe(1);
    bad(s, 0, { type: 'flip' }, 'magpie-pending');
    s = ok(s, 0, { type: 'steal', victim: 1, victimField: 0, field: 0 });
    bad(s, 0, { type: 'steal', victim: 1, victimField: 1, field: 1 }, 'bad-target');
    bad(s, 0, { type: 'steal', victim: 2, victimField: 0, field: 0 }, 'field-mismatch');
    s = ok(s, 0, { type: 'steal', victim: 2, victimField: 0, field: 1 });
    expect(s.magpie).toBeNull();
    expect(fieldBeans(s, 0)).toEqual([['soy', 'soy'], ['chili']]);
    expect(fieldBeans(s, 1)[0]).toEqual(['soy']);
    expect(fieldBeans(s, 2)[0]).toEqual(['chili']);
    // Second play of phase 1 is still allowed.
    s = ok(s, 0, { type: 'harvest', field: 0 });
    s = ok(s, 0, { type: 'plant', field: 0 });
    bad(s, 0, { type: 'plant', field: 0 }, 'plant-limit');
    assertConservation(s);
  });

  it('V5.4 victims cannot harvest to avoid the steal; steals may stop early', () => {
    let s = table();
    s = ok(s, 0, { type: 'playMagpie' });
    bad(s, 1, { type: 'harvest', field: 0 }, 'magpie-pending');
    s = ok(s, 0, { type: 'steal', victim: 3, victimField: 0, field: 1 });
    s = ok(s, 0, { type: 'endSteal' });
    expect(s.magpie).toBeNull();
    ok(s, 1, { type: 'harvest', field: 0 });
  });

  it('V5.5 nothing to steal: the Magpie is simply discarded', () => {
    let s = make({ config: { magpie: true }, hands: [['magpie'], [], [], []] });
    s = ok(s, 0, { type: 'playMagpie' });
    expect(s.magpie).toBeNull();
    s = ok(s, 0, { type: 'flip' });
    expect(s.phase).toBe('trade');
  });

  it('V5.6 a Magpie received or kept in phase 2 goes to the back of the hand in phase 3', () => {
    let s = make({
      config: { magpie: true },
      hands: [['red'], ['magpie', 'green'], [], []],
      deck: ['magpie', 'soy', ...Array(10).fill('blue')],
    });
    s = ok(s, 0, { type: 'plant', field: 0 });
    s = ok(s, 0, { type: 'flip' });
    const magUp = s.faceUp[0];
    // Player 1 donates their Magpie to the active player; the turned-over Magpie is kept.
    s = ok(s, 1, { type: 'offer', to: 0, give: [s.players[1].hand[0]], wantCards: [], wantTypes: {} });
    s = ok(s, 0, { type: 'accept', offer: 1, cards: [] });
    s = ok(s, 0, { type: 'endTrading' });
    expect(handBeans(s, 0)).toEqual(['magpie', 'magpie']);
    expect(s.players[0].hand).toContain(magUp);
    expect(s.players[0].pending.map((id) => s.cards[id])).toEqual(['soy']);
    assertConservation(s);
  });
});
