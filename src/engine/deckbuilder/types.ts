/**
 * Types for a generic deck-building engine. Everything a game persists is plain JSON: card behaviour is typed data
 * interpreted by runtime.ts, never code or text evaluated at run time. No card content lives here; a game supplies it
 * as a `Ruleset`.
 */
import type { RngState } from '../rng';
import type { BotMove } from '../types';

export type CardId = number;

export type CardType = 'action' | 'treasure' | 'victory' | 'penalty' | 'attack' | 'reaction' | 'duration';

/** A number known at definition time or read while resolving. */
export type Num =
  | number
  | { len: string }
  | { value: string }
  | { costOf: string; plus?: number }
  | { token: string }
  | { emptyPiles: true }
  /** Cards in one of the resolving player's zones. All of these counts are public. */
  | { count: 'hand' | 'deck' | 'discard' | 'play' | 'deck+discard' }
  /** How many cards or piles held in a variable pass a filter. */
  | { countIn: string; filter?: CardFilter }
  | { add: Num[] }
  | { min: Num[] }
  | { mul: [Num, number] }
  /** Whole-number division, rounded down unless `up`. */
  | { div: [Num, number]; up?: boolean }
  /** Action cards played so far this turn, counting the one resolving. */
  | { actionsPlayed: true }
  /** Projects completed by the resolving player, or by anyone. */
  | { projects: 'mine' | 'all' };

export interface CardFilter {
  type?: CardType;
  notType?: CardType;
  key?: string;
  maxCost?: Num;
  minCost?: Num;
  exactCost?: Num;
  /** Same card as one held in this variable. An empty variable matches nothing. */
  sameAs?: string;
  /** Not the same card as any held in this variable. An empty variable matches everything. */
  notSameAs?: string;
}

/** Filters for cost changes cannot depend on cost. */
export type CardMatch = Pick<CardFilter, 'type' | 'notType' | 'key'>;

/** `rest`: the cards in a look or reveal that have not been moved anywhere yet. `hand`: the resolving player's whole hand, in order. */
export type CardRef = 'source' | 'hand' | { var: string } | { rest: string };
export type CardSource = 'hand' | 'discard' | 'play' | 'trash' | { var: string } | { rest: string };
/**
 * Another player, seen from the resolving one. `parent` is whoever started this attack or each-other, or the player
 * themselves if nobody did. `left` is the next seat in turn order. `{ var }` is a seat chosen by `choose-player`.
 */
export type PlayerRef = 'parent' | 'left' | { var: string };
export type PileRef = string | { var: string };
export type Dest = 'trash' | 'discard' | 'deck' | 'deck-bottom' | 'hand' | 'play' | 'supply' | { mat: string };
/** `claim`: someone completed a project. `hand-drawn`: cleanup has just dealt the new hand. */
export type EventName = 'gain' | 'buy' | 'trash' | 'discard' | 'play' | 'shuffle' | 'turn-start' | 'turn-end' | 'claim' | 'hand-drawn';

export type Cond =
  | { has: string }
  | { none: string }
  | { isType: string; type: CardType }
  | { gte: [Num, Num] }
  | { inHand: CardFilter }
  | { pileEmpty: string }
  /** The resolving player completed a project on their previous turn. */
  | { claimedLastTurn: true }
  | { not: Cond }
  | { any: Cond[] }
  | { all: Cond[] };

