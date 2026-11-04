import { describe, expect, it } from 'vitest';
import { Table } from './helpers';

const noAsk = (t: Table) => expect(t.s.pending).toBeNull();

describe('Core Set: Workshop', () => {
  it('CC-CARD-gearwright: draws 2, then one card from hand goes under the deck', () => {
    const t = new Table(['gearwright', 'notebook'], { deck: ['cog', 'dynamo'] });
    t.play('gearwright');
    expect(t.hand()).toEqual(['notebook', 'cog', 'dynamo']);
    t.cards('notebook');
    expect(t.hand()).toEqual(['cog', 'dynamo']);
    expect(t.deck()[0]).toBe('notebook');
  });
  it('CC-CARD-shift_bell: +2 Actions and a draw; Spark only after another Action', () => {
    const t = new Table(['shift_bell', 'shift_bell'], { deck: ['cog', 'dynamo'] });
    t.play('shift_bell');
    expect(t.actions).toBe(2);
    expect(t.spark()).toBe(0);
    expect(t.hand()).toContain('cog');
    t.play('shift_bell');
    expect(t.actions).toBe(3);
    expect(t.spark()).toBe(1);
  });
  it('CC-CARD-tally_clerk: gains Spark below 2, not at 2', () => {
    const t = new Table(['tally_clerk', 'tally_clerk'], { spark: 1 });
    t.play('tally_clerk');
    expect([t.actions, t.buys, t.spark()]).toEqual([1, 2, 2]);
    t.play('tally_clerk');
    expect([t.actions, t.buys, t.spark()]).toEqual([1, 3, 2]);
  });
  it('CC-CARD-supply_crane: +2 Coins, and the gain is limited to cost 2 and goes to the discard', () => {
    const t = new Table(['supply_crane']);
    t.play('supply_crane');
    expect(t.coins).toBe(2);
    expect(t.q.piles).toContain('paper_fan');
    expect(t.q.piles).toContain('scrap');
    expect(t.q.piles).not.toContain('cog');
    expect(t.q.piles).not.toContain('rust');
    t.pile('paper_fan');
    expect(t.discard()).toContain('paper_fan');
  });
  it('CC-CARD-copper_press: trash is mandatory, coins are half cost rounded up, plus Spark', () => {
    const t = new Table(['copper_press', 'blueprint', 'notebook']);
    t.play('copper_press');
    expect(t.q.min).toBe(1);
    t.cards('blueprint');
    expect(t.trash()).toEqual(['blueprint']);
    expect(t.coins).toBe(3);
    expect(t.spark()).toBe(1);
  });
  it('CC-CARD-copper_press: a card that costs 0 gives no coins, and an empty hand still gives Spark (CC-I-5)', () => {
    const a = new Table(['copper_press', 'scrap']);
    a.play('copper_press');
    expect(a.coins).toBe(0);
    expect(a.trash()).toEqual(['scrap']);
    const b = new Table(['copper_press']);
    b.play('copper_press');
    noAsk(b);
    expect([b.coins, b.spark()]).toEqual([0, 1]);
  });
  it('CC-CARD-foreman: draw 3 and discard 1, or 2 Spark and +1 Buy', () => {
    const a = new Table(['foreman'], { deck: ['cog', 'dynamo', 'notebook'] });
    a.play('foreman');
    expect(a.actions).toBe(1);
    a.opt('draw 3');
    a.cards('notebook');
    expect(a.hand()).toEqual(['cog', 'dynamo']);
    expect(a.discard()).toContain('notebook');
    const b = new Table(['foreman']);
    b.play('foreman');
    b.opt('2 Influence');
    expect([b.spark(), b.buys]).toEqual([2, 2]);
  });
});

