import { describe, expect, it } from 'vitest';
import { botMove } from '../../src/games/bohnanza/rules/bot';
import { DEFAULT_CONFIG, type BohnanzaConfig } from '../../src/games/bohnanza/rules/config';
import { actors, apply, setup } from '../../src/games/bohnanza/rules/engine';
import type { BAction, BState } from '../../src/games/bohnanza/rules/state';
import { project } from '../../src/games/bohnanza/rules/view';
import { assertConservation } from './helpers';

/**
 * The in-game computer player (src/games/bohnanza/rules/bot.ts). Unlike the
 * random test bot in ./bot.ts, it decides from its own projection only, the
 * way the server runs it.
 */
const cfg = (c: Partial<BohnanzaConfig>): BohnanzaConfig => ({ ...DEFAULT_CONFIG, ...c });

/** Play the soonest bot move the way RoomCore.playBot does. Null when no bot could move. */
function step(s: BState): BState | null {
  const moves = actors(s)
    .map((seat) => ({ seat, move: botMove(project(s, seat)) }))
    .filter((m) => m.move?.actions.length)
    .sort((a, b) => a.move!.delayMs - b.move!.delayMs);
  const next = moves[0];
  for (const a of next?.move!.actions ?? []) {
    const r = apply(s, next.seat, a);
    if (r.ok) return r.state;
  }
  return null;
}

function playOut(seed: string, n: number, config: BohnanzaConfig) {
  let s = setup({ playerCount: n, seed, config });
  let steps = 0;
  while (s.phase !== 'over') {
    const next = step(s);
    if (!next) throw new Error(`${seed}: no bot could move in ${s.phase} (actors ${actors(s)})`);
    assertConservation(next);
    s = next;
    if (++steps > 5000) throw new Error(`${seed}: no termination`);
  }
  return { s, steps };
}

const MATRIX: [string, number, Partial<BohnanzaConfig>][] = [
  ['base-3', 3, {}],
  ['base-5', 5, {}],
  ['magpie-4', 4, { magpie: true }],
  ['coin-3', 3, { beanCoin: true }],
  ['coin-5', 5, { beanCoin: true }],
  ['v1-4-magpie', 4, { threeNewBeans: true, magpie: true }],
  ['v2-5', 5, { fieldBean: true }],
];

describe('B1 bots play complete games from their own view', () => {
  for (const [name, n, c] of MATRIX)
    for (const seed of ['alpha', 'bravo', 'charlie'])
      it(`B1 ${name} seed=${seed}`, () => {
        const { s, steps } = playOut(`${name}:${seed}`, n, cfg(c));
        expect(s.result).toHaveLength(n);
        expect(s.result!.filter((r) => r.winner)).toHaveLength(1);
        // Sanity floor: bots that plant and harvest sensibly score over a whole game.
        expect(s.result!.reduce((t, r) => t + r.score, 0)).toBeGreaterThan(n);
        expect(steps).toBeGreaterThan(50);
      });
});

describe('B2 bots answer offers', () => {
  /** A 3-player game in the trade phase with seat 1 (a bot) receiving an offer. */
  function trading(): BState {
    let s = setup({ playerCount: 3, seed: 'offers', config: cfg({}) });
    s = structuredClone(s);
    s.active = 0;
    // Plant seat 0's front card, then turn over.
    const plant = apply(s, 0, { type: 'plant', field: 0 });
    if (!plant.ok) throw new Error(plant.error);
    const flip = apply(plant.state, 0, { type: 'flip' });
    if (!flip.ok) throw new Error(flip.error);
    return flip.state;
  }
  const offer = (s: BState, a: Extract<BAction, { type: 'offer' }>) => {
    const r = apply(s, 0, a);
    if (!r.ok) throw new Error(r.error);
    return r.state;
  };

  it('B2.1 accepts a donation that fits its fields', () => {
    let s = trading();
    s = offer(s, { type: 'offer', to: 1, give: [s.faceUp[0]], wantCards: [], wantTypes: {} });
    const m = botMove(project(s, 1))!;
    expect(m.actions[0]).toMatchObject({ type: 'accept', cards: [] });
    expect(apply(s, 1, m.actions[0]).ok).toBe(true);
  });

  it('B2.2 declines an offer that asks for more cards than it brings', () => {
    let s = trading();
    const hand = s.players[1].hand.map((id) => s.cards[id]);
    s = offer(s, { type: 'offer', to: 1, give: [s.faceUp[0]], wantCards: [], wantTypes: { [hand[0]]: 1, [hand[1]]: hand[0] === hand[1] ? 2 : 1 } });
    expect(botMove(project(s, 1))!.actions[0]).toMatchObject({ type: 'reject' });
  });

  it('B2.3 pays a fair trade from the back of its hand, never the front card', () => {
    let s = trading();
    const hand = s.players[1].hand;
    const want = s.cards[hand[hand.length - 1]];
    s = offer(s, { type: 'offer', to: 1, give: [s.faceUp[0]], wantCards: [], wantTypes: { [want]: 1 } });
    const a = botMove(project(s, 1))!.actions[0];
    if (a.type === 'accept') {
      expect(a.cards).toEqual([hand[hand.length - 1]]);
      expect(apply(s, 1, a).ok).toBe(true);
    } else expect(a.type).toBe('reject'); // only when the offered bean would not fit its fields
  });

  it('B2.4 a bot that is not involved does nothing during trading', () => {
    const s = trading();
    expect(botMove(project(s, 2))).toBeNull();
  });
});
