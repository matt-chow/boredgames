/** Dead Drop's rules (DD-*): the IDs are in docs/DEADDROP.md. */
import { describe, expect, it } from 'vitest';
import { deaddrop } from '../../src/games/deaddrop';
import { AWAY_MS, CHAT_KEEP, CHAT_MAX, MAX_ROUNDS, PHASE_MS, actors, project, results, setup } from '../../src/games/deaddrop/rules/engine';
import { LOCATIONS, type DAction, type Loc, type Order } from '../../src/games/deaddrop/rules/types';
import { CLOCK, Match, decoy, deliver, intercept, investigate } from './helpers';

describe('DD-SET setup', () => {
  it('DD-SET1: each player gets two distinct mission locations', () => {
    for (let i = 0; i < 300; i++) {
      for (const x of setup(`s${i}`).seats) {
        expect(new Set(x.missions).size).toBe(2);
        for (const m of x.missions) expect(LOCATIONS).toContain(m);
      }
    }
  });

  it('DD-SET2: missions are independent, so they may overlap, partly or wholly', () => {
    const overlaps = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const [a, b] = setup(`s${i}`).seats;
      overlaps.add(a.missions.filter((m) => b.missions.includes(m)).length);
    }
    expect([...overlaps].sort()).toEqual([0, 1, 2]);
  });

  it('DD-SET3: the same seed deals the same missions; every location gets used', () => {
    expect(setup('x').seats.map((s) => s.missions)).toEqual(setup('x').seats.map((s) => s.missions));
    const seen = new Set<Loc>();
    for (let i = 0; i < 50; i++) setup(`s${i}`).seats.forEach((x) => x.missions.forEach((m) => seen.add(m)));
    expect(seen.size).toBe(4);
  });

  it('DD-SET4: exactly two players', () => {
    expect([deaddrop.meta.minPlayers, deaddrop.meta.maxPlayers]).toEqual([2, 2]);
    expect(deaddrop.validateConfig({}, 2)).toBeNull();
    expect(deaddrop.validateConfig({}, 3)).toBeTruthy();
    expect(deaddrop.bot).toBeUndefined();
  });
});

describe('DD-ORD orders', () => {
  const atOrders = () => new Match().brief();
  const send = (m: Match, seat: number, order: unknown) => m.code(seat, { type: 'order', round: m.s.round, order } as DAction);

  it('DD-ORD1: Deliver only at your own mission locations', () => {
    const m = atOrders();
    expect(send(m, 0, deliver('hotel'))).toBe('not-mission');
    expect(send(m, 0, deliver('embassy'))).toBe('ok');
  });

  it.each(['investigate', 'intercept', 'decoy'] as const)('DD-ORD2: %s is legal at any location', (action) => {
    for (const target of LOCATIONS) expect(send(atOrders(), 0, { action, target })).toBe('ok');
  });

  it('DD-ORD3: nonsense orders are refused', () => {
    const m = atOrders();
    expect(send(m, 0, null)).toBe('bad-order');
    expect(send(m, 0, { action: 'bribe', target: 'hotel' })).toBe('bad-order');
    expect(send(m, 0, { action: 'decoy', target: 'moon' })).toBe('bad-target');
    expect(send(m, 0, { action: 'decoy' })).toBe('bad-target');
  });

  it('DD-ORD4: orders lock on submission and cannot be changed or repeated', () => {
    const m = atOrders().order(0, decoy('hotel'));
    expect(send(m, 0, intercept('hotel'))).toBe('locked');
    expect(m.s.seats[0].orders).toEqual(decoy('hotel'));
  });

  it('DD-ORD5: orders are refused outside Secret Orders, and for another round', () => {
    const m = new Match();
    expect(send(m, 0, decoy('hotel'))).toBe('wrong-phase');
    m.brief();
    expect(m.code(0, { type: 'order', round: 2, order: decoy('hotel') })).toBe('wrong-round');
    m.order(0, decoy('hotel')).order(1, decoy('hotel'));
    expect(send(m, 0, decoy('hotel'))).toBe('wrong-phase');
  });

  it('DD-ORD6: an order for an earlier round can never land on a later one', () => {
    const m = new Match().round(decoy('hotel'), decoy('hotel')).brief();
    expect(m.code(0, { type: 'order', round: 1, order: decoy('hotel') })).toBe('wrong-round');
    expect(m.s.seats[0].orders).toBeNull();
  });
});

