/** Turns a `Ruleset` into a `GameModule` the hub can host. Validation and projection live here; effects in runtime.ts. */
import { seedRng, shuffle } from '../rng';
import type { ApplyResult, BotMove, GameModule, PlayerResult } from '../types';
import { randomMarket, validateMarket, validateRuleset } from './market';
import { costOf, makeLibrary, Runtime, type Library } from './runtime';
import type {
  CardId,
  CardRefView,
  DeckAction,
  DeckConfig,
  DeckState,
  DeckView,
  FinalScore,
  PendingView,
  PlayerZones,
  Ruleset,
} from './types';

export * from './market';
export type * from './types';

const STATE_VERSION = 1;
const fail = (code: string, error: string): ApplyResult<DeckState> => ({ ok: false, code, error });

function ownedCards(p: PlayerZones): CardId[] {
  return [...p.deck, ...p.hand, ...p.discard, ...p.play, ...Object.values(p.mats).flat()];
}

function legalMoves(s: DeckState, lib: Library, seat: number): DeckView['legal'] {
  const none = { play: [], buy: [], endPhase: false };
  if (s.over || s.pending || seat !== s.turn.seat) return none;
  const { phase, actions, buys, coins, bought } = s.turn;
  const types = (id: CardId) => lib.defs[s.cards[id]].types;
  const play = s.players[seat].hand.filter((id) =>
    phase === 'action' ? actions > 0 && types(id).includes('action') : !bought && types(id).includes('treasure'),
  );
  const buy =
    phase === 'buy' && buys > 0
      ? Object.keys(s.supply).filter((k) => s.supply[k].length > 0 && !lib.defs[k].noBuy && costOf(s, lib, k) <= coins)
      : [];
  return { play, buy, endPhase: true };
}

export function finalScores(s: DeckState, lib: Library): FinalScore[] {
  return s.players.map((p, seat) => {
    const ids = ownedCards(p);
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(s.cards[id], (counts.get(s.cards[id]) ?? 0) + 1);
    const cards = [...counts].map(([key, count]) => {
      const v = lib.defs[key].vp ?? 0;
      const each = typeof v === 'number' ? v : Math.floor(ids.length / v.per) * v.each;
      return { key, count, vp: each * count };
    });
    return { seat, total: p.vp + cards.reduce((a, c) => a + c.vp, 0), turns: p.turns, tokens: p.vp, cards };
  });
}

function setup(lib: Library, playerCount: number, seed: string, config: DeckConfig): DeckState {
  const rules = lib.rules;
  const rng = seedRng(seed);
  const market = config.market.length ? [...config.market] : randomMarket(rules, rng, config.bans);
  const physical: string[] = [];
  const piles: [string, number][] = [
    ...Object.entries(rules.basicPiles(playerCount)),
    ...market.map((k): [string, number] => [k, rules.marketPileSize(k, playerCount)]),
  ];
  for (const [key, count] of piles) for (let i = 0; i < count; i++) physical.push(key);
  const start = rules.startingDeck.flatMap((c) => Array<string>(c.count).fill(c.key));
  for (let i = 0; i < playerCount; i++) physical.push(...start);

  // Ids come from their own stream, so they say nothing about the cards or the game's shuffles.
  const ids = shuffle(seedRng(seed + ':ids'), physical.map((_, i) => i));
  const cards: Record<number, string> = {};
  let next = 0;
  const mint = (key: string) => {
    const id = ids[next++];
    cards[id] = key;
    return id;
  };
  const supply: Record<string, CardId[]> = {};
  for (const [key, count] of piles) supply[key] = Array.from({ length: count }, () => mint(key));
  const players: PlayerZones[] = Array.from({ length: playerCount }, () => {
    const deck = shuffle(rng, start.map(mint));
    const hand: CardId[] = [];
    for (let i = 0; i < rules.handSize && deck.length; i++) hand.push(deck.pop()!);
    return { deck, hand, discard: [], play: [], mats: {}, tokens: {}, vp: 0, turns: 0 };
  });
  const first = shuffle(rng, Array.from({ length: playerCount }, (_, i) => i))[0];
  const state: DeckState = {
    rulesetId: rules.id,
    n: playerCount,
    rng,
    cards,
    supply,
    market,
    trash: [],
    limbo: [],
    players,
    turn: { seat: first, number: 0, phase: 'action', actions: 1, buys: 1, coins: 0, bought: false, costMods: [] },
    extraTurns: [],
    delays: [],
    temps: [],
    stack: [],
    ctxs: {},
    nextCtx: 0,
    pending: null,
    nextDecision: 1,
    log: [],
    nextLog: 1,
    over: false,
  };
  const rt = new Runtime(state, lib);
  rt.beginTurn(first);
  rt.run();
  return state;
}