describe('Core Set: Flow', () => {
  it('CC-CARD-paper_fan: discards up to 2 and draws that many plus 1', () => {
    const t = new Table(['paper_fan', 'notebook', 'scrap', 'scrap'], { deck: ['cog', 'dynamo', 'blueprint'] });
    t.play('paper_fan');
    t.cards('notebook', 'scrap');
    expect(t.hand()).toEqual(['scrap', 'cog', 'dynamo', 'blueprint']);
    const none = new Table(['paper_fan', 'scrap'], { deck: ['cog'] });
    none.play('paper_fan');
    none.cards();
    expect(none.hand()).toEqual(['scrap', 'cog']);
  });
  it('CC-CARD-conveyor: one to hand, the other two go under in the order chosen', () => {
    const t = new Table(['conveyor'], { deck: ['cog', 'dynamo', 'notebook'] });
    const below = t.deck().length - 3;
    t.play('conveyor');
    expect(t.actions).toBe(1);
    t.cards('dynamo');
    expect(t.hand()).toEqual(['dynamo']);
    t.cards('notebook');
    expect(t.deck().slice(0, 2)).toEqual(['cog', 'notebook']);
    expect(t.deck().length).toBe(below + 2);
  });
  it('CC-CARD-conveyor: a short deck still works', () => {
    const t = new Table(['conveyor']);
    t.deckIs(t.me, ['cog']);
    t.s.players[t.me].discard = [];
    t.play('conveyor');
    noAsk(t);
    expect(t.hand()).toEqual(['cog']);
  });
  it('CC-CARD-sorting_glasses: revealing a Device gives Spark, anything else gives a Coin', () => {
    const a = new Table(['sorting_glasses', 'lamplighter'], { deck: ['scrap', 'scrap'] });
    a.play('sorting_glasses');
    a.cards('lamplighter');
    expect([a.spark(), a.coins]).toEqual([1, 0]);
    const b = new Table(['sorting_glasses'], { deck: ['scrap', 'cog'] });
    b.play('sorting_glasses');
    b.cards('cog');
    expect([b.spark(), b.coins]).toEqual([0, 1]);
    expect(b.hand()).toEqual(['scrap', 'cog']);
  });
  it('CC-CARD-sorting_glasses: with nothing to reveal, it is the otherwise branch (CC-I-6)', () => {
    const t = new Table(['sorting_glasses']);
    t.deckIs(t.me, []);
    t.s.players[t.me].discard = [];
    t.play('sorting_glasses');
    noAsk(t);
    expect(t.coins).toBe(1);
  });
  it('CC-CARD-springboard: +2 Actions; discarding gives Spark and a draw, declining gives neither', () => {
    const a = new Table(['springboard', 'notebook'], { deck: ['cog'] });
    a.play('springboard');
    expect(a.actions).toBe(2);
    a.cards('notebook');
    expect(a.spark()).toBe(1);
    expect(a.hand()).toEqual(['cog']);
    const b = new Table(['springboard', 'notebook']);
    b.play('springboard');
    b.cards();
    expect(b.spark()).toBe(0);
    expect(b.hand()).toEqual(['notebook']);
  });
  it('CC-CARD-clockwork_archive: draws 3, files 2 on the deck in order, gains Spark', () => {
    const t = new Table(['clockwork_archive'], { deck: ['cog', 'dynamo', 'notebook'] });
    t.play('clockwork_archive');
    t.cards('notebook');
    t.cards('dynamo');
    expect(t.hand()).toEqual(['cog']);
    expect(t.deck().slice(-2)).toEqual(['notebook', 'dynamo']);
    expect(t.spark()).toBe(1);
  });
  it('CC-CARD-whistle_stop: +1 Action, +1 Buy, draw 2, and an optional paid draw', () => {
    const a = new Table(['whistle_stop'], { deck: ['cog', 'dynamo', 'notebook'], spark: 2 });
    a.play('whistle_stop');
    expect([a.actions, a.buys]).toEqual([1, 2]);
    a.yes();
    expect(a.hand()).toEqual(['cog', 'dynamo', 'notebook']);
    expect(a.spark()).toBe(1);
    const b = new Table(['whistle_stop'], { deck: ['cog', 'dynamo', 'notebook'], spark: 2 });
    b.play('whistle_stop');
    b.no();
    expect(b.hand()).toEqual(['cog', 'dynamo']);
    expect(b.spark()).toBe(2);
    const c = new Table(['whistle_stop'], { deck: ['cog', 'dynamo'] });
    c.play('whistle_stop');
    noAsk(c);
  });
});

describe('Core Set: Energy', () => {
  it('CC-CARD-hand_crank: gains 2 Spark and discards a card', () => {
    const t = new Table(['hand_crank', 'notebook', 'scrap']);
    t.play('hand_crank');
    expect(t.spark()).toBe(2);
    t.cards('notebook');
    expect(t.discard()).toContain('notebook');
    const empty = new Table(['hand_crank']);
    empty.play('hand_crank');
    noAsk(empty);
    expect(empty.spark()).toBe(2);
  });
  it('CC-CARD-charge_meter: draws only at 4 or more Spark after gaining', () => {
    const a = new Table(['charge_meter'], { spark: 2, deck: ['cog'] });
    a.play('charge_meter');
    expect(a.spark()).toBe(3);
    expect(a.hand()).toEqual([]);
    const b = new Table(['charge_meter'], { spark: 3, deck: ['cog'] });
    b.play('charge_meter');
    expect(b.spark()).toBe(4);
    expect(b.hand()).toEqual(['cog']);
    expect(b.actions).toBe(1);
  });
  it('CC-CARD-capacitor_bank: pays next turn, not now, and stays in play until then', () => {
    const t = new Table(['capacitor_bank']);
    t.play('capacitor_bank');
    expect(t.spark()).toBe(0);
    t.end();
    expect(t.inPlay()).toContain('capacitor_bank');
    const hand = t.hand().length;
    t.end();
    expect(t.s.turn.seat).toBe(t.me);
    expect(t.spark()).toBe(3);
    expect(t.hand().length).toBe(hand + 1);
    t.end();
    expect(t.inPlay()).not.toContain('capacitor_bank');
    expect([...t.discard(), ...t.deck(), ...t.hand()]).toContain('capacitor_bank');
  });
  it('CC-CARD-steam_diverter: spends the amount chosen, at most 3, for 2 Coins each', () => {
    const t = new Table(['steam_diverter'], { spark: 5 });
    t.play('steam_diverter');
    expect(t.q.options).toEqual(['0', '1', '2', '3']);
    t.opt(2);
    expect([t.spark(), t.coins]).toEqual([3, 4]);
    const low = new Table(['steam_diverter'], { spark: 1 });
    low.play('steam_diverter');
    expect(low.q.options).toEqual(['0', '1']);
    low.opt(0);
    expect([low.spark(), low.coins]).toEqual([1, 0]);
    const none = new Table(['steam_diverter']);
    none.play('steam_diverter');
    noAsk(none);
    expect(none.coins).toBe(0);
  });
  it('CC-CARD-glow_mason: +1 Buy, +2 Coins, 2 Spark', () => {
    const t = new Table(['glow_mason']);
    t.play('glow_mason');
    expect([t.buys, t.coins, t.spark()]).toEqual([2, 2, 2]);
  });
  it('CC-CARD-overcharge_lab: draw 3, 2 Spark, and the next hand loses a card after cleanup (CC-I-1)', () => {
    const t = new Table(['overcharge_lab'], { deck: ['scrap', 'scrap', 'scrap', 'notebook', 'cog', 'dynamo', 'scrap', 'scrap'] });
    t.play('overcharge_lab');
    expect(t.hand().length).toBe(3);
    expect(t.spark()).toBe(2);
    t.end();
    expect(t.asking).toBe(t.me);
    expect(t.hand().length).toBe(5);
    t.cards('notebook');
    expect(t.hand().length).toBe(4);
    expect(t.s.turn.seat).not.toBe(t.me);
  });
});

