import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/games/bohnanza/rules/config';
import { setup } from '../../src/games/bohnanza/rules/engine';
import { project } from '../../src/games/bohnanza/rules/view';
import { make, ok } from './helpers';

describe('P projection privacy', () => {
  const s = setup({ playerCount: 4, seed: 'privacy', config: { ...DEFAULT_CONFIG, magpie: true } });

  it('P1 a player sees their own hand in order and only counts for others', () => {
    for (let seat = 0; seat < 4; seat++) {
      const v = project(s, seat);
      expect(v.you).toBe(seat);
      expect(v.players[seat].hand!.map((c) => c.id)).toEqual(s.players[seat].hand);
      v.players.forEach((p, i) => {
        if (i !== seat) expect(p.hand).toBeUndefined();
        expect(p.handCount).toBe(5);
      });
    }
  });

  it('P2 no hidden card id or deck order appears anywhere in another player’s view', () => {
    for (let seat = 0; seat < 4; seat++) {
      const json = JSON.stringify(project(s, seat));
      const hidden = [...s.deck, ...s.players.flatMap((p, i) => (i === seat ? [] : p.hand))];
      for (const id of hidden) expect(json).not.toContain(`"${id}"`);
      expect(json).not.toContain('rng');
      expect(json).not.toContain('"cards"');
    }
  });

  it('P3 spectators (no seat) see no hand and get no hints', () => {
    const v = project(s, null);
    expect(v.you).toBeNull();
    expect(v.hints).toBeNull();
    expect(v.players.every((p) => p.hand === undefined)).toBe(true);
    const json = JSON.stringify(v);
    for (const id of [...s.deck, ...s.players.flatMap((p) => p.hand)]) expect(json).not.toContain(`"${id}"`);
  });

  it('P4 face-up, field, discard-top and offered cards are public', () => {
    let t = s;
    const a = t.active;
    t = ok(t, a, { type: 'plant', field: 0 });
    t = ok(t, a, { type: 'flip' });
    const other = (a + 1) % 4;
    const v = project(t, other);
    expect(v.faceUp.map((c) => c.id)).toEqual(t.faceUp);
    expect(v.players[a].fields[0]).toHaveLength(1);
  });

  it('P5 hints describe only the viewer’s legal moves', () => {
    const v = project(s, s.active);
    const front = s.cards[s.players[s.active].hand[0]];
    if (front === 'magpie') expect(v.hints!.frontIsMagpie).toBe(true);
    else expect(v.hints!.plantFront).toEqual([0, 1]);
    expect(v.hints!.canFlip).toBe(false);
    const w = project(s, (s.active + 1) % 4);
    expect(w.hints!.plantFront).toEqual([]);
  });

  it('P6 a resisted Bean Coin claim reveals only the drawn card', () => {
    let t = make({
      config: { beanCoin: true },
      coinOwner: 2,
      hands: [[], [], ['green', 'chili', 'soy'], []],
      fields: [[Array(10).fill('blue'), ['red', 'red']], [[], []], [[], []], [[], []]],
    });
    t = ok(t, 0, { type: 'claimCoin' });
    t = ok(t, 2, { type: 'coinRespond', resist: true });
    const revealed = t.coin!.mustPlant!;
    const json = JSON.stringify(project(t, 1));
    expect(json).toContain(`"${revealed}"`);
    for (const id of t.players[2].hand) expect(json).not.toContain(`"${id}"`);
  });
});
