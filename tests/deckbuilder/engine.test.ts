import { describe, expect, it } from 'vitest';
import { createDeckGame, decodeMarket, encodeMarket, randomMarket, selectable, validateMarket, validateRuleset } from '../../src/engine/deckbuilder';
import type { DeckState, DeckView, Effect, Ruleset } from '../../src/engine/deckbuilder';
import { seedRng } from '../../src/engine/rng';
import { act, assertConserved, CARDS, DEFAULT_MARKET, deckOn, game, keysOf, mint, RULES, SELECTABLE, start } from './fixture';

const view = (s: DeckState, seat: number | null) => game.project(s, seat) as DeckView;

/** A game where seat `s.turn.seat` holds exactly these cards. */
function holding(keys: string[], players = 2, others: string[][] = []) {
  const s = start(players);
  const me = s.turn.seat;
  s.players[me].discard.push(...s.players[me].hand.splice(0));
  const ids = keys.map((k) => mint(s, me, k));
  others.forEach((list, i) => {
    const seat = (me + 1 + i) % players;
    s.players[seat].discard.push(...s.players[seat].hand.splice(0));
    for (const k of list) mint(s, seat, k);
  });
  return { s, me, ids };
}

const idsIn = (s: DeckState, seat: number, key: string) => s.players[seat].hand.filter((id) => s.cards[id] === key);

describe('setup', () => {
  it('DB-SETUP-1: deals the starting deck and hand, and conserves every card', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const s = start(n);
      expect(s.players).toHaveLength(n);
      for (const p of s.players) {
        expect(p.hand).toHaveLength(5);
        expect(p.deck).toHaveLength(5);
      }
      assertConserved(s);
    }
  });

  it('DB-SETUP-2: the same seed gives the same game; another seed does not', () => {
    expect(start(3, DEFAULT_MARKET, 'a')).toEqual(start(3, DEFAULT_MARKET, 'a'));
    expect(start(3, DEFAULT_MARKET, 'a').players).not.toEqual(start(3, DEFAULT_MARKET, 'b').players);
  });

  it('DB-SETUP-3: pile counts follow the ruleset for the player count', () => {
    expect(start(2).supply.point5).toHaveLength(8);
    expect(start(5).supply.point5).toHaveLength(15);
    expect(start(6).supply.minus1).toHaveLength(50);
  });

  it('DB-SETUP-4: an empty market config generates one, never with banned or draft cards', () => {
    const s = game.setup({ playerCount: 2, seed: 'x', config: { market: [], bans: ['draw2'] } });
    expect(s.market).toHaveLength(10);
    expect(s.market).not.toContain('draw2');
    expect(s.market).not.toContain('unfinished');
  });
});

describe('market selection', () => {
  it('DB-MARKET-1: rejects wrong sizes, duplicates, draft and banned cards', () => {
    expect(validateMarket(RULES, DEFAULT_MARKET)).toBeNull();
    expect(validateMarket(RULES, DEFAULT_MARKET.slice(1))).toMatch(/exactly 10/);
    expect(validateMarket(RULES, [...DEFAULT_MARKET.slice(1), DEFAULT_MARKET[1]])).toMatch(/once/);
    expect(validateMarket(RULES, [...DEFAULT_MARKET.slice(1), 'unfinished'])).toMatch(/not available/);
    expect(validateMarket(RULES, [...DEFAULT_MARKET.slice(1), 'coin1'])).toMatch(/not available/);
    expect(validateMarket(RULES, DEFAULT_MARKET, ['draw2'])).toMatch(/not available/);
    expect(selectable(RULES).map((c) => c.key)).toEqual(SELECTABLE);
  });

  it('DB-MARKET-2: share codes rebuild the same market, and bad codes explain themselves', () => {
    const code = encodeMarket(RULES, DEFAULT_MARKET);
    const decoded = decodeMarket(RULES, code);
    expect('keys' in decoded && [...decoded.keys].sort()).toEqual([...DEFAULT_MARKET].sort());
    expect(encodeMarket(RULES, [...DEFAULT_MARKET].reverse())).toBe(code);
    expect(decodeMarket(RULES, 'nonsense')).toHaveProperty('error');
    expect(decodeMarket(RULES, code.replace('fixture', 'other'))).toHaveProperty('error');
    expect(decodeMarket(RULES, code.replace('draw2', 'unfinished'))).toHaveProperty('error');
  });

  it('DB-MARKET-3: random generation is reproducible from its seed', () => {
    expect(randomMarket(RULES, seedRng('k'))).toEqual(randomMarket(RULES, seedRng('k')));
  });

  it('DB-MARKET-4: the same market with a different seed shuffles differently', () => {
    const a = start(2, DEFAULT_MARKET, 'one');
    const b = start(2, DEFAULT_MARKET, 'two');
    expect(a.market).toEqual(b.market);
    expect(a.rng).not.toEqual(b.rng);
  });
});

