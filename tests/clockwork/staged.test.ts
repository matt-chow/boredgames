/** Trial Crown Project rules (CC-STAGE-*, docs/CLOCKWORK.md). Rooms on earlier rules stay as they were: see CC-STAGE-LIVE. */
import { describe, expect, it } from 'vitest';
import { assignStages, splitProject, type DeckState, type DeckView, type ProjectState } from '../../src/engine/deckbuilder';
import { EDITIONS, STAGE_NAMES } from '../../src/games/clockwork/rules/editions';
import { botMove, PROFILES } from '../../src/games/clockwork/rules/bot';
import { RULES } from '../../src/games/clockwork/rules/ruleset';
import { MemoryStore, RoomCore } from '../../src/server/core';
import { ALL_SETS, game, MARKET, Table, WORKS } from './helpers';

const edition = (code: string) => EDITIONS.find((r) => r.edition!.code === code)!;
const total = (p: ProjectState) => p.stages!.length;
const expected: Record<number, number[]> = { 2: [3, 2, 0], 3: [2, 2, 1], 4: [1, 2, 2], 5: [0, 3, 2], 6: [0, 2, 3] };
const investments: Record<number, number> = { 2: 7, 3: 9, 4: 11, 5: 12, 6: 13 };

const start = (code: string, players = 2, seed = 'staged', projects = WORKS) =>
  game.setup({ playerCount: players, seed, config: { market: MARKET, bans: [], sets: ALL_SETS, projects, edition: code } }) as DeckState;

/** A table in the Market phase where every listed Project has these stage counts, with plenty to spend. */
function site(sizes: Record<string, number>, code = 'S1', players = 2) {
  const t = new Table([], { players, edition: code, works: ['city_illumination', 'public_clock', 'canal_lights', 'makers_fair', 'skybridge'] });
  const rules = edition(code);
  for (const p of t.s.projects) {
    const def = rules.projects!.find((x) => x.key === p.key)!;
    p.stages = splitProject(def, sizes[p.key] ?? 1, rules.staged?.extraCoins ?? 0, STAGE_NAMES[p.key]);
  }
  t.s.turn.phase = 'buy';
  flush(t);
  return t;
}
function flush(t: Table, coins = 40, buys = 4, spark = 8) {
  t.s.turn.coins = coins;
  t.s.turn.buys = buys;
  t.s.turn.phase = 'buy';
  t.setSpark(spark, t.s.turn.seat);
}
const here = (t: Table, key: string) => t.s.projects.find((p) => p.key === key)!;
const fund = (t: Table, key: string) => t.apply(t.s.turn.seat, { type: 'claim', project: key });
/** End this turn and get the next player ready to spend. */
function pass(t: Table) {
  t.apply(t.s.turn.seat, { type: 'end-phase' });
  flush(t);
  return t.s.turn.seat;
}

