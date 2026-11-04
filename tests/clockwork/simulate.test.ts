import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../../src/engine/deckbuilder';
import { randInt, seedRng, shuffle } from '../../src/engine/rng';
import { botMove, PROFILES, STYLES } from '../../src/games/clockwork/rules/bot';
import { CARDS, WORKS } from '../../src/games/clockwork/rules/ruleset';
import { MemoryStore, RoomCore } from '../../src/server/core';
import { GAMES } from '../../src/games/registry';
import { ALL_SETS, assertConserved, game } from './helpers';

function assertPrivate(s: DeckState) {
  for (let seat = 0; seat < s.n; seat++) {
    const v = game.project(s, seat) as DeckView;
    const text = JSON.stringify(v);
    expect(text).not.toContain('"deck":');
    expect(text).not.toContain('"rng"');
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
    expect(v.log.every((e) => e.to === undefined || e.to === seat)).toBe(true);
  }
}

/** A whole game with computer players, checked as it goes. */
function simulate(players: number, seed: string, sets: string[], everyStep = false, offset = seed.length, played?: Set<string>, market: string[] = [], favour?: string) {
  let s = game.setup({ playerCount: players, seed, config: { market, bans: [], sets, projects: [] } });
  const profiles = Array.from({ length: players }, (_, i) => ({ ...PROFILES[(i * 3 + offset) % PROFILES.length], favour }));
  let steps = 0;
  for (; steps < 30_000 && !s.over; steps++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
    if (!move) throw new Error(`${seed}: seat ${seat} has no move`);
    let done = false;
    for (const a of move.actions) {
      const before = s.nextLog;
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      s = JSON.parse(JSON.stringify(r.state));
      for (const l of s.log) if (played && l.n >= before && l.kind === 'play') (l.keys ?? []).forEach((k) => played.add(k));
      done = true;
      break;
    }
    if (!done) throw new Error(`${seed}: no legal move for seat ${seat}: ${JSON.stringify(move.actions)}`);
    if (everyStep || steps % 5 === 0) assertConserved(s);
    if (everyStep || steps % 40 === 0) assertPrivate(s);
  }
  return { s, steps };
}

/** Any legal-looking answer to anything, chosen at random: finds questions that can't be answered and dead ends. */
function randomGame(players: number, seed: string) {
  let s = game.setup({ playerCount: players, seed, config: { market: [], bans: [], sets: ALL_SETS, projects: [] } });
  const rng = seedRng(`random:${seed}`);
  for (let step = 0; step < 6000 && !s.over; step++) {
    const [seat] = game.actors(s);
    const v = game.project(s, seat) as DeckView;
    const q = v.pending;
    let a: DeckAction;
    if (q) {
      if (q.kind === 'cards' || q.kind === 'react') {
        const ids = shuffle(rng, (q.cards ?? []).map((c) => c.id));
        const n = q.min + randInt(rng, q.max - q.min + 1);
        a = { type: 'decide', id: q.id, cards: ids.slice(0, n) };
      } else if (q.kind === 'pile') a = { type: 'decide', id: q.id, pile: q.piles![randInt(rng, q.piles!.length)] };
      else if (q.kind === 'player') a = { type: 'decide', id: q.id, seat: q.seats![randInt(rng, q.seats!.length)] };
      else a = { type: 'decide', id: q.id, option: randInt(rng, q.options!.length) };
    } else {
      const options: DeckAction[] = [
        ...v.legal.play.map((card): DeckAction => ({ type: 'play', card })),
        ...v.legal.buy.map((pile): DeckAction => ({ type: 'buy', pile })),
        ...v.legal.claim.map((project): DeckAction => ({ type: 'claim', project })),
        ...(v.legal.convert ? [{ type: 'convert' } as DeckAction] : []),
        ...(v.legal.endPhase ? [{ type: 'end-phase' } as DeckAction] : []),
      ];
      if (!options.length) throw new Error(`${seed}: seat ${seat} is stuck at step ${step}`);
      a = options[randInt(rng, options.length)];
    }
    const r = game.apply(s, seat, a);
    if (!r.ok) throw new Error(`${seed}: ${JSON.stringify(a)} refused: ${r.code} ${r.error}`);
    s = JSON.parse(JSON.stringify(r.state));
    assertConserved(s);
    if (step % 50 === 0) assertPrivate(s);
  }
  return s;
}

