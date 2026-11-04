import { describe, expect, it } from 'vitest';
import { decodeMarket, encodeMarket, validateRuleset } from '../../src/engine/deckbuilder';
import { RULES, WORKS as ALL_WORKS } from '../../src/games/clockwork/rules/ruleset';
import { ALL_SETS, game, MARKET, Table, WORKS } from './helpers';

const fresh = (playerCount: number, config: Record<string, unknown> = {}, seed = 'setup') => game.setup({ playerCount, seed, config: { market: [], bans: [], ...config } });

describe('setup', () => {
  it('CC-SETUP-1: the ruleset validates, and every player starts with 7 Scrap and 3 Notebooks', () => {
    expect(validateRuleset(RULES)).toEqual([]);
    const s = fresh(4);
    for (const p of s.players) {
      const keys = [...p.hand, ...p.deck].map((id) => s.cards[id]).sort();
      expect(keys).toEqual([...Array(3).fill('notebook'), ...Array(7).fill('scrap')]);
      expect(p.hand.length).toBe(5);
      expect(p.tokens.spark ?? 0).toBe(0);
    }
  });
  it('CC-SETUP-2: Prestige piles are 8, 12, 12, 15, 18 for 2 to 6 players', () => {
    expect([2, 3, 4, 5, 6].map((n) => fresh(n).supply.monument.length)).toEqual([8, 12, 12, 15, 18]);
    expect([2, 3, 4, 5, 6].map((n) => fresh(n).supply.blueprint.length)).toEqual([8, 12, 12, 15, 18]);
  });
  it('CC-SETUP-3: market piles hold 10, or 12 with 5 or 6 players; Currency is plentiful', () => {
    for (const [n, size] of [[2, 10], [4, 10], [5, 12], [6, 12]]) {
      const s = fresh(n);
      expect(s.market.length).toBe(10);
      expect(new Set(s.market).size).toBe(10);
      for (const k of s.market) if (k !== 'rust') expect(s.supply[k].length).toBe(size);
    }
    const s = fresh(2);
    expect([s.supply.scrap.length, s.supply.cog.length, s.supply.dynamo.length]).toEqual([60, 40, 30]);
  });
  it('CC-SETUP-4: 5 random Public Works are drawn; the Town Works only appear with that set on', () => {
    const s = fresh(3);
    expect(s.projects.length).toBe(5);
    expect(s.projects.every((p) => ALL_WORKS.find((w) => w.key === p.key)!.set === undefined)).toBe(true);
    expect(fresh(3, { sets: ['foundry'] }).projects.length).toBe(5);
    expect(new Set(s.projects.map((p) => p.key)).size).toBe(5);
    const other = fresh(3, {}, 'another-seed');
    expect(other.projects.map((p) => p.key)).not.toEqual(s.projects.map((p) => p.key));
  });
  it('CC-SETUP-5: random markets come only from the sets switched on', () => {
    const inSet = (k: string) => RULES.cards.find((c) => c.key === k)!.set;
    for (let i = 0; i < 20; i++) {
      expect(fresh(2, {}, `core-${i}`).market.every((k) => inSet(k) === 'core')).toBe(true);
      expect(fresh(2, { sets: ['foundry'] }, `foundry-${i}`).market.every((k) => inSet(k) === 'foundry')).toBe(true);
    }
    // Night Shift alone has too few cards for a market; the room says so rather than failing on start.
    expect(game.validateConfig!({ market: [], bans: [], sets: ['night'] }, 2)).toMatch(/piles/);
  });
  it('CC-SETUP-6: an optional set can be used together with the Core Set, and each random market is playable', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) for (const k of fresh(2, { sets: ALL_SETS }, `all-${i}`).market) seen.add(k);
    for (const set of ['foundry', 'night', 'town']) expect([...seen].some((k) => RULES.cards.find((c) => c.key === k)!.set === set)).toBe(true);
  });
  it('CC-SETUP-7: a chosen market and chosen Works are used exactly; bad choices are refused', () => {
    const s = fresh(2, { market: MARKET, projects: WORKS, sets: ALL_SETS });
    expect(s.market).toEqual(MARKET);
    expect(s.projects.map((p) => p.key)).toEqual(WORKS);
    expect(game.validateConfig!({ market: ['nonsense'], bans: [] }, 2)).toBeTruthy();
    expect(game.validateConfig!({ market: [], bans: [], projects: ['canal_lights'] }, 2)).toBeTruthy();
    expect(game.validateConfig!({ market: [], bans: [], sets: ['moon'] }, 2)).toBeTruthy();
  });
  it('CC-SETUP-8: a shared code restores the market and the Works', () => {
    const code = encodeMarket(RULES, MARKET, WORKS);
    expect(decodeMarket(RULES, code)).toEqual({ keys: [...MARKET].sort(), projects: [...WORKS].sort() });
    expect('error' in decodeMarket(RULES, 'not a code')).toBe(true);
  });
  it('CC-RUST-1: the Rust pile exists only when a card in the market can hand it out, and scales with the table', () => {
    const quiet = fresh(3, { market: ['gearwright', 'shift_bell', 'tally_clerk', 'supply_crane', 'copper_press', 'foreman', 'paper_fan', 'conveyor', 'sorting_glasses', 'springboard'] });
    expect(quiet.supply.rust).toBeUndefined();
    expect(new Table([], { players: 4 }).s.supply.rust.length).toBe(30);
  });
  it('CC-RUST-2: a Rust pile running out does not count towards the three empty piles', () => {
    const t = new Table([]);
    t.s.supply.rust = [];
    t.s.supply[MARKET[0]] = [];
    t.s.supply[MARKET[1]] = [];
    t.end();
    expect(t.s.over).toBe(false);
  });
});