export type Effect =
  | { op: 'draw'; n: Num }
  | { op: 'actions' | 'buys' | 'coins'; n: Num }
  /** Tokens never go below 0 or above the ruleset's cap; anything past those limits is lost. */
  | { op: 'token'; token: string; n: Num; player?: PlayerRef }
  | { op: 'vp'; n: Num }
  | { op: 'choose-cards'; from: CardSource; min: Num; max: Num; filter?: CardFilter; as: string; prompt: string; after?: string; by?: PlayerRef; hint?: ChoiceHint }
  | { op: 'choose-pile'; filter?: CardFilter; as: string; prompt: string; after?: string; optional?: boolean; by?: PlayerRef }
  /** `pick` different options are chosen one by one, then run in the order listed. `taken` is working memory for that. */
  | { op: 'choose'; prompt: string; options: { label: string; then: Effect[] }[]; by?: PlayerRef; pick?: number; taken?: number[] }
  /** Choose a whole number from min to max and store it in a variable. */
  | { op: 'choose-number'; min: Num; max: Num; as: string; prompt: string; after?: string }
  /** Choose another player. The seat is stored in a variable. With one candidate there is no prompt. */
  | { op: 'choose-player'; as: string; prompt: string }
  /** Choose a project nobody has completed. Its key is stored in a variable; with none open the variable is empty. */
  | { op: 'choose-project'; as: string; prompt: string }
  /** Set a variable. */
  | { op: 'set'; as: string; n?: Num; keys?: string[] }
  /** Run effects as another player. The player who started them becomes their `parent`. */
  | { op: 'on-player'; player: PlayerRef; effects: Effect[] }
  /** This player's projects cost less for the rest of this turn. */
  | { op: 'project-discount'; coins?: Num; tokens?: Num }
  /** A project chosen into a variable costs other players more until the start of this player's next turn. */
  | { op: 'project-surcharge'; project: string; coins: Num }
  | { op: 'may'; prompt: string; then: Effect[]; else?: Effect[]; by?: PlayerRef }
  /** Moves into deck, hand or a mat are private unless `public`; trash, discard, supply and play are always public. */
  | { op: 'move'; cards: CardRef; to: Dest; public?: boolean; player?: PlayerRef }
  | { op: 'gain'; pile: PileRef; to?: 'discard' | 'deck' | 'hand'; player?: PlayerRef }
  /** Gain cards that are not in the supply, such as from the trash. Gain triggers fire. Named publicly only if the cards were already in the open. */
  | { op: 'gain-card'; cards: CardRef; to?: 'discard' | 'deck' | 'hand'; player?: PlayerRef }
  /** Take the top of the deck into limbo: `look` shows the resolving player, `reveal` shows everyone. */
  | { op: 'look' | 'reveal'; n: Num; as: string; append?: boolean }
  | { op: 'reveal-cards'; cards: CardRef }
  /** Keep the cards from a zone or variable that pass a filter, without moving them. */
  | { op: 'select'; from: CardSource; filter?: CardFilter; as: string }
  /** Add a variable's contents to the same list in the parent's context, so an attack can report back. */
  | { op: 'pass-up'; var: string; as?: string }
  | { op: 'shuffle' }
  /** The other players in turn order, skipping any made immune by a reaction. */
  | { op: 'attack'; effects: Effect[] }
  | { op: 'each-other'; effects: Effect[] }
  | { op: 'repeat'; n: Num; effects: Effect[] }
  /** Check the condition, and while it is false run the effects and check again. `max` caps the rounds. */
  | { op: 'until'; cond: Cond; effects: Effect[]; max?: number }
  | { op: 'if'; cond: Cond; then: Effect[]; else?: Effect[] }
  /** Play these cards `times` times each, without spending an action. */
  | { op: 'play-card'; cards: CardRef; times: Num }
  | { op: 'cost-mod'; delta: Num; filter?: CardMatch }
  /** Run at the start of the player's next turn; the source stays in play until then. */
  | { op: 'delay'; label: string; effects: Effect[] }
  /** A trigger that lasts until this turn's cleanup. */
  | { op: 'on'; on: EventName; filter?: CardMatch; label: string; effects: Effect[]; once?: boolean }
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

/** `each` points for every `per` cards you own, counting only cards matching `of` when it is given. */
export type VpValue = number | { per: number; each: number; of?: CardMatch } | VpFormula;

/** A base value plus points for tokens held at the end of the game and projects completed. */
export interface VpFormula {
  base: number;
  /** One point for every `per` of this token held at the end. */
  perToken?: { token: string; per: number };
  /** Points per project this player completed. */
  ownProjects?: number;
  /** Points per project anyone completed. */
  allProjects?: number;
}

/** What a bot should prefer when choosing cards: `keep` wants the best, `lose` (the default) the worst. */
export type ChoiceHint = 'keep' | 'lose';

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
  reaction?: {
    label: string;
    effects: Effect[];
    /** Each copy can be revealed only once per attack. Needed for any reaction whose reveal has a lasting reward. */
    once?: boolean;
  };
  triggers?: Trigger[];
  /** Draft cards can never be selected for a game. */
  status: 'ready' | 'draft';
  /** A basic pile rather than a selectable market card. */
  basic?: boolean;
  /** In the supply but not buyable. */
  noBuy?: boolean;
  /** Which part of the game this card belongs to. Absent means always available. */
  set?: string;
  /** Printed type line, for when a game names its types differently. */
  typeLine?: string;
}

/**
 * A public project, such as a civic work. Claiming one takes a Buy, its coins and its tokens; each can be claimed once
 * per game, and its points count at the end.
 */
export interface ProjectDef {
  key: string;
  name: string;
  text: string;
  coins: number;
  tokens: Record<string, number>;
  vp: number;
  effects: Effect[];
  set?: string;
}

/** Words a game uses for the engine's generic concepts. */
export interface Labels {
  actionPhase: string;
  buyPhase: string;
  action: string;
  actions: string;
  treasure: string;
  treasures: string;
  points: string;
  project: string;
  projects: string;
  tokens: Record<string, string>;
}

/** One game's content and table rules. Lives in code, so it never enters persisted state. */
export interface Ruleset {
  id: string;
  /** Which edition of the rules this is. A game keeps the edition it started on, whatever is released later. */
  version?: number;
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

