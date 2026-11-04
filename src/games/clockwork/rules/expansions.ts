/**
 * Optional sets, designed for this game around its own systems: Spark, Devices and Public Works. Each can be switched
 * on separately in the lobby. See docs/CLOCKWORK.md.
 */
import type { CardDef, Effect, ProjectDef } from '../../../engine/deckbuilder';
import { action, actions, attack, buys, civic, coins, currency, device, draw, gainRust, hasSpark, pick, prestige, putBack, reactionCard, spark, SPARK } from './cards';

const inSet = (set: string, cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set }));

export const FLYWHEEL_RUN = 'flywheel-run';
export const FLYWHEEL_KEEP = 'flywheel-keep';

const keepRunning: Effect = {
  op: 'delay',
  label: 'Flywheel: +2 Coins',
  effects: [{ op: 'custom', handler: FLYWHEEL_RUN }],
};

/**
 * A Flywheel can run for as long as its owner pays, and effect data can't refer to itself, so its two steps are
 * handlers. The Spark it charges keeps this finite.
 */
export const HANDLERS = {
  [FLYWHEEL_RUN]: (rt: { queue(e: Effect[]): void }) =>
    rt.queue([
      coins(2),
      {
        op: 'if',
        cond: hasSpark(1),
        then: [{ op: 'may', prompt: 'Spend 1 Spark to keep this Flywheel running?', then: [spark(-1), { op: 'custom', handler: FLYWHEEL_KEEP }] }],
      },
    ]),
  [FLYWHEEL_KEEP]: (rt: { queue(e: Effect[]): void }) => rt.queue([keepRunning]),
};

