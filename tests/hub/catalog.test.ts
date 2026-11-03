import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/hub/catalog';
import { GAMES, LISTED_GAMES } from '../../src/games/registry';

describe('hub catalog', () => {
  it('lists exactly the games the server offers, with matching names and player counts', () => {
    expect(CATALOG.map((g) => g.id)).toEqual(LISTED_GAMES);
    for (const g of CATALOG) {
      const meta = GAMES[g.id].meta;
      expect([g.name, g.minPlayers, g.maxPlayers]).toEqual([meta.name, meta.minPlayers, meta.maxPlayers]);
    }
  });
});
