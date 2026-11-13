import type { RngState } from '../../../engine/rng';
import type { Kind, Role } from './roles';

export const TIMER_CHOICES = [10, 15, 20, 30] as const;
export type Timer = (typeof TIMER_CHOICES)[number];
export type Disconnect = 'pause' | 'continue';

export interface PConfig {
  /** Seconds each response window stays open (PZ-TIME1). */
  timer: Timer;
  /** What a dropped connection does to the table (PZ-NET4). */
  disconnect: Disconnect;
  /** Two players are dealt three and keep two (PZ-SET4). Ignored at other counts. */
  draft: boolean;
}

export const CHAT_MAX = 300;
export const CHAT_KEEP = 200;
export const LOG_KEEP = 200;
export const REACTIONS = ['bluff', 'bold', 'wise', 'ouch', 'gg', 'hmm'] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface Card {
  id: number;
  role: Role;
  /** Revealed: lost influence, face up for good (PZ-LOSE3). */
  up: boolean;
}

export interface Seat {
  hand: Card[];
  coins: number;
  /** Increases with each elimination, so it orders who went out first. */
  outAt?: number;
}

/** A response window: who may still answer, and when it closes. */
export interface Window {
  kind: 'challenge' | 'block' | 'counter';
  /** Seats that may answer. */
  open: number[];
  passed: number[];
  deadline: number;
  /** Time left when the table paused (PZ-NET2). */
  left?: number;
}

/** The action being resolved this turn. */
export interface Pending {
  kind: Kind;
  actor: number;
  target?: number;
  /** The seat claiming the blocking role, once someone blocks. */
  blocker?: number;
  /** Where the action stands once any losses are dealt with. */
  stage: 'challenge' | 'block' | 'counter' | 'resolve' | 'parley' | 'done';
  /** A Parley's drawn card, until the actor returns one. */
  drawn?: Card;
}

export interface Loss {
  seat: number;
  why: 'challenge' | 'strike' | 'depose';
}

/** Private knowledge from an Inspect (PZ-SENT2). */
export interface Seen {
  by: number;
  seat: number;
  card: number;
  role: Role;
  /** The target's hidden cards changed since, so it no longer confirms anything (PZ-SENT3). */
  lapsed: boolean;
}

export type LogEntry = { id: number; at: number } & (
  | { t: 'start'; seat: number; draft: boolean }
  | { t: 'drafted' }
  | { t: 'declare'; seat: number; kind: Kind; target?: number }
  | { t: 'challenge'; seat: number; of: number; role: Role; truthful: boolean }
  | { t: 'replace'; seat: number }
  | { t: 'block'; seat: number; role: Role }
  | { t: 'allowed'; seat: number; kind: Kind }
  | { t: 'blocked'; seat: number; kind: Kind }
  | { t: 'failed'; seat: number; kind: Kind; refund: number }
  | { t: 'coins'; seat: number; n: number; from?: number }
  | { t: 'lose'; seat: number; role: Role; why: Loss['why'] }
  | { t: 'out'; seat: number }
  | { t: 'fizzle'; seat: number; kind: Kind }
  | { t: 'parley'; seat: number }
  | { t: 'inspect'; seat: number; target: number }
  | { t: 'timeout'; window: Window['kind'] }
  | { t: 'pause'; seats: number[] }
  | { t: 'resume' }
  | { t: 'win'; seat: number }
);

export interface ChatEntry {
  id: number;
  seat: number;
  at: number;
  text?: string;
  react?: Reaction;
  /** Sent by an eliminated player: only other eliminated players see it until the game ends (PZ-SPEC2). */
  ghost?: boolean;
}

export interface PState {
  n: number;
  config: PConfig;
  rng: RngState;
  /** Top first. Never leaves the server (PZ-NET6). */
  deck: Card[];
  seats: Seat[];
  phase: 'draft' | 'turn' | 'window' | 'lose' | 'parley' | 'over';
  /** Changes whenever a new decision opens; every game action names the one it answers (PZ-NET1). */
  step: number;
  turn: number;
  current: number;
  /** Seats still to return a card in the opening draft. */
  drafting: number[];
  pend: Pending | null;
  window: Window | null;
  losses: Loss[];
  seen: Seen[];
  online: boolean[];
  /** Set while the table waits for someone to reconnect (PZ-NET2). */
  pause: { since: number; seats: number[] } | null;
  winner: number | null;
  /** The server clock at the last change, so a client can count down without trusting its own clock. */
  at: number;
  log: LogEntry[];
  chat: ChatEntry[];
  nextId: number;
}

export type PAction =
  | { type: 'declare'; step: number; kind: Kind; target?: number }
  | { type: 'respond'; step: number; choice: 'pass' | 'challenge' | 'block' }
  | { type: 'reveal'; step: number; card: number }
  | { type: 'return'; step: number; card: number }
  | { type: 'chat'; text: string }
  | { type: 'react'; key: Reaction };

export interface PlayerView {
  coins: number;
  /** Each card in hand order: its role once revealed, null while hidden. */
  cards: (Role | null)[];
  out: boolean;
  online: boolean;
}

export interface PView {
  n: number;
  you: number | null;
  config: PConfig;
  phase: PState['phase'];
  step: number;
  turn: number;
  current: number;
  players: PlayerView[];
  deck: number;
  drafting: number[];
  pend: Omit<Pending, 'drawn'> | null;
  window: Window | null;
  /** Whose card is being lost now, and why. */
  losing: Loss | null;
  pause: PState['pause'];
  winner: number | null;
  at: number;
  log: LogEntry[];
  chat: ChatEntry[];
  me: {
    hand: Card[];
    /** A Parley's drawn card, while choosing what to return. */
    drawn?: Card;
    seen: { seat: number; role: Role; lapsed: boolean }[];
  } | null;
}
