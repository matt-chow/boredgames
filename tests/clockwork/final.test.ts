/** Edition 4: the final Crown Project rules (CC-F2) and the finished round at the end of a game (CC-FINAL). See docs/CLOCKWORK.md. */
import { describe, expect, it } from 'vitest';
import { createDeckGame, type DeckState, type DeckView } from '../../src/engine/deckbuilder';
import { RULES, RULES_V3 } from '../../src/games/clockwork/rules/ruleset';
import { ALL_SETS, game, Table } from './helpers';

const start = (players: number, seed = 'f2') => game.setup({ playerCount: players, seed, config: { market: [], bans: [], sets: ALL_SETS, projects: [] } });
const sizes = (s: DeckState) => s.projects.map((p) => p.stages!.length).sort();
const defOf = (key: string) => RULES.projects!.find((p) => p.key === key)!;

/** Pass the current turn: straight through both phases. */
function pass(t: Table) {
  const seat = t.s.turn.seat;
  const before = t.s.turn.number;
  t.apply(seat, { type: 'end-phase' });
  if (!t.s.over && t.s.turn.number === before) t.apply(seat, { type: 'end-phase' });
}
/** Mark every stage of a Project as funded, leaving the next `open` stages. */
function finish(s: DeckState, key: string, seat: number, open = 0) {
  const p = s.projects.find((x) => x.key === key)!;
  const stages = p.stages!;
  stages.slice(0, stages.length - open).forEach((x) => { x.by = seat; x.onTurn = 0; });
  if (!open) { p.by = seat; p.onTurn = 0; }
}
function fundable(t: Table, key: string) {
  const p = t.s.projects.find((x) => x.key === key)!;
  const next = p.stages!.find((x) => x.by === null)!;
  t.s.turn.phase = 'buy';
  t.s.turn.coins = next.coins;
  for (const [token, n] of Object.entries(next.tokens)) t.s.players[t.s.turn.seat].tokens[token] = n;
}
const turns = (s: DeckState) => s.players.map((p) => p.turns);

describe('CC-F2: the final Crown Project rules', () => {
  it('CC-F2-1: new games use edition 4 at every player count, with five Projects of 1, 2, 2, 3 and 3 stages', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      for (const seed of ['a', 'b', 'c']) {
        const s = start(n, seed);
        expect(s.rulesVersion).toBe(4);
        expect(s.projects).toHaveLength(5);
        expect(sizes(s)).toEqual([1, 2, 2, 3, 3]);
      }
    }
  });

  it('CC-F2-2: stage prices add up to the original price, plus one Coin only when there is more than one stage', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      for (const p of start(4, seed).projects) {
        const d = defOf(p.key);
        const coins = p.stages!.reduce((a, x) => a + x.coins, 0);
        expect(coins).toBe(d.coins + (p.stages!.length > 1 ? 1 : 0));
        expect(p.stages!.reduce((a, x) => a + x.vp, 0)).toBe(d.vp);
        for (const token of Object.keys(d.tokens)) expect(p.stages!.reduce((a, x) => a + (x.tokens[token] ?? 0), 0)).toBe(d.tokens[token]);
      }
    }
  });

  it('CC-F2-3: each contributor keeps the Renown of their own stages, and only the Project completes on its last stage', () => {
    const t = new Table([], { players: 2 });
    const key = t.s.projects.find((p) => p.stages!.length === 3)!.key;
    const stages = () => t.s.projects.find((p) => p.key === key)!.stages!;
    const first = t.s.turn.seat;
    const second = 1 - first;
    for (const [i, seat] of [first, second, first].entries()) {
      fundable(t, key);
      t.apply(seat, { type: 'claim', project: key });
      expect(stages()[i].by).toBe(seat);
      expect(t.s.projects.find((p) => p.key === key)!.by).toBe(i === 2 ? seat : null);
      pass(t);
    }
    const worth = (seat: number) => game.project(t.s, seat).score!.projects;
    expect(worth(first)).toBe(stages()[0].vp + stages()[2].vp);
    expect(worth(second)).toBe(stages()[1].vp);
  });

  it('CC-F2-4: all five must be complete; four do not trigger the end', () => {
    const t = new Table([], { players: 2 });
    t.s.projects.slice(0, 4).forEach((p) => finish(t.s, p.key, t.me));
    pass(t);
    expect(t.s.finalRound).toBeUndefined();
    expect(t.s.over).toBe(false);
    expect((game.project(t.s, 0) as DeckView).projectsEnd).toBe(5);
  });

  it('CC-F2-5: rooms keep the edition they started on, and edition 3 still ends at the fourth whole Project', () => {
    const old = createDeckGame(RULES_V3).setup({ playerCount: 2, seed: 'old', config: { market: [], bans: [], sets: ALL_SETS, projects: [] } });
    expect(old.rulesVersion).toBe(3);
    expect(old.projects[0].stages).toBeUndefined();
    const view = game.project(old, 0) as DeckView;
    expect(view.projectsEnd).toBe(4);
    old.projects.slice(0, 4).forEach((p) => { p.by = 0; p.onTurn = 0; });
    const seat = old.turn.seat;
    const a = game.apply(old, seat, { type: 'end-phase' });
    if (!a.ok) throw new Error(a.error);
    const b = game.apply(a.state, seat, { type: 'end-phase' });
    if (!b.ok) throw new Error(b.error);
    expect(b.state.over).toBe(true);
    expect(b.state.finalRound).toBeUndefined();
    expect(game.migrate!(old, 3).projects).toEqual(old.projects);
  });
});