  /** Basic piles a market needs on top of the usual ones, such as a penalty pile only some cards use. */
  extraPiles?(market: string[], players: number): Record<string, number>;
  /** Most of a token a player can hold. Gains past the cap are lost. */
  tokenCaps?: Record<string, number>;
  /** In the buy phase a player may turn this token into coins, up to a limit each turn. */
  convert?: { token: string; coinsEach: number; maxPerTurn: number };
  /** Treasures may still be played after buying. */
  lateTreasures?: boolean;
  /** Only empty market piles count towards the empty-pile ending. */
  emptyMarketPilesOnly?: boolean;
  projects?: ProjectDef[];
  /** How many projects a game uses. */
  projectCount?: number;
  /** The game ends after a turn when this many projects have been claimed. */
  projectsToEnd?(players: number): number;
  /** Named groups of cards the host can switch on. */
  sets?: { key: string; name: string; text: string }[];
  defaultSets?: string[];
  labels?: Labels;
  /** Rewords prompts and choices as they leave the server. Display only: saved state and what a choice does are untouched. */
  present?(text: string): string;
  /** Replaces the engine's plain computer player. */
  bot?(view: DeckView): BotMove<DeckAction> | null;
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
  /** Play the next treasure in hand, then come back. */
  | { k: 'play-treasures'; seat: number }
  | { k: 'react'; ctx: number; seats: number[]; used?: CardId[] }
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
  /** Removed the first time it fires. */
  once?: boolean;
}

/** Server-side only; project() decides which parts each seat sees. */
export interface Pending {
  id: number;
  seat: number;
  kind: 'cards' | 'pile' | 'option' | 'react' | 'order' | 'player';
  source: CardId | null;
  prompt: string;
  after?: string;
  optional: boolean;
  min: number;
  max: number;
  cards: CardId[];
  piles: string[];
  options: string[];
  /** Seats that can be chosen, for `player`. */
  seats?: number[];
  hint?: ChoiceHint;
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
  token?: string;
  project?: string;
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
  /** A card was bought this turn, so no more treasures may be played unless the ruleset allows it. */
  bought: boolean;
  /** Action cards played this turn. */
  actionsPlayed: number;
  /** Tokens turned into coins this turn. */
  converted: number;
  /** Taken off the cost of this player's projects this turn. */
  projectDiscount: { coins: number; tokens: number };
  costMods: { delta: number; filter?: CardMatch }[];
}

export interface DeckState {
  rulesetId: string;
  /** The edition of the rules this game started on. Absent only in unmigrated saves, which are the oldest edition. */
  rulesVersion?: number;
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
  /** The projects in this game, in the order chosen. */
  projects: ProjectState[];
}

export interface ProjectState {
  key: string;
  /** Who completed it, and on which of their own turns (counted from 0). */
  by: number | null;
  onTurn: number | null;
  /** Costs every other player more until `by`'s next turn starts. */
  surcharges: { by: number; coins: number }[];
}

export type DeckAction =
  | { type: 'play'; card: CardId }
  | { type: 'play-treasures' }
  | { type: 'buy'; pile: string }
  | { type: 'end-phase' }
  /** Turn one token into coins. */
  | { type: 'convert' }
  | { type: 'claim'; project: string }
  | { type: 'decide'; id: number; cards?: CardId[]; pile?: string; option?: number; seat?: number };

export interface DeckConfig {
  /** Empty means generate at random from the game seed. */
  market: string[];
  bans: string[];
  /** Empty means generate at random from the game seed. */
  projects?: string[];
  /** The groups of cards a random market may draw from. */
  sets?: string[];
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
  seats?: number[];
  hint?: ChoiceHint;
}

export interface ProjectView {
  key: string;
  by: number | null;
  /** The price right now for the player viewing, discounts and surcharges included. */
  coins: number;
  tokens: Record<string, number>;
  vp: number;
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
  /** Points held as tokens. Only your own until the game ends. */
  vp?: number;
}

/** Where a player's points come from. The parts always add up to the total. */
export interface ScoreBreakdown {
  /** Basic point cards. */
  estates: number;
  /** Fixed-value market cards, and points gained directly from effects. */
  special: number;
  projects: number;
  negative: number;
  /** Cards whose worth depends on what the player holds or did. */
  conditional: number;
  total: number;
}

export interface FinalScore {
  seat: number;
  total: number;
  turns: number;
  tokens: number;
  cards: { key: string; count: number; vp: number }[];
  /** Points from completed projects. */
  projects: { key: string; vp: number }[];
  breakdown: ScoreBreakdown;
}

export interface DeckView {
  rulesetId: string;
  rulesVersion?: number;
  you: number | null;
  turn: Omit<TurnState, 'costMods'>;
  market: string[];
  supply: { key: string; count: number; cost: number; buyable: boolean }[];
  trash: CardRefView[];
  players: PlayerView[];
  hand: CardRefView[];
  /** Your own discard pile; other players' piles show only the top. */
  discard: CardRefView[];
  /** Your own cards, counted by name across every zone. A deck list, never a deck order. */
  owned: Record<string, number>;
  /** Your own points as they stand. Other players' are never sent until the game ends. */
  score: ScoreBreakdown | null;
  revealed: CardRefView[];
  pending: PendingView | null;
  projects: ProjectView[];
  legal: { play: CardId[]; buy: string[]; endPhase: boolean; convert: boolean; claim: string[] };
  log: LogEntry[];
  over: boolean;
  final: FinalScore[] | null;
}
