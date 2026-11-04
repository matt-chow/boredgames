/**
 * The test bench ruleset. Each card exercises engine primitives and is named for what it tests. It is engineering
 * fixture data, not a playable game's content: it is never listed in the hub and never reaches a production build.
 */
import type { CardDef, Effect, Ruleset } from '../../../engine/deckbuilder/types';

/** Names for the table UI, read from the key: `trash-up-to-2` becomes `Trash up to 2`. */
const title = (key: string) => key[0].toUpperCase() + key.slice(1).replace(/-/g, ' ');

const action = (key: string, cost: number, text: string, effects: Effect[], extra: Partial<CardDef> = {}): CardDef => ({
  key,
  name: title(key),
  cost,
  types: ['action'],
  text,
  status: 'ready',
  effects,
  ...extra,
});

const hand = 'hand' as const;

export const CARDS: CardDef[] = [
  { key: 'coin1', name: 'Coin 1', cost: 0, types: ['treasure'], text: 'Worth 1 coin.', status: 'ready', basic: true, coins: 1 },
  { key: 'coin2', name: 'Coin 2', cost: 3, types: ['treasure'], text: 'Worth 2 coins.', status: 'ready', basic: true, coins: 2 },
  { key: 'point1', name: 'Point 1', cost: 2, types: ['victory'], text: 'Worth 1 point.', status: 'ready', basic: true, vp: 1 },
  { key: 'point5', name: 'Point 5', cost: 8, types: ['victory'], text: 'Worth 5 points. The game ends when this pile runs out.', status: 'ready', basic: true, vp: 5 },
  { key: 'minus1', name: 'Minus 1', cost: 0, types: ['penalty'], text: 'Worth −1 point. Cannot be bought.', status: 'ready', basic: true, vp: -1, noBuy: true },

  action('draw2', 3, 'Draw 2 cards.', [{ op: 'draw', n: 2 }]),
  action('resources', 3, '+2 actions, +1 buy, +2 coins, 1 gem token and 1 point token.', [{ op: 'actions', n: 2 }, { op: 'buys', n: 1 }, { op: 'coins', n: 2 }, { op: 'token', token: 'gem', n: 1 }, { op: 'vp', n: 1 }]),
  action('trash-up-to-2', 2, 'Trash up to 2 cards from your hand.', [
    { op: 'choose-cards', from: hand, min: 0, max: 2, as: 'picked', prompt: 'Trash up to 2.' },
    { op: 'move', cards: { var: 'picked' }, to: 'trash' },
  ]),
  action('discard-exactly-2', 2, 'Discard exactly 2 cards from your hand.', [
    { op: 'choose-cards', from: hand, min: 2, max: 2, as: 'picked', prompt: 'Discard 2.' },
    { op: 'move', cards: { var: 'picked' }, to: 'discard' },
  ]),
  action('upgrade', 4, 'Trash a card from your hand. Gain a card costing up to 2 more, to your hand.', [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Trash a card.' },
    { op: 'move', cards: { var: 'picked' }, to: 'trash' },
    { op: 'choose-pile', filter: { maxCost: { costOf: 'picked', plus: 2 } }, as: 'pile', prompt: 'Gain a card.' },
    { op: 'gain', pile: { var: 'pile' }, to: 'hand' },
  ]),
  action('topdeck', 2, 'Put a card from your hand on top of your deck.', [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Put a card on your deck.' },
    { op: 'move', cards: { var: 'picked' }, to: 'deck' },
  ]),
  action('stash', 2, 'Put a card from your hand on your stash mat.', [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Put a card on your mat.' },
    { op: 'move', cards: { var: 'picked' }, to: { mat: 'stash' } },
  ]),
  action('look2', 2, 'Look at the top 2 cards of your deck. Keep one and discard the other.', [
    { op: 'look', n: 2, as: 'seen' },
    { op: 'choose-cards', from: { var: 'seen' }, min: 1, max: 1, as: 'kept', prompt: 'Keep one.' },
    { op: 'move', cards: { var: 'kept' }, to: 'hand' },
    { op: 'move', cards: { rest: 'seen' }, to: 'discard' },
  ]),
  action('reveal1', 2, 'Reveal the top card of your deck. A treasure goes to your hand; anything else is discarded.', [
    { op: 'reveal', n: 1, as: 'shown' },
    { op: 'if', cond: { isType: 'shown', type: 'treasure' }, then: [{ op: 'move', cards: { var: 'shown' }, to: 'hand', public: true }], else: [{ op: 'move', cards: { var: 'shown' }, to: 'discard' }] },
  ]),
  action('option', 2, 'Choose: draw a card, or trash a card and then choose a follow-up.', [
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
  action('repeat3', 2, '+1 coin, three times.', [{ op: 'repeat', n: 3, effects: [{ op: 'coins', n: 1 }] }]),
  action('replay2', 4, 'You may play an action from your hand twice.', [
    { op: 'choose-cards', from: hand, min: 0, max: 1, filter: { type: 'action' }, as: 'picked', prompt: 'Play an action twice.' },
    { op: 'play-card', cards: { var: 'picked' }, times: 2 },
  ]),
  action('discount', 3, 'Actions cost 1 less this turn.', [{ op: 'cost-mod', delta: -1, filter: { type: 'action' } }]),
  action('reshuffle', 2, 'Shuffle your discard pile into your deck.', [{ op: 'shuffle' }]),
  action('self-trash', 2, '+1 coin. Trash this card.', [{ op: 'coins', n: 1 }, { op: 'move', cards: 'source', to: 'trash' }]),
  action('another-turn', 5, 'Take another turn after this one.', [{ op: 'extra-turn' }]),
  action('temp-trigger', 2, 'This turn, +1 coin whenever you gain a card.', [{ op: 'on', on: 'gain', label: 'coin per gain', effects: [{ op: 'coins', n: 1 }] }]),
  action('custom', 2, '+3 coins, through a custom handler.', [{ op: 'custom', handler: 'bump', args: { by: 3 } }]),
  action('hit-discard', 4, 'Attack: each other player discards a card.', [
    {
      op: 'attack',
      effects: [
        { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Discard a card.' },
        { op: 'move', cards: { var: 'picked' }, to: 'discard' },
      ],
    },
  ], { types: ['action', 'attack'] }),
  action('hit-penalty', 4, '+1 coin. Attack: each other player gains a Minus 1.', [{ op: 'coins', n: 1 }, { op: 'attack', effects: [{ op: 'gain', pile: 'minus1' }] }], { types: ['action', 'attack'] }),
  action('bonus-all', 3, 'Each other player draws a card.', [{ op: 'each-other', effects: [{ op: 'draw', n: 1 }] }]),
  action('shield', 2, 'Draw a card. Reaction: reveal when attacked to be unaffected.', [{ op: 'draw', n: 1 }], { types: ['action', 'reaction'], reaction: { label: 'Immunity', effects: [{ op: 'immune' }] } }),
  action('later', 3, 'At the start of your next turn, +2 coins.', [{ op: 'delay', label: 'Coins next turn', effects: [{ op: 'coins', n: 2 }] }], { types: ['action', 'duration'] }),
  action('later2', 3, 'At the start of your next turn, draw a card.', [{ op: 'delay', label: 'Draw next turn', effects: [{ op: 'draw', n: 1 }] }], { types: ['action', 'duration'] }),
  action('watcher-a', 3, 'While in play, +1 coin whenever you gain a card.', [], { triggers: [{ on: 'gain', where: 'play', label: 'A', effects: [{ op: 'coins', n: 1 }] }] }),
  action('watcher-b', 3, 'While in play, +10 coins whenever you gain a card.', [], { triggers: [{ on: 'gain', where: 'play', label: 'B', effects: [{ op: 'coins', n: 10 }] }] }),
  action('gains-to-deck', 3, 'When you gain this, you may put it on your deck.', [], { triggers: [{ on: 'gain', where: 'self', label: 'To deck', optional: 'Put it on your deck?', effects: [{ op: 'move', cards: { var: 'event' }, to: 'deck' }] }] }),
  action('reveal-until-cost3', 3, 'Reveal cards from your deck until one costs 3 or more. It goes to your hand; discard the rest.', [
    {
      op: 'until',
      cond: { any: [{ gte: [{ countIn: 'shown', filter: { minCost: 3 } }, 1] }, { not: { gte: [{ count: 'deck+discard' }, 1] } }] },
      effects: [{ op: 'reveal', n: 1, as: 'shown', append: true }],
    },
    { op: 'select', from: { var: 'shown' }, filter: { minCost: 3 }, as: 'hit' },
    { op: 'move', cards: { var: 'hit' }, to: 'hand', public: true },
    { op: 'move', cards: { rest: 'shown' }, to: 'discard' },
  ]),
  action('refill-to-4', 3, 'Draw until you hold 4 cards.', [
    { op: 'until', cond: { any: [{ gte: [{ count: 'hand' }, 4] }, { not: { gte: [{ count: 'deck+discard' }, 1] } }] }, effects: [{ op: 'draw', n: 1 }] },
  ]),
  action('show-hand', 2, 'Reveal your hand. +1 coin per treasure in it.', [
    { op: 'reveal-cards', cards: 'hand' },
    { op: 'select', from: hand, filter: { type: 'treasure' }, as: 'found' },
    { op: 'coins', n: { len: 'found' } },
  ]),
  action('reclaim-from-trash', 3, 'You may gain a card costing up to 3 from the trash, to your hand.', [
    { op: 'choose-cards', from: 'trash', min: 0, max: 1, filter: { maxCost: 3 }, as: 'picked', prompt: 'Take a card from the trash.' },
    { op: 'gain-card', cards: { var: 'picked' }, to: 'hand' },
  ]),
  action('rival-picks', 4, 'Each other player looks at the top 2 cards of their deck. You choose one for them to keep; they discard the other.', [
    {
      op: 'attack',
      effects: [
        { op: 'look', n: 2, as: 'seen' },
        { op: 'choose-cards', from: { var: 'seen' }, min: 1, max: 1, as: 'kept', prompt: 'Choose the card they keep.', by: 'parent' },
        { op: 'move', cards: { var: 'kept' }, to: 'hand' },
        { op: 'move', cards: { rest: 'seen' }, to: 'discard' },
      ],
    },
  ], { types: ['action', 'attack'] }),
  action('tally-reveals', 4, 'Each other player reveals and discards the top card of their deck. +1 coin per treasure among them.', [
    {
      op: 'attack',
      effects: [
        { op: 'reveal', n: 1, as: 'shown' },
        { op: 'select', from: { var: 'shown' }, filter: { type: 'treasure' }, as: 'found' },
        { op: 'pass-up', var: 'found', as: 'hits' },
        { op: 'move', cards: { var: 'shown' }, to: 'discard' },
      ],
    },
    { op: 'coins', n: { len: 'hits' } },
  ], { types: ['action', 'attack'] }),
  action('hand-tribute', 5, 'Each other player gives you a card from their hand.', [
    {
      op: 'attack',
      effects: [
        { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'given', prompt: 'Give a card.' },
        { op: 'move', cards: { var: 'given' }, to: 'hand', player: 'parent' },
      ],
    },
  ], { types: ['action', 'attack'] }),
  action('pass-left', 2, 'Give a card from your hand to the next player.', [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'given', prompt: 'Give a card.' },
    { op: 'move', cards: { var: 'given' }, to: 'hand', player: 'left' },
  ]),
  action('first-gain-bonus', 2, 'This turn, +3 coins the first time you gain a card.', [{ op: 'on', on: 'gain', label: 'First gain', once: true, effects: [{ op: 'coins', n: 3 }] }]),
  action('pick-2-of-4', 3, 'Choose two different: +2 coins, +1 buy, draw a card, or 1 gem token.', [
    {
      op: 'choose',
      prompt: 'Pick one.',
      pick: 2,
      options: [
        { label: '+2 coins', then: [{ op: 'coins', n: 2 }] },
        { label: '+1 buy', then: [{ op: 'buys', n: 1 }] },
        { label: 'Draw a card', then: [{ op: 'draw', n: 1 }] },
        { label: '1 gem', then: [{ op: 'token', token: 'gem', n: 1 }] },
      ],
    },
  ]),
  action('same-key-gain', 3, 'You may choose a card in your hand and gain another of it.', [
    { op: 'choose-cards', from: hand, min: 0, max: 1, as: 'picked', prompt: 'Choose a card.' },
    { op: 'choose-pile', filter: { sameAs: 'picked' }, as: 'pile', prompt: 'Gain a copy.' },
    { op: 'gain', pile: { var: 'pile' } },
  ]),
  action('other-key-gain', 3, 'Choose a card in your hand. Gain a card costing up to 2 that is not the same card.', [
    { op: 'choose-cards', from: hand, min: 1, max: 1, as: 'picked', prompt: 'Choose a card.' },
    { op: 'choose-pile', filter: { notSameAs: 'picked', maxCost: 2 }, as: 'pile', prompt: 'Gain a different card.' },
    { op: 'gain', pile: { var: 'pile' } },
  ]),
  { key: 'per2-treasures', name: 'Per 2 treasures', cost: 4, types: ['victory'], text: 'Worth 1 point per 2 treasures you own.', status: 'ready', vp: { per: 2, each: 1, of: { type: 'treasure' } } },
  { key: 'per3', name: 'Per 3', cost: 4, types: ['victory'], text: 'Worth 1 point per 3 cards you own.', status: 'ready', vp: { per: 3, each: 1 } },
  action('unfinished', 2, 'A draft card. Never selectable.', [], { status: 'draft' }),
];

export const RULES: Ruleset = {
  id: 'fixture',
  name: 'Deck bench',
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