describe('CC-STAGE counts', () => {
  it.each([2, 3, 4, 5, 6])('CC-STAGE-1: S1 and S2 at %i players have the agreed stages and 5 Projects', (n) => {
    for (const code of ['S1', 'S2']) {
      const s = start(code, n);
      expect(s.projects).toHaveLength(5);
      expect(new Set(s.projects.map((p) => p.key)).size).toBe(5);
      const sizes = s.projects.map(total);
      expect([1, 2, 3].map((k) => sizes.filter((x) => x === k).length)).toEqual(expected[n]);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(investments[n]);
    }
  });

  it.each([2, 3, 4, 5, 6])('CC-STAGE-1: F1 and F2 at %i players are always 1/2/2/3/3', (n) => {
    for (const code of ['F1', 'F2']) expect(start(code, n).projects.map(total).sort()).toEqual([1, 2, 2, 3, 3]);
  });

  it('CC-STAGE-2: the assignment repeats for a seed and depends on nothing but the seed', () => {
    const a = assignStages(edition('S1'), 'seed-a', WORKS, 4);
    expect([...assignStages(edition('S1'), 'seed-a', WORKS, 4)]).toEqual([...a]);
    expect([...assignStages(edition('S2'), 'seed-a', WORKS, 4)]).toEqual([...a]);
    const seen = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify([...assignStages(edition('S1'), `s${i}`, WORKS, 4)])));
    expect(seen.size).toBeGreaterThan(10);
  });

  it('CC-STAGE-2: stage counts favour neither cheap nor dear Projects', () => {
    const keys = ['canal_lights', 'public_clock', 'tram_extension', 'waterwheel', 'city_illumination'];
    const three: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) for (const [k, n] of assignStages(edition('S1'), `f${i}`, keys, 4)) if (n === 3) three[k] = (three[k] ?? 0) + 1;
    // Two of five: 800 of 2000, and a few standard deviations (about 22) around that.
    for (const k of keys) expect(Math.abs(three[k] - 800)).toBeLessThan(90);
  });

  it('CC-STAGE-2: market, deal and Project choice match across the editions on one seed', () => {
    const open = (code: string) =>
      game.setup({ playerCount: 4, seed: 'pair', config: { market: [], bans: [], projects: [], sets: ['core', 'crown'], edition: code } }) as DeckState;
    const base = open('C0');
    for (const code of ['C1', 'F1', 'F2', 'S1', 'S2']) {
      const s = open(code);
      expect(s.market).toEqual(base.market);
      expect(s.projects.map((p) => p.key)).toEqual(base.projects.map((p) => p.key));
      expect(s.players.map((p) => p.hand)).toEqual(base.players.map((p) => p.hand));
      expect(s.turn.seat).toBe(base.turn.seat);
    }
  });
});

describe('CC-STAGE costs', () => {
  const influence = (x: { tokens: Record<string, number> }) => x.tokens.spark ?? 0;

  it.each(RULES.projects!.map((p) => [p.key, p] as const))('CC-STAGE-3: %s divides into whole, non-zero stages with the same totals', (_, def) => {
    for (const n of [1, 2, 3]) {
      const stages = splitProject(def, n, 0, STAGE_NAMES[def.key]);
      expect(stages).toHaveLength(n);
      expect(stages.reduce((a, x) => a + x.coins, 0)).toBe(def.coins);
      expect(stages.reduce((a, x) => a + influence(x), 0)).toBe(def.tokens.spark);
      expect(stages.reduce((a, x) => a + x.vp, 0)).toBe(def.vp);
      for (const x of stages) {
        expect(Number.isInteger(x.coins) && Number.isInteger(influence(x))).toBe(true);
        expect(x.vp).toBeGreaterThanOrEqual(1);
        expect(x.coins + influence(x)).toBeGreaterThanOrEqual(1);
        // The total price of a stage stays in step with what it pays.
        expect(x.vp).toBeLessThanOrEqual(x.coins + influence(x) + 1);
        expect(x.name).toBeTruthy();
      }
    }
  });

  it('CC-STAGE-3: City Walls in three stages', () => {
    const def = RULES.projects!.find((p) => p.key === 'city_illumination')!;
    expect(splitProject(def, 3, 0, STAGE_NAMES[def.key]).map((x) => [x.name, x.coins, influence(x), x.vp])).toEqual([
      ['Foundations', 3, 1, 4],
      ['Masonry', 3, 2, 4],
      ['Fortification', 2, 2, 5],
    ]);
    expect(splitProject(def, 2, 0, STAGE_NAMES[def.key]).map((x) => x.name)).toEqual(['Foundations', 'Fortification']);
  });

  it('CC-STAGE-4: S2 and F2 add 1 Coin to a multi-stage total, not per stage, and leave a one-stage Project alone', () => {
    for (const code of ['S2', 'F2']) {
      const rules = edition(code);
      expect(rules.staged!.extraCoins).toBe(1);
      for (const def of rules.projects!) {
        expect(splitProject(def, 1, 1, STAGE_NAMES[def.key])[0].coins).toBe(def.coins);
        for (const n of [2, 3]) {
          const stages = splitProject(def, n, 1, STAGE_NAMES[def.key]);
          expect(stages.reduce((a, x) => a + x.coins, 0)).toBe(def.coins + 1);
          expect(stages.reduce((a, x) => a + x.vp, 0)).toBe(def.vp);
        }
      }
    }
    expect(edition('S1').staged!.extraCoins).toBe(0);
  });

  it('CC-STAGE-4: C1 adds a Coin to each Project and no card changes', () => {
    const c1 = edition('C1');
    for (const def of c1.projects!) expect(def.coins).toBe(RULES.projects!.find((p) => p.key === def.key)!.coins + 1);
    expect(c1.cards).toBe(RULES.cards);
  });

  it('CC-STAGE-4: costs are stored in the game, and every edition keeps every card', () => {
    const t = site({ city_illumination: 3 });
    expect(JSON.parse(JSON.stringify(t.s)).projects[0].stages[0]).toMatchObject({ name: 'Foundations', coins: 3, by: null });
    for (const r of EDITIONS) expect(r.cards).toBe(RULES.cards);
  });
});

