/** Palazzo rules (docs/PALAZZO.md), driven through the real `apply` and `tick`. */
import { describe, expect, it } from 'vitest';
import { palazzo } from '../../src/games/palazzo';
import { actors, isOut, results, setup } from '../../src/games/palazzo/rules/engine';
import { ROLE_ORDER, whyNot } from '../../src/games/palazzo/rules/roles';
import { CLOCK, Game } from './helpers';

const config = { timer: 15 as const, disconnect: 'pause' as const, draft: false };

describe('PZ-SET', () => {
  it('PZ-SET1–3: fifteen cards, three of each role; two hidden cards and 2 coins each; the deck holds the rest', () => {
    for (let n = 2; n <= 6; n++) {
      const s = setup(n, `seed-${n}`, config, CLOCK);
      const all = [...s.seats.flatMap((x) => x.hand), ...s.deck];
      expect(all).toHaveLength(15);
      for (const r of ROLE_ORDER) expect(all.filter((c) => c.role === r)).toHaveLength(3);
      expect(new Set(all.map((c) => c.id)).size).toBe(15);
      expect(s.seats.every((x) => x.hand.length === 2 && x.hand.every((c) => !c.up))).toBe(true);
      expect(s.deck.length).toBe(15 - 2 * n);
      expect(s.deck.length).toBeGreaterThanOrEqual(3);
      const coins = s.seats.map((x) => x.coins);
      // PZ-SET3: in a two-player game the opener starts with 1.
      expect(coins).toEqual(s.seats.map((_, i) => (n === 2 && i === s.current ? 1 : 2)));
    }
  });

  it('PZ-SET4: the two-player draft deals three, each keeps two, and the returned cards are shuffled back', () => {
    const g = new Game({ n: 2, config: { draft: true } });
    expect(g.phase).toBe('draft');
    expect(g.s.seats.map((x) => x.hand.length)).toEqual([3, 3]);
    expect(actors(g.s).sort()).toEqual([0, 1]);
    const order = g.s.seats[0].hand.map((c) => c.id);
    g.do(0, { type: 'return', card: order[1] });
    expect(g.s.seats[0].hand.map((c) => c.id)).toEqual([order[0], order[2]]);
    expect(g.code(0, { type: 'return', card: order[0] })).toBe('not-yours');
    expect(g.phase).toBe('draft');
    g.do(1, { type: 'return', card: g.s.seats[1].hand[0].id });
    expect(g.phase).toBe('turn');
    expect(g.s.deck).toHaveLength(11);
    expect(g.allCards()).toHaveLength(15);
  });

  it('PZ-SET4: the draft setting does nothing at three or more players', () => {
    const g = new Game({ n: 3, config: { draft: true } });
    expect(g.phase).toBe('turn');
    expect(g.s.seats.every((x) => x.hand.length === 2)).toBe(true);
  });

  it('PZ-SET5: the opener is drawn by lot, and the last winner opens a rematch', () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => setup(4, `lot-${i}`, config).current));
    expect(firsts.size).toBe(4);
    for (let w = 0; w < 4; w++) expect(setup(4, 'lot-1', config, 0, [w]).current).toBe(w);
    expect(palazzo.setup({ playerCount: 3, seed: 'x', config, winners: [2] }).current).toBe(2);
  });

  it('PZ-SET6: settings are checked: timer 10/15/20/30, disconnect pause/continue, draft on or off', () => {
    expect(palazzo.defaultConfig(2)).toEqual({ timer: 15, disconnect: 'pause', draft: false });
    expect(palazzo.sanitizeConfig!({ timer: 20, disconnect: 'continue', draft: true })).toEqual({ config: { timer: 20, disconnect: 'continue', draft: true } });
    expect(palazzo.sanitizeConfig!({ timer: 12 })).toHaveProperty('error');
    expect(palazzo.sanitizeConfig!({ disconnect: 'bots' })).toHaveProperty('error');
    expect(palazzo.sanitizeConfig!({ draft: 'yes' })).toHaveProperty('error');
  });
});

