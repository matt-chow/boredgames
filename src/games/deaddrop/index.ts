import type { GameModule } from '../../engine/types';
import { actors, apply, project, results, setup } from './rules/engine';
import type { DAction, DState, DView } from './rules/types';

/** Two people, four locations, seven rounds at most. There are no bots: a seat is always a person. */
export const deaddrop: GameModule<Record<string, never>, DState, DAction, DView> = {
  meta: { id: 'deaddrop', name: 'Dead Drop', minPlayers: 2, maxPlayers: 2, stateVersion: 1, simultaneous: true, readyCheck: true },
  options: [],
  defaultConfig: () => ({}),
  validateConfig: (_, n) => (n === 2 ? null : 'Dead Drop is for exactly two players.'),
  setup: ({ seed, now }) => setup(seed, now),
  apply,
  // Orders and chat are secret or personal; the history row only ever says what kind of action it was.
  historyAction: (a) => ({ type: (a as DAction).type }),
  actors,
  project,
  isOver: (s) => s.phase === 'over',
  results,
};