describe('Spark', () => {
  it('CC-SPARK-1: Spark stops at 8 and the excess is lost', () => {
    const t = new Table(['glow_mason'], { spark: 7 });
    t.play('glow_mason');
    expect(t.spark()).toBe(8);
  });
  it('CC-SPARK-2: Spark carries over between turns, and Coins do not', () => {
    const t = new Table(['glow_mason']);
    t.play('glow_mason');
    t.round();
    expect([t.spark(), t.coins]).toEqual([2, 0]);
  });
  it('CC-SPARK-3: in the Market, up to 2 Spark a turn become 1 Coin each', () => {
    const t = new Table([], { spark: 5 });
    expect(t.view().legal.convert).toBe(false);
    expect(t.refused(t.me, { type: 'convert' })).toBe('illegal-convert');
    t.toMarket();
    t.apply(t.me, { type: 'convert' });
    t.apply(t.me, { type: 'convert' });
    expect([t.spark(), t.coins]).toEqual([3, 2]);
    expect(t.view().legal.convert).toBe(false);
    expect(t.refused(t.me, { type: 'convert' })).toBe('illegal-convert');
    t.round();
    t.toMarket();
    expect(t.view().legal.convert).toBe(true);
  });
  it('CC-SPARK-4: with no Spark nothing converts, and other players cannot convert on your turn', () => {
    const t = new Table([]);
    t.toMarket();
    expect(t.view().legal.convert).toBe(false);
    t.setSpark(1, 1 - t.me);
    expect(t.refused(1 - t.me, { type: 'convert' })).not.toBeNull();
  });
  it('CC-SPARK-5: Spark spent by a card or a Public Work does not use up the conversion limit', () => {
    const t = new Table(['steam_diverter'], { spark: 8 });
    t.play('steam_diverter');
    t.opt(3);
    t.toMarket();
    t.s.turn.coins = 3;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    expect(t.view().legal.convert).toBe(true);
    t.apply(t.me, { type: 'convert' });
    t.apply(t.me, { type: 'convert' });
    expect(t.spark()).toBe(2);
  });
  it('CC-SPARK-6: Spark cannot go below 0', () => {
    const t = new Table(['picket_line']);
    t.setSpark(0, 1 - t.me);
    t.play('picket_line');
    expect(t.spark(1 - t.me)).toBe(0);
  });
});

