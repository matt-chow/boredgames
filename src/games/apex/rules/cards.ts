/**
 * Race cards as short codes: P1–P5 pace, C coast, S stress, X heat, or an upgrade id (b01…). Codes keep decks small in
 * storage and readable in tests.
 */
import { UPGRADE_BY_ID, type CardFx } from './content/upgrades';

export type Card = string;
export const HEAT: Card = 'X';
export const STRESS: Card = 'S';
export const COAST: Card = 'C';

const BASE: Record<string, CardFx> = {
  P1: { value: 1 },
  P2: { value: 2 },
  P3: { value: 3 },
  P4: { value: 4 },
  P5: { value: 5 },
  C: { value: 1, cool: 1 },
};

/** A card's printed effect; Stress and Heat have none. */
export function cardFx(c: Card): CardFx | null {
  return BASE[c] ?? UPGRADE_BY_ID[c]?.card ?? null;
}

export const valueOf = (c: Card) => cardFx(c)?.value ?? 0;
/** A card that ends a Stress or boost flip (AX-STR-1). */
export const isValued = (c: Card) => valueOf(c) > 0;
export const committable = (c: Card) => c !== HEAT;

/** AX-CAR-1: the starting deck, before upgrades and modules. */
export function baseDeck(): Card[] {
  return ['P1', 'P1', 'P1', 'P2', 'P2', 'P2', 'P3', 'P3', 'P3', 'P4', 'P4', 'P4', 'P5', 'C', 'S', 'S'];
}

export function cardName(c: Card): string {
  if (c === HEAT) return 'Heat';
  if (c === STRESS) return 'Stress';
  if (c === COAST) return 'Coast';
  if (c in BASE) return `Pace ${c.slice(1)}`;
  return UPGRADE_BY_ID[c]?.name ?? c;
}