describe('DD-RES resolution', () => {
  it('DD-RES1: the result does not depend on who submits first', () => {
    const play = (first: number) => {
      const m = new Match([['embassy', 'station'], ['embassy', 'hotel']]).brief();
      const orders = [deliver('embassy'), intercept('embassy')];
      m.order(first, orders[first]).order(1 - first, orders[1 - first]);
      return m.s;
    };
    expect(play(0)).toEqual(play(1));
  });

  it('DD-RES2: nothing resolves until both have committed', () => {
    const m = new Match().brief().order(0, deliver('embassy'));
    expect(m.s.phase).toBe('orders');
    expect(m.s.rounds).toEqual([]);
    expect(m.s.seats[0].deliveries).toEqual({});
  });

  it('DD-DEL1: an uncontested delivery succeeds and counts', () => {
    const m = new Match().resolve(deliver('embassy'), decoy('hotel'));
    expect(m.s.rounds[0].delivered).toEqual([true, false]);
    expect(m.s.seats[0].deliveries).toEqual({ embassy: 1 });
    expect(m.s.seats[1].cover).toBe(0);
  });

  it('DD-DEL2: a delivery at the intercepted location fails and scores the interceptor', () => {
    const m = new Match().resolve(deliver('embassy'), intercept('embassy'));
    expect(m.s.rounds[0].delivered).toEqual([false, false]);
    expect(m.s.rounds[0].captured).toEqual([null, 'embassy']);
    expect(m.s.seats[0].deliveries).toEqual({});
    expect(m.s.seats[1].interceptions).toBe(1);
  });

  it('DD-INT1: an interception elsewhere lets the delivery through and scores nothing', () => {
    const m = new Match().resolve(deliver('embassy'), intercept('station'));
    expect(m.s.rounds[0].delivered).toEqual([true, false]);
    expect(m.s.seats[1].interceptions).toBe(0);
  });

  it('DD-INT2: intercepting a decoy is not a successful interception', () => {
    const m = new Match().resolve(decoy('hotel'), intercept('hotel'));
    expect(m.s.seats[1].interceptions).toBe(0);
    expect(m.s.rounds[0].captured).toEqual([null, null]);
  });

  it.each([['investigate' as const], ['intercept' as const]])('DD-INT3: intercepting %s has no effect', (action) => {
    const m = new Match().resolve({ action, target: 'hotel' }, intercept('hotel'));
    expect(m.s.seats.map((x) => x.interceptions)).toEqual([0, 0]);
    expect(m.s.seats.map((x) => x.cover)).toEqual([0, 0]);
  });

  it('DD-INV1: an investigation is truthful and goes in the record', () => {
    const m = new Match().resolve(investigate('hotel'), investigate('hotel'));
    expect(m.s.rounds[0].found).toEqual([true, false]);
  });

  it('DD-INV2: investigating never changes a score', () => {
    const m = new Match().resolve(investigate('hotel'), deliver('hotel'));
    expect(m.s.rounds[0].delivered).toEqual([false, true]);
    expect(m.s.seats[0].interceptions).toBe(0);
  });

  it('DD-SIG1: a signal is the target, for every action, and hides which action it was', () => {
    const orders: Order[] = [deliver('embassy'), investigate('embassy'), intercept('embassy'), decoy('embassy')];
    for (const o of orders) expect(new Match().resolve(o, decoy('hotel')).s.rounds[0].signals).toEqual(['embassy', 'hotel']);
  });
});

