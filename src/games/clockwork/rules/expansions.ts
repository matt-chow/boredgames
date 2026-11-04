/**
 * Optional sets, designed for this game around its own systems: Influence, Establishments and Crown Projects. Each can be switched
 * on separately in the lobby. See docs/CLOCKWORK.md.
 */
import type { CardDef, Effect, ProjectDef } from '../../../engine/deckbuilder';
import { action, actions, attack, buys, civic, coins, currency, device, draw, gainRust, hasSpark, pick, prestige, putBack, reactionCard, spark, SPARK } from './cards';

const inSet = (set: string, cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set }));

export const FLYWHEEL_RUN = 'flywheel-run';
export const FLYWHEEL_KEEP = 'flywheel-keep';

const keepRunning: Effect = {
  op: 'delay',
  label: 'Tithe Barn: +2 Coins',
  effects: [{ op: 'custom', handler: FLYWHEEL_RUN }],
};

/**
 * A Tithe Barn can run for as long as its owner pays, and effect data can't refer to itself, so its two steps are
 * handlers. The Influence it charges keeps this finite.
 */
export const HANDLERS = {
  [FLYWHEEL_RUN]: (rt: { queue(e: Effect[]): void }) =>
    rt.queue([
      coins(2),
      {
        op: 'if',
        cond: hasSpark(1),
        then: [{ op: 'may', prompt: 'Spend 1 Influence to keep this Tithe Barn running?', then: [spark(-1), { op: 'custom', handler: FLYWHEEL_KEEP }] }],
      },
    ]),
  [FLYWHEEL_KEEP]: (rt: { queue(e: Effect[]): void }) => rt.queue([keepRunning]),
};

