import type { Component } from 'svelte';
import type { RoomConnection } from '../client/lib/connection.svelte';
import type { RoomView } from '../shared/protocol';

/** Props every game table receives from the hub. */
export interface GameUiProps {
  conn: RoomConnection;
  room: RoomView;
}

/**
 * UI registration for each game module, loaded on demand so the hub's
 * initial bundle stays small. Keys match `GAMES` in ./registry.ts.
 */
export const GAME_UI: Record<string, () => Promise<{ default: Component<GameUiProps> }>> = {
  bohnanza: () => import('./bohnanza/ui/Table.svelte'),
  clockwork: () => import('./clockwork/ui/ClockworkTable.svelte'),
  deaddrop: () => import('./deaddrop/ui/Table.svelte'),
  tally: () => import('./tally/TallyTable.svelte'),
  ...(__DECK_BENCH__ ? { fixture: () => import('./deck/ui/DeckTable.svelte') } : {}),
};

/** A game's look, loaded as soon as its room is known so the lobby is dressed too. Scoped to its rooms by data-game-theme. */
export const GAME_THEME: Record<string, () => Promise<unknown>> = {
  clockwork: () => import('./clockwork/ui/theme.css'),
  deaddrop: () => import('./deaddrop/ui/theme.css'),
};

/** Optional game-specific section of the lobby, for settings a list of switches can't express. */
export const GAME_SETUP: Record<string, () => Promise<{ default: Component<GameUiProps> }>> = {
  clockwork: () => import('./clockwork/ui/ClockworkSetup.svelte'),
  deaddrop: () => import('./deaddrop/ui/Setup.svelte'),
  ...(__DECK_BENCH__ ? { fixture: () => import('./deck/ui/MarketSetup.svelte') } : {}),
};