describe('Core Set: Interaction', () => {
  it('CC-CARD-signal_tower: the opponent chooses bottom or discard, and it is public', () => {
    const t = new Table(['signal_tower', 'signal_tower'], { others: [['scrap']] });
    t.stack(1 - t.me, ['cog', 'dynamo']);
    t.play('signal_tower');
    expect([t.actions, t.coins]).toEqual([1, 1]);
    expect(t.asking).toBe(1 - t.me);
    expect(t.view(t.me).revealed.map((c) => c.key)).toEqual(['cog']);
    t.opt('Bottom');
    expect(t.deck(1 - t.me)[0]).toBe('cog');
    t.play('signal_tower');
    t.opt('Discard');
    expect(t.discard(1 - t.me)).toContain('dynamo');
  });
  it('CC-CARD-signal_tower: an opponent with no cards to reveal is not asked', () => {
    const t = new Table(['signal_tower']);
    t.deckIs(1 - t.me, []);
    t.s.players[1 - t.me].discard = [];
    t.play('signal_tower');
    noAsk(t);
  });
  it('CC-CARD-city_messenger: draws and buys; revealing it to an attack gains Spark and leaves it in hand', () => {
    const a = new Table(['city_messenger'], { deck: ['cog'] });
    a.play('city_messenger');
    expect(a.hand()).toEqual(['cog']);
    expect(a.buys).toBe(2);
    const b = new Table(['inspection_team'], { others: [['city_messenger', 'scrap', 'scrap', 'scrap', 'scrap']] });
    b.play('inspection_team');
    expect(b.q.kind).toBe('react');
    b.cards('city_messenger');
    expect(b.spark(1 - b.me)).toBe(1);
    expect(b.hand(1 - b.me)).toContain('city_messenger');
    // The attack still lands, and each copy can only react once per attack.
    expect(b.q.kind).toBe('cards');
    b.cards('scrap');
    expect(b.hand(1 - b.me).length).toBe(4);
  });
  it('CC-CARD-inspection_team: +2 Coins; only hands of 5 or more discard', () => {
    const t = new Table(['inspection_team', 'inspection_team'], { others: [['scrap', 'scrap', 'scrap', 'scrap', 'notebook']] });
    t.play('inspection_team');
    expect(t.coins).toBe(2);
    t.cards('notebook');
    expect(t.hand(1 - t.me).length).toBe(4);
    const u = new Table(['inspection_team'], { others: [['scrap', 'scrap', 'scrap', 'scrap']] });
    u.play('inspection_team');
    noAsk(u);
  });
  it('CC-CARD-mutual_aid: you draw 2, the chosen player draws 1, you gain 2 Spark; it is not an attack (CC-I-9)', () => {
    const t = new Table(['mutual_aid', 'night_watch'], { players: 3, deck: ['cog', 'dynamo'], others: [['night_watch'], ['scrap']] });
    const [left, far] = [(t.me + 1) % 3, (t.me + 2) % 3];
    t.stack(far, ['blueprint']);
    t.play('mutual_aid');
    expect(t.q.kind).toBe('player');
    expect(t.q.seats).toEqual([left, far]);
    t.player(far);
    expect(t.hand(far)).toEqual(['scrap', 'blueprint']);
    expect(t.hand(left)).toEqual(['night_watch']);
    expect(t.spark()).toBe(2);
    expect(t.hand()).toEqual(['night_watch', 'cog', 'dynamo']);
  });
  it('CC-CARD-mutual_aid: one opponent is chosen automatically', () => {
    const t = new Table(['mutual_aid'], { others: [['scrap']] });
    t.play('mutual_aid');
    noAsk(t);
    expect(t.hand(1 - t.me).length).toBe(2);
  });
  it('CC-CARD-permit_office: accepting costs them a card for Spark; declining gives you the Spark (CC-I-7)', () => {
    const a = new Table(['permit_office'], { others: [['notebook']] });
    a.play('permit_office');
    expect([a.actions, a.buys]).toEqual([1, 2]);
    expect(a.asking).toBe(1 - a.me);
    a.cards('notebook');
    expect([a.spark(), a.spark(1 - a.me)]).toEqual([0, 1]);
    const b = new Table(['permit_office'], { others: [['notebook']] });
    b.play('permit_office');
    b.cards();
    expect([b.spark(), b.spark(1 - b.me)]).toEqual([1, 0]);
    const c = new Table(['permit_office'], { others: [[]] });
    c.play('permit_office');
    noAsk(c);
    expect(c.spark()).toBe(1);
  });
  it('CC-CARD-night_watch: +2 Coins and Spark; revealing and discarding cancels the attack on you', () => {
    const a = new Table(['night_watch']);
    a.play('night_watch');
    expect([a.coins, a.spark()]).toEqual([2, 1]);
    const b = new Table(['inspection_team'], { others: [['night_watch', 'scrap', 'scrap', 'scrap', 'notebook']] });
    b.play('inspection_team');
    b.cards('night_watch');
    b.cards('notebook');
    noAsk(b);
    expect(b.hand(1 - b.me).length).toBe(4);
    expect(b.discard(1 - b.me)).toContain('notebook');
    expect(b.coins).toBe(2);
  });
  it('CC-CARD-night_watch: it may discard itself as the price (CC-I-8)', () => {
    const t = new Table(['signal_tower'], { others: [['night_watch']] });
    t.stack(1 - t.me, ['cog']);
    t.play('signal_tower');
    t.cards('night_watch');
    noAsk(t);
    expect(t.discard(1 - t.me)).toContain('night_watch');
    expect(t.deck(1 - t.me).at(-1)).toBe('cog');
  });
});

