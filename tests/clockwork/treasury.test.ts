import { describe, expect, it } from 'vitest';
import { resParts } from '../../src/games/deck/ui/text';
import { BASICS } from '../../src/games/clockwork/rules/cards';
import { RULES } from '../../src/games/clockwork/rules/ruleset';
import { RULES_V2 } from '../../src/games/clockwork/rules/ruleset';
import { modernise } from '../../src/games/clockwork/rules/legacy';

const labels = RULES.labels!;
const joined = (text: string) => resParts(text, labels).map((p) => p.text).join('');
const icons = (text: string) => resParts(text, labels).flatMap((p) => (p.icon ? [[p.text, p.icon]] : []));

describe('KC3-TREASURY', () => {
  it('KC3-TREASURY-1: the renames change names only: keys, costs and values stay', () => {
    const fact = (key: string) => {
      const c = BASICS.find((b) => b.key === key)!;
      return [c.name, c.cost, c.coins];
    };
    expect(fact('scrap')).toEqual(['Copper', 0, 1]);
    expect(fact('cog')).toEqual(['Silver', 3, 2]);
    expect(fact('dynamo')).toEqual(['Gold', 6, 3]);
  });

  it('KC3-TREASURY-2: prompts saved under any earlier name read the new one', () => {
    expect(modernise('Trash a Coin Purse or a Silver Chest for a Royal Treasury.')).toBe('Trash a Copper or a Silver for a Gold.');
    expect(modernise('Trash a Scrap or a Groat for a Florin.')).toBe('Trash a Copper or a Silver for a Gold.');
    expect(modernise('Gain a Gold or a Silver or a Copper.')).toBe('Gain a Gold or a Silver or a Copper.');
  });

  it('KC3-TREASURY-3: both editions show the same headings', () => {
    for (const r of [RULES, RULES_V2]) expect([r.labels?.basics, r.labels?.basicsNote, r.labels?.market]).toEqual(['Treasury', 'Always Available', 'Kingdom Market']);
  });
});

describe('KC3-SYM', () => {
  it('KC3-SYM-1: every resource gets its own symbol', () => {
    expect(icons('+1 Action. +1 Buy. +2 Coins. 1 Influence. 3 Renown.')).toEqual([
      ['Action', 'action'],
      ['Buy', 'buy'],
      ['Coins', 'coin'],
      ['Influence', 'influence'],
      ['Renown', 'crown'],
    ]);
  });

  it('KC3-SYM-2: the words always stay, so the sentence reads the same without the symbols', () => {
    for (const c of [...RULES.cards, ...(RULES.projects ?? [])]) expect(joined(c.text), c.key).toBe(c.text);
  });

  it('KC3-SYM-3: a card type is not a resource', () => {
    expect(icons('Trash an Action card. Gain a card costing up to 2 Coins.')).toEqual([['Coins', 'coin']]);
    expect(icons('Coins are spent.')).toEqual([]);
  });

  it('KC3-SYM-4: a game without labels still marks counted resources', () => {
    expect(resParts('+1 Action. 3 Renown.').flatMap((p) => (p.icon ? [p.text] : []))).toEqual(['Action']);
  });
});
