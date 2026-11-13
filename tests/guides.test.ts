/** The in-game guides (GUIDE-*): structure and search, plus their numbers and worked examples checked against the engines. */
import { describe, expect, it } from 'vitest';
import { apply } from '../src/games/bohnanza/rules/engine';
import { guide as beans } from '../src/games/bohnanza/ui/guide';
import { BEANS } from '../src/games/bohnanza/rules/cards';
import { assignStages, splitProject } from '../src/engine/deckbuilder';
import { EDITIONS, STAGE_NAMES } from '../src/games/clockwork/rules/editions';
import { RULES } from '../src/games/clockwork/rules/ruleset';
import { guide as kingdom, guideFor } from '../src/games/clockwork/ui/guide';
import { guide as deadDrop } from '../src/games/deaddrop/ui/guide';
import { guide as mines } from '../src/games/mines/ui/guide';
import { guideFor as sealedGuide } from '../src/games/sealed/ui/guide';
import { guide as palazzo } from '../src/games/palazzo/ui/guide';
import { GRACE_MS, MemoryStore, RoomCore } from '../src/server/core';
import { blockText, searchGuide, type GuideDoc } from '../src/hub/guide';
import { make, ok } from './bohnanza/helpers';
import { Table } from './clockwork/helpers';

const textOf = (doc: GuideDoc) => doc.levels.flatMap((l) => l.sections.flatMap((s) => [s.title, ...s.body.map(blockText)])).join('\n');
const defOf = (key: string) => RULES.cards.find((c) => c.key === key)!;