describe('PZ-ACT general actions', () => {
  it('PZ-ACT1: Income takes 1 coin, with no window at all', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    g.declare('income');
    expect(g.coins()).toEqual([3, 2, 2]);
    expect(g.s.current).toBe(1);
    expect(g.phase).toBe('turn');
  });

  it('PZ-ACT2: Levy takes 2 unless an opponent blocks with a Magistrate claim', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    g.declare('levy');
    expect(g.s.window).toMatchObject({ kind: 'block', open: [1, 2] });
    expect(g.code(1, { type: 'respond', choice: 'challenge' })).toBe('bad-action');
    g.allPass();
    expect(g.coins()).toEqual([4, 2, 2]);
    // Any opponent may block; the block can itself be challenged.
    g.declare('levy');
    g.block(2);
    expect(g.s.window).toMatchObject({ kind: 'counter', open: [0, 1] });
    g.allPass();
    expect(g.coins()).toEqual([4, 2, 2]);
    expect(g.s.log.at(-1)).toMatchObject({ t: 'blocked', seat: 1 });
  });

  it('PZ-ACT3: Depose costs 7, cannot be challenged or blocked, and is forced at 10 or more coins', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'chancellor'], ['bravo', 'sentinel']], coins: [10, 2, 6], first: 0 });
    expect(g.code(0, { type: 'declare', kind: 'income' })).toBe('illegal');
    expect(g.try(0, { type: 'declare', kind: 'collect' })).toMatchObject({ error: 'With 10 or more coins you must Depose.' });
    g.declare('depose', 1);
    expect(g.coins()[0]).toBe(3);
    expect(g.phase).toBe('lose');
    g.lose(1, 'bravo');
    expect(g.hidden(1)).toEqual(['chancellor']);
    expect(g.s.current).toBe(1);
    g.declare('income');
    expect(g.code(2, { type: 'declare', kind: 'depose', target: 0 })).toBe('illegal');
  });

  it('PZ-TURN2: a target must be a different player who is still in', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'chancellor'], ['bravo', 'sentinel']], coins: [7, 2, 2], first: 0 });
    g.s.seats[2].hand.forEach((c) => (c.up = true));
    expect(g.code(0, { type: 'declare', kind: 'depose', target: 0 })).toBe('illegal');
    expect(g.code(0, { type: 'declare', kind: 'depose', target: 2 })).toBe('illegal');
    expect(g.code(0, { type: 'declare', kind: 'depose', target: 7 })).toBe('illegal');
    expect(g.code(0, { type: 'declare', kind: 'depose' })).toBe('illegal');
    expect(g.code(0, { type: 'declare', kind: 'income', target: 1 })).toBe('illegal');
    expect(g.code(1, { type: 'declare', kind: 'income' })).toBe('not-your-turn');
  });
});