describe('Market phase', () => {
  it('CC-MARKET-1: Currency is played one at a time, or all together, and only in the Market', () => {
    const t = new Table(['scrap', 'cog', 'dynamo', 'notebook']);
    expect(t.view().legal.play).toEqual([]);
    t.toMarket();
    t.play('cog');
    expect(t.coins).toBe(2);
    t.apply(t.me, { type: 'play-treasures' });
    expect(t.coins).toBe(6);
    expect(t.hand()).toEqual(['notebook']);
  });
  it('CC-MARKET-2: Currency can still be played after a purchase (CC-I-2)', () => {
    const t = new Table(['scrap', 'scrap', 'cog']);
    t.s.turn.buys = 2;
    t.toMarket();
    t.play('cog');
    t.apply(t.me, { type: 'buy', pile: 'scrap' });
    t.play('scrap');
    t.apply(t.me, { type: 'buy', pile: 'scrap' });
    expect(t.coins).toBe(3);
    expect(t.buys).toBe(0);
  });
  it('CC-MARKET-3: purchases need a Buy and enough Coins, and go to the discard', () => {
    const t = new Table(['cog']);
    t.toMarket();
    expect(t.refused(t.me, { type: 'buy', pile: 'cog' })).not.toBeNull();
    t.apply(t.me, { type: 'play-treasures' });
    t.apply(t.me, { type: 'buy', pile: 'notebook' });
    expect(t.discard()).toContain('notebook');
    expect(t.refused(t.me, { type: 'buy', pile: 'scrap' })).not.toBeNull();
  });
  it('CC-MARKET-4: only 1 Action a turn unless a card gives more', () => {
    const t = new Table(['glow_mason', 'glow_mason']);
    t.play('glow_mason');
    expect(t.view().legal.play).toEqual([]);
    expect(t.actions).toBe(0);
  });
  it('CC-MARKET-5: a reshuffle uses only the discard, not hand or cards in play', () => {
    const t = new Table(['gearwright', 'notebook']);
    t.deckIs(t.me, []);
    t.s.players[t.me].discard = [];
    t.mint(t.me, 'cog');
    t.s.players[t.me].discard.push(t.s.players[t.me].hand.pop()!);
    t.play('gearwright');
    expect(t.hand().sort()).toEqual(['cog', 'notebook']);
    expect(t.inPlay()).toContain('gearwright');
  });
});

