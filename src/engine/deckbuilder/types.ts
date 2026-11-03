/**
 * Types for a generic deck-building engine. Everything a game persists is plain JSON: card behaviour is typed data
 * interpreted by runtime.ts, never code or text evaluated at run time. No card content lives here; a game supplies it
 * as a `Ruleset`.
 */
import type { RngState } from '../rng';

export type CardId = number;

export type CardType = 'action' | 'treasure' | 'victory' | 'penalty' | 'attack' | 'reaction' | 'duration';

/** A number known at definition time or read while resolving. */
export type Num =
  | number
  | { len: string }
  | { value: string }
  | { costOf: string; plus?: number }
  | { token: string }
  | { emptyPiles: true };

export interface CardFilter {
  type?: CardType;
  notType?: CardType;
  key?: string;
  maxCost?: Num;
  minCost?: Num;
  exactCost?: Num;
}

/** Filters for cost changes cannot depend on cost. */
export type CardMatch = Pick<CardFilter, 'type' | 'notType' | 'key'>;

/** `rest`: the cards in a look or reveal that have not been moved anywhere yet. */
export type CardRef = 'source' | { var: string } | { rest: string };
export type CardSource = 'hand' | 'discard' | 'play' | { var: string };
export type PileRef = string | { var: string };
export type Dest = 'trash' | 'discard' | 'deck' | 'deck-bottom' | 'hand' | 'play' | 'supply' | { mat: string };
export type EventName = 'gain' | 'buy' | 'trash' | 'discard' | 'play' | 'shuffle' | 'turn-start' | 'turn-end';

export type Cond =
  | { has: string }
  | { none: string }
  | { isType: string; type: CardType }
  | { gte: [Num, Num] }
  | { inHand: CardFilter }
  | { pileEmpty: string }
  | { not: Cond };

export type Effect =
  | { op: 'draw'; n: Num }
  | { op: 'actions' | 'buys' | 'coins'; n: Num }
  | { op: 'token'; token: string; n: Num }
  | { op: 'vp'; n: Num }
  | { op: 'choose-cards'; from: CardSource; min: Num; max: Num; filter?: CardFilter; as: string; prompt: string; after?: string }
  | { op: 'choose-pile'; filter?: CardFilter; as: string; prompt: string; after?: string; optional?: boolean }
  | { op: 'choose'; prompt: string; options: { label: string; then: Effect[] }[] }
  | { op: 'may'; prompt: string; then: Effect[]; else?: Effect[] }
  /** Moves into deck, hand or a mat are private unless `public`; trash, discard, supply and play are always public. */
  | { op: 'move'; cards: CardRef; to: Dest; public?: boolean }
  | { op: 'gain'; pile: PileRef; to?: 'discard' | 'deck' | 'hand' }
  /** Take the top of the deck into limbo: `look` shows the resolving player, `reveal` shows everyone. */
  | { op: 'look' | 'reveal'; n: Num; as: string }
  | { op: 'reveal-cards'; cards: CardRef }
  | { op: 'shuffle' }
  /** The other players in turn order, skipping any made immune by a reaction. */
  | { op: 'attack'; effects: Effect[] }
  | { op: 'each-other'; effects: Effect[] }
  | { op: 'repeat'; n: Num; effects: Effect[] }
  | { op: 'if'; cond: Cond; then: Effect[]; else?: Effect[] }
  /** Play these cards `times` times each, without spending an action. */
  | { op: 'play-card'; cards: CardRef; times: Num }
  | { op: 'cost-mod'; delta: Num; filter?: CardMatch }
  /** Run at the start of the player's next turn; the source stays in play until then. */
  | { op: 'delay'; label: string; effects: Effect[] }
  /** A trigger that lasts until this turn's cleanup. */
  | { op: 'on'; on: EventName; filter?: CardMatch; label: string; effects: Effect[] }
  | { op: 'immune' }
  | { op: 'extra-turn' }
  | { op: 'custom'; handler: string; args?: Record<string, string | number | boolean> };

export interface Trigger {
  on: EventName;
  /** Where the card must be: in play, in hand, or `self` for the event's own card. */
  where: 'play' | 'hand' | 'self';
  /** Whose events count; defaults to the card holder's own. */
  scope?: 'own' | 'others' | 'any';
  filter?: CardMatch;
  label: string;
  /** Present when the holder may decline: the question to ask. */
  optional?: string;
  effects: Effect[];
}

export type VpValue = number | { per: number; each: number };

export interface CardDef {
  key: string;
  name: string;
  cost: number;
  types: CardType[];
  /** Short functional description for the UI. Never executed. */
  text: string;
  /** Coins added when played as a treasure. */
  coins?: number;
  vp?: VpValue;
  effects?: Effect[];
  /** Effects when revealed from hand as another player plays an attack. */
  reaction?: { label: string; effects: Effect[] };
  triggers?: Trigger[];
  /** Draft cards can never be selected for a game. */
  status: 'ready' | 'draft';
  /** A basic pile rather than a selectable market card. */
  basic?: boolean;
  /** In the supply but not buyable. */
  noBuy?: boolean;
}

/** One game's content and table rules. Lives in code, so it never enters persisted state. */
export interface Ruleset {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  cards: CardDef[];
  startingDeck: { key: string; count: number }[];
  handSize: number;
  marketSize: number;
  /** Count for each basic pile at this player count. */
  basicPiles(players: number): Record<string, number>;
  marketPileSize(key: string, players: number): number;
  /** The game ends after a turn when any of these piles is empty... */
  endPiles: string[];
  /** ...or when this many supply piles are empty. */
  emptyPilesToEnd(players: number): number;
  handlers?: Record<string, CustomHandler>;
}