describe('PZ-ROLE role actions', () => {
  it('PZ-ROLE1: Collect (Chancellor) takes 3 once nobody challenges', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect');
    expect(g.s.window).toMatchObject({ kind: 'challenge', open: [1, 2] });
    g.pass(1);
    expect(g.phase).toBe('window');
    g.pass(2);
    expect(g.coins()).toEqual([5, 2, 2]);
  });

  it('PZ-ROLE2: Seize takes up to 2, is legal against 0 coins, and only the target may block with a Chancellor claim', () => {
    const g = new Game({ hands: [['magistrate', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], coins: [2, 1, 0], first: 0 });
    g.declare('seize', 2).allPass();
    expect(g.s.window).toMatchObject({ kind: 'block', open: [2] });
    g.pass(2);
    expect(g.coins()).toEqual([2, 1, 0]);
    expect(g.s.log.at(-1)).toMatchObject({ t: 'coins', seat: 0, n: 0, from: 2 });
    g.declare('income').declare('income').declare('seize', 1).allPass().pass(1);
    expect(g.coins()).toEqual([4, 0, 1]);
    g.declare('income').declare('seize', 0).allPass().pass(0);
    expect(g.coins()).toEqual([2, 1, 3]);
  });

  it('PZ-ROLE3: Strike costs 3 and the target loses an influence', () => {
    const g = new Game({ hands: [['bravo', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'sentinel']], coins: [3, 2, 2], first: 0 });
    expect(new Game({ hands: [['bravo', 'envoy'], ['chancellor', 'magistrate']], coins: [2, 2], first: 0 }).code(0, { type: 'declare', kind: 'strike', target: 1 })).toBe('illegal');
    g.declare('strike', 1);
    expect(g.coins()[0]).toBe(0);
    g.allPass();
    expect(g.s.window).toMatchObject({ kind: 'block', open: [1] });
    g.pass(1);
    expect(g.s.phase).toBe('lose');
    expect(actors(g.s)).toEqual([1]);
    g.lose(1, 'magistrate');
    expect(g.s.seats[1].hand.map((c) => [c.role, c.up])).toEqual([['chancellor', false], ['magistrate', true]]);
  });

  it('PZ-ROLE4 / PZ-PARL1–3: Parley takes 1, draws 1 and returns any hidden card or the drawn one; the hand keeps its order', () => {
    const g = new Game({ hands: [['bravo', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'sentinel']], deck: ['sentinel', 'chancellor', 'chancellor'], first: 0 });
    g.declare('parley').allPass();
    expect(g.phase).toBe('parley');
    expect(g.coins()[0]).toBe(3);
    expect(g.view(0).me!.drawn!.role).toBe('sentinel');
    expect(g.view(1).me!.drawn).toBeUndefined();
    const ids = g.s.seats[0].hand.map((c) => c.id);
    const drawn = g.s.pend!.drawn!.id;
    expect(g.code(1, { type: 'return', card: drawn })).toBe('not-yours');
    expect(g.code(0, { type: 'return', card: 9999 })).toBe('bad-card');
    g.do(0, { type: 'return', card: ids[0] });
    expect(g.s.seats[0].hand.map((c) => c.id)).toEqual([drawn, ids[1]]);
    expect(g.s.deck).toHaveLength(3);
    expect(g.allCards()).toHaveLength(9);
    expect(g.s.current).toBe(1);
  });

  it('PZ-PARL2: with one influence left Parley still keeps exactly one hidden card; a revealed card can’t be returned', () => {
    const g = new Game({ hands: [['bravo', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'sentinel']], deck: ['sentinel', 'chancellor', 'chancellor'], first: 0 });
    g.s.seats[0].hand[0].up = true;
    g.declare('parley').allPass();
    const up = g.s.seats[0].hand[0].id;
    expect(g.code(0, { type: 'return', card: up })).toBe('bad-card');
    g.do(0, { type: 'return', card: g.s.pend!.drawn!.id });
    expect(g.s.seats[0].hand.map((c) => [c.role, c.up])).toEqual([['bravo', true], ['envoy', false]]);
  });

  it('PZ-ROLE5 / PZ-SENT1–2: Inspect needs a target with two hidden cards and tells only the Sentinel one of them', () => {
    const g = new Game({ hands: [['sentinel', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'bravo']], first: 0 });
    g.s.seats[2].hand[0].up = true;
    expect(g.try(0, { type: 'declare', kind: 'inspect', target: 2 })).toMatchObject({ ok: false, error: 'Inspect needs a target with two hidden cards.' });
    g.declare('inspect', 1).allPass();
    const seen = g.view(0).me!.seen;
    expect(seen).toHaveLength(1);
    expect(seen[0].seat).toBe(1);
    expect(['chancellor', 'magistrate']).toContain(seen[0].role);
    expect(seen[0].lapsed).toBe(false);
    expect(g.view(1).me!.seen).toEqual([]);
    expect(g.view(2).me!.seen).toEqual([]);
    expect(JSON.stringify(g.view(2).log)).not.toContain(seen[0].role);
  });

  it('PZ-SENT1: the card Inspect shows is picked by the server at random', () => {
    const roles = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const g = new Game({ hands: [['sentinel', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'bravo']], first: 0, seed: `ins-${i}` });
      g.declare('inspect', 1).allPass();
      roles.add(g.view(0).me!.seen[0].role);
    }
    expect([...roles].sort()).toEqual(['chancellor', 'magistrate']);
  });

  it('PZ-SENT3: what was seen lapses when the target exchanges, replaces or reveals a card', () => {
    const fresh = () => {
      const g = new Game({ hands: [['sentinel', 'envoy'], ['envoy', 'envoy'], ['bravo', 'magistrate']], deck: ['chancellor', 'chancellor', 'chancellor'], first: 0 });
      return g.declare('inspect', 1).allPass();
    };
    // Exchange: the target Parleys, even keeping both cards.
    let g = fresh().declare('parley').allPass();
    g.do(1, { type: 'return', card: g.s.pend!.drawn!.id });
    expect(g.view(0).me!.seen).toEqual([{ seat: 1, role: 'envoy', lapsed: true }]);
    // Replace: the target proves a claim.
    g = fresh().declare('parley').challenge(2);
    expect(g.view(0).me!.seen[0].lapsed).toBe(true);
    // Reveal: the target loses an influence.
    g = fresh();
    g.s.seats[1].coins = 7;
    g.declare('depose', 2).lose(2, 'bravo');
    expect(g.view(0).me!.seen[0].lapsed).toBe(false);
    g = fresh();
    g.s.seats[2].coins = 7;
    g.declare('income').declare('depose', 1).lose(1, 'envoy');
    expect(g.view(0).me!.seen[0].lapsed).toBe(true);
  });
});

