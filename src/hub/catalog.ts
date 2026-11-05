import type { Component } from 'svelte';
import type { GuideDoc } from './guide';

/**
 * What the hub shows for each game. Kept client-side so the home page needs no request and no rules code;
 * tests/hub/catalog.test.ts checks it against the server registry. Adding a game here is all the home page needs.
 */
export interface CatalogEntry {
  /** The stable id rooms are saved under. Never changes with a display name. */
  id: string;
  name: string;
  /** `soon` games are shown as unavailable and never get a table. */
  status: 'available' | 'soon';
  minPlayers: number;
  maxPlayers: number;
  minutes: string;
  pitch: string;
  /** Box art for the details panel, from public/art/covers. A missing or broken cover draws a plain box in `accent`. */
  cover?: string;
  /** The game's own cards, fanned on the home page and loaded on demand. Without it the fan is blank cards in `accent`. */
  fan?: () => Promise<{ default: Component }>;
  accent: string;
  /** The title's typeface, where the shared stencil doesn't suit the game. */
  titleFont?: string;
  /** The rules in a few lines. The full guide for a game is at its table. */
  howTo: string[];
  guide?: () => Promise<{ guide: GuideDoc; guideFor?: (edition?: string | null) => GuideDoc }>;
  /** What the host can set in the room before starting. */
  settings: string[];
}

export const CATALOG: CatalogEntry[] = [
  {
    id: 'bohnanza',
    name: 'Bohnanza',
    status: 'available',
    minPlayers: 3,
    maxPlayers: 5,
    minutes: '45',
    pitch: 'Plant beans in the order you drew them, trade hard for the ones you need, and harvest for coins.',
    cover: '/art/covers/bohnanza.svg',
    fan: () => import('../games/bohnanza/ui/Fan.svelte'),
    guide: () => import('../games/bohnanza/ui/guide'),
    accent: '#5d7a2c',
    howTo: [
      'You must plant from the front of your hand, and your hand never changes order.',
      'Each field holds one kind of bean. Harvest a field for coins when it pays.',
      'Trade with anyone on the active player’s turn, including cards you turned up.',
      'Most coins when the deck runs out for the third time wins.',
    ],
    settings: ['Three New Bean Types', 'The Field Bean', 'AMIGO Bean Coin', 'Magpie Bean'],
  },
  {
    id: 'clockwork',
    name: 'Kingdom & Commerce',
    status: 'available',
    minPlayers: 2,
    maxPlayers: 6,
    minutes: '30-50',
    pitch: 'Build a house of trade and court, spend Influence wisely, and race rival houses to finish the Crown Projects.',
    cover: '/art/covers/kingdom-commerce.svg',
    fan: () => import('../games/clockwork/ui/Fan.svelte'),
    guide: () => import('../games/clockwork/ui/guide'),
    titleFont: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    accent: '#783547',
    howTo: [
      'Royal Court: play Actions and Establishments. An Establishment stays out and works again at the start of your next turn.',
      'Market: play Currency, turn Influence into Coins, buy from the permanent supply or the 10 market piles, or fund the next stage of a Crown Project.',
      'Cleanup: discard everything and draw 5. Your purchases come round as your deck reshuffles.',
      'Influence carries between turns. When an end condition is met the round finishes, so everyone has equal turns. Most Renown wins, and it stays private until then.',
    ],
    settings: ['Which card sets are in play', 'A random or hand-picked market of 10', 'Banned cards', 'Crown Project selection', 'Market codes to share a setup'],
  },
  {
    id: 'next',
    name: 'Next game',
    status: 'soon',
    minPlayers: 0,
    maxPlayers: 0,
    minutes: '',
    pitch: 'More games are on the way, each with its own cards and its own look.',
    accent: '#4a4038',
    howTo: [],
    settings: [],
  },
];
