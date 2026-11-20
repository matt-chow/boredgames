/**
 * Ports & Provinces: trading sideways, gaining to hand, setting cards aside, Establishments and flexible buying. One
 * attack, no Influence. Specification: docs/expansions/FIVE_EXPANSION_MANIFEST.md, section D. Rule IDs CC-POR-*.
 */
import type { CardDef } from '../../../engine/deckbuilder';
import { action, actions, attack, buys, coins, device, draw, pick, pickOf, putBack } from './cards';

const inSet = (cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set: 'ports' }));

export const PORTS: CardDef[] = inSet([
  device('harbour_pilot', 'Harbour Pilot', 2, '+1 Action. Look at the top 2 cards of your deck. Discard one and put the other back. At the start of your next turn, draw 1.', [
    actions(1),
    { op: 'look', n: 2, as: 'sighted' },
    // CC-POR-1: with only 1 card to look at, discarding it is a choice.
    pick('dropped', 'Discard one. The other goes back on top.', { add: [{ len: 'sighted' }, -1] }, 1, { rest: 'sighted' }),
    { op: 'move', cards: { var: 'dropped' }, to: 'discard' },
    { op: 'move', cards: { rest: 'sighted' }, to: 'deck' },
    { op: 'delay', label: 'Harbour Pilot: draw 1', effects: [draw(1)] },
  ]),
  action('dockhand', 'Dockhand', 2, '+1 Buy. +1 Coin. You may put a card from your discard pile on top of your deck.', [
    buys(1),
    coins(1),
    pick('hauled', 'You may put a card from your discard pile on top of your deck.', 0, 1, 'discard', 'keep'),
    { op: 'move', cards: { var: 'hauled' }, to: 'deck', public: true },
  ]),
  action('barter_post', 'Barter Post', 3, '+1 Action. You may trash a card from your hand. If you do, gain a different card with the same cost to your hand. (Nothing can be gained for Bronze.)', [
    actions(1),
    pick('bartered', 'You may trash a card, to gain a different card with the same cost to your hand.', 0, 1),
    {
      op: 'if',
      cond: { has: 'bartered' },
      then: [
        { op: 'move', cards: { var: 'bartered' }, to: 'trash' },
        { op: 'choose-pile', filter: { exactCost: { costOf: 'bartered' }, notSameAs: 'bartered', notType: 'penalty' }, as: 'traded', prompt: 'Gain a different card with the same cost to your hand.' },
        { op: 'gain', pile: { var: 'traded' }, to: 'hand' },
      ],
    },
  ]),
  action('quayside_sale', 'Quayside Sale', 3, '+1 Action. Discard up to 2 cards. +1 Coin per card discarded, and +1 Coin more for each Renown card among them.', [
    actions(1),
    pick('sold', 'Discard up to 2 cards for Coins. Renown cards pay double.', 0, 2),
    { op: 'move', cards: { var: 'sold' }, to: 'discard' },
    coins({ add: [{ len: 'sold' }, { countIn: 'sold', filter: { type: 'victory' } }] }),
  ]),
  device('ferry_landing', 'Ferry Landing', 3, 'Draw 1. +1 Action. At the start of your next turn, +2 Actions.', [
    draw(1),
    actions(1),
    { op: 'delay', label: 'Ferry Landing: +2 Actions', effects: [actions(2)] },
  ]),
  action('chandler', 'Chandler', 4, 'Gain a card costing up to 3 Coins to your hand. If it is an Action, +1 Action.', [
    { op: 'choose-pile', filter: { maxCost: 3, notType: 'penalty' }, as: 'supplied', prompt: 'Gain a card costing up to 3 to your hand.' },
    { op: 'gain', pile: { var: 'supplied' }, to: 'hand' },
    { op: 'if', cond: { isType: 'supplied', type: 'action' }, then: [actions(1)] },
  ]),
  // CC-POR-7: the mat is private; other players see only how many cards are on it.
  device('bonded_store', 'Bonded Store', 4, '+1 Coin. Set aside up to 2 Currency cards from your hand. At the start of your next turn, put them into your hand and +1 Buy.', [
    coins(1),
    pickOf('bonded', 'Set aside up to 2 Currency cards for next turn.', 0, 2, { type: 'treasure' }, 'hand', 'keep'),
    { op: 'move', cards: { var: 'bonded' }, to: { mat: 'bonded' } },
    { op: 'delay', label: 'Bonded Store: take back your Currency, +1 Buy', effects: [{ op: 'move', cards: { var: 'bonded' }, to: 'hand' }, buys(1)] },
  ]),
  action('trade_agreement', 'Trade Agreement', 4, '+1 Action. Discard a card. Choose an opponent: they may discard a card. If they do, you each draw 2 cards. Otherwise, you draw 1.', [
    actions(1),
    pick('offered', 'Discard a card.', 1, 1),
    { op: 'move', cards: { var: 'offered' }, to: 'discard' },
    { op: 'choose-player', as: 'opp', prompt: 'Choose an opponent to offer the trade.' },
    {
      op: 'on-player',
      player: { var: 'opp' },
      effects: [
        pick('accepted', 'Trade Agreement: discard a card so you each draw 2?', 0, 1),
        { op: 'move', cards: { var: 'accepted' }, to: 'discard' },
        { op: 'pass-up', var: 'accepted' },
      ],
    },
    {
      op: 'if',
      cond: { has: 'accepted' },
      then: [draw(2), { op: 'on-player', player: { var: 'opp' }, effects: [draw(2)] }],
      else: [draw(1)],
    },
  ]),
  action('cargo_manifest', 'Cargo Manifest', 4, 'Draw 1, plus 1 per Establishment you have in play, up to 4 cards in total.', [
    { op: 'select', from: 'play', filter: { type: 'duration' }, as: 'berthed' },
    draw({ min: [{ add: [{ len: 'berthed' }, 1] }, 4] }),
  ]),
  device('grain_hoy', 'Grain Hoy', 5, 'Look at the top 3 cards of your deck. Put one into your hand and the rest back in any order. At the start of your next turn, +2 Coins.', [
    { op: 'look', n: 3, as: 'hold' },
    pick('unloaded', 'Put one into your hand.', 1, 1, { rest: 'hold' }, 'keep'),
    { op: 'move', cards: { var: 'unloaded' }, to: 'hand' },
    ...putBack('hold', 'deck', 2, 'Put a card back on your deck. The last one you choose ends up on top.'),
    { op: 'delay', label: 'Grain Hoy: +2 Coins', effects: [coins(2)] },
  ]),
  action('hiring_day', 'Hiring Day', 5, '+2 Buys. +1 Coin. This turn, each time you buy a card costing 2 Coins or more, +1 Coin.', [
    buys(2),
    coins(1),
    { op: 'on', on: 'buy', label: 'Hiring Day: +1 Coin', effects: [{ op: 'if', cond: { gte: [{ costOf: 'event' }, 2] }, then: [coins(1)] }] },
  ]),
  attack('customs_cutter', 'Customs Cutter', 5, '+2 Coins. Each opponent reveals the top card of their deck. If it is a Currency costing 3 Coins or more, they discard it. If anyone discarded a card this way, gain a Silver.', [
    coins(2),
    {
      op: 'attack',
      effects: [
        { op: 'reveal', n: 1, as: 'cargo' },
        { op: 'select', from: { rest: 'cargo' }, filter: { type: 'treasure', minCost: 3 }, as: 'seized' },
        { op: 'move', cards: { var: 'seized' }, to: 'discard' },
        { op: 'move', cards: { rest: 'cargo' }, to: 'deck' },
        { op: 'pass-up', var: 'seized' },
      ],
    },
    { op: 'if', cond: { has: 'seized' }, then: [{ op: 'gain', pile: 'cog' }] },
  ]),
  action('landing_rights', 'Landing Rights', 5, '+1 Buy. +2 Coins. This turn, the first time you gain a Renown card, +1 Renown.', [
    buys(1),
    coins(2),
    { op: 'on', on: 'gain', filter: { type: 'victory' }, label: 'Landing Rights: +1 Renown', once: true, effects: [{ op: 'vp', n: 1 }] },
  ]),
  device('galleass', 'Galleass', 6, 'Draw 2. At the start of your next turn, draw 2 and +1 Action.', [
    draw(2),
    { op: 'delay', label: 'Galleass: draw 2, +1 Action', effects: [draw(2), actions(1)] },
  ]),
]);