describe('DD-COV cover', () => {
  const withCover = () => new Match().round(decoy('hotel'), intercept('hotel'));

  it('DD-COV1: a decoy that draws an interception earns Cover', () => {
    const m = new Match().resolve(decoy('hotel'), intercept('hotel'));
    expect(m.s.seats[0].cover).toBe(1);
    expect(m.s.rounds[0].coverGained).toEqual([true, false]);
    expect(m.s.rounds[0].drew).toEqual([true, false]);
  });

  it('DD-COV2: a decoy nobody intercepts earns nothing', () => {
    expect(new Match().resolve(decoy('hotel'), intercept('station')).s.seats[0].cover).toBe(0);
  });

  it('DD-COV3: Cover holds at one', () => {
    const m = withCover().resolve(decoy('harbour'), intercept('harbour'));
    expect(m.s.seats[0].cover).toBe(1);
    expect(m.s.rounds[1].coverGained).toEqual([false, false]);
    expect(m.s.rounds[1].drew).toEqual([true, false]);
  });

  it('DD-COV4: spending Cover broadcasts the false location, and is used up', () => {
    const m = withCover().resolve(deliver('embassy', 'harbour'), decoy('hotel'));
    expect(m.s.rounds[1].signals).toEqual(['harbour', 'hotel']);
    expect(m.s.rounds[1].coverSpent).toEqual([true, false]);
    expect(m.s.rounds[1].delivered[0]).toBe(true);
    expect(m.s.seats[0].cover).toBe(0);
  });

  it('DD-COV5: interception checks the actual location: Cover does not save a delivery', () => {
    const m = withCover().resolve(deliver('embassy', 'harbour'), intercept('embassy'));
    expect(m.s.rounds[1].delivered[0]).toBe(false);
    expect(m.s.seats[1].interceptions).toBe(1);
    expect(m.s.seats[0].cover).toBe(0);
  });

  it('DD-COV6: intercepting the false location catches nothing', () => {
    const m = withCover().resolve(deliver('embassy', 'harbour'), intercept('harbour'));
    expect(m.s.rounds[1].delivered[0]).toBe(true);
    expect(m.s.seats[1].interceptions).toBe(0);
  });

  it('DD-COV7: Cover is refused without a token, off a delivery, on the true location or an unknown one', () => {
    const send = (m: Match, order: unknown) => m.code(0, { type: 'order', round: m.s.round, order } as DAction);
    expect(send(new Match().brief(), deliver('embassy', 'hotel'))).toBe('no-cover');
    const m = withCover().brief();
    expect(send(m, { action: 'decoy', target: 'hotel', cover: 'station' })).toBe('cover-deliver-only');
    expect(send(m, deliver('embassy', 'embassy'))).toBe('cover-same');
    expect(send(m, { action: 'deliver', target: 'embassy', cover: 'moon' })).toBe('bad-target');
    expect(m.s.seats[0].cover).toBe(1);
  });

  it('DD-COV8: Cover can be earned again once it has been spent', () => {
    const m = withCover().round(deliver('embassy', 'harbour'), decoy('hotel')).resolve(decoy('hotel'), intercept('hotel'));
    expect(m.s.seats[0].cover).toBe(1);
  });
});

describe('DD-BRF briefing', () => {
  it('DD-BRF1: each player must file a statement and acknowledge the other’s before orders', () => {
    const m = new Match();
    expect(m.s.phase).toBe('briefing');
    m.claim(0, { kind: 'none' });
    expect(actors(m.s)).toEqual([1]);
    m.claim(1, { kind: 'none' }).ack(0);
    expect(m.s.phase).toBe('briefing');
    expect(actors(m.s)).toEqual([1]);
    m.ack(1);
    expect(m.s.phase).toBe('orders');
  });

  it('DD-BRF2: a new statement needs acknowledging too', () => {
    const m = new Match().claim(0, { kind: 'none' }).claim(1, { kind: 'none' }).ack(0).claim(1, { kind: 'none' }).ack(1);
    expect(m.s.phase).toBe('briefing');
    expect(actors(m.s)).toEqual([0]);
    m.ack(0);
    expect(m.s.phase).toBe('orders');
  });

  it('DD-BRF3: you cannot acknowledge what you have not been shown', () => {
    const m = new Match();
    expect(m.code(0, { type: 'ack', round: 1, count: 0 })).toBe('nothing-to-ack');
    m.claim(1, { kind: 'none' }).claim(1, { kind: 'none' });
    expect(m.code(0, { type: 'ack', round: 1, count: 1 })).toBe('unseen-statement');
    expect(m.code(0, { type: 'ack', round: 1, count: 3 })).toBe('unseen-statement');
  });

  it('DD-BRF4: the first round has nothing to claim about; only "nothing to report" is possible', () => {
    const m = new Match();
    for (const c of [{ kind: 'delivered', loc: 'hotel' }, { kind: 'investigated', loc: 'hotel' }, { kind: 'decoy', loc: 'hotel' }, { kind: 'notDelivered' }])
      expect(m.code(0, { type: 'claim', round: 1, claim: c } as DAction)).toBe('no-history');
    expect(m.code(0, { type: 'claim', round: 1, claim: { kind: 'none' } })).toBe('ok');
  });

  it('DD-BRF5: statements may be false, and the game takes them as filed', () => {
    const m = new Match().round(decoy('hotel'), decoy('hotel')).claim(0, { kind: 'delivered', loc: 'embassy' });
    expect(m.s.statements.at(-1)!.claim).toEqual({ kind: 'delivered', loc: 'embassy' });
  });

  it('DD-BRF6: bad statements are refused, and three a briefing is the limit', () => {
    const m = new Match().round(decoy('hotel'), decoy('hotel'));
    const send = (claim: unknown) => m.code(0, { type: 'claim', round: 2, claim } as DAction);
    expect(send(null)).toBe('bad-claim');
    expect(send({ kind: 'bribed' })).toBe('bad-claim');
    expect(send({ kind: 'delivered' })).toBe('bad-claim');
    expect(send({ kind: 'decoy', loc: 'moon' })).toBe('bad-claim');
    for (let i = 0; i < 3; i++) m.claim(0, { kind: 'none' });
    expect(send({ kind: 'none' })).toBe('too-many');
  });

  it('DD-BRF7: statements are stored with their server timestamp and round', () => {
    const m = new Match();
    m.now = CLOCK + 5;
    m.claim(0, { kind: 'none' });
    expect(m.s.statements[0]).toMatchObject({ seat: 0, round: 1, at: CLOCK + 5 });
  });
});

