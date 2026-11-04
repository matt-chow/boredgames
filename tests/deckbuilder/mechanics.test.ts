/** General mechanics added after the first engine audit. Each rule is tested on cards named for what they exercise. */
import { describe, expect, it } from 'vitest';
import { createDeckGame, validateRuleset } from '../../src/engine/deckbuilder';
import type { CardDef, DeckAction, DeckState, DeckView, Effect, Ruleset } from '../../src/engine/deckbuilder';
import { act, assertConserved, CARDS, DEFAULT_MARKET, deckOn, game, keysOf, mint, RULES, start } from './fixture';

const view = (s: DeckState, seat: number | null) => game.project(s, seat) as DeckView;

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

/** Put a new card in the trash (test setup only). */
function inTrash(s: DeckState, key: string) {
  const id = mint(s, s.turn.seat, key);
  s.players[s.turn.seat].hand.pop();
  s.trash.push(id);
  return id;
}

/** A game whose rules also include these test-only cards. */
function withCards(...extra: CardDef[]) {
  const rules: Ruleset = { ...RULES, id: 'mechanics', cards: [...CARDS, ...extra] };
  const g = createDeckGame(rules);
  const s = g.setup({ playerCount: 2, seed: 'seed', config: { market: DEFAULT_MARKET, bans: [] } });
  const me = s.turn.seat;
  s.players[me].discard.push(...s.players[me].hand.splice(0));
  const run = (t: DeckState, seat: number, a: DeckAction) => {
    const r = g.apply(JSON.parse(JSON.stringify(t)), seat, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
    return r.state;
  };
  return { g, s, me, run };
}

const card = (key: string, effects: Effect[], extra: Partial<CardDef> = {}): CardDef => ({ key, name: key, cost: 1, types: ['action'], text: key, status: 'ready', effects, ...extra });

const privateKeys = (v: DeckView) => v.log.filter((e) => e.to !== undefined && e.keys).flatMap((e) => e.keys!);

describe('loops and numbers read while resolving', () => {
  it('DB-FX-19: until repeats until its condition holds, and the rest of the effect can sort what came up', () => {
    const { s, me, ids } = holding(['reveal-until-cost3']);
    deckOn(s, me, ['coin1', 'point1', 'draw2', 'coin2']);
    const discardBefore = s.players[me].discard.length;
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(keysOf(t, t.players[me].hand)).toEqual(['draw2']);
    expect(keysOf(t, t.players[me].discard.slice(discardBefore))).toEqual(['coin1', 'point1']);
    expect(t.players[me].deck.at(-1)).toBeDefined();
    expect(t.cards[t.players[me].deck.at(-1)!]).toBe('coin2');
    expect(t.limbo).toEqual([]);
    assertConserved(t);
  });

  it('DB-FX-20: until reshuffles when the deck runs out, and stops when no cards are left', () => {
    const found = holding(['reveal-until-cost3']);
    const p = found.s.players[found.me];
    deckOn(found.s, found.me, ['draw2']);
    p.discard.push(...p.deck.splice(0));
    const t = act(found.s, found.me, { type: 'play', card: found.ids[0] });
    expect(keysOf(t, t.players[found.me].hand)).toEqual(['draw2']);
    expect(t.log.some((e) => e.kind === 'shuffle')).toBe(true);

    const none = holding(['reveal-until-cost3']);
    const owned = none.s.players[none.me].deck.length + none.s.players[none.me].discard.length;
    const u = act(none.s, none.me, { type: 'play', card: none.ids[0] });
    expect(u.players[none.me].hand).toEqual([]);
    expect(u.players[none.me].discard).toHaveLength(owned);
    expect(u.limbo).toEqual([]);
    assertConserved(u);
  });

  it('DB-FX-21: a round limit ends a loop whose condition never holds', () => {
    const never = { pileEmpty: 'coin1' };
    const { s, me, run } = withCards(
      card('capped', [{ op: 'until', cond: never, max: 3, effects: [{ op: 'coins', n: 1 }] }]),
      card('uncapped', [{ op: 'until', cond: never, effects: [{ op: 'coins', n: 1 }] }]),
    );
    const a = mint(s, me, 'capped');
    const b = mint(s, me, 'uncapped');
    s.turn.actions = 2;
    let t = run(s, me, { type: 'play', card: a });
    expect(t.turn.coins).toBe(3);
    t = run(t, me, { type: 'play', card: b });
    expect(t.turn.coins).toBe(103);
  });

  it('DB-FX-22: a loop can stop for a decision, survive a reload, and pick up where it was', () => {
    const { s, me, run } = withCards(
      card('discard-down-to-2', [
        {
          op: 'until',
          cond: { not: { gte: [{ count: 'hand' }, 3] } },
          effects: [
            { op: 'choose-cards', from: 'hand', min: 1, max: 1, as: 'picked', prompt: 'Discard one.' },
            { op: 'move', cards: { var: 'picked' }, to: 'discard' },
          ],
        },
      ]),
    );
    const id = mint(s, me, 'discard-down-to-2');
    const [a, b, c, d] = ['coin1', 'coin2', 'point1', 'point5'].map((k) => mint(s, me, k));
    let t = run(s, me, { type: 'play', card: id });
    t = run(t, me, { type: 'decide', id: t.pending!.id, cards: [b] });
    expect(t.pending).toMatchObject({ kind: 'cards', max: 1 });
    t = run(t, me, { type: 'decide', id: t.pending!.id, cards: [d] });
    expect(t.pending).toBeNull();
    expect(t.players[me].hand).toEqual([a, c]);
  });

  it('DB-FX-23: hand size can drive an effect; an already full hand draws nothing', () => {
    const short = holding(['refill-to-4', 'coin1']);
    const t = act(short.s, short.me, { type: 'play', card: short.ids[0] });
    expect(t.players[short.me].hand).toHaveLength(4);
    expect(t.players[short.me].hand[0]).toBe(short.ids[1]);

    const full = holding(['refill-to-4', 'coin1', 'coin1', 'coin1', 'coin1']);
    const deck = full.s.players[full.me].deck.length;
    const u = act(full.s, full.me, { type: 'play', card: full.ids[0] });
    expect(u.players[full.me].deck).toHaveLength(deck);

    const empty = holding(['refill-to-4']);
    empty.s.players[empty.me].deck = [];
    empty.s.players[empty.me].discard = [];
    const w = act(empty.s, empty.me, { type: 'play', card: empty.ids[0] });
    expect(w.players[empty.me].hand).toEqual([]);
  });
});

describe('reaching more of the table', () => {
  it('DB-FX-24: a whole hand can be revealed to everyone without changing its order', () => {
    const { s, me, ids } = holding(['show-hand', 'coin1', 'point1', 'coin2'], 3);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.players[me].hand).toEqual(ids.slice(1));
    expect(t.turn.coins).toBe(2);
    const other = view(t, (me + 2) % 3);
    expect(other.log.find((e) => e.kind === 'reveal')?.keys).toEqual(['coin1', 'point1', 'coin2']);
    expect(other.hand.some((c) => ids.includes(c.id))).toBe(false);
  });

  it('DB-FX-30: a whole hand can be moved, every card of it', () => {
    const { s, me, run } = withCards(card('drop-hand', [{ op: 'move', cards: 'hand', to: 'discard' }]));
    const id = mint(s, me, 'drop-hand');
    const held = ['coin1', 'coin2', 'point1', 'point5'].map((k) => mint(s, me, k));
    const t = run(s, me, { type: 'play', card: id });
    expect(t.players[me].hand).toEqual([]);
    expect(t.players[me].discard.slice(-4)).toEqual(held);
  });

  it('DB-FX-31: reveals can build up across rounds, so a loop can count everything it has seen', () => {
    const { s, me, run } = withCards(
      card('until-two-points', [
        { op: 'until', cond: { gte: [{ countIn: 'shown', filter: { type: 'victory' } }, 2] }, effects: [{ op: 'reveal', n: 1, as: 'shown', append: true }] },
        { op: 'select', from: { var: 'shown' }, filter: { type: 'victory' }, as: 'hits' },
        { op: 'move', cards: { var: 'hits' }, to: 'hand', public: true },
        { op: 'move', cards: { rest: 'shown' }, to: 'discard' },
      ]),
    );
    deckOn(s, me, ['point1', 'coin1', 'point5', 'coin2']);
    const id = mint(s, me, 'until-two-points');
    const t = run(s, me, { type: 'play', card: id });
    expect(t.players[me].hand.map((c) => t.cards[c])).toEqual(['point1', 'point5']);
    expect(t.cards[t.players[me].discard.at(-1)!]).toBe('coin1');
    expect(t.cards[t.players[me].deck.at(-1)!]).toBe('coin2');
  });

  it('DB-FX-25: a card can be chosen from the trash and gained, which fires gain triggers', () => {
    const { s, me, ids } = holding(['temp-trigger', 'reclaim-from-trash']);
    const cheap = inTrash(s, 'coin2');
    inTrash(s, 'point5');
    s.turn.actions = 2;
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'play', card: ids[1] });
    expect(t.pending).toMatchObject({ seat: me, min: 0, max: 1, cards: [cheap] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [cheap] });
    expect(t.players[me].hand).toEqual([cheap]);
    expect(t.trash).not.toContain(cheap);
    expect(t.turn.coins).toBe(1);
    assertConserved(t);
  });

  it('DB-FX-26: an empty trash skips the choice', () => {
    const { s, me, ids } = holding(['reclaim-from-trash']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toBeNull();
  });

  it('DB-FX-27: several different options are picked one at a time, and run in the order listed', () => {
    const { s, me, ids } = holding(['pick-2-of-4']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending!.options).toEqual(['+2 coins', '+1 buy', 'Draw a card', '1 gem']);
    t = act(t, me, { type: 'decide', id: t.pending!.id, option: 1 });
    expect(t.pending!.options).toEqual(['+2 coins', 'Draw a card', '1 gem']);
    expect(t.turn.buys).toBe(1);
    t = act(t, me, { type: 'decide', id: t.pending!.id, option: 0 });
    expect(t.pending).toBeNull();
    expect(t.turn).toMatchObject({ coins: 2, buys: 2 });

    const needsFirst: Effect[] = [{ op: 'if', cond: { gte: [{ token: 'mark' }, 1] }, then: [{ op: 'vp', n: 5 }] }];
    const ordered = withCards(
      card('listed-order', [
        {
          op: 'choose',
          prompt: 'Pick.',
          pick: 2,
          options: [
            { label: 'mark', then: [{ op: 'token', token: 'mark', n: 1 }] },
            { label: 'spare', then: [] },
            { label: 'needs mark', then: needsFirst },
          ],
        },
      ]),
      card('forced', [
        {
          op: 'choose',
          prompt: 'Pick.',
          pick: 2,
          options: [
            { label: 'a', then: [{ op: 'coins', n: 1 }] },
            { label: 'b', then: [{ op: 'coins', n: 2 }] },
          ],
        },
      ]),
    );
    const id = mint(ordered.s, ordered.me, 'listed-order');
    let u = ordered.run(ordered.s, ordered.me, { type: 'play', card: id });
    u = ordered.run(u, ordered.me, { type: 'decide', id: u.pending!.id, option: 2 });
    u = ordered.run(u, ordered.me, { type: 'decide', id: u.pending!.id, option: 0 });
    expect(u.players[ordered.me].vp).toBe(5);

    const forced = mint(u, ordered.me, 'forced');
    u.turn.actions = 1;
    u = ordered.run(u, ordered.me, { type: 'play', card: forced });
    expect(u.pending).toBeNull();
    expect(u.turn.coins).toBe(3);
  });

  it('DB-FX-28: a filter can match or exclude the card held in a variable', () => {
    const same = holding(['same-key-gain', 'coin2']);
    let t = act(same.s, same.me, { type: 'play', card: same.ids[0] });
    t = act(t, same.me, { type: 'decide', id: t.pending!.id, cards: [same.ids[1]] });
    expect(t.pending!.piles).toEqual(['coin2']);
    t = act(t, same.me, { type: 'decide', id: t.pending!.id, pile: 'coin2' });
    expect(t.cards[t.players[same.me].discard.at(-1)!]).toBe('coin2');

    const declined = holding(['same-key-gain', 'coin2']);
    const supply = declined.s.supply.coin2.length;
    let u = act(declined.s, declined.me, { type: 'play', card: declined.ids[0] });
    u = act(u, declined.me, { type: 'decide', id: u.pending!.id, cards: [] });
    expect(u.pending).toBeNull();
    expect(u.supply.coin2).toHaveLength(supply);

    const other = holding(['other-key-gain', 'point1', 'coin1']);
    let w = act(other.s, other.me, { type: 'play', card: other.ids[0] });
    w = act(w, other.me, { type: 'decide', id: w.pending!.id, cards: [other.ids[1]] });
    expect(w.pending!.piles).not.toContain('point1');
    expect(w.pending!.piles).toContain('coin1');
  });

  it('DB-FX-29: a card can be given to another player, going behind the cards they hold', () => {
    const { s, me, ids } = holding(['pass-left', 'coin2', 'point1'], 3, [['coin1'], ['coin1']]);
    const left = (me + 1) % 3;
    const held = [...s.players[left].hand];
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(t.players[left].hand).toEqual([...held, ids[1]]);
    expect(t.players[me].hand).toEqual([ids[2]]);
    assertConserved(t);
  });
});

