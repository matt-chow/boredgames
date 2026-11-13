import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error a build script with no type declarations
import { openings } from '../../scripts/art/mines-paint.mjs';
import { ACTIONS, ART_KINDS, DEEP_KINDS, ENTRANCE, GOALS, ROLES, TUNNEL, TUNNELS, artOf, deepArtOf } from '../../src/games/mines/rules/cards';

const file = (url: string) => `public${url}`;
const painted = ART_KINDS.filter((k) => artOf(k).endsWith('.webp'));

describe('art', () => {
  it('MS-ART1: every card, role and board piece has its picture, in both views, and the cover exists', () => {
    for (const k of ART_KINDS) expect(existsSync(file(artOf(k))), k).toBe(true);
    for (const k of DEEP_KINDS) expect(existsSync(file(deepArtOf(k))), k).toBe(true);
    for (const k of [...TUNNELS.map((t) => t.kind), ...ACTIONS.map((a) => a.kind), ...ROLES.map((r) => r.role)]) expect(ART_KINDS).toContain(k);
    expect(existsSync('public/art/covers/mines.svg')).toBe(true);
  });

  it('MS-ART2: every painted tunnel opens on exactly the edges its links name', async () => {
    const tiles = [...TUNNELS, ENTRANCE, ...Object.values(GOALS)];
    for (const t of tiles) {
      const { open }: { open: string[] } = await openings(file(artOf(t.kind)));
      expect(open.join(''), t.kind).toBe([...new Set(t.links.flat())].sort().join(''));
    }
  });

  it('MS-ART3: every card face is painted, listed in the manifest, and small enough for the table', () => {
    // Only the round badges stay vector icons.
    expect(painted.length).toBe(ART_KINDS.length - 8);
    for (const k of [...Object.keys(TUNNEL), ...ACTIONS.map((a) => a.kind), ...ROLES.map((r) => r.role), 'cardBack', 'roleBack', 'goalBack']) expect(painted).toContain(k);
    const manifest: { card: string; file: string }[] = JSON.parse(readFileSync('data/mines-art-manifest.json', 'utf8'));
    expect(manifest.map((m) => m.card).sort()).toEqual([...painted].sort());
    for (const m of manifest) {
      expect(m.file).toBe(artOf(m.card));
      const size = statSync(file(m.file)).size;
      expect(size, m.card).toBeGreaterThan(2_000);
      expect(size, m.card).toBeLessThan(60_000);
    }
  });
});
