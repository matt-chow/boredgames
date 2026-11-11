import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ORDER } from '../../src/games/sealed/rules/cards';
import { artOf } from '../../src/games/sealed/ui/text';

describe('art', () => {
  it('SC-ART1: every character, the card back, the favor seal and the cover have their picture', () => {
    for (const k of [...ORDER, 'back', 'seal'] as const) expect(existsSync(`public${artOf(k)}`), k).toBe(true);
    expect(existsSync('public/art/covers/sealed.webp')).toBe(true);
  });
});