describe('Public Works', () => {
  const REWARDS: Record<string, { coins: number; spark: number; vp: number; check: (t: Table) => void; hand?: boolean }> = {
    canal_lights: { coins: 3, spark: 2, vp: 4, check: (t) => expect(t.spark()).toBe(1) },
    public_clock: { coins: 4, spark: 2, vp: 5, check: (t) => expect(t.hand()).toEqual(['cog']) },
    makers_fair: { coins: 4, spark: 3, vp: 6, check: (t) => expect(t.buys).toBe(1) },
    tram_extension: { coins: 5, spark: 3, vp: 7, check: (t) => expect(t.coins).toBe(1) },
    skybridge: { coins: 6, spark: 3, vp: 8, check: (t) => expect(t.spark()).toBe(1) },
    library_lanterns: { coins: 5, spark: 4, vp: 9, check: (t) => expect(t.hand()).toEqual(['cog', 'dynamo']) },
    waterwheel: { coins: 6, spark: 4, vp: 10, check: (t) => expect(t.coins).toBe(2) },
    city_illumination: { coins: 8, spark: 5, vp: 13, check: (t) => expect(t.spark()).toBe(2) },
    harbor_beacon: { coins: 4, spark: 1, vp: 3, check: (t) => { expect(t.hand()).toEqual(['cog']); expect(t.spark()).toBe(1); } },
    foundry_gate: { coins: 7, spark: 2, vp: 8, check: (t) => { expect(t.buys).toBe(1); expect(t.coins).toBe(1); } },
    power_exchange: { coins: 2, spark: 6, vp: 8, check: (t) => expect(t.coins).toBe(3) },
    rail_terminus: {
      coins: 6,
      spark: 2,
      vp: 7,
      check: (t) => {
        expect(t.q.piles).toContain('cog');
        expect(t.q.piles).not.toContain('blueprint');
        t.pile('cog');
        expect(t.hand()).toContain('cog');
      },
    },
    aqueduct: { coins: 5, spark: 5, vp: 10, check: (t) => expect(t.spark(1 - t.me)).toBe(1) },
  };

  for (const [key, w] of Object.entries(REWARDS)) {
    it(`CC-PW-${key}: costs ${w.coins} Coins and ${w.spark} Spark, gives its reward and ${w.vp} Prestige`, () => {
      const others = WORKS.filter((k) => k !== key).slice(0, 4);
      const t = new Table([], { works: [key, ...others], deck: ['cog', 'dynamo'] });
      const seat = t.me;
      t.toMarket();
      // One short of each price is refused.
      t.s.turn.coins = w.coins - 1;
      t.setSpark(w.spark);
      expect(t.refused(seat, { type: 'claim', project: key })).toBe('illegal-claim');
      t.s.turn.coins = w.coins;
      t.setSpark(w.spark - 1);
      expect(t.refused(seat, { type: 'claim', project: key })).toBe('illegal-claim');
      t.setSpark(w.spark);
      expect(t.view().legal.claim).toContain(key);
      t.apply(seat, { type: 'claim', project: key });
      w.check(t);
      expect(t.s.projects.find((p) => p.key === key)!.by).toBe(seat);
      expect(t.view().players[seat].vp).toBe(0);
      // The Prestige is counted at the end of the game.
      for (const z of t.s.players) {
        z.deck = [];
        z.discard = [];
        z.hand = [];
        z.play = [];
      }
      t.s.turn.seat = seat;
      t.s.supply.monument = [];
      if (t.s.pending) throw new Error('reward left a question open');
      t.end();
      expect(t.s.over).toBe(true);
      expect(t.view(seat).final!.find((r) => r.seat === seat)!.total).toBe(w.vp);
    });
  }

  it('CC-PW-RULE-1: a claim uses one Buy, and none left means none allowed', () => {
    const t = new Table([], { spark: 8 });
    t.toMarket();
    t.s.turn.coins = 20;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    expect(t.buys).toBe(0);
    expect(t.view().legal.claim).toEqual([]);
    expect(t.refused(t.me, { type: 'claim', project: 'public_clock' })).toBe('illegal-claim');
  });
  it('CC-PW-RULE-2: each Work can be claimed once in a game', () => {
    const t = new Table([], { spark: 8 });
    t.s.turn.buys = 3;
    t.toMarket();
    t.s.turn.coins = 20;
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    expect(t.refused(t.me, { type: 'claim', project: 'canal_lights' })).toBe('illegal-claim');
    t.end();
    t.setSpark(8, 1 - t.me);
    t.toMarket();
    t.s.turn.coins = 20;
    expect(t.refused(1 - t.me, { type: 'claim', project: 'canal_lights' })).toBe('illegal-claim');
  });
  it('CC-PW-RULE-3: only in your own Market phase, and not a Work outside this game', () => {
    const t = new Table([], { spark: 8 });
    t.s.turn.coins = 20;
    expect(t.refused(t.me, { type: 'claim', project: 'canal_lights' })).toBe('illegal-claim');
    t.toMarket();
    expect(t.refused(1 - t.me, { type: 'claim', project: 'canal_lights' })).not.toBeNull();
    expect(t.refused(t.me, { type: 'claim', project: 'city_illumination' })).toBe('bad-project');
  });
  it('CC-PW-RULE-4: a reward that draws Currency can be spent the same turn (CC-I-2)', () => {
    const t = new Table([], { spark: 2, deck: ['cog'] });
    t.s.turn.buys = 2;
    t.toMarket();
    t.s.turn.coins = 4;
    t.apply(t.me, { type: 'claim', project: 'public_clock' });
    expect(t.view().legal.play.length).toBe(1);
    t.apply(t.me, { type: 'play-treasures' });
    expect(t.coins).toBe(2);
  });
  it('CC-PW-RULE-5: conversions can pay for a Work', () => {
    const t = new Table(['scrap'], { spark: 4 });
    t.toMarket();
    t.apply(t.me, { type: 'play-treasures' });
    t.apply(t.me, { type: 'convert' });
    t.apply(t.me, { type: 'convert' });
    expect(t.view().legal.claim).toContain('canal_lights');
    t.apply(t.me, { type: 'claim', project: 'canal_lights' });
    expect(t.coins).toBe(0);
    expect(t.spark()).toBe(1);
  });
});

