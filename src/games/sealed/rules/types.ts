import type { RngState } from '../../../engine/rng';
import type { Kind, Ruleset } from './cards';

export interface SConfig {
  ruleset: Ruleset;
  /** Favors to win. 0 = the recommended target for the player count (SC-WIN1). */
  target: number;
  /** Seconds before a turn shows as overdue. 0 = no timer. It only warns: nothing is ever played for anyone (SC-TIME1). */
  timer: number;
}

export const TIMER_CHOICES = [0, 15, 30, 45, 60];
export const TARGET_MAX = 15;

export interface Card {
  id: number;
  kind: Kind;
}

/** Something one seat learned in secret this round. */
export type Secret =
  | { t: 'read'; seat: number; kind: Kind }
  | { t: 'duel'; seat: number; mine: Kind; theirs: Kind }
  | { t: 'trade'; seat: number; gave: Kind; got: Kind };

export interface Seat {
  hand: Card[];
  /** Played and discarded cards, in order. Public. */
  pile: { card: Card; how: 'played' | 'discarded' }[];
  out: boolean;
  guarded: boolean;
  favors: number;
  secrets: Secret[];
}

/** One public line of what happened. Never names a card still in a hand, the deck or the reserve. */
export type LogLine =
  | { t: 'round'; round: number; start: number }
  | { t: 'play'; seat: number; kind: Kind; on?: number; guess?: Kind; hit?: boolean; idle?: boolean }
  /** A duel: the loser, or null for a tie. */
  | { t: 'duel'; seat: number; on: number; loser: number | null }
  /** A card forced out of a hand by the Magistrate, or shown by a player knocked out. */
  | { t: 'discard'; seat: number; kind: Kind }
  | { t: 'out'; seat: number }
  | { t: 'file'; seat: number; n: number };

export type LogEntry = LogLine & { id: number };

export interface RoundRecord {
  round: number;
  /** 'last': one player was left. 'showdown': the deck ran out. */
  end: 'last' | 'showdown';
  /** Survivors' cards at a showdown, by seat; null for a seat already out. */
  shown: (Kind | null)[];
  winners: number[];
  /** The one surviving Informant player, who gains a favor of their own (SC-INF1). */
  informant: number | null;
  /** The reserve card, turned up when the round ends. */
  reserve: Kind | null;
}

export interface SChat {
  id: number;
  seat: number;
  text?: string;
  react?: string;
  at: number;
}

export type Phase = 'play' | 'file' | 'between' | 'over';

export interface SState {
  config: SConfig;
  rng: RngState;
  n: number;
  target: number;
  round: number;
  phase: Phase;
  /** Bumped by every move; each action names the turn it was meant for, so a late or doubled one is refused (SC-NET1). */
  turn: number;
  current: number;
  /** When the current wait began (server clock), for the turn timer. */
  since: number;
  deck: Card[];
  /** Set aside face down at the start of the round (SC-SET2). */
  reserve: Card | null;
  /** Two players: three more set aside face up (SC-SET3). */
  faceUp: Card[];
  seats: Seat[];
  /** Who opens the next round, once a round has ended. */
  next: number | null;
  log: LogEntry[];
  rounds: RoundRecord[];
  chat: SChat[];
  nextId: number;
}

export type SAction =
  | { type: 'play'; turn: number; card: number; target?: number; guess?: Kind }
  /** The Archivist: the card kept, and the others from top to bottom as they go under the deck. */
  | { type: 'file'; turn: number; keep: number; under: number[] }
  | { type: 'deal'; turn: number }
  | { type: 'chat'; text: string }
  | { type: 'react'; key: string };

export const REACTIONS = ['nice', 'oops', 'hmm', 'gg', 'bluff', 'thanks'] as const;

export interface PlayerView {
  seat: number;
  /** Cards in hand: a count only. */
  hand: number;
  pile: Seat['pile'];
  out: boolean;
  guarded: boolean;
  favors: number;
}

export interface SView {
  config: SConfig;
  n: number;
  target: number;
  round: number;
  phase: Phase;
  turn: number;
  current: number;
  since: number;
  deck: number;
  reserve: boolean;
  faceUp: Card[];
  players: PlayerView[];
  next: number | null;
  log: LogEntry[];
  rounds: RoundRecord[];
  chat: SChat[];
  me: {
    seat: number;
    hand: Card[];
    secrets: Secret[];
    /** On your turn: the cards you may play (the Dowager rule, SC-DOW1), and who each card may choose. */
    playable: number[];
    targets: number[];
  } | null;
}