describe('ruleset validation', () => {
  const base: Ruleset = { ...RULES, cards: CARDS };
  const withEffect = (fx: unknown): Ruleset => ({
    ...base,
    cards: [...CARDS, { key: 'bad', name: 'bad', cost: 1, types: ['action'], text: '', status: 'ready', effects: [fx as Effect] }],
  });

  it('DB-DEF-1: the fixture is valid', () => {
    expect(validateRuleset(base)).toEqual([]);
  });

  it('DB-DEF-2: unknown effects, cards and handlers are refused before any game starts', () => {
    expect(validateRuleset(withEffect({ op: 'explode' })).join()).toMatch(/unknown effect/);
    expect(validateRuleset(withEffect({ op: 'gain', pile: 'nope' })).join()).toMatch(/unknown card/);
    expect(validateRuleset(withEffect({ op: 'custom', handler: 'nope' })).join()).toMatch(/unknown handler/);
    expect(validateRuleset(withEffect({ op: 'if', cond: { has: 'x' }, then: [{ op: 'explode' }] })).join()).toMatch(/unknown effect/);
    expect(() => createDeckGame(withEffect({ op: 'explode' }))).toThrow(/invalid ruleset/);
  });

  it('DB-DEF-3: duplicate cards and undeclared reactions are refused', () => {
    expect(validateRuleset({ ...base, cards: [...CARDS, CARDS[0]] }).join()).toMatch(/duplicate/);
    expect(validateRuleset({ ...base, cards: [...CARDS, { ...CARDS[5], key: 'r', reaction: { label: 'x', effects: [] } }] }).join()).toMatch(/not typed/);
  });
});

describe('turn structure', () => {
  it('DB-TURN-1: a turn starts with one action, one buy and no coins, in the action phase', () => {
    const v = view(start(), 0);
    expect(v.turn).toMatchObject({ phase: 'action', actions: 1, buys: 1, coins: 0 });
  });

  it('DB-TURN-2: phases change only when the player says so', () => {
    const { s, me } = holding(['coin1']);
    expect(s.turn.phase).toBe('action');
    const buy = act(s, me, { type: 'end-phase' });
    expect(buy.turn.phase).toBe('buy');
    expect(buy.turn.seat).toBe(me);
    expect(act(buy, me, { type: 'end-phase' }).turn.seat).toBe((me + 1) % 2);
  });

  it('DB-TURN-3: treasures are played one at a time and never automatically', () => {
    const { s, me, ids } = holding(['coin1', 'coin2']);
    let t = act(s, me, { type: 'end-phase' });
    expect(t.turn.coins).toBe(0);
    t = act(t, me, { type: 'play', card: ids[1] });
    expect(t.turn.coins).toBe(2);
    t = act(t, me, { type: 'play', card: ids[0] });
    expect(t.turn.coins).toBe(3);
  });

  it('DB-TURN-4: a played action spends an action; with none left, it explains why not', () => {
    const { s, me, ids } = holding(['draw2', 'draw2']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.turn.actions).toBe(0);
    const r = game.apply(t, me, { type: 'play', card: ids[1] });
    expect(r).toMatchObject({ ok: false, code: 'illegal-play', error: 'You have no actions left.' });
  });

  it('DB-TURN-5: illegal plays explain themselves', () => {
    const { s, me, ids } = holding(['coin1', 'draw2']);
    expect(game.apply(s, me, { type: 'play', card: ids[0] })).toMatchObject({ ok: false, error: 'Only actions can be played in this phase.' });
    const buy = act(s, me, { type: 'end-phase' });
    expect(game.apply(buy, me, { type: 'play', card: ids[1] })).toMatchObject({ ok: false, error: 'Only treasures can be played in this phase.' });
    expect(game.apply(buy, me, { type: 'play', card: 99999 })).toMatchObject({ ok: false, code: 'not-in-hand' });
    expect(game.apply(s, (me + 1) % 2, { type: 'end-phase' })).toMatchObject({ ok: false, code: 'not-your-turn' });
  });

  it('DB-TURN-6: buying needs the buy phase, a buy and enough coins, and spends them', () => {
    const { s, me, ids } = holding(['coin2', 'coin2']);
    expect(game.apply(s, me, { type: 'buy', pile: 'point1' })).toMatchObject({ ok: false, error: 'Move to the buy phase first.' });
    let t = act(s, me, { type: 'end-phase' });
    expect(game.apply(t, me, { type: 'buy', pile: 'point1' })).toMatchObject({ ok: false, error: 'You do not have enough coins.' });
    t = act(t, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'play', card: ids[1] });
    const before = t.supply.coin2.length;
    t = act(t, me, { type: 'buy', pile: 'coin2' });
    expect(t.turn).toMatchObject({ coins: 1, buys: 0 });
    expect(t.supply.coin2).toHaveLength(before - 1);
    expect(keysOf(t, t.players[me].discard)).toContain('coin2');
    expect(game.apply(t, me, { type: 'buy', pile: 'coin1' })).toMatchObject({ ok: false, error: 'You have no buys left.' });
  });

  it('DB-TURN-7: treasures cannot be played after buying', () => {
    const { s, me, ids } = holding(['coin1']);
    let t = act(s, me, { type: 'end-phase' });
    t = act(t, me, { type: 'buy', pile: 'coin1' });
    expect(game.apply(t, me, { type: 'play', card: ids[0] })).toMatchObject({ ok: false, error: 'Treasures must be played before buying.' });
  });

  it('DB-TURN-8: unbuyable and unknown piles are refused', () => {
    const { s, me } = holding([]);
    const t = act(s, me, { type: 'end-phase' });
    expect(game.apply(t, me, { type: 'buy', pile: 'minus1' })).toMatchObject({ ok: false, error: 'That card cannot be bought.' });
    expect(game.apply(t, me, { type: 'buy', pile: '__proto__' })).toMatchObject({ ok: false, code: 'bad-pile' });
    expect(game.apply(t, me, { type: 'buy', pile: 'per3' })).toMatchObject({ ok: false, code: 'bad-pile' });
  });

  it('DB-TURN-9: cleanup discards hand and play, draws a new hand, and passes the turn', () => {
    const { s, me, ids } = holding(['draw2', 'point1']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'end-phase' });
    expect(t.players[me].play).toEqual([]);
    expect(t.players[me].hand).toHaveLength(5);
    expect(t.turn).toMatchObject({ seat: (me + 1) % 2, actions: 1, buys: 1, coins: 0, phase: 'action' });
    assertConserved(t);
  });

  it('DB-TURN-10: drawing from an empty deck shuffles the discard pile, keeps the draw going, and stops when both are empty', () => {
    const { s, me, ids } = holding(['draw2']);
    const p = s.players[me];
    p.discard.push(...p.deck.splice(0));
    const count = p.discard.length;
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.players[me].hand).toHaveLength(2);
    expect(t.players[me].deck).toHaveLength(count - 2);
    expect(t.players[me].discard).toHaveLength(0);
    assertConserved(t);
    const short = holding(['draw2']);
    const q = short.s.players[short.me];
    short.s.trash.push(...q.deck.splice(1), ...q.discard.splice(0));
    const u = act(short.s, short.me, { type: 'play', card: short.ids[0] });
    expect(u.players[short.me].hand).toHaveLength(1);
    assertConserved(u);
  });

  it('DB-TURN-11: the hand is never reordered', () => {
    const { s, me, ids } = holding(['coin1', 'coin2', 'point1', 'draw2']);
    deckOn(s, me, ['point5', 'coin2']);
    const t = act(s, me, { type: 'play', card: ids[3] });
    expect(t.players[me].hand.slice(0, 3)).toEqual(ids.slice(0, 3));
    expect(keysOf(t, t.players[me].hand.slice(3))).toEqual(['point5', 'coin2']);
  });
});

