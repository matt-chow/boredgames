import type { RngState } from '../../../engine/rng';
import type { ActionKind, GoalKind, Role, Ruleset, Tool } from './cards';

export type Rot = 0 | 1;
export type Away = 'pause' | 'autopass';

export interface MConfig {
  mode: Ruleset;
  rounds: number;
  /** Ends the game after the first complete round in which someone has at least this much gold. 0 = no target. */
  target: number;
  /** Seconds a turn may run before anyone may end it with a non-strategic pass. 0 = unlimited. */
  timer: number;
  /** What a seat's stand-in does once its player has been gone past the grace period. */
  away: Away;
}

export const ROUND_CHOICES = [1, 3, 5, 10];
export const TARGET_CHOICES = [0, 10, 15, 20, 30];
export const TIMER_CHOICES = [0, 30, 60, 90, 120];

export interface Card {
  id: number;
  kind: string;
}

/** A card on the board. Goals become cells when they are turned face up. */
export interface Cell {
  kind: string;
  rot: Rot;
  by?: number;
}

export interface Goal {
  x: number;
  y: number;
  kind: GoalKind;
  revealed: boolean;
}

/** Something a seat learned in secret. Kept after it stops being true: it records what was seen, and when. */
export type Observation =
  | { t: 'survey'; round: number; goal: number; kind: GoalKind }
  | { t: 'inspect'; round: number; seat: number; role: Role };

export interface Seat {
  hand: Card[];
  role: Role | null;
  broken: Tool[];
  theft: boolean;
  trap: boolean;
  /** Total so far. Private until the game ends. */
  gold: number;
  /** Classic reward cards taken, by value. Private. */
  rewards: number[];
  seen: Observation[];
}

/** One public line of what happened. Never carries a hand, a deck card, a role or a secret result. */
export type LogLine =
  | { t: 'path'; seat: number; kind: string; x: number; y: number; rot: Rot }
  | { t: 'act'; seat: number; kind: ActionKind; on?: number; tool?: Tool; goal?: number; x?: number; y?: number }
  | { t: 'pass'; seat: number; n: number; auto?: boolean }
  | { t: 'clear'; seat: number; card: 'pick' | 'lamp' | 'cart' | 'theft' | 'trap' }
  | { t: 'reveal'; goal: number; kind: GoalKind }
  | { t: 'pick'; seat: number; auto?: boolean }
  | { t: 'steal'; seat: number; from: number | null }
  | { t: 'round'; round: number; start: number }
  /** A move is over: how many cards its player drew (a public count) and whose turn it is now, if the round goes on. */
  | { t: 'draw'; seat: number; n: number; next: number | null };

/** A log line as kept: `id` is shared with chat, so the two merge in the server's order; `at` is the server's time. */
export type LogEntry = LogLine & { id: number; at: number };

export interface Payout {
  seat: number;
  /** Gold this round, before theft. */
  gold: number;
  why: string;
}

/** What everyone learns when a round ends. Gold is per-round and public only where the rules make it public. */
export interface RoundRecord {
  round: number;
  /** 'gold': someone reached it. 'dry': cards ran out first. */
  end: 'gold' | 'dry';
  /** Who opened the round. */
  start: number;
  finder: number | null;
  roles: (Role | null)[];
  winners: number[];
  /** Expanded and duel pay is public by the table; classic draft cards stay private. */
  payouts: Payout[];
  /** Who stole from whom, in order. */
  steals: { seat: number; from: number | null }[];
  crystals: number;
}

export interface MChat {
  id: number;
  seat: number;
  text?: string;
  react?: string;
  at: number;
}

export type Phase = 'play' | 'draft' | 'theft' | 'over';

export interface MState {
  config: MConfig;
  rng: RngState;
  n: number;
  round: number;
  phase: Phase;
  /** Bumped by every move; each action names the turn it was meant for, so a late or doubled one is refused. */
  turn: number;
  current: number;
  opener: number;
  /** When the current seat's wait began, for the turn timer. */
  since: number;
  deck: Card[];
  removed: Card[];
  discards: number;
  cells: Record<string, Cell>;
  goals: Goal[];
  seats: Seat[];
  /** Roles nobody was dealt, then any discarded by a role swap. Never shown. */
  spareRoles: Role[];
  /** Classic reward deck. */
  rewardDeck: number[];
  draft: { cards: number[]; picker: number } | null;
  /** Thieves still to steal, in order. */
  thieves: number[];
  /** Seats in the order their Pickpocket was laid this round, for the steal order. */
  theftOrder: number[];
  lastActor: number;
  pending: RoundRecord | null;
  log: LogEntry[];
  rounds: RoundRecord[];
  chat: MChat[];
  /** The next id for a log line or a chat message (one sequence for both). */
  nextId: number;
}

export type MAction =
  | { type: 'path'; turn: number; card: number; x: number; y: number; rot: Rot }
  | { type: 'act'; turn: number; card: number; on?: number; tool?: Tool; goal?: number; x?: number; y?: number }
  | { type: 'pass'; turn: number; cards: number[] }
  | { type: 'clear'; turn: number; cards: number[]; clear: 'pick' | 'lamp' | 'cart' | 'theft' | 'trap' }
  | { type: 'pick'; turn: number; index: number }
  | { type: 'steal'; turn: number; from: number | null }
  | { type: 'timeout'; turn: number }
  | { type: 'chat'; text: string }
  | { type: 'react'; key: string };

export const REACTIONS = ['nice', 'oops', 'hmm', 'gg', 'hurry', 'thanks'] as const;

export interface Spot {
  x: number;
  y: number;
  rot: Rot;
}

export interface PlayerView {
  seat: number;
  hand: number;
  broken: Tool[];
  theft: boolean;
  trap: boolean;
  /** Expanded only: whether they hold any gold, which theft makes public. */
  hasGold?: boolean;
}

export interface MView {
  config: MConfig;
  n: number;
  round: number;
  phase: Phase;
  turn: number;
  current: number;
  since: number;
  deck: number;
  discards: number;
  /** `by` is the seat that laid a tunnel; setup cards (the entrance, turned destinations) have none. */
  cells: { x: number; y: number; kind: string; rot: Rot; by?: number }[];
  goals: { x: number; y: number; revealed: boolean; kind?: GoalKind }[];
  players: PlayerView[];
  draft: { picker: number; left: number } | null;
  thief: number | null;
  log: LogEntry[];
  rounds: RoundRecord[];
  chat: MChat[];
  me: {
    seat: number;
    hand: Card[];
    role: Role | null;
    gold: number;
    rewards: number[];
    seen: Observation[];
    /** Where each tunnel card in hand may go, if it is your turn and you can dig. */
    spots: Record<number, Spot[]>;
    /** The cards you may pick from, when the draft is yours. */
    draft?: number[];
  } | null;
  final: { gold: number[]; rewards: number[][] } | null;
}