describe('DD-CHAT conversation', () => {
  it('DD-CHAT1: chat is open in every phase until the match ends, and is never evaluated', () => {
    const m = new Match().do(0, { type: 'chat', text: 'I am at the Embassy, honest' });
    m.brief().do(1, { type: 'chat', text: 'Sure you are' });
    m.order(0, decoy('hotel')).order(1, decoy('hotel')).do(0, { type: 'chat', text: 'Well?' });
    expect(m.s.phase).toBe('report');
    expect(m.s.chat.map((c) => c.text)).toEqual(['I am at the Embassy, honest', 'Sure you are', 'Well?']);
    expect(m.s.seats[0].challengePoints).toBe(0);
  });

  it('DD-CHAT2: messages are cleaned and capped, and the log keeps the newest', () => {
    const m = new Match();
    expect(m.code(0, { type: 'chat', text: '   ' })).toBe('bad-chat');
    expect(m.code(0, { type: 'chat', text: 'x'.repeat(CHAT_MAX + 1) })).toBe('bad-chat');
    expect(m.code(0, { type: 'chat', text: 42 } as unknown as DAction)).toBe('bad-chat');
    m.do(0, { type: 'chat', text: 'a​  b‮' });
    expect(m.s.chat[0].text).toBe('a b');
    for (let i = 0; i < CHAT_KEEP + 5; i++) m.do(1, { type: 'chat', text: `m${i}` });
    expect(m.s.chat).toHaveLength(CHAT_KEEP);
    expect(m.s.chat.at(-1)!.text).toBe(`m${CHAT_KEEP + 4}`);
  });

  it('DD-CHAT3: the phase does not advance on chat', () => {
    const m = new Match().do(0, { type: 'chat', text: 'hello' }).do(1, { type: 'chat', text: 'hi' });
    expect(m.s.phase).toBe('briefing');
    expect(actors(m.s)).toEqual([0, 1]);
  });
});

