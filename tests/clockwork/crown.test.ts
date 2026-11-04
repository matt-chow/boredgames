/** Every card and Crown Project in the Crown Decrees set. Rules are in docs/CLOCKWORK.md under the same IDs. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CROWN } from '../../src/games/clockwork/rules/crown';
import { RULES } from '../../src/games/clockwork/rules/ruleset';
import { STYLES } from '../../src/games/clockwork/rules/bot';
import { assertConserved, MARKET, Table } from './helpers';

const noAsk = (t: Table) => expect(t.s.pending).toBeNull();
const rival = (t: Table) => (t.me + 1) % t.s.n;
/** Put a card straight into a discard pile. */
function discarded(t: Table, seat: number, key: string) {
  t.mint(seat, key);
  t.s.players[seat].discard.push(t.s.players[seat].hand.pop()!);
}

describe('Crown Decrees: trashing and exchange', () => {
  it('CC-CARD-royal_confessor: trash up to 3, with 1 Influence per Renown card', () => {
    const t = new Table(['royal_confessor', 'notebook', 'blueprint', 'scrap']);
    t.play('royal_confessor').cards('notebook', 'blueprint', 'scrap');
    expect(t.trash().sort()).toEqual(['blueprint', 'notebook', 'scrap']);
    expect(t.spark()).toBe(2);
    assertConserved(t.s);
    const none = new Table(['royal_confessor', 'notebook']);
    none.play('royal_confessor').cards();
    expect(none.trash()).toEqual([]);
    expect(none.spark()).toBe(0);
    const empty = new Table(['royal_confessor']);
    empty.play('royal_confessor');
    noAsk(empty);
  });

  it('CC-CARD-mintmaster: a Currency becomes one costing up to 3 more, on top of the deck', () => {
    const t = new Table(['mintmaster', 'cog', 'notebook']);
    t.play('mintmaster');
    expect(t.q.cards!.map((c) => c.key)).toEqual(['cog']);
    t.cards('cog');
    expect(t.q.piles).toContain('dynamo');
    expect(t.q.piles).not.toContain('notebook');
    t.pile('dynamo');
    expect(t.trash()).toEqual(['cog']);
    expect(t.deck().at(-1)).toBe('dynamo');
    expect(t.spark()).toBe(1);
    const declined = new Table(['mintmaster', 'cog']);
    declined.play('mintmaster').cards();
    expect(declined.trash()).toEqual([]);
    expect(declined.spark()).toBe(0);
    const purse = new Table(['mintmaster', 'scrap']);
    purse.play('mintmaster').cards('scrap');
    expect(purse.q.piles).toContain('cog');
    expect(purse.q.piles).not.toContain('dynamo');
  });

  it('CC-CARD-estate_surveyor: +1 Coin, and a Renown card can rise by up to 3', () => {
    const t = new Table(['estate_surveyor', 'notebook']);
    t.play('estate_surveyor');
    expect(t.coins).toBe(1);
    t.cards('notebook');
    expect(t.q.piles).toContain('blueprint');
    expect(t.q.piles).not.toContain('monument');
    t.pile('blueprint');
    expect(t.discard()).toContain('blueprint');
    expect(t.trash()).toEqual(['notebook']);
    const deed = new Table(['estate_surveyor', 'blueprint']);
    deed.play('estate_surveyor').cards('blueprint');
    expect(deed.q.piles).toContain('monument');
  });

  it('CC-CARD-purification_house: a Renown card or Royal Debt draws 2, anything else draws 1', () => {
    for (const key of ['rust', 'notebook']) {
      const t = new Table(['purification_house', key], { deck: ['scrap', 'cog', 'dynamo'] });
      t.play('purification_house').cards(key);
      expect(t.hand()).toEqual(['scrap', 'cog']);
    }
    const other = new Table(['purification_house', 'scrap'], { deck: ['cog', 'dynamo'] });
    other.play('purification_house').cards('scrap');
    expect(other.hand()).toEqual(['cog']);
    const declined = new Table(['purification_house', 'scrap'], { deck: ['cog'] });
    declined.play('purification_house').cards();
    expect(declined.hand()).toEqual(['scrap']);
  });

  it('CC-CARD-salvage_office: cost 3 or more pays Coins and a Buy, cheaper pays Influence', () => {
    const big = new Table(['salvage_office', 'cog']);
    big.play('salvage_office');
    noAsk(big); // one card and it is mandatory
    expect([big.coins, big.buys, big.spark()]).toEqual([3, 2, 0]);
    const small = new Table(['salvage_office', 'scrap']);
    small.play('salvage_office');
    expect([small.coins, small.buys, small.spark()]).toEqual([0, 1, 2]);
    const empty = new Table(['salvage_office']);
    empty.play('salvage_office');
    noAsk(empty);
    expect([empty.coins, empty.spark()]).toEqual([0, 0]);
  });

  it('CC-CARD-reclamation_guild: each trash this turn pays 1 Coin, and the effect ends with the turn', () => {
    const t = new Table(['reclamation_guild', 'slag_furnace', 'scrap', 'scrap']);
    t.play('reclamation_guild');
    expect([t.actions, t.coins]).toEqual([1, 1]);
    t.play('slag_furnace').cards('scrap', 'scrap');
    expect(t.coins).toBe(3);
    t.end();
    expect(t.s.temps).toEqual([]);
  });

  it('CC-CARD-royal_tax_collector: +2 Coins, and a trashed Currency pays 1 Influence plus 1 per 3 of its cost', () => {
    const paid = (key: string) => {
      const t = new Table(['royal_tax_collector', key]);
      t.play('royal_tax_collector').cards(key);
      expect(t.coins).toBe(2);
      return t.spark();
    };
    expect([paid('scrap'), paid('cog'), paid('dynamo')]).toEqual([1, 2, 3]);
  });

  it('CC-CARD-royal_scrivener: a cantrip that may trash from the discard pile only', () => {
    const t = new Table(['royal_scrivener', 'scrap'], { deck: ['cog'] });
    t.s.players[t.me].discard = [];
    discarded(t, t.me, 'rust');
    t.play('royal_scrivener');
    expect(t.actions).toBe(1);
    expect(t.hand()).toEqual(['scrap', 'cog']);
    expect(t.q.cards!.map((c) => c.key)).toEqual(['rust']);
    t.cards('rust');
    expect(t.trash()).toEqual(['rust']);
    expect(t.discard()).toEqual([]);
    const empty = new Table(['royal_scrivener'], { deck: ['cog'] });
    empty.s.players[empty.me].discard = [];
    empty.play('royal_scrivener');
    noAsk(empty);
  });

  it('CC-CARD-noble_resettlement: a Renown card becomes an Action in hand, never a Royal Debt', () => {
    const t = new Table(['noble_resettlement', 'notebook']);
    t.play('noble_resettlement').cards('notebook');
    expect(t.q.piles).toContain('gearwright');
    expect(t.q.piles).not.toContain('rust');
    expect(t.q.piles).not.toContain('cog');
    t.pile('gearwright');
    expect(t.hand()).toEqual(['gearwright']);
    expect(t.actions).toBe(1);
    const declined = new Table(['noble_resettlement', 'notebook']);
    declined.play('noble_resettlement').cards();
    expect(declined.hand()).toEqual(['notebook']);
  });

  it('CC-CARD-burden_relief: trashes a cheap non-Currency for Coins, a Royal Debt for Influence too', () => {
    const debt = new Table(['burden_relief', 'rust']);
    debt.play('burden_relief').cards('rust');
    expect([debt.actions, debt.coins, debt.spark()]).toEqual([1, 2, 1]);
    const land = new Table(['burden_relief', 'notebook']);
    land.play('burden_relief').cards('notebook');
    expect([land.coins, land.spark()]).toEqual([2, 0]);
    const purse = new Table(['burden_relief', 'scrap', 'blueprint']);
    purse.play('burden_relief');
    noAsk(purse); // A Currency is out, and so is anything costing over 2.
    expect(purse.coins).toBe(0);
  });
});

