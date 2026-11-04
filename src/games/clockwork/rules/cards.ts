/**
 * Clockwork Commons: Core Set. The reviewed adapter from data/clockwork-commons/clockwork_commons_original_cardset.json
 * to the engine's typed effects. The JSON is a design document and is never read at run time. Interpretations of the
 * design are numbered in docs/CLOCKWORK.md.
 */
import type { CardDef, CardSource, ChoiceHint, Effect, Num } from '../../../engine/deckbuilder';

export const SPARK = 'spark';

export const spark = (n: Num): Effect => ({ op: 'token', token: SPARK, n });
export const draw = (n: Num): Effect => ({ op: 'draw', n });
export const coins = (n: Num): Effect => ({ op: 'coins', n });
export const actions = (n: Num): Effect => ({ op: 'actions', n });
export const buys = (n: Num): Effect => ({ op: 'buys', n });
export const hasSpark = (n: Num) => ({ gte: [{ token: SPARK }, n] as [Num, Num] });
export const gainRust: Effect = { op: 'gain', pile: 'rust' };

export function pick(as: string, prompt: string, min: Num, max: Num, from: CardSource = 'hand', hint?: ChoiceHint): Effect {
  return { op: 'choose-cards', from, min, max, as, prompt, hint };
}

/** Discard exactly one card from hand, if there is one. */
export const discardOne = (prompt = 'Discard a card.'): Effect[] => [pick('lost', prompt, 1, 1), { op: 'move', cards: { var: 'lost' }, to: 'discard' }];

/**
 * Put cards back one at a time, so the player chooses their order. On the deck's top the last one chosen ends up on
 * top. On the bottom each one chosen goes under the last.
 */
export const putBack = (rest: string, to: 'deck' | 'deck-bottom', n: number, prompt: string): Effect[] => [
  {
    op: 'repeat',
    n,
    effects: [pick('next', prompt, 1, 1, { rest }), { op: 'move', cards: { var: 'next' }, to }],
  },
];

const base = (key: string, name: string, cost: number, types: CardDef['types'], text: string, more: Partial<CardDef>): CardDef => ({
  key,
  name,
  cost,
  types,
  text,
  status: 'ready',
  set: 'core',
  ...more,
});

export const action = (key: string, name: string, cost: number, text: string, effects: Effect[], more: Partial<CardDef> = {}) =>
  base(key, name, cost, ['action'], text, { effects, ...more });

export const attack = (key: string, name: string, cost: number, text: string, effects: Effect[], more: Partial<CardDef> = {}) =>
  base(key, name, cost, ['action', 'attack'], text, { effects, typeLine: 'Action · Attack', ...more });

export const device = (key: string, name: string, cost: number, text: string, effects: Effect[], more: Partial<CardDef> = {}) =>
  base(key, name, cost, ['action', 'duration'], text, { effects, typeLine: 'Device', ...more });

export const reactionCard = (
  key: string,
  name: string,
  cost: number,
  text: string,
  effects: Effect[],
  reaction: { label: string; effects: Effect[] },
  more: Partial<CardDef> = {},
) => base(key, name, cost, ['action', 'reaction'], text, { effects, reaction: { ...reaction, once: true }, typeLine: 'Action · Reaction', ...more });

export const civic = (key: string, name: string, cost: number, text: string, effects: Effect[], vp: number, more: Partial<CardDef> = {}) =>
  base(key, name, cost, ['action', 'victory'], text, { effects, vp, typeLine: 'Action · Prestige', ...more });

export const prestige = (key: string, name: string, cost: number, text: string, vp: CardDef['vp'], more: Partial<CardDef> = {}) =>
  base(key, name, cost, ['victory'], text, { vp, typeLine: 'Prestige', ...more });

export const currency = (key: string, name: string, cost: number, text: string, value: number, more: Partial<CardDef> = {}) =>
  base(key, name, cost, ['treasure'], text, { coins: value, typeLine: 'Currency', ...more });

const basic = { basic: true, set: undefined };

export const BASICS: CardDef[] = [
  currency('scrap', 'Scrap', 0, '+1 Coin.', 1, basic),
  currency('cog', 'Cog', 3, '+2 Coins.', 2, basic),
  currency('dynamo', 'Dynamo', 6, '+3 Coins.', 3, basic),
  prestige('notebook', 'Notebook', 2, '1 Prestige.', 1, basic),
  prestige('blueprint', 'Blueprint', 5, '3 Prestige.', 3, basic),
  prestige('monument', 'Monument', 8, '6 Prestige. The game ends when this pile runs out.', 6, basic),
  // Only in games whose market can hand it out (CC-RUST).
  base('rust', 'Rust', 0, ['action', 'penalty'], '−1 Prestige. When played, you may spend 1 Spark to trash this.', {
    ...basic,
    noBuy: true,
    vp: -1,
    typeLine: 'Hazard',
    effects: [
      {
        op: 'if',
        cond: hasSpark(1),
        then: [{ op: 'may', prompt: 'Spend 1 Spark to trash this Rust?', then: [spark(-1), { op: 'move', cards: 'source', to: 'trash' }] }],
      },
    ],
  }),
];