/** Economy, combinations, deck cycling and Devices that stay in play. */
export const FOUNDRY: CardDef[] = inSet('foundry', [
  currency('spark_coil', 'Spark Coil', 3, '+1 Coin. Gain 1 Spark.', 1, { effects: [spark(1)] }),
  currency('brass_bond', 'Brass Bond', 4, '+2 Coins. If you have 3 or more Spark, +1 Coin more.', 2, {
    effects: [{ op: 'if', cond: hasSpark(3), then: [coins(1)] }],
  }),
  action('relay_junction', 'Relay Junction', 3, '+1 Action. +1 Coin per other Action you played this turn, up to 3.', [
    actions(1),
    coins({ min: [{ add: [{ actionsPlayed: true }, -1] }, 3] }),
  ]),
  action('chain_drive', 'Chain Drive', 5, 'Draw 1. +1 Action. If this is your third or later Action this turn, +1 Buy and gain 2 Spark.', [
    draw(1),
    actions(1),
    { op: 'if', cond: { gte: [{ actionsPlayed: true }, 3] }, then: [buys(1), spark(2)] },
  ]),
  device('flywheel', 'Flywheel', 4, '+1 Coin. At the start of your next turn, +2 Coins; you may then spend 1 Spark to repeat this at the start of the turn after.', [
    coins(1),
    keepRunning,
  ]),
  device('timer_switch', 'Timer Switch', 3, 'You may set aside an Action from your hand. At the start of your next turn, play it.', [
    pick('timed', 'You may set aside an Action to play next turn.', 0, 1, 'hand', 'keep'),
    {
      op: 'if',
      cond: { has: 'timed' },
      then: [
        { op: 'move', cards: { var: 'timed' }, to: { mat: 'timer' } },
        {
          op: 'delay',
          label: 'Timer Switch: play the card set aside',
          effects: [
            { op: 'move', cards: { var: 'timed' }, to: 'hand' },
            { op: 'play-card', cards: { var: 'timed' }, times: 1 },
          ],
        },
      ],
    },
  ]),
  action('belt_sorter', 'Belt Sorter', 2, '+1 Action. Look at the top 2 of your deck. Discard any of them and put the rest back in any order.', [
    actions(1),
    { op: 'look', n: 2, as: 'sorted' },
    pick('dropped', 'Discard any of these.', 0, 2, { var: 'sorted' }),
    { op: 'move', cards: { var: 'dropped' }, to: 'discard' },
    ...putBack('sorted', 'deck', 2, 'Put a card back on your deck. A later one goes above it.'),
  ]),
  action('salvage_hook', 'Salvage Hook', 4, '+1 Action. You may spend 1 Spark to put a card from your discard into your hand.', [
    actions(1),
    {
      op: 'if',
      cond: hasSpark(1),
      then: [
        pick('hooked', 'You may spend 1 Spark to take a card from your discard.', 0, 1, 'discard', 'keep'),
        { op: 'if', cond: { has: 'hooked' }, then: [spark(-1), { op: 'move', cards: { var: 'hooked' }, to: 'hand' }] },
      ],
    },
  ]),
  action('millrace', 'Millrace', 5, 'Discard your hand. Draw that many cards plus 1. Gain 1 Spark.', [
    { op: 'select', from: 'hand', as: 'race' },
    { op: 'move', cards: 'hand', to: 'discard' },
    draw({ add: [{ len: 'race' }, 1] }),
    spark(1),
  ]),
  action('slag_furnace', 'Slag Furnace', 3, 'Trash up to 2 cards from your hand. If you trashed 2, gain 1 Spark.', [
    pick('slag', 'Trash up to 2 cards from your hand.', 0, 2),
    { op: 'move', cards: { var: 'slag' }, to: 'trash' },
    { op: 'if', cond: { gte: [{ len: 'slag' }, 2] }, then: [spark(1)] },
  ]),
  action('spark_exchange', 'Spark Exchange', 4, '+1 Buy. Choose: spend 2 Spark for +3 Coins; or discard 2 cards for 2 Spark.', [
    buys(1),
    {
      op: 'choose',
      prompt: 'Spark Exchange: choose one.',
      options: [
        { label: 'Spend 2 Spark: +3 Coins', then: [{ op: 'if', cond: hasSpark(2), then: [spark(-2), coins(3)] }] },
        {
          label: 'Discard 2 cards: gain 2 Spark',
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

/** Pressure on other workshops, ways to resist it, and big payoffs that leave Rust behind. */
export const NIGHT: CardDef[] = inSet('night', [
  attack('picket_line', 'Picket Line', 3, '+1 Coin. Each opponent with 3 or more Spark loses 1 Spark.', [
    coins(1),
    { op: 'attack', effects: [{ op: 'if', cond: hasSpark(3), then: [spark(-1)] }] },
  ]),
  attack('corrosion_crew', 'Corrosion Crew', 5, '+2 Coins. Each opponent spends 1 Spark or gains a Rust.', [
    coins(2),
    {
      op: 'attack',
      effects: [
        {
          op: 'if',
          cond: hasSpark(1),
          then: [{ op: 'may', prompt: 'Corrosion Crew: spend 1 Spark, or gain a Rust?', then: [spark(-1)], else: [gainRust] }],
          else: [gainRust],
        },
      ],
    },
  ]),
  attack('noise_complaint', 'Noise Complaint', 4, 'Draw 1. +1 Action. Each opponent with a Device in play loses 1 Spark or discards a card, their choice.', [
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
                  prompt: 'Noise Complaint: choose one.',
                  options: [
                    { label: 'Lose 1 Spark', then: [spark(-1)] },
                    { label: 'Discard a card', then: [pick('quiet', 'Discard a card.', 1, 1), { op: 'move', cards: { var: 'quiet' }, to: 'discard' }] },
                  ],
                },
              ],
              else: [pick('quiet', 'Noise Complaint: discard a card.', 1, 1), { op: 'move', cards: { var: 'quiet' }, to: 'discard' }],
            },
          ],
        },
      ],
    },
  ]),
  reactionCard(
    'whistleblower',
    'Whistleblower',
    3,
    '+1 Action. +1 Coin. When another player plays an Attack, you may reveal this from your hand: that player loses 1 Spark.',
    [actions(1), coins(1)],
    { label: 'The attacker loses 1 Spark', effects: [{ op: 'token', token: SPARK, n: -1, player: 'parent' }] },
  ),
  reactionCard(
    'ground_wire',
    'Ground Wire',
    2,
    '+1 Action. If you have no Spark, gain 1 Spark. When another player plays an Attack, you may reveal this from your hand and spend 1 Spark to cancel its effects on you.',
    [actions(1), { op: 'if', cond: { not: hasSpark(1) }, then: [spark(1)] }],
    { label: 'Spend 1 Spark, cancel the attack on you', effects: [{ op: 'if', cond: hasSpark(1), then: [spark(-1), { op: 'immune' }] }] },
  ),
  action('redline_boiler', 'Redline Boiler', 3, '+3 Coins. +1 Buy. Gain a Rust.', [coins(3), buys(1), gainRust]),
  action('pressure_test', 'Pressure Test', 4, 'Reveal the top 3 of your deck: +1 Coin per Currency, 1 Spark per Action, a Rust per Prestige card. Discard them.', [
    { op: 'reveal', n: 3, as: 'tested' },
    coins({ countIn: 'tested', filter: { type: 'treasure' } }),
    spark({ countIn: 'tested', filter: { type: 'action', notType: 'penalty' } }),
    { op: 'repeat', n: { countIn: 'tested', filter: { type: 'victory' } }, effects: [gainRust] },
    { op: 'move', cards: { rest: 'tested' }, to: 'discard' },
  ]),
  action('overload_relay', 'Overload Relay', 6, 'Spend all your Spark. Draw 1 per Spark spent, up to 5. If you spent 4 or more, gain a Rust.', [
    { op: 'set', as: 'burned', n: { token: SPARK } },
    spark({ mul: [{ value: 'burned' }, -1] }),
    draw({ min: [{ value: 'burned' }, 5] }),
    { op: 'if', cond: { gte: [{ value: 'burned' }, 4] }, then: [gainRust] },
  ]),
  action('scrapyard_broker', 'Scrapyard Broker', 2, '+1 Action. You may trash a Rust from your hand for +3 Coins. Otherwise +1 Coin.', [
    actions(1),
    { op: 'select', from: 'hand', filter: { key: 'rust' }, as: 'rusty' },
    pick('sold', 'You may trash a Rust for +3 Coins. Otherwise +1 Coin.', 0, 1, { var: 'rusty' }),
    {
      op: 'if',
      cond: { has: 'sold' },
      then: [{ op: 'move', cards: { var: 'sold' }, to: 'trash' }, coins(3)],
      else: [coins(1)],
    },
  ]),
]);