describe('PZ-CHAL challenges', () => {
  it('PZ-CHAL2: a true claim is proven, the challenger loses an influence and the shown card is replaced in its slot', () => {
    const g = new Game({ hands: [['envoy', 'chancellor'], ['bravo', 'magistrate'], ['bravo', 'sentinel']], deck: ['sentinel', 'sentinel', 'sentinel'], first: 0 });
    const keep = g.s.seats[0].hand[0].id;
    g.declare('collect').challenge(2);
    expect(g.s.log.find((e) => e.t === 'challenge')).toMatchObject({ seat: 2, of: 0, role: 'chancellor', truthful: true });
    expect(g.s.seats[0].hand[0].id).toBe(keep);
    expect(g.s.seats[0].hand[1].up).toBe(false);
    expect(g.allCards()).toHaveLength(9);
    expect(g.phase).toBe('lose');
    expect(actors(g.s)).toEqual([2]);
    g.lose(2, 'bravo');
    expect(g.coins()).toEqual([5, 2, 2]);
  });

  it('PZ-CHAL3: a false claim costs the claimant an influence and the action fails', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect').challenge(1).lose(0, 'envoy');
    expect(g.coins()).toEqual([2, 2, 2]);
    expect(g.s.log.find((e) => e.t === 'failed')).toMatchObject({ seat: 0, kind: 'collect', refund: 0 });
    expect(g.s.current).toBe(1);
  });

  it('PZ-CHAL4: the first challenge wins; a later one, or a late pass, is refused as stale', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect');
    const step = g.s.step;
    g.challenge(2);
    expect(apply2(g, 1, { type: 'respond', step, choice: 'challenge' })).toBe('stale');
    expect(apply2(g, 1, { type: 'respond', step, choice: 'pass' })).toBe('stale');
  });

  it('PZ-CHAL5: a challenger can’t challenge their own claim, answer twice or answer out of turn', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect');
    expect(g.code(0, { type: 'respond', choice: 'challenge' })).toBe('not-yours');
    g.pass(1);
    expect(g.code(1, { type: 'respond', choice: 'challenge' })).toBe('answered');
  });

  it('PZ-CHAL1: a challenged block that is true stops the action, and the challenger loses', () => {
    const g = new Game({ hands: [['magistrate', 'envoy'], ['chancellor', 'bravo'], ['bravo', 'sentinel']], coins: [2, 2, 2], first: 0 });
    g.declare('seize', 1).allPass().block(1);
    expect(g.s.window).toMatchObject({ kind: 'counter', open: [0, 2] });
    g.challenge(0);
    expect(g.phase).toBe('lose');
    g.lose(0, 'envoy');
    expect(g.coins()).toEqual([2, 2, 2]);
    expect(g.s.log.some((e) => e.t === 'blocked')).toBe(true);
  });

  it('PZ-CHAL1: a challenged block that is false costs the blocker, and the action goes ahead', () => {
    const g = new Game({ hands: [['magistrate', 'envoy'], ['envoy', 'bravo'], ['bravo', 'sentinel']], coins: [2, 2, 2], first: 0 });
    g.declare('seize', 1).allPass().block(1).challenge(2).lose(1, 'envoy');
    expect(g.coins()).toEqual([4, 0, 2]);
  });
});