describe('CC-STAGE contributions', () => {
  it('CC-STAGE-5: a contribution uses one Buy, pays that stage and earns that stage’s Renown', () => {
    const t = site({ city_illumination: 3 });
    const me = t.s.turn.seat;
    fund(t, 'city_illumination');
    expect(t.coins).toBe(37);
    expect(t.buys).toBe(3);
    expect(t.spark(me)).toBe(7);
    expect(here(t, 'city_illumination').stages![0].by).toBe(me);
    expect(here(t, 'city_illumination').by).toBeNull();
    expect(t.view(me).score!.projects).toBe(4);
    expect(t.view(me).log.at(-1)).toMatchObject({ kind: 'fund', project: 'city_illumination', stage: [1, 3] });
  });

  it('CC-STAGE-5: only an affordable stage is legal, in Coins and in Influence', () => {
    const t = site({ city_illumination: 3 });
    flush(t, 2);
    expect(t.view().legal.claim).not.toContain('city_illumination');
    expect(t.refused(t.s.turn.seat, { type: 'claim', project: 'city_illumination' })).toBe('illegal-claim');
    flush(t, 3, 4, 0);
    expect(t.view().legal.claim).not.toContain('city_illumination');
    flush(t, 3, 4, 1);
    expect(t.view().legal.claim).toContain('city_illumination');
    flush(t, 3, 0, 1);
    expect(t.view().legal.claim).toEqual([]);
  });

  it('CC-STAGE-5: at most one stage of a Project a turn, but several Projects, as far as Buys go', () => {
    const t = site({ city_illumination: 3, public_clock: 2 });
    const me = t.s.turn.seat;
    fund(t, 'city_illumination');
    expect(t.view(me).legal.claim).not.toContain('city_illumination');
    expect(t.refused(me, { type: 'claim', project: 'city_illumination' })).toBe('illegal-claim');
    fund(t, 'public_clock');
    expect(here(t, 'public_clock').stages![0].by).toBe(me);
    flush(t, 40, 0);
    expect(t.refused(me, { type: 'claim', project: 'canal_lights' })).toBe('illegal-claim');
  });

  it('CC-STAGE-5: another player continues the same Project, and each holds their own Renown', () => {
    const t = site({ city_illumination: 3 });
    const a = t.s.turn.seat;
    fund(t, 'city_illumination');
    const b = pass(t);
    expect(b).not.toBe(a);
    expect(t.view(b).projects.find((p) => p.key === 'city_illumination')).toMatchObject({ coins: 3, vp: 4 });
    fund(t, 'city_illumination');
    expect(here(t, 'city_illumination').stages!.map((x) => x.by)).toEqual([a, b, null]);
    expect(t.view(a).score!.projects).toBe(4);
    expect(t.view(b).score!.projects).toBe(4);
    expect(pass(t)).toBe(a);
    fund(t, 'city_illumination');
    expect(here(t, 'city_illumination').by).toBe(a);
    expect(t.view(a).score!.projects).toBe(9);
    expect(t.view(b).score!.projects).toBe(4);
  });

  it('CC-STAGE-5: nobody else can fund the stage, and a move can’t be applied twice', () => {
    const t = site({ city_illumination: 3 });
    const a = t.s.turn.seat;
    const other = (a + 1) % 2;
    expect(t.refused(other, { type: 'claim', project: 'city_illumination' })).toBe('not-your-turn');
    fund(t, 'city_illumination');
    expect(t.refused(other, { type: 'claim', project: 'city_illumination' })).toBe('not-your-turn');
    expect(t.refused(a, { type: 'claim', project: 'city_illumination' })).toBe('illegal-claim');
    expect(here(t, 'city_illumination').stages!.filter((x) => x.by !== null)).toHaveLength(1);
  });

  it('CC-STAGE-5: a one-stage Project is one investment, for the whole price and Renown', () => {
    const t = site({});
    const me = t.s.turn.seat;
    fund(t, 'public_clock');
    expect(here(t, 'public_clock').by).toBe(me);
    expect(t.coins).toBe(36);
    expect(t.spark(me)).toBe(6);
    expect(t.view(me).score!.projects).toBe(5);
    expect(here(t, 'public_clock').stages![0].name).toBe('Bell Tower');
  });

  it('CC-STAGE-6: the reward comes once, to whoever funds the last stage, and Renown is not multiplied', () => {
    const t = site({ public_clock: 2, city_illumination: 3 });
    const a = t.s.turn.seat;
    const hand = t.hand(a).length;
    fund(t, 'public_clock');
    expect(t.hand(a).length).toBe(hand);
    const b = pass(t);
    const theirs = t.hand(b).length;
    fund(t, 'public_clock');
    expect(t.hand(b).length).toBe(theirs + 1);
    expect(here(t, 'public_clock').by).toBe(b);
    expect(t.view(a).score!.projects + t.view(b).score!.projects).toBe(5);
  });

  it('CC-STAGE-6: an unfinished Project still pays its contributors at the end', () => {
    const t = site({ city_illumination: 3 });
    const a = t.s.turn.seat;
    fund(t, 'city_illumination');
    t.s.supply.monument = [];
    t.apply(a, { type: 'end-phase' });
    expect(t.s.over).toBe(true);
    const final = t.view(a).final!;
    expect(final[a].projects).toEqual([{ key: 'city_illumination', vp: 4 }]);
    expect(final[(a + 1) % 2].projects).toEqual([]);
  });
});