/** Competing for Public Works, and scoring in other ways than buying Prestige. */
export const TOWN: CardDef[] = inSet('town', [
  action('surveyor', 'Surveyor', 3, '+1 Action. +1 Buy. Public Works cost you 1 Coin less this turn.', [actions(1), buys(1), { op: 'project-discount', coins: 1 }]),
  action('zoning_board', 'Zoning Board', 4, '+1 Action. Gain 1 Spark. Choose an open Public Work: it costs other players 2 Coins more until your next turn.', [
    actions(1),
    spark(1),
    { op: 'choose-project', as: 'zoned', prompt: 'Which Public Work costs the others 2 Coins more?' },
    { op: 'project-surcharge', project: 'zoned', coins: 2 },
  ]),
  action('ribbon_cutter', 'Ribbon Cutter', 4, '+1 Action. +1 Coin. The next time you complete a Public Work this turn, gain 2 Spark and +1 Buy.', [
    actions(1),
    coins(1),
    { op: 'on', on: 'claim', label: 'Ribbon Cutter: 2 Spark, +1 Buy', once: true, effects: [spark(2), buys(1)] },
  ]),
  action('town_crier', 'Town Crier', 3, 'Draw 1. +1 Action. When another player completes a Public Work, you may reveal this from your hand to gain 1 Spark.', [draw(1), actions(1)], {
    triggers: [
      {
        on: 'claim',
        where: 'hand',
        scope: 'others',
        label: 'Town Crier: 1 Spark',
        optional: 'Reveal Town Crier to gain 1 Spark?',
        effects: [{ op: 'reveal-cards', cards: 'source' }, spark(1)],
      },
    ],
  }),
  prestige('civic_bond', 'Civic Bond', 5, 'Worth 1 Prestige per Public Work completed by anyone.', { base: 0, allProjects: 1 }),
  civic(
    'city_charter',
    'City Charter',
    6,
    '+1 Action. +1 Buy. If you have completed a Public Work, +3 Coins; otherwise +1 Coin. Worth 2 Prestige.',
    [actions(1), buys(1), { op: 'if', cond: { gte: [{ projects: 'mine' }, 1] }, then: [coins(3)], else: [coins(1)] }],
    2,
  ),
  prestige('patent_ledger', 'Patent Ledger', 4, 'Worth 1 Prestige per 2 Devices you own.', { per: 2, each: 1, of: { type: 'duration' } }),
  action('plaque_foundry', 'Plaque Foundry', 3, '+1 Action. Up to twice, you may spend 2 Spark for 1 Prestige.', [
    actions(1),
    {
      op: 'repeat',
      n: 2,
      effects: [{ op: 'if', cond: hasSpark(2), then: [{ op: 'may', prompt: 'Spend 2 Spark for 1 Prestige?', then: [spark(-2), { op: 'vp', n: 1 }] }] }],
    },
  ]),
]);

/** Extra Public Works, in the Town Hall set. */
export const TOWN_WORKS: ProjectDef[] = [
  { key: 'harbor_beacon', name: 'Harbor Beacon', coins: 4, tokens: { [SPARK]: 1 }, vp: 3, text: 'Draw 1 and gain 1 Spark.', effects: [draw(1), spark(1)], set: 'town' },
  { key: 'foundry_gate', name: 'Foundry Gate', coins: 7, tokens: { [SPARK]: 2 }, vp: 8, text: '+1 Buy and +1 Coin.', effects: [buys(1), coins(1)], set: 'town' },
  { key: 'power_exchange', name: 'Power Exchange', coins: 2, tokens: { [SPARK]: 6 }, vp: 8, text: '+3 Coins.', effects: [coins(3)], set: 'town' },
  {
    key: 'rail_terminus',
    name: 'Rail Terminus',
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
  { key: 'aqueduct', name: 'Aqueduct', coins: 5, tokens: { [SPARK]: 5 }, vp: 10, text: 'Every other player gains 1 Spark.', effects: [{ op: 'each-other', effects: [spark(1)] }], set: 'town' },
];