describe('Crown Decrees: economy and Currency', () => {
  it('CC-CARD-treasury_auditor: +1 Coin per Currency costing 3 or more in hand, up to 3', () => {
    const t = new Table(['treasury_auditor', 'cog', 'dynamo', 'scrap']);
    t.play('treasury_auditor');
    expect([t.actions, t.coins]).toEqual([1, 2]);
    const full = new Table(['treasury_auditor', 'cog', 'cog', 'cog', 'cog']);
    full.play('treasury_auditor');
    expect(full.coins).toBe(3);
  });

  it('CC-CARD-spice_exchange: a Currency that also gains Influence', () => {
    const t = new Table(['spice_exchange']);
    t.toMarket().apply(t.me, { type: 'play-treasures' });
    expect([t.coins, t.spark()]).toEqual([2, 1]);
  });

  it('CC-CARD-trade_bonds: +1 Buy with 3 or more Currency in hand and in play, whatever order they are played in', () => {
    const t = new Table(['trade_bonds', 'scrap', 'scrap']);
    t.toMarket().apply(t.me, { type: 'play-treasures' });
    expect(t.coins).toBe(4);
    expect(t.buys).toBe(2);
    const last = new Table(['scrap', 'scrap', 'trade_bonds']);
    last.toMarket().apply(last.me, { type: 'play-treasures' });
    expect(last.buys).toBe(2);
    const short = new Table(['trade_bonds', 'scrap']);
    short.toMarket().apply(short.me, { type: 'play-treasures' });
    expect(short.buys).toBe(1);
  });

  it('CC-CARD-royal_mint: may spend 2 Influence for +3 Coins, asking only when it can', () => {
    const t = new Table(['royal_mint'], { spark: 2 });
    t.toMarket().apply(t.me, { type: 'play-treasures' }).yes();
    expect([t.coins, t.spark()]).toEqual([5, 0]);
    const kept = new Table(['royal_mint'], { spark: 2 });
    kept.toMarket().apply(kept.me, { type: 'play-treasures' }).no();
    expect([kept.coins, kept.spark()]).toEqual([2, 2]);
    const poor = new Table(['royal_mint'], { spark: 1 });
    poor.toMarket().apply(poor.me, { type: 'play-treasures' });
    noAsk(poor);
    expect(poor.coins).toBe(2);
  });

  it('CC-CARD-port_tariffs: stays out, then next turn gives +1 Buy and Influence on each Currency bought', () => {
    const t = new Table(['port_tariffs']);
    t.play('port_tariffs');
    expect(t.coins).toBe(1);
    t.round();
    expect(t.inPlay()).toContain('port_tariffs');
    expect(t.buys).toBe(2);
    t.toMarket();
    t.s.turn.coins = 3;
    t.s.players[t.me].tokens.spark = 0;
    t.apply(t.me, { type: 'buy', pile: 'cog' });
    expect(t.spark()).toBe(1);
    t.apply(t.me, { type: 'buy', pile: 'scrap' });
    expect(t.spark()).toBe(2);
    t.end();
    expect(t.discard().concat(t.hand(), t.deck())).toContain('port_tariffs');
  });

  it('CC-CARD-guild_auction: a gained card can go on the deck for 1 Influence', () => {
    const t = new Table(['guild_auction'], { spark: 1 });
    t.play('guild_auction');
    expect([t.buys, t.coins]).toEqual([2, 2]);
    t.toMarket().apply(t.me, { type: 'buy', pile: 'scrap' }).yes();
    expect(t.deck().at(-1)).toBe('scrap');
    expect(t.spark()).toBe(0);
    assertConserved(t.s);
    t.apply(t.me, { type: 'buy', pile: 'scrap' });
    noAsk(t); // Nothing left to spend.
    expect(t.discard()).toContain('scrap');
    const kept = new Table(['guild_auction'], { spark: 1 });
    kept.play('guild_auction').toMarket().apply(kept.me, { type: 'buy', pile: 'scrap' }).no();
    expect(kept.spark()).toBe(1);
  });
});