describe('CC-STAGE card interactions', () => {
  it('CC-STAGE-7: Builder’s Honour counts every complete Project you funded a stage of', () => {
    const t = site({ public_clock: 2 });
    const a = t.s.turn.seat;
    const b = (a + 1) % 2;
    t.mint(a, 'inventors_medal');
    t.mint(b, 'inventors_medal');
    fund(t, 'public_clock');
    // Not complete yet, so it isn't counted.
    expect(t.view(a).score!.conditional).toBe(6);
    pass(t);
    fund(t, 'public_clock');
    for (const seat of [a, b]) expect(t.view(seat).score!.conditional).toBe(7);
  });

  it('CC-STAGE-7: Civic Charter counts one you helped complete, and Civic Tribute any', () => {
    const t = site({ public_clock: 2 });
    const a = t.s.turn.seat;
    fund(t, 'public_clock');
    t.s.turn.phase = 'action';
    t.s.turn.actions = 1;
    t.s.turn.coins = 0;
    t.mint(a, 'city_charter');
    t.play('city_charter');
    expect(t.coins).toBe(1);
    t.s.projects.find((p) => p.key === 'public_clock')!.stages![1].by = (a + 1) % 2;
    t.s.projects.find((p) => p.key === 'public_clock')!.by = (a + 1) % 2;
    t.s.turn.actions = 1;
    t.mint(a, 'city_charter');
    t.s.turn.coins = 0;
    t.play('city_charter');
    expect(t.coins).toBe(3);
  });

  it('CC-STAGE-8: Royal Dedication waits for a completion, not a stage', () => {
    const t = site({ city_illumination: 2 });
    const me = t.s.turn.seat;
    t.s.turn.phase = 'action';
    t.s.turn.actions = 1;
    t.mint(me, 'ribbon_cutter');
    t.play('ribbon_cutter');
    t.s.turn.phase = 'buy';
    t.setSpark(5, me);
    fund(t, 'city_illumination');
    expect(t.spark(me)).toBe(3);
    expect(t.buys).toBe(3);
    fund(t, 'public_clock');
    expect(t.spark(me)).toBe(3);
    expect(t.buys).toBe(3);
  });

  it('CC-STAGE-8: Cloister Garden pays after a completion only', () => {
    const t = site({ public_clock: 2 });
    const a = t.s.turn.seat;
    fund(t, 'public_clock');
    expect(here(t, 'public_clock').stages![0].onTurn).toBe(t.s.players[a].turns);
    pass(t);
    pass(t);
    t.s.turn.phase = 'action';
    t.s.turn.actions = 1;
    t.mint(a, 'clock_garden');
    t.stack(a, ['scrap', 'scrap', 'scrap']);
    const hand = t.hand(a).length;
    t.play('clock_garden');
    expect(t.hand(a).length).toBe(hand - 1);

    const u = site({ public_clock: 1 });
    const b = u.s.turn.seat;
    fund(u, 'public_clock');
    pass(u);
    pass(u);
    u.s.turn.phase = 'action';
    u.s.turn.actions = 1;
    u.mint(b, 'clock_garden');
    u.stack(b, ['scrap', 'scrap', 'scrap']);
    const theirs = u.hand(b).length;
    u.play('clock_garden');
    expect(u.hand(b).length).toBe(theirs + 1);
  });

  it('CC-STAGE-9: a surcharge and a discount apply to the next stage, per stage, and never go below zero', () => {
    const t = site({ city_illumination: 3 });
    const a = t.s.turn.seat;
    const b = (a + 1) % 2;
    here(t, 'city_illumination').surcharges.push({ by: b, coins: 2 });
    expect(t.view(a).projects.find((p) => p.key === 'city_illumination')!.coins).toBe(5);
    expect(t.view(b).projects.find((p) => p.key === 'city_illumination')!.coins).toBe(3);
    t.s.turn.projectDiscount = { coins: 9, tokens: 0 };
    expect(t.view(a).projects.find((p) => p.key === 'city_illumination')!.coins).toBe(0);
    t.s.turn.projectDiscount = { coins: 0, tokens: 0 };
    fund(t, 'city_illumination');
    // Still in force for the next stage until the player who set it starts a turn.
    expect(here(t, 'city_illumination').surcharges).toHaveLength(1);
    expect(t.coins).toBe(35);
    pass(t);
    expect(here(t, 'city_illumination').surcharges).toHaveLength(0);
  });

  it('CC-STAGE-9: Borough Reeve can name a Project with stages left, and not a complete one', () => {
    const t = site({ city_illumination: 3 });
    fund(t, 'public_clock');
    t.s.turn.phase = 'action';
    t.s.turn.actions = 1;
    t.mint(t.s.turn.seat, 'zoning_board');
    t.play('zoning_board');
    expect(t.q.options).not.toContain('Bell Tower');
    expect(t.q.options).toContain('City Walls');
  });
});