/** Economy, combinations, deck cycling and Establishments that stay in play. */
export const FOUNDRY: CardDef[] = inSet('foundry', [
  currency('spark_coil', 'Favour Purse', 3, '+1 Coin. Gain 1 Influence.', 1, { effects: [spark(1)] }),
  currency('brass_bond', 'Merchant Bond', 4, '+2 Coins. If you have 3 or more Influence, +1 Coin more.', 2, {
    effects: [{ op: 'if', cond: hasSpark(3), then: [coins(1)] }],
  }),
  action('relay_junction', 'Market Square', 3, '+1 Action. +1 Coin per other Action you played this turn, up to 3.', [
    actions(1),
    coins({ min: [{ add: [{ actionsPlayed: true }, -1] }, 3] }),
  ]),
  action('chain_drive', 'Guild Procession', 5, 'Draw 1. +1 Action. If this is your third or later Action this turn, +1 Buy and gain 2 Influence.', [
    draw(1),
    actions(1),
    { op: 'if', cond: { gte: [{ actionsPlayed: true }, 3] }, then: [buys(1), spark(2)] },
  ]),
  device('flywheel', 'Tithe Barn', 4, '+1 Coin. At the start of your next turn, +2 Coins; you may then spend 1 Influence to repeat this at the start of the turn after.', [
    coins(1),
    keepRunning,
  ]),
  device('timer_switch', 'Royal Commission', 3, 'You may set aside an Action from your hand. At the start of your next turn, play it.', [
    pick('timed', 'You may set aside an Action to play next turn.', 0, 1, 'hand', 'keep'),
    {
      op: 'if',
      cond: { has: 'timed' },
      then: [
        { op: 'move', cards: { var: 'timed' }, to: { mat: 'timer' } },
        {
          op: 'delay',
          label: 'Royal Commission: play the card set aside',
          effects: [
            { op: 'move', cards: { var: 'timed' }, to: 'hand' },
            { op: 'play-card', cards: { var: 'timed' }, times: 1 },
          ],
        },
      ],
    },
  ]),
  action('belt_sorter', 'Grain Sorter', 2, '+1 Action. Look at the top 2 of your deck. Discard any of them and put the rest back in any order.', [
    actions(1),
    { op: 'look', n: 2, as: 'sorted' },
    pick('dropped', 'Discard any of these.', 0, 2, { var: 'sorted' }),
    { op: 'move', cards: { var: 'dropped' }, to: 'discard' },
    ...putBack('sorted', 'deck', 2, 'Put a card back on your deck. A later one goes above it.'),
  ]),
  action('salvage_hook', 'Ragpicker', 4, '+1 Action. You may spend 1 Influence to put a card from your discard into your hand.', [
    actions(1),
    {
      op: 'if',
      cond: hasSpark(1),
      then: [
        pick('hooked', 'You may spend 1 Influence to take a card from your discard.', 0, 1, 'discard', 'keep'),
        { op: 'if', cond: { has: 'hooked' }, then: [spark(-1), { op: 'move', cards: { var: 'hooked' }, to: 'hand' }] },
      ],
    },
  ]),
  action('millrace', 'Changing of the Guard', 5, 'Discard your hand. Draw that many cards plus 1. Gain 1 Influence.', [
    { op: 'select', from: 'hand', as: 'race' },
    { op: 'move', cards: 'hand', to: 'discard' },
    draw({ add: [{ len: 'race' }, 1] }),
    spark(1),
  ]),
  action('slag_furnace', 'Lime Kiln', 3, 'Trash up to 2 cards from your hand. If you trashed 2, gain 1 Influence.', [
    pick('slag', 'Trash up to 2 cards from your hand.', 0, 2),
    { op: 'move', cards: { var: 'slag' }, to: 'trash' },
    { op: 'if', cond: { gte: [{ len: 'slag' }, 2] }, then: [spark(1)] },
  ]),
  action('spark_exchange', 'Favour Broker', 4, '+1 Buy. Choose: spend 2 Influence for +3 Coins; or discard 2 cards for 2 Influence.', [
    buys(1),
    {
      op: 'choose',
      prompt: 'Favour Broker: choose one.',
      options: [
        { label: 'Spend 2 Influence: +3 Coins', then: [{ op: 'if', cond: hasSpark(2), then: [spark(-2), coins(3)] }] },
        {
          label: 'Discard 2 cards: gain 2 Influence',
          then: [
            pick('traded', 'Discard 2 cards.', 2, 2),
            { op: 'move', cards: { var: 'traded' }, to: 'discard' },
            { op: 'if', cond: { gte: [{ len: 'traded' }, 2] }, then: [spark(2)] },
          ],
        },
      ],
    },
  ]),
]);