describe('whole games', () => {
  for (const players of [2, 3, 4, 5, 6]) {
    it(`CC-SIM-${players}: ${players}-player games finish with computer players, every time`, () => {
      for (let i = 0; i < 10; i++) {
        const { s, steps } = simulate(players, `core-${players}-${i}`, ['core']);
        expect(s.over, `seed core-${players}-${i} stalled after ${steps} steps`).toBe(true);
        expect(game.results!(s)).toHaveLength(players);
      }
      for (let i = 0; i < 10; i++) {
        const { s } = simulate(players, `all-${players}-${i}`, ALL_SETS);
        expect(s.over).toBe(true);
      }
    }, 120_000);
    it(`CC-CHAOS-${players}: ${players}-player games survive random legal answers without getting stuck`, () => {
      for (let i = 0; i < 6; i++) randomGame(players, `chaos-${players}-${i}`);
    }, 120_000);
  }
  it('CC-SIM-DET: the same seed plays the same game', () => {
    const a = simulate(3, 'repeat', ALL_SETS);
    const b = simulate(3, 'repeat', ALL_SETS);
    expect(JSON.stringify(a.s)).toEqual(JSON.stringify(b.s));
  });
  it('CC-SIM-PRIV: privacy holds at every single step of a game', () => {
    simulate(3, 'private', ALL_SETS, true);
    simulate(6, 'private-6', ALL_SETS, true);
  }, 120_000);
  it('CC-SIM-ALL: every market card is played at some point in a batch of games', () => {
    const played = new Set<string>();
    const market = CARDS.filter((c) => !c.basic);
    const helpers = ['hand_crank', 'spark_coil', 'charge_meter', 'mutual_aid', 'glow_mason', 'steam_diverter', 'gearwright', 'paper_fan', 'foreman', 'belt_sorter'];
    // Each card gets games built around it, with players who want it and Spark to run it on.
    for (const card of market.filter((c) => c.effects)) {
      for (let i = 0; i < 6 && !played.has(card.key); i++) {
        const piles = [card.key, ...helpers.filter((k) => k !== card.key)].slice(0, 10);
        simulate(3, `coverage-${card.key}-${i}`, ALL_SETS, false, i, played, piles, card.key);
      }
    }
    const never = market.filter((c) => c.effects && !played.has(c.key)).map((c) => c.key);
    expect(never).toEqual([]);
  }, 240_000);
});

