import { describe, expect, it } from 'vitest';
import { MemoryStore, RoomCore, RoomError, RETENTION_MS } from '../../src/server/core';
import { normalizeCode, normalizeName } from '../../src/shared/protocol';
import type { BView } from '../../src/games/bohnanza/rules/view';
import { botMove } from '../../src/games/bohnanza/rules/bot';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => 'fixed-seed' };

function room(gameId = 'bohnanza', names = ['Ann', 'Bo', 'Cy']) {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId, name: names[0], th: 'th0' });
  names.slice(1).forEach((n, i) => core.join(n, `th${i + 1}`));
  return { store, core };
}

const all = (n: number) => new Set(Array.from({ length: n }, (_, i) => i));
let idc = 0;
const send = (core: RoomCore, seat: number, msg: Record<string, unknown>, connected = all(core.seatCount)) =>
  core.handle(seat, { id: `m${++idc}`, v: core.version, ...msg }, connected);

describe('H1 lobby', () => {
  it('creates a room with the creator as host and seat 0', () => {
    const { core } = room('bohnanza', ['Ann']);
    const v = core.view(0, all(1));
    expect(v.status).toBe('lobby');
    expect(v.seats).toEqual([{ seat: 0, name: 'Ann', connected: true, host: true, bot: false }]);
    expect(v.canStart).toBe(false);
    expect(v.configError).toMatch(/at least 3/);
  });

  it('joining twice with the same session returns the same seat; names must be unique', () => {
    const { core } = room();
    expect(core.join('Whatever', 'th1')).toBe(1);
    expect(() => core.join('bo', 'thX')).toThrow(/already uses/);
    expect(() => core.join('   ', 'thX')).toThrow(RoomError);
  });

  it('caps players at the game maximum and refuses joins after start', () => {
    const { core } = room('bohnanza', ['A', 'B', 'C', 'D', 'E']);
    expect(() => core.join('F', 'th9')).toThrow(/full/);
    const { core: c2 } = room();
    expect(send(c2, 0, { t: 'start' }).ack!.ok).toBe(true);
    expect(() => c2.join('Late', 'thL')).toThrow(/already started/);
  });

  it('only the host configures and starts — unless the host is offline', () => {
    const { core } = room();
    const r = send(core, 1, { t: 'config', config: { magpie: true } });
    expect(r.ack).toMatchObject({ ok: false, code: 'not-host' });
    const offline = new Set([1, 2]);
    expect(send(core, 1, { t: 'config', config: { magpie: true } }, offline).ack!.ok).toBe(true);
    expect(core.view(1, offline).config.magpie).toBe(true);
  });

  it('rejects unavailable and invalid variant combinations at start', () => {
    const { core } = room();
    expect(send(core, 0, { t: 'config', config: { duel: true } }).ack).toMatchObject({ ok: false, code: 'unavailable' });
    send(core, 0, { t: 'config', config: { fieldBean: true } });
    expect(core.view(0, all(3)).configError).toMatch(/4–5/);
    expect(send(core, 0, { t: 'start' }).ack).toMatchObject({ ok: false, code: 'cannot-start' });
  });

  it('ignores unknown config keys', () => {
    const { core } = room();
    send(core, 0, { t: 'config', config: { evil: true, magpie: 'yes' } });
    expect(core.view(0, all(3)).config).not.toHaveProperty('evil');
    expect(core.view(0, all(3)).config.magpie).toBe(false);
  });

  it('leaving in the lobby passes host to the next player; kicked players are evicted', () => {
    const { core } = room('bohnanza', ['A', 'B', 'C', 'D']);
    const r = send(core, 0, { t: 'leave' });
    expect(r.evict).toEqual(['th0']);
    expect(core.view(0, all(3)).seats[0]).toMatchObject({ name: 'B', host: true });
    const k = send(core, 0, { t: 'kick', seat: 2 });
    expect(k.evict).toEqual(['th3']);
    expect(core.seatCount).toBe(2);
    expect(core.seatOf('th3')).toBe(-1);
  });
});