describe('effect primitives', () => {
  it('DB-FX-1: resources add up, and tokens and points stay with the player', () => {
    const { s, me, ids } = holding(['resources']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.turn).toMatchObject({ actions: 2, buys: 2, coins: 2 });
    expect(t.players[me].tokens.gem).toBe(1);
    expect(t.players[me].vp).toBe(1);
  });

  it('DB-FX-2: an optional choice allows zero, up to the limit, and no more', () => {
    const { s, me, ids } = holding(['trash-up-to-2', 'coin1', 'coin1', 'point1']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    const q = t.pending!;
    expect(q).toMatchObject({ seat: me, min: 0, max: 2, optional: true });
    expect(game.apply(t, me, { type: 'decide', id: q.id, cards: ids.slice(1, 4) })).toMatchObject({ ok: false, code: 'illegal-choice' });
    const none = act(t, me, { type: 'decide', id: q.id, cards: [] });
    expect(none.trash).toEqual([]);
    expect(none.pending).toBeNull();
    const two = act(t, me, { type: 'decide', id: q.id, cards: ids.slice(1, 3) });
    expect(two.trash).toEqual(ids.slice(1, 3));
  });

  it('DB-FX-3: a mandatory choice needs the exact count, and is limited by what is there', () => {
    const { s, me, ids } = holding(['discard-exactly-2', 'coin1', 'coin1', 'coin1']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toMatchObject({ min: 2, max: 2, optional: false });
    expect(game.apply(t, me, { type: 'decide', id: t.pending!.id, cards: ids.slice(1, 2) })).toMatchObject({ ok: false, error: 'Choose exactly 2.' });
    const short = holding(['discard-exactly-2', 'coin1']);
    const u = act(short.s, short.me, { type: 'play', card: short.ids[0] });
    expect(u.pending).toBeNull();
    expect(u.players[short.me].hand).toEqual([]);
    expect(u.players[short.me].discard).toContain(short.ids[1]);
  });

  it('DB-FX-4: decisions reject duplicates, foreign cards, stale ids, and the wrong player', () => {
    const { s, me, ids } = holding(['discard-exactly-2', 'coin1', 'coin1', 'coin1']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    const id = t.pending!.id;
    const answer = (cards: unknown, seat = me, did = id) => game.apply(t, seat, { type: 'decide', id: did, cards: cards as number[] });
    expect(answer([ids[1], ids[1]])).toMatchObject({ ok: false, error: 'A card can only be chosen once.' });
    expect(answer([ids[1], 99999])).toMatchObject({ ok: false, code: 'illegal-choice' });
    expect(answer('x')).toMatchObject({ ok: false, code: 'illegal-choice' });
    expect(answer([ids[1], ids[2]], (me + 1) % 2)).toMatchObject({ ok: false, code: 'not-your-decision' });
    expect(answer([ids[1], ids[2]], me, id + 1)).toMatchObject({ ok: false, code: 'stale-decision' });
    expect(game.apply(t, me, { type: 'end-phase' })).toMatchObject({ ok: false, code: 'decision-first' });
  });

  it('DB-FX-5: an answer can feed the next choice: gain up to the trashed card’s cost plus two', () => {
    const forced = holding(['upgrade', 'point1']);
    const skipped = act(forced.s, forced.me, { type: 'play', card: forced.ids[0] });
    expect(skipped.trash).toEqual([forced.ids[1]]);
    expect(skipped.pending!.kind).toBe('pile');
    const seeded = holding(['upgrade', 'point1', 'coin1']);
    let t = act(seeded.s, seeded.me, { type: 'play', card: seeded.ids[0] });
    t = act(t, seeded.me, { type: 'decide', id: t.pending!.id, cards: [seeded.ids[1]] });
    expect(t.pending!.kind).toBe('pile');
    expect(t.pending!.piles).toContain('coin2');
    expect(t.pending!.piles).not.toContain('point5');
    expect(game.apply(t, seeded.me, { type: 'decide', id: t.pending!.id, pile: 'point5' })).toMatchObject({ ok: false, code: 'illegal-choice' });
    t = act(t, seeded.me, { type: 'decide', id: t.pending!.id, pile: 'coin2' });
    expect(keysOf(t, t.players[seeded.me].hand)).toEqual(['coin1', 'coin2']);
  });

  it('DB-FX-6: a topdecked card is drawn next, and the move is private', () => {
    const { s, me, ids } = holding(['topdeck', 'point5', 'coin1']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(t.players[me].deck.at(-1)).toBe(ids[1]);
    expect(JSON.stringify(view(t, (me + 1) % 2).log)).not.toContain('point5');
    expect(JSON.stringify(view(t, me).log)).toContain('point5');
  });

  it('DB-FX-7: cards on a mat are the owner’s to see, and count for scoring', () => {
    const { s, me, ids } = holding(['stash', 'point5', 'coin1']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(view(t, me).players[me].mats.stash.cards).toEqual([{ id: ids[1], key: 'point5' }]);
    const other = view(t, (me + 1) % 2).players[me].mats.stash;
    expect(other).toEqual({ count: 1 });
    expect(JSON.stringify(view(t, (me + 1) % 2))).not.toContain(`"id":${ids[1]},`);
  });

  it('DB-FX-8: looking is private, the rest is handled, and limbo empties', () => {
    const { s, me, ids } = holding(['look2']);
    deckOn(s, me, ['point5', 'coin2']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    const q = view(t, me).pending!;
    expect(q.cards!.map((c) => c.key)).toEqual(['point5', 'coin2']);
    const other = view(t, (me + 1) % 2);
    expect(other.pending!.cards).toBeUndefined();
    expect(JSON.stringify(other.log)).not.toContain('point5');
    expect(other.revealed).toEqual([]);
    for (const c of q.cards!) expect(JSON.stringify(other)).not.toContain(`"id":${c.id},`);
    t = act(t, me, { type: 'decide', id: q.id, cards: [q.cards![1].id] });
    expect(keysOf(t, t.players[me].hand)).toEqual(['coin2']);
    expect(keysOf(t, t.players[me].discard)).toContain('point5');
    expect(t.limbo).toEqual([]);
  });

  it('DB-FX-9: revealing is public and conditions branch on it (both branches)', () => {
    const treasure = holding(['reveal1']);
    deckOn(treasure.s, treasure.me, ['coin2']);
    const a = act(treasure.s, treasure.me, { type: 'play', card: treasure.ids[0] });
    expect(keysOf(a, a.players[treasure.me].hand)).toEqual(['coin2']);
    expect(JSON.stringify(view(a, (treasure.me + 1) % 2).log)).toContain('coin2');
    const other = holding(['reveal1']);
    deckOn(other.s, other.me, ['point5']);
    const b = act(other.s, other.me, { type: 'play', card: other.ids[0] });
    expect(b.players[other.me].hand).toEqual([]);
    expect(keysOf(b, b.players[other.me].discard)).toContain('point5');
  });

  it('DB-FX-10: nested choices resolve in order, across both branches and both answers', () => {
    const setup = () => holding(['option', 'coin1']);
    const { s, me, ids } = setup();
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toMatchObject({ kind: 'option', optional: false });
    const drew = act(t, me, { type: 'decide', id: t.pending!.id, option: 0 });
    expect(drew.players[me].hand).toHaveLength(2);
    t = act(t, me, { type: 'decide', id: t.pending!.id, option: 1 });
    expect(t.pending!.prompt).toBe('Gain a coin2?');
    expect(t.trash).toEqual([ids[1]]);
    const two = holding(['option', 'coin1', 'coin1']);
    let u = act(two.s, two.me, { type: 'play', card: two.ids[0] });
    u = act(u, two.me, { type: 'decide', id: u.pending!.id, option: 1 });
    expect(u.pending!.kind).toBe('cards');
    u = act(u, two.me, { type: 'decide', id: u.pending!.id, cards: [two.ids[1]] });
    expect(u.pending).toMatchObject({ kind: 'option', optional: true });
    const yes = act(u, two.me, { type: 'decide', id: u.pending!.id, option: 0 });
    expect(keysOf(yes, yes.players[two.me].discard)).toContain('coin2');
    expect(yes.turn.coins).toBe(0);
    const no = act(u, two.me, { type: 'decide', id: u.pending!.id, option: 1 });
    expect(no.turn.coins).toBe(1);
    expect(game.apply(u, two.me, { type: 'decide', id: u.pending!.id, option: 2 })).toMatchObject({ ok: false, code: 'illegal-choice' });
  });

  it('DB-FX-11: repeat runs its effects that many times', () => {
    const { s, me, ids } = holding(['repeat3']);
    expect(act(s, me, { type: 'play', card: ids[0] }).turn.coins).toBe(3);
  });

  it('DB-FX-12: replaying plays a card twice for one action, or not at all', () => {
    const { s, me, ids } = holding(['replay2', 'repeat3']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    const none = act(t, me, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(none.turn.coins).toBe(0);
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(t.turn.coins).toBe(6);
    expect(t.players[me].play).toEqual(ids);
  });

  it('DB-FX-13: replaying a card that trashes itself keeps its effects and does not resurrect it', () => {
    const { s, me, ids } = holding(['replay2', 'self-trash']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(t.turn.coins).toBe(2);
    expect(t.trash).toEqual([ids[1]]);
    assertConserved(t);
  });

  it('DB-FX-14: nested replay multiplies (replay of a replay of a card)', () => {
    const { s, me, ids } = holding(['replay2', 'replay2', 'repeat3', 'repeat3']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[2]] });
    // The inner card's second play has no action left in hand to choose from except the other.
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[3]] });
    expect(t.turn.coins).toBe(12);
  });

  it('DB-FX-15: cost changes affect matching cards until cleanup, and never go below zero', () => {
    const { s, me, ids } = holding(['discount']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    const cost = (x: DeckState, k: string) => view(x, me).supply.find((p) => p.key === k)!.cost;
    expect(cost(t, 'draw2')).toBe(2);
    expect(cost(t, 'coin2')).toBe(3);
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'end-phase' });
    expect(cost(t, 'draw2')).toBe(3);
    const low = holding(['discount']);
    low.s.turn.costMods.push({ delta: -9 });
    expect(view(low.s, low.me).supply.find((p) => p.key === 'coin2')!.cost).toBe(0);
  });

  it('DB-FX-16: shuffling puts the discard pile into the deck', () => {
    const { s, me, ids } = holding(['reshuffle']);
    const before = s.players[me].deck.length + s.players[me].discard.length;
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.players[me].discard).toEqual([]);
    expect(t.players[me].deck).toHaveLength(before);
  });

  it('DB-FX-17: custom handlers run by name with typed arguments', () => {
    const { s, me, ids } = holding(['custom']);
    expect(act(s, me, { type: 'play', card: ids[0] }).turn.coins).toBe(3);
  });

  it('DB-FX-18: a card gains another turn for its player', () => {
    const { s, me, ids } = holding(['another-turn']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'end-phase' });
    expect(t.turn.seat).toBe(me);
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'end-phase' });
    expect(t.turn.seat).toBe((me + 1) % 2);
  });
});

