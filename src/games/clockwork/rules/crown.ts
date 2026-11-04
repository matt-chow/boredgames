/**
 * Crown Decrees: the v3.0 set. Removing cards from your deck, trading them up, stronger Currency, and pressure on rival
 * houses, all tied to this game's Influence and Crown Projects. Rule IDs are in docs/CLOCKWORK.md.
 */
import type { CardDef, CardFilter, CardType, Effect, Num, ProjectDef } from '../../../engine/deckbuilder';
import { action, actions, attack, buys, coins, currency, device, discardOne, draw, gainRust, hasSpark, pick, prestige, reactionCard, spark, SPARK } from './cards';

const inSet = (cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set: 'crown' }));

/** The player may choose one card from their hand that passes the filter. */
const mayPick = (as: string, prompt: string, filter?: CardFilter): Effect => ({ op: 'choose-cards', from: 'hand', min: 0, max: 1, filter, as, prompt });
const trash = (as: string): Effect => ({ op: 'move', cards: { var: as }, to: 'trash' });

/** Reveal from the deck until a card of this type turns up. It goes to hand and the others are discarded. */
const search = (type: CardType): Effect[] => [
  {
    op: 'until',
    // A card that is also a Royal Debt is no find, and a deck with nothing left ends the search empty-handed.
    cond: { any: [{ has: 'found' }, { not: { gte: [{ count: 'deck+discard' }, 1] } }] },
    effects: [
      { op: 'reveal', n: 1, as: 'seen', append: true },
      { op: 'select', from: { rest: 'seen' }, filter: { type, notType: 'penalty' }, as: 'found' },
    ],
  },
  { op: 'move', cards: { var: 'found' }, to: 'hand', public: true },
  { op: 'move', cards: { rest: 'seen' }, to: 'discard' },
];

const upTo3More = (as: string): Num => ({ costOf: as, plus: 3 });

