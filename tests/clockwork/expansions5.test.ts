/** The five opt-in sets of edition 5 and the Crown Projects switch. Rules are in docs/CLOCKWORK.md under the same IDs. */
import { describe, expect, it } from 'vitest';
import type { DeckState } from '../../src/engine/deckbuilder';
import { GLORY } from '../../src/games/clockwork/rules/glory';
import { HOUSES } from '../../src/games/clockwork/rules/houses';
import { MASTERS } from '../../src/games/clockwork/rules/masters';
import { PORTS } from '../../src/games/clockwork/rules/ports';
import { REPUBLICS } from '../../src/games/clockwork/rules/republics';
import { RULES, RULES_V4 } from '../../src/games/clockwork/rules/ruleset';
import { botMove, PROFILES } from '../../src/games/clockwork/rules/bot';
import { assertConserved, game, MARKET, Table, WORKS } from './helpers';

const noAsk = (t: Table) => expect(t.s.pending).toBeNull();
const rival = (t: Table) => (t.me + 1) % t.s.n;
const SETS = ['core', 'crown', 'republics', 'houses', 'masters', 'ports', 'glory'];
const OFF = { crownProjects: false };
const PROJECT_CARDS = ['clock_garden', 'inventors_medal', 'surveyor', 'zoning_board', 'ribbon_cutter', 'town_crier', 'civic_bond', 'city_charter'];
/** Points gained directly, which the breakdown counts with fixed-value cards. */
const points = (t: Table, seat = t.me) => t.s.players[seat].vp ?? 0;
/** Lay cards on top of a discard pile, last listed on top. */
function discarded(t: Table, seat: number, ...keys: string[]) {
  for (const key of keys) {
    t.mint(seat, key);
    t.s.players[seat].discard.push(t.s.players[seat].hand.pop()!);
  }
}

describe('KC5-SET: the five sets', () => {
  const all = [
    ['republics', REPUBLICS, 14],
    ['houses', HOUSES, 13],
    ['masters', MASTERS, 15],
    ['ports', PORTS, 14],
    ['glory', GLORY, 13],
  ] as const;

  it('KC5-SET-1: 69 new cards in five sets, opt-in, after every existing card', () => {
    for (const [set, cards, n] of all) {
      expect(cards.length, set).toBe(n);
      for (const c of cards) {
        expect(c.set).toBe(set);
        expect(c.text.length, c.key).toBeGreaterThan(10);
        expect(c.effects?.length || c.vp || c.coins, c.key).toBeTruthy();
      }
    }
    const added = all.flatMap(([, cards]) => cards.map((c) => c.key));
    expect(new Set(added).size).toBe(69);
    expect(RULES.cards.length).toBe(RULES_V4.cards.length + 69);
    expect(RULES.cards.slice(0, RULES_V4.cards.length)).toEqual(RULES_V4.cards);
    for (const k of added) expect(RULES_V4.cards.some((c) => c.key === k), k).toBe(false);
    expect(RULES.defaultSets).toEqual(['core', 'crown']);
    expect(RULES.sets!.map((s) => s.key)).toEqual(expect.arrayContaining(['republics', 'houses', 'masters', 'ports', 'glory']));
  });

  it('KC5-SET-2: a game with all seven sets deals a legal market and plays to the end', () => {
    for (const n of [2, 4, 6]) {
      let s = game.setup({ playerCount: n, seed: `kc5-${n}`, config: { market: [], bans: [], sets: SETS } }) as DeckState;
      expect(s.rulesVersion).toBe(5);
      for (let i = 0; i < 4000 && !s.over; i++) {
        const seat = s.pending ? s.pending.seat : s.turn.seat;
        const move = botMove(game.project(s, seat) as never, PROFILES[i % PROFILES.length], seat);
        const r = game.apply(s, seat, move!.actions[0] as never);
        if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
        s = r.state;
      }
      expect(s.over).toBe(true);
      expect(new Set(s.players.map((p) => p.turns)).size).toBe(1);
      assertConserved(s);
    }
  }, 120_000);
});

