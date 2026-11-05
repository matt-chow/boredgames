/** Edition 4's bots (CC-BOT, docs/CLOCKWORK.md): what they weigh, and that they only read a player's view. */
import { describe, expect, it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../../src/engine/deckbuilder';
import { BALANCED, botMove, PROFILES, publicRenown, roundsLeft } from '../../src/games/clockwork/rules/bot';
import { game, Table } from './helpers';

const view = (t: Table, seat = t.s.turn.seat) => game.project(t.s, seat) as DeckView;
const first = (v: DeckView, profile = BALANCED) => botMove(v, profile, 0)!.actions[0] as DeckAction;
const market = (t: Table, coins: number, spark = 0) => {
  t.s.turn.phase = 'buy';
  t.s.turn.coins = coins;
  t.s.turn.buys = 1;
  t.s.players[t.s.turn.seat].tokens.spark = spark;
};
/** Funded by nobody except what's named; `open` stages of one Project stay unfunded. */
const fundAllBut = (s: DeckState, open: number, by: number) => {
  const stages = s.projects.flatMap((p) => p.stages!.map((x) => ({ p, x })));
  stages.slice(0, stages.length - open).forEach(({ x }) => { x.by = by; x.onTurn = 0; });
  for (const p of s.projects) if (p.stages!.every((x) => x.by !== null)) { p.by = by; p.onTurn = 0; }
};

describe('CC-BOT: edition 4 bots', () => {
  it('CC-BOT-1: the rounds estimate falls as the end conditions approach, and is zero in the final round', () => {
    const t = new Table([], { players: 4 });
    const start = roundsLeft(view(t));
    expect(start).toBeGreaterThan(5);
    t.s.supply.monument = t.s.supply.monument.slice(0, 1);
    expect(roundsLeft(view(t))).toBeLessThan(1);
    t.s.finalRound = { by: 0, turns: 1 };
    expect(roundsLeft(view(t))).toBe(0);
  });

  it('CC-BOT-2: public Renown counts stages and shown gains, and only your own total is exact', () => {
    const t = new Table([], { players: 3 });
    const me = t.s.turn.seat;
    const other = (me + 1) % 3;
    t.s.projects[0].stages![0].by = other;
    t.s.log.push({ n: 9000, seat: other, kind: 'gain', keys: ['monument'] });
    t.s.log.push({ n: 9001, seat: other, kind: 'gain', keys: ['monument'], to: other });
    const scores = publicRenown(view(t, me));
    expect(scores[other]).toBe(3 + t.s.projects[0].stages![0].vp + 6);
    expect(scores[me]).toBe(view(t, me).score!.total);
  });

  it('CC-BOT-3: takes the last stage when it would win, and refuses it when clearly losing', () => {
    const winning = new Table([], { players: 2 });
    const me = winning.s.turn.seat;
    fundAllBut(winning.s, 1, me);
    const last = winning.s.projects.find((p) => p.by === null)!;
    market(winning, last.stages!.at(-1)!.coins, last.stages!.at(-1)!.tokens.spark ?? 0);
    expect(first(view(winning))).toEqual({ type: 'claim', project: last.key });

    const losing = new Table([], { players: 2 });
    const seat = losing.s.turn.seat;
    fundAllBut(losing.s, 1, 1 - seat);
    const open = losing.s.projects.find((p) => p.by === null)!;
    market(losing, open.stages!.at(-1)!.coins, open.stages!.at(-1)!.tokens.spark ?? 0);
    expect(first(view(losing))).not.toEqual({ type: 'claim', project: open.key });
  });

  it('CC-BOT-3: takes the last Grand Duchy only when it wins', () => {
    const winning = new Table([], { players: 2 });
    const me = winning.s.turn.seat;
    winning.s.supply.monument = winning.s.supply.monument.slice(0, 1);
    market(winning, 8);
    winning.s.projects[0].stages![0].by = me;
    // Seat order decides who is owed a turn: the opening seat's rival still plays, so build a real lead.
    winning.s.projects[1].stages![0].by = me;
    expect(first(view(winning))).toEqual({ type: 'buy', pile: 'monument' });

    const losing = new Table([], { players: 2 });
    const seat = losing.s.turn.seat;
    losing.s.supply.monument = losing.s.supply.monument.slice(0, 1);
    market(losing, 8);
    losing.s.projects.flatMap((p) => p.stages!).forEach((x) => { x.by = 1 - seat; });
    expect(first(view(losing))).not.toEqual({ type: 'buy', pile: 'monument' });
  });

  it('CC-BOT-4: funds a stage worth more than the best buy, and skips one that is not', () => {
    const t = new Table([], { players: 2 });
    const p = t.s.projects.find((x) => x.stages!.length === 1)!;
    const stage = p.stages![0];
    stage.vp = 9;
    stage.coins = 3;
    stage.tokens = {};
    market(t, 3);
    expect(first(view(t))).toEqual({ type: 'claim', project: p.key });

    const u = new Table([], { players: 2 });
    u.s.projects.forEach((x) => { x.stages![0].vp = 1; x.stages![0].coins = 1; x.stages![0].tokens = {}; });
    market(u, 6);
    expect(first(view(u))).toEqual({ type: 'buy', pile: 'dynamo' });
  });

  it('CC-BOT-5: buys Currency early and Renown when the game is nearly over', () => {
    const t = new Table([], { players: 4 });
    market(t, 6);
    t.s.projects.forEach((x) => x.stages!.forEach((y) => { y.by = null; y.coins = 99; }));
    expect(first(view(t))).toEqual({ type: 'buy', pile: 'dynamo' });
    t.s.supply.monument = t.s.supply.monument.slice(0, 4);
    expect(first(view(t))).toEqual({ type: 'buy', pile: 'blueprint' });
  });

  it('CC-BOT-6: every profile on its last turn takes the most Renown it can, and never Currency', () => {
    for (const profile of PROFILES) {
      const t = new Table([], { players: 2 });
      t.s.finalRound = { by: 1 - t.s.turn.seat, turns: 1 };
      t.s.projects.forEach((x) => x.stages!.forEach((y) => { y.coins = 99; }));
      market(t, 5);
      expect(first(view(t), profile)).toEqual({ type: 'buy', pile: 'blueprint' });
    }
  });

  it('CC-BOT-7: an opponent’s hidden cards change nothing: only the view is read', () => {
    const t = new Table([], { players: 3 });
    const me = t.s.turn.seat;
    const other = (me + 1) % 3;
    market(t, 5, 2);
    const before = botMove(view(t, me), BALANCED, 0);
    const p = t.s.players[other];
    [p.hand, p.deck] = [p.deck, p.hand];
    p.deck.reverse();
    expect(botMove(view(t, me), BALANCED, 0)).toEqual(before);
    const seen = view(t, me).players[other] as unknown as Record<string, unknown>;
    expect(seen.hand).toBeUndefined();
    expect(seen.deck).toBeUndefined();
    expect(seen.vp).toBeUndefined();
  });

  it('CC-BOT-8: every profile finishes a game with legal moves, on equal turns', () => {
    PROFILES.forEach((profile, i) => {
      let s = game.setup({ playerCount: 2 + (i % 5), seed: `bots-${i}`, config: { market: [], bans: [], projects: [], sets: ['core', 'crown'] } });
      for (let step = 0; step < 30_000 && !s.over; step++) {
        const [seat] = game.actors(s);
        const move = botMove(game.project(s, seat) as DeckView, profile, 0)!;
        const r = (move.actions as DeckAction[]).map((a) => game.apply(s, seat, a)).find((x) => x.ok);
        if (!r || !r.ok) throw new Error(`${profile.name} is stuck`);
        s = r.state;
      }
      expect(s.over).toBe(true);
      expect(new Set(s.players.map((p) => p.turns)).size).toBe(1);
    });
  }, 120_000);

  it('CC-BOT-9: a bot keeps enough money to play on, buys Bronze when it has none, and a Thinning table finishes', () => {
    const t = new Table([], { players: 2 });
    const v = view(t);
    const hand = [{ id: 1, key: 'scrap' }, { id: 2, key: 'scrap' }, { id: 3, key: 'rust' }] as DeckView['hand'];
    const q = { id: 9, seat: v.you, kind: 'cards', prompt: 'You may trash up to 3 cards.', min: 0, max: 3, cards: hand } as DeckView['pending'];
    const decide = (owned: Record<string, number>) => botMove({ ...v, owned, pending: q }, BALANCED, 0)!.actions[0] as { cards: number[] };
    expect(decide({ scrap: 6, rust: 1 }).cards).toEqual([3]);
    expect(decide({ scrap: 8, rust: 1 }).cards).toEqual([3, 1, 2]);
    t.s.turn.phase = 'buy';
    t.s.turn.coins = 0;
    t.s.turn.buys = 1;
    const broke = { ...view(t), hand: [], owned: { burden_relief: 3 } };
    expect(botMove(broke, BALANCED, 0)!.actions[0]).toEqual({ type: 'buy', pile: 'scrap' });
    expect((botMove({ ...broke, owned: { scrap: 7 } }, BALANCED, 0)!.actions[0] as DeckAction).type).toBe('end-phase');
    const thinning = PROFILES.find((p) => p.name === 'Thinning')!;
    let s = game.setup({ playerCount: 2, seed: 'st-2-crown-2', config: { market: [], bans: [], projects: [], sets: ['core', 'crown'] } }) as DeckState;
    for (let step = 0; step < 8000 && !s.over; step++) {
      const [seat] = game.actors(s);
      const r = ((botMove(game.project(s, seat) as DeckView, thinning, 0)!.actions) as DeckAction[]).map((a) => game.apply(s, seat, a)).find((x) => x.ok);
      s = (r as { state: DeckState }).state;
    }
    expect(s.over).toBe(true);
  });
});
