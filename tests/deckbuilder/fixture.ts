/**
 * A test-only ruleset. Each card exercises engine primitives and is named for what it tests. It is not a playable
 * game's content and must never be listed in the hub.
 */
import { createDeckGame } from '../../src/engine/deckbuilder';
import type { CardDef, CardId, DeckAction, DeckState, Effect, Ruleset } from '../../src/engine/deckbuilder';

const action = (key: string, cost: number, effects: Effect[], extra: Partial<CardDef> = {}): CardDef => ({
  key,
  name: key,
  cost,
  types: ['action'],
  text: key,
  status: 'ready',
  effects,
  ...extra,
});

const hand = 'hand' as const;

export const CARDS: CardDef[] = [
  { key: 'coin1', name: 'coin1', cost: 0, types: ['treasure'], text: '', status: 'ready', basic: true, coins: 1 },
  { key: 'coin2', name: 'coin2', cost: 3, types: ['treasure'], text: '', status: 'ready', basic: true, coins: 2 },
  { key: 'point1', name: 'point1', cost: 2, types: ['victory'], text: '', status: 'ready', basic: true, vp: 1 },
  { key: 'point5', name: 'point5', cost: 8, types: ['victory'], text: '', status: 'ready', basic: true, vp: 5 },
  { key: 'minus1', name: 'minus1', cost: 0, types: ['penalty'], text: '', status: 'ready', basic: true, vp: -1, noBuy: true },

  action('draw2', 3, [{ op: 'draw', n: 2 }]),
  action('resources', 3, [{ op: 'actions', n: 2 }, { op: 'buys', n: 1 }, { op: 'coins', n: 2 }, { op: 'token', token: 'gem', n: 1 }, { op: 'vp', n: 1 }]),
  action('trash-up-to-2', 2, [
    { op: 'choose-cards', from: hand, min: 0, max: 2, as: 'picked', prompt: 'Trash up to 2.' },
    { op: 'move', cards: { var: 'picked' }, to: 'trash' },
  ]),
  action('discard-exactly-2', 2, [
    { op: 'choose-cards', from: hand, min: 2, max: 2, as: 'picked', prompt: 'Discard 2.' },
    { op: 'move', cards: { var: 'picked' }, to: 'discard' },
  ]),
  action('upgrade', 4, [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Trash a card.' },
    { op: 'move', cards: { var: 'picked' }, to: 'trash' },
    { op: 'choose-pile', filter: { maxCost: { costOf: 'picked', plus: 2 } }, as: 'pile', prompt: 'Gain a card.' },
    { op: 'gain', pile: { var: 'pile' }, to: 'hand' },
  ]),
  action('topdeck', 2, [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Put a card on your deck.' },
    { op: 'move', cards: { var: 'picked' }, to: 'deck' },
  ]),
  action('stash', 2, [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Put a card on your mat.' },
    { op: 'move', cards: { var: 'picked' }, to: { mat: 'stash' } },
  ]),
  action('look2', 2, [
    { op: 'look', n: 2, as: 'seen' },
    { op: 'choose-cards', from: { var: 'seen' }, min: 1, max: 1, as: 'kept', prompt: 'Keep one.' },
    { op: 'move', cards: { var: 'kept' }, to: 'hand' },
    { op: 'move', cards: { rest: 'seen' }, to: 'discard' },
  ]),
  action('reveal1', 2, [
    { op: 'reveal', n: 1, as: 'shown' },
    { op: 'if', cond: { isType: 'shown', type: 'treasure' }, then: [{ op: 'move', cards: { var: 'shown' }, to: 'hand', public: true }], else: [{ op: 'move', cards: { var: 'shown' }, to: 'discard' }] },
  ]),
  action('option', 2, [
    {
      op: 'choose',
      prompt: 'Pick one.',
      options: [
        { label: 'Draw 1', then: [{ op: 'draw', n: 1 }] },
        {
          label: 'Trash then gain',
          then: [
            { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Trash one.' },
            { op: 'move', cards: { var: 'picked' }, to: 'trash' },
            { op: 'may', prompt: 'Gain a coin2?', then: [{ op: 'gain', pile: 'coin2' }], else: [{ op: 'coins', n: 1 }] },
          ],
        },
      ],
    },
  ]),
  action('repeat3', 2, [{ op: 'repeat', n: 3, effects: [{ op: 'coins', n: 1 }] }]),
  action('replay2', 4, [
    { op: 'choose-cards', from: hand, min: 0, max: 1, filter: { type: 'action' }, as: 'picked', prompt: 'Play an action twice.' },
    { op: 'play-card', cards: { var: 'picked' }, times: 2 },
  ]),
  action('discount', 3, [{ op: 'cost-mod', delta: -1, filter: { type: 'action' } }]),
  action('reshuffle', 2, [{ op: 'shuffle' }]),
  action('self-trash', 2, [{ op: 'coins', n: 1 }, { op: 'move', cards: 'source', to: 'trash' }]),
  action('another-turn', 5, [{ op: 'extra-turn' }]),
  action('temp-trigger', 2, [{ op: 'on', on: 'gain', label: 'coin per gain', effects: [{ op: 'coins', n: 1 }] }]),
  action('custom', 2, [{ op: 'custom', handler: 'bump', args: { by: 3 } }]),
  action('hit-discard', 4, [
    {
      op: 'attack',
      effects: [
        { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Discard a card.' },
        { op: 'move', cards: { var: 'picked' }, to: 'discard' },
      ],
    },
  ], { types: ['action', 'attack'] }),
  action('hit-penalty', 4, [{ op: 'coins', n: 1 }, { op: 'attack', effects: [{ op: 'gain', pile: 'minus1' }] }], { types: ['action', 'attack'] }),
  action('bonus-all', 3, [{ op: 'each-other', effects: [{ op: 'draw', n: 1 }] }]),
  action('shield', 2, [{ op: 'draw', n: 1 }], { types: ['action', 'reaction'], reaction: { label: 'Immunity', effects: [{ op: 'immune' }] } }),
  action('later', 3, [{ op: 'delay', label: 'Coins next turn', effects: [{ op: 'coins', n: 2 }] }], { types: ['action', 'duration'] }),
  action('later2', 3, [{ op: 'delay', label: 'Draw next turn', effects: [{ op: 'draw', n: 1 }] }], { types: ['action', 'duration'] }),
  action('watcher-a', 3, [], { triggers: [{ on: 'gain', where: 'play', label: 'A', effects: [{ op: 'coins', n: 1 }] }] }),
  action('watcher-b', 3, [], { triggers: [{ on: 'gain', where: 'play', label: 'B', effects: [{ op: 'coins', n: 10 }] }] }),
  action('gains-to-deck', 3, [], { triggers: [{ on: 'gain', where: 'self', label: 'To deck', optional: 'Put it on your deck?', effects: [{ op: 'move', cards: { var: 'event' }, to: 'deck' }] }] }),
  { key: 'per3', name: 'per3', cost: 4, types: ['victory'], text: '', status: 'ready', vp: { per: 3, each: 1 } },
  action('unfinished', 2, [], { status: 'draft' }),
];

export const SELECTABLE = CARDS.filter((c) => !c.basic && c.status === 'ready').map((c) => c.key);

export const RULES: Ruleset = {
  id: 'fixture',
  name: 'Fixture',
  minPlayers: 2,
  maxPlayers: 6,
  cards: CARDS,
  startingDeck: [
    { key: 'coin1', count: 7 },
    { key: 'point1', count: 3 },
  ],
  handSize: 5,
  marketSize: 10,
  basicPiles: (n) => ({ coin1: 40, coin2: 30, point1: n <= 2 ? 8 : 12, point5: n <= 2 ? 8 : n <= 4 ? 12 : 15, minus1: (n - 1) * 10 }),
  marketPileSize: () => 10,
  endPiles: ['point5'],
  emptyPilesToEnd: (n) => (n <= 4 ? 3 : 4),
  handlers: {
    bump: (rt, args) => {
      rt.state.turn.coins += Number(args.by);
    },
  },
};

export const game = createDeckGame(RULES);

export const DEFAULT_MARKET = ['draw2', 'resources', 'trash-up-to-2', 'upgrade', 'look2', 'option', 'hit-discard', 'shield', 'later', 'replay2'];

/** A persisted-and-reloaded state must behave identically, so every test step goes through JSON. */
export const roundTrip = (s: DeckState): DeckState => JSON.parse(JSON.stringify(s));

export function start(players = 2, market = DEFAULT_MARKET, seed = 'seed') {
  return game.setup({ playerCount: players, seed, config: { market, bans: [] } });
}

export function act(s: DeckState, seat: number, a: DeckAction): DeckState {
  const r = game.apply(roundTrip(s), seat, a);
  if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
  return r.state;
}

/** Add a new card of any kind to a seat's hand (test setup only). */
export function mint(s: DeckState, seat: number, key: string): CardId {
  const id = Math.max(...Object.keys(s.cards).map(Number)) + 1;
  s.cards[id] = key;
  s.players[seat].hand.push(id);
  return id;
}

export function deckOn(s: DeckState, seat: number, keys: string[]) {
  /** Lay these cards on top of the deck; the first listed is drawn first. */
  for (const key of [...keys].reverse()) {
    const id = Math.max(...Object.keys(s.cards).map(Number)) + 1;
    s.cards[id] = key;
    s.players[seat].deck.push(id);
  }
}

export const keysOf = (s: DeckState, ids: CardId[]) => ids.map((id) => s.cards[id]);

/** Every card must be in exactly one place. */
export function assertConserved(s: DeckState) {
  const all: CardId[] = [...s.trash, ...s.limbo.map((l) => l.id), ...Object.values(s.supply).flat()];
  for (const p of s.players) all.push(...p.deck, ...p.hand, ...p.discard, ...p.play, ...Object.values(p.mats).flat());
  const total = Object.keys(s.cards).length;
  if (all.length !== total || new Set(all).size !== total) throw new Error(`cards not conserved: ${all.length} placed, ${new Set(all).size} distinct, ${total} exist`);
}
