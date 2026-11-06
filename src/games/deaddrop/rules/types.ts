/** Dead Drop's state, actions and views. Rule IDs are in docs/DEADDROP.md. */

export const LOCATIONS = ['embassy', 'station', 'hotel', 'harbour'] as const;
export type Loc = (typeof LOCATIONS)[number];

export const LOCATION_NAMES: Record<Loc, string> = {
  embassy: 'Embassy',
  station: 'Rail Station',
  hotel: 'Grand Hotel',
  harbour: 'Harbour',
};

export type OrderKind = 'deliver' | 'investigate' | 'intercept' | 'decoy';

export interface Order {
  action: OrderKind;
  target: Loc;
  /** Spends Cover: the false location to broadcast. Only on a delivery. */
  cover?: Loc;
}

export type Claim =
  | { kind: 'none' }
  | { kind: 'delivered'; loc: Loc }
  | { kind: 'investigated'; loc: Loc }
  | { kind: 'decoy'; loc: Loc }
  | { kind: 'notDelivered' };

export interface Challenge {
  by: number;
  round: number;
  at: number;
  /** The challenger was right: the claim was false. */
  correct: boolean;
  /** Withheld until the match ends (DD-CH5). */
  sealed: boolean;
}

export interface Statement {
  id: number;
  seat: number;
  /** The briefing it was filed in. It speaks about the round before. */
  round: number;
  at: number;
  claim: Claim;
  challenge: Challenge | null;
}

export interface ChatLine {
  id: number;
  seat: number;
  round: number;
  at: number;
  text: string;
}

/** One resolved round: what happened, in full. Only the projection decides who sees which part. */
export interface RoundRecord {
  round: number;
  /** Null: the seat's time was called and it issued no order (DD-TIME3). */
  orders: (Order | null)[];
  /** What each seat broadcast: the target, or a false location under Cover. Null when no order. */
  signals: (Loc | null)[];
  /** Delivered successfully. */
  delivered: boolean[];
  /** This seat made a successful interception, at this location. */
  captured: (Loc | null)[];
  /** The opponent's interception landed on this seat's decoy. */
  drew: boolean[];
  coverGained: boolean[];
  coverSpent: boolean[];
  /** A truthful investigation result, for the investigator alone. */
  found: (boolean | null)[];
}

export type Phase = 'briefing' | 'orders' | 'report' | 'over';

export type EndMethod = 'mission' | 'counterintelligence' | 'simultaneous' | 'deliveries' | 'interceptions' | 'challenges' | 'level';

export interface Seat {
  missions: Loc[];
  orders: Order | null;
  /** Successful deliveries at each location. */
  deliveries: Partial<Record<Loc, number>>;
  interceptions: number;
  cover: number;
  challengeToken: boolean;
  /** Counts sealed points too, so it is only public through the projection. */
  challengePoints: number;
  /** How many of the opponent's statements this round the seat has acknowledged. */
  acked: number;
  continued: boolean;
  /** Time was called on this seat and it has not acted since. */
  away: boolean;
}

export interface DState {
  round: number;
  phase: Phase;
  /** When the phase began, on the server's clock. */
  since: number;
  seats: Seat[];
  rounds: RoundRecord[];
  statements: Statement[];
  chat: ChatLine[];
  nextId: number;
  result: { winner: number | null; method: EndMethod } | null;
}

export type DAction =
  | { type: 'chat'; text: string }
  | { type: 'claim'; round: number; claim: Claim }
  | { type: 'ack'; round: number; count: number }
  | { type: 'challenge'; round: number; statement: number }
  | { type: 'order'; round: number; order: Order }
  | { type: 'continue'; round: number }
  | { type: 'callTime'; round: number; phase: Phase };

/** A statement as anyone may see it. `outcome` is absent while a challenge is sealed. */
export interface StatementV {
  id: number;
  seat: number;
  round: number;
  at: number;
  claim: Claim;
  challenge: null | { by: number; round: number; at: number; sealed: boolean; correct?: boolean };
  challengeable: boolean;
}

/** What both players know about a round. */
export interface PublicRoundV {
  round: number;
  signals: (Loc | null)[];
  /** The seat that made a successful interception, and where. */
  captures: { seat: number; loc: Loc }[];
  coverGained: boolean[];
  coverSpent: boolean[];
}

/** What only the viewer knows about a round. */
export interface PrivateRoundV {
  round: number;
  order: Order | null;
  delivered: boolean;
  /** The opponent's interception blocked this delivery. */
  blocked: boolean;
  captured: boolean;
  drew: boolean;
  coverGained: boolean;
  found: boolean | null;
}

export interface MineV {
  missions: Loc[];
  deliveries: Partial<Record<Loc, number>>;
  /** This round's locked orders, the viewer's own. */
  order: Order | null;
  rounds: PrivateRoundV[];
}

export interface DView {
  round: number;
  maxRounds: number;
  phase: Phase;
  you: number | null;
  /** Public counters. `challengePoints` leaves out sealed points until the match is over. */
  interceptions: number[];
  cover: number[];
  challengeToken: boolean[];
  challengePoints: number[];
  statements: StatementV[];
  chat: ChatLine[];
  rounds: PublicRoundV[];
  /** Duties done this phase. Whether a seat has locked orders, never which. */
  done: boolean[];
  /** Statements each seat has filed this round. */
  filed: number[];
  /** Whether each seat has acknowledged everything the opponent has filed. */
  acked: boolean[];
  /** When the viewer may call time on the opponent. Null if they may not. */
  callAt: number | null;
  mine: MineV | null;
  /** Present only once the match is over: everything is revealed. */
  final: null | {
    winner: number | null;
    method: EndMethod;
    missions: Loc[][];
    deliveries: number[];
    rounds: RoundRecord[];
  };
}
