import type { CardDef } from '../../../engine/deckbuilder';

/** What the lobby's card catalog is narrowed by. Only changes what is displayed, never what is chosen. */
export interface CatalogFilter {
  q: string;
  type: string;
  cost: string;
  set: string;
}
export const NO_FILTER: CatalogFilter = { q: '', type: '', cost: '', set: '' };

/** The words printed on a card's type line, which are the ones a player would look for. */
export const typeWords = (c: Pick<CardDef, 'types' | 'typeLine'>): string[] => (c.typeLine ?? c.types.join(' ')).split(/[^\p{L}]+/u).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1));

export const nameMatches = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

export const cardMatches = (c: CardDef, f: CatalogFilter) =>
  nameMatches(c.name, f.q) && (!f.type || typeWords(c).includes(f.type)) && (!f.cost || c.cost === Number(f.cost)) && (!f.set || c.set === f.set);

export const typeOptions = (cards: CardDef[]) => [...new Set(cards.flatMap(typeWords))].sort();
export const costOptions = (cards: CardDef[]) => [...new Set(cards.map((c) => c.cost))].sort((a, b) => a - b);