/** What a custom effect gets. It may change `state` and queue effects, nothing else. */
export interface CustomRuntime {
  state: DeckState;
  ctx: Ctx;
  queue(effects: Effect[]): void;
  keyOf(id: CardId): string;
  costOf(key: string): number;
  /** Must be called when the handler shows hidden information or affects another player. */
  taint(): void;
}
export type CustomHandler = (rt: CustomRuntime, args: Record<string, string | number | boolean>) => void;

export interface PlayerZones {
  /** The last element is the top. */
  deck: CardId[];
  hand: CardId[];
  /** The last element is the top. */
  discard: CardId[];
  play: CardId[];
  mats: Record<string, CardId[]>;
  tokens: Record<string, number>;
  vp: number;
  turns: number;
}

/** Resolution context. Only ever referenced by id, so frames stay JSON. */
export interface Ctx {
  player: number;
  source: CardId | null;
  vars: Record<string, (CardId | string)[] | number>;
  /** Seats made immune to this play's attack. */
  immune: number[];
  /** Cards replaying this one; they stay in play as long as a delay from it is pending. */
  holders: CardId[];
  parent: number | null;
}

export interface TriggerRef {
  label: string;
  source: CardId | null;
  player: number;
  optional?: string;
  effects: Effect[];
  vars: Ctx['vars'];
  holders?: CardId[];
}

export type Frame =
  | { k: 'fx'; ctx: number; fx: Effect }
  | { k: 'play'; seat: number; card: CardId; holders: CardId[] }
  | { k: 'react'; ctx: number; seats: number[] }
  | { k: 'triggers'; seat: number; list: TriggerRef[] }
  | { k: 'turn-end' }
  | { k: 'cleanup' }
  | { k: 'next-turn' };

export interface Delayed {
  player: number;
  label: string;
  source: CardId | null;
  holds: CardId[];
  effects: Effect[];
  vars: Ctx['vars'];
}

export interface TempTrigger {
  player: number;
  on: EventName;
  filter?: CardMatch;
  label: string;
  source: CardId | null;
  effects: Effect[];
}

/** Server-side only; project() decides which parts each seat sees. */
export interface Pending {
  id: number;
  seat: number;
  kind: 'cards' | 'pile' | 'option' | 'react' | 'order';
  source: CardId | null;
  prompt: string;
  after?: string;
  optional: boolean;
  min: number;
  max: number;
  cards: CardId[];
  piles: string[];
  options: string[];
  ctx: number;
  as?: string;
  branches?: Effect[][];
}

export interface LogEntry {
  n: number;
  seat: number;
  kind: string;
  keys?: string[];
  count?: number;
  /** Private to one seat. Omitted from every other seat's projection. */
  to?: number;
}

export interface TurnState {
  seat: number;
  number: number;
  phase: 'action' | 'buy';
  actions: number;
  buys: number;
  coins: number;
  /** A card was bought this turn, so no more treasures may be played. */
  bought: boolean;
  costMods: { delta: number; filter?: CardMatch }[];
}

export interface DeckState {
  rulesetId: string;
  n: number;
  rng: RngState;
  /** Which card each id is. The ids are an independent permutation, so an id reveals nothing. */
  cards: Record<number, string>;
  supply: Record<string, CardId[]>;
  market: string[];
  trash: CardId[];
  limbo: { id: CardId; owner: number; public: boolean }[];
  players: PlayerZones[];
  turn: TurnState;
  extraTurns: number[];
  delays: Delayed[];
  temps: TempTrigger[];
  stack: Frame[];
  ctxs: Record<number, Ctx>;
  nextCtx: number;
  pending: Pending | null;
  nextDecision: number;
  log: LogEntry[];
  nextLog: number;
  over: boolean;
}

export type DeckAction =
  | { type: 'play'; card: CardId }
  | { type: 'buy'; pile: string }
  | { type: 'end-phase' }
  | { type: 'decide'; id: number; cards?: CardId[]; pile?: string; option?: number };

export interface DeckConfig {
  /** Empty means generate at random from the game seed. */
  market: string[];
  bans: string[];
}

export interface CardRefView {
  id: CardId;
  key: string;
}

export interface PendingView {
  id: number;
  seat: number;
  kind: Pending['kind'];
  /** Hidden from other seats while the source card is in someone's hand. */
  source: string | null;
  prompt: string;
  after?: string;
  optional: boolean;
  min: number;
  max: number;
  /** Legal answers, sent only to the seat deciding. */
  cards?: CardRefView[];
  piles?: string[];
  options?: string[];
}

export interface PlayerView {
  seat: number;
  handCount: number;
  deckCount: number;
  discardCount: number;
  discardTop: CardRefView | null;
  play: CardRefView[];
  mats: Record<string, { count: number; cards?: CardRefView[] }>;
  tokens: Record<string, number>;
  vp: number;
}

export interface FinalScore {
  seat: number;
  total: number;
  turns: number;
  tokens: number;
  cards: { key: string; count: number; vp: number }[];
}

export interface DeckView {
  rulesetId: string;
  you: number | null;
  turn: Omit<TurnState, 'costMods'>;
  market: string[];
  supply: { key: string; count: number; cost: number; buyable: boolean }[];
  trash: CardRefView[];
  players: PlayerView[];
  hand: CardRefView[];
  /** Your own discard pile; other players' piles show only the top. */
  discard: CardRefView[];
  revealed: CardRefView[];
  pending: PendingView | null;
  legal: { play: CardId[]; buy: string[]; endPhase: boolean };
  log: LogEntry[];
  over: boolean;
  final: FinalScore[] | null;
}