describe('players acting on each other', () => {
  it('DB-ATT-8: another player can decide about a target’s cards, and only that player can answer', () => {
    const { s, me, ids } = holding(['rival-picks'], 3);
    const a = (me + 1) % 3;
    const b = (me + 2) % 3;
    deckOn(s, a, ['coin2', 'point5']);
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(game.actors(t)).toEqual([me]);
    expect(keysOf(t, t.pending!.cards)).toEqual(['coin2', 'point5']);
    const [keep, drop] = t.pending!.cards;
    const answer: DeckAction = { type: 'decide', id: t.pending!.id, cards: [keep] };
    for (const seat of [a, b]) expect(game.apply(t, seat, answer)).toMatchObject({ ok: false, code: 'not-your-decision' });
    t = act(t, me, answer);
    expect(t.players[a].hand.at(-1)).toBe(keep);
    expect(t.players[a].discard.at(-1)).toBe(drop);
    expect(t.players[me].hand).not.toContain(keep);
    expect(game.actors(t)).toEqual([me]);
    assertConserved(t);
  });

  it('DB-ATT-9: a reaction still blocks an attack in which someone else decides', () => {
    const { s, me, ids } = holding(['rival-picks'], 2, [['shield']]);
    const a = (me + 1) % 2;
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toMatchObject({ kind: 'react', seat: a });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [t.pending!.cards[0]] });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(t.pending).toBeNull();
    expect(t.limbo).toEqual([]);
  });

  it('DB-ATT-10: what happens to each target can be reported back to the attacker’s effect', () => {
    const { s, me, ids } = holding(['tally-reveals'], 3);
    deckOn(s, (me + 1) % 3, ['coin2']);
    deckOn(s, (me + 2) % 3, ['point1']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.turn.coins).toBe(1);
    expect(t.cards[t.players[(me + 1) % 3].discard.at(-1)!]).toBe('coin2');
    expect(t.cards[t.players[(me + 2) % 3].discard.at(-1)!]).toBe('point1');
    assertConserved(t);
  });

  it('DB-ATT-11: with every target immune, nothing is reported back', () => {
    const { s, me, ids } = holding(['tally-reveals'], 2, [['shield']]);
    const a = (me + 1) % 2;
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [t.pending!.cards[0]] });
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [] });
    expect(t.turn.coins).toBe(0);
  });

  it('DB-ATT-12: a target can hand a card to the attacker', () => {
    const { s, me, ids } = holding(['hand-tribute', 'coin1'], 3, [['point5', 'coin1'], ['point1']]);
    const a = (me + 1) % 3;
    const b = (me + 2) % 3;
    let t = act(s, me, { type: 'play', card: ids[0] });
    expect(t.pending).toMatchObject({ seat: a });
    const given = t.players[a].hand[0];
    const lone = t.players[b].hand[0];
    t = act(t, a, { type: 'decide', id: t.pending!.id, cards: [given] });
    expect(t.pending).toBeNull();
    expect(t.players[me].hand).toEqual([ids[1], given, lone]);
    expect(t.players[a].hand).toHaveLength(1);
    expect(t.players[b].hand).toEqual([]);
    assertConserved(t);
  });

  it('DB-ATT-13: gains can go to the attacker, and fire the receiver’s gain triggers', () => {
    const { s, me, run } = withCards(
      card('tribute-gain', [{ op: 'attack', effects: [{ op: 'gain', pile: 'coin1', player: 'parent' }] }], { types: ['action', 'attack'] }),
    );
    const id = mint(s, me, 'tribute-gain');
    const before = s.players[me].discard.length;
    const watcher = mint(s, me, 'temp-trigger');
    s.turn.actions = 2;
    let t = run(s, me, { type: 'play', card: watcher });
    t = run(t, me, { type: 'play', card: id });
    expect(t.players[me].discard).toHaveLength(before + 1);
    expect(t.turn.coins).toBe(1);
  });
});

