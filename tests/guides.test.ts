/** The in-game guides (GUIDE-*): structure and search, plus their numbers and worked examples checked against the engines. */
import { describe, expect, it } from 'vitest';
import { apply } from '../src/games/bohnanza/rules/engine';
import { guide as beans } from '../src/games/bohnanza/ui/guide';
import { RULES } from '../src/games/clockwork/rules/ruleset';
import { guide as kingdom } from '../src/games/clockwork/ui/guide';
import { blockText, searchGuide, type GuideDoc } from '../src/hub/guide';
import { make, ok } from './bohnanza/helpers';
import { Table } from './clockwork/helpers';

const textOf = (doc: GuideDoc) => doc.levels.flatMap((l) => l.sections.flatMap((s) => [s.title, ...s.body.map(blockText)])).join('\n');
const defOf = (key: string) => RULES.cards.find((c) => c.key === key)!;

describe('guide structure', () => {
  for (const doc of [beans, kingdom]) {
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
    for (const id of ['f-attacks', 'f-words', 'f-action', 'f-market', 'f-renown']) expect(ids(kingdom).has(id)).toBe(true);
    for (const id of ['f-phase1', 'f-trade', 'f-phase3', 'f-end']) expect(ids(beans).has(id)).toBe(true);
  });

  it('GUIDE-4: required topics are all covered', () => {
    const k = textOf(kingdom).toLowerCase();
    for (const topic of ['starting', 'supply', 'market', 'discard', 'trash', 'exchange', 'attack', 'reaction', 'establishment', 'royal debt', 'influence', 'crown project', 'renown', 'conditional', 'player count']) expect(k).toContain(topic);
    const b = textOf(beans).toLowerCase();
    for (const topic of ['fields', 'hand order', 'offer', 'counteroffer', 'gift', 'forced harvest', 'beanometer', 'draw', 'third', 'variants', 'player counts']) expect(b).toContain(topic);
  });
});

describe('Kingdom & Commerce numbers', () => {
  it('GUIDE-K1: what the guide states matches the ruleset', () => {
    expect(RULES.tokenCaps!.spark).toBe(8);
    expect(RULES.convert).toEqual({ token: 'spark', coinsEach: 1, maxPerTurn: 2 });
    expect(RULES.startingDeck).toEqual([{ key: 'scrap', count: 7 }, { key: 'notebook', count: 3 }]);
    expect(RULES.handSize).toBe(5);
    expect(RULES.marketSize).toBe(10);
    expect(RULES.projectCount).toBe(5);
    expect(RULES.projectsToEnd!(4)).toBe(4);
    expect([2, 4, 5, 6].map((n) => RULES.emptyPilesToEnd(n))).toEqual([3, 3, 4, 4]);
    expect([2, 3, 4, 5, 6].map((n) => RULES.basicPiles(n).notebook)).toEqual([8, 12, 12, 15, 18]);
    expect(RULES.basicPiles(2)).toMatchObject({ scrap: 60, cog: 40, dynamo: 30 });
    expect([4, 5].map((n) => RULES.marketPileSize('x', n))).toEqual([10, 12]);
    expect(RULES.extraPiles!(['tax_arrears'], 3)).toEqual({ rust: 10 });
    const costs = Object.fromEntries(['scrap', 'cog', 'dynamo', 'notebook', 'blueprint', 'monument'].map((k) => [k, [defOf(k).name, defOf(k).cost, defOf(k).vp ?? 0]]));
    expect(costs).toEqual({
      scrap: ['Coin Purse', 0, 0],
      cog: ['Silver Chest', 3, 0],
      dynamo: ['Royal Treasury', 6, 0],
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

  it('GUIDE-K6: completing River Quay', () => {
    const t = new Table([], { works: ['canal_lights', 'public_clock', 'makers_fair', 'tram_extension', 'skybridge'], spark: 2 });
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
    t.toMarket();
    t.s.turn.coins = 3;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    const s = t.view().score!;
    expect(s).toEqual({ estates: 15, special: 0, projects: 4, negative: -1, conditional: 3, total: 21 });
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

  it('GUIDE-B2: three players get three fields, four get two', () => {
    expect(make({ n: 3 }).players[0].fields.length).toBe(3);
    expect(make({ n: 4 }).players[0].fields.length).toBe(2);
  });
});