describe('DD-CH challenges', () => {
  /** Seat 0 filed `claim` about a round where it ordered `order`; still in the briefing that follows. */
  function claimed(order: Order, claim: Parameters<Match['claim']>[1]) {
    const m = new Match().round(order, decoy('hotel')).claim(0, claim);
    return { m, id: m.s.statements.at(-1)!.id };
  }
  const challenge = (m: Match, seat: number, id: number) => m.do(seat, { type: 'challenge', round: m.s.round, statement: id });

  it('DD-CH1: a correct challenge scores the challenger; an incorrect one scores the claimant', () => {
    const lie = claimed(decoy('station'), { kind: 'investigated', loc: 'station' });
    challenge(lie.m, 1, lie.id);
    expect(lie.m.s.seats.map((x) => x.challengePoints)).toEqual([0, 1]);
    const truth = claimed(investigate('station'), { kind: 'investigated', loc: 'station' });
    challenge(truth.m, 1, truth.id);
    expect(truth.m.s.seats.map((x) => x.challengePoints)).toEqual([1, 0]);
  });

  it('DD-CH2: each player has one Challenge token for the match', () => {
    const { m, id } = claimed(decoy('station'), { kind: 'decoy', loc: 'station' });
    const other = m.claim(0, { kind: 'decoy', loc: 'station' }).s.statements.at(-1)!.id;
    challenge(m, 1, id);
    expect(m.s.seats[1].challengeToken).toBe(false);
    expect(m.code(1, { type: 'challenge', round: 2, statement: other })).toBe('no-token');
  });

  it('DD-CH3: a claim can be challenged once, never by its author, and only if there is one', () => {
    const { m, id } = claimed(decoy('station'), { kind: 'decoy', loc: 'station' });
    expect(m.code(0, { type: 'challenge', round: 2, statement: id })).toBe('own-claim');
    expect(m.code(1, { type: 'challenge', round: 2, statement: 999 })).toBe('no-statement');
    challenge(m, 1, id);
    // The other seat's token is still unspent, yet the statement's challenge has been used.
    m.claim(1, { kind: 'decoy', loc: 'hotel' });
    expect(m.s.seats[0].challengeToken).toBe(true);
    expect(m.code(0, { type: 'challenge', round: 2, statement: id })).toBe('own-claim');
    expect(m.s.statements.find((s) => s.id === id)!.challenge!.by).toBe(1);
  });

  it('DD-CH3a: "nothing to report" cannot be challenged, and costs no token', () => {
    const { m, id } = claimed(decoy('station'), { kind: 'none' });
    expect(m.code(1, { type: 'challenge', round: 2, statement: id })).toBe('not-challengeable');
    expect(m.s.seats[1].challengeToken).toBe(true);
  });

  it('DD-CH4: a claim from an earlier briefing can still be challenged, against the round it spoke of', () => {
    const m = new Match().round(investigate('station'), decoy('hotel'));
    m.round(decoy('station'), decoy('hotel'), [{ kind: 'investigated', loc: 'station' }]);
    const id = m.s.statements.find((s) => s.claim.kind === 'investigated')!.id;
    m.brief();
    expect(m.code(1, { type: 'challenge', round: m.s.round, statement: id })).toBe('wrong-phase');
    const n = new Match().round(investigate('station'), decoy('hotel'));
    n.round(decoy('station'), decoy('hotel'), [{ kind: 'investigated', loc: 'station' }]);
    const late = n.s.statements.find((s) => s.claim.kind === 'investigated')!.id;
    challenge(n, 1, late);
    expect(n.s.statements.find((s) => s.id === late)!.challenge!.correct).toBe(false);
    expect(n.s.seats[0].challengePoints).toBe(1);
  });

  it('DD-CH5: delivery claims are sealed whether they are true or false; the rest resolve at once', () => {
    for (const [order, claim] of [
      [deliver('embassy'), { kind: 'delivered', loc: 'embassy' }],
      [decoy('embassy'), { kind: 'delivered', loc: 'embassy' }],
      [deliver('embassy'), { kind: 'notDelivered' }],
      [decoy('embassy'), { kind: 'notDelivered' }],
    ] as const) {
      const { m, id } = claimed(order, claim);
      challenge(m, 1, id);
      const v = project(m.s, 1).statements.find((s) => s.id === id)!;
      expect(v.challenge).toMatchObject({ by: 1, sealed: true });
      expect(v.challenge).not.toHaveProperty('correct');
      expect(project(m.s, 0).challengePoints).toEqual([0, 0]);
      expect(project(m.s, 1).challengePoints).toEqual([0, 0]);
    }
    for (const [order, claim] of [
      [investigate('hotel'), { kind: 'investigated', loc: 'hotel' }],
      [decoy('hotel'), { kind: 'investigated', loc: 'hotel' }],
      [decoy('hotel'), { kind: 'decoy', loc: 'hotel' }],
      [intercept('hotel'), { kind: 'decoy', loc: 'hotel' }],
    ] as const) {
      const { m, id } = claimed(order, claim);
      challenge(m, 1, id);
      const v = project(m.s, 0).statements.find((s) => s.id === id)!;
      expect(v.challenge!.sealed).toBe(false);
      expect(typeof v.challenge!.correct).toBe('boolean');
      expect(project(m.s, 0).challengePoints.reduce((a, b) => a + b)).toBe(1);
    }
  });

  it('DD-CH6: sealed challenges open at the end and count in the tiebreak', () => {
    const { m, id } = claimed(decoy('embassy'), { kind: 'delivered', loc: 'embassy' });
    challenge(m, 1, id);
    expect(m.s.seats[1].challengePoints).toBe(1);
    m.claim(1, { kind: 'none' }).ack(0).ack(1).order(0, decoy('hotel')).order(1, decoy('hotel')).closeReport();
    while (m.s.phase !== 'over') m.round(decoy('hotel'), decoy('hotel'));
    const end = project(m.s, 0);
    expect(end.statements.find((s) => s.id === id)!.challenge).toMatchObject({ sealed: true, correct: true });
    expect(end.challengePoints).toEqual([0, 1]);
    expect(m.s.result).toEqual({ winner: 1, method: 'challenges' });
  });

  it('DD-CH7: a "delivered" claim counts the order given, even if it was intercepted', () => {
    const m = new Match([['embassy', 'station'], ['hotel', 'harbour']]).round(deliver('embassy'), intercept('embassy'));
    m.claim(0, { kind: 'delivered', loc: 'embassy' });
    const id = m.s.statements.at(-1)!.id;
    expect(m.s.statements.at(-1)!.claim.kind).toBe('delivered');
    m.do(1, { type: 'challenge', round: 2, statement: id });
    expect(m.s.statements.at(-1)!.challenge!.correct).toBe(false);
    expect(m.s.seats[0].challengePoints).toBe(1);
  });

  it('DD-CH8: challenges never end the match', () => {
    const { m, id } = claimed(decoy('hotel'), { kind: 'decoy', loc: 'hotel' });
    challenge(m, 1, id);
    expect(m.s.phase).toBe('briefing');
    expect(m.s.result).toBeNull();
  });

  it('DD-CH9: challenges belong to the briefing', () => {
    const { m, id } = claimed(decoy('hotel'), { kind: 'decoy', loc: 'hotel' });
    m.claim(1, { kind: 'none' }).ack(0).ack(1);
    expect(m.s.phase).toBe('orders');
    expect(m.code(1, { type: 'challenge', round: 2, statement: id })).toBe('wrong-phase');
  });
});