describe('Core Set: Long game', () => {
  it('CC-CARD-maintenance_cart: next turn +1 Coin and 1 Spark', () => {
    const t = new Table(['maintenance_cart']);
    t.play('maintenance_cart');
    t.round();
    expect([t.coins, t.spark()]).toEqual([1, 1]);
  });
  it('CC-CARD-lamplighter: draws 1 now and 2 next turn', () => {
    const t = new Table(['lamplighter'], { deck: ['cog'] });
    t.play('lamplighter');
    expect(t.hand()).toEqual(['cog']);
    t.round();
    expect(t.hand().length).toBe(7);
  });
  it('CC-CARD-clock_garden: draws 2 only the turn after completing a Public Work', () => {
    const t = new Table(['clock_garden'], { spark: 2, deck: ['cog', 'dynamo'] });
    t.play('clock_garden');
    expect([t.actions, t.spark()]).toEqual([1, 3]);
    expect(t.hand()).toEqual([]);
    t.toMarket();
    t.s.turn.coins = 3;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    t.end();
    t.end();
    t.mint(t.me, 'clock_garden');
    const before = t.hand().length;
    t.play('clock_garden');
    expect(t.hand().length).toBe(before + 1);
    // The bonus is for the previous turn only.
    t.round();
    t.mint(t.me, 'clock_garden');
    const later = t.hand().length;
    t.play('clock_garden');
    expect(t.hand().length).toBe(later - 1);
  });
  it('CC-CARD-gear_lease: +2 Coins now; +1 Buy and +1 Coin next turn', () => {
    const t = new Table(['gear_lease']);
    t.play('gear_lease');
    expect(t.coins).toBe(2);
    t.round();
    expect([t.buys, t.coins]).toEqual([2, 1]);
  });
  it('CC-CARD-city_blueprint: keep up to 2, discard the rest, gain Spark', () => {
    const t = new Table(['city_blueprint'], { deck: ['cog', 'dynamo', 'notebook', 'blueprint'] });
    t.play('city_blueprint');
    expect(t.actions).toBe(1);
    t.cards('cog', 'dynamo');
    expect(t.hand()).toEqual(['cog', 'dynamo']);
    expect(t.discard()).toEqual(expect.arrayContaining(['notebook', 'blueprint']));
    expect(t.spark()).toBe(1);
  });
  it('CC-CARD-grand_engine: pays now and again next turn', () => {
    const t = new Table(['grand_engine']);
    t.play('grand_engine');
    expect([t.coins, t.spark()]).toEqual([2, 1]);
    t.round();
    expect(t.coins).toBe(2);
    expect(t.hand().length).toBe(7);
  });
});

describe('Core Set: Prestige', () => {
  const score = (t: Table, seat = t.me) => {
    t.s.over = true;
    return (t.view(seat).final ?? []);
  };
  it('CC-CARD-civic_scholar: draws, gains Spark, is worth 1', () => {
    const t = new Table(['civic_scholar'], { deck: ['cog'] });
    t.play('civic_scholar');
    expect(t.hand()).toEqual(['cog']);
    expect(t.spark()).toBe(1);
    expect(t.s.players[t.me].play.length).toBe(1);
    expect(t.view().players[t.me].vp).toBeTypeOf('number');
  });
  it('CC-CARD-museum_curator: draw 2, discard 1', () => {
    const t = new Table(['museum_curator'], { deck: ['cog', 'notebook'] });
    t.play('museum_curator');
    t.cards('notebook');
    expect(t.hand()).toEqual(['cog']);
  });
  it('CC-CARD-patron_circle: +1 Buy, +2 Coins', () => {
    const t = new Table(['patron_circle']);
    t.play('patron_circle');
    expect([t.buys, t.coins]).toEqual([2, 2]);
  });
  it('CC-CARD-civic_embassy: gains 2 Spark; giving 1 away draws 2, and declining does not', () => {
    const a = new Table(['civic_embassy'], { deck: ['cog', 'dynamo'] });
    a.play('civic_embassy');
    expect(a.actions).toBe(1);
    a.yes();
    expect(a.spark()).toBe(1);
    expect(a.spark(1 - a.me)).toBe(1);
    expect(a.hand()).toEqual(['cog', 'dynamo']);
    const b = new Table(['civic_embassy']);
    b.play('civic_embassy');
    b.no();
    expect([b.spark(), b.spark(1 - b.me), b.hand().length]).toEqual([2, 0, 0]);
  });
  it('CC-CARD-civic_embassy: Spark given past the recipient’s cap is lost (CC-I-10)', () => {
    const t = new Table(['civic_embassy']);
    t.setSpark(8, 1 - t.me);
    t.play('civic_embassy');
    t.yes();
    expect(t.spark(1 - t.me)).toBe(8);
    expect(t.spark()).toBe(1);
  });
  it('CC-CARD-silver_statue: worth 1 plus 1 per 3 Spark at the end', () => {
    expect(worth('silver_statue', 0)).toBe(1);
    expect(worth('silver_statue', 2)).toBe(1);
    expect(worth('silver_statue', 3)).toBe(2);
    expect(worth('silver_statue', 8)).toBe(3);
  });
  it('CC-CARD-inventors_medal: worth 6 plus 1 per Public Work you completed', () => {
    expect(worth('inventors_medal', 0)).toBe(6);
    expect(worth('inventors_medal', 5, 2)).toBe(8);
  });
});

