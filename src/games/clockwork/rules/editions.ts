/**
 * Trial rules for Crown Project construction (CC-STAGE-*). None of these is the default: a room only gets one when the
 * server has experiments on and the host picks it. See docs/CROWN_CONSTRUCTION_EXPERIMENT.md.
 */
import type { Ruleset } from '../../../engine/deckbuilder';
import { RULES } from './ruleset';

/** Original stage names. A 2-stage Project uses the first and last. */
export const STAGE_NAMES: Record<string, readonly [string, string, string]> = {
  canal_lights: ['Piling', 'Stone Wharf', 'Harbour Cranes'],
  public_clock: ['Footings', 'Belfry', 'Great Bell'],
  makers_fair: ['Royal Licence', 'Fairground', 'Opening Day'],
  tram_extension: ['Survey', 'Roadbed', 'Paving'],
  skybridge: ['Piers', 'Arches', 'Parapets'],
  library_lanterns: ['Archive Vaults', 'Reading Room', 'Seal of the Realm'],
  waterwheel: ['Millrace', 'Waterwheel', 'Millstones'],
  city_illumination: ['Foundations', 'Masonry', 'Fortification'],
  common_fields: ['Clearing', 'Hedgerows', 'First Harvest'],
  merchants_guildhall: ['Cornerstone', 'Great Hall', 'Guild Arms'],
  harbor_beacon: ['Breakwater', 'Lantern Tower', 'First Flame'],
  foundry_gate: ['Gatehouse', 'Portcullis', 'Drawbridge'],
  power_exchange: ['Founders’ Charter', 'Trading Floor', 'Counting House'],
  rail_terminus: ['Staddle Stones', 'Storehouse', 'King’s Seal'],
  aqueduct: ['Springhead', 'Arcades', 'City Fountain'],
};

type Counts = [number, number, number];

/** One-, two- and three-stage Projects at each player count: 7, 9, 11, 12 and 13 investments. */
const SCALED: Record<number, Counts> = { 2: [3, 2, 0], 3: [2, 2, 1], 4: [1, 2, 2], 5: [0, 3, 2], 6: [0, 2, 3] };
const scaled = (n: number): Counts => SCALED[n];
const fixed = (): Counts => [1, 2, 2];

const edition = (version: number, code: string, name: string, text: string, extra: Partial<Ruleset>): Ruleset => ({
  ...RULES,
  version,
  edition: { code, name, text },
  projectsToEnd: () => 5,
  ...extra,
});

const staged = (counts: (n: number) => Counts, extraCoins: number) => ({ staged: { counts, extraCoins, names: STAGE_NAMES } });

export const EDITIONS: Ruleset[] = [
  edition(101, 'C0', 'Trial C0: all five', 'Five single-investment Projects at their usual price. The game can end only when all five are complete, or on the other usual endings.', {}),
  edition(102, 'C1', 'Trial C1: all five, +1 Coin', 'As C0, with every Project costing 1 Coin more.', {
    projects: RULES.projects!.map((p) => ({ ...p, coins: p.coins + 1 })),
  }),
  edition(103, 'F1', 'Trial F1: fixed stages', 'Five Projects of 1, 2, 2, 3 and 3 stages at every player count, at their usual total price.', staged(fixed, 0)),
  edition(104, 'F2', 'Trial F2: fixed stages, +1 Coin', 'As F1, with each Project of 2 or 3 stages costing 1 Coin more in total.', staged(fixed, 1)),
  edition(105, 'S1', 'Trial S1: scaled stages', 'Five Projects with more stages at larger tables: 7, 9, 11, 12 or 13 investments for 2 to 6 players, at their usual total price.', staged(scaled, 0)),
  edition(106, 'S2', 'Trial S2: scaled stages, +1 Coin', 'As S1, with each Project of 2 or 3 stages costing 1 Coin more in total.', staged(scaled, 1)),
];
