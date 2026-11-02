import type { GameModule } from '../../engine/types';
import { BEANS } from './rules/cards';
import { DEFAULT_CONFIG, OPTIONS, normalizeConfig, validateConfig, type BohnanzaConfig } from './rules/config';
import { actors, apply, setup } from './rules/engine';
import { STATE_VERSION, type BAction, type BState } from './rules/state';
import { project, type BView } from './rules/view';

export const bohnanza: GameModule<BohnanzaConfig, BState, BAction, BView> = {
  meta: { id: 'bohnanza', name: 'Bohnanza', minPlayers: 3, maxPlayers: 5, stateVersion: STATE_VERSION },
  options: OPTIONS,
  defaultConfig: () => ({ ...DEFAULT_CONFIG }),
  validateConfig: (c, n) => validateConfig(normalizeConfig(c), n),
  setup: (ctx) => setup({ ...ctx, config: normalizeConfig(ctx.config) }),
  apply,
  actors,
  project,
  isOver: (s) => s.phase === 'over',
  results: (s) => s.result,
  migrate(state, from) {
    if (from === STATE_VERSION) return state as BState;
    throw new Error(`No migration from Bohnanza state v${from}`);
  },
};

export { BEANS };
export type { BohnanzaConfig, BState, BAction, BView };