function validAnswer(s: DeckState, a: Extract<DeckAction, { type: 'decide' }>): string | null {
  const q = s.pending!;
  if (q.kind === 'cards' || q.kind === 'react') {
    const picked = a.cards ?? [];
    if (!Array.isArray(picked) || !picked.every((x) => Number.isInteger(x))) return 'Choose from the cards offered.';
    if (new Set(picked).size !== picked.length) return 'A card can only be chosen once.';
    if (!picked.every((x) => q.cards.includes(x))) return 'That card is not one of the choices.';
    if (picked.length < q.min || picked.length > q.max)
      return q.min === q.max ? `Choose exactly ${q.min}.` : `Choose between ${q.min} and ${q.max}.`;
    return null;
  }
  if (q.kind === 'pile') {
    if (a.pile === undefined) return q.optional ? null : 'Choose a pile.';
    return q.piles.includes(a.pile) ? null : 'That pile is not one of the choices.';
  }
  return Number.isInteger(a.option) && a.option! >= 0 && a.option! < q.options.length ? null : 'Choose one of the options.';
}

function apply(lib: Library, prev: DeckState, seat: number, a: DeckAction): ApplyResult<DeckState> {
  if (prev.over) return fail('game-over', 'The game is over.');
  if (!a || typeof a !== 'object') return fail('bad-request', 'Unknown action.');
  if (a.type === 'decide') {
    if (!prev.pending) return fail('no-decision', 'Nothing is waiting for a decision.');
    if (prev.pending.seat !== seat) return fail('not-your-decision', 'Another player is deciding.');
    if (a.id !== prev.pending.id) return fail('stale-decision', 'That decision has already been made.');
    const problem = validAnswer(prev, a);
    if (problem) return fail('illegal-choice', problem);
  } else {
    if (prev.pending) return fail('decision-first', 'A decision has to be made first.');
    if (seat !== prev.turn.seat) return fail('not-your-turn', 'It is not your turn.');
    const legal = legalMoves(prev, lib, seat);
    if (a.type === 'play') {
      if (!prev.players[seat].hand.includes(a.card)) return fail('not-in-hand', 'That card is not in your hand.');
      if (!legal.play.includes(a.card)) {
        if (prev.turn.phase === 'action')
          return fail('illegal-play', prev.turn.actions > 0 ? 'Only actions can be played in this phase.' : 'You have no actions left.');
        return fail('illegal-play', prev.turn.bought ? 'Treasures must be played before buying.' : 'Only treasures can be played in this phase.');
      }
    } else if (a.type === 'buy') {
      if (typeof a.pile !== 'string' || !Object.hasOwn(prev.supply, a.pile)) return fail('bad-pile', 'That pile is not in this game.');
      if (prev.turn.phase !== 'buy') return fail('illegal-buy', 'Move to the buy phase first.');
      if (!legal.buy.includes(a.pile)) {
        if (prev.turn.buys <= 0) return fail('illegal-buy', 'You have no buys left.');
        if (!prev.supply[a.pile].length) return fail('illegal-buy', 'That pile is empty.');
        if (lib.defs[a.pile].noBuy) return fail('illegal-buy', 'That card cannot be bought.');
        return fail('illegal-buy', 'You do not have enough coins.');
      }
    } else if (a.type !== 'end-phase') return fail('bad-request', 'Unknown action.');
  }

  const state = structuredClone(prev);
  const rt = new Runtime(state, lib);
  switch (a.type) {
    case 'decide':
      rt.answer(a.cards ?? [], a.pile, a.option);
      break;
    case 'play': {
      if (state.turn.phase === 'action') state.turn.actions--;
      rt.startPlay(seat, a.card);
      break;
    }
    case 'buy': {
      state.turn.buys--;
      state.turn.coins -= costOf(state, lib, a.pile);
      state.turn.bought = true;
      rt.startBuy(seat, a.pile);
      break;
    }
    case 'end-phase':
      if (state.turn.phase === 'action') state.turn.phase = 'buy';
      else rt.endTurn();
      break;
  }
  return { ok: true, state, undoable: !rt.tainted && !state.over && state.turn.seat === seat };
}