/** Pressure on rival houses, ways to resist it, and big payoffs that leave Royal Debt behind. */
export const NIGHT: CardDef[] = inSet('night', [
  attack('picket_line', 'Town Gossip', 3, '+1 Coin. Each opponent with 3 or more Influence loses 1 Influence.', [
    coins(1),
    { op: 'attack', effects: [{ op: 'if', cond: hasSpark(3), then: [spark(-1)] }] },
  ]),
  attack('corrosion_crew', 'Tax Farmer', 5, '+2 Coins. Each opponent spends 1 Influence or gains a Royal Debt.', [
    coins(2),
    {
      op: 'attack',
      effects: [
        {
          op: 'if',
          cond: hasSpark(1),
          then: [{ op: 'may', prompt: 'Tax Farmer: spend 1 Influence, or gain a Royal Debt?', then: [spark(-1)], else: [gainRust] }],
          else: [gainRust],
        },
      ],
    },
  ]),
  attack('noise_complaint', 'Guild Dispute', 4, 'Draw 1. +1 Action. Each opponent with a Establishment in play loses 1 Influence or discards a card, their choice.', [
    draw(1),
    actions(1),
    {
      op: 'attack',
      effects: [
        { op: 'select', from: 'play', filter: { type: 'duration' }, as: 'running' },
        {
          op: 'if',
          cond: { has: 'running' },
          then: [
            {
              op: 'if',
              cond: hasSpark(1),
              then: [
                {
                  op: 'choose',
                  prompt: 'Guild Dispute: choose one.',
                  options: [
                    { label: 'Lose 1 Influence', then: [spark(-1)] },
                    { label: 'Discard a card', then: [pick('quiet', 'Discard a card.', 1, 1), { op: 'move', cards: { var: 'quiet' }, to: 'discard' }] },
                  ],
                },
              ],
              else: [pick('quiet', 'Guild Dispute: discard a card.', 1, 1), { op: 'move', cards: { var: 'quiet' }, to: 'discard' }],
            },
          ],
        },
      ],
    },
  ]),
  reactionCard(
    'whistleblower',
    'Court Informer',
    3,
    '+1 Action. +1 Coin. When another player plays an Attack, you may reveal this from your hand: that player loses 1 Influence.',
    [actions(1), coins(1)],
    { label: 'The attacker loses 1 Influence', effects: [{ op: 'token', token: SPARK, n: -1, player: 'parent' }] },
  ),
  reactionCard(
    'ground_wire',
    'Sanctuary Writ',
    2,
    '+1 Action. If you have no Influence, gain 1 Influence. When another player plays an Attack, you may reveal this from your hand and spend 1 Influence to cancel its effects on you.',
    [actions(1), { op: 'if', cond: { not: hasSpark(1) }, then: [spark(1)] }],
    { label: 'Spend 1 Influence, cancel the attack on you', effects: [{ op: 'if', cond: hasSpark(1), then: [spark(-1), { op: 'immune' }] }] },
  ),
  action('redline_boiler', 'Usurer', 3, '+3 Coins. +1 Buy. Gain a Royal Debt.', [coins(3), buys(1), gainRust]),
  action('pressure_test', 'Royal Audit', 4, 'Reveal the top 3 of your deck: +1 Coin per Currency, 1 Influence per Action, a Royal Debt per Renown card. Discard them.', [
    { op: 'reveal', n: 3, as: 'tested' },
    coins({ countIn: 'tested', filter: { type: 'treasure' } }),
    spark({ countIn: 'tested', filter: { type: 'action', notType: 'penalty' } }),
    { op: 'repeat', n: { countIn: 'tested', filter: { type: 'victory' } }, effects: [gainRust] },
    { op: 'move', cards: { rest: 'tested' }, to: 'discard' },
  ]),
  action('overload_relay', 'Royal Progress', 6, 'Spend all your Influence. Draw 1 per Influence spent, up to 5. If you spent 4 or more, gain a Royal Debt.', [
    { op: 'set', as: 'burned', n: { token: SPARK } },
    spark({ mul: [{ value: 'burned' }, -1] }),
    draw({ min: [{ value: 'burned' }, 5] }),
    { op: 'if', cond: { gte: [{ value: 'burned' }, 4] }, then: [gainRust] },
  ]),
  action('scrapyard_broker', 'Debt Collector', 2, '+1 Action. You may trash a Royal Debt from your hand for +3 Coins. Otherwise +1 Coin.', [
    actions(1),
    { op: 'select', from: 'hand', filter: { key: 'rust' }, as: 'rusty' },
    pick('sold', 'You may trash a Royal Debt for +3 Coins. Otherwise +1 Coin.', 0, 1, { var: 'rusty' }),
    {
      op: 'if',
      cond: { has: 'sold' },
      then: [{ op: 'move', cards: { var: 'sold' }, to: 'trash' }, coins(3)],
      else: [coins(1)],
    },
  ]),
]);

