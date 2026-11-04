/** Kingdom & Commerce' table rules. CC-* IDs are in docs/CLOCKWORK.md. */
import type { CardDef, ProjectDef, Ruleset } from '../../../engine/deckbuilder';
import { clockworkBot } from './bot';
import { BASICS, buys, coins, CORE, draw, spark, SPARK } from './cards';
import { CROWN, CROWN_WORKS } from './crown';
import { FOUNDRY, HANDLERS, NIGHT, TOWN, TOWN_WORKS } from './expansions';
import { modernise } from './legacy';

/** The Core Projects carry no set, so they are on offer whichever cards are in use. */
const CORE_WORKS: ProjectDef[] = [
  { key: 'canal_lights', name: 'River Quay', coins: 3, tokens: { [SPARK]: 2 }, vp: 4, text: 'Gain 1 Influence.', effects: [spark(1)] },
  { key: 'public_clock', name: 'Bell Tower', coins: 4, tokens: { [SPARK]: 2 }, vp: 5, text: 'Draw 1.', effects: [draw(1)] },
  { key: 'makers_fair', name: 'Charter Fair', coins: 4, tokens: { [SPARK]: 3 }, vp: 6, text: '+1 Buy.', effects: [buys(1)] },
  { key: 'tram_extension', name: 'King’s Road', coins: 5, tokens: { [SPARK]: 3 }, vp: 7, text: '+1 Coin.', effects: [coins(1)] },
  { key: 'skybridge', name: 'Stone Bridge', coins: 6, tokens: { [SPARK]: 3 }, vp: 8, text: 'Gain 1 Influence.', effects: [spark(1)] },
  { key: 'library_lanterns', name: 'Hall of Records', coins: 5, tokens: { [SPARK]: 4 }, vp: 9, text: 'Draw 2.', effects: [draw(2)] },
  { key: 'waterwheel', name: 'River Mill', coins: 6, tokens: { [SPARK]: 4 }, vp: 10, text: '+2 Coins.', effects: [coins(2)] },
  { key: 'city_illumination', name: 'City Walls', coins: 8, tokens: { [SPARK]: 5 }, vp: 13, text: 'Gain 2 Influence.', effects: [spark(2)] },
];

/** Edition 2: frozen for rooms already in progress. Change these only to fix wording. */
export const WORKS_V2: ProjectDef[] = [...CORE_WORKS, ...TOWN_WORKS];
export const CARDS_V2: CardDef[] = [...BASICS, ...CORE, ...FOUNDRY, ...NIGHT, ...TOWN];

export const WORKS: ProjectDef[] = [...WORKS_V2, ...CROWN_WORKS];
export const CARDS: CardDef[] = [...CARDS_V2, ...CROWN];

/** Cards that can hand out Debt. The pile only appears when one of them is in the market. */
const RUST_MAKERS_V2 = new Set(['corrosion_crew', 'redline_boiler', 'pressure_test', 'overload_relay']);
const RUST_MAKERS = new Set([...RUST_MAKERS_V2, 'tax_arrears']);

const prestigePile = (n: number) => (n <= 2 ? 8 : n <= 4 ? 12 : n === 5 ? 15 : 18);

export const RULES_V2: Ruleset = {
  id: 'clockwork',
  version: 2,
  name: 'Kingdom & Commerce',
  minPlayers: 2,
  maxPlayers: 6,
  cards: CARDS_V2,
  startingDeck: [
    { key: 'scrap', count: 7 },
    { key: 'notebook', count: 3 },
  ],
  handSize: 5,
  marketSize: 10,
  basicPiles(n) {
    const prestige = prestigePile(n);
    return { scrap: 60, cog: 40, dynamo: 30, notebook: prestige, blueprint: prestige, monument: prestige };
  },
  extraPiles: (market, n): Record<string, number> => (market.some((k) => RUST_MAKERS_V2.has(k)) ? { rust: 10 * (n - 1) } : {}),
  marketPileSize: (_key, n) => (n <= 4 ? 10 : 12),
  endPiles: ['monument'],
  emptyPilesToEnd: (n) => (n >= 5 ? 4 : 3),
  emptyMarketPilesOnly: true,
  projects: WORKS_V2,
  projectCount: 5,
  projectsToEnd: () => 4,
  tokenCaps: { [SPARK]: 8 },
  convert: { token: SPARK, coinsEach: 1, maxPerTurn: 2 },
  lateTreasures: true,
  handlers: HANDLERS,
  sets: [
    { key: 'core', name: 'Core Set', text: 'The 36 original designs and 8 Crown Projects.' },
    { key: 'foundry', name: 'Artisans’ Row', text: 'Economy, combinations, deck cycling and lasting Establishments.' },
    { key: 'night', name: 'Rival Houses', text: 'Attacks, defences and big payoffs that leave Royal Debt behind.' },
    { key: 'town', name: 'The Chancery', text: 'Crown Projects rivalry, 5 more Projects and other ways to score.' },
  ],
  defaultSets: ['core'],
  labels: {
    actionPhase: 'Royal Court',
    buyPhase: 'Market',
    action: 'Action',
    actions: 'Actions',
    treasure: 'Currency',
    treasures: 'Currency cards',
    points: 'Renown',
    project: 'Crown Project',
    projects: 'Crown Projects',
    tokens: { [SPARK]: 'Influence' },
  },
  present: modernise,
  bot: (view) => clockworkBot(view),
};

/** Edition 3, for every new game: the Crown Decree set, and a smaller Debt pile (KC3-DEBT-1). */
export const RULES: Ruleset = {
  ...RULES_V2,
  version: 3,
  cards: CARDS,
  projects: WORKS,
  extraPiles: (market, n): Record<string, number> => (market.some((k) => RUST_MAKERS.has(k)) ? { rust: 5 * (n - 1) } : {}),
  sets: [...RULES_V2.sets!, { key: 'crown', name: 'Crown Decrees', text: 'Trashing and exchange, stronger Currency, new attacks and defences, and 2 more Crown Projects.' }],
  defaultSets: ['core', 'crown'],
};
