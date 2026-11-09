import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIONS, ART_KINDS, DEEP_KINDS, ROLES, TUNNELS, artOf, deepArtOf } from '../../src/games/mines/rules/cards';

const file = (url: string) => `public${url}`;

describe('art', () => {
  it('MS-ART1: every card, role and board piece has its picture, in both views, and the cover exists', () => {
    for (const k of ART_KINDS) expect(existsSync(file(artOf(k))), k).toBe(true);
    for (const k of DEEP_KINDS) expect(existsSync(file(deepArtOf(k))), k).toBe(true);
    for (const k of [...TUNNELS.map((t) => t.kind), ...ACTIONS.map((a) => a.kind), ...ROLES.map((r) => r.role)]) expect(ART_KINDS).toContain(k);
    expect(existsSync('public/art/covers/mines.svg')).toBe(true);
  });
});
