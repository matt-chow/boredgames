import { describe, expect, it } from 'vitest';
import { selectable } from '../../src/engine/deckbuilder';
import { cardMatches, costOptions, NO_FILTER, typeOptions, typeWords } from '../../src/games/deck/ui/catalog';
import { RULES } from '../../src/games/clockwork/rules/ruleset';

const pool = selectable(RULES);

describe('catalog filters', () => {
  it('CATALOG-1: no filter keeps everything, and a name search ignores case and spaces', () => {
    expect(pool.filter((c) => cardMatches(c, NO_FILTER))).toHaveLength(pool.length);
    expect(pool.filter((c) => cardMatches(c, { ...NO_FILTER, q: '  night WATCH ' })).map((c) => c.key)).toEqual(['night_watch']);
  });
  it('CATALOG-2: type, cost and set each narrow to matching cards and combine', () => {
    const attacks = pool.filter((c) => cardMatches(c, { ...NO_FILTER, type: 'Attack' }));
    expect(attacks.length).toBeGreaterThan(0);
    expect(attacks.every((c) => c.types.includes('attack'))).toBe(true);
    for (const cost of costOptions(pool)) expect(pool.filter((c) => cardMatches(c, { ...NO_FILTER, cost: String(cost) })).every((c) => c.cost === cost)).toBe(true);
    const both = pool.filter((c) => cardMatches(c, { ...NO_FILTER, set: 'core', cost: '5' }));
    expect(both.length).toBeGreaterThan(0);
    expect(both.every((c) => c.set === 'core' && c.cost === 5)).toBe(true);
    expect(pool.filter((c) => cardMatches(c, { ...NO_FILTER, q: 'no such card' }))).toEqual([]);
  });
  it('CATALOG-3: every type offered finds at least one card, and every card has a type', () => {
    for (const type of typeOptions(pool)) expect(pool.some((c) => cardMatches(c, { ...NO_FILTER, type })), type).toBe(true);
    for (const c of pool) expect(typeWords(c).length, c.key).toBeGreaterThan(0);
  });
});