describe('CC-STAGE ending', () => {
  /** Fund every stage of all but `left` Projects. Ends with the last player's turn still open. */
  function build(t: Table, left = 0) {
    const todo = t.s.projects.slice(left).map((p) => p.key);
    while (todo.some((k) => here(t, k).by === null)) {
      for (const k of todo) {
        flush(t);
        if (here(t, k).by === null) fund(t, k);
      }
      if (todo.every((k) => here(t, k).by !== null)) break;
      pass(t);
    }
  }

  it('CC-STAGE-10: all five complete ends the game, four don’t, and a partly built fifth doesn’t count', () => {
    const t = site({ city_illumination: 3, public_clock: 2 }, 'S1');
    build(t, 1);
    expect(t.s.projects.filter((p) => p.by !== null)).toHaveLength(4);
    t.apply(t.s.turn.seat, { type: 'end-phase' });
    expect(t.s.over).toBe(false);

    const u = site({ city_illumination: 3, public_clock: 2 }, 'S1');
    build(u, 1);
    pass(u);
    const fifth = u.s.projects[0];
    if (fifth.stages!.length > 1) {
      fund(u, fifth.key);
      u.apply(u.s.turn.seat, { type: 'end-phase' });
      expect(u.s.over).toBe(false);
    }

    const v = site({ city_illumination: 3, public_clock: 2 }, 'S1');
    build(v);
    expect(v.s.projects.every((p) => p.by !== null)).toBe(true);
    v.apply(v.s.turn.seat, { type: 'end-phase' });
    expect(v.s.over).toBe(true);
  });

  it('CC-STAGE-10: the other endings still apply', () => {
    const duchies = site({ city_illumination: 3 });
    duchies.s.supply.monument = [];
    duchies.apply(duchies.s.turn.seat, { type: 'end-phase' });
    expect(duchies.s.over).toBe(true);
    const piles = site({ city_illumination: 3 });
    for (const k of piles.s.market.slice(0, 3)) piles.s.supply[k] = [];
    piles.apply(piles.s.turn.seat, { type: 'end-phase' });
    expect(piles.s.over).toBe(true);
  });

  it('CC-STAGE-10: C0 and C1 need all five too', () => {
    for (const code of ['C0', 'C1']) {
      const t = new Table([], { edition: code });
      t.s.turn.phase = 'buy';
      for (const [i, p] of t.s.projects.entries()) {
        if (i === 4) break;
        p.by = 0;
        p.onTurn = 0;
      }
      t.apply(t.s.turn.seat, { type: 'end-phase' });
      expect(t.s.over).toBe(false);
    }
  });
});