function project(lib: Library, s: DeckState, viewer: number | null): DeckView {
  const ref = (id: CardId): CardRefView => ({ id, key: s.cards[id] });
  const self = viewer === null ? null : s.players[viewer];
  let pending: PendingView | null = null;
  if (s.pending) {
    const q = s.pending;
    const inHand = q.source !== null && s.players.some((p) => p.hand.includes(q.source!));
    const showSource = q.source !== null && (viewer === q.seat || !inHand);
    pending = {
      id: q.id,
      seat: q.seat,
      kind: q.kind,
      source: showSource ? s.cards[q.source!] : null,
      prompt: q.prompt,
      after: q.after,
      optional: q.optional,
      min: q.min,
      max: q.max,
    };
    if (viewer === q.seat) {
      pending.cards = q.cards.map(ref);
      pending.piles = q.piles;
      pending.options = q.options;
    }
  }
  const { costMods: _, ...turn } = s.turn;
  return {
    rulesetId: s.rulesetId,
    you: viewer,
    turn,
    market: s.market,
    supply: Object.keys(s.supply).map((key) => ({
      key,
      count: s.supply[key].length,
      cost: costOf(s, lib, key),
      buyable: !lib.defs[key].noBuy,
    })),
    trash: s.trash.map(ref),
    players: s.players.map((p, seat) => ({
      seat,
      handCount: p.hand.length,
      deckCount: p.deck.length,
      discardCount: p.discard.length,
      discardTop: p.discard.length ? ref(p.discard.at(-1)!) : null,
      play: p.play.map(ref),
      mats: Object.fromEntries(
        Object.entries(p.mats).map(([m, ids]) => [m, seat === viewer ? { count: ids.length, cards: ids.map(ref) } : { count: ids.length }]),
      ),
      tokens: p.tokens,
      vp: p.vp,
    })),
    hand: self ? self.hand.map(ref) : [],
    discard: self ? self.discard.map(ref) : [],
    revealed: s.limbo.filter((l) => l.public).map((l) => ref(l.id)),
    pending,
    legal: viewer === null ? { play: [], buy: [], endPhase: false } : legalMoves(s, lib, viewer),
    log: s.log.filter((e) => e.to === undefined || e.to === viewer),
    over: s.over,
    final: s.over ? finalScores(s, lib) : null,
  };
}

/** Deliberately plain: plays what it can, buys the dearest card it can afford, and takes the smallest legal choice. */
function bot(v: DeckView): BotMove<DeckAction> | null {
  const delayMs = 500;
  if (v.over || v.you === null) return null;
  const q = v.pending;
  if (q) {
    if (q.seat !== v.you) return null;
    if (q.kind === 'cards' || q.kind === 'react') return { actions: [{ type: 'decide', id: q.id, cards: (q.cards ?? []).slice(0, q.min).map((c) => c.id) }], delayMs };
    if (q.kind === 'pile') return { actions: [{ type: 'decide', id: q.id, pile: q.piles?.[0] }], delayMs };
    return { actions: [{ type: 'decide', id: q.id, option: 0 }], delayMs };
  }
  if (v.turn.seat !== v.you) return null;
  if (v.legal.play.length) return { actions: [{ type: 'play', card: v.legal.play[0] }, { type: 'end-phase' }], delayMs };
  const cost = (k: string) => v.supply.find((p) => p.key === k)!.cost;
  const buy = [...v.legal.buy].sort((a, b) => cost(b) - cost(a) || a.localeCompare(b)).filter((k) => cost(k) >= 2);
  return { actions: [...buy.slice(0, 1).map((pile): DeckAction => ({ type: 'buy', pile })), { type: 'end-phase' }], delayMs };
}

export function createDeckGame(rules: Ruleset): GameModule<DeckConfig, DeckState, DeckAction, DeckView> {
  const problems = validateRuleset(rules);
  if (problems.length) throw new Error(`deckbuilder: invalid ruleset ${rules.id}: ${problems.join('; ')}`);
  const lib = makeLibrary(rules);
  return {
    meta: { id: rules.id, name: rules.name, minPlayers: rules.minPlayers, maxPlayers: rules.maxPlayers, stateVersion: STATE_VERSION },
    options: [],
    defaultConfig: () => ({ market: [], bans: [] }),
    validateConfig(config, n) {
      if (n < rules.minPlayers || n > rules.maxPlayers) return `${rules.name} is for ${rules.minPlayers}–${rules.maxPlayers} players.`;
      return config.market.length ? validateMarket(rules, config.market, config.bans) : null;
    },
    setup: ({ playerCount, seed, config }) => setup(lib, playerCount, seed, config),
    apply: (s, seat, a) => apply(lib, s, seat, a),
    actors: (s) => (s.over ? [] : [s.pending ? s.pending.seat : s.turn.seat]),
    project: (s, viewer) => project(lib, s, viewer),
    isOver: (s) => s.over,
    results(s): PlayerResult[] | null {
      if (!s.over) return null;
      const scores = finalScores(s, lib);
      const beats = (a: FinalScore, b: FinalScore) => a.total > b.total || (a.total === b.total && a.turns < b.turns);
      return scores.map((me) => {
        const rank = 1 + scores.filter((o) => beats(o, me)).length;
        return { seat: me.seat, score: me.total, rank, winner: rank === 1 };
      });
    },
    bot,
    migrate(state, from) {
      if (from === STATE_VERSION) return state as DeckState;
      throw new Error(`deckbuilder: cannot read state version ${from}`);
    },
  };
}
