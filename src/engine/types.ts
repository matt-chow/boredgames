/**
 * The typed contract between the hub (rooms, networking, persistence) and a
 * game's rules. Implementations must be pure TypeScript: no DOM, no Svelte,
 * no Cloudflare APIs. All randomness must come from state carried in the
 * game state itself so games are reproducible from (seed, action log).
 */

export interface GameMeta {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  /** Bumped when the persisted state shape changes; see `migrate`. */
  stateVersion: number;
}

/** A toggleable option shown in the room setup UI. */
export interface OptionDescriptor {
  key: string;
  label: string;
  description: string;
  /** Player counts this option can ever be enabled for. */
  playerCounts: number[];
  /** Shown but never selectable (e.g. a 2-player-only variant). */
  unavailableReason?: string;
}

export interface SetupContext<Config> {
  playerCount: number;
  seed: string;
  config: Config;
}

export type ApplyResult<State> =
  | { ok: true; state: State; undoable: boolean }
  | { ok: false; code: string; error: string };

export interface PlayerResult {
  seat: number;
  score: number;
  rank: number;
  winner: boolean;
  detail?: string;
}

export interface GameModule<Config = unknown, State = unknown, Action = unknown, View = unknown> {
  meta: GameMeta;
  options: OptionDescriptor[];
  defaultConfig(playerCount: number): Config;
  /** Returns a human-readable reason when the combination is unsupported. */
  validateConfig(config: Config, playerCount: number): string | null;
  setup(ctx: SetupContext<Config>): State;
  /**
   * Validate and apply an action by `seat`. Must not mutate `state`.
   * `undoable` tells the host whether this action may later be reverted by
   * its author (only when it revealed no hidden information).
   */
  apply(state: State, seat: number, action: Action): ApplyResult<State>;
  /** Seats that currently have something they may or must do. */
  actors(state: State): number[];
  /** The authorized view for a seat (or `null` for an unseated observer). */
  project(state: State, viewer: number | null): View;
  isOver(state: State): boolean;
  results(state: State): PlayerResult[] | null;
  /** Upgrade persisted state from an older `stateVersion`. */
  migrate?(state: unknown, fromVersion: number): State;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any, any, any, any>;
