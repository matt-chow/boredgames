import type { OptionDescriptor } from '../../../engine/types';
import { BASE_BEANS, BEANS, type Bean } from './cards';

/**
 * Room options. Every flag defaults to false = the Rio Grande base game.
 * Compatibility rules are documented in docs/VARIANTS.md.
 */
export interface BohnanzaConfig {
  threeNewBeans: boolean;
  fieldBean: boolean;
  beanCoin: boolean;
  magpie: boolean;
  /** Present only so the UI can show it; always rejected for 3–5 players. */
  duel: boolean;
}

export const DEFAULT_CONFIG: BohnanzaConfig = {
  threeNewBeans: false,
  fieldBean: false,
  beanCoin: false,
  magpie: false,
  duel: false,
};

export const OPTIONS: OptionDescriptor[] = [
  {
    key: 'threeNewBeans',
    label: 'Three New Bean Types',
    description:
      'Adds Cocoa, Brandy and Coffee Beans (3 players: no Cocoa; 4–5: no Coffee). In phase 4 every player draws one card. With 3 players the game ends when the deck runs out the second time.',
    playerCounts: [3, 4, 5],
  },
  {
    key: 'fieldBean',
    label: 'The Field Bean',
    description:
      'Adds Field and Brandy Beans. Harvesting two Field Beans grants a third bean field. Uses the Three New Bean Types draw rule. 4–5 players only.',
    playerCounts: [4, 5],
  },
  {
    key: 'beanCoin',
    label: 'AMIGO Bean Coin',
    description:
      'The active player may claim the Bean Coin when their fields are worth enough. Its holder draws four cards; a player with fields worth under one coin draws two. Breaks ties. Base game only.',
    playerCounts: [3, 4, 5],
  },
  {
    key: 'magpie',
    label: 'Magpie Bean',
    description:
      'Six Magpie Beans join the deck. Playing one from the front of your hand in phase 1 lets you steal one bean from each of up to two other players. Never planted.',
    playerCounts: [3, 4, 5],
  },
  {
    key: 'duel',
    label: 'The Duel',
    description: 'Two-player rules with offers instead of trading.',
    playerCounts: [],
    unavailableReason: 'The Duel is a 2-player variant. This hub supports 3–5 players.',
  },
];

export function validateConfig(c: BohnanzaConfig, n: number): string | null {
  if (!Number.isInteger(n) || n < 3 || n > 5) return 'Bohnanza needs 3–5 players.';
  if (c.duel) return 'The Duel is a 2-player variant and cannot be used with 3–5 players.';
  if (c.fieldBean && n < 4) return 'The Field Bean variant is for 4–5 players.';
  if (c.fieldBean && c.threeNewBeans)
    return 'The Field Bean and Three New Bean Types variants define different decks and cannot be combined.';
  if (c.beanCoin && (c.threeNewBeans || c.fieldBean))
    return 'The AMIGO Bean Coin is played with the base game only.';
  if (c.beanCoin && c.magpie)
    return 'The Bean Coin and Magpie Bean conflict (a resisted claim must plant a card that may be a Magpie) and cannot be combined.';
  return null;
}

/** Physical setup derived from options and player count. */
export interface SetupSpec {
  composition: Partial<Record<Bean, number>>;
  fields: number;
  exhaustLimit: number;
  /** 'three' = active draws 3 (base); 'each' = every player draws 1 (variants 1 & 2). */
  drawMode: 'three' | 'each';
}

export function setupSpec(c: BohnanzaConfig, n: number): SetupSpec {
  const composition: Partial<Record<Bean, number>> = {};
  for (const b of BASE_BEANS) composition[b] = BEANS[b].count;
  let exhaustLimit = 3;
  let drawMode: SetupSpec['drawMode'] = 'three';
  if (c.threeNewBeans) {
    composition.cocoa = BEANS.cocoa.count;
    composition.wax = BEANS.wax.count;
    composition.coffee = BEANS.coffee.count;
    if (n === 3) delete composition.cocoa;
    else delete composition.coffee; // 4–5 players
    if (n === 3) exhaustLimit = 2;
    drawMode = 'each';
  }
  if (c.fieldBean) {
    composition.field = BEANS.field.count;
    composition.wax = BEANS.wax.count;
    drawMode = 'each';
  }
  if (c.magpie) composition.magpie = BEANS.magpie.count;
  return { composition, fields: n === 3 ? 3 : 2, exhaustLimit, drawMode };
}

export function normalizeConfig(raw: unknown): BohnanzaConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    threeNewBeans: r.threeNewBeans === true,
    fieldBean: r.fieldBean === true,
    beanCoin: r.beanCoin === true,
    magpie: r.magpie === true,
    duel: r.duel === true,
  };
}
