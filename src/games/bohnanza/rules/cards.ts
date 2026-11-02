/**
 * Bean types, card counts and beanometers.
 * Sources: Rio Grande Games rulebook v5.0 (2017 relaunch) for the 8 base beans;
 * AMIGO 25th Anniversary rulebook for Cocoa / Brandy (= Wax) / Coffee / Field / Magpie.
 * See docs/RULES.md §2 and docs/VARIANTS.md.
 */

export type Bean =
  | 'coffee'
  | 'wax'
  | 'blue'
  | 'chili'
  | 'stink'
  | 'green'
  | 'soy'
  | 'blackeyed'
  | 'red'
  | 'garden'
  | 'cocoa'
  | 'field'
  | 'magpie';

export interface BeanInfo {
  name: string;
  /** Printed card count (also the number of copies in the full set). */
  count: number;
  /**
   * Beanometer: cards needed for 1, 2, 3, 4 gold coins. `null` = that coin
   * value is not printed on the card (e.g. Garden pays 2 or 3, never 1).
   */
  meter: [number | null, number | null, number | null, number | null];
}

export const BEANS: Record<Bean, BeanInfo> = {
  coffee: { name: 'Coffee Bean', count: 24, meter: [4, 7, 10, 12] },
  wax: { name: 'Brandy Bean', count: 22, meter: [4, 7, 9, 11] },
  blue: { name: 'Blue Bean', count: 20, meter: [4, 6, 8, 10] },
  chili: { name: 'Chili Bean', count: 18, meter: [3, 6, 8, 9] },
  stink: { name: 'Stink Bean', count: 16, meter: [3, 5, 7, 8] },
  green: { name: 'Green Bean', count: 14, meter: [3, 5, 6, 7] },
  soy: { name: 'Soy Bean', count: 12, meter: [2, 4, 6, 7] },
  blackeyed: { name: 'Black-eyed Bean', count: 10, meter: [2, 4, 5, 6] },
  red: { name: 'Red Bean', count: 8, meter: [2, 3, 4, 5] },
  garden: { name: 'Garden Bean', count: 6, meter: [null, 2, 3, null] },
  cocoa: { name: 'Cocoa Bean', count: 4, meter: [null, 2, 3, 4] },
  // Field Bean: two cards grant a third bean field instead of coins (special-cased).
  field: { name: 'Field Bean', count: 3, meter: [null, null, 3, null] },
  // Magpie Bean: never planted, so it has no beanometer.
  magpie: { name: 'Magpie Bean', count: 6, meter: [null, null, null, null] },
};

export const BASE_BEANS: Bean[] = ['blue', 'chili', 'stink', 'green', 'soy', 'blackeyed', 'red', 'garden'];

/** Gold coins earned for harvesting `count` cards of `bean` (Field Bean's 2-card bonus is not coins). */
export function coinsFor(bean: Bean, count: number): number {
  const meter = BEANS[bean].meter;
  let coins = 0;
  for (let k = 0; k < 4; k++) {
    const need = meter[k];
    if (need !== null && count >= need) coins = k + 1;
  }
  return coins;
}

/** Whether a bean can ever be placed in a field. */
export function isPlantable(bean: Bean): boolean {
  return bean !== 'magpie';
}