describe('attacks and reactions', () => {
  it('DB-ATT-1: an attack asks each opponent in turn order, then returns to the attacker', () => {
    const { s, me, ids } = holding(['hit-discard'], 3, [['coin1', 'point1'], ['coin1', 'point1']]);
    const a = (me + 1) % 3;
    const b = (me + 2) % 3;
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(game.actors(t)).toEqual([a]);
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [t.players[a].hand[0]] });
    expect(game.actors(t)).toEqual([b]);
    t = act(t, b, { type: 'decide', id: t.pending!.id, cards: [t.players[b].hand[1]] });
    expect(game.actors(t)).toEqual([me]);
    expect(t.players[a].hand).toHaveLength(1);
    expect(t.players[b].hand).toHaveLength(1);
  });

  it('DB-ATT-2: a revealed reaction makes that player immune, and the others are still hit', () => {
    const { s, me, ids } = holding(['hit-penalty'], 3, [['shield'], ['coin1']]);
    const a = (me + 1) % 3;
    const b = (me + 2) % 3;
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toMatchObject({ seat: a, kind: 'react', optional: true });
    expect(t.turn.coins).toBe(0);
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [idsIn(t, a, 'shield')[0]] });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(t.turn.coins).toBe(1);
    expect(keysOf(t, t.players[a].discard)).not.toContain('minus1');
    expect(keysOf(t, t.players[b].discard)).toContain('minus1');
    expect(t.players[a].hand).toHaveLength(1);
  });

  it('DB-ATT-3: declining the reaction means taking the attack', () => {
    const { s, me, ids } = holding(['hit-penalty'], 2, [['shield']]);
    const a = (me + 1) % 2;
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(keysOf(t, t.players[a].discard)).toContain('minus1');
  });

  it('DB-ATT-4: without a reaction there is no prompt', () => {
    const { s, me, ids } = holding(['hit-penalty'], 2, [['coin1']]);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toBeNull();
  });

  it('DB-ATT-5: replaying an attack opens a reaction window for each play', () => {
    const { s, me, ids } = holding(['replay2', 'hit-penalty'], 2, [['shield']]);
    const a = (me + 1) % 2;
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(t.pending!.kind).toBe('react');
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(t.pending!.kind).toBe('react');
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [idsIn(t, a, 'shield')[0]] });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(keysOf(t, t.players[a].discard).filter((k) => k === 'minus1')).toHaveLength(1);
    expect(t.turn.coins).toBe(2);
  });

  it('DB-ATT-6: an empty penalty pile just stops giving penalties', () => {
    const { s, me, ids } = holding(['hit-penalty'], 3);
    s.supply.minus1 = s.supply.minus1.slice(0, 1);
    const count = Object.keys(s.cards).length;
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.supply.minus1).toEqual([]);
    expect(Object.keys(t.cards)).toHaveLength(count);
  });

  it('DB-ATT-7: non-attack effects on others cannot be blocked', () => {
    const { s, me, ids } = holding(['bonus-all'], 2, [['shield']]);
    const a = (me + 1) % 2;
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toBeNull();
    expect(t.players[a].hand).toHaveLength(2);
  });
});

