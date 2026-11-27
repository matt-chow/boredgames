import type { GameModule, OptionDescriptor } from '../../engine/types';
import {
  actors, apply, botActions, defaultConfig, MAX_CARS, project, results, retainMs, sanitizeConfig, setup, STATE_VERSION, tick,
  validateConfig, wakeAt, type AAction, type AConfig, type AState, type AView,
} from './rules/engine';

const SEATS = [1, 2, 3, 4, 5, 6];
const toggle = (key: string, label: string, description: string): OptionDescriptor => ({ key, label, description, playerCounts: SEATS });

/**
 * One to six people and up to eight cars; computer cars fill the grid without taking seats. The grace period is long,
 * because the race itself pauses for an absent driver (AX-NET-2) and the host can hand the car to the computer.
 */
export const apex: GameModule<AConfig, AState, AAction, AView> = {
  meta: { id: 'apex', name: "Apex '66", minPlayers: 1, maxPlayers: 6, stateVersion: STATE_VERSION, simultaneous: true, graceMs: 30 * 60_000 },
  options: [
    toggle('storm', 'Storm Front', 'Weather is drawn before each race: rain lowers corner limits, a downpour floods sectors.'),
    toggle('mountains', 'Through the Mountains', 'Tunnels are single file and mountain passes have their own limits.'),
    toggle('dust', 'Dust & Gravel', 'An extra Stress card, and gravel that strains a fast car.'),
    toggle('rivals', 'Racing Rivals', 'Computer cars may be named rivals, each with one ability.'),
    toggle('basic', 'Basic upgrades', 'Draft from the 24 basic upgrades.'),
    toggle('advanced', 'Advanced upgrades', 'Draft from the 24 advanced upgrades.'),
    toggle('environmental', 'Environmental upgrades', 'Draft from the 16 environmental upgrades (only those whose module is on).'),
    toggle('sponsors', 'Sponsors', 'Each championship driver carries a sponsor with a bonus condition.'),
    toggle('press', 'Press objectives', 'Two public objectives each race pay bonus points.'),
    toggle('events', 'Pre-race events', 'A random event changes each race.'),
  ],
  defaultConfig,
  validateConfig,
  sanitizeConfig,
  setup: ({ playerCount, seed, config }) => setup(playerCount, seed, config),
  apply,
  // Plans name cards in hand: the room's history only keeps what kind of action it was.
  historyAction: (a) => ({ type: (a as AAction).type }),
  actors,
  project,
  isOver: (s) => s.phase === 'over',
  results,
  bot: (v, standIn) => {
    const actions = botActions(v);
    return actions.length ? { actions, delayMs: standIn ? 400 : 900 } : null;
  },
  tick,
  wakeAt,
  retainMs,
};

export { MAX_CARS };