export const CORE: CardDef[] = [
  // Workshop
  action('gearwright', 'Gearwright', 3, 'Draw 2. Put a card from your hand on the bottom of your deck.', [
    draw(2),
    pick('under', 'Put a card on the bottom of your deck.', 1, 1),
    { op: 'move', cards: { var: 'under' }, to: 'deck-bottom' },
  ]),
  action('shift_bell', 'Shift Bell', 3, 'Draw 1. +2 Actions. If you already played another Action this turn, gain 1 Spark.', [
    draw(1),
    actions(2),
    { op: 'if', cond: { gte: [{ actionsPlayed: true }, 2] }, then: [spark(1)] },
  ]),
  action('tally_clerk', 'Tally Clerk', 2, '+1 Action. +1 Buy. If you have fewer than 2 Spark, gain 1 Spark.', [
    actions(1),
    buys(1),
    { op: 'if', cond: { not: hasSpark(2) }, then: [spark(1)] },
  ]),
  action('supply_crane', 'Supply Crane', 4, '+2 Coins. Gain a card costing up to 2 to your discard.', [
    coins(2),
    { op: 'choose-pile', filter: { maxCost: 2, notType: 'penalty' }, as: 'got', prompt: 'Gain a card costing up to 2.' },
    { op: 'gain', pile: { var: 'got' } },
  ]),
  action('copper_press', 'Copper Press', 4, 'Trash a card from your hand. +1 Coin per 2 of its cost, rounded up. Gain 1 Spark.', [
    pick('pressed', 'Trash a card from your hand.', 1, 1),
    { op: 'move', cards: { var: 'pressed' }, to: 'trash' },
    coins({ div: [{ costOf: 'pressed' }, 2], up: true }),
    spark(1),
  ]),
  action('foreman', 'Foreman', 5, '+1 Action. Choose: draw 3 then discard 1; or gain 2 Spark and +1 Buy.', [
    actions(1),
    {
      op: 'choose',
      prompt: 'Foreman: choose one.',
      options: [
        { label: 'Refine hand: draw 3, discard 1', then: [draw(3), ...discardOne()] },
        { label: 'Charge and shop: 2 Spark, +1 Buy', then: [spark(2), buys(1)] },
      ],
    },
  ]),
  // Flow
  action('paper_fan', 'Paper Fan', 2, 'Discard up to 2 cards. Draw that many plus 1.', [
    pick('blown', 'Discard up to 2 cards, then draw that many plus 1.', 0, 2),
    { op: 'move', cards: { var: 'blown' }, to: 'discard' },
    draw({ add: [{ len: 'blown' }, 1] }),
  ]),
  action('conveyor', 'Conveyor', 3, '+1 Action. Look at the top 3 of your deck. Put one in your hand and the rest on the bottom in any order.', [
    actions(1),
    { op: 'look', n: 3, as: 'belt' },
    pick('kept', 'Put one in your hand.', 1, 1, { var: 'belt' }, 'keep'),
    { op: 'move', cards: { var: 'kept' }, to: 'hand' },
    ...putBack('belt', 'deck-bottom', 2, 'Put a card on the bottom of your deck. The next goes under it.'),
  ]),
  action('sorting_glasses', 'Sorting Glasses', 4, 'Draw 2. Reveal a card from your hand. If it is a Device, gain 1 Spark; otherwise +1 Coin.', [
    draw(2),
    pick('shown', 'Reveal a card from your hand.', 1, 1, 'hand', 'keep'),
    { op: 'reveal-cards', cards: { var: 'shown' } },
    { op: 'if', cond: { isType: 'shown', type: 'duration' }, then: [spark(1)], else: [coins(1)] },
  ]),
  action('springboard', 'Springboard', 4, '+2 Actions. You may discard a card to gain 1 Spark and draw 1.', [
    actions(2),
    pick('launched', 'You may discard a card to gain 1 Spark and draw 1.', 0, 1),
    { op: 'if', cond: { has: 'launched' }, then: [{ op: 'move', cards: { var: 'launched' }, to: 'discard' }, spark(1), draw(1)] },
  ]),
  action('clockwork_archive', 'Clockwork Archive', 5, 'Draw 3. Put 2 cards from your hand on top of your deck in any order. Gain 1 Spark.', [
    draw(3),
    {
      op: 'repeat',
      n: 2,
      effects: [pick('filed', 'Put a card on top of your deck. A later one goes above it.', 1, 1), { op: 'move', cards: { var: 'filed' }, to: 'deck' }],
    },
    spark(1),
  ]),
  action('whistle_stop', 'Whistle Stop', 5, '+1 Action. +1 Buy. Draw 2. You may spend 1 Spark to draw 1 more.', [
    actions(1),
    buys(1),
    draw(2),
    { op: 'if', cond: hasSpark(1), then: [{ op: 'may', prompt: 'Spend 1 Spark to draw 1 more?', then: [spark(-1), draw(1)] }] },
  ]),
  // Energy
  action('hand_crank', 'Hand Crank', 2, 'Gain 2 Spark. Discard a card.', [spark(2), ...discardOne()]),
  action('charge_meter', 'Charge Meter', 3, '+1 Action. Gain 1 Spark. Then if you have 4 or more Spark, draw 1.', [
    actions(1),
    spark(1),
    { op: 'if', cond: hasSpark(4), then: [draw(1)] },
  ]),
  device('capacitor_bank', 'Capacitor Bank', 4, 'At the start of your next turn, gain 3 Spark and draw 1.', [
    { op: 'delay', label: 'Capacitor Bank: 3 Spark, draw 1', effects: [spark(3), draw(1)] },
  ]),
  action('steam_diverter', 'Steam Diverter', 4, 'Spend up to 3 Spark. +2 Coins per Spark spent.', [
    { op: 'choose-number', min: 0, max: { min: [3, { token: SPARK }] }, as: 'vented', prompt: 'Spend how much Spark? Each gives +2 Coins.' },
    spark({ mul: [{ value: 'vented' }, -1] }),
    coins({ mul: [{ value: 'vented' }, 2] }),
  ]),
  action('glow_mason', 'Glow Mason', 5, '+1 Buy. +2 Coins. Gain 2 Spark.', [buys(1), coins(2), spark(2)]),
  action('overcharge_lab', 'Overcharge Lab', 6, 'Draw 3. Gain 2 Spark. After this turn’s cleanup, discard a card from your new hand.', [
    draw(3),
    spark(2),
    { op: 'on', on: 'hand-drawn', label: 'Overcharge Lab: discard a card', effects: discardOne('Overcharge Lab: discard a card from your new hand.') },
  ]),
  // Interaction
  attack('signal_tower', 'Signal Tower', 3, '+1 Action. +1 Coin. Each opponent reveals their top card, then puts it on the bottom of their deck or discards it.', [
    actions(1),
    coins(1),
    {
      op: 'attack',
      effects: [
        { op: 'reveal', n: 1, as: 'signal' },
        {
          op: 'if',
          cond: { has: 'signal' },
          then: [
            {
              op: 'choose',
              prompt: 'Signal Tower: where does your revealed card go?',
              options: [
                { label: 'Bottom of your deck', then: [{ op: 'move', cards: { rest: 'signal' }, to: 'deck-bottom', public: true }] },
                { label: 'Discard it', then: [{ op: 'move', cards: { rest: 'signal' }, to: 'discard' }] },
              ],
            },
          ],
        },
      ],
    },
  ]),
  reactionCard(
    'city_messenger',
    'City Messenger',
    4,
    'Draw 1. +1 Buy. When another player plays an Attack, you may reveal this from your hand to gain 1 Spark.',
    [draw(1), buys(1)],
    { label: 'Gain 1 Spark', effects: [spark(1)] },
  ),
  attack('inspection_team', 'Inspection Team', 4, '+2 Coins. Each opponent with at least 5 cards in hand discards a card of their choice.', [
    coins(2),
    { op: 'attack', effects: [{ op: 'if', cond: { gte: [{ count: 'hand' }, 5] }, then: discardOne('Inspection Team: discard a card.') }] },
  ]),
  action('mutual_aid', 'Mutual Aid', 4, 'Draw 2. Choose an opponent: they draw 1, and you gain 2 Spark.', [
    draw(2),
    { op: 'choose-player', as: 'friend', prompt: 'Who draws a card?' },
    { op: 'on-player', player: { var: 'friend' }, effects: [draw(1)] },
    spark(2),
  ]),
  action('permit_office', 'Permit Office', 5, '+1 Action. +1 Buy. Choose an opponent. They may discard a card to gain 1 Spark. If they decline, you gain 1 Spark.', [
    actions(1),
    buys(1),
    { op: 'choose-player', as: 'applicant', prompt: 'Who gets the permit offer?' },
    {
      op: 'on-player',
      player: { var: 'applicant' },
      effects: [
        pick('form', 'Permit Office: you may discard a card to gain 1 Spark. If you decline, they gain it.', 0, 1),
        {
          op: 'if',
          cond: { has: 'form' },
          then: [{ op: 'move', cards: { var: 'form' }, to: 'discard' }, spark(1)],
          else: [{ op: 'token', token: SPARK, n: 1, player: 'parent' }],
        },
      ],
    },
  ]),
  reactionCard(
    'night_watch',
    'Night Watch',
    5,
    '+2 Coins. +1 Spark. When another player plays an Attack, you may reveal this from your hand and discard a card to cancel its effects on you.',
    [coins(2), spark(1)],
    { label: 'Discard a card, cancel the attack on you', effects: [...discardOne('Night Watch: discard a card to cancel the attack on you.'), { op: 'immune' }] },
  ),
  // Long game
  device('maintenance_cart', 'Maintenance Cart', 3, 'At the start of your next turn, +1 Coin and gain 1 Spark.', [
    { op: 'delay', label: 'Maintenance Cart: +1 Coin, 1 Spark', effects: [coins(1), spark(1)] },
  ]),
  device('lamplighter', 'Lamplighter', 4, 'Draw 1. At the start of your next turn, draw 2.', [draw(1), { op: 'delay', label: 'Lamplighter: draw 2', effects: [draw(2)] }]),
  action('clock_garden', 'Clock Garden', 4, '+1 Action. Gain 1 Spark. If you completed a Public Work on your previous turn, draw 2.', [
    actions(1),
    spark(1),
    { op: 'if', cond: { claimedLastTurn: true }, then: [draw(2)] },
  ]),
  device('gear_lease', 'Gear Lease', 5, '+2 Coins. At the start of your next turn, +1 Buy and +1 Coin.', [
    coins(2),
    { op: 'delay', label: 'Gear Lease: +1 Buy, +1 Coin', effects: [buys(1), coins(1)] },
  ]),
  action('city_blueprint', 'City Blueprint', 5, '+1 Action. Look at the top 4 of your deck. Keep up to 2 in your hand and discard the rest. Gain 1 Spark.', [
    actions(1),
    { op: 'look', n: 4, as: 'plans' },
    pick('kept', 'Keep up to 2 in your hand. The rest are discarded.', 0, 2, { var: 'plans' }, 'keep'),
    { op: 'move', cards: { var: 'kept' }, to: 'hand' },
    { op: 'move', cards: { rest: 'plans' }, to: 'discard' },
    spark(1),
  ]),
  device('grand_engine', 'Grand Engine', 7, '+2 Coins. Gain 1 Spark. At the start of your next turn, +2 Coins and draw 2.', [
    coins(2),
    spark(1),
    { op: 'delay', label: 'Grand Engine: +2 Coins, draw 2', effects: [coins(2), draw(2)] },
  ]),
  // Prestige
  civic('civic_scholar', 'Civic Scholar', 3, 'Draw 1. Gain 1 Spark. Worth 1 Prestige.', [draw(1), spark(1)], 1),
  civic('museum_curator', 'Museum Curator', 4, 'Draw 2, then discard a card. Worth 2 Prestige.', [draw(2), ...discardOne()], 2),
  civic('patron_circle', 'Patron Circle', 5, '+1 Buy. +2 Coins. Worth 2 Prestige.', [buys(1), coins(2)], 2),
  prestige('silver_statue', 'Silver Statue', 5, 'Worth 1 Prestige, plus 1 per 3 Spark you hold at the end of the game.', { base: 1, perToken: { token: SPARK, per: 3 } }),
  civic('civic_embassy', 'Civic Embassy', 6, '+1 Action. Gain 2 Spark. You may give 1 Spark to an opponent to draw 2. Worth 3 Prestige.', [
    actions(1),
    spark(2),
    {
      op: 'may',
      prompt: 'Give 1 Spark to an opponent to draw 2?',
      then: [
        { op: 'choose-player', as: 'envoy', prompt: 'Who receives the Spark?' },
        spark(-1),
        { op: 'token', token: SPARK, n: 1, player: { var: 'envoy' } },
        draw(2),
      ],
    },
  ], 3),
  prestige('inventors_medal', 'Inventor’s Medal', 7, 'Worth 6 Prestige, plus 1 per Public Work you completed.', { base: 6, ownProjects: 1 }),
];