describe('one-shot triggers', () => {
  it('DB-TRIG-5: a one-shot trigger fires once, even if the event happens again', () => {
    const { s, me, ids } = holding(['first-gain-bonus']);
    s.turn.buys = 3;
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'end-phase' });
    t = act(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.turn.coins).toBe(3);
    t = act(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.turn.coins).toBe(3);
    expect(t.temps).toEqual([]);
  });

  it('DB-TRIG-6: an event its filter ignores does not use up a one-shot trigger', () => {
    const { s, me, run } = withCards(card('first-treasure', [{ op: 'on', on: 'gain', filter: { type: 'treasure' }, label: 'First treasure', once: true, effects: [{ op: 'vp', n: 1 }] }]));
    s.turn.buys = 2;
    s.turn.coins = 2;
    const id = mint(s, me, 'first-treasure');
    let t = run(s, me, { type: 'play', card: id });
    t = run(t, me, { type: 'end-phase' });
    t = run(t, me, { type: 'buy', pile: 'point1' });
    expect(t.players[me].vp).toBe(0);
    t = run(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.players[me].vp).toBe(1);
    expect(t.temps).toEqual([]);
  });
});

describe('scoring by kind of card', () => {
  it('DB-END-6: points can count only the cards of one type, rounded down', () => {
    const s = start(2);
    const me = s.turn.seat;
    mint(s, me, 'per2-treasures');
    s.over = true;
    expect(view(s, me).final![me].cards.find((c) => c.key === 'per2-treasures')).toMatchObject({ count: 1, vp: 3 });
    mint(s, me, 'coin2');
    mint(s, me, 'per2-treasures');
    expect(view(s, me).final![me].cards.find((c) => c.key === 'per2-treasures')).toMatchObject({ count: 2, vp: 8 });
  });
});

