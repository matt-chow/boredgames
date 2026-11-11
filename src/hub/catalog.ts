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
  /** Only people can play it: no practising with bots. Matches a module without a `bot`. */
  noBots?: boolean;
}

export const CATALOG: CatalogEntry[] = ([
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
    id: 'deaddrop',
    name: 'Dead Drop',
    status: 'available',
    minPlayers: 2,
    maxPlayers: 2,
    minutes: '8-12',
    pitch: 'Two rival agents, four locations, one city. Talk, lie and watch the signals: deliver your packages or catch your rival in the act.',
    cover: '/art/covers/dead-drop.svg',
    fan: () => import('../games/deaddrop/ui/Fan.svelte'),
    guide: () => import('../games/deaddrop/ui/guide'),
    accent: '#6f2334',
    howTo: [
      'Each of you has two secret mission locations. Each round you both choose in secret: Deliver, Investigate, Intercept or Decoy.',
      'Before orders, talk freely and file at least one formal statement. Either can be a lie. You have one Challenge token to call one out.',
      'Every order sends the same public signal, so nobody can tell a delivery from a decoy. Intercept a real delivery to block and score it.',
      'Three deliveries covering both your locations wins. So do two interceptions. After seven rounds, deliveries, then interceptions, then Challenge Points decide it.',
    ],
    settings: ['Nothing to set: both players press Ready and the host starts'],
    noBots: true,
  },
  {
    id: 'mines',
    name: 'Miners & Saboteurs',
    status: 'available',
    minPlayers: 2,
    maxPlayers: 10,
    minutes: '20-40',
    pitch: 'Dig a tunnel to the gold, if you really are a miner. Hidden roles, broken tools and cave-ins, in three modes from a duel to ten players.',
    cover: '/art/covers/mines.svg',
    fan: () => import('../games/mines/ui/Fan.svelte'),
    guide: () => import('../games/mines/ui/guide'),
    accent: '#8a5a24',
    howTo: [
      'Each round you are secretly a miner or a saboteur. Lay tunnel cards from the entrance toward three hidden destinations: one is gold.',
      'Instead of digging, break another player’s tools, mend them, survey a destination or bring a tunnel down.',
      'Reach the gold and the miners share gold cards. Run out of cards first and the saboteurs are paid.',
      'Expanded Mining adds rival crews, gates, crystals and theft; the Prospector Duel is a race for two. Most gold after the last round wins.',
    ],
    settings: ['Mode: Classic (3–10), Expanded (2–10) or Prospector Duel (2)', 'Rounds, an optional gold target and a turn timer', 'Wait for, or pass for, a player who drops out'],
  },
  {
    id: 'sealed',
    name: 'Sealed Correspondence',
    status: 'available',
    minPlayers: 2,
    maxPlayers: 6,
    minutes: '15-30',
    pitch: 'One sealed letter in your hand, a court full of schemers around you. Deduce, bluff and outlast the table to win the crown’s favor.',
    cover: '/art/covers/sealed.webp',
    fan: () => import('../games/sealed/ui/Fan.svelte'),
    guide: () => import('../games/sealed/ui/guide'),
    accent: '#7c2233',
    howTo: [
      'Each round you hold one card: a member of the court, valued 0 to 9.',
      'On your turn draw a second card, then play one. Its ability happens at once: look at a hand, compare cards, swap, protect yourself or name a rival’s card to put them out.',
      'Be the last player in, or hold the highest card when the deck runs out, to win a favor.',
      'The first to the target number of favors wins. Classic is 16 cards for 2–4 players; Expanded is 21 cards for 2–6.',
    ],
    settings: ['Ruleset: Classic (2–4) or Expanded (2–6)', 'Favors to win: recommended for the table, or 1–15', 'An optional turn timer that only warns'],
    noBots: true,
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
] satisfies CatalogEntry[]).filter((g) => __DEAD_DROP__ || g.id !== 'deaddrop');