/** A card's final worth, in a deck stripped down to that one card. */
function worth(key: string, sparks: number, works = 0): number {
  const t = new Table([key]);
  const p = t.s.players[t.me];
  const own = p.hand[0];
  const seat = t.me;
  for (const z of t.s.players) {
    z.deck = [];
    z.discard = [];
    z.hand = [];
  }
  p.hand = [own];
  p.tokens.spark = sparks;
  const stolen = t.s.projects.slice(0, works);
  stolen.forEach((w) => (w.by = seat));
  const prestige = stolen.reduce((a, w) => a + ({ canal_lights: 4, public_clock: 5, makers_fair: 6, tram_extension: 7, skybridge: 8 } as Record<string, number>)[w.key], 0);
  // Empty the Monuments and finish the turn so the real end of the game scores it.
  t.s.supply.monument = [];
  t.end();
  expect(t.s.over).toBe(true);
  const row = t.view(seat).final!.find((r) => r.seat === seat)!;
  return row.total - prestige;
}

describe('Basics', () => {
  it('CC-CARD-scrap, CC-CARD-cog, CC-CARD-dynamo: Currency worth 1, 2 and 3', () => {
    const t = new Table(['scrap', 'cog', 'dynamo']);
    t.toMarket();
    t.apply(t.me, { type: 'play-treasures' });
    expect(t.coins).toBe(6);
  });
  it('CC-CARD-notebook, CC-CARD-blueprint, CC-CARD-monument: worth 1, 3 and 6', () => {
    expect(worth('notebook', 0)).toBe(1);
    expect(worth('blueprint', 0)).toBe(3);
    expect(worth('monument', 0)).toBe(6);
  });
  it('CC-CARD-rust: −1 Prestige, cannot be bought, and can be trashed for 1 Spark', () => {
    expect(worth('rust', 0)).toBe(-1);
    const t = new Table(['rust'], { spark: 2 });
    t.play('rust');
    t.yes();
    expect(t.trash()).toEqual(['rust']);
    expect(t.spark()).toBe(1);
    const keep = new Table(['rust'], { spark: 2 });
    keep.play('rust');
    keep.no();
    expect(keep.trash()).toEqual([]);
    const broke = new Table(['rust']);
    broke.play('rust');
    noAsk(broke);
    expect(broke.inPlay()).toContain('rust');
    const shop = new Table([]);
    shop.toMarket();
    expect(shop.view().legal.buy).not.toContain('rust');
  });
});

