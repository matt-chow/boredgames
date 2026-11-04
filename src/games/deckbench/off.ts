import type { AnyGameModule } from '../../engine/types';

/** Stands in for the deck bench in every build (see vite.config.ts), so its fixture cards are never bundled. */
export const deckbench = null as unknown as AnyGameModule;