describe('KC5-PRJ: Crown Projects switched off', () => {
  const setupOff = (n: number, seed = 'off') => game.setup({ playerCount: n, seed, config: { market: [], bans: [], sets: SETS, ...OFF } }) as DeckState;

  it('KC5-PRJ-1: no Projects, and the Project-linked cards never reach the market', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const s = setupOff(3, seed);
      expect(s.projects).toEqual([]);
      for (const k of PROJECT_CARDS) expect(s.market, seed).not.toContain(k);
      expect(s.market).toHaveLength(10);
    }
    const view = new Table([], { config: OFF }).view();
    expect(view.projects).toEqual([]);
    expect(view.projectsEnd).toBeNull();
    expect(view.legal.claim).toEqual([]);
  });

  it('KC5-PRJ-2: a chosen market or Project list that needs Projects is refused', () => {
    const base = { bans: [], sets: SETS, crownProjects: false };
    expect(game.validateConfig!({ ...base, market: [] } as never, 2)).toBeNull();
    expect(game.validateConfig!({ ...base, market: [...MARKET.slice(1), 'town_crier'] } as never, 2)).toMatch(/.+/);
    expect(game.validateConfig!({ ...base, market: [], projects: WORKS } as never, 2)).toBe('Projects are switched off.');
    expect(game.sanitizeConfig!({ market: [], bans: [], crownProjects: false })).toMatchObject({ config: { crownProjects: false } });
    expect(game.sanitizeConfig!({ market: [], bans: [], crownProjects: 'no' })).toHaveProperty('error');
  });

  it('KC5-PRJ-3: the game still ends on piles, with the round finished, and scores without Projects', () => {
    const t = new Table([], { players: 3, config: OFF });
    t.s.supply.monument = [t.s.supply.monument[0]];
    t.toMarket();
    t.s.turn.coins = 8;
    t.apply(t.me, { type: 'buy', pile: 'monument' });
    t.end();
    expect(t.s.over).toBe(false);
    expect(t.s.finalRound).toBeTruthy();
    while (!t.s.over) t.end();
    expect(new Set(t.s.players.map((p) => p.turns)).size).toBe(1);
    expect(t.view().score!.projects).toBe(0);
  });

  it('KC5-PRJ-4: bots play a whole game with Projects off at every player count', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      let s = setupOff(n, `bots-${n}`);
      for (let i = 0; i < 5000 && !s.over; i++) {
        const seat = s.pending ? s.pending.seat : s.turn.seat;
        const view = game.project(JSON.parse(JSON.stringify(s)), seat);
        const r = game.apply(s, seat, botMove(view as never, PROFILES[seat % PROFILES.length], seat)!.actions[0] as never);
        if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
        s = r.state;
      }
      expect(s.over, `${n} players`).toBe(true);
      expect(s.projects).toEqual([]);
    }
  }, 120_000);

  it('KC5-VER-1: edition 4 rooms keep their rules and still load as state version 5', () => {
    expect(game.rulesFor(4)).toBe(RULES_V4);
    const old = { ...new Table([]).s, rulesVersion: 4 };
    expect(game.migrate!(JSON.parse(JSON.stringify(old)), 4)).toEqual(old);
    expect(() => game.project(old, 0)).not.toThrow();
  });
});