/** Competing for Crown Projects, and scoring in other ways than buying Renown. */
export const TOWN: CardDef[] = inSet('town', [
  action('surveyor', 'Surveyor', 3, '+1 Action. +1 Buy. Crown Projects cost you 1 Coin less this turn.', [actions(1), buys(1), { op: 'project-discount', coins: 1 }]),
  action('zoning_board', 'Borough Reeve', 4, '+1 Action. Gain 1 Influence. Choose an open Crown Project: it costs other players 2 Coins more until your next turn.', [
    actions(1),
    spark(1),
    { op: 'choose-project', as: 'zoned', prompt: 'Which Crown Project costs the others 2 Coins more?' },
    { op: 'project-surcharge', project: 'zoned', coins: 2 },
  ]),
  action('ribbon_cutter', 'Royal Dedication', 4, '+1 Action. +1 Coin. The next time you complete a Crown Project this turn, gain 2 Influence and +1 Buy.', [
    actions(1),
    coins(1),
    { op: 'on', on: 'claim', label: 'Royal Dedication: 2 Influence, +1 Buy', once: true, effects: [spark(2), buys(1)] },
  ]),
  action('town_crier', 'Bellman', 3, 'Draw 1. +1 Action. When another player completes a Crown Project, you may reveal this from your hand to gain 1 Influence.', [draw(1), actions(1)], {
    triggers: [
      {
        on: 'claim',
        where: 'hand',
        scope: 'others',
        label: 'Bellman: 1 Influence',
        optional: 'Reveal Bellman to gain 1 Influence?',
        effects: [{ op: 'reveal-cards', cards: 'source' }, spark(1)],
      },
    ],
  }),
  prestige('civic_bond', 'Civic Tribute', 5, 'Worth 1 Renown per Crown Project completed by anyone.', { base: 0, allProjects: 1 }),
  civic(
    'city_charter',
    'Civic Charter',
    6,
    '+1 Action. +1 Buy. If you have completed a Crown Project, +3 Coins; otherwise +1 Coin. Worth 2 Renown.',
    [actions(1), buys(1), { op: 'if', cond: { gte: [{ projects: 'mine' }, 1] }, then: [coins(3)], else: [coins(1)] }],
    2,
  ),
  prestige('patent_ledger', 'Guild Register', 4, 'Worth 1 Renown per 2 Establishments you own.', { per: 2, each: 1, of: { type: 'duration' } }),
  action('plaque_foundry', 'Heraldic Painter', 3, '+1 Action. Up to twice, you may spend 2 Influence for 1 Renown.', [
    actions(1),
    {
      op: 'repeat',
      n: 2,
      effects: [{ op: 'if', cond: hasSpark(2), then: [{ op: 'may', prompt: 'Spend 2 Influence for 1 Renown?', then: [spark(-2), { op: 'vp', n: 1 }] }] }],
    },
  ]),
]);

/** Extra Crown Projects, in the The Chancery set. */
export const TOWN_WORKS: ProjectDef[] = [
  { key: 'harbor_beacon', name: 'Harbour Light', coins: 4, tokens: { [SPARK]: 1 }, vp: 3, text: 'Draw 1 and gain 1 Influence.', effects: [draw(1), spark(1)], set: 'town' },
  { key: 'foundry_gate', name: 'Castle Gate', coins: 7, tokens: { [SPARK]: 2 }, vp: 8, text: '+1 Buy and +1 Coin.', effects: [buys(1), coins(1)], set: 'town' },
  { key: 'power_exchange', name: 'Exchange Hall', coins: 2, tokens: { [SPARK]: 6 }, vp: 8, text: '+3 Coins.', effects: [coins(3)], set: 'town' },
  {
    key: 'rail_terminus',
    name: 'Royal Granary',
    coins: 6,
    tokens: { [SPARK]: 2 },
    vp: 7,
    text: 'Gain a card costing up to 4 to your hand.',
    effects: [
      { op: 'choose-pile', filter: { maxCost: 4, notType: 'penalty' }, as: 'freight', prompt: 'Gain a card costing up to 4 to your hand.' },
      { op: 'gain', pile: { var: 'freight' }, to: 'hand' },
    ],
    set: 'town',
  },
  { key: 'aqueduct', name: 'Great Conduit', coins: 5, tokens: { [SPARK]: 5 }, vp: 10, text: 'Every other player gains 1 Influence.', effects: [{ op: 'each-other', effects: [spark(1)] }], set: 'town' },
];
