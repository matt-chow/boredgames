/** Kingdom & Commerce' table rules. CC-* IDs are in docs/CLOCKWORK.md. */
import type { CardDef, ProjectDef, Ruleset } from '../../../engine/deckbuilder';
import { clockworkBot } from './bot';
import { BASICS, buys, coins, CORE, draw, spark, SPARK } from './cards';
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

export const WORKS: ProjectDef[] = [...CORE_WORKS, ...TOWN_WORKS];
export const CARDS: CardDef[] = [...BASICS, ...CORE, ...FOUNDRY, ...NIGHT, ...TOWN];

/** Cards that can hand out Debt. The pile only appears when one of them is in the market. */
const RUST_MAKERS = new Set(['corrosion_crew', 'redline_boiler', 'pressure_test', 'overload_relay']);

const prestigePile = (n: number) => (n <= 2 ? 8 : n <= 4 ? 12 : n === 5 ? 15 : 18);

export const RULES: Ruleset = {
  id: 'clockwork',
  name: 'Kingdom & Commerce',
  minPlayers: 2,
  maxPlayers: 6,
  cards: CARDS,
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
  extraPiles: (market, n): Record<string, number> => (market.some((k) => RUST_MAKERS.has(k)) ? { rust: 10 * (n - 1) } : {}),
  marketPileSize: (_key, n) => (n <= 4 ? 10 : 12),
  endPiles: ['monument'],
  emptyPilesToEnd: (n) => (n >= 5 ? 4 : 3),
  emptyMarketPilesOnly: true,
  projects: WORKS,
  projectCount: 5,
  projectsToEnd: () => 4,
  tokenCaps: { [SPARK]: 8 },
  convert: { token: SPARK, coinsEach: 1, maxPerTurn: 2 },
  lateTreasures: true,
  handlers: HANDLERS,
  sets: [
    { key: 'core', name: 'Core Set', text: 'The 36 original designs and 8 Crown Projects.' },
    { key: 'foundry', name: 'Artisans’ Row', text: 'Economy, combinations, deck cycling and lasting Establishments.' },
    { key: 'night', name: 'Rival Houses', text: 'Attacks, defences and big payoffs that leave Debt behind.' },
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