describe('The Merchant Republics', () => {
  it('CC-REP-1 coin_clipper: trash a Bronze for +1 Coin and +1 Buy, or nothing', () => {
    const t = new Table(['coin_clipper', 'scrap', 'cog']);
    t.play('coin_clipper');
    expect(t.q.cards!.map((c) => c.key)).toEqual(['scrap']);
    t.cards('scrap');
    expect([t.actions, t.coins, t.buys, t.trash()]).toEqual([1, 1, 2, ['scrap']]);
    const none = new Table(['coin_clipper', 'cog']);
    none.play('coin_clipper');
    noAsk(none);
    expect(none.coins).toBe(0);
  });

  it('CC-REP-2 promissory_note: +1 Coin, +1 Buy, and may trash itself for +2 Coins', () => {
    const t = new Table(['promissory_note']);
    t.toMarket().apply(t.me, { type: 'play-treasures' }).yes();
    expect([t.coins, t.buys, t.trash()]).toEqual([3, 2, ['promissory_note']]);
    assertConserved(t.s);
    const kept = new Table(['promissory_note']);
    kept.toMarket().apply(kept.me, { type: 'play-treasures' }).no();
    expect([kept.coins, kept.inPlay()]).toEqual([1, ['promissory_note']]);
  });

  it('CC-REP-3 florin_table: discard a Currency for +2 Coins', () => {
    const t = new Table(['florin_table', 'scrap', 'notebook']);
    t.play('florin_table').cards('scrap');
    expect([t.actions, t.buys, t.coins, t.discard().at(-1)]).toEqual([1, 2, 2, 'scrap']);
  });

  it('CC-REP-4 fondaco: +2 Actions, draws 1 per Currency costing 3 or more, up to 2', () => {
    const t = new Table(['fondaco', 'cog', 'dynamo', 'cog', 'scrap'], { deck: ['notebook', 'notebook', 'notebook'] });
    t.play('fondaco');
    expect(t.actions).toBe(2);
    expect(t.hand().filter((k) => k === 'notebook')).toHaveLength(2);
    expect(t.deck().at(-1)).toBe('notebook');
    const poor = new Table(['fondaco', 'scrap'], { deck: ['notebook'] });
    poor.play('fondaco');
    expect(poor.hand()).toEqual(['scrap']);
  });

  it('CC-REP-5 underwriter: an opponent buying a card costing 6 or more offers a Silver; cheaper asks nothing', () => {
    const t = new Table([], { others: [['underwriter']] });
    t.toMarket();
    t.s.turn.coins = 9;
    t.s.turn.buys = 2;
    t.apply(t.me, { type: 'buy', pile: 'cog' });
    noAsk(t);
    t.apply(t.me, { type: 'buy', pile: 'dynamo' });
    expect(t.asking).toBe(rival(t));
    t.yes();
    expect(t.discard(rival(t))).toContain('cog');
    const own = new Table(['underwriter']);
    own.play('underwriter');
    expect([own.actions, own.coins]).toEqual([1, 1]);
  });

  it('CC-REP-5: at 6 players, each Underwriter holder is asked in turn and each gains a Silver', () => {
    const t = new Table([], { players: 6, others: [['underwriter'], [], ['underwriter'], [], ['underwriter']] });
    const silvers = t.s.supply.cog.length;
    t.toMarket();
    t.s.turn.coins = 6;
    t.apply(t.me, { type: 'buy', pile: 'dynamo' });
    const asked: number[] = [];
    while (t.s.pending) {
      asked.push(t.asking!);
      t.yes();
    }
    expect(asked).toEqual([1, 3, 5].map((i) => (t.me + i) % 6));
    expect(t.s.supply.cog.length).toBe(silvers - 3);
    assertConserved(t.s);
  });

  it('CC-REP-6 lending_house: a Currency on the deck pays +2 Coins', () => {
    const t = new Table(['lending_house', 'cog']);
    t.play('lending_house').cards('cog');
    expect([t.buys, t.coins, t.deck().at(-1)]).toEqual([2, 3, 'cog']);
  });

  it('CC-REP-7 wholesaler: Currency costs 1 less this turn, not below 0', () => {
    const t = new Table(['wholesaler']);
    t.play('wholesaler');
    const cost = (k: string) => t.view().supply.find((p) => p.key === k)!.cost;
    expect([cost('cog'), cost('dynamo'), cost('scrap'), cost('notebook')]).toEqual([2, 5, 0, 2]);
    expect([t.actions, t.buys]).toEqual([1, 2]);
  });

  it('CC-REP-8 bookkeeper: the Currency among the top 4 goes to hand, the rest is discarded', () => {
    const t = new Table(['bookkeeper'], { deck: ['cog', 'notebook', 'scrap', 'conveyor', 'dynamo'] });
    t.play('bookkeeper');
    expect(t.hand().sort()).toEqual(['cog', 'scrap']);
    expect(t.discard().slice(-2).sort()).toEqual(['conveyor', 'notebook']);
    expect(t.deck().at(-1)).toBe('dynamo');
  });

  it('CC-REP-9 partnership: the opponent picks the deal', () => {
    const t = new Table(['partnership']);
    t.play('partnership');
    expect(t.asking).toBe(rival(t));
    t.opt('they get +3 Coins');
    expect([t.coins, t.buys]).toEqual([3, 2]);
    expect(t.discard(rival(t))).toContain('cog');
    const other = new Table(['partnership']);
    other.play('partnership').opt('They gain a Silver');
    expect(other.coins).toBe(1);
    expect(other.discard()).toContain('cog');
  });

  it('CC-REP-10 gilder: a Currency costing up to 4 to hand', () => {
    const t = new Table(['gilder']);
    t.play('gilder');
    expect(t.q.piles).toContain('cog');
    expect(t.q.piles).not.toContain('dynamo');
    expect(t.q.piles).not.toContain('notebook');
    t.pile('cog');
    expect(t.hand()).toEqual(['cog']);
  });

  it('CC-REP-11 ledger_hall: 1 Renown per 3 Currency other than Bronze, so Bronze never inflates it', () => {
    const t = new Table(['ledger_hall', 'cog', 'cog', 'dynamo', 'scrap', 'scrap', 'scrap']);
    const before = t.view().score!.conditional;
    for (let i = 0; i < 9; i++) t.mint(t.me, 'scrap');
    expect(t.view().score!.conditional).toBe(before);
    t.mint(t.me, 'cog');
    t.mint(t.me, 'cog');
    t.mint(t.me, 'cog');
    expect(t.view().score!.conditional).toBe(before + 1);
  });

  it('CC-REP-12 compound_interest: next turn, +1 Coin per 2 Currency in hand, rounded up', () => {
    const t = new Table(['compound_interest']);
    t.play('compound_interest');
    expect(t.buys).toBe(2);
    t.round();
    const currency = t.hand().filter((k) => k === 'scrap' || k === 'cog').length;
    expect(t.coins).toBe(Math.ceil(currency / 2));
  });

  it('CC-REP-13 bourse: may spend 2 Influence for a Silver to hand, only when it can', () => {
    const t = new Table(['bourse'], { spark: 2 });
    t.play('bourse').yes();
    expect([t.coins, t.buys, t.spark(), t.hand()]).toEqual([2, 2, 0, ['cog']]);
    const poor = new Table(['bourse'], { spark: 1 });
    poor.play('bourse');
    noAsk(poor);
    const sold = new Table(['bourse'], { spark: 2 });
    sold.s.supply.cog = [];
    sold.play('bourse');
    noAsk(sold);
  });

  it('CC-REP-14 gold_florin: +2 Coins, or +4 and +1 Buy with no Action played', () => {
    const t = new Table(['gold_florin']);
    t.toMarket().apply(t.me, { type: 'play-treasures' });
    expect([t.coins, t.buys]).toEqual([4, 2]);
    const busy = new Table(['coin_clipper', 'gold_florin']);
    busy.play('coin_clipper');
    busy.toMarket().apply(busy.me, { type: 'play-treasures' });
    expect([busy.coins, busy.buys]).toEqual([2, 1]);
  });
});