describe('CC-STAGE saves and rooms', () => {
  function playOut(code: string, players: number, seed: string, each?: (s: DeckState) => void) {
    let s = start(code, players, seed);
    const profiles = Array.from({ length: players }, (_, k) => PROFILES[1 + ((k * 5 + 3) % (PROFILES.length - 1))]);
    for (let step = 0; step < 20000 && !s.over; step++) {
      const seat = game.actors(s)[0];
      const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0)!;
      const r = move.actions.map((a) => game.apply(s, seat, a)).find((x) => x.ok);
      if (!r || !r.ok) throw new Error(`stuck at step ${step}`);
      // Every step goes through JSON, as a saved game would.
      s = JSON.parse(JSON.stringify(r.state));
      each?.(s);
    }
    return s;
  }

  it.each(['C0', 'C1', 'F1', 'F2', 'S1', 'S2'])('CC-STAGE-11: bots finish a %s game, and the same seed plays out the same', (code) => {
    for (const n of [2, 6]) {
      const a = playOut(code, n, `end-${n}`, (s) => {
        // Stages fill from the first, and only a finished Project has an owner.
        for (const p of s.projects) {
          if (!p.stages) continue;
          const by = p.stages.map((x) => x.by);
          expect(by.findIndex((x) => x === null) === -1 || by.slice(by.findIndex((x) => x === null)).every((x) => x === null)).toBe(true);
          expect(p.by !== null).toBe(by.every((x) => x !== null));
        }
      });
      expect(a.over).toBe(true);
      expect(JSON.stringify(playOut(code, n, `end-${n}`))).toBe(JSON.stringify(a));
    }
  }, 60_000);

  it('CC-STAGE-11: a room’s rules come from its saved game, and a save reads back the same', () => {
    const t = site({ city_illumination: 3 }, 'S2');
    fund(t, 'city_illumination');
    const saved = JSON.parse(JSON.stringify(t.s)) as DeckState;
    expect(saved.rulesVersion).toBe(106);
    expect(game.rulesFor(saved.rulesVersion).edition?.code).toBe('S2');
    expect(game.project(saved, t.me)).toEqual(t.view());
    expect(game.migrate!(saved, game.meta.stateVersion)).toEqual(saved);
  });

  it('CC-STAGE-11: contributions are public; a rival’s private score isn’t', () => {
    const t = site({ city_illumination: 3 });
    const a = t.s.turn.seat;
    fund(t, 'city_illumination');
    const rival = t.view((a + 1) % 2);
    expect(rival.projects.find((p) => p.key === 'city_illumination')!.stages![0].by).toBe(a);
    expect(rival.score!.projects).toBe(0);
    const watching = game.project(t.s, null) as DeckView;
    expect(watching.projects.find((p) => p.key === 'city_illumination')!.stages![1]).toMatchObject({ name: 'Masonry', coins: 3, vp: 4 });
    expect(watching.score).toBeNull();
  });

  it('CC-STAGE-LIVE: rooms on edition 3 keep one-claim Projects and four to end, and new games name no trial', () => {
    const t = new Table([], { v3: true });
    expect(t.s.rulesVersion).toBe(3);
    expect(t.s.projects.every((p) => !p.stages)).toBe(true);
    expect(game.rulesFor(3).projectsToEnd!(4)).toBe(4);
    expect(game.rulesFor(3).staged).toBeUndefined();
    expect(game.defaultConfig(2).edition).toBeUndefined();
    expect(t.view().projects[0].stages).toBeUndefined();
    t.s.turn.phase = 'buy';
    for (const p of t.s.projects.slice(0, 4)) {
      p.by = 0;
      p.onTurn = 0;
    }
    t.apply(t.s.turn.seat, { type: 'end-phase' });
    expect(t.s.over).toBe(true);
  });

  it('CC-STAGE-LIVE: a version 2 save opens without any change, and an unknown version is refused', () => {
    const saved = JSON.parse(JSON.stringify(new Table([]).s));
    expect(game.migrate!(saved, 2)).toEqual(saved);
    expect(() => game.migrate!(saved, 99)).toThrow();
  });

  describe('rooms', () => {
    const room = (experiments?: boolean) => {
      const opts = { now: () => 1, seed: () => 'room-seed', experiments };
      const core = RoomCore.create(new MemoryStore(), opts, { code: 'ABCDEF', gameId: 'clockwork', name: 'Ann', th: 't0', bots: 1 });
      return core;
    };
    const everyone = new Set([0]);
    let id = 0;
    const send = (core: RoomCore, msg: Record<string, unknown>) => core.handle(0, { id: `m${++id}`, v: core.version, ...msg }, everyone);

    it('CC-STAGE-12: production refuses a trial and doesn’t offer one', () => {
      const core = room();
      expect(core.view(0, everyone).editions).toBeUndefined();
      expect(send(core, { t: 'config', config: { edition: 'S1' } }).ack!.ok).toBe(false);
      expect(core.view(0, everyone).config.edition).toBeUndefined();
      send(core, { t: 'start' });
      expect((core.view(0, everyone).game as DeckView).rulesVersion).toBe(4);
    });

    it('CC-STAGE-12: with experiments on the host can pick one, go back, and a rematch keeps it', () => {
      const core = room(true);
      expect(core.view(0, everyone).editions!.map((e) => e.code)).toEqual(['C0', 'C1', 'F1', 'F2', 'S1', 'S2']);
      expect(send(core, { t: 'config', config: { edition: 'nonsense' } }).ack!.ok).toBe(false);
      expect(send(core, { t: 'config', config: { edition: 'S1' } }).ack!.ok).toBe(true);
      expect(send(core, { t: 'config', config: { edition: null } }).ack!.ok).toBe(true);
      expect(core.view(0, everyone).config.edition).toBeNull();
      send(core, { t: 'config', config: { edition: 'S2' } });
      send(core, { t: 'start' });
      const view = core.view(0, everyone).game as DeckView;
      expect(view.rulesVersion).toBe(106);
      expect(view.projects.every((p) => p.stages)).toBe(true);
      expect(view.projectsEnd).toBe(5);
    });
  });
});
