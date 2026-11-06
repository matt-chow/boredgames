import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/hub/catalog';
import { GAMES, LISTED_GAMES } from '../../src/games/registry';

describe('hub catalog', () => {
  it('lists exactly the games the server offers, with matching names and player counts', () => {
    const available = CATALOG.filter((g) => g.status === 'available');
    expect(available.map((g) => g.id)).toEqual(LISTED_GAMES);
    for (const g of available) {
      const meta = GAMES[g.id].meta;
      expect([g.name, g.minPlayers, g.maxPlayers]).toEqual([meta.name, meta.minPlayers, meta.maxPlayers]);
    }
  });

  it('never offers a coming-soon game as something the server can host', () => {
    for (const g of CATALOG.filter((x) => x.status === 'soon')) expect(LISTED_GAMES).not.toContain(g.id);
  });

  it('offers bots only for games that have them', () => {
    for (const g of CATALOG.filter((x) => x.status === 'available')) expect(!!g.noBots).toBe(!GAMES[g.id].bot);
  });

  it('keeps ids unique and gives every box a colour to fall back on', () => {
    expect(new Set(CATALOG.map((g) => g.id)).size).toBe(CATALOG.length);
    for (const g of CATALOG) expect(g.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