describe('Foundry Row', () => {
  it('CC-CARD-spark_coil: a Currency that also gains Spark', () => {
    const t = new Table(['spark_coil']);
    t.toMarket();
    t.apply(t.me, { type: 'play-treasures' });
    expect([t.coins, t.spark()]).toEqual([1, 1]);
  });
  it('CC-CARD-brass_bond: worth 2, or 3 with 3 or more Spark', () => {
    const a = new Table(['brass_bond'], { spark: 2 });
    a.toMarket();
    a.apply(a.me, { type: 'play-treasures' });
    expect(a.coins).toBe(2);
    const b = new Table(['brass_bond'], { spark: 3 });
    b.toMarket();
    b.apply(b.me, { type: 'play-treasures' });
    expect(b.coins).toBe(3);
  });
  it('CC-CARD-relay_junction: counts other Actions this turn, up to 3', () => {
    const t = new Table(['relay_junction', 'relay_junction', 'relay_junction', 'relay_junction', 'relay_junction']);
    const totals = [];
    for (let i = 0; i < 5; i++) {
      t.play('relay_junction');
      totals.push(t.coins);
    }
    expect(totals).toEqual([0, 1, 3, 6, 9]);
  });
  it('CC-CARD-chain_drive: the third Action this turn pays +1 Buy and 2 Spark', () => {
    const t = new Table(['chain_drive', 'chain_drive', 'chain_drive'], { deck: ['scrap', 'scrap', 'scrap'] });
    t.play('chain_drive');
    t.play('chain_drive');
    expect([t.buys, t.spark()]).toEqual([1, 0]);
    t.play('chain_drive');
    expect([t.buys, t.spark()]).toEqual([2, 2]);
  });
  it('CC-CARD-flywheel: pays next turn, can be kept running with Spark, and stops when not paid', () => {
    const t = new Table(['flywheel'], { spark: 2 });
    t.play('flywheel');
    expect(t.coins).toBe(1);
    t.round();
    expect(t.coins).toBe(2);
    t.yes();
    expect(t.spark()).toBe(1);
    t.round();
    expect(t.coins).toBe(2);
    expect(t.inPlay()).toContain('flywheel');
    t.no();
    t.end();
    expect(t.inPlay()).not.toContain('flywheel');
    t.round();
    expect(t.coins).toBe(0);
  });
  it('CC-CARD-flywheel: without Spark, nothing is asked', () => {
    const t = new Table(['flywheel']);
    t.play('flywheel');
    t.round();
    expect(t.coins).toBe(2);
    noAsk(t);
  });
  it('CC-CARD-timer_switch: the set-aside card plays itself next turn, without spending an Action', () => {
    const t = new Table(['timer_switch', 'glow_mason']);
    t.play('timer_switch');
    t.cards('glow_mason');
    expect(t.view().players[t.me].mats.timer.count).toBe(1);
    t.round();
    expect([t.coins, t.buys, t.spark()]).toEqual([2, 2, 2]);
    expect(t.actions).toBe(1);
    expect(t.inPlay()).toContain('glow_mason');
    expect(t.view().players[t.me].mats.timer?.count ?? 0).toBe(0);
  });
  it('CC-CARD-timer_switch: nothing set aside means nothing next turn', () => {
    const t = new Table(['timer_switch', 'glow_mason']);
    t.play('timer_switch');
    t.cards();
    t.round();
    expect(t.coins).toBe(0);
  });
  it('CC-CARD-belt_sorter: discards any and orders the rest', () => {
    const t = new Table(['belt_sorter', 'belt_sorter'], { deck: ['notebook', 'cog', 'dynamo', 'scrap'] });
    t.play('belt_sorter');
    t.cards('notebook');
    expect(t.discard()).toContain('notebook');
    expect(t.deck().at(-1)).toBe('cog');
    t.play('belt_sorter');
    t.cards();
    t.cards('dynamo');
    expect(t.deck().at(-1)).toBe('cog');
    expect(t.deck().at(-2)).toBe('dynamo');
  });
  it('CC-CARD-salvage_hook: spends Spark only if a card is taken', () => {
    const t = new Table(['salvage_hook', 'salvage_hook'], { spark: 2 });
    t.s.players[t.me].discard = [];
    t.mint(t.me, 'dynamo');
    t.s.players[t.me].discard.push(t.s.players[t.me].hand.pop()!);
    t.play('salvage_hook');
    t.cards('dynamo');
    expect(t.hand()).toContain('dynamo');
    expect(t.spark()).toBe(1);
    t.mint(t.me, 'scrap');
    t.s.players[t.me].discard.push(t.s.players[t.me].hand.pop()!);
    t.play('salvage_hook');
    t.cards();
    expect(t.spark()).toBe(1);
    const broke = new Table(['salvage_hook']);
    broke.play('salvage_hook');
    noAsk(broke);
  });
  it('CC-CARD-millrace: swaps the whole hand, plus one, and gains Spark', () => {
    const t = new Table(['millrace', 'scrap', 'notebook'], { deck: ['cog', 'dynamo', 'blueprint'] });
    t.play('millrace');
    expect(t.hand()).toEqual(['cog', 'dynamo', 'blueprint']);
    expect(t.discard()).toEqual(expect.arrayContaining(['scrap', 'notebook']));
    expect(t.spark()).toBe(1);
  });
  it('CC-CARD-slag_furnace: Spark only for trashing two', () => {
    const a = new Table(['slag_furnace', 'scrap', 'notebook']);
    a.play('slag_furnace');
    a.cards('scrap', 'notebook');
    expect(a.trash().sort()).toEqual(['notebook', 'scrap']);
    expect(a.spark()).toBe(1);
    const b = new Table(['slag_furnace', 'scrap', 'notebook']);
    b.play('slag_furnace');
    b.cards('scrap');
    expect(b.spark()).toBe(0);
  });
  it('CC-CARD-spark_exchange: spend 2 for 3 Coins, or discard 2 for 2 Spark', () => {
    const a = new Table(['spark_exchange'], { spark: 3 });
    a.play('spark_exchange');
    expect(a.buys).toBe(2);
    a.opt('+3 Coins');
    expect([a.spark(), a.coins]).toEqual([1, 3]);
    const b = new Table(['spark_exchange', 'scrap', 'notebook', 'cog']);
    b.play('spark_exchange');
    b.opt('Discard 2');
    b.cards('scrap', 'notebook');
    expect(b.spark()).toBe(2);
    const short = new Table(['spark_exchange', 'scrap']);
    short.play('spark_exchange');
    short.opt('Discard 2');
    expect(short.spark()).toBe(0);
    const none = new Table(['spark_exchange'], { spark: 1 });
    none.play('spark_exchange');
    none.opt('+3 Coins');
    expect([none.spark(), none.coins]).toEqual([1, 0]);
  });
});