describe('Crown Decrees: drawing and chains', () => {
  it('CC-CARD-kingdom_courier: draw 2, +1 Action, discard 1', () => {
    const t = new Table(['kingdom_courier', 'rust'], { deck: ['scrap', 'cog'] });
    t.play('kingdom_courier');
    expect(t.actions).toBe(1);
    t.cards('rust');
    expect(t.hand()).toEqual(['scrap', 'cog']);
    expect(t.discard()).toContain('rust');
  });

  it('CC-CARD-hall_of_archives: finds the kind chosen, discards the rest, and stops at nothing', () => {
    const t = new Table(['hall_of_archives'], { deck: ['scrap', 'notebook', 'gearwright', 'cog'] });
    t.s.players[t.me].discard = [];
    t.play('hall_of_archives').opt('An Action');
    expect(t.hand()).toEqual(['gearwright']);
    expect(t.discard().sort()).toEqual(['notebook', 'scrap']);
    expect(t.deck().at(-1)).toBe('cog');
    const coin = new Table(['hall_of_archives'], { deck: ['notebook', 'cog'] });
    coin.play('hall_of_archives').opt('A Currency');
    expect(coin.hand()).toEqual(['cog']);
    const debt = new Table(['hall_of_archives'], { deck: ['rust', 'gearwright'] });
    debt.play('hall_of_archives').opt('An Action');
    expect(debt.hand()).toEqual(['gearwright']);
    expect(debt.discard()).toContain('rust');
    const dry = new Table(['hall_of_archives']);
    dry.deckIs(dry.me, ['scrap']);
    dry.s.players[dry.me].discard = [];
    dry.play('hall_of_archives').opt('An Action');
    noAsk(dry);
    expect(dry.hand()).toEqual([]);
    expect(dry.discard()).toEqual(['scrap']);
    const none = new Table(['hall_of_archives']);
    none.deckIs(none.me, []);
    none.s.players[none.me].discard = [];
    none.play('hall_of_archives').opt('A Currency');
    noAsk(none);
  });

  it('CC-CARD-great_council: +2 Actions, +1 Buy, +2 Coins, and every rival gains Influence, up to their cap', () => {
    const t = new Table(['great_council'], { players: 3 });
    t.setSpark(8, (t.me + 2) % 3);
    t.play('great_council');
    expect([t.actions, t.buys, t.coins]).toEqual([2, 2, 2]);
    expect(t.spark(rival(t))).toBe(1);
    expect(t.spark((t.me + 2) % 3)).toBe(8);
  });
});