describe('CC-FINAL: finishing the round', () => {
  /** Empty the Grand Duchy pile, Projects or market piles: the three ways a game ends. */
  const triggers: [string, (s: DeckState) => void][] = [
    ['all five Crown Projects', (s) => s.projects.forEach((p) => finish(s, p.key, s.turn.seat))],
    ['the Grand Duchy pile', (s) => { s.supply.monument = []; }],
    ['empty market piles', (s) => s.market.slice(0, 4).forEach((k) => { s.supply[k] = []; })],
  ];

  for (const [name, trigger] of triggers) {
    for (const players of [2, 3, 4, 6]) {
      it(`CC-FINAL-1: ${name} at ${players} players: every later seat plays once more, then the game ends with equal turns`, () => {
        const t = new Table([], { players });
        for (let i = 0; i < players; i++) pass(t); // a full round, then the next opening seat triggers
        const triggerer = t.s.turn.seat;
        trigger(t.s);
        pass(t);
        for (let left = players - 1; left > 0; left--) {
          expect(t.s.over).toBe(false);
          expect(t.s.finalRound).toEqual({ by: triggerer, turns: 2 });
          expect((game.project(t.s, 0) as DeckView).finalRound!.turnsLeft).toBe(left);
          pass(t);
        }
        expect(t.s.over).toBe(true);
        expect(turns(t.s)).toEqual(Array(players).fill(2));
      });
    }
  }

  it('CC-FINAL-2: the last seat of a round triggers an immediate end, and the first seat gives everyone one more', () => {
    const last = new Table([], { players: 3 });
    pass(last);
    pass(last);
    last.s.supply.monument = [];
    pass(last);
    expect(last.s.over).toBe(true);
    expect(turns(last.s)).toEqual([1, 1, 1]);

    const firstSeat = new Table([], { players: 3 });
    firstSeat.s.supply.monument = [];
    const seat = firstSeat.s.turn.seat;
    pass(firstSeat);
    expect(firstSeat.s.over).toBe(false);
    expect(firstSeat.s.turn.seat).toBe((seat + 1) % 3);
    pass(firstSeat);
    pass(firstSeat);
    expect(firstSeat.s.over).toBe(true);
  });

  it('CC-FINAL-3: the ending cannot be reversed by a pile refilling or anything after the trigger', () => {
    const t = new Table([], { players: 3 });
    const pile = [...t.s.supply.monument];
    t.s.supply.monument = [];
    pass(t);
    t.s.supply.monument = pile;
    expect(t.s.finalRound).toBeDefined();
    pass(t);
    pass(t);
    expect(t.s.over).toBe(true);
  });

  it('CC-FINAL-4: remaining turns stay ordinary: supply and Projects can still be bought, and Renown counts when the round ends', () => {
    const t = new Table([], { players: 2 });
    t.s.supply.monument = [];
    pass(t);
    const seat = t.s.turn.seat;
    expect(t.s.over).toBe(false);
    t.s.turn.phase = 'buy';
    t.s.turn.coins = 5;
    expect(game.project(t.s, seat).legal.buy).toContain('blueprint');
    expect(game.project(t.s, seat).legal.buy).not.toContain('monument');
    const before = game.project(t.s, seat).score!.total;
    t.apply(seat, { type: 'buy', pile: 'blueprint' });
    t.apply(seat, { type: 'end-phase' });
    expect(t.s.over).toBe(true);
    const final = game.project(t.s, seat).final!.find((f) => f.seat === seat)!;
    expect(final.total).toBe(before + 3);
  });

  it('CC-FINAL-5: extra turns are not taken after the trigger, a player behind on turns catches up, and unused Buys and Actions do not carry', () => {
    const t = new Table([], { players: 3 });
    const a = t.s.turn.seat;
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    t.s.players[a].turns = 5;
    t.s.players[b].turns = 4;
    t.s.players[c].turns = 3;
    t.s.turn.seat = b;
    t.s.extraTurns = [b];
    t.s.turn.buys = 4;
    t.s.turn.actions = 4;
    t.s.supply.monument = [];
    pass(t);
    expect(t.s.extraTurns).toEqual([]);
    expect(t.s.turn.buys).toBe(1);
    expect(t.s.turn.actions).toBe(1);
    expect(turns(t.s)[b]).toBe(5);
    for (let i = 0; i < 2; i++) pass(t);
    expect(t.s.over).toBe(true);
    expect(new Set(turns(t.s))).toEqual(new Set([5]));
  });

  it('CC-FINAL-6: equal Renown is a shared win, since every player has had the same turns', () => {
    const t = new Table([], { players: 2 });
    t.s.supply.monument = [];
    pass(t);
    pass(t);
    const r = game.results!(t.s)!;
    expect(r.map((x) => x.rank)).toEqual([1, 1]);
    expect(r.every((x) => x.winner)).toBe(true);
  });

  it('CC-FINAL-7: the final round is public and says nothing about hidden cards', () => {
    const t = new Table([], { players: 3 });
    t.s.supply.monument = [];
    const by = t.s.turn.seat;
    pass(t);
    for (const viewer of [0, 1, 2, null]) {
      const v = game.project(t.s, viewer) as DeckView;
      expect(v.finalRound).toEqual({ by, turnsLeft: 2 });
      expect(v.log.some((e) => e.kind === 'final-round' && !e.keys)).toBe(true);
    }
  });

  it('CC-FINAL-8: a saved game survives a round trip through JSON in the final round', () => {
    const t = new Table([], { players: 3 });
    t.s.supply.monument = [];
    pass(t);
    t.s = JSON.parse(JSON.stringify(game.migrate!(t.s, 4)));
    pass(t);
    pass(t);
    expect(t.s.over).toBe(true);
  });
});