describe('Night Shift', () => {
  it('CC-CARD-picket_line: costs Spark only at 3 or more', () => {
    const t = new Table(['picket_line', 'picket_line']);
    t.setSpark(3, 1 - t.me);
    t.apply(t.me, { type: 'play', card: t.view().hand[0].id });
    expect(t.spark(1 - t.me)).toBe(2);
    expect(t.coins).toBe(1);
    t.s.turn.actions = 1;
    t.apply(t.me, { type: 'play', card: t.view().hand[0].id });
    expect(t.spark(1 - t.me)).toBe(2);
  });
  it('CC-CARD-corrosion_crew: spend Spark, or gain a Rust', () => {
    const a = new Table(['corrosion_crew']);
    a.setSpark(1, 1 - a.me);
    a.play('corrosion_crew');
    a.yes();
    expect(a.spark(1 - a.me)).toBe(0);
    expect(a.discard(1 - a.me)).not.toContain('rust');
    const b = new Table(['corrosion_crew']);
    b.setSpark(1, 1 - b.me);
    b.play('corrosion_crew');
    b.no();
    expect(b.discard(1 - b.me)).toContain('rust');
    const c = new Table(['corrosion_crew']);
    c.play('corrosion_crew');
    noAsk(c);
    expect(c.discard(1 - c.me)).toContain('rust');
    expect(c.coins).toBe(2);
  });
  it('CC-CARD-noise_complaint: only workshops running a Device are affected, and they choose how', () => {
    const quiet = new Table(['noise_complaint'], { others: [['scrap']] });
    quiet.play('noise_complaint');
    noAsk(quiet);
    const t = new Table(['noise_complaint', 'noise_complaint'], { others: [['scrap', 'notebook']] });
    t.mint(1 - t.me, 'lamplighter');
    const other = t.s.players[1 - t.me];
    other.play.push(other.hand.pop()!);
    t.setSpark(1, 1 - t.me);
    t.play('noise_complaint');
    t.opt('Lose 1 Influence');
    expect(t.spark(1 - t.me)).toBe(0);
    t.play('noise_complaint');
    t.cards('notebook');
    expect(t.discard(1 - t.me)).toContain('notebook');
  });
  it('CC-CARD-whistleblower: revealing costs the attacker Spark and the attack still lands', () => {
    const t = new Table(['picket_line'], { spark: 2, others: [['whistleblower']] });
    t.setSpark(3, 1 - t.me);
    t.play('picket_line');
    t.cards('whistleblower');
    expect(t.spark()).toBe(1);
    expect(t.spark(1 - t.me)).toBe(2);
    const own = new Table(['whistleblower']);
    own.play('whistleblower');
    expect([own.actions, own.coins]).toEqual([1, 1]);
  });
  it('CC-CARD-ground_wire: Spark when empty; reacting spends Spark to cancel, and needs Spark', () => {
    const own = new Table(['ground_wire', 'ground_wire']);
    own.play('ground_wire');
    expect(own.spark()).toBe(1);
    own.play('ground_wire');
    expect(own.spark()).toBe(1);
    const t = new Table(['picket_line'], { others: [['ground_wire']] });
    t.setSpark(3, 1 - t.me);
    t.play('picket_line');
    t.cards('ground_wire');
    expect(t.spark(1 - t.me)).toBe(2);
    noAsk(t);
    const broke = new Table(['corrosion_crew'], { others: [['ground_wire']] });
    broke.play('corrosion_crew');
    broke.cards('ground_wire');
    expect(broke.discard(1 - broke.me)).toContain('rust');
  });
  it('CC-CARD-redline_boiler: +3 Coins, +1 Buy, and a Rust', () => {
    const t = new Table(['redline_boiler']);
    t.play('redline_boiler');
    expect([t.coins, t.buys]).toEqual([3, 2]);
    expect(t.discard()).toContain('rust');
  });
  it('CC-CARD-pressure_test: pays by type and discards what it reveals', () => {
    const t = new Table(['pressure_test'], { deck: ['cog', 'glow_mason', 'blueprint'] });
    t.play('pressure_test');
    expect([t.coins, t.spark()]).toEqual([1, 1]);
    expect(t.discard().filter((k) => k === 'rust').length).toBe(1);
    expect(t.discard()).toEqual(expect.arrayContaining(['cog', 'glow_mason', 'blueprint']));
    expect(t.view().revealed).toEqual([]);
  });
  it('CC-CARD-overload_relay: spends everything, draws up to 5, and 4 or more leaves a Rust', () => {
    const a = new Table(['overload_relay'], { spark: 3, deck: ['scrap', 'scrap', 'scrap'] });
    a.play('overload_relay');
    expect([a.spark(), a.hand().length]).toEqual([0, 3]);
    expect(a.discard()).not.toContain('rust');
    const b = new Table(['overload_relay'], { spark: 7, deck: ['scrap', 'scrap', 'scrap', 'scrap', 'scrap', 'scrap'] });
    b.play('overload_relay');
    expect([b.spark(), b.hand().length]).toEqual([0, 5]);
    expect(b.discard()).toContain('rust');
  });
  it('CC-CARD-scrapyard_broker: +3 Coins for a Rust, +1 Coin otherwise', () => {
    const a = new Table(['scrapyard_broker', 'rust', 'scrap']);
    a.play('scrapyard_broker');
    expect(a.q.cards?.map((c) => c.key)).toEqual(['rust']);
    a.cards('rust');
    expect(a.coins).toBe(3);
    expect(a.trash()).toEqual(['rust']);
    const b = new Table(['scrapyard_broker', 'rust']);
    b.play('scrapyard_broker');
    b.cards();
    expect(b.coins).toBe(1);
    expect(b.hand()).toEqual(['rust']);
    const c = new Table(['scrapyard_broker', 'scrap']);
    c.play('scrapyard_broker');
    noAsk(c);
    expect(c.coins).toBe(1);
  });
});