describe('Houses of Influence', () => {
  it('CC-HOU-1 household_guard: reveals against an attack to draw 1 and put one back', () => {
    const t = new Table(['hollow_title'], { others: [['household_guard', 'scrap']] });
    t.stack(rival(t), ['cog']);
    t.play('hollow_title');
    expect(t.q.kind).toBe('react');
    t.cards('household_guard');
    t.cards('scrap');
    expect(t.hand(rival(t)).sort()).toEqual(['cog', 'household_guard']);
    const own = new Table(['household_guard']);
    own.play('household_guard');
    expect([own.actions, own.coins]).toEqual([1, 1]);
  });

  it('CC-HOU-2 antechamber: may spend 1 Influence to draw 1 more', () => {
    const t = new Table(['antechamber'], { spark: 1, deck: ['scrap', 'cog'] });
    t.play('antechamber').yes();
    expect([t.actions, t.spark(), t.hand()]).toEqual([2, 0, ['scrap', 'cog']]);
    const poor = new Table(['antechamber'], { deck: ['scrap'] });
    poor.play('antechamber');
    noAsk(poor);
  });

  it('CC-HOU-3 bribed_magistrate: 2 Influence makes each opponent with 5+ cards discard', () => {
    const t = new Table(['bribed_magistrate'], { spark: 2, players: 3, others: [['scrap', 'scrap', 'scrap', 'scrap', 'cog'], ['scrap', 'scrap']] });
    t.play('bribed_magistrate').yes();
    expect(t.asking).toBe(rival(t));
    t.cards('cog');
    noAsk(t);
    expect(t.discard(rival(t))).toContain('cog');
    expect(t.spark()).toBe(0);
    const poor = new Table(['bribed_magistrate'], { spark: 1 });
    poor.play('bribed_magistrate');
    noAsk(poor);
    expect([poor.actions, poor.coins]).toEqual([1, 1]);
  });

  it('CC-HOU-4 counter_intrigue: the attacker discards the top of their deck', () => {
    const t = new Table(['hollow_title'], { deck: ['dynamo'], others: [['counter_intrigue']] });
    t.play('hollow_title').cards('counter_intrigue');
    expect(t.discard()).toContain('dynamo');
    const own = new Table(['counter_intrigue']);
    own.play('counter_intrigue');
    expect(own.coins).toBe(2);
  });

  it('CC-HOU-5 whispered_promise: +1 Influence now, and may spend 2 next turn to draw 2', () => {
    const t = new Table(['whispered_promise'], { spark: 1 });
    t.play('whispered_promise');
    expect(t.spark()).toBe(2);
    t.round();
    const hand = t.hand().length;
    t.yes();
    expect([t.spark(), t.hand().length]).toEqual([0, hand + 2]);
  });

  it('CC-HOU-6 signoria: the opponent chooses your reward', () => {
    const t = new Table(['signoria'], { deck: ['scrap', 'scrap', 'scrap'] });
    t.play('signoria');
    expect(t.asking).toBe(rival(t));
    t.opt('draw 3');
    expect(t.hand()).toHaveLength(3);
    const other = new Table(['signoria']);
    other.play('signoria').opt('2 Influence');
    expect([other.spark(), other.buys, other.coins]).toEqual([2, 2, 1]);
  });

  it('CC-HOU-7 hollow_title: one opponent gains a Homestead onto their deck; reactions come first', () => {
    const t = new Table(['hollow_title'], { players: 3 });
    t.play('hollow_title');
    expect(t.coins).toBe(2);
    const target = (t.me + 2) % 3;
    t.player(target);
    expect(t.deck(target).at(-1)).toBe('notebook');
    expect(t.deck(rival(t)).at(-1)).not.toBe('notebook');
    const guarded = new Table(['hollow_title'], { others: [['royal_advocate']] });
    guarded.play('hollow_title').cards('royal_advocate');
    expect(guarded.s.supply.notebook.length).toBe(new Table([]).s.supply.notebook.length);
  });

  it('CC-HOU-8 purchased_office: 3 Influence buys a card costing up to 4 to hand', () => {
    const t = new Table(['purchased_office'], { spark: 3 });
    t.play('purchased_office').yes();
    expect(t.q.piles).toContain('cog');
    expect(t.q.piles).not.toContain('rust');
    t.pile('cog');
    expect([t.spark(), t.hand(), t.actions]).toEqual([0, ['cog'], 1]);
  });

  it('CC-HOU-9 court_purge: trash up to 2, then each opponent may trash 1', () => {
    const t = new Table(['court_purge', 'scrap', 'rust'], { others: [['rust', 'cog']] });
    t.play('court_purge').cards('scrap', 'rust');
    expect(t.asking).toBe(rival(t));
    t.cards('rust');
    expect(t.trash().sort()).toEqual(['rust', 'rust', 'scrap']);
    assertConserved(t.s);
  });

  it('CC-HOU-10 family_crest: worth 2, and gaining it gives an opponent 1 Influence', () => {
    const t = new Table([]);
    t.toMarket();
    t.s.turn.coins = 4;
    t.s.supply.family_crest = [];
    t.mint(t.me, 'family_crest');
    t.s.supply.family_crest.push(t.s.players[t.me].hand.pop()!);
    t.apply(t.me, { type: 'buy', pile: 'family_crest' });
    expect(t.spark(rival(t))).toBe(1);
    expect(t.view().score!.special).toBeGreaterThanOrEqual(2);
  });

  it('CC-HOU-11 marriage_pact: you and an opponent each draw 1; worth 2', () => {
    const t = new Table(['marriage_pact']);
    const theirs = t.hand(rival(t)).length;
    t.play('marriage_pact');
    expect([t.actions, t.hand().length, t.hand(rival(t)).length]).toEqual([1, 1, theirs + 1]);
  });

  it('CC-HOU-12 majordomo: two different choices', () => {
    const t = new Table(['majordomo']);
    t.play('majordomo').opt('+2 Coins');
    expect(t.q.options).not.toContain('+2 Coins');
    t.opt('Influence');
    expect([t.coins, t.spark()]).toEqual([2, 1]);
  });

  it('CC-HOU-13 palace_intrigue: draw 3, +1 Action, an opponent gains 2 Influence up to the cap', () => {
    const t = new Table(['palace_intrigue']);
    t.setSpark(7, rival(t));
    t.play('palace_intrigue');
    expect([t.hand().length, t.actions, t.spark(rival(t))]).toEqual([3, 1, 8]);
  });
});