describe('PZ-STRK the Strike sequence', () => {
  const strike = () => new Game({ hands: [['bravo', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'sentinel']], coins: [5, 2, 2], first: 0 });

  it('PZ-STRK2: a Strike exposed as a bluff refunds the 3 coins, and the target can’t then block a failed action', () => {
    const g = new Game({ hands: [['chancellor', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'sentinel']], coins: [5, 2, 2], first: 0 });
    g.declare('strike', 1);
    expect(g.coins()[0]).toBe(2);
    g.challenge(1).lose(0, 'envoy');
    expect(g.coins()[0]).toBe(5);
    expect(g.s.pend).toBeNull();
    expect(g.s.current).toBe(1);
    expect(g.hidden(1)).toEqual(['chancellor', 'magistrate']);
  });

  it('PZ-STRK3: a blocked Strike keeps its 3 coins spent', () => {
    const g = strike();
    g.declare('strike', 1).allPass().block(1).allPass();
    expect(g.coins()[0]).toBe(2);
    expect(g.hidden(1)).toEqual(['chancellor', 'magistrate']);
  });

  it('PZ-STRK5: a false Sentinel block caught costs one influence, then the Strike lands for a second', () => {
    const g = strike();
    g.declare('strike', 1).allPass().block(1).challenge(0);
    expect(g.phase).toBe('lose');
    g.lose(1, 'magistrate');
    expect(g.hidden(1)).toEqual([]);
    expect(isOut(g.s.seats[1])).toBe(true);
    expect(g.s.log.filter((e) => e.t === 'lose').map((e) => (e as { why: string }).why)).toEqual(['challenge', 'strike']);
  });

  it('PZ-STRK4: a target knocked out partway through makes the Strike fizzle, coins still spent', () => {
    const g = strike();
    g.s.seats[1].hand[1].up = true;
    // The target challenges a true Bravo claim with their last card.
    g.declare('strike', 1).challenge(1);
    expect(isOut(g.s.seats[1])).toBe(true);
    expect(g.s.log.some((e) => e.t === 'fizzle')).toBe(true);
    expect(g.coins()[0]).toBe(2);
    expect(g.s.current).toBe(2);
  });

  it('PZ-STRK1: a target who wrongly challenges a true Strike still gets to block it', () => {
    const g = new Game({ hands: [['bravo', 'envoy'], ['sentinel', 'magistrate'], ['bravo', 'chancellor']], coins: [5, 2, 2], first: 0 });
    g.declare('strike', 1).challenge(1).lose(1, 'magistrate');
    expect(g.s.window).toMatchObject({ kind: 'block', open: [1] });
    g.block(1).allPass();
    expect(g.hidden(1)).toEqual(['sentinel']);
    expect(g.coins()[0]).toBe(2);
  });
});