describe('durations and delayed effects', () => {
  const pass = (t: DeckState) => {
    const seat = t.turn.seat;
    return act(act(t, seat, { type: 'end-phase' }), seat, { type: 'end-phase' });
  };

  it('DB-DUR-1: a duration stays in play through cleanup, fires next turn, then leaves', () => {
    const { s, me, ids } = holding(['later']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = pass(t);
    expect(t.players[me].play).toEqual(ids);
    t = pass(t);
    expect(t.turn).toMatchObject({ seat: me, coins: 2 });
    expect(t.players[me].play).toEqual(ids);
    t = pass(t);
    expect(t.players[me].play).toEqual([]);
    const p = t.players[me];
    expect([...p.hand, ...p.deck, ...p.discard]).toContain(ids[0]);
    assertConserved(t);
  });

  it('DB-DUR-2: replaying a duration fires it twice, and the replayer stays too', () => {
    const { s, me, ids } = holding(['replay2', 'later']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    t = pass(t);
    expect(t.players[me].play).toEqual(ids);
    t = pass(t);
    expect(t.pending!.kind).toBe('order');
    t = act(t, me, { type: 'decide', id: t.pending!.id, option: 0 });
    expect(t.turn.coins).toBe(4);
    t = pass(t);
    expect(t.players[me].play).toEqual([]);
  });

  it('DB-DUR-3: several delays due together: the player orders them', () => {
    const { s, me, ids } = holding(['resources', 'later', 'later2']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'play', card: ids[1] });
    t = act(t, me, { type: 'play', card: ids[2] });
    t = pass(t);
    t = pass(t);
    expect(t.pending).toMatchObject({ kind: 'order', seat: me });
    expect(t.pending!.options).toEqual(['Coins next turn', 'Draw next turn']);
    const first = act(t, me, { type: 'decide', id: t.pending!.id, option: 1 });
    expect(first.turn.coins).toBe(2);
    expect(first.players[me].hand).toHaveLength(6);
  });

  it('DB-DUR-4: delayed effects survive being persisted', () => {
    const { s, me, ids } = holding(['later']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = pass(t);
    t = JSON.parse(JSON.stringify(t));
    t = pass(t);
    expect(t.turn.coins).toBe(2);
  });
});

describe('triggers', () => {
  it('DB-TRIG-1: a trigger on a card in play fires for its holder’s gains', () => {
    const { s, me, ids } = holding(['resources', 'watcher-a']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'play', card: ids[1] });
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.turn.coins).toBe(3);
  });

  it('DB-TRIG-2: simultaneous triggers: the player picks the order, and it matters to the result', () => {
    const { s, me, ids } = holding(['resources', 'watcher-a', 'watcher-b']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'play', card: ids[1] });
    t = act(t, me, { type: 'play', card: ids[2] });
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.pending).toMatchObject({ kind: 'order', seat: me });
    expect(t.pending!.options).toEqual(['A', 'B']);
    expect(view(t, (me + 1) % 2).pending!.options).toBeUndefined();
    t = act(t, me, { type: 'decide', id: t.pending!.id, option: 1 });
    expect(t.pending).toBeNull();
    expect(t.turn.coins).toBe(13);
  });

  it('DB-TRIG-3: a card’s own gain trigger can move it, and declining leaves it', () => {
    const { s, me } = holding(['coin2', 'coin2']);
    s.supply['gains-to-deck'] = [mint(s, me, 'gains-to-deck')];
    s.players[me].hand.pop();
    const before = s.players[me].deck.length;
    let t = act(s, me, { type: 'end-phase' });
    t = act(t, me, { type: 'play', card: t.players[me].hand[0] });
    t = act(t, me, { type: 'play', card: t.players[me].hand[0] });
    t = act(t, me, { type: 'buy', pile: 'gains-to-deck' });
    expect(t.pending).toMatchObject({ kind: 'option', optional: true });
    const yes = act(t, me, { type: 'decide', id: t.pending!.id, option: 0 });
    expect(yes.players[me].deck).toHaveLength(before + 1);
    expect(keysOf(yes, [yes.players[me].deck.at(-1)!])).toEqual(['gains-to-deck']);
    const no = act(t, me, { type: 'decide', id: t.pending!.id, option: 1 });
    expect(keysOf(no, no.players[me].discard)).toContain('gains-to-deck');
  });

  it('DB-TRIG-4: a temporary trigger lasts only until cleanup', () => {
    const { s, me, ids } = holding(['temp-trigger']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.turn.coins).toBe(1);
    t = act(t, me, { type: 'end-phase' });
    expect(t.temps).toEqual([]);
  });
});

