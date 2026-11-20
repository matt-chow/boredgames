/**
 * The Merchant Republics: a Currency economy, extra Buys, Currency cost cuts and deals with an opponent. It makes no
 * Influence; Bourse spends it. Specification: docs/expansions/FIVE_EXPANSION_MANIFEST.md, section A. Rule IDs CC-REP-*.
 */
import type { CardDef, Effect } from '../../../engine/deckbuilder';
import { action, actions, buys, coins, currency, device, draw, hasSpark, pickOf, prestige, spark } from './cards';

const inSet = (cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set: 'republics' }));
const opponent: Effect = { op: 'choose-player', as: 'opp', prompt: 'Choose an opponent.' };

export const REPUBLICS: CardDef[] = inSet([
  action('coin_clipper', 'Coin Clipper', 2, '+1 Action. You may trash a Bronze from your hand. If you do, +1 Coin and +1 Buy.', [
    actions(1),
    pickOf('clipped', 'You may trash a Bronze for +1 Coin and +1 Buy.', 0, 1, { key: 'scrap' }),
    { op: 'if', cond: { has: 'clipped' }, then: [{ op: 'move', cards: { var: 'clipped' }, to: 'trash' }, coins(1), buys(1)] },
  ]),
  currency('promissory_note', 'Promissory Note', 2, '+1 Coin. +1 Buy. You may trash this card. If you do, +2 Coins.', 1, {
    effects: [buys(1), { op: 'may', prompt: 'Trash Promissory Note for +2 Coins?', then: [{ op: 'move', cards: 'source', to: 'trash' }, coins(2)] }],
  }),
  action('florin_table', 'Florin Table', 3, '+1 Action. +1 Buy. You may discard a Currency card from your hand. If you do, +2 Coins.', [
    actions(1),
    buys(1),
    pickOf('cashed', 'You may discard a Currency for +2 Coins.', 0, 1, { type: 'treasure' }),
    { op: 'if', cond: { has: 'cashed' }, then: [{ op: 'move', cards: { var: 'cashed' }, to: 'discard' }, coins(2)] },
  ]),
  action('fondaco', 'Fondaco', 3, '+2 Actions. Draw 1 card per Currency costing 3 or more in your hand, up to 2.', [
    actions(2),
    // CC-REP-4: counted once, before the draw, at the current cost.
    { op: 'select', from: 'hand', filter: { type: 'treasure', minCost: 3 }, as: 'goods' },
    draw({ min: [{ len: 'goods' }, 2] }),
  ]),
  action('underwriter', 'Underwriter', 3, '+1 Action. +1 Coin. When another player buys a card costing 6 or more, you may reveal this from your hand to gain a Silver.', [actions(1), coins(1)], {
    types: ['action', 'reaction'],
    typeLine: 'Action · Reaction',
    triggers: [
      {
        on: 'buy',
        where: 'hand',
        scope: 'others',
        label: 'Underwriter: gain a Silver',
        // CC-REP-5: the cost the buyer paid, so their cost cuts count. Cheaper buys ask nothing.
        effects: [{ op: 'if', cond: { gte: [{ costOf: 'event' }, 6] }, then: [{ op: 'may', prompt: 'Reveal Underwriter to gain a Silver?', then: [{ op: 'gain', pile: 'cog' }] }] }],
      },
    ],
  }),
  action('lending_house', 'Lending House', 3, '+1 Buy. +1 Coin. You may put a Currency card from your hand on top of your deck. If you do, +2 Coins.', [
    buys(1),
    coins(1),
    pickOf('lent', 'You may put a Currency on top of your deck for +2 Coins.', 0, 1, { type: 'treasure' }),
    { op: 'if', cond: { has: 'lent' }, then: [{ op: 'move', cards: { var: 'lent' }, to: 'deck' }, coins(2)] },
  ]),
  action('wholesaler', 'Wholesaler', 4, '+1 Action. +1 Buy. This turn, Currency cards cost 1 Coin less, but not less than 0.', [
    actions(1),
    buys(1),
    { op: 'cost-mod', delta: -1, filter: { type: 'treasure' } },
  ]),
  action('bookkeeper', 'Bookkeeper', 4, 'Reveal the top 4 cards of your deck. Put the Currency cards among them into your hand and discard the rest.', [
    { op: 'reveal', n: 4, as: 'books' },
    { op: 'select', from: { rest: 'books' }, filter: { type: 'treasure' }, as: 'cash' },
    { op: 'move', cards: { var: 'cash' }, to: 'hand', public: true },
    { op: 'move', cards: { rest: 'books' }, to: 'discard' },
  ]),
  action('partnership', 'Partnership', 4, '+1 Buy. Choose an opponent. They choose one: they gain a Silver and you get +3 Coins; or you gain a Silver and get +1 Coin.', [
    buys(1),
    opponent,
    {
      op: 'choose',
      by: { var: 'opp' },
      prompt: 'Partnership: choose the deal.',
      options: [
        { label: 'You gain a Silver; they get +3 Coins', then: [{ op: 'gain', pile: 'cog', player: { var: 'opp' } }, coins(3)] },
        { label: 'They gain a Silver and get +1 Coin', then: [{ op: 'gain', pile: 'cog' }, coins(1)] },
      ],
    },
  ]),
  action('gilder', 'Gilder', 5, '+1 Buy. Gain a Currency card costing up to 4 Coins to your hand.', [
    buys(1),
    { op: 'choose-pile', filter: { type: 'treasure', maxCost: 4 }, as: 'gilt', prompt: 'Gain a Currency costing up to 4 to your hand.' },
    { op: 'gain', pile: { var: 'gilt' }, to: 'hand' },
  ]),
  // CC-REP-11: Bronze never counts, so it cannot be bought for free points.
  prestige('ledger_hall', 'Ledger Hall', 5, 'Worth 1 Renown per 3 Currency cards you own other than Bronze.', { per: 3, each: 1, of: { type: 'treasure', notKey: 'scrap' } }),
  device('compound_interest', 'Compound Interest', 5, '+1 Buy. At the start of your next turn, +1 Coin per 2 Currency cards in your hand, rounded up.', [
    buys(1),
    {
      op: 'delay',
      label: 'Compound Interest: +1 Coin per 2 Currency',
      effects: [{ op: 'select', from: 'hand', filter: { type: 'treasure' }, as: 'held' }, coins({ div: [{ len: 'held' }, 2], up: true })],
    },
  ]),
  action('bourse', 'Bourse', 5, '+1 Buy. +2 Coins. You may spend 2 Influence. If you do, gain a Silver to your hand.', [
    buys(1),
    coins(2),
    {
      op: 'if',
      cond: { all: [hasSpark(2), { not: { pileEmpty: 'cog' } }] },
      then: [{ op: 'may', prompt: 'Spend 2 Influence to gain a Silver to your hand?', then: [spark(-2), { op: 'gain', pile: 'cog', to: 'hand' }] }],
    },
  ]),
  currency('gold_florin', 'Gold Florin', 6, '+2 Coins. If you have played no Action cards this turn, +2 Coins more and +1 Buy.', 2, {
    effects: [{ op: 'if', cond: { not: { gte: [{ actionsPlayed: true }, 1] } }, then: [coins(2), buys(1)] }],
  }),
]);
