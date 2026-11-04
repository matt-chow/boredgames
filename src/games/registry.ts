import type { AnyGameModule } from '../engine/types';
import { bohnanza } from './bohnanza';
import { clockwork } from './clockwork';
import { deckbench } from './deckbench';
import { tally } from './tally';

/** Server-side rules registry. Adding a game = one import + one entry. */
export const GAMES: Record<string, AnyGameModule> = {
  [bohnanza.meta.id]: bohnanza,
  [clockwork.meta.id]: clockwork,
  [tally.meta.id]: tally,
  ...(__DECK_BENCH__ ? { [deckbench.meta.id]: deckbench } : {}),
};

/** Games offered in the hub UI (the tally module is a test fixture). */
export const LISTED_GAMES = ['bohnanza', 'clockwork'];

/** Games a new room may be created for: the listed ones, plus the deck bench on a bench dev server. */
export const HOSTABLE_GAMES = __DECK_BENCH__ ? [...LISTED_GAMES, deckbench.meta.id] : LISTED_GAMES;