describe('ending and scoring', () => {
  const finish = (s: DeckState) => {
    const seat = s.turn.seat;
    return act(act(s, seat, { type: 'end-phase' }), seat, { type: 'end-phase' });
  };

  it('DB-END-1: emptying an end pile finishes the game after that turn, not at once', () => {
    const { s, me } = holding(['coin2', 'coin2', 'coin2', 'coin2']);
    s.supply.point5 = [];
    const t = act(s, me, { type: 'end-phase' });
    expect(t.over).toBe(false);
    expect(finish(s).over).toBe(true);
    expect(game.apply(finish(s), me, { type: 'end-phase' })).toMatchObject({ ok: false, code: 'game-over' });
  });

  it('DB-END-2: the empty-pile threshold follows the player count', () => {
    const emptied = (players: number, count: number) => {
      const s = start(players);
      DEFAULT_MARKET.slice(0, count).forEach((k) => (s.supply[k] = []));
      return finish(s).over;
    };
    expect(emptied(4, 2)).toBe(false);
    expect(emptied(4, 3)).toBe(true);
    expect(emptied(5, 3)).toBe(false);
    expect(emptied(5, 4)).toBe(true);
  });

  it('DB-END-3: scores count cards everywhere, tokens, penalties and per-count values', () => {
    const s = start(2);
    s.players[0] = { deck: [], hand: [], discard: [], play: [], mats: {}, tokens: {}, vp: 2, turns: 3 };
    s.players[1] = { deck: [], hand: [], discard: [], play: [], mats: {}, tokens: {}, vp: 0, turns: 3 };
    const make = (key: string) => {
      const id = Math.max(...Object.keys(s.cards).map(Number)) + 1;
      s.cards[id] = key;
      return id;
    };
    s.players[0].deck.push(make('point5'));
    s.players[0].mats.stash = [make('point1')];
    s.players[0].hand.push(make('minus1'));
    s.players[1].discard.push(make('per3'), make('coin1'), make('coin1'), make('coin1'), make('coin1'), make('coin1'));
    s.supply.point5 = [];
    s.over = true;
    const v = view(s, 0);
    expect(v.final![0].total).toBe(2 + 5 + 1 - 1);
    expect(v.final![1].total).toBe(2);
    expect(v.final![0].cards.find((c) => c.key === 'point5')).toEqual({ key: 'point5', count: 1, vp: 5 });
    expect(game.results(s)).toEqual([
      { seat: 0, score: 7, rank: 1, winner: true },
      { seat: 1, score: 2, rank: 2, winner: false },
    ]);
  });

  it('DB-END-4: a tied score goes to fewer turns; equal turns share the win', () => {
    const s = start(3);
    s.over = true;
    for (const p of s.players) {
      p.deck = [];
      p.hand = [];
      p.discard = [];
      p.vp = 4;
      p.turns = 5;
    }
    s.players[1].turns = 6;
    const r = game.results(s)!;
    expect(r.map((x) => x.rank)).toEqual([1, 3, 1]);
    expect(r.filter((x) => x.winner).map((x) => x.seat)).toEqual([0, 2]);
  });

  it('DB-END-5: while the game runs there are no results', () => {
    const s = start();
    expect(game.results(s)).toBeNull();
    expect(view(s, 0).final).toBeNull();
  });
});