describe('Masters & Apprentices', () => {
  it('CC-MAS-1 sweeper: trash, discard or put back the top card', () => {
    const t = new Table(['sweeper'], { deck: ['rust'] });
    t.play('sweeper').opt('Trash');
    expect(t.trash()).toEqual(['rust']);
    const empty = new Table(['sweeper']);
    empty.deckIs(empty.me, []);
    empty.s.players[empty.me].discard = [];
    empty.play('sweeper');
    noAsk(empty);
  });

  it('CC-MAS-2 sketchbook: discarding an Action gives +1 Action', () => {
    const t = new Table(['sketchbook', 'conveyor'], { deck: ['scrap'] });
    t.play('sketchbook').cards('conveyor');
    expect(t.actions).toBe(2);
    const plain = new Table(['sketchbook'], { deck: ['scrap'] });
    plain.play('sketchbook');
    expect(plain.actions).toBe(1);
  });

  it('CC-MAS-3 bottega: +1 Coin as the third Action of the turn', () => {
    const t = new Table(['bottega', 'bottega', 'bottega'], { deck: ['scrap', 'scrap', 'scrap'] });
    t.play('bottega').play('bottega');
    expect(t.coins).toBe(0);
    t.play('bottega');
    expect(t.coins).toBe(1);
  });

  it('CC-MAS-4 guild_diploma: +1 Action, may trash, worth 1', () => {
    const t = new Table(['guild_diploma', 'rust']);
    t.play('guild_diploma').cards('rust');
    expect([t.actions, t.trash()]).toEqual([1, ['rust']]);
  });

  it('CC-MAS-5 woodcarver: an Action goes on the deck, anything else to the discard', () => {
    const t = new Table(['woodcarver'], { market: [...MARKET.slice(0, 9), 'sweeper'] });
    t.play('woodcarver').pile('sweeper');
    expect(t.deck().at(-1)).toBe('sweeper');
    const plain = new Table(['woodcarver']);
    plain.play('woodcarver');
    expect(plain.q.piles).not.toContain('rust');
    plain.pile('notebook');
    expect(plain.discard().at(-1)).toBe('notebook');
  });

  it('CC-MAS-6 promotion: an Action becomes one costing up to 2 more, to hand', () => {
    const t = new Table(['promotion', 'sweeper'], { market: [...MARKET.slice(0, 8), 'sweeper', 'bottega'] });
    t.play('promotion').cards('sweeper');
    expect(t.q.piles).toContain('bottega');
    expect(t.q.piles).not.toContain('cog');
    t.pile('bottega');
    expect(t.hand()).toEqual(['bottega']);
  });

  it('CC-MAS-7 masters_hand: plays an Action twice, but at most +1 Influence comes of it', () => {
    const t = new Table(['masters_hand', 'whispered_promise'], { spark: 2 });
    t.play('masters_hand').cards('whispered_promise');
    expect(t.spark()).toBe(3);
    const majordomo = new Table(['masters_hand', 'antechamber'], { spark: 3, deck: ['scrap', 'scrap', 'scrap', 'scrap'] });
    majordomo.play('masters_hand').cards('antechamber').yes().yes();
    expect(majordomo.spark()).toBe(1); // Spending is never refunded.
    const declined = new Table(['masters_hand'], { deck: ['scrap'] });
    declined.play('masters_hand');
    expect([declined.actions, declined.hand()]).toEqual([1, ['scrap']]);
  });

  it('CC-MAS-8 open_studio: draw 2, +1 Action, an opponent draws 1', () => {
    const t = new Table(['open_studio']);
    const theirs = t.hand(rival(t)).length;
    t.play('open_studio');
    expect([t.hand().length, t.actions, t.hand(rival(t)).length]).toEqual([2, 1, theirs + 1]);
  });

  it('CC-MAS-9 study_hall: Actions from the top 4 go to hand, privately; the rest back in any order', () => {
    const t = new Table(['study_hall'], { deck: ['sweeper', 'scrap', 'cog', 'bottega', 'dynamo'] });
    t.play('study_hall');
    expect(t.hand().sort()).toEqual(['bottega', 'sweeper']);
    const seen = JSON.stringify(t.view(rival(t)));
    expect(seen).not.toContain('sweeper');
    expect(seen).not.toContain('bottega');
    t.cards('scrap'); // The last card back goes on top without asking.
    expect(t.deck().slice(-2)).toEqual(['scrap', 'cog']);
    expect(t.deck().at(-3)).toBe('dynamo');
    assertConserved(t.s);
  });

  it('CC-MAS-10 patternmaker: copies an Action in play costing up to 5', () => {
    const t = new Table(['sweeper', 'patternmaker'], { market: [...MARKET.slice(0, 8), 'sweeper', 'patternmaker'], deck: ['scrap'] });
    t.play('sweeper').opt('Put it back').play('patternmaker');
    expect(t.q.piles!.sort()).toEqual(['patternmaker', 'sweeper']); // It is in play itself.
    t.pile('sweeper');
    expect(t.discard()).toContain('sweeper');
  });

  it('CC-MAS-11 atelier: a card becomes one costing exactly 2 more', () => {
    const t = new Table(['atelier', 'notebook']);
    t.play('atelier'); // The only card is trashed without asking.
    expect(t.q.piles).not.toContain('cog');
    expect(t.q.piles!.every((k) => t.view().supply.find((p) => p.key === k)!.cost === 4)).toBe(true);
  });

  it('CC-MAS-12 schoolroom: keep one of 2, the other back, then trash a card', () => {
    const t = new Table(['schoolroom', 'rust'], { deck: ['cog', 'scrap'] });
    t.play('schoolroom').cards('cog').cards('rust');
    expect(t.hand()).toEqual(['cog']);
    expect(t.deck().at(-1)).toBe('scrap');
    expect(t.trash()).toEqual(['rust']);
    expect(JSON.stringify(t.view(rival(t)).log)).not.toContain('cog');
  });

  it('CC-MAS-13 lecture_hall: draw 3, and an Action on the deck gives +1 Action', () => {
    const t = new Table(['lecture_hall'], { deck: ['sweeper', 'scrap', 'scrap'] });
    t.play('lecture_hall').cards('sweeper');
    expect([t.actions, t.deck().at(-1)]).toEqual([1, 'sweeper']);
  });

  it('CC-MAS-14 masters_fee: +1 Buy, +2 Coins, draws up to 4 in hand and stops when out of cards', () => {
    const t = new Table(['masters_fee', 'scrap']);
    t.play('masters_fee');
    expect([t.buys, t.coins, t.hand().length]).toEqual([2, 2, 4]);
    const dry = new Table(['masters_fee']);
    dry.deckIs(dry.me, ['scrap']);
    dry.s.players[dry.me].discard = [];
    dry.play('masters_fee');
    expect(dry.hand()).toEqual(['scrap']);
  });

  it('CC-MAS-15 maestro: draw 2, +1 Action, then may play an Action costing up to 5', () => {
    const t = new Table(['maestro', 'bottega'], { deck: ['scrap', 'scrap', 'scrap'] });
    t.play('maestro').cards('bottega');
    expect(t.inPlay()).toEqual(['maestro', 'bottega']);
    expect(t.actions).toBe(3);
  });
});

