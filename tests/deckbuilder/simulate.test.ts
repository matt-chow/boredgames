import { afterEach, describe, expect, it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../../src/engine/deckbuilder';
import { randInt, seedRng, shuffle } from '../../src/engine/rng';
import { MemoryStore, RoomCore } from '../../src/server/core';
import { GAMES } from '../../src/games/registry';
import { assertConserved, CARDS, game, SELECTABLE } from './fixture';

/** Everything a seat must not learn, as ids: others' hands and every deck. */
function assertNoLeak(s: DeckState) {
  for (let seat = 0; seat < s.n; seat++) {
    const v = game.project(s, seat) as DeckView;
    const text = JSON.stringify(v);
    expect(text).not.toContain('"deck":');
    expect(text).not.toContain('"rng"');
    expect(text).not.toContain('"branches"');
    const seen = new Set<number>();
    const add = (x: { id: number }[]) => x.forEach((c) => seen.add(c.id));
    add(v.hand);
    add(v.discard);
    add(v.trash);
    add(v.revealed);
    add(v.pending?.cards ?? []);
    for (const p of v.players) {
      add(p.play);
      if (p.discardTop) add([p.discardTop]);
      for (const m of Object.values(p.mats)) add(m.cards ?? []);
    }
    for (let other = 0; other < s.n; other++) {
      for (const id of s.players[other].deck) {
        if (seen.has(id) && !(s.pending?.seat === seat && s.pending.cards.includes(id))) throw new Error(`seat ${seat} sees a card in a deck`);
      }
      if (other === seat) continue;
      for (const id of s.players[other].hand) if (seen.has(id)) throw new Error(`seat ${seat} sees a card in seat ${other}'s hand`);
    }
    expect(v.hand).toHaveLength(s.players[seat].hand.length);
    expect(v.log.every((e) => e.to === undefined || e.to === seat)).toBe(true);
  }
}

/** Play a whole game with bots. Every action is logged, so a failing seed can be reproduced exactly. */
function simulate(players: number, seed: string, market: string[] = []) {
  let s = game.setup({ playerCount: players, seed, config: { market, bans: [] } });
  const log: { seat: number; a: DeckAction }[] = [];
  for (let i = 0; i < 40_000 && !s.over; i++) {
    const [seat] = game.actors(s);
    const move = game.bot!(game.project(s, seat) as DeckView);
    if (!move) throw new Error(`${seed}: seat ${seat} has no move`);
    let done = false;
    for (const a of move.actions) {
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      s = JSON.parse(JSON.stringify(r.state));
      log.push({ seat, a });
      done = true;
      break;
    }
    if (!done) throw new Error(`${seed}: no legal move for seat ${seat}: ${JSON.stringify(move.actions)}`);
    if (i % 5 === 0) assertConserved(s);
    if (i % 25 === 0) assertNoLeak(s);
  }
  return { s, log };
}

/** Unlike the bot, picks uniformly from everything legal, so every branch and answer size gets exercised. */
function explore(players: number, seed: string, market: string[], played: Set<string>) {
  const rng = seedRng(seed + ':explore');
  const pick = <T>(list: T[]) => list[randInt(rng, list.length)];
  let s = game.setup({ playerCount: players, seed, config: { market, bans: [] } });
  for (let i = 0; i < 40_000 && !s.over; i++) {
    const [seat] = game.actors(s);
    const v = game.project(s, seat) as DeckView;
    let a: DeckAction;
    const q = v.pending;
    if (q) {
      if (q.kind === 'cards' || q.kind === 'react') {
        const count = q.min + randInt(rng, q.max - q.min + 1);
        a = { type: 'decide', id: q.id, cards: shuffle(rng, q.cards!.map((c) => c.id)).slice(0, count) };
      } else if (q.kind === 'pile') a = { type: 'decide', id: q.id, pile: pick(q.piles!) };
      else a = { type: 'decide', id: q.id, option: randInt(rng, q.options!.length) };
    } else if (v.legal.play.length) a = { type: 'play', card: pick(v.legal.play) };
    else if (v.legal.buy.length) a = { type: 'buy', pile: pick(v.legal.buy) };
    else a = { type: 'end-phase' };
    const r = game.apply(s, seat, a);
    if (!r.ok) throw new Error(`${seed}: refused ${JSON.stringify(a)}: ${r.error}`);
    if (a.type === 'play') played.add(s.cards[a.card]);
    s = JSON.parse(JSON.stringify(r.state));
    if (i % 5 === 0) assertConserved(s);
    if (i % 25 === 0) assertNoLeak(s);
  }
  return s;
}

const SIM_TIMEOUT = 120_000;

describe('full games', () => {
  for (const players of [2, 3, 4, 5, 6]) {
    it(`DB-SIM-${players}: ${players}-player games finish, conserve cards, and leak nothing`, () => {
      for (let g = 0; g < 8; g++) {
        const { s } = simulate(players, `sim-${players}-${g}`);
        expect(s.over, `seed sim-${players}-${g}`).toBe(true);
        assertConserved(s);
        assertNoLeak(s);
        const r = game.results(s)!;
        expect(r).toHaveLength(players);
        expect(r.some((x) => x.winner)).toBe(true);
        expect(s.limbo).toEqual([]);
        expect(s.stack).toEqual([]);
      }
    }, SIM_TIMEOUT);
  }

  it('DB-SIM-7: random legal play reaches every selectable action, in games that still finish cleanly', () => {
    const played = new Set<string>();
    const pad = SELECTABLE.slice(0, 10);
    for (let i = 0; i < SELECTABLE.length; i += 10) {
      const chunk = SELECTABLE.slice(i, i + 10);
      const market = [...chunk, ...pad.filter((k) => !chunk.includes(k))].slice(0, 10);
      for (let g = 0; g < 4; g++) {
        const s = explore(3, `cover-${i}-${g}`, market, played);
        expect(s.over, `seed cover-${i}-${g}`).toBe(true);
        assertConserved(s);
        assertNoLeak(s);
        expect(s.limbo).toEqual([]);
      }
    }
    const actions = CARDS.filter((c) => SELECTABLE.includes(c.key) && c.types.includes('action')).map((c) => c.key);
    expect(actions.filter((k) => !played.has(k))).toEqual([]);
  }, SIM_TIMEOUT);

  it('DB-SIM-8: a hostile player cannot change the game: garbage and other seats’ moves are refused', () => {
    let s = game.setup({ playerCount: 3, seed: 'fuzz', config: { market: [], bans: [] } });
    const garbage: unknown[] = [null, 'x', [], { type: 'play', card: -1 }, { type: 'buy', pile: 'constructor' }, { type: 'decide', id: -1, cards: [1e9] }];
    for (let i = 0; i < 3_000 && !s.over; i++) {
      const [seat] = game.actors(s);
      const before = JSON.stringify(s);
      for (const a of garbage) expect(game.apply(s, seat, a as never).ok).toBe(false);
      for (let other = 0; other < 3; other++) if (other !== seat) expect(game.apply(s, other, { type: 'end-phase' }).ok).toBe(false);
      expect(JSON.stringify(s)).toBe(before);
      const move = game.bot!(game.project(s, seat) as DeckView)!;
      for (const a of move.actions) {
        const r = game.apply(s, seat, a);
        if (r.ok) {
          s = r.state;
          break;
        }
      }
    }
    expect(s.over).toBe(true);
  }, SIM_TIMEOUT);

  it('DB-SIM-9: replaying the action log reproduces the game exactly', () => {
    const { s, log } = simulate(4, 'replay');
    let t = game.setup({ playerCount: 4, seed: 'replay', config: { market: [], bans: [] } });
    for (const { seat, a } of log) {
      const r = game.apply(t, seat, a);
      if (!r.ok) throw new Error(r.error);
      t = r.state;
    }
    expect(t).toEqual(s);
  }, SIM_TIMEOUT);
});

describe('hosted by the room core', () => {
  const opts = { now: () => 1000, seed: () => 'room-seed' };
  const connected = new Set([0, 1]);

  afterEach(() => {
    delete GAMES[game.meta.id];
  });

  function room() {
    const store = new MemoryStore();
    GAMES[game.meta.id] = game;
    const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: game.meta.id, name: 'One', th: 'a' });
    core.join('Two', 'b');
    core.handle(0, { t: 'start', id: 's', v: core.version }, connected);
    return { store, core };
  }

  it('DB-ROOM-1: a game runs through the unchanged core, and a reload resumes mid-decision', () => {
    const { store, core } = room();
    const v0 = core.view(0, connected);
    expect(v0.status).toBe('playing');
    const state = store.getState() as DeckState;
    const seat = state.turn.seat;
    state.players[seat].hand = [];
    const id = Math.max(...Object.keys(state.cards).map(Number)) + 1;
    state.cards[id] = 'trash-up-to-2';
    state.cards[id + 1] = 'coin1';
    state.players[seat].hand = [id, id + 1];
    store.putState(state);
    const fresh = new RoomCore(store, opts);
    const ack = fresh.handle(seat, { t: 'act', id: 'p', v: fresh.version, a: { type: 'play', card: id } }, connected);
    expect(ack.ack).toMatchObject({ ok: true });
    const reloaded = new RoomCore(store, opts);
    const g = reloaded.view(seat, connected).game as DeckView;
    expect(g.pending).toMatchObject({ seat, kind: 'cards', max: 1 });
    const done = reloaded.handle(seat, { t: 'act', id: 'd', v: reloaded.version, a: { type: 'decide', id: g.pending!.id, cards: [id + 1] } }, connected);
    expect(done.ack).toMatchObject({ ok: true });
    expect((reloaded.view(seat, connected).game as DeckView).trash).toEqual([{ id: id + 1, key: 'coin1' }]);
  });

  it('DB-ROOM-2: duplicate and stale messages are handled by the core without running twice', () => {
    const { core, store } = room();
    const seat = (store.getState() as DeckState).turn.seat;
    const msg = { t: 'act', id: 'x', v: core.version, a: { type: 'end-phase' } };
    expect(core.handle(seat, msg, connected).changed).toBe(true);
    const again = core.handle(seat, msg, connected);
    expect(again.changed).toBe(false);
    expect(again.ack).toMatchObject({ ok: true });
    expect((store.getState() as DeckState).turn.phase).toBe('buy');
    expect(core.handle(seat, { t: 'act', id: 'y', v: 1, a: { type: 'end-phase' } }, connected).ack).toMatchObject({ ok: false, code: 'stale' });
  });

  it('DB-ROOM-3: undo restores a safe move through the core', () => {
    const { core, store } = room();
    const seat = (store.getState() as DeckState).turn.seat;
    core.handle(seat, { t: 'act', id: 'x', v: core.version, a: { type: 'end-phase' } }, connected);
    expect(core.view(seat, connected).canUndo).toBe(true);
    core.handle(seat, { t: 'undo', id: 'u', v: core.version }, connected);
    expect((store.getState() as DeckState).turn.phase).toBe('action');
  });

  it('DB-ROOM-4: the engine is not listed in the hub: no deck game is registered', () => {
    for (const g of Object.values(GAMES)) {
      const s = g.setup({ playerCount: g.meta.minPlayers, seed: 'x', config: g.defaultConfig(g.meta.minPlayers) });
      expect(s).not.toHaveProperty('rulesetId');
    }
    expect(GAMES).not.toHaveProperty(game.meta.id);
  });
});