export const CROWN: CardDef[] = inSet([
  // Trashing and exchange
  action('royal_confessor', 'Royal Confessor', 4, 'Trash up to 3 cards from your hand. Gain 1 Influence per Renown card trashed.', [
    pick('confessed', 'Trash up to 3 cards from your hand.', 0, 3),
    trash('confessed'),
    spark({ countIn: 'confessed', filter: { type: 'victory' } }),
  ]),
  action('mintmaster', 'Mintmaster', 5, 'You may trash a Currency from your hand. If you do, gain 1 Influence and a Currency costing up to 3 more on top of your deck.', [
    mayPick('melted', 'You may trash a Currency, to gain one costing up to 3 more on top of your deck.', { type: 'treasure' }),
    {
      op: 'if',
      cond: { has: 'melted' },
      then: [
        trash('melted'),
        spark(1),
        { op: 'choose-pile', filter: { type: 'treasure', maxCost: upTo3More('melted') }, as: 'minted', prompt: 'Gain a Currency on top of your deck.' },
        { op: 'gain', pile: { var: 'minted' }, to: 'deck' },
      ],
    },
  ]),
  action('estate_surveyor', 'Estate Surveyor', 4, '+1 Coin. You may trash a Renown card from your hand. If you do, gain a Renown card costing up to 3 more.', [
    coins(1),
    mayPick('deed', 'You may trash a Renown card, to gain one costing up to 3 more.', { type: 'victory' }),
    {
      op: 'if',
      cond: { has: 'deed' },
      then: [
        trash('deed'),
        { op: 'choose-pile', filter: { type: 'victory', maxCost: upTo3More('deed') }, as: 'title', prompt: 'Gain a Renown card.' },
        { op: 'gain', pile: { var: 'title' } },
      ],
    },
  ]),
  action('purification_house', 'Purification House', 3, 'You may trash a card from your hand. If it was a Renown card or a Royal Debt, draw 2. If it was anything else, draw 1.', [
    pick('cleansed', 'You may trash a card. A Renown card or a Royal Debt draws 2; anything else draws 1.', 0, 1),
    {
      op: 'if',
      cond: { has: 'cleansed' },
      then: [
        trash('cleansed'),
        { op: 'if', cond: { any: [{ isType: 'cleansed', type: 'victory' }, { isType: 'cleansed', type: 'penalty' }] }, then: [draw(2)], else: [draw(1)] },
      ],
    },
  ]),
  action('salvage_office', 'Salvage Office', 4, 'Trash a card from your hand. If it cost 3 or more, +3 Coins and +1 Buy. Otherwise, gain 2 Influence.', [
    pick('salvaged', 'Trash a card. Cost 3 or more: +3 Coins, +1 Buy. Otherwise: 2 Influence.', 1, 1),
    {
      op: 'if',
      cond: { has: 'salvaged' },
      then: [trash('salvaged'), { op: 'if', cond: { gte: [{ costOf: 'salvaged' }, 3] }, then: [coins(3), buys(1)], else: [spark(2)] }],
    },
  ]),
  action('reclamation_guild', 'Reclamation Guild', 3, '+1 Action. +1 Coin. For the rest of this turn, each time you trash a card, +1 Coin.', [
    actions(1),
    coins(1),
    { op: 'on', on: 'trash', label: 'Reclamation Guild: +1 Coin', effects: [coins(1)] },
  ]),
  action('royal_tax_collector', 'Royal Tax Collector', 4, '+2 Coins. You may trash a Currency from your hand to gain 1 Influence, plus 1 per 3 of its cost.', [
    coins(2),
    mayPick('levied', 'You may trash a Currency to gain 1 Influence, plus 1 per 3 of its cost.', { type: 'treasure' }),
    { op: 'if', cond: { has: 'levied' }, then: [trash('levied'), spark({ add: [1, { div: [{ costOf: 'levied' }, 3] }] })] },
  ]),
  action('royal_scrivener', 'Royal Scrivener', 4, 'Draw 1. +1 Action. You may trash a card from your discard pile.', [
    draw(1),
    actions(1),
    pick('struck', 'You may trash a card from your discard pile.', 0, 1, 'discard'),
    trash('struck'),
  ]),
  action('noble_resettlement', 'Noble Resettlement', 4, '+1 Action. You may trash a Renown card from your hand. If you do, gain an Action costing up to 4 more to your hand.', [
    actions(1),
    mayPick('moved', 'You may trash a Renown card, to gain an Action costing up to 4 more to your hand.', { type: 'victory' }),
    {
      op: 'if',
      cond: { has: 'moved' },
      then: [
        trash('moved'),
        { op: 'choose-pile', filter: { type: 'action', notType: 'penalty', maxCost: { costOf: 'moved', plus: 4 } }, as: 'settled', prompt: 'Gain an Action to your hand.' },
        { op: 'gain', pile: { var: 'settled' }, to: 'hand' },
      ],
    },
  ]),
  action('burden_relief', 'Burden Relief', 2, '+1 Action. You may trash a non-Currency card costing up to 2 from your hand. If you do, +2 Coins, and if it was a Royal Debt, gain 1 Influence too.', [
    actions(1),
    mayPick('relieved', 'You may trash a non-Currency card costing up to 2 for +2 Coins.', { notType: 'treasure', maxCost: 2 }),
    {
      op: 'if',
      cond: { has: 'relieved' },
      then: [trash('relieved'), coins(2), { op: 'if', cond: { isType: 'relieved', type: 'penalty' }, then: [spark(1)] }],
    },
  ]),

  // Economy and Currency
  action('treasury_auditor', 'Treasury Auditor', 4, '+1 Action. +1 Coin per Currency costing 3 or more in your hand, up to 3.', [
    actions(1),
    { op: 'select', from: 'hand', filter: { type: 'treasure', minCost: 3 }, as: 'audited' },
    coins({ min: [{ len: 'audited' }, 3] }),
  ]),
  currency('spice_exchange', 'Spice Exchange', 5, '+2 Coins. Gain 1 Influence.', 2, { effects: [spark(1)] }),
  currency('trade_bonds', 'Trade Bonds', 4, '+2 Coins. If you have 3 or more Currency cards in your hand and in play, counting this, +1 Buy.', 2, {
    // Hand as well as play, so the result doesn't depend on the order Play All happens to use.
    effects: [
      { op: 'select', from: 'play', filter: { type: 'treasure' }, as: 'played' },
      { op: 'select', from: 'hand', filter: { type: 'treasure' }, as: 'held' },
      { op: 'if', cond: { gte: [{ add: [{ len: 'played' }, { len: 'held' }] }, 3] }, then: [buys(1)] },
    ],
  }),
  currency('royal_mint', 'Royal Mint', 5, '+2 Coins. You may spend 2 Influence for +3 Coins more.', 2, {
    effects: [{ op: 'if', cond: hasSpark(2), then: [{ op: 'may', prompt: 'Spend 2 Influence for +3 Coins more?', then: [spark(-2), coins(3)] }] }],
  }),
  device('port_tariffs', 'Port Tariffs', 4, '+1 Coin. At the start of your next turn, +1 Buy, and for that turn each Currency you buy gains you 1 Influence.', [
    coins(1),
    {
      op: 'delay',
      label: 'Port Tariffs: +1 Buy',
      effects: [buys(1), { op: 'on', on: 'buy', filter: { type: 'treasure' }, label: 'Port Tariffs: 1 Influence', effects: [spark(1)] }],
    },
  ]),
  action('guild_auction', 'Guild Auction', 4, '+1 Buy. +2 Coins. This turn, when you gain a card, you may spend 1 Influence to put it on top of your deck.', [
    buys(1),
    coins(2),
    {
      op: 'on',
      on: 'gain',
      label: 'Guild Auction: place the card',
      effects: [
        {
          op: 'if',
          cond: hasSpark(1),
          then: [{ op: 'may', prompt: 'Spend 1 Influence to put that card on top of your deck?', then: [spark(-1), { op: 'move', cards: { var: 'event' }, to: 'deck' }] }],
        },
      ],
    },
  ]),

  // Drawing and chains
  action('kingdom_courier', 'Kingdom Courier', 4, 'Draw 2. +1 Action. Discard a card.', [draw(2), actions(1), ...discardOne('Kingdom Courier: discard a card.')]),
  action('hall_of_archives', 'Hall of Archives', 3, '+1 Action. Choose Action or Currency. Reveal from your deck until you reveal one, put it in your hand and discard the others.', [
    actions(1),
    {
      op: 'choose',
      prompt: 'Hall of Archives: search for which kind of card?',
      options: [
        { label: 'An Action', then: search('action') },
        { label: 'A Currency', then: search('treasure') },
      ],
    },
  ]),
  action('great_council', 'Great Council', 5, '+2 Actions. +1 Buy. +2 Coins. Each other player gains 1 Influence.', [
    actions(2),
    buys(1),
    coins(2),
    { op: 'each-other', effects: [spark(1)] },
  ]),

  // Attacks and defences
  attack('edict_of_inspection', 'Edict of Inspection', 4, '+1 Action. +1 Coin. Each opponent with 5 or more cards in hand reveals 2 of their choice. You choose which of the 2 they discard.', [
    actions(1),
    coins(1),
    {
      op: 'attack',
      effects: [
        {
          op: 'if',
          cond: { gte: [{ count: 'hand' }, 5] },
          then: [
            pick('shown', 'Edict of Inspection: reveal 2 cards. Your rival chooses one for you to discard.', 2, 2),
            { op: 'reveal-cards', cards: { var: 'shown' } },
            { op: 'choose-cards', from: { var: 'shown' }, min: 1, max: 1, as: 'struck', by: 'parent', hint: 'keep', prompt: 'Edict of Inspection: which card do they discard?' },
            { op: 'move', cards: { var: 'struck' }, to: 'discard' },
          ],
        },
      ],
    },
  ]),
  attack('tax_arrears', 'Tax Arrears', 4, '+1 Coin. +1 Buy. Each opponent discards a Currency, or gains a Royal Debt.', [
    coins(1),
    buys(1),
    {
      op: 'attack',
      effects: [
        mayPick('paid', 'Tax Arrears: discard a Currency, or choose none and gain a Royal Debt.', { type: 'treasure' }),
        { op: 'if', cond: { has: 'paid' }, then: [{ op: 'move', cards: { var: 'paid' }, to: 'discard' }], else: [gainRust] },
      ],
    },
  ]),
  reactionCard(
    'royal_advocate',
    'Royal Advocate',
    3,
    '+1 Buy. +2 Coins. When another player plays an Attack, you may reveal this from your hand and put it on the bottom of your deck to cancel its effects on you.',
    [buys(1), coins(2)],
    { label: 'Put this on the bottom of your deck, cancel the attack on you', effects: [{ op: 'move', cards: 'source', to: 'deck-bottom' }, { op: 'immune' }] },
  ),
  attack('court_saboteur', 'Court Saboteur', 5, '+2 Coins. Each opponent reveals the top 2 of their deck. You choose one to discard, and the other goes back on top.', [
    coins(2),
    {
      op: 'attack',
      effects: [
        { op: 'reveal', n: 2, as: 'exposed' },
        { op: 'choose-cards', from: { rest: 'exposed' }, min: 1, max: 1, as: 'spoiled', by: 'parent', hint: 'keep', prompt: 'Court Saboteur: which card do they discard?' },
        { op: 'move', cards: { var: 'spoiled' }, to: 'discard' },
        { op: 'move', cards: { rest: 'exposed' }, to: 'deck', public: true },
      ],
    },
  ]),

  // Scoring
  prestige('noble_council', 'Noble Council', 5, 'Worth 1 Renown per Homestead you own.', { per: 1, each: 1, of: { key: 'notebook' } }),
]);

export const CROWN_WORKS: ProjectDef[] = [
  { key: 'common_fields', name: 'Common Fields', coins: 3, tokens: { [SPARK]: 2 }, vp: 3, text: 'Gain a Homestead.', effects: [{ op: 'gain', pile: 'notebook' }], set: 'crown' },
  {
    key: 'merchants_guildhall',
    name: 'Merchants’ Guildhall',
    coins: 5,
    tokens: { [SPARK]: 3 },
    vp: 6,
    text: 'You may trash a card from your hand.',
    effects: [pick('sold', 'You may trash a card from your hand.', 0, 1), trash('sold')],
    set: 'crown',
  },
];