describe('ending the game', () => {
  const emptied = (t: Table, keys: string[]) => keys.forEach((k) => (t.s.supply[k] = []));
  it('CC-END-1: an empty Monument pile ends the game at the end of that turn', () => {
    const t = new Table([]);
    emptied(t, ['monument']);
    expect(t.s.over).toBe(false);
    t.end();
    expect(t.s.over).toBe(true);
  });
  it('CC-END-2: three empty market piles end a game of 2 to 4; basics do not count', () => {
    for (const players of [2, 3, 4]) {
      const a = new Table([], { players });
      emptied(a, MARKET.slice(0, 2).concat('cog', 'notebook'));
      a.end();
      expect(a.s.over).toBe(false);
      const b = new Table([], { players });
      emptied(b, MARKET.slice(0, 3));
      b.end();
      expect(b.s.over).toBe(true);
    }
  });
  it('CC-END-3: with 5 or 6 players it takes four', () => {
    for (const players of [5, 6]) {
      const a = new Table([], { players });
      emptied(a, MARKET.slice(0, 3));
      a.end();
      expect(a.s.over).toBe(false);
      const b = new Table([], { players });
      emptied(b, MARKET.slice(0, 4));
      b.end();
      expect(b.s.over).toBe(true);
    }
  });
  it('CC-END-4: the fourth Public Work ends the game at the end of that turn', () => {
    const t = new Table([], { spark: 8 });
    t.s.projects.slice(0, 3).forEach((p) => (p.by = 1 - t.me));
    t.toMarket();
    t.s.turn.coins = 20;
    t.apply(t.me, { type: 'claim', project: t.s.projects[3].key });
    expect(t.s.over).toBe(false);
    t.end();
    expect(t.s.over).toBe(true);
  });
  it('CC-END-5: the winner has the most card and Public Work Prestige; fewer turns breaks a tie; then it is shared', () => {
    const strip = (t: Table) => {
      for (const z of t.s.players) {
        z.deck = [];
        z.discard = [];
        z.hand = [];
        z.play = [];
      }
    };
    const a = new Table([]);
    strip(a);
    a.s.projects[0].by = a.me;
    a.s.supply.monument = [];
    a.end();
    expect(game.results!(a.s)!.find((r) => r.seat === a.me)!.winner).toBe(true);

    // Both on 0. The first player has had one more turn when the game ends on their turn.
    const b = new Table([]);
    strip(b);
    b.s.supply.monument = [];
    b.end();
    const res = game.results!(b.s)!;
    expect(res.find((r) => r.seat === b.me)!.winner).toBe(false);
    expect(res.find((r) => r.seat === 1 - b.me)!.winner).toBe(true);

    // Equal Prestige and equal turns is a shared win.
    const c = new Table([]);
    strip(c);
    c.end();
    strip(c);
    c.s.supply.monument = [];
    c.end();
    const shared = game.results!(c.s)!;
    expect(shared.every((r) => r.winner)).toBe(true);
  });
  it('CC-END-6: the final tally lists each scored Work', () => {
    const t = new Table([]);
    t.s.projects[0].by = t.me;
    t.s.supply.monument = [];
    t.end();
    const row = t.view().final!.find((r) => r.seat === t.me)!;
    expect(row.projects).toEqual([{ key: t.s.projects[0].key, vp: 4 }]);
  });
});

