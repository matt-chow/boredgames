import type { GameModule } from '../../engine/types';
import { RULESET_NAMES, RULESET_PLAYERS } from './rules/cards';
import { actors, apply, project, results, setup } from './rules/engine';
import { TARGET_MAX, TIMER_CHOICES, type SAction, type SConfig, type SState, type SView } from './rules/types';

/** Two to six people, no bots: a seat is always a person, and an absent one is waited for (SC-NET3). */
export const sealed: GameModule<SConfig, SState, SAction, SView> = {
  meta: { id: 'sealed', name: 'Sealed Correspondence', minPlayers: 2, maxPlayers: 6, stateVersion: 1, simultaneous: true, graceMs: 90_000 },
  options: [],
  defaultConfig: () => ({ ruleset: 'classic', target: 0, timer: 0 }),
  validateConfig(c, n) {
    const [lo, hi] = RULESET_PLAYERS[c.ruleset] ?? [0, 0];
    // SC-SET6: never change the ruleset for the host; say what would make the table playable.
    if (c.ruleset === 'classic' && n > hi) return `Classic is for ${lo} to ${hi} players. With ${n}, switch to the Expanded ruleset (21 cards) to start.`;
    if (n < lo || n > hi) return `${RULESET_NAMES[c.ruleset]} is for ${lo} to ${hi} players.`;
    return null;
  },
  sanitizeConfig(raw) {
    const out: Partial<SConfig> = {};
    if (raw.ruleset !== undefined) {
      if (raw.ruleset !== 'classic' && raw.ruleset !== 'expanded') return { error: 'That ruleset is not one of the choices.' };
      out.ruleset = raw.ruleset;
    }
    if (raw.target !== undefined) {
      if (!Number.isInteger(raw.target) || (raw.target as number) < 0 || (raw.target as number) > TARGET_MAX) return { error: `Choose a target from 1 to ${TARGET_MAX} favors.` };
      out.target = raw.target as number;
    }
    if (raw.timer !== undefined) {
      if (!TIMER_CHOICES.includes(raw.timer as number)) return { error: 'That timer is not one of the choices.' };
      out.timer = raw.timer as number;
    }
    return { config: out };
  },
  setup: ({ playerCount, seed, config, now }) => setup(playerCount, seed, config, now),
  apply,
  // Actions name cards and guesses: the room's history only keeps what kind of action it was.
  historyAction: (a) => ({ type: (a as SAction).type }),
  actors,
  project,
  isOver: (s) => s.phase === 'over',
  results,
};