describe('undo stays safe', () => {
  const undoable = (s: DeckState, seat: number, a: DeckAction) => {
    const r = game.apply(s, seat, a);
    if (!r.ok) throw new Error(r.error);
    return r.undoable;
  };

  it('DB-UNDO-5: revealing a hand, or moving a card to someone else, cannot be undone', () => {
    const shown = holding(['show-hand']);
    expect(undoable(shown.s, shown.me, { type: 'play', card: shown.ids[0] })).toBe(false);
    const given = holding(['pass-left', 'coin1', 'coin2']);
    const t = act(given.s, given.me, { type: 'play', card: given.ids[0] });
    expect(undoable(t, given.me, { type: 'decide', id: t.pending!.id, cards: [given.ids[1]] })).toBe(false);
  });

  it('DB-UNDO-6: taking a public card from the trash reveals nothing, so it can be undone', () => {
    const { s, me, ids } = holding(['reclaim-from-trash']);
    const cheap = inTrash(s, 'coin2');
    const t = act(s, me, { type: 'play', card: ids[0] });
    expect(undoable(t, me, { type: 'decide', id: t.pending!.id, cards: [cheap] })).toBe(true);
  });
});

describe('hidden information', () => {
  it('DB-PRIV-7: cards shown to a deciding player reach only that player and their owner', () => {
    const { s, me, ids } = holding(['rival-picks'], 3);
    const a = (me + 1) % 3;
    const b = (me + 2) % 3;
    deckOn(s, a, ['coin2', 'point5']);
    const t = act(s, me, { type: 'play', card: ids[0] });
    const shown = t.pending!.cards;
    expect(view(t, me).pending!.cards!.map((c) => c.id)).toEqual(shown);
    for (const seat of [a, b, null]) expect(view(t, seat).pending!.cards).toBeUndefined();
    expect(privateKeys(view(t, a))).toEqual(expect.arrayContaining(['coin2', 'point5']));
    const third = JSON.stringify(view(t, b));
    for (const id of shown) expect(third).not.toContain(`"id":${id},`);
    expect(view(t, b).revealed).toEqual([]);
    expect(privateKeys(view(t, b))).toEqual([]);
  });

  it('DB-PRIV-8: a card passed between hands is named only to the two players involved', () => {
    const { s, me, ids } = holding(['pass-left', 'point5', 'coin1'], 3, [['coin1'], ['coin1']]);
    const left = (me + 1) % 3;
    const third = (me + 2) % 3;
    let t = act(s, me, { type: 'play', card: ids[0] });
    t = act(t, me, { type: 'decide', id: t.pending!.id, cards: [ids[1]] });
    expect(privateKeys(view(t, me))).toContain('point5');
    expect(privateKeys(view(t, left))).toContain('point5');
    expect(JSON.stringify(view(t, third).log)).not.toContain('point5');
    expect(JSON.stringify(view(t, third))).not.toContain(`"id":${ids[1]},`);
  });

  it('DB-PRIV-9: a gain from the open is public; a gain of a hidden card names it only to its owner', () => {
    const open = holding(['reclaim-from-trash'], 2);
    const cheap = inTrash(open.s, 'coin2');
    let t = act(open.s, open.me, { type: 'play', card: open.ids[0] });
    t = act(t, open.me, { type: 'decide', id: t.pending!.id, cards: [cheap] });
    expect(view(t, (open.me + 1) % 2).log.find((e) => e.kind === 'gain')?.keys).toEqual(['coin2']);

    const { s, me, g, run } = withCards(card('keep-unseen', [{ op: 'look', n: 1, as: 'seen' }, { op: 'gain-card', cards: { var: 'seen' }, to: 'hand' }]));
    deckOn(s, me, ['point5']);
    const id = mint(s, me, 'keep-unseen');
    const u = run(s, me, { type: 'play', card: id });
    const theirs = g.project(u, (me + 1) % 2) as DeckView;
    expect(JSON.stringify(theirs.log)).not.toContain('point5');
    expect(theirs.log.find((e) => e.kind === 'gain')).toMatchObject({ count: 1 });
    expect(privateKeys(g.project(u, me) as DeckView)).toContain('point5');
  });
});