describe('undo', () => {
  const undoable = (s: DeckState, seat: number, a: Parameters<typeof game.apply>[2]) => {
    const r = game.apply(s, seat, a);
    if (!r.ok) throw new Error(r.error);
    return r.undoable;
  };

  it('DB-UNDO-1: playing a plain treasure, buying and changing phase can be undone', () => {
    const { s, me, ids } = holding(['coin1']);
    expect(undoable(s, me, { type: 'end-phase' })).toBe(true);
    const t = act(s, me, { type: 'end-phase' });
    expect(undoable(t, me, { type: 'play', card: ids[0] })).toBe(true);
    expect(undoable(t, me, { type: 'buy', pile: 'coin1' })).toBe(true);
  });

  it('DB-UNDO-2: anything that shows new information cannot', () => {
    const draw = holding(['draw2']);
    expect(undoable(draw.s, draw.me, { type: 'play', card: draw.ids[0] })).toBe(false);
    const look = holding(['look2']);
    expect(undoable(look.s, look.me, { type: 'play', card: look.ids[0] })).toBe(false);
    const reveal = holding(['reveal1']);
    expect(undoable(reveal.s, reveal.me, { type: 'play', card: reveal.ids[0] })).toBe(false);
  });

  it('DB-UNDO-3: anything touching another player cannot', () => {
    const hit = holding(['hit-penalty']);
    expect(undoable(hit.s, hit.me, { type: 'play', card: hit.ids[0] })).toBe(false);
  });

  it('DB-UNDO-4: ending the turn cannot', () => {
    const { s, me } = holding([]);
    const t = act(s, me, { type: 'end-phase' });
    expect(undoable(t, me, { type: 'end-phase' })).toBe(false);
  });
});