describe('Ports & Provinces', () => {
  it('CC-POR-1 harbour_pilot: discard one of the top 2, the other back; draw 1 next turn', () => {
    const t = new Table(['harbour_pilot'], { deck: ['rust', 'cog'] });
    t.play('harbour_pilot').cards('rust');
    expect([t.discard().at(-1), t.deck().at(-1), t.actions]).toEqual(['rust', 'cog', 1]);
    t.round();
    expect(t.hand().length).toBe(6);
    const one = new Table(['harbour_pilot']);
    one.deckIs(one.me, ['cog']);
    one.s.players[one.me].discard = [];
    one.play('harbour_pilot').cards();
    expect(one.deck()).toEqual(['cog']);
  });

  it('CC-POR-2 dockhand: a card from the discard goes on top of the deck, for all to see', () => {
    const t = new Table(['dockhand']);
    discarded(t, t.me, 'dynamo');
    t.play('dockhand').cards('dynamo');
    expect([t.buys, t.coins, t.deck().at(-1)]).toEqual([2, 1, 'dynamo']);
  });

  it('CC-POR-3 barter_post: trash for a different card of the same cost, to hand; nothing for Bronze', () => {
    const t = new Table(['barter_post', 'cog'], { market: [...MARKET.slice(0, 9), 'barter_post'] });
    t.play('barter_post').cards('cog');
    expect(t.q.piles).not.toContain('cog');
    expect(t.q.piles!.every((k) => t.view().supply.find((p) => p.key === k)!.cost === 3)).toBe(true);
    t.pile('barter_post');
    expect(t.hand()).toEqual(['barter_post']);
    const bronze = new Table(['barter_post', 'scrap']);
    bronze.play('barter_post').cards('scrap');
    noAsk(bronze);
    expect(bronze.trash()).toEqual(['scrap']);
  });

  it('CC-POR-4 quayside_sale: +1 Coin per card discarded, +1 more per Renown card', () => {
    const t = new Table(['quayside_sale', 'notebook', 'scrap']);
    t.play('quayside_sale').cards('notebook', 'scrap');
    expect(t.coins).toBe(3);
  });

  it('CC-POR-5 ferry_landing: draw 1, +1 Action, and +2 Actions next turn', () => {
    const t = new Table(['ferry_landing'], { deck: ['scrap'] });
    t.play('ferry_landing');
    expect([t.actions, t.hand()]).toEqual([1, ['scrap']]);
    t.round();
    expect(t.actions).toBe(3);
  });

  it('CC-POR-6 chandler: gain to hand; an Action gives +1 Action', () => {
    const t = new Table(['chandler'], { market: [...MARKET.slice(0, 9), 'sweeper'] });
    t.play('chandler').pile('sweeper');
    expect([t.hand(), t.actions]).toEqual([['sweeper'], 1]);
    const silver = new Table(['chandler']);
    silver.play('chandler').pile('cog');
    expect([silver.hand(), silver.actions]).toEqual([['cog'], 0]);
  });

  it('CC-POR-7 bonded_store: up to 2 Currency set aside privately, back in hand next turn with +1 Buy', () => {
    const t = new Table(['bonded_store', 'dynamo', 'cog', 'scrap']);
    t.play('bonded_store').cards('dynamo', 'cog');
    expect(t.coins).toBe(1);
    const theirs = t.view(rival(t)).players[t.me].mats.bonded;
    expect(theirs.count).toBe(2);
    expect(theirs.cards).toBeUndefined();
    expect(JSON.stringify([t.view(rival(t)).players, t.view(rival(t)).log])).not.toContain('dynamo');
    expect(t.view().players[t.me].mats.bonded.cards!.map((c) => c.key).sort()).toEqual(['cog', 'dynamo']);
    t.round();
    expect(t.hand()).toEqual(expect.arrayContaining(['dynamo', 'cog']));
    expect(t.buys).toBe(2);
    expect(t.s.players[t.me].mats.bonded ?? []).toEqual([]);
    assertConserved(t.s);
  });

  it('CC-POR-8 trade_agreement: an accepted trade draws 2 each; refused, you draw 1', () => {
    const t = new Table(['trade_agreement', 'rust'], { others: [['notebook']] });
    t.play('trade_agreement'); // The only card is discarded without asking.
    expect(t.asking).toBe(rival(t));
    t.cards('notebook');
    expect([t.hand().length, t.hand(rival(t)).length]).toEqual([2, 2]);
    const refused = new Table(['trade_agreement', 'rust'], { others: [['notebook']] });
    refused.play('trade_agreement').cards();
    expect([refused.hand().length, refused.hand(rival(refused))]).toEqual([1, ['notebook']]);
  });

  it('CC-POR-9 cargo_manifest: draw 1 plus 1 per Establishment in play, up to 4', () => {
    const t = new Table(['ferry_landing', 'ferry_landing', 'cargo_manifest'], { deck: ['scrap', 'scrap', 'scrap', 'scrap', 'scrap'] });
    t.play('ferry_landing').play('ferry_landing').play('cargo_manifest');
    expect(t.hand().length).toBe(2 + 3);
  });

  it('CC-POR-10 grain_hoy: one of the top 3 to hand, the rest back, +2 Coins next turn', () => {
    const t = new Table(['grain_hoy'], { deck: ['dynamo', 'scrap', 'rust'] });
    t.play('grain_hoy').cards('dynamo').cards('rust');
    expect(t.hand()).toEqual(['dynamo']);
    expect(t.deck().slice(-2)).toEqual(['rust', 'scrap']);
    t.round();
    expect(t.coins).toBe(2);
  });

  it('CC-POR-11 hiring_day: +1 Coin for each buy costing 2 or more this turn', () => {
    const t = new Table(['hiring_day']);
    t.play('hiring_day').toMarket();
    t.s.turn.coins = 5;
    t.apply(t.me, { type: 'buy', pile: 'cog' });
    expect(t.coins).toBe(3);
    t.apply(t.me, { type: 'buy', pile: 'scrap' });
    expect(t.coins).toBe(3);
  });

  it('CC-POR-12 customs_cutter: a revealed Currency costing 3+ is discarded, and you gain a Silver', () => {
    const t = new Table(['customs_cutter']);
    t.stack(rival(t), ['dynamo']);
    t.play('customs_cutter');
    expect(t.coins).toBe(2);
    expect(t.discard(rival(t))).toContain('dynamo');
    expect(t.discard()).toContain('cog');
    const miss = new Table(['customs_cutter']);
    miss.stack(rival(miss), ['scrap']);
    miss.play('customs_cutter');
    expect(miss.deck(rival(miss)).at(-1)).toBe('scrap');
    expect(miss.discard()).not.toContain('cog');
  });

  it('CC-POR-13 landing_rights: +1 Renown the first time you gain a Renown card this turn', () => {
    const t = new Table(['landing_rights']);
    t.play('landing_rights').toMarket();
    t.s.turn.coins = 4;
    t.apply(t.me, { type: 'buy', pile: 'notebook' }).apply(t.me, { type: 'buy', pile: 'notebook' });
    expect(points(t)).toBe(1);
  });

  it('CC-POR-14 galleass: draw 2 now, draw 2 and +1 Action next turn', () => {
    const t = new Table(['galleass']);
    t.play('galleass');
    expect(t.hand().length).toBe(2);
    t.round();
    expect([t.hand().length, t.actions]).toEqual([7, 2]);
  });
});