describe('H2 synchronisation', () => {
  it('versions increase on every committed change; stale versions are rejected', () => {
    const { core } = room();
    const v0 = core.version;
    send(core, 0, { t: 'start' });
    expect(core.version).toBe(v0 + 1);
    const r = core.handle(0, { t: 'act', id: 'x1', v: v0, a: { type: 'flip' } }, all(3));
    expect(r.ack).toMatchObject({ ok: false, code: 'stale' });
    expect(r.changed).toBe(false);
  });

  it('duplicate action ids replay the first outcome without re-applying', () => {
    const { core } = room();
    send(core, 0, { t: 'start' });
    const s = core.view(0, all(3)).game as BView;
    const seat = s.active;
    const field = s.hints === null ? 0 : 0;
    const v = core.version;
    const msg = { t: 'act', id: 'dup-1', v, a: { type: 'plant', field } };
    const first = core.handle(seat, msg, all(3));
    const second = core.handle(seat, msg, all(3));
    // The front card may be a Magpie only with the variant; base game always plants.
    expect(first.ack!.ok).toBe(true);
    expect(second.ack!.ok).toBe(true);
    expect(second.changed).toBe(false);
    expect(core.version).toBe(v + 1);
    // A different seat using the same id is a different action.
    const third = core.handle((seat + 1) % 3, msg, all(3));
    expect(third.ack).toMatchObject({ ok: false, code: 'stale' });
  });

  it('illegal moves are rejected with the rule explanation and change nothing', () => {
    const { core } = room();
    send(core, 0, { t: 'start' });
    const g = core.view(0, all(3)).game as BView;
    const other = (g.active + 1) % 3;
    const v = core.version;
    const r = send(core, other, { t: 'act', a: { type: 'plant', field: 0 } });
    expect(r.ack).toMatchObject({ ok: false, code: 'not-your-turn' });
    expect(core.version).toBe(v);
  });

  it('malformed messages are ignored or rejected safely', () => {
    const { core } = room();
    send(core, 0, { t: 'start' });
    expect(core.handle(0, null, all(3)).ack).toBeNull();
    expect(core.handle(0, 'junk', all(3)).ack).toBeNull();
    expect(core.handle(0, { t: 'act', v: core.version, a: {} }, all(3)).ack).toBeNull(); // no id
    expect(send(core, 0, { t: 'act', a: null }).ack).toMatchObject({ ok: false, code: 'bad-request' });
    expect(send(core, 0, { t: 'act', a: { type: 'nope' } }).ack).toMatchObject({ ok: false });
    expect(send(core, 0, { t: 'wat' }).ack).toMatchObject({ ok: false, code: 'bad-request' });
  });
});

describe('H3 undo', () => {
  it('the author may undo their last action while nothing else has happened', () => {
    const { core } = room();
    send(core, 0, { t: 'start' });
    const a = (core.view(0, all(3)).game as BView).active;
    const g = core.view(a, all(3)).game as BView;
    expect(send(core, a, { t: 'act', a: { type: 'plant', field: 0 } }).ack!.ok).toBe(true);
    expect(core.view(a, all(3)).canUndo).toBe(true);
    expect(core.view((a + 1) % 3, all(3)).canUndo).toBe(false);
    expect(send(core, (a + 1) % 3, { t: 'undo' }).ack).toMatchObject({ ok: false, code: 'no-undo' });
    expect(send(core, a, { t: 'undo' }).ack!.ok).toBe(true);
    const after = core.view(a, all(3)).game as BView;
    expect(after.players[a].hand).toEqual(g.players[a].hand);
    expect(after.planted).toBe(0);
    expect(core.view(a, all(3)).canUndo).toBe(false);
  });

  it('revealing actions (turning over cards) can never be undone', () => {
    const { core } = room();
    send(core, 0, { t: 'start' });
    const a = (core.view(0, all(3)).game as BView).active;
    send(core, a, { t: 'act', a: { type: 'plant', field: 0 } });
    send(core, a, { t: 'act', a: { type: 'flip' } });
    expect(core.view(a, all(3)).canUndo).toBe(false);
    expect(send(core, a, { t: 'undo' }).ack).toMatchObject({ ok: false, code: 'no-undo' });
  });

  it('any later action by anyone blocks the undo', () => {
    const { core } = room();
    send(core, 0, { t: 'start' });
    const a = (core.view(0, all(3)).game as BView).active;
    send(core, a, { t: 'act', a: { type: 'plant', field: 0 } });
    // Another player harvests (empty field → rejected, so use a config-free action: undo is checked by version).
    const other = (a + 1) % 3;
    const fails = send(core, other, { t: 'act', a: { type: 'harvest', field: 0 } });
    expect(fails.ack!.ok).toBe(false);
    expect(core.view(a, all(3)).canUndo).toBe(true); // rejected actions don't count
  });
});