describe('attacks and reactions', () => {
  it('CC-REACT-1: the reaction window opens when the attack is played, before any of its effects (CC-I-3)', () => {
    const t = new Table(['inspection_team'], { others: [['night_watch', 'scrap', 'scrap', 'scrap', 'scrap']] });
    t.play('inspection_team');
    expect(t.q.kind).toBe('react');
    expect(t.coins).toBe(0);
    expect(t.hand(1 - t.me).length).toBe(5);
    t.cards();
    expect(t.coins).toBe(2);
  });
  it('CC-REACT-2: each copy reveals at most once per attack', () => {
    const t = new Table(['picket_line'], { others: [['city_messenger', 'city_messenger']] });
    t.play('picket_line');
    t.cards('city_messenger');
    expect(t.q.cards!.length).toBe(1);
    t.cards('city_messenger');
    expect(t.spark(1 - t.me)).toBe(2);
    expect(t.s.pending).toBeNull();
  });
  it('CC-REACT-3: declining a reaction leaves the attack to land', () => {
    const t = new Table(['picket_line'], { others: [['ground_wire']] });
    t.setSpark(3, 1 - t.me);
    t.play('picket_line');
    t.cards();
    expect(t.spark(1 - t.me)).toBe(2);
  });
  it('CC-REACT-4: Mutual Aid and Permit Office are not attacks, so reactions do not trigger', () => {
    const t = new Table(['permit_office'], { others: [['night_watch']] });
    t.play('permit_office');
    expect(t.q.kind).toBe('cards');
    expect(t.q.prompt).toMatch(/Licensing Hall/);
  });
  it('CC-REACT-5: in a larger game each opponent decides in turn order and one’s shield does not cover another', () => {
    const t = new Table(['picket_line'], { players: 3, others: [['ground_wire'], ['scrap']] });
    const [a, b] = [(t.me + 1) % 3, (t.me + 2) % 3];
    t.setSpark(3, a);
    t.setSpark(3, b);
    t.play('picket_line');
    expect(t.asking).toBe(a);
    t.cards('ground_wire');
    expect(t.spark(a)).toBe(2);
    expect(t.spark(b)).toBe(2);
  });
});

describe('undo safety', () => {
  it('CC-UNDO-1: drawing, attacking or converting past hidden information can’t be undone', () => {
    const pure = new Table(['glow_mason']);
    const r = game.apply(JSON.parse(JSON.stringify(pure.s)), pure.me, { type: 'play', card: pure.view().hand[0].id });
    expect(r.ok && r.undoable).toBe(true);
    const drawn = new Table(['gearwright', 'scrap']);
    const d = game.apply(JSON.parse(JSON.stringify(drawn.s)), drawn.me, { type: 'play', card: drawn.view().hand[0].id });
    expect(d.ok && d.undoable).toBe(false);
    const hit = new Table(['picket_line']);
    const h = game.apply(JSON.parse(JSON.stringify(hit.s)), hit.me, { type: 'play', card: hit.view().hand[0].id });
    expect(h.ok && h.undoable).toBe(false);
  });
});

describe('hidden information', () => {
  it('CC-PRIV-1: no view holds another hand or any deck order, through a look and a choice', () => {
    const t = new Table(['conveyor'], { players: 3, deck: ['cog', 'dynamo', 'notebook'] });
    t.play('conveyor');
    const secret = t.q.cards!.map((c) => c.id);
    for (const seat of [(t.me + 1) % 3, (t.me + 2) % 3]) {
      const v = t.view(seat);
      expect(v.pending!.cards).toBeUndefined();
      const text = JSON.stringify(v);
      expect(text).not.toContain('"deck":[');
      for (const id of secret) expect(JSON.stringify(v.revealed)).not.toContain(`"id":${id}`);
      for (const c of t.view(t.me).hand) expect(v.hand.map((x) => x.id)).not.toContain(c.id);
    }
  });
  it('CC-PRIV-2: a look is logged by count only for others', () => {
    const t = new Table(['city_blueprint'], { deck: ['cog', 'dynamo', 'notebook', 'blueprint'] });
    t.play('city_blueprint');
    const other = t.view(1 - t.me).log.filter((l) => l.kind === 'look');
    expect(other.every((l) => !l.keys)).toBe(true);
    const mine = t.view(t.me).log.filter((l) => l.kind === 'look');
    expect(mine.some((l) => l.keys)).toBe(true);
  });
  it('CC-PRIV-3: another player’s pending question shows only who and what, not the offered cards', () => {
    const t = new Table(['inspection_team'], { others: [['scrap', 'scrap', 'cog', 'dynamo', 'notebook']] });
    t.play('inspection_team');
    const v = t.view(t.me);
    expect(v.pending!.seat).toBe(1 - t.me);
    expect(v.pending!.cards).toBeUndefined();
    expect(v.pending!.options).toBeUndefined();
  });
  it('CC-PRIV-4: a discarded pile’s contents, deck order and Spark rules stay per seat', () => {
    const t = new Table([], { spark: 3 });
    const v = t.view(1 - t.me);
    expect(v.players[t.me].tokens.spark).toBe(3);
    expect(v.discard.every((c) => t.s.players[1 - t.me].discard.includes(c.id))).toBe(true);
  });
});
