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
  tally: () => import('./tally/TallyTable.svelte'),
};