describe('robustness', () => {
  it('DB-ROBUST-1: apply never mutates its input', () => {
    const { s, me, ids } = holding(['draw2']);
    const before = JSON.stringify(s);
    game.apply(s, me, { type: 'play', card: ids[0] });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('DB-ROBUST-2: malformed actions are refused, never thrown', () => {
    const { s, me } = holding(['trash-up-to-2', 'coin1']);
    const bad: unknown[] = [null, 1, 'x', {}, { type: 'nope' }, { type: 'play' }, { type: 'play', card: 'a' }, { type: 'buy' }, { type: 'buy', pile: 7 }, { type: 'decide' }, { type: 'decide', id: 'x' }];
    for (const a of bad) expect(game.apply(s, me, a as never).ok).toBe(false);
    const t = act(s, me, { type: 'play', card: s.players[me].hand[0] });
    const answers: unknown[] = [{ cards: 'x' }, { cards: [null] }, { cards: [1.5] }, { cards: [{}] }, { cards: { length: 0 } }];
    for (const extra of answers) expect(game.apply(t, me, { type: 'decide', id: t.pending!.id, ...(extra as object) }).ok).toBe(false);
  });

  it('DB-ROBUST-3: a resolution that never ends is stopped, and the game before it is intact', () => {
    const loop = createDeckGame({
      ...RULES,
      id: 'loop',
      cards: [...CARDS, { key: 'loop', name: 'loop', cost: 1, types: ['action'], text: '', status: 'ready', effects: [{ op: 'custom', handler: 'again' }] }],
      handlers: {
        ...RULES.handlers,
        again: (rt) => rt.queue([{ op: 'custom', handler: 'again' }]),
      },
    });
    const s = loop.setup({ playerCount: 2, seed: 'x', config: { market: DEFAULT_MARKET, bans: [] } });
    const me = s.turn.seat;
    const id = mint(s, me, 'loop');
    const before = JSON.stringify(s);
    expect(() => loop.apply(s, me, { type: 'play', card: id })).toThrow(/did not terminate/);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('hidden information', () => {
  it('DB-PRIV-1: another player sees counts, never hand or deck contents', () => {
    const s = start(3);
    const v = view(s, 1);
    expect(v.hand.map((c) => c.id)).toEqual(s.players[1].hand);
    expect(v.players[0].handCount).toBe(5);
    expect(v.players[0].deckCount).toBe(5);
    const text = JSON.stringify(v);
    for (const seat of [0, 2]) for (const id of [...s.players[seat].hand, ...s.players[seat].deck]) expect(text).not.toContain(`"id":${id},`);
    for (const id of s.players[1].deck) expect(text).not.toContain(`"id":${id},`);
  });

  it('DB-PRIV-2: a spectator sees no hand, no discard contents and no decision options', () => {
    const { s, me, ids } = holding(['trash-up-to-2', 'coin1', 'point1']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    const v = view(t, null);
    expect(v.hand).toEqual([]);
    expect(v.discard).toEqual([]);
    expect(v.pending!.cards).toBeUndefined();
    expect(v.legal).toEqual({ play: [], buy: [], endPhase: false });
  });

  it('DB-PRIV-3: only the owner sees their whole discard pile; others see its top', () => {
    const { s, me } = holding([]);
    const other = (me + 1) % 2;
    expect(view(s, me).discard).toHaveLength(5);
    expect(view(s, other).discard).toEqual([]);
    expect(view(s, other).players[me].discardTop!.id).toBe(s.players[me].discard.at(-1));
  });

  it('DB-PRIV-4: card ids say nothing about which card they are', () => {
    const s = start(2);
    const sorted = Object.keys(s.cards).map(Number).sort((a, b) => a - b);
    const keys = sorted.map((id) => s.cards[id]);
    const runs = keys.filter((k, i) => k !== keys[i - 1]).length;
    expect(runs).toBeGreaterThan(keys.length / 3);
  });

  it('DB-PRIV-5: which reaction a player holds is shown only to that player', () => {
    const { s, me, ids } = holding(['hit-penalty'], 2, [['shield']]);
    const other = (me + 1) % 2;
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(view(t, me).pending!.cards).toBeUndefined();
    expect(view(t, other).pending!.cards!.map((c) => c.key)).toEqual(['shield']);
    expect(view(t, null).pending!.cards).toBeUndefined();
  });

  it('DB-PRIV-6: state is not leaked through rejected actions', () => {
    const s = start(2);
    const me = s.turn.seat;
    const other = (me + 1) % 2;
    const hidden = s.players[other].hand[0];
    const inOwn = game.apply(s, me, { type: 'play', card: hidden });
    const nowhere = game.apply(s, me, { type: 'play', card: 987654 });
    expect(inOwn).toEqual(nowhere);
  });
});
