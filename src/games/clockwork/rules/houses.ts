/**
 * Houses of Influence: court politics. Opponents choose your reward, you choose whom to help, and Influence pays for
 * attacks. Specification: docs/expansions/FIVE_EXPANSION_MANIFEST.md, section B. Rule IDs CC-HOU-*.
 */
import type { CardDef, Effect } from '../../../engine/deckbuilder';
import { action, actions, attack, buys, civic, coins, device, discardOne, draw, hasSpark, pick, prestige, reactionCard, spark, SPARK } from './cards';

const inSet = (cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set: 'houses' }));
const opponent = (prompt = 'Choose an opponent.'): Effect => ({ op: 'choose-player', as: 'opp', prompt });
const giveInfluence = (n: number): Effect => ({ op: 'token', token: SPARK, n, player: { var: 'opp' } });

export const HOUSES: CardDef[] = inSet([
  reactionCard(
    'household_guard',
    'Household Guard',
    2,
    '+1 Action. +1 Coin. When another player plays an Attack, you may reveal this from your hand to draw 1 card, then put a card from your hand on top of your deck.',
    [actions(1), coins(1)],
    {
      label: 'Draw 1, then put a card on top of your deck',
      effects: [draw(1), pick('guarded', 'Put a card from your hand on top of your deck.', 1, 1), { op: 'move', cards: { var: 'guarded' }, to: 'deck' }],
    },
  ),
  action('antechamber', 'Antechamber', 3, 'Draw 1. +2 Actions. You may spend 1 Influence to draw 1 more.', [
    draw(1),
    actions(2),
    { op: 'if', cond: hasSpark(1), then: [{ op: 'may', prompt: 'Spend 1 Influence to draw 1 more?', then: [spark(-1), draw(1)] }] },
  ]),
  attack('bribed_magistrate', 'Bribed Magistrate', 3, '+1 Action. +1 Coin. You may spend 2 Influence. If you do, each opponent with 5 or more cards in hand discards a card.', [
    actions(1),
    coins(1),
    {
      op: 'if',
      cond: hasSpark(2),
      then: [
        {
          op: 'may',
          prompt: 'Spend 2 Influence to make each opponent with 5 or more cards discard one?',
          then: [spark(-2), { op: 'attack', effects: [{ op: 'if', cond: { gte: [{ count: 'hand' }, 5] }, then: discardOne('Bribed Magistrate: discard a card.') }] }],
        },
      ],
    },
  ]),
  reactionCard('counter_intrigue', 'Counter-Intrigue', 3, '+2 Coins. When another player plays an Attack, you may reveal this from your hand: that player discards the top card of their deck.', [coins(2)], {
    label: 'The attacker discards the top card of their deck',
    effects: [{ op: 'on-player', player: 'parent', effects: [{ op: 'look', n: 1, as: 'milled' }, { op: 'move', cards: { var: 'milled' }, to: 'discard' }] }],
  }),
  device('whispered_promise', 'Whispered Promise', 3, 'Gain 1 Influence. At the start of your next turn, you may spend 2 Influence to draw 2 cards.', [
    spark(1),
    {
      op: 'delay',
      label: 'Whispered Promise: spend 2 Influence to draw 2',
      effects: [{ op: 'if', cond: hasSpark(2), then: [{ op: 'may', prompt: 'Spend 2 Influence to draw 2 cards?', then: [spark(-2), draw(2)] }] }],
    },
  ]),
  action('signoria', 'Signoria', 4, 'Choose an opponent. They choose one for you: draw 3 cards; or gain 2 Influence, +1 Buy and +1 Coin.', [
    opponent('Choose an opponent to decide for you.'),
    {
      op: 'choose',
      by: { var: 'opp' },
      prompt: 'Signoria: choose what they get.',
      options: [
        { label: 'They draw 3 cards', then: [draw(3)] },
        { label: 'They gain 2 Influence, +1 Buy and +1 Coin', then: [spark(2), buys(1), coins(1)] },
      ],
    },
  ]),
  // CC-HOU-7: reactions come when it is played; the target is chosen after, and an immune target gains nothing.
  attack('hollow_title', 'Hollow Title', 4, '+2 Coins. Choose an opponent. They gain a Homestead onto their deck.', [
    coins(2),
    opponent('Choose an opponent to gain a Homestead.'),
    { op: 'attack', player: { var: 'opp' }, effects: [{ op: 'gain', pile: 'notebook', to: 'deck' }] },
  ]),
  action('purchased_office', 'Purchased Office', 4, '+1 Action. You may spend 3 Influence. If you do, gain a card costing up to 4 Coins to your hand.', [
    actions(1),
    {
      op: 'if',
      cond: hasSpark(3),
      then: [
        {
          op: 'may',
          prompt: 'Spend 3 Influence to gain a card costing up to 4 to your hand?',
          then: [
            spark(-3),
            { op: 'choose-pile', filter: { maxCost: 4, notType: 'penalty' }, as: 'office', prompt: 'Gain a card costing up to 4 to your hand.' },
            { op: 'gain', pile: { var: 'office' }, to: 'hand' },
          ],
        },
      ],
    },
  ]),
  action('court_purge', 'Court Purge', 4, 'Trash up to 2 cards from your hand. Then each opponent may trash a card from their hand.', [
    pick('purged', 'Trash up to 2 cards from your hand.', 0, 2),
    { op: 'move', cards: { var: 'purged' }, to: 'trash' },
    { op: 'each-other', effects: [pick('purged', 'Court Purge: you may trash a card from your hand.', 0, 1), { op: 'move', cards: { var: 'purged' }, to: 'trash' }] },
  ]),
  prestige('family_crest', 'Family Crest', 4, 'Worth 2 Renown. When you gain this, choose an opponent: they gain 1 Influence.', 2, {
    triggers: [{ on: 'gain', where: 'self', label: 'Family Crest: an opponent gains 1 Influence', effects: [opponent('Family Crest: choose an opponent to gain 1 Influence.'), giveInfluence(1)] }],
  }),
  civic('marriage_pact', 'Marriage Pact', 5, '+1 Action. Choose an opponent. You and they each draw 1 card. Worth 2 Renown.', [
    actions(1),
    opponent('Choose an opponent to draw 1 card.'),
    draw(1),
    { op: 'on-player', player: { var: 'opp' }, effects: [draw(1)] },
  ], 2),
  action('majordomo', 'Majordomo', 5, 'Choose two different: draw 2 cards; +2 Coins; +1 Action and +1 Buy; gain 1 Influence.', [
    {
      op: 'choose',
      pick: 2,
      prompt: 'Majordomo: choose two.',
      options: [
        { label: 'Draw 2 cards', then: [draw(2)] },
        { label: '+2 Coins', then: [coins(2)] },
        { label: '+1 Action and +1 Buy', then: [actions(1), buys(1)] },
        { label: 'Gain 1 Influence', then: [spark(1)] },
      ],
    },
  ]),
  action('palace_intrigue', 'Palace Intrigue', 6, 'Draw 3. +1 Action. Choose an opponent: they gain 2 Influence.', [
    draw(3),
    actions(1),
    opponent('Choose an opponent to gain 2 Influence.'),
    giveInfluence(2),
  ]),
]);
