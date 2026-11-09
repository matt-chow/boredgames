import type { GameModule } from '../../engine/types';
import { botMove } from './rules/bot';
import { MODE_NAMES } from './rules/cards';
import { actors, apply, project, results, setup } from './rules/engine';
import { ROUND_CHOICES, TARGET_CHOICES, TIMER_CHOICES, type MAction, type MConfig, type MState, type MView } from './rules/types';

const MODES = { classic: [3, 10], expanded: [2, 10], duel: [2, 2] } as const;

export const mines: GameModule<MConfig, MState, MAction, MView> = {
  meta: { id: 'mines', name: 'Miners & Saboteurs', minPlayers: 2, maxPlayers: 10, stateVersion: 2, simultaneous: true },
  options: [],
  defaultConfig: () => ({ mode: 'classic', rounds: 3, target: 0, timer: 0, away: 'pause' }),
  validateConfig(c, n) {
    const [lo, hi] = MODES[c.mode] ?? [0, 0];
    if (n < lo || n > hi)
      return c.mode === 'classic' && n === 2
        ? 'Classic Mining needs 3 to 10 players. For two, choose Expanded Mining or the Prospector Duel.'
        : `${MODE_NAMES[c.mode]} is for ${lo === hi ? lo : `${lo} to ${hi}`} players.`;
    return null;
  },
  sanitizeConfig(raw) {
    const out: Partial<MConfig> = {};
    const pickFrom = <T>(k: keyof MConfig, list: readonly T[]) => {
      if (raw[k] === undefined) return true;
      if (!list.includes(raw[k] as T)) return false;
      (out as Record<string, unknown>)[k] = raw[k];
      return true;
    };
    const ok =
      pickFrom('mode', Object.keys(MODES)) &&
      pickFrom('rounds', ROUND_CHOICES) &&
      pickFrom('target', TARGET_CHOICES) &&
      pickFrom('timer', TIMER_CHOICES) &&
      pickFrom('away', ['pause', 'autopass']);
    return ok ? { config: out } : { error: 'That setting is not one of the choices.' };
  },
  setup: ({ playerCount, seed, config, now }) => setup(playerCount, seed, config, now),
  apply,
  // Actions name cards, squares and targets: kept out of the room's history so a log never hints at a hand.
  historyAction: (a) => ({ type: (a as MAction).type }),
  actors,
  project,
  // v2: log lines carry an id from the chat sequence and a time. Older lines are numbered after the chat, timed at the turn start.
  migrate(raw, from) {
    const s = raw as MState & { nextChat?: number };
    if (from < 2) {
      s.nextId = s.nextChat ?? 1;
      delete s.nextChat;
      for (const e of s.log) Object.assign(e, { id: s.nextId++, at: s.since });
    }
    return s;
  },
  isOver: (s) => s.phase === 'over',
  results,
  bot: botMove,
};