describe('Crown Decrees: attacks and defences', () => {
  it('CC-CARD-edict_of_inspection: a rival with 5+ cards reveals 2, and the attacker picks the discard', () => {
    const t = new Table(['edict_of_inspection'], { others: [['scrap', 'cog', 'dynamo', 'notebook', 'rust']] });
    t.play('edict_of_inspection');
    expect([t.actions, t.coins]).toEqual([1, 1]);
    expect(t.asking).toBe(rival(t));
    t.cards('cog', 'dynamo');
    expect(t.asking).toBe(t.me);
    expect(t.q.cards!.map((c) => c.key).sort()).toEqual(['cog', 'dynamo']);
    t.cards('dynamo');
    expect(t.discard(rival(t))).toContain('dynamo');
    expect(t.hand(rival(t))).toEqual(['scrap', 'cog', 'notebook', 'rust']);
    const small = new Table(['edict_of_inspection'], { others: [['scrap', 'cog', 'dynamo', 'notebook']] });
    small.play('edict_of_inspection');
    noAsk(small);
  });

  it('CC-ATT-1: an Edict shows the attacker only the two chosen cards, and only after they are revealed', () => {
    const t = new Table(['edict_of_inspection'], { others: [['scrap', 'cog', 'dynamo', 'notebook', 'rust']] });
    t.play('edict_of_inspection');
    expect(t.view(t.me).pending?.cards ?? []).toEqual([]);
    expect(t.view(t.me).players[rival(t)].handCount).toBe(5);
    expect(t.view(t.me)).not.toHaveProperty('rivalHand');
    t.cards('cog', 'dynamo');
    expect(t.view(t.me).log.at(-1)).toMatchObject({ kind: 'reveal', seat: rival(t), keys: ['cog', 'dynamo'] });
    expect(t.view(t.me).pending!.cards!.length).toBe(2);
  });

  it('CC-CARD-tax_arrears: discard a Currency or take a Royal Debt, the rival’s choice', () => {
    const t = new Table(['tax_arrears'], { others: [['scrap', 'cog', 'notebook']] });
    t.play('tax_arrears');
    expect([t.coins, t.buys]).toEqual([1, 2]);
    expect(t.q.cards!.map((c) => c.key)).toEqual(['scrap', 'cog']);
    t.cards('cog');
    expect(t.discard(rival(t))).toContain('cog');
    expect(t.discard(rival(t))).not.toContain('rust');
    const taken = new Table(['tax_arrears'], { others: [['cog']] });
    taken.play('tax_arrears').cards();
    expect(taken.discard(rival(taken))).toContain('rust');
    const broke = new Table(['tax_arrears'], { others: [['notebook']] });
    broke.play('tax_arrears');
    noAsk(broke);
    expect(broke.discard(rival(broke))).toContain('rust');
    const soldOut = new Table(['tax_arrears'], { others: [['notebook']] });
    soldOut.s.supply.rust = [];
    soldOut.play('tax_arrears');
    noAsk(soldOut);
    expect(soldOut.discard(rival(soldOut))).not.toContain('rust');
  });

  it('CC-CARD-royal_advocate: +1 Buy +2 Coins, or goes to the deck bottom to cancel an attack', () => {
    const own = new Table(['royal_advocate']);
    own.play('royal_advocate');
    expect([own.buys, own.coins]).toEqual([2, 2]);
    const t = new Table(['tax_arrears'], { others: [['royal_advocate', 'notebook']] });
    t.play('tax_arrears');
    expect(t.q.kind).toBe('react');
    t.cards('royal_advocate');
    noAsk(t); // Used, it is out of hand and cannot be offered twice.
    expect(t.deck(rival(t))[0]).toBe('royal_advocate');
    expect(t.discard(rival(t))).not.toContain('rust');
    const declined = new Table(['tax_arrears'], { others: [['royal_advocate', 'notebook']] });
    declined.play('tax_arrears').cards();
    noAsk(declined);
    expect(declined.discard(rival(declined))).toContain('rust');
  });

  it('CC-CARD-court_saboteur: the attacker discards one of the top 2, the other goes back, and nothing is trashed', () => {
    const t = new Table(['court_saboteur']);
    t.stack(rival(t), ['cog', 'dynamo', 'notebook']);
    t.play('court_saboteur');
    expect(t.coins).toBe(2);
    expect(t.asking).toBe(t.me);
    t.cards('dynamo');
    expect(t.discard(rival(t))).toContain('dynamo');
    expect(t.deck(rival(t)).at(-1)).toBe('cog');
    expect(t.trash()).toEqual([]);
    assertConserved(t.s);
    const thin = new Table(['court_saboteur']);
    thin.deckIs(rival(thin), []);
    thin.s.players[rival(thin)].discard = [];
    thin.play('court_saboteur');
    noAsk(thin);
  });
});

