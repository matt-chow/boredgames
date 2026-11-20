/**
 * Glory of the Realm: Renown cards that do something before scoring, Renown that counts Renown, and endgame timing.
 * The only clock it reads is the Grand Duchy pile. Specification: docs/expansions/FIVE_EXPANSION_MANIFEST.md,
 * section E. Rule IDs CC-GLO-*.
 */
import type { CardDef, Num } from '../../../engine/deckbuilder';
import { action, actions, attack, buys, coins, currency, draw, pickOf, prestige } from './cards';

const inSet = (cards: CardDef[]): CardDef[] => cards.map((c) => ({ ...c, set: 'glory' }));

/** CC-GLO-13: half the Grand Duchy pile's starting size, rounded down. */
const halfDuchies: [Num, Num] = [{ div: [{ pile: 'monument', start: true }, 2] }, { pile: 'monument' }];

export const GLORY: CardDef[] = inSet([
  action('tenant_farmer', 'Tenant Farmer', 2, '+1 Action. You may discard a Renown card from your hand. If you do, draw 2. Otherwise, +1 Coin.', [
    actions(1),
    pickOf('rent', 'You may discard a Renown card to draw 2.', 0, 1, { type: 'victory' }),
    { op: 'if', cond: { has: 'rent' }, then: [{ op: 'move', cards: { var: 'rent' }, to: 'discard' }, draw(2)], else: [coins(1)] },
  ]),
  action('manor_court', 'Manor Court', 3, 'If you reveal a Homestead from your hand, +1 Renown and +1 Coin. Otherwise, draw 2.', [
    pickOf('deed', 'Reveal a Homestead.', 1, 1, { key: 'notebook' }),
    { op: 'if', cond: { has: 'deed' }, then: [{ op: 'reveal-cards', cards: { var: 'deed' } }, { op: 'vp', n: 1 }, coins(1)], else: [draw(2)] },
  ]),
  action('votive_offering', 'Votive Offering', 3, '+1 Action. +1 Coin. When you trash this, +1 Renown.', [actions(1), coins(1)], {
    triggers: [{ on: 'trash', where: 'self', label: 'Votive Offering: +1 Renown', effects: [{ op: 'vp', n: 1 }] }],
  }),
  action('banner_bearer', 'Banner Bearer', 3, 'Draw 1. +2 Actions. If you have a Renown card in your hand, +1 Coin.', [
    draw(1),
    actions(2),
    { op: 'if', cond: { inHand: { type: 'victory' } }, then: [coins(1)] },
  ]),
  currency('laurel_wreath', 'Laurel Wreath', 4, '+1 Coin, plus 1 per Renown card in your hand, up to +3 Coins in total.', 1, {
    effects: [{ op: 'select', from: 'hand', filter: { type: 'victory' }, as: 'laurels' }, coins({ min: [{ len: 'laurels' }, 2] })],
  }),
  action('land_grant', 'Land Grant', 4, '+1 Buy. +2 Coins. Gain a Homestead.', [buys(1), coins(2), { op: 'gain', pile: 'notebook' }]),
  action('grand_muster', 'Grand Muster', 4, '+1 Action. Reveal your hand. Draw 1 card per Renown card revealed, up to 3.', [
    actions(1),
    { op: 'reveal-cards', cards: 'hand' },
    { op: 'select', from: 'hand', filter: { type: 'victory' }, as: 'banners' },
    draw({ min: [{ len: 'banners' }, 3] }),
  ]),
  prestige('memorial_statue', 'Memorial Statue', 4, 'Worth 1 Renown. When you gain this, +1 Renown per supply pile with 2 or fewer cards left, up to +3.', 1, {
    triggers: [{ on: 'gain', where: 'self', label: 'Memorial Statue: Renown for low piles', effects: [{ op: 'vp', n: { min: [{ emptyPiles: true, atMost: 2 }, 3] } }] }],
  }),
  attack('point_of_honour', 'Point of Honour', 4, '+2 Coins. Each opponent puts a Renown card from their hand on top of their deck, or reveals a hand with no Renown cards.', [
    coins(2),
    {
      op: 'attack',
      effects: [
        pickOf('shamed', 'Point of Honour: put a Renown card on top of your deck.', 1, 1, { type: 'victory' }),
        { op: 'if', cond: { has: 'shamed' }, then: [{ op: 'move', cards: { var: 'shamed' }, to: 'deck', public: true }], else: [{ op: 'reveal-cards', cards: 'hand' }] },
      ],
    },
  ]),
  action('honour_guard', 'Honour Guard', 4, 'Draw 2. When another player gains a Grand Duchy, you may reveal this from your hand to gain a Homestead.', [draw(2)], {
    types: ['action', 'reaction'],
    typeLine: 'Action · Reaction',
    triggers: [
      {
        on: 'gain',
        where: 'hand',
        scope: 'others',
        filter: { key: 'monument' },
        label: 'Honour Guard: gain a Homestead',
        optional: 'Reveal Honour Guard to gain a Homestead?',
        effects: [{ op: 'gain', pile: 'notebook' }],
      },
    ],
  }),
  action('victory_parade', 'Victory Parade', 5, '+1 Buy. +2 Coins. This turn, Homesteads and Noble Estates cost 1 Coin less, but not less than 0.', [
    buys(1),
    coins(2),
    { op: 'cost-mod', delta: -1, filter: { key: 'notebook' } },
    { op: 'cost-mod', delta: -1, filter: { key: 'blueprint' } },
  ]),
  prestige('chivalric_order', 'Chivalric Order', 5, 'Worth 1 Renown per 3 Renown cards you own, including this one.', { per: 3, each: 1, of: { type: 'victory' } }),
  action('royal_jubilee', 'Royal Jubilee', 6, '+1 Buy. +3 Coins. If the Grand Duchy pile has half of its starting cards or fewer left (rounded down), +1 Buy and +1 Renown.', [
    buys(1),
    coins(3),
    { op: 'if', cond: { gte: halfDuchies }, then: [buys(1), { op: 'vp', n: 1 }] },
  ]),
]);
