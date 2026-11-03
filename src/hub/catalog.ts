/**
 * What the hub shows for each listed game. Kept client-side so the home page needs no request and no rules code;
 * tests/hub/catalog.test.ts checks it against the server registry.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  minutes: string;
  pitch: string;
}

export const CATALOG: CatalogEntry[] = [
  {
    id: 'bohnanza',
    name: 'Bohnanza',
    minPlayers: 3,
    maxPlayers: 5,
    minutes: '45',
    pitch: 'Plant beans in the order you drew them, trade hard for the ones you need, and harvest for coins.',
  },
];