describe('Crown Decrees: scoring and projects', () => {
  it('CC-CARD-noble_council: worth 1 per Homestead owned, so trashing them costs it', () => {
    const t = new Table(['noble_council', 'purification_house', 'notebook']);
    expect(t.view().score!.conditional).toBe(3 + 1);
    t.play('purification_house').cards('notebook');
    expect(t.view().score!.conditional).toBe(3);
  });

  it('CC-PW-merchants_guildhall: the reward may trash a card from hand', () => {
    const t = new Table(['rust'], { works: ['merchants_guildhall', 'common_fields', 'canal_lights', 'public_clock', 'makers_fair'], spark: 3 });
    t.toMarket();
    t.s.turn.coins = 5;
    t.apply(t.me, { type: 'claim', project: 'merchants_guildhall' }).cards('rust');
    expect(t.trash()).toEqual(['rust']);
    expect(t.view().score!.negative).toBe(0);
    expect(t.view().score!.projects).toBe(6);
  });
});

describe('Crown Decrees: the set', () => {
  it('KC3-CAT-1: the Standard game is 60 market cards, sorted into the planned groups with none left over', () => {
    const { note: _, ...groups } = JSON.parse(readFileSync('data/clockwork-commons/standard-categories.json', 'utf8')) as Record<string, string[]> & { note: string };
    const standard = RULES.cards.filter((c) => !c.basic && (c.set === 'core' || c.set === 'crown')).map((c) => c.key).sort();
    expect(Object.values(groups).flat().sort()).toEqual(standard);
    expect(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]))).toEqual({ draw: 16, economy: 12, trashing: 10, attack: 8, duration: 6, scoring: 8 });
  });

  it('KC3-SET-1: 24 distinct cards, each with a playstyle, rules text and a real effect', () => {
    expect(CROWN.length).toBe(24);
    expect(new Set(CROWN.map((c) => c.key)).size).toBe(24);
    expect(new Set(CROWN.map((c) => JSON.stringify([c.types, c.cost, c.coins, c.vp, c.effects]))).size).toBe(24);
    for (const c of CROWN) {
      expect(c.set).toBe('crown');
      expect(c.text.length, c.key).toBeGreaterThan(10);
      expect(STYLES[c.key]?.length, c.key).toBeGreaterThan(0);
      expect(c.effects?.length || c.vp, c.key).toBeTruthy();
    }
  });

  it('KC3-DEBT-1: the Royal Debt pile is 5 per rival, there only if something hands it out', () => {
    expect(new Table([], { players: 4 }).s.supply.rust.length).toBe(15);
    const quiet = MARKET.filter((k) => k !== 'corrosion_crew').concat('shift_bell');
    expect(new Table([], { market: quiet }).s.supply.rust).toBeUndefined();
    const makers = quiet.slice(1).concat('tax_arrears');
    expect(new Table([], { market: makers }).s.supply.rust.length).toBe(5);
  });
});