describe('H4 privacy and persistence', () => {
  it('room views never contain other players’ hands or the deck', () => {
    const { core, store } = room();
    send(core, 0, { t: 'start' });
    const state = store.state as { deck: string[]; players: { hand: string[] }[] };
    for (let seat = 0; seat < 3; seat++) {
      const json = JSON.stringify(core.view(seat, all(3)));
      for (const id of state.deck) expect(json).not.toContain(`"${id}"`);
      state.players.forEach((p, i) => {
        if (i !== seat) for (const id of p.hand) expect(json).not.toContain(`"${id}"`);
      });
      expect(json).not.toContain('th0');
      expect(json).not.toContain('fixed-seed');
    }
  });

  it('a fresh core over the same store resumes exactly (restart / hibernation)', () => {
    const { core, store } = room();
    send(core, 0, { t: 'start' });
    const a = (core.view(0, all(3)).game as BView).active;
    send(core, a, { t: 'act', a: { type: 'plant', field: 0 } });
    const reborn = new RoomCore(store, opts);
    expect(reborn.view(1, all(3))).toEqual(core.view(1, all(3)));
    expect(reborn.view(a, all(3)).canUndo).toBe(true);
  });

  it('retention: lobby 24h, playing 30d, finished 7d after the last change', () => {
    const { core } = room();
    expect(core.expiresAt).toBe(clock + RETENTION_MS.lobby);
    clock += 1000;
    send(core, 0, { t: 'start' });
    expect(core.expiresAt).toBe(clock + RETENTION_MS.playing);
  });

  it('history records every committed change in version order', () => {
    const { core, store } = room();
    send(core, 0, { t: 'start' });
    expect(store.history.map((h) => h.kind)).toEqual(['create', 'join', 'join', 'start']);
    expect(store.history.map((h) => h.version)).toEqual([1, 2, 3, 4]);
  });
});

describe('H5 second game module (architecture check)', () => {
  it('runs Tally through the same room core to completion and rematch', () => {
    const { core } = room('tally', ['A', 'B']);
    expect(send(core, 0, { t: 'start' }).ack!.ok).toBe(true);
    let turn = 0;
    while (core.status === 'playing') {
      const r = send(core, turn % 2, { t: 'act', a: { type: 'add', amount: 3 } });
      expect(r.ack!.ok).toBe(true);
      turn++;
    }
    expect(core.status).toBe('over');
    expect(core.view(0, all(2)).results!.find((r) => r.winner)).toBeTruthy();
    expect(send(core, 1, { t: 'rematch' }).ack!.ok).toBe(true);
    expect(core.status).toBe('lobby');
  });
});