describe('recorded interpretations', () => {
  it('DB-FX-32: a loop checks first, so it may run no rounds, and never runs more than 100', () => {
    const { s, me, run } = withCards(card('already-met', [{ op: 'until', cond: { gte: [0, 0] }, effects: [{ op: 'coins', n: 1 }] }]), card('never-met', [{ op: 'until', cond: { gte: [0, 1] }, effects: [{ op: 'coins', n: 1 }] }]));
    s.turn.actions = 2;
    const met = mint(s, me, 'already-met');
    const never = mint(s, me, 'never-met');
    let t = run(s, me, { type: 'play', card: met });
    expect(t.turn.coins).toBe(0);
    t = run(t, me, { type: 'play', card: never });
    expect(t.turn.coins).toBe(100);
  });

  it('DB-FX-33: excluding the card in an empty variable excludes nothing', () => {
    const { s, me, run } = withCards(card('exclude-nothing', [{ op: 'choose-pile', prompt: 'Pick.', filter: { notSameAs: 'unset' }, as: 'pile' }]));
    const piles = Object.keys(s.supply).filter((k) => s.supply[k].length > 0);
    const t = run(s, me, { type: 'play', card: mint(s, me, 'exclude-nothing') });
    expect(t.pending!.piles).toEqual(piles);
  });

  it('DB-FX-34: a single pick with one option still asks', () => {
    const { s, me, run } = withCards(card('one-option', [{ op: 'choose', prompt: 'Pick.', options: [{ label: 'only', then: [{ op: 'coins', n: 1 }] }] }]));
    let t = run(s, me, { type: 'play', card: mint(s, me, 'one-option') });
    expect(t.pending!.options).toEqual(['only']);
    t = run(t, me, { type: 'decide', id: t.pending!.id, option: 0 });
    expect(t.turn.coins).toBe(1);
  });

  it('DB-ATT-14: with no parent, "parent" means the player resolving the effect', () => {
    const { s, me, run } = withCards(card('no-parent', [{ op: 'gain', pile: 'coin1', player: 'parent' }, { op: 'may', prompt: 'Coin?', by: 'parent', then: [{ op: 'coins', n: 1 }] }]));
    const t = run(s, me, { type: 'play', card: mint(s, me, 'no-parent') });
    expect(t.cards[t.players[me].discard.at(-1)!]).toBe('coin1');
    expect(t.pending!.seat).toBe(me);
  });

  it('DB-TRIG-7: two copies of a one-shot trigger each fire once', () => {
    const { s, me, run } = withCards(card('one-shot', [{ op: 'on', on: 'gain', label: 'One shot', once: true, effects: [{ op: 'vp', n: 1 }] }]));
    s.turn.actions = 2;
    s.turn.buys = 2;
    s.turn.coins = 2;
    const a = mint(s, me, 'one-shot');
    const b = mint(s, me, 'one-shot');
    let t = run(s, me, { type: 'play', card: a });
    t = run(t, me, { type: 'play', card: b });
    t = run(t, me, { type: 'end-phase' });
    t = run(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.pending!.kind).toBe('order');
    t = run(t, me, { type: 'decide', id: t.pending!.id, option: 0 });
    expect(t.players[me].vp).toBe(2);
    expect(t.temps).toEqual([]);
    t = run(t, me, { type: 'buy', pile: 'coin1' });
    expect(t.pending).toBeNull();
    expect(t.players[me].vp).toBe(2);
  });
});