describe('PZ-LOSE / PZ-WIN0', () => {
  it('PZ-LOSE1–2: a player with two hidden cards chooses; with one left it is turned up automatically', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect').challenge(1);
    expect(g.code(1, { type: 'reveal', card: g.id(0, 'envoy') })).toBe('not-yours');
    expect(g.code(0, { type: 'reveal', card: g.id(1, 'bravo') })).toBe('bad-card');
    g.lose(0, 'bravo');
    g.declare('income').declare('income').declare('collect').challenge(2);
    expect(g.hidden(0)).toEqual([]);
    expect(g.s.log.filter((e) => e.t === 'out')).toHaveLength(1);
  });

  it('PZ-WIN0: the last player with influence wins at once and results rank by elimination', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate'], ['chancellor', 'sentinel']], coins: [7, 7, 2], first: 0 });
    g.s.seats[1].hand[0].up = true;
    g.s.seats[2].hand[1].up = true;
    g.declare('depose', 1);
    expect(isOut(g.s.seats[1])).toBe(true);
    expect(g.s.current).toBe(2);
    g.declare('collect').challenge(0);
    expect(g.phase).toBe('lose');
    g.lose(0, 'envoy');
    g.declare('income');
    g.s.seats[2].coins = 7;
    g.declare('depose', 0);
    expect(g.phase).toBe('over');
    expect(g.s.winner).toBe(2);
    expect(actors(g.s)).toEqual([]);
    expect(results(g.s)!.map((r) => [r.seat, r.rank, r.winner])).toEqual([[2, 1, true], [0, 2, false], [1, 3, false]]);
    expect(g.code(2, { type: 'declare', kind: 'income' })).toBe('over');
  });

  it('PZ-WIN0: a game can end in the middle of an action', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate']], first: 0 });
    g.s.seats[0].hand[1].up = true;
    g.declare('collect').challenge(1);
    expect(g.phase).toBe('over');
    expect(g.s.winner).toBe(1);
    expect(g.s.pend).toBeNull();
  });

  it('PZ-SPEC1: an eliminated player can’t act, and their turn is skipped', () => {
    const g = new Game({ hands: [['envoy', 'bravo'], ['bravo', 'magistrate'], ['bravo', 'sentinel']], coins: [7, 2, 2], first: 0 });
    g.s.seats[1].hand[0].up = true;
    g.declare('depose', 1);
    expect(g.s.current).toBe(2);
    expect(g.code(1, { type: 'respond', choice: 'pass' })).toBe('out');
    g.declare('collect');
    expect(g.s.window!.open).toEqual([0]);
  });
});