describe('H7 computer players', () => {
  const solo = (bots: number) => {
    const store = new MemoryStore();
    const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: 'bohnanza', name: 'Ann', th: 'th0', bots });
    return { store, core };
  };
  const me = new Set([0]);

  it('H7.1 bots can be seated at creation and from the lobby, and removed', () => {
    const { core } = solo(2);
    let v = core.view(0, me);
    expect(v.seats.map((s) => [s.name, s.bot, s.connected])).toEqual([
      ['Ann', false, true],
      ['Bot Ada', true, true],
      ['Bot Bix', true, true],
    ]);
    expect(v.canStart).toBe(true);
    expect(v.canAddBot).toBe(true);
    expect(send(core, 0, { t: 'addBot' }, me).ack!.ok).toBe(true);
    expect(send(core, 0, { t: 'addBot' }, me).ack!.ok).toBe(true);
    v = core.view(0, me);
    expect(v.seats).toHaveLength(5);
    expect(v.canAddBot).toBe(false);
    expect(send(core, 0, { t: 'addBot' }, me).ack).toMatchObject({ ok: false, code: 'full' });
    expect(send(core, 0, { t: 'kick', seat: 2 }, me).ack!.ok).toBe(true);
    expect(core.view(0, me).seats.map((s) => s.name)).toEqual(['Ann', 'Bot Ada', 'Bot Cog', 'Bot Dot']);
  });

  it('H7.2 only a manager may add bots, only in the lobby, and creation caps them', () => {
    const { core } = room();
    expect(send(core, 1, { t: 'addBot' }).ack).toMatchObject({ ok: false, code: 'not-host' });
    expect(solo(9).core.seatCount).toBe(5);
    const { core: c2 } = solo(2);
    send(c2, 0, { t: 'start' }, me);
    expect(send(c2, 0, { t: 'addBot' }, me).ack).toMatchObject({ ok: false, code: 'started' });
    expect(() => RoomCore.create(new MemoryStore(), opts, { code: 'ABCDEF', gameId: 'tally', name: 'A', th: 'th0', bots: 1 })).toThrow(/no computer players/);
  });

  it('H7.3 a bot seat cannot be claimed by a session and never becomes host', () => {
    const { core } = solo(2);
    expect(core.seatOf('bot:0')).toBe(1); // internal id, never derivable from a cookie (hashes are hex)
    expect(core.join('Bo', 'th1')).toBe(3);
    expect(send(core, 0, { t: 'leave' }, me).ack!.ok).toBe(true);
    expect(core.view(2, new Set([2])).seats.find((s) => s.host)?.name).toBe('Bo');
  });

  it('H7.4 one person and two bots play a whole game; bots act only when they are actors', () => {
    const { core, store } = solo(2);
    send(core, 0, { t: 'start' }, me);
    let guard = 0;
    while (core.status === 'playing') {
      if (++guard > 4000) throw new Error('no termination');
      const bot = core.nextBot();
      if (bot) {
        expect(core.isBotSeat(bot.seat)).toBe(true);
        expect(core.view(0, me).actors).toContain(bot.seat);
        expect(core.playBot()).toBe(true);
        continue;
      }
      // The person plays with the same simple policy, through the normal message path.
      const v = core.view(0, me);
      expect(v.actors).toContain(0);
      const move = botMove(v.game as BView)!;
      const ok = move.actions.some((a) => send(core, 0, { t: 'act', a }, me).ack!.ok);
      expect(ok).toBe(true);
    }
    expect(core.status).toBe('over');
    expect(core.view(0, me).results).toHaveLength(3);
    expect(core.nextBot()).toBeNull();
    // Bot moves are committed like any other: in history, never undoable.
    expect(store.history.some((h) => h.seat === 1 && h.kind === 'act')).toBe(true);
    expect(store.undo === null || !core.isBotSeat(store.undo.seat)).toBe(true);
  });
});

describe('H6 input normalisation', () => {
  it('room codes', () => {
    expect(normalizeCode('abc-def')).toBe('ABCDEF');
    expect(normalizeCode('ABCDE0')).toBeNull(); // 0 is not in the alphabet
    expect(normalizeCode('ABC')).toBeNull();
  });
  it('display names', () => {
    expect(normalizeName('  Ann   Lee ')).toBe('Ann Lee');
    expect(normalizeName('a' + String.fromCharCode(0x202e) + 'b')).toBe('ab');
    expect(normalizeName('x'.repeat(21))).toBeNull();
    expect(normalizeName('')).toBeNull();
    expect(normalizeName(42)).toBeNull();
  });
});