describe('DD-WIN victory', () => {
  const none = decoy('hotel');

  it('DD-WIN1: three deliveries including both mission locations wins at once', () => {
    const m = new Match();
    m.round(deliver('embassy'), none).round(deliver('station'), none);
    expect(m.s.phase).toBe('briefing');
    m.round(deliver('embassy'), none);
    expect(m.s.phase).toBe('over');
    expect(m.s.result).toEqual({ winner: 0, method: 'mission' });
  });

  it('DD-WIN2: three deliveries at one location are not enough', () => {
    const m = new Match();
    for (let i = 0; i < 3; i++) m.round(deliver('embassy'), none);
    expect(m.s.phase).toBe('briefing');
    expect(m.s.seats[0].deliveries).toEqual({ embassy: 3 });
    m.round(deliver('station'), none);
    expect(m.s.result).toEqual({ winner: 0, method: 'mission' });
  });

  it('DD-WIN3: two interceptions wins at once', () => {
    const m = new Match().round(deliver('embassy'), intercept('embassy'));
    expect(m.s.phase).toBe('briefing');
    m.round(deliver('embassy'), intercept('embassy'));
    expect(m.s.result).toEqual({ winner: 1, method: 'counterintelligence' });
  });

  it('DD-WIN4: both completing in the same resolution is a draw', () => {
    const m = new Match();
    m.round(deliver('embassy'), deliver('hotel')).round(deliver('station'), deliver('harbour')).round(deliver('station'), deliver('harbour'));
    expect(m.s.result).toEqual({ winner: null, method: 'simultaneous' });
    const r = results(m.s)!;
    expect(r.every((x) => !x.winner && x.rank === 1)).toBe(true);
  });

  /** Seven rounds in which each seat makes the given delivered totals. */
  function toTheLimit(setupFn: (m: Match) => void) {
    const m = new Match();
    setupFn(m);
    while (m.s.phase !== 'over') m.round(none, none);
    return m;
  }

  it('DD-WIN5: at seven rounds most deliveries wins', () => {
    const m = toTheLimit((x) => void x.round(deliver('embassy'), none).round(deliver('embassy'), deliver('hotel')));
    expect(m.s.rounds).toHaveLength(MAX_ROUNDS);
    expect(m.s.result).toEqual({ winner: 0, method: 'deliveries' });
  });

  it('DD-WIN6: then most interceptions', () => {
    const m = toTheLimit((x) => void x.round(deliver('embassy'), intercept('embassy')));
    expect(m.s.result).toEqual({ winner: 1, method: 'interceptions' });
  });

  it('DD-WIN6a: deliveries outrank interceptions at the limit', () => {
    const m = toTheLimit((x) => void x.round(deliver('embassy'), intercept('embassy')).round(deliver('embassy'), none));
    expect(m.s.seats[0].interceptions).toBe(0);
    expect(m.s.result).toEqual({ winner: 0, method: 'deliveries' });
  });

  it('DD-WIN7: then Challenge Points, then a draw', () => {
    const m = toTheLimit((x) => {
      x.round(none, none);
      x.claim(0, { kind: 'decoy', loc: 'hotel' });
      x.do(1, { type: 'challenge', round: 2, statement: x.s.statements.at(-1)!.id });
    });
    expect(m.s.result).toEqual({ winner: 0, method: 'challenges' });
    expect(toTheLimit(() => {}).s.result).toEqual({ winner: null, method: 'level' });
  });

  it('DD-WIN8: the match ends on the seventh resolution, not before', () => {
    const m = new Match();
    for (let i = 1; i < MAX_ROUNDS; i++) m.round(none, none);
    expect(m.s.round).toBe(MAX_ROUNDS);
    expect(m.s.phase).toBe('briefing');
    m.round(none, none);
    expect(m.s.phase).toBe('over');
  });

  it('DD-WIN9: nothing is accepted after the end', () => {
    const m = toTheLimit(() => {});
    for (const a of [{ type: 'chat', text: 'hi' }, { type: 'continue', round: 7 }, { type: 'claim', round: 7, claim: { kind: 'none' } }] as DAction[]) expect(m.code(0, a)).toBe('game-over');
    expect(actors(m.s)).toEqual([]);
  });

  it('DD-WIN10: results are withheld until the end', () => {
    const m = new Match().round(deliver('embassy'), none);
    expect(results(m.s)).toBeNull();
  });
});