describe('guide structure', () => {
  for (const doc of [beans, kingdom, deadDrop, mines, sealedGuide('classic'), sealedGuide('expanded'), palazzo]) {
    it(`GUIDE-1: ${doc.title} has the three levels, unique ids and no empty sections`, () => {
      expect(doc.levels.map((l) => l.id)).toEqual(['quick', 'full', 'rules']);
      const ids = doc.levels.flatMap((l) => l.sections.map((s) => s.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const l of doc.levels) for (const s of l.sections) expect(s.body.length).toBeGreaterThan(0);
    });
  }

  it('GUIDE-2: search needs every word, ignores case and markup, and reports its level', () => {
    expect(searchGuide(kingdom, '   ')).toEqual([]);
    const hits = searchGuide(kingdom, 'ROYAL debt influence');
    expect(hits.map((h) => h.section.id)).toContain('f-debt');
    expect(searchGuide(kingdom, 'zzzz')).toEqual([]);
    expect(searchGuide(beans, 'forced harvest').some((h) => h.level.id === 'full')).toBe(true);
  });

  it('GUIDE-3: the contextual links in the tables point at real sections', () => {
    const ids = (doc: GuideDoc) => new Set(doc.levels.flatMap((l) => l.sections.map((s) => s.id)));
    for (const id of ['f-attacks', 'f-words', 'f-action', 'f-market', 'f-renown', 'f-projects', 'r-staged']) expect(ids(kingdom).has(id)).toBe(true);
    for (const id of ['f-phase1', 'f-trade', 'f-phase3', 'f-end']) expect(ids(beans).has(id)).toBe(true);
  });

  it('GUIDE-4: required topics are all covered', () => {
    const k = textOf(kingdom).toLowerCase();
    for (const topic of ['starting', 'supply', 'market', 'discard', 'trash', 'exchange', 'attack', 'reaction', 'establishment', 'royal debt', 'influence', 'crown project', 'renown', 'conditional', 'player count', 'treasury', 'bronze', 'silver', 'gold', 'shuffled', 'improving your deck', 'lasts across', 'stage', 'final round', 'disconnect', 'bot', 'older rooms', 'private']) expect(k).toContain(topic);
    const b = textOf(beans).toLowerCase();
    for (const topic of ['fields', 'hand order', 'offer', 'counteroffer', 'gift', 'forced harvest', 'beanometer', 'draw', 'third', 'variants', 'player counts']) expect(b).toContain(topic);
  });
});

/** Make the deal give this Project its single stage, as an example assumes. */
const oneStage = (t: Table, key: string) => {
  const p = t.s.projects.find((x) => x.key === key)!;
  p.stages = splitProject(RULES.projects!.find((x) => x.key === key)!, 1, 1, STAGE_NAMES[key]);
};
const stagesOf = (t: Table, key: string, n: number) => {
  const p = t.s.projects.find((x) => x.key === key)!;
  p.stages = splitProject(RULES.projects!.find((x) => x.key === key)!, n, 1, STAGE_NAMES[key]);
  return p;
};

describe('Kingdom & Commerce numbers', () => {
  it('GUIDE-K1: what the guide states matches the ruleset', () => {
    expect(RULES.tokenCaps!.spark).toBe(8);
    expect(RULES.convert).toEqual({ token: 'spark', coinsEach: 1, maxPerTurn: 2 });
    expect(RULES.startingDeck).toEqual([{ key: 'scrap', count: 7 }, { key: 'notebook', count: 3 }]);
    expect(RULES.handSize).toBe(5);
    expect(RULES.marketSize).toBe(10);
    expect(RULES.projectCount).toBe(5);
    expect(RULES.projectsToEnd!(4)).toBe(5);
    expect(RULES.staged!.counts(2)).toEqual([1, 2, 2]);
    expect(RULES.staged!.extraCoins).toBe(1);
    expect(RULES.finishRound).toBe(true);
    expect([2, 4, 5, 6].map((n) => RULES.emptyPilesToEnd(n))).toEqual([3, 3, 4, 4]);
    expect([2, 3, 4, 5, 6].map((n) => RULES.basicPiles(n).notebook)).toEqual([8, 12, 12, 15, 18]);
    expect(RULES.basicPiles(2)).toMatchObject({ scrap: 60, cog: 40, dynamo: 30 });
    expect([4, 5].map((n) => RULES.marketPileSize('x', n))).toEqual([10, 12]);
    expect(RULES.extraPiles!(['tax_arrears'], 3)).toEqual({ rust: 10 });
    const costs = Object.fromEntries(['scrap', 'cog', 'dynamo', 'notebook', 'blueprint', 'monument'].map((k) => [k, [defOf(k).name, defOf(k).cost, defOf(k).vp ?? 0]]));
    expect(costs).toEqual({
      scrap: ['Bronze', 0, 0],
      cog: ['Silver', 3, 0],
      dynamo: ['Gold', 6, 0],
      notebook: ['Homestead', 2, 1],
      blueprint: ['Noble Estate', 5, 3],
      monument: ['Grand Duchy', 8, 6],
    });
    expect(defOf('rust').noBuy).toBe(true);
    const quay = RULES.projects!.find((p) => p.key === 'canal_lights')!;
    expect([quay.name, quay.coins, quay.tokens.spark, quay.vp]).toEqual(['River Quay', 3, 2, 4]);
  });
});

describe('Kingdom & Commerce worked examples', () => {
  const coins = (t: Table) => t.view().turn.coins;

  it('GUIDE-K2: a full first turn', () => {
    const t = new Table(['scrap', 'scrap', 'scrap', 'notebook', 'notebook']);
    t.s.players[t.me].hand = t.s.players[t.me].hand.slice(-5);
    t.apply(t.me, { type: 'end-phase' });
    t.apply(t.me, { type: 'play-treasures' });
    expect(coins(t)).toBe(3);
    t.apply(t.me, { type: 'buy', pile: 'cog' });
    expect(t.discard()).toContain('cog');
    t.apply(t.me, { type: 'end-phase' });
    expect(t.view(t.me).hand.length).toBe(5);
  });

  it('GUIDE-K3: improving Currency with Mintmaster', () => {
    const t = new Table(['mintmaster', 'cog']);
    t.play('mintmaster').cards('cog');
    expect(t.q.piles).toContain('dynamo');
    t.pile('dynamo');
    expect(t.trash()).toEqual(['cog']);
    expect(t.spark()).toBe(1);
    expect(t.s.cards[t.s.players[t.me].deck.at(-1)!]).toBe('dynamo');
  });

  it('GUIDE-K4: thinning with Royal Confessor', () => {
    const t = new Table(['royal_confessor', 'scrap', 'notebook']);
    const before = t.view().score!.total;
    t.play('royal_confessor').cards('scrap', 'notebook');
    expect(t.trash().sort()).toEqual(['notebook', 'scrap']);
    expect(t.spark()).toBe(1);
    expect(t.view().score!.total).toBe(before - 1);
  });

  it('GUIDE-K5: spending Influence', () => {
    const t = new Table([], { spark: 3 });
    t.toMarket();
    t.s.turn.coins = 3;
    expect(t.view().legal.buy).not.toContain('blueprint');
    t.apply(t.me, { type: 'convert' });
    t.apply(t.me, { type: 'convert' });
    expect(coins(t)).toBe(5);
    expect(t.spark()).toBe(1);
    expect(t.view().legal.convert).toBe(false);
    expect(t.view().legal.buy).toContain('blueprint');
  });

  it('GUIDE-K6: completing a one-stage River Quay', () => {
    const t = new Table([], { works: ['canal_lights', 'public_clock', 'makers_fair', 'tram_extension', 'skybridge'], spark: 2 });
    oneStage(t, 'canal_lights');
    t.toMarket();
    t.s.turn.coins = 3;
    const before = t.view().score!.total;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    expect(t.spark()).toBe(1);
    expect(coins(t)).toBe(0);
    expect(t.view().turn.buys).toBe(0);
    expect(t.view().score!.total).toBe(before + 4);
  });

  it('GUIDE-K7: an attack, a defence and a choice', () => {
    const t = new Table(['tax_arrears'], { players: 3, others: [['royal_advocate', 'scrap'], ['cog', 'notebook']] });
    const [first, second] = [(t.me + 1) % 3, (t.me + 2) % 3];
    t.play('tax_arrears');
    expect(t.asking).toBe(first);
    t.cards('royal_advocate');
    if (t.asking === first) t.no();
    expect(t.view(first).hand.map((c) => c.key)).not.toContain('royal_advocate');
    expect(t.asking).toBe(second);
    expect(t.q.options ?? t.q.cards).toBeTruthy();
    expect(t.view(t.me).turn.buys).toBe(2);
    expect(coins(t)).toBe(1);
  });

  it('GUIDE-K8: final scoring adds up to 21', () => {
    const t = new Table(['blueprint', 'blueprint', 'monument', 'noble_council', 'rust'], { works: ['canal_lights', 'public_clock', 'makers_fair', 'tram_extension', 'skybridge'], spark: 2 });
    oneStage(t, 'canal_lights');
    t.toMarket();
    t.s.turn.coins = 3;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    const s = t.view().score!;
    expect(s).toEqual({ estates: 15, special: 0, projects: 4, negative: -1, conditional: 3, total: 21 });
  });
});

describe('Kingdom & Commerce rules for the room', () => {
  const body = (doc: GuideDoc, id: string) => doc.levels.flatMap((l) => l.sections).find((s) => s.id === id)!.body.map(blockText).join(' ');

  it('GUIDE-K9: the current guide states the F2 rules and finishing the round', () => {
    expect(guideFor()).toBe(kingdom);
    expect(guideFor('nonsense')).toBe(kingdom);
    expect(guideFor(undefined, 4)).toBe(kingdom);
    expect(kingdom.note).toBeUndefined();
    expect(body(kingdom, 'q-end')).toContain('**All 5** Crown Projects');
    expect(body(kingdom, 'q-end')).toContain('The round then finishes');
    expect(body(kingdom, 'f-projects')).toContain('one with 1 stage, two with 2 stages and two with 3 stages');
    expect(body(kingdom, 'f-end')).toContain('same number of turns');
    expect(body(kingdom, 'r-final')).toContain('stays triggered');
    expect(textOf(kingdom)).not.toMatch(/trial|fewer turns ranks/i);
  });

  it.each([2, 3])('GUIDE-K9a: a room on edition %i shows its own rules, not the new ones', (version) => {
    const doc = guideFor(undefined, version);
    expect(doc.note).toContain('earlier edition');
    expect(doc.note!.includes('Crown Decree')).toBe(version < 3);
    expect(body(doc, 'q-end')).toContain('**4** Crown Projects');
    expect(body(doc, 'f-end')).toContain('fewer turns ranks higher');
    expect(body(doc, 'f-projects')).toContain('When **4** are complete');
    expect(body(doc, 'r-final')).toContain('doesn’t finish the round');
    expect(body(doc, 'f-examples')).not.toContain('Finishing the round');
    expect(body(doc, 'f-examples')).not.toContain('three-stage');
  });

  it.each(EDITIONS.map((e) => e.edition!.code))('GUIDE-K10: a %s room’s guide states that room’s rule everywhere', (code) => {
    const rules = EDITIONS.find((e) => e.edition!.code === code)!;
    const doc = guideFor(code);
    expect(doc.note).toContain(rules.edition!.name);
    expect(doc.note).toContain(rules.edition!.text);
    expect(doc.levels.flatMap((l) => l.sections.map((s) => s.id))).toEqual(kingdom.levels.flatMap((l) => l.sections.map((s) => s.id)));
    expect(rules.projectsToEnd!(4)).toBe(5);
    expect(body(doc, 'q-end')).toContain('**All 5**');
    expect(body(doc, 'f-end')).toContain('all 5');
    expect(textOf(doc)).not.toMatch(/\*\*4\*\* (Crown Projects|are complete)|4 Crown Projects complete|fourth one/);
    expect(body(doc, 'f-examples')).not.toContain('Finishing the round');
    expect(body(doc, 'r-final')).toContain('doesn’t finish the round');
    expect(body(doc, 'f-projects').includes('stage')).toBe(!!rules.staged);
  });
});

describe('edition 4 examples', () => {
  const WALLS = ['city_illumination', 'public_clock', 'canal_lights', 'makers_fair', 'skybridge'];
  const pay = (t: Table, key: string, coins: number, spark: number) => {
    const seat = t.s.turn.seat;
    t.s.turn.phase = 'buy';
    t.s.turn.coins = coins;
    t.s.turn.buys = 1;
    t.setSpark(spark, seat);
    t.apply(seat, { type: 'claim', project: key });
    expect(t.s.turn.coins).toBe(0);
    return seat;
  };
  const pass = (t: Table) => {
    const [seat, n] = [t.s.turn.seat, t.s.turn.number];
    t.apply(seat, { type: 'end-phase' });
    if (!t.s.over && t.s.turn.number === n) t.apply(seat, { type: 'end-phase' });
  };

  it('GUIDE-K17: sharing a three-stage City Walls: 9 Coins as 3, 3, 3, and 13 Renown as 4, 4, 5', () => {
    const t = new Table([], { players: 2, works: WALLS });
    const p = stagesOf(t, 'city_illumination', 3);
    expect(p.stages!.map((s) => [s.name, s.coins, s.tokens.spark, s.vp])).toEqual([['Foundations', 3, 1, 4], ['Masonry', 3, 2, 4], ['Fortification', 3, 2, 5]]);
    const a = pay(t, 'city_illumination', 3, 1);
    pass(t);
    const b = pay(t, 'city_illumination', 3, 2);
    pass(t);
    expect(t.s.projects.find((x) => x.key === 'city_illumination')!.by).toBeNull();
    expect(pay(t, 'city_illumination', 3, 2)).toBe(a);
    expect(t.s.projects.find((x) => x.key === 'city_illumination')!.by).toBe(a);
    expect(t.spark(a)).toBe(2);
    expect([t.view(a).score!.projects, t.view(b).score!.projects]).toEqual([9, 4]);
  });

  it('GUIDE-K18: two-stage River Quay prices: 2 + 1 for 2, twice', () => {
    const t = new Table([], { players: 2, works: WALLS });
    expect(stagesOf(t, 'canal_lights', 2).stages!.map((s) => [s.name, s.coins, s.tokens.spark, s.vp])).toEqual([['Piling', 2, 1, 2], ['Harbour Cranes', 2, 1, 2]]);
  });

  it('GUIDE-K19: finishing the round: seats between the opener and the trigger do not play again, later seats do', () => {
    const t = new Table([], { players: 4 });
    const ana = t.s.turn.seat;
    pass(t);
    const ben = t.s.turn.seat;
    const [cy, dee] = [(ben + 1) % 4, (ben + 2) % 4];
    pass(t);
    pass(t);
    pass(t);
    expect(t.s.turn.seat).toBe(ana);
    pass(t);
    t.s.supply.monument = [];
    pass(t);
    expect(t.s.finalRound).toEqual({ by: ben, turns: 2 });
    expect(t.s.turn.seat).toBe(cy);
    expect(t.view(cy).legal.buy).not.toContain('monument');
    pass(t);
    expect(t.s.turn.seat).toBe(dee);
    pass(t);
    expect(t.s.over).toBe(true);
    expect(t.s.players.map((p) => p.turns)).toEqual([2, 2, 2, 2]);
  });
});

describe('Staged Crown Project examples', () => {
  const WALLS = ['city_illumination', 'public_clock', 'canal_lights', 'makers_fair', 'skybridge'];
  const edition = (code: string) => EDITIONS.find((r) => r.edition!.code === code)!;
  /** A trial table with chosen stage counts, in the Market phase. */
  function site(code: string, sizes: Record<string, number>, players = 2) {
    const t = new Table([], { players, edition: code, works: WALLS });
    const rules = edition(code);
    for (const p of t.s.projects) p.stages = splitProject(rules.projects!.find((x) => x.key === p.key)!, sizes[p.key] ?? 1, rules.staged?.extraCoins ?? 0, STAGE_NAMES[p.key]);
    return t;
  }
  function pay(t: Table, key: string, coins: number, spark: number) {
    t.s.turn.phase = 'buy';
    t.s.turn.coins = coins;
    t.s.turn.buys = 1;
    t.setSpark(spark, t.s.turn.seat);
    const seat = t.s.turn.seat;
    t.apply(seat, { type: 'claim', project: key });
    expect(t.s.turn.coins).toBe(0);
    return seat;
  }
  const next = (t: Table) => t.apply(t.s.turn.seat, { type: 'end-phase' });
  const here = (t: Table, key: string) => t.s.projects.find((p) => p.key === key)!;
  const projects = (t: Table, seat: number) => t.view(seat).score!.projects;

  it('GUIDE-K11 (example C): a one-stage River Quay works as a claim, at the same price under F2', () => {
    for (const code of ['F1', 'F2']) {
      const t = site(code, { canal_lights: 1 });
      const me = pay(t, 'canal_lights', 3, 2);
      expect(here(t, 'canal_lights').by).toBe(me);
      expect(t.spark()).toBe(1);
      expect(projects(t, me)).toBe(4);
    }
  });

  it('GUIDE-K12 (example D): two players share City Walls, and F2 divides 9 Coins evenly', () => {
    const t = site('F1', { city_illumination: 3 });
    expect(here(t, 'city_illumination').stages!.map((s) => [s.name, s.coins, s.tokens.spark, s.vp])).toEqual([['Foundations', 3, 1, 4], ['Masonry', 3, 2, 4], ['Fortification', 2, 2, 5]]);
    const a = pay(t, 'city_illumination', 3, 1);
    next(t);
    const b = pay(t, 'city_illumination', 3, 2);
    next(t);
    expect(pay(t, 'city_illumination', 2, 2)).toBe(a);
    expect(here(t, 'city_illumination').by).toBe(a);
    expect(t.spark()).toBe(2);
    expect([projects(t, a), projects(t, b)]).toEqual([9, 4]);
    expect(site('F2', { city_illumination: 3 }).s.projects.find((p) => p.key === 'city_illumination')!.stages!.map((s) => s.coins)).toEqual([3, 3, 3]);
  });

  it('GUIDE-K13 (example E): each of three contributors keeps their stage’s Renown, finished or not', () => {
    const t = site('F1', { city_illumination: 3 }, 3);
    const a = pay(t, 'city_illumination', 3, 1);
    next(t);
    const b = pay(t, 'city_illumination', 3, 2);
    next(t);
    expect(here(t, 'city_illumination').by).toBeNull();
    expect([projects(t, a), projects(t, b)]).toEqual([4, 4]);
    expect(t.spark(a)).toBe(0);
    const c = pay(t, 'city_illumination', 2, 2);
    expect([projects(t, a), projects(t, b), projects(t, c)]).toEqual([4, 4, 5]);
    expect(t.spark(c)).toBe(2);
    expect(t.spark(a)).toBe(0);
  });

  it('GUIDE-K14 (example F): six players have 13 stages under S1 and 11 under F1', () => {
    const count = (code: string) => [...assignStages(edition(code), 'guide', WALLS, 6).values()];
    expect(count('S1').sort()).toEqual([2, 2, 3, 3, 3]);
    expect(count('S1').reduce((x, y) => x + y)).toBe(13);
    expect(count('F1').reduce((x, y) => x + y)).toBe(11);
  });

  it('GUIDE-K15 (example G): the fifth complete Project ends the game after that turn, the fourth doesn’t', () => {
    const t = site('F1', {});
    const prices = (key: string) => here(t, key).stages![0];
    for (const k of WALLS.slice(0, 4)) {
      pay(t, k, prices(k).coins, prices(k).tokens.spark ?? 0);
      if (t.s.pending) t.no();
    }
    next(t);
    expect(t.s.over).toBe(false);
    const last = WALLS[4];
    pay(t, last, prices(last).coins, prices(last).tokens.spark ?? 0);
    if (t.s.pending) t.no();
    expect(t.s.over).toBe(false);
    next(t);
    expect(t.s.over).toBe(true);
  });
});

describe('Disconnect example', () => {
  it('GUIDE-K16 (example H): 60 seconds, a bot plays the seat, and the person takes it straight back', () => {
    let clock = 1_000_000;
    const store = new MemoryStore();
    const core = RoomCore.create(store, { now: () => clock, seed: () => 'guide-h' }, { code: 'ABCDEF', gameId: 'clockwork', name: 'Ann', th: 't0', bots: 0 });
    core.join('Bo', 't1');
    core.join('Cy', 't2');
    const all = new Set([0, 1, 2]);
    const msg: Record<string, unknown> = { t: 'start' };
    core.handle(0, { id: 'start', v: core.version, ...msg } as never, all);
    expect(GRACE_MS).toBe(60_000);
    const [you] = core.view(0, all).actors;
    const rest = new Set([...all].filter((s) => s !== you));

    core.presence(rest);
    clock += GRACE_MS - 1;
    core.presence(rest);
    expect(core.nextBot()).toBeNull();
    clock += 1;
    core.presence(rest);
    expect(core.nextBot()?.seat).toBe(you);
    expect(core.playBot()).toBe(true);
    const played = core.version;

    expect(core.presence(all)).toBe('changed');
    expect(core.isBotSeat(you)).toBe(false);
    expect(core.nextBot()).toBeNull();
    expect(core.version).toBeGreaterThanOrEqual(played);
    expect(store.history.at(-1)).toMatchObject({ kind: 'reclaim', seat: you });
  });
});

describe('Bohnanza worked examples', () => {
  it('GUIDE-B1: the forced harvest and the harvest payouts', () => {
    const s = make({ n: 4, hands: [['green']], fields: [[['soy'], ['blue', 'blue', 'blue', 'blue']], [[], []], [[], []], [[], []]] });
    expect(apply(s, 0, { type: 'plant', field: 0 } as never).ok).toBe(false);
    expect(apply(s, 0, { type: 'harvest', field: 0 } as never).ok).toBe(false);
    const after = ok(s, 0, { type: 'harvest', field: 1 } as never);
    expect(after.players[0].coins.length).toBe(1);
    expect(after.players[0].fields[1]).toEqual([]);
    const planted = ok(after, 0, { type: 'plant', field: 1 } as never);
    expect(planted.players[0].fields[1].length).toBe(1);
    const chili = make({ n: 4, fields: [[['chili', 'chili', 'chili', 'chili', 'chili'], []], [[], []], [[], []], [[], []]] });
    expect(ok(chili, 0, { type: 'harvest', field: 0 } as never).players[0].coins.length).toBe(1);
  });

  it('GUIDE-B3: every bean count and beanometer in the guide matches the engine', () => {
    const table = beans.levels.flatMap((l) => l.sections).find((s) => s.id === 'r-beans')!.body.map(blockText).join(' ');
    const words: Record<string, keyof typeof BEANS> = { Blue: 'blue', Chili: 'chili', Stink: 'stink', Green: 'green', Soy: 'soy', 'Black-eyed': 'blackeyed', Red: 'red', Garden: 'garden', Coffee: 'coffee', Brandy: 'wax', Cocoa: 'cocoa', Field: 'field' };
    for (const [word, key] of Object.entries(words)) {
      const m = table.match(new RegExp(`\\*\\*${word}\\*\\* \\((\\d+)(?: cards)?\\): ([^*]+?)(?= \\*\\*| Only|$)`))!;
      expect(Number(m[1])).toBe(BEANS[key].count);
      expect(m[2].split(', ').map((x) => (x.trim() === '–' ? null : Number(x)))).toEqual(BEANS[key].meter);
    }
  });

  it('GUIDE-B2: three players get three fields, four get two', () => {
    expect(make({ n: 3 }).players[0].fields.length).toBe(3);
    expect(make({ n: 4 }).players[0].fields.length).toBe(2);
  });
});