describe('Glory of the Realm', () => {
  it('CC-GLO-1 tenant_farmer: a Renown card discarded draws 2, otherwise +1 Coin', () => {
    const t = new Table(['tenant_farmer', 'notebook'], { deck: ['scrap', 'scrap'] });
    t.play('tenant_farmer').cards('notebook');
    expect(t.hand()).toEqual(['scrap', 'scrap']);
    const plain = new Table(['tenant_farmer', 'scrap']);
    plain.play('tenant_farmer');
    noAsk(plain);
    expect(plain.coins).toBe(1);
  });

  it('CC-GLO-2 manor_court: a Homestead revealed is +1 Renown and +1 Coin; otherwise draw 2', () => {
    const t = new Table(['manor_court', 'notebook']);
    t.play('manor_court');
    if (t.s.pending) t.cards('notebook');
    expect([points(t), t.coins, t.hand()]).toEqual([1, 1, ['notebook']]);
    const none = new Table(['manor_court'], { deck: ['scrap', 'scrap'] });
    none.play('manor_court');
    expect(none.hand()).toHaveLength(2);
  });

  it('CC-GLO-3 votive_offering: +1 Renown when trashed', () => {
    const t = new Table(['guild_diploma', 'votive_offering']);
    t.play('guild_diploma').cards('votive_offering');
    expect(points(t)).toBe(1);
  });

  it('CC-GLO-4 banner_bearer: +1 Coin with a Renown card in hand', () => {
    const t = new Table(['banner_bearer', 'notebook'], { deck: ['scrap'] });
    t.play('banner_bearer');
    expect([t.actions, t.coins]).toEqual([2, 1]);
  });

  it('CC-GLO-5 laurel_wreath: +1 Coin plus 1 per Renown card in hand, up to 3', () => {
    const t = new Table(['laurel_wreath', 'notebook', 'notebook', 'blueprint']);
    t.toMarket().apply(t.me, { type: 'play-treasures' });
    expect(t.coins).toBe(3);
  });

  it('CC-GLO-6 land_grant: +1 Buy, +2 Coins, gain a Homestead', () => {
    const t = new Table(['land_grant']);
    t.play('land_grant');
    expect([t.buys, t.coins, t.discard().at(-1)]).toEqual([2, 2, 'notebook']);
  });

  it('CC-GLO-7 grand_muster: draws 1 per Renown card revealed, up to 3', () => {
    const t = new Table(['grand_muster', 'notebook', 'notebook', 'notebook', 'notebook'], { deck: ['scrap', 'scrap', 'scrap', 'scrap'] });
    t.play('grand_muster');
    expect(t.hand().filter((k) => k === 'scrap')).toHaveLength(3);
  });

  it('CC-GLO-8 memorial_statue: gaining it pays 1 per pile with 2 or fewer left, up to 3', () => {
    const t = new Table([]);
    t.s.supply.cog = t.s.supply.cog.slice(0, 2);
    t.s.supply.dynamo = [];
    t.s.supply.memorial_statue = [];
    t.mint(t.me, 'memorial_statue');
    t.s.supply.memorial_statue.push(t.s.players[t.me].hand.pop()!);
    t.toMarket();
    t.s.turn.coins = 4;
    t.apply(t.me, { type: 'buy', pile: 'memorial_statue' });
    expect(points(t)).toBe(3); // Silver, Gold and its own now-empty pile.
  });

  it('CC-GLO-9 point_of_honour: a Renown card goes on the deck, or the hand is revealed', () => {
    const t = new Table(['point_of_honour'], { others: [['notebook', 'scrap']] });
    t.play('point_of_honour'); // The only Renown card goes without asking.
    expect(t.deck(rival(t)).at(-1)).toBe('notebook');
    const none = new Table(['point_of_honour'], { others: [['scrap']] });
    none.play('point_of_honour');
    noAsk(none);
    expect(none.coins).toBe(2);
  });

  it('CC-GLO-10 honour_guard: another player gaining a Grand Duchy may give you a Homestead', () => {
    const t = new Table([], { others: [['honour_guard']] });
    t.toMarket();
    t.s.turn.coins = 8;
    t.apply(t.me, { type: 'buy', pile: 'monument' });
    expect(t.asking).toBe(rival(t));
    t.yes();
    expect(t.discard(rival(t))).toContain('notebook');
  });

  it('CC-GLO-11 victory_parade: Homesteads and Noble Estates cost 1 less, the Grand Duchy does not', () => {
    const t = new Table(['victory_parade']);
    t.play('victory_parade');
    const cost = (k: string) => t.view().supply.find((p) => p.key === k)!.cost;
    expect([cost('notebook'), cost('blueprint'), cost('monument')]).toEqual([1, 4, 8]);
  });

  it('CC-GLO-12 chivalric_order: 1 per 3 Renown cards owned, itself included', () => {
    const t = new Table(['chivalric_order', 'notebook', 'notebook']);
    const owned = [...t.hand(), ...t.deck(), ...t.discard()].filter((k) => ['notebook', 'blueprint', 'monument', 'chivalric_order'].includes(k)).length;
    expect(t.view().score!.conditional).toBe(Math.floor(owned / 3));
  });

  it('CC-GLO-13 royal_jubilee: the bonus starts at half the Grand Duchy pile, by player count', () => {
    for (const n of [2, 3, 6]) {
      const t = new Table(['royal_jubilee'], { players: n });
      const start = t.s.supply.monument.length;
      t.s.supply.monument = t.s.supply.monument.slice(0, Math.floor(start / 2) + 1);
      t.play('royal_jubilee');
      expect([t.buys, points(t)], `${n} players above half`).toEqual([2, 0]);
      const half = new Table(['royal_jubilee'], { players: n });
      half.s.supply.monument = half.s.supply.monument.slice(0, Math.floor(start / 2));
      half.play('royal_jubilee');
      expect([half.buys, half.coins, points(half)], `${n} players at half`).toEqual([3, 3, 1]);
    }
  });
});
