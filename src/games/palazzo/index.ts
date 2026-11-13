import type { GameModule } from '../../engine/types';
import { actors, apply, project, results, setup, tick, wakeAt } from './rules/engine';
import { TIMER_CHOICES, type PAction, type PConfig, type PState, type PView } from './rules/types';

/**
 * Two to six people, no bots: nothing is ever chosen for a player (PZ-NET5). The room's grace period is long, because
 * the game itself pauses for an absent player; the room only closes once everyone has been gone that long.
 */
export const palazzo: GameModule<PConfig, PState, PAction, PView> = {
  meta: { id: 'palazzo', name: 'Palazzo', minPlayers: 2, maxPlayers: 6, stateVersion: 1, simultaneous: true, graceMs: 10 * 60_000 },
  options: [],
  defaultConfig: () => ({ timer: 15, disconnect: 'pause', draft: false }),
  validateConfig: () => null,
  sanitizeConfig(raw) {
    const out: Partial<PConfig> = {};
    if (raw.timer !== undefined) {
      if (!TIMER_CHOICES.includes(raw.timer as PConfig['timer'])) return { error: 'That timer is not one of the choices.' };
      out.timer = raw.timer as PConfig['timer'];
    }
    if (raw.disconnect !== undefined) {
      if (raw.disconnect !== 'pause' && raw.disconnect !== 'continue') return { error: 'That disconnect rule is not one of the choices.' };
      out.disconnect = raw.disconnect;
    }
    if (raw.draft !== undefined) {
      if (typeof raw.draft !== 'boolean') return { error: 'The draft is either on or off.' };
      out.draft = raw.draft;
    }
    return { config: out };
  },
  setup: ({ playerCount, seed, config, now, winners }) => setup(playerCount, seed, config, now, winners),
  apply,
  // Actions name cards: the room's history only keeps what kind of action it was.
  historyAction: (a) => ({ type: (a as PAction).type }),
  actors,
  project,
  isOver: (s) => s.phase === 'over',
  results,
  tick,
  wakeAt,
};
