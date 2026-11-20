/**
 * Masters & Apprentices: Action chains, playing a card twice, upgrades, thinning and draw. It never touches Influence,
 * except that Master's Hand limits what it doubles. Specification: docs/expansions/FIVE_EXPANSION_MANIFEST.md,
 * section C. Rule IDs CC-MAS-*.
 */
import type { CardDef, Effect } from '../../../engine/deckbuilder';
import { action, actions, buys, civic, coins, draw, pick, pickOf, putBack, SPARK } from './cards';

const inSet = (cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set: 'masters' }));
const trash = (as: string): Effect => ({ op: 'move', cards: { var: as }, to: 'trash' });
const influence = { token: SPARK };

export const MASTERS: CardDef[] = inSet([
  action('sweeper', 'Sweeper', 2, '+1 Action. Look at the top card of your deck. Trash it, discard it, or put it back.', [
    actions(1),
    { op: 'look', n: 1, as: 'swept' },
    {
      op: 'if',
      cond: { has: 'swept' },
      then: [
        {
          op: 'choose',
          prompt: 'Sweeper: what happens to the top card?',
          options: [
            { label: 'Trash it', then: [trash('swept')] },
            { label: 'Discard it', then: [{ op: 'move', cards: { var: 'swept' }, to: 'discard' }] },
            { label: 'Put it back', then: [{ op: 'move', cards: { var: 'swept' }, to: 'deck' }] },
          ],
        },
      ],
    },
  ]),
  action('sketchbook', 'Sketchbook', 2, '+1 Action. Draw 1, then discard a card. If you discarded an Action card, +1 Action.', [
    actions(1),
    draw(1),
    pick('sketched', 'Discard a card. An Action gives +1 Action.', 1, 1),
    { op: 'move', cards: { var: 'sketched' }, to: 'discard' },
    { op: 'if', cond: { isType: 'sketched', type: 'action' }, then: [actions(1)] },
  ]),
  action('bottega', 'Bottega', 3, 'Draw 1. +2 Actions. If this is your third or later Action this turn, +1 Coin.', [
    draw(1),
    actions(2),
    { op: 'if', cond: { gte: [{ actionsPlayed: true }, 3] }, then: [coins(1)] },
  ]),
  civic('guild_diploma', 'Guild Diploma', 3, '+1 Action. You may trash a card from your hand. Worth 1 Renown.', [
    actions(1),
    pick('graduated', 'You may trash a card from your hand.', 0, 1),
    trash('graduated'),
  ], 1),
  action('woodcarver', 'Woodcarver', 3, 'Gain a card costing up to 3 Coins. If it is an Action, put it on top of your deck.', [
    { op: 'choose-pile', filter: { maxCost: 3, notType: 'penalty' }, as: 'carved', prompt: 'Gain a card costing up to 3. An Action goes on top of your deck.' },
    { op: 'if', cond: { isType: 'carved', type: 'action' }, then: [{ op: 'gain', pile: { var: 'carved' }, to: 'deck' }], else: [{ op: 'gain', pile: { var: 'carved' } }] },
  ]),
  action('promotion', 'Promotion', 4, '+1 Action. You may trash an Action card from your hand. If you do, gain an Action card costing up to 2 Coins more than it to your hand.', [
    actions(1),
    pickOf('promoted', 'You may trash an Action, to gain one costing up to 2 more to your hand.', 0, 1, { type: 'action' }),
    {
      op: 'if',
      cond: { has: 'promoted' },
      then: [
        trash('promoted'),
        { op: 'choose-pile', filter: { type: 'action', notType: 'penalty', maxCost: { costOf: 'promoted', plus: 2 } }, as: 'raised', prompt: 'Gain an Action to your hand.' },
        { op: 'gain', pile: { var: 'raised' }, to: 'hand' },
      ],
    },
  ]),
  action(
    'masters_hand',
    'Master’s Hand',
    4,
    'You may play an Action card costing 4 Coins or less from your hand twice. The cards played this way gain you at most 1 Influence in total; any more is lost. If you don’t, +1 Action and draw 1.',
    [
      pickOf('doubled', 'You may play an Action costing 4 or less twice.', 0, 1, { type: 'action', maxCost: 4 }, 'hand', 'keep'),
      {
        op: 'if',
        cond: { has: 'doubled' },
        then: [
          { op: 'set', as: 'before', n: influence },
          { op: 'play-card', cards: { var: 'doubled' }, times: 2 },
          // CC-MAS-7: net gain over both plays, measured once they have fully resolved. Anything above 1 is lost.
          { op: 'set', as: 'gained', n: { add: [influence, { mul: [{ value: 'before' }, -1] }] } },
          { op: 'token', token: SPARK, n: { mul: [{ add: [{ value: 'gained' }, { mul: [{ min: [{ value: 'gained' }, 1] }, -1] }] }, -1] } },
        ],
        else: [actions(1), draw(1)],
      },
    ],
  ),
  action('open_studio', 'Open Studio', 4, 'Draw 2. +1 Action. Choose an opponent: they draw 1 card.', [
    draw(2),
    actions(1),
    { op: 'choose-player', as: 'opp', prompt: 'Choose an opponent to draw 1 card.' },
    { op: 'on-player', player: { var: 'opp' }, effects: [draw(1)] },
  ]),
  action('study_hall', 'Study Hall', 4, 'Look at the top 4 cards of your deck. Put the Action cards among them into your hand and the rest back on top in any order.', [
    { op: 'look', n: 4, as: 'studied' },
    // CC-MAS-9: the Actions go to hand privately; others see only how many.
    { op: 'select', from: { rest: 'studied' }, filter: { type: 'action' }, as: 'lessons' },
    { op: 'move', cards: { var: 'lessons' }, to: 'hand' },
    ...putBack('studied', 'deck', 4, 'Put a card back on your deck. The last one you choose ends up on top.'),
  ]),
  action('patternmaker', 'Patternmaker', 4, '+1 Buy. Gain a copy of an Action card you have in play costing up to 5 Coins.', [
    buys(1),
    { op: 'select', from: 'play', filter: { type: 'action' }, as: 'patterns' },
    { op: 'choose-pile', filter: { sameAs: 'patterns', maxCost: 5 }, as: 'copied', prompt: 'Gain a copy of an Action you have in play.' },
    { op: 'gain', pile: { var: 'copied' } },
  ]),
  action('atelier', 'Atelier', 4, 'Trash a card from your hand. Gain a card costing exactly 2 Coins more than it.', [
    pick('reworked', 'Trash a card, to gain one costing exactly 2 more.', 1, 1),
    {
      op: 'if',
      cond: { has: 'reworked' },
      then: [
        trash('reworked'),
        { op: 'choose-pile', filter: { exactCost: { costOf: 'reworked', plus: 2 }, notType: 'penalty' }, as: 'finished', prompt: 'Gain a card costing exactly 2 more.' },
        { op: 'gain', pile: { var: 'finished' } },
      ],
    },
  ]),
  action('schoolroom', 'Schoolroom', 4, '+1 Action. Look at the top 2 cards of your deck. Put one into your hand and the other back on top. Then trash a card from your hand.', [
    actions(1),
    { op: 'look', n: 2, as: 'seen' },
    pick('kept', 'Put one into your hand. The other goes back on top.', 1, 1, { rest: 'seen' }, 'keep'),
    { op: 'move', cards: { var: 'kept' }, to: 'hand' },
    { op: 'move', cards: { rest: 'seen' }, to: 'deck' },
    pick('schooled', 'Trash a card from your hand.', 1, 1),
    trash('schooled'),
  ]),
  action('lecture_hall', 'Lecture Hall', 5, 'Draw 3. You may put an Action card from your hand on top of your deck. If you do, +1 Action.', [
    draw(3),
    pickOf('deferred', 'You may put an Action on top of your deck for +1 Action.', 0, 1, { type: 'action' }),
    { op: 'if', cond: { has: 'deferred' }, then: [{ op: 'move', cards: { var: 'deferred' }, to: 'deck' }, actions(1)] },
  ]),
  action('masters_fee', 'Master’s Fee', 5, '+1 Buy. +2 Coins. Then draw until you have 4 cards in hand.', [
    buys(1),
    coins(2),
    {
      op: 'until',
      cond: { any: [{ gte: [{ count: 'hand' }, 4] }, { not: { gte: [{ count: 'deck+discard' }, 1] } }] },
      effects: [draw(1)],
    },
  ]),
  action('maestro', 'Maestro', 6, 'Draw 2. +1 Action. You may play an Action card costing up to 5 Coins from your hand.', [
    draw(2),
    actions(1),
    pickOf('conducted', 'You may play an Action costing up to 5.', 0, 1, { type: 'action', maxCost: 5 }, 'hand', 'keep'),
    { op: 'play-card', cards: { var: 'conducted' }, times: 1 },
  ]),
]);
