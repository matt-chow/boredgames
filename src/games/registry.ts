import type { AnyGameModule } from '../engine/types';
import { bohnanza } from './bohnanza';
import { tally } from './tally';

/** Server-side rules registry. Adding a game = one import + one entry. */
export const GAMES: Record<string, AnyGameModule> = {
  [bohnanza.meta.id]: bohnanza,
  [tally.meta.id]: tally,
};

/** Games offered in the hub UI (the tally module is a test fixture). */
export const LISTED_GAMES = ['bohnanza'];