describe('PZ-TIME / PZ-NET clocks', () => {
  it('PZ-TIME1–2: a window closes early once all have passed, or when its time runs out, counting the rest as passes', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0, config: { timer: 10 } });
    g.declare('collect');
    expect(g.s.window!.deadline).toBe(CLOCK + 10_000);
    expect(palazzo.wakeAt!(g.s)).toBe(CLOCK + 10_000);
    g.pass(1);
    expect(g.tick(undefined, CLOCK + 9_999)).toBe(false);
    expect(g.tick(undefined, CLOCK + 10_000)).toBe(true);
    expect(g.coins()).toEqual([5, 2, 2]);
    expect(g.s.log.some((e) => e.t === 'timeout')).toBe(true);
    expect(palazzo.wakeAt!(g.s)).toBeNull();
  });

  it('PZ-TIME3: mandatory decisions have no clock', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    expect(palazzo.wakeAt!(g.s)).toBeNull();
    expect(g.tick(undefined, CLOCK + 3600_000)).toBe(false);
    expect(g.phase).toBe('turn');
  });

  it('PZ-NET2–3: with "pause", anyone still in going offline freezes the clock; it resumes with the time left', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect');
    g.tick([true, true, false], CLOCK + 4_000);
    expect(g.s.pause).toEqual({ since: CLOCK + 4_000, seats: [2] });
    expect(palazzo.wakeAt!(g.s)).toBeNull();
    expect(g.code(1, { type: 'respond', choice: 'pass' })).toBe('paused');
    expect(g.code(1, { type: 'chat', text: 'where did you go?' })).toBe('ok');
    g.tick([true, true, false], CLOCK + 600_000);
    expect(g.phase).toBe('window');
    g.tick([true, true, true], CLOCK + 700_000);
    expect(g.s.pause).toBeNull();
    expect(g.s.window!.deadline).toBe(CLOCK + 700_000 + 11_000);
    expect(g.s.log.slice(-2).map((e) => e.t)).toEqual(['pause', 'resume']);
  });

  it('PZ-NET3: a window paused with almost no time left resumes with at least 5 seconds', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    g.declare('collect');
    g.tick([true, false, true], CLOCK + 14_500);
    g.tick([true, true, true], CLOCK + 20_000);
    expect(g.s.window!.deadline).toBe(CLOCK + 25_000);
  });

  it('PZ-NET4: with "continue", windows run on for an absent player, but a mandatory decision of theirs pauses', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0, config: { disconnect: 'continue' } });
    const away = [true, true, false];
    g.declare('collect');
    g.tick(away, CLOCK + 1_000);
    expect(g.s.pause).toBeNull();
    g.pass(1);
    g.tick(away, CLOCK + 15_000);
    expect(g.coins()).toEqual([5, 2, 2]);
    g.declare('income');
    expect(g.s.current).toBe(2);
    g.tick(away, CLOCK + 16_000);
    expect(g.s.pause).toMatchObject({ seats: [2] });
    expect(g.tick([true, true, true], CLOCK + 17_000)).toBe(true);
    expect(g.s.pause).toBeNull();
  });

  it('PZ-NET4: a disconnected player who must lose a card pauses a "continue" table; nothing is chosen for them', () => {
    const g = new Game({ hands: [['bravo', 'envoy'], ['chancellor', 'magistrate'], ['bravo', 'sentinel']], coins: [3, 2, 2], first: 0, config: { disconnect: 'continue' } });
    g.declare('strike', 1).allPass().pass(1);
    g.tick([true, false, true], CLOCK + 60_000);
    expect(g.s.pause).toMatchObject({ seats: [1] });
    g.tick([true, false, true], CLOCK + 3600_000);
    expect(g.phase).toBe('lose');
    expect(g.hidden(1)).toEqual(['chancellor', 'magistrate']);
  });

  it('PZ-NET4: an eliminated player going offline never pauses the table', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    g.s.seats[2].hand.forEach((c) => (c.up = true));
    g.tick([true, true, false], CLOCK + 1);
    expect(g.s.pause).toBeNull();
  });

  it('PZ-NET1: every game action must name the current step', () => {
    const g = new Game({ hands: [['envoy', 'envoy'], ['bravo', 'bravo'], ['bravo', 'sentinel']], first: 0 });
    expect(g.code(0, { type: 'declare', kind: 'income', step: g.s.step - 1 })).toBe('stale');
    expect(g.code(0, { type: 'declare', kind: 'income', step: undefined })).toBe('stale');
    // A pass doesn't move the step, so the others' answers still land.
    g.declare('collect');
    const step = g.s.step;
    g.pass(1);
    expect(g.s.step).toBe(step);
  });

  it('PZ-DECK1: no card is ever created or lost', () => {
    const g = new Game({ n: 4, seed: 'deck' });
    for (let i = 0; i < 200 && g.phase !== 'over'; i++) {
      const seat = actors(g.s)[0];
      if (g.phase === 'turn') {
        const target = [1, 2, 3].map((d) => (seat + d) % 4).find((t) => !isOut(g.s.seats[t]))!;
        const kind = g.s.seats[seat].coins >= 10 ? 'depose' : (['collect', 'parley', 'income', 'seize'] as const)[i % 4];
        g.do(seat, { type: 'declare', kind, ...(kind === 'depose' || kind === 'seize' ? { target } : {}) });
      } else if (g.phase === 'window') g.do(seat, { type: 'respond', choice: i % 3 === 0 && g.s.window!.kind !== 'block' ? 'challenge' : 'pass' });
      else if (g.phase === 'lose') g.do(seat, { type: 'reveal', card: g.s.seats[seat].hand.find((c) => !c.up)!.id });
      else if (g.phase === 'parley') g.do(seat, { type: 'return', card: g.s.pend!.drawn!.id });
      expect(g.allCards()).toHaveLength(15);
      expect(new Set(g.allCards().map((c) => c.id)).size).toBe(15);
    }
  });

  it('whyNot gives the reasons the table explains', () => {
    const seats = [{ coins: 2, hidden: 2 }, { coins: 0, hidden: 1 }];
    expect(whyNot(seats, 0, 'strike', 1)).toBe('Strike costs 3 coins.');
    expect(whyNot(seats, 0, 'inspect', 1)).toBe('Inspect needs a target with two hidden cards.');
    expect(whyNot(seats, 0, 'seize', 1)).toBeNull();
  });
});

function apply2(g: Game, seat: number, a: Record<string, unknown>) {
  const r = palazzo.apply(g.s, seat, a as never, g.now);
  return r.ok ? 'ok' : r.code;
}
