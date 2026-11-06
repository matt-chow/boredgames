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
  /** How many of a player's consecutive undoable actions can be taken back. One if not set. */
  undoSteps?: number;
  /** Everyone acts at once and `apply` guards each action itself, so an action is never refused for a stale room version. */
  simultaneous?: boolean;
  /** Every seat must mark itself ready in the lobby before the game can start. */
  readyCheck?: boolean;
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
  /** The server's clock, for a game with timestamps or phase clocks. */
  now?: number;
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

/** What a computer player wants to do: candidate actions, best first, and how long to wait before acting. */
export interface BotMove<Action> {
  actions: Action[];
  delayMs: number;
}

export interface GameModule<Config = unknown, State = unknown, Action = unknown, View = unknown> {
  meta: GameMeta;
  options: OptionDescriptor[];
  defaultConfig(playerCount: number): Config;
  /** Returns a human-readable reason when the combination is unsupported. */
  validateConfig(config: Config, playerCount: number): string | null;
  /**
   * Clean the non-boolean settings in an untrusted `config` message. Returns the fields to store, or a reason to
   * refuse the message. Games with only boolean options leave this out.
   */
  sanitizeConfig?(raw: Record<string, unknown>): { config: Partial<Config> } | { error: string };
  /** Trial rules a host may pick through `config.edition`, on a server with experiments on. */
  editions?: { code: string; name: string; text: string }[];
  setup(ctx: SetupContext<Config>): State;
  /**
   * Validate and apply an action by `seat`. Must not mutate `state`.
   * `undoable` tells the host whether this action may later be reverted by
   * its author (only when it revealed no hidden information).
   * `now` is the server's clock; rules must not read any other.
   */
  apply(state: State, seat: number, action: Action, now?: number): ApplyResult<State>;
  /** What may be written to the room's history for this action, where the action itself holds a secret. */
  historyAction?(action: Action): unknown;
  /** Seats that currently have something they may or must do. */
  actors(state: State): number[];
  /** The authorized view for a seat (or `null` for an unseated observer). */
  project(state: State, viewer: number | null): View;
  isOver(state: State): boolean;
  results(state: State): PlayerResult[] | null;
  /**
   * Optional simple computer player for a seat. It receives only that seat's
   * projection, so a bot never sees more than a person would. Returns null
   * when the seat has nothing to do.
   */
  bot?(view: View): BotMove<Action> | null;
  /** Upgrade persisted state from an older `stateVersion`. */
  migrate?(state: unknown, fromVersion: number): State;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any, any, any, any>;