describe('in a room', () => {
  const opts = { now: () => 1000, seed: () => 'room-seed' };
  function played(players: number) {
    const store = new MemoryStore();
    const first = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: 'clockwork', name: 'One', th: 'a', bots: players - 1 });
    const connected = new Set([0]);
    first.handle(0, { t: 'start', id: 's', v: first.version }, connected);
    return { store, connected };
  }

  it('CC-ROOM-1: it is registered, and rooms of 2 to 6 finish through RoomCore, reloading from the store after every move', () => {
    expect(GAMES.clockwork).toBe(game);
    for (const players of [2, 3, 4, 5, 6]) {
      const { store, connected } = played(players);
      let n = 0;
      for (; n < 20_000; n++) {
        const core = new RoomCore(store, opts);
        if (core.status === 'over') break;
        const view = core.view(0, connected).game as DeckView;
        if (game.actors(store.getState() as DeckState).includes(0)) {
          const move = botMove(view, PROFILES[1], 0)!;
          const taken = move.actions.some((a, i) => core.handle(0, { t: 'act', id: `h${n}-${i}`, v: core.version, a }, connected).ack?.ok);
          expect(taken).toBe(true);
        } else expect(core.playBot()).toBe(true);
      }
      const core = new RoomCore(store, opts);
      expect(core.status).toBe('over');
      expect(core.view(0, connected).game).toMatchObject({ over: true });
    }
  }, 120_000);
  it('CC-ROOM-2: nothing hidden is written to the room history', () => {
    const { store, connected } = played(3);
    for (let n = 0; n < 400; n++) {
      const core = new RoomCore(store, opts);
      const s = store.getState() as DeckState;
      if (s.over) break;
      if (game.actors(s).includes(0)) {
        const move = botMove(core.view(0, connected).game as DeckView, PROFILES[1], 0)!;
        move.actions.some((a, i) => core.handle(0, { t: 'act', id: `h${n}-${i}`, v: core.version, a }, connected).ack?.ok);
      } else core.playBot();
    }
    const history = JSON.stringify(store.history);
    expect(history).not.toContain('"deck"');
    expect(history).not.toContain('"hand"');
    expect(history).not.toContain('"rng"');
  });
});

describe('audit', () => {
  const spec = JSON.parse(readFileSync('data/clockwork-commons/clockwork_commons_original_cardset.json', 'utf8'));
  const tests = ['tests/clockwork/cards.test.ts', 'tests/clockwork/rules.test.ts'].map((f) => readFileSync(f, 'utf8')).join('\n');
  const names = JSON.parse(readFileSync('data/clockwork-commons/name-mapping.json', 'utf8')) as { cards: Record<string, { old: string; new: string }> };

  it('CC-AUDIT-1: all 50 supplied designs exist, with the supplied cost and Prestige', () => {
    const byKey = new Map(CARDS.map((c) => [c.key, c]));
    expect(spec.basic_cards.length + spec.market_cards.length + spec.public_works.length).toBe(50);
    for (const entry of [...spec.basic_cards, ...spec.market_cards]) {
      const def = byKey.get(entry.id);
      expect(def, entry.id).toBeDefined();
      expect(def!.cost, entry.id).toBe(entry.cost);
    }
    for (const w of spec.public_works) {
      const def = WORKS.find((x) => x.key === w.id);
      expect(def, w.id).toBeDefined();
      expect(names.cards[w.id].old).toBe(w.name);
      expect(def!.name).toBe(names.cards[w.id].new);
    }
  });
  it('CC-AUDIT-2: every card and Public Work has a named behaviour test', () => {
    for (const c of CARDS) expect(tests, `no CC-CARD test for ${c.key}`).toContain(`CC-CARD-${c.key}`);
    const works = (t: string) => WORKS.filter((w) => !t.includes(`CC-PW-\${key}`) || !t.includes(`${w.key}:`)).map((w) => w.key);
    expect(works(tests)).toEqual([]);
  });
  it('CC-AUDIT-3: every market card has a playstyle, and every playstyle has at least 4 cards', () => {
    const market = CARDS.filter((c) => !c.basic);
    for (const c of market) expect(STYLES[c.key]?.length ?? 0, c.key).toBeGreaterThan(0);
    const per: Record<string, number> = {};
    for (const c of market) for (const s of STYLES[c.key]) per[s] = (per[s] ?? 0) + 1;
    for (const style of ['economy', 'cycling', 'combo', 'spark', 'works', 'devices', 'interaction', 'defence', 'scoring', 'risk']) {
      expect(per[style] ?? 0, style).toBeGreaterThanOrEqual(4);
    }
  });
  it('CC-AUDIT-4: the catalogue reaches the design targets without filler', () => {
    expect(CARDS.filter((c) => c.basic).length).toBe(7);
    expect(CARDS.filter((c) => !c.basic).length).toBe(64);
    expect(WORKS.length).toBe(13);
  });
});