describe('DD-REP intelligence report', () => {
  it('DD-REP1: both must close the report before the next briefing', () => {
    const m = new Match().resolve(decoy('hotel'), decoy('hotel'));
    expect(m.s.phase).toBe('report');
    m.do(0, { type: 'continue', round: 1 });
    expect(m.s.phase).toBe('report');
    expect(m.code(0, { type: 'continue', round: 1 })).toBe('locked');
    m.do(1, { type: 'continue', round: 1 });
    expect(m.s.phase).toBe('briefing');
    expect(m.s.round).toBe(2);
    expect(m.code(0, { type: 'continue', round: 1 })).toBe('wrong-round');
  });
});

describe('DD-TIME inactivity', () => {
  const late = (m: Match, ms: number) => void (m.now = m.s.since + ms);
  const call = (m: Match, seat: number) => m.code(seat, { type: 'callTime', round: m.s.round, phase: m.s.phase });

  it('DD-TIME1: you can only call time once you have done your part, and the clock has run', () => {
    const m = new Match();
    late(m, PHASE_MS.briefing!);
    expect(call(m, 0)).toBe('cannot-call');
    m.claim(0, { kind: 'none' });
    late(m, PHASE_MS.briefing! - 1);
    expect(call(m, 0)).toBe('too-early');
    late(m, PHASE_MS.briefing!);
    expect(call(m, 0)).toBe('ok');
  });

  it('DD-TIME2: no time can be called on a seat that has done its part', () => {
    const m = new Match().brief().order(0, decoy('hotel')).order(1, decoy('hotel')).do(0, { type: 'continue', round: 1 }).do(1, { type: 'continue', round: 1 });
    late(m, PHASE_MS.briefing!);
    m.claim(0, { kind: 'none' }).claim(1, { kind: 'none' }).ack(0);
    expect(call(m, 1)).toBe('cannot-call');
  });

  it('DD-TIME3: time called on Secret Orders stands that seat down: no signal, no action', () => {
    const m = new Match().brief().order(0, deliver('embassy'));
    late(m, PHASE_MS.orders!);
    expect(call(m, 0)).toBe('ok');
    m.do(0, { type: 'callTime', round: 1, phase: 'orders' });
    expect(m.s.phase).toBe('report');
    expect(m.s.rounds[0].orders[1]).toBeNull();
    expect(m.s.rounds[0].signals).toEqual(['embassy', null]);
    expect(m.s.rounds[0].delivered).toEqual([true, false]);
  });

  it('DD-TIME4: a seat stood down has truthfully not delivered', () => {
    const m = new Match().brief().order(1, decoy('hotel'));
    late(m, PHASE_MS.orders!);
    m.do(1, { type: 'callTime', round: 1, phase: 'orders' }).do(0, { type: 'continue', round: 1 }).do(1, { type: 'continue', round: 1 });
    m.claim(0, { kind: 'notDelivered' });
    m.do(1, { type: 'challenge', round: 2, statement: m.s.statements.at(-1)!.id });
    expect(m.s.statements.at(-1)!.challenge!.correct).toBe(false);
  });

  it('DD-TIME5: the report and the briefing move on too; a seat that has gone quiet gets a shorter clock', () => {
    const m = new Match().claim(0, { kind: 'none' });
    late(m, PHASE_MS.briefing!);
    m.do(0, { type: 'callTime', round: 1, phase: 'briefing' });
    expect(m.s.phase).toBe('orders');
    expect(m.s.seats[1].away).toBe(true);
    m.order(0, decoy('hotel'));
    late(m, AWAY_MS - 1);
    expect(call(m, 0)).toBe('too-early');
    late(m, AWAY_MS);
    m.do(0, { type: 'callTime', round: 1, phase: 'orders' });
    expect(m.s.phase).toBe('report');
    m.do(0, { type: 'continue', round: 1 });
    late(m, AWAY_MS);
    m.do(0, { type: 'callTime', round: 1, phase: 'report' });
    expect(m.s.phase).toBe('briefing');
    expect(m.s.round).toBe(2);
  });

  it('DD-TIME6: any action by the quiet seat gives it the full clock back', () => {
    const m = new Match().claim(0, { kind: 'none' });
    late(m, PHASE_MS.briefing!);
    m.do(0, { type: 'callTime', round: 1, phase: 'briefing' }).do(1, { type: 'chat', text: 'back' });
    expect(m.s.seats[1].away).toBe(false);
    m.order(0, decoy('hotel'));
    late(m, AWAY_MS);
    expect(call(m, 0)).toBe('too-early');
  });

  it('DD-TIME7: a call meant for a finished phase does nothing', () => {
    const m = new Match().brief();
    expect(m.code(0, { type: 'callTime', round: 1, phase: 'briefing' })).toBe('wrong-phase');
  });

  it('DD-TIME8: a player who never returns cannot hold the match past seven rounds', () => {
    const m = new Match();
    for (let i = 0; i < 100 && m.s.phase !== 'over'; i++) {
      if (m.s.phase === 'briefing') m.claim(0, { kind: 'none' });
      if (m.s.phase === 'orders') m.order(0, decoy('hotel'));
      if (m.s.phase === 'report') m.do(0, { type: 'continue', round: m.s.round });
      m.now += 200_000;
      if ((m.s.phase as string) !== 'over') m.do(0, { type: 'callTime', round: m.s.round, phase: m.s.phase });
      if (m.s.phase === 'orders') {
        m.order(0, decoy('hotel'));
        m.now += 200_000;
        m.do(0, { type: 'callTime', round: m.s.round, phase: 'orders' });
      }
      if (m.s.phase === 'report') {
        m.do(0, { type: 'continue', round: m.s.round });
        m.now += 200_000;
        m.do(0, { type: 'callTime', round: m.s.round, phase: 'report' });
      }
    }
    expect(m.s.phase).toBe('over');
    expect(m.s.rounds).toHaveLength(7);
  });
});

describe('DD malformed input', () => {
  it('DD-BAD1: nonsense never throws and never changes the state', () => {
    const m = new Match();
    const before = structuredClone(m.s);
    for (const a of [null, undefined, 42, 'x', [], {}, { type: 'nope', round: 1 }, { type: 'order' }, { type: 'order', round: 1 }, { type: 'ack', round: 1 }, { type: 'claim', round: 1 }, { type: 'challenge', round: 1 }])
      expect(m.try(0, a as never).ok).toBe(false);
    expect(m.try(2, { type: 'chat', text: 'hi' }).ok).toBe(false);
    expect(m.s).toEqual(before);
  });

  it('DD-BAD2: apply does not mutate the state it is given', () => {
    const m = new Match().brief();
    const before = structuredClone(m.s);
    m.try(0, { type: 'order', round: 1, order: decoy('hotel') });
    expect(m.s).toEqual(before);
  });
});
