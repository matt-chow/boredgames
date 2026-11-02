import type { PlayerResult } from '../../../engine/types';
import type { RngState } from '../../../engine/rng';
import type { Bean } from './cards';
import type { BohnanzaConfig } from './config';

export const STATE_VERSION = 1;

/**
 * plant   = phase 1 (plant from hand)
 * trade   = phase 2 (cards turned over; trading open)
 * resolve = phase 3 (everyone plants received cards); once all are planted the
 *           active player ends the turn, which performs phase 4 (draw).
 * over    = game finished
 */
export type Phase = 'plant' | 'trade' | 'resolve' | 'over';

export type BeanCounts = Partial<Record<Bean, number>>;

export type OfferStatus = 'open' | 'accepted' | 'rejected' | 'cancelled' | 'countered' | 'void';

export interface Offer {
  id: number;
  from: number;
  to: number;
  /** Specific cards the proposer gives (their hand, or turned-over cards if active). */
  give: string[];
  /** Specific public cards requested from the recipient (only the active player's turned-over cards). */
  wantCards: string[];
  /** Bean types requested from the recipient's hand; the recipient picks which cards. */
  wantTypes: BeanCounts;
  replyTo: number | null;
  status: OfferStatus;
}

export interface PlayerState {
  /** Hand in fixed order; index 0 is the front card. Never reordered. */
  hand: string[];
  /** Each field is a stack, bottom first. Length = number of fields owned. */
  fields: string[][];
  coins: string[];
  /** Cards received in phase 2 that must be planted in phase 3. */
  pending: string[];
}

export interface LogEntry {
  seq: number;
  seat: number | null;
  text: string;
}

/** Public, per-action effect hints used by clients for sound and motion. */
export type Fx =
  | { k: 'plant'; seat: number; card: string }
  | { k: 'harvest'; seat: number; coins: number; cards: number; fieldBonus?: boolean }
  | { k: 'flip'; count: number }
  | { k: 'draw'; seat: number; count: number }
  | { k: 'offer'; from: number; to: number }
  | { k: 'trade'; from: number; to: number; donation: boolean }
  | { k: 'reject'; offer: number }
  | { k: 'steal'; seat: number; victim: number }
  | { k: 'coinClaim'; seat: number }
  | { k: 'coinResist'; holder: number; card: string; blocked: boolean }
  | { k: 'coinMove'; to: number }
  | { k: 'reshuffle' }
  | { k: 'turn'; active: number }
  | { k: 'gameOver' };

export interface CoinState {
  owner: number;
  /** The active player failed a claim this turn (a Blue Bean was revealed). */
  blocked: boolean;
  /** The active player has claimed; the holder must respond. */
  claim: boolean;
  /** Card revealed from the holder's hand that the active player must plant now. */
  mustPlant: string | null;
  /** Last revealed card, kept public for display. */
  lastReveal: { card: string; blocked: boolean } | null;
}

export interface MagpieState {
  stealsLeft: number;
  victims: number[];
}

export interface BState {
  v: typeof STATE_VERSION;
  config: BohnanzaConfig;
  n: number;
  rng: RngState;
  /** Card id → bean. Server-only; never sent to clients wholesale. */
  cards: Record<string, Bean>;
  /** Index 0 is the top of the draw pile. */
  deck: string[];
  /** Last element is the top (face-up) card. */
  discard: string[];
  exhaustions: number;
  exhaustLimit: number;
  drawMode: 'three' | 'each';
  /** The draw pile has run out for the final time. */
  deckOver: boolean;
  /** Deck ran out for the final time during phase 2: finish phases 2–3, then end. */
  finalTurn: boolean;
  players: PlayerState[];
  start: number;
  active: number;
  turn: number;
  phase: Phase;
  /** Phase-1 plays made this turn (0–2). */
  planted: number;
  /** Turned-over cards still held by the active player. */
  faceUp: string[];
  offers: Offer[];
  nextOfferId: number;
  magpie: MagpieState | null;
  coin: CoinState | null;
  log: LogEntry[];
  fx: Fx[];
  seq: number;
  result: PlayerResult[] | null;
}

export type BAction =
  | { type: 'plant'; field: number }
  | { type: 'playMagpie' }
  | { type: 'steal'; victim: number; victimField: number; field: number }
  | { type: 'endSteal' }
  | { type: 'flip' }
  | { type: 'offer'; to: number; give: string[]; wantCards: string[]; wantTypes: BeanCounts; replyTo?: number | null }
  | { type: 'accept'; offer: number; cards: string[] }
  | { type: 'reject'; offer: number }
  | { type: 'cancel'; offer: number }
  | { type: 'endTrading' }
  | { type: 'plantPending'; card: string; field: number }
  | { type: 'harvest'; field: number }
  | { type: 'endTurn' }
  | { type: 'claimCoin' }
  | { type: 'coinRespond'; resist: boolean }
  | { type: 'plantCoinCard'; field: number };

export type BActionType = BAction['type'];