describe('ruleset validation', () => {
  const problems = (...extra: CardDef[]) => validateRuleset({ ...RULES, id: 'bad', cards: [...CARDS, ...extra] });

  it('DB-DEF-4: every card the fixture uses for these mechanics passes validation', () => {
    expect(validateRuleset(RULES)).toEqual([]);
  });

  it('DB-DEF-5: bad picks, players, round limits and point counts are refused before any game starts', () => {
    const options = [{ label: 'a', then: [] }];
    expect(problems(card('x', [{ op: 'choose', prompt: 'p', pick: 2, options }])).join()).toMatch(/cannot pick 2 of 1/);
    expect(problems(card('x', [{ op: 'choose', prompt: 'p', pick: 0, options }])).join()).toMatch(/cannot pick 0/);
    expect(problems(card('x', [{ op: 'move', cards: 'source', to: 'trash', player: 'nobody' as never }])).join()).toMatch(/unknown player nobody/);
    expect(problems(card('x', [{ op: 'until', cond: { has: 'v' }, max: -1, effects: [] }])).join()).toMatch(/bad round limit/);
    expect(problems(card('x', [], { vp: { per: 0, each: 1 } })).join()).toMatch(/positive count/);
    expect(problems(card('x', [], { vp: { per: 1, each: 1, of: { key: 'ghost' } } })).join()).toMatch(/unknown card ghost/);
  });

  it('DB-DEF-6: references inside loops and combined conditions are checked', () => {
    expect(problems(card('x', [{ op: 'until', cond: { any: [{ all: [{ pileEmpty: 'ghost' }] }] }, effects: [] }])).join()).toMatch(/unknown card ghost/);
    expect(problems(card('x', [{ op: 'until', cond: { has: 'v' }, effects: [{ op: 'gain', pile: 'ghost' }] }])).join()).toMatch(/unknown card ghost/);
    expect(problems(card('x', [{ op: 'until', cond: { has: 'v' }, effects: [{ op: 'nonsense' } as never] }])).join()).toMatch(/unknown effect nonsense/);
  });
});