describe('Town Hall', () => {
  const claimable = (t: Table) => t.view().legal.claim;
  it('CC-CARD-surveyor: Public Works cost 1 Coin less this turn, and stacks', () => {
    const t = new Table(['surveyor', 'surveyor'], { spark: 2 });
    t.play('surveyor');
    t.play('surveyor');
    expect([t.actions, t.buys]).toEqual([1, 3]);
    t.toMarket();
    t.s.turn.coins = 1;
    expect(claimable(t)).toContain('canal_lights');
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    expect(t.coins).toBe(0);
    t.end();
    t.end();
    t.s.turn.coins = 2;
    t.setSpark(2);
    t.toMarket();
    expect(claimable(t)).not.toContain('public_clock');
  });
  it('CC-CARD-zoning_board: raises one Work’s price for the others until your next turn', () => {
    const t = new Table(['zoning_board']);
    t.play('zoning_board');
    expect(t.spark()).toBe(1);
    expect(t.q.kind).toBe('option');
    t.opt('River Quay');
    expect(t.view().projects.find((p) => p.key === 'canal_lights')!.coins).toBe(3);
    expect(t.view(1 - t.me).projects.find((p) => p.key === 'canal_lights')!.coins).toBe(5);
    t.end();
    t.end();
    expect(t.view(1 - t.me).projects.find((p) => p.key === 'canal_lights')!.coins).toBe(3);
  });
  it('CC-CARD-ribbon_cutter: pays on your next Public Work this turn, once', () => {
    const t = new Table(['ribbon_cutter'], { spark: 4 });
    t.play('ribbon_cutter');
    expect([t.actions, t.coins]).toEqual([1, 1]);
    t.toMarket();
    t.s.turn.coins = 7;
    t.s.turn.buys = 2;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    // 4 − 2 for the Work + 1 from the Work + 2 from the ribbon; 2 − 1 + 1 Buys.
    expect(t.spark()).toBe(5);
    expect(t.buys).toBe(2);
    t.apply(t.me, { type: 'claim', project: 'public_clock' });
    expect(t.spark()).toBe(3);
    expect(t.buys).toBe(1);
  });
  it('CC-CARD-town_crier: draws; from hand, it pays when another player completes a Work', () => {
    const a = new Table(['town_crier'], { deck: ['cog'] });
    a.play('town_crier');
    expect(a.hand()).toEqual(['cog']);
    expect(a.actions).toBe(1);
    const b = new Table([], { spark: 2, others: [['town_crier']] });
    b.toMarket();
    b.s.turn.coins = 3;
    b.apply(b.me, { type: 'claim', project: 'canal_lights' });
    expect(b.asking).toBe(1 - b.me);
    b.yes();
    expect(b.spark(1 - b.me)).toBe(1);
    expect(b.hand(1 - b.me)).toContain('town_crier');
    expect(b.spark()).toBe(1);
    const own = new Table(['town_crier'], { spark: 2 });
    own.toMarket();
    own.s.turn.coins = 3;
    own.apply(own.me, { type: 'claim', project: 'canal_lights' });
    noAsk(own);
  });
  it('CC-CARD-civic_bond: 1 Prestige per Public Work completed by anyone', () => {
    const t = new Table(['civic_bond']);
    const seat = t.me;
    for (const z of t.s.players) {
      z.deck = [];
      z.discard = [];
    }
    t.s.projects[0].by = 1 - seat;
    t.s.projects[1].by = 1 - seat;
    t.s.supply.monument = [];
    t.end();
    expect(t.view(seat).final!.find((r) => r.seat === seat)!.total).toBe(2);
  });
  it('CC-CARD-city_charter: +3 Coins once you have a Work, +1 Coin before', () => {
    const a = new Table(['city_charter']);
    a.play('city_charter');
    expect([a.actions, a.buys, a.coins]).toEqual([1, 2, 1]);
    const b = new Table(['city_charter']);
    b.s.projects[0].by = b.me;
    b.play('city_charter');
    expect(b.coins).toBe(3);
    expect(worth('city_charter', 0)).toBe(2);
  });
  it('CC-CARD-patent_ledger: 1 Prestige per 2 Devices', () => {
    const t = new Table(['patent_ledger', 'flywheel', 'flywheel', 'lamplighter', 'lamplighter', 'gear_lease']);
    const seat = t.me;
    for (const z of t.s.players) {
      z.deck = [];
      z.discard = [];
    }
    t.s.supply.monument = [];
    t.end();
    expect(t.view(seat).final!.find((r) => r.seat === seat)!.total).toBe(2);
  });
  it('CC-CARD-plaque_foundry: up to twice, 2 Spark for 1 Prestige', () => {
    const t = new Table(['plaque_foundry'], { spark: 5 });
    t.play('plaque_foundry');
    t.yes();
    t.yes();
    expect(t.spark()).toBe(1);
    expect(t.view().players[t.me].vp).toBe(2);
    const once = new Table(['plaque_foundry'], { spark: 4 });
    once.play('plaque_foundry');
    once.no();
    once.yes();
    expect(once.spark()).toBe(2);
    expect(once.view().players[once.me].vp).toBe(1);
    const broke = new Table(['plaque_foundry'], { spark: 1 });
    broke.play('plaque_foundry');
    noAsk(broke);
  });
});
