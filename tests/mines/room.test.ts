/** Miners & Saboteurs in a real room (MS-ROOM-*): retries, chat during turns, absent players, settings and storage. */
import { describe, expect, it } from 'vitest';
import type { MState, MView } from '../../src/games/mines/rules/types';
import { GRACE_MS, MemoryStore, RoomCore } from '../../src/server/core';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => 'room-seed' };
const all = new Set([0, 1, 2]);
let ids = 0;

function lobby(config: Record<string, unknown> = {}) {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'MINESX', gameId: 'mines', name: 'Ann', th: 't0' });
  core.join('Bo', 't1');
  core.join('Cy', 't2');
  if (Object.keys(config).length) expect(send(core, 0, { t: 'config', config }).ack!.ok).toBe(true);
  return { store, core };
}

const send = (core: RoomCore, seat: number, msg: Record<string, unknown>, connected = all) => core.handle(seat, { id: `m${++ids}`, v: core.version, ...msg }, connected);
const state = (core: RoomCore) => (core as unknown as { getState(): MState }).getState();
const view = (core: RoomCore, seat: number) => core.view(seat, all).game as MView;
const act = (core: RoomCore, seat: number, a: unknown, id = `m${++ids}`) => core.handle(seat, { id, t: 'act', v: core.version, a }, all).ack!;

function playing(config: Record<string, unknown> = {}) {
  const r = lobby(config);
  expect(send(r.core, 0, { t: 'start' }).ack!.ok).toBe(true);
  return r;
}

/** The seat that is up passes its first card. */
function pass(core: RoomCore, id?: string) {
  const s = state(core);
  return { seat: s.current, ack: act(core, s.current, { type: 'pass', turn: s.turn, cards: [s.seats[s.current].hand[0].id] }, id) };
}

describe('MS-ROOM', () => {
  it('MS-ROOM1: settings are checked, and locked once the game starts', () => {
    const { core } = lobby();
    expect(send(core, 0, { t: 'config', config: { rounds: 7 } }).ack).toMatchObject({ ok: false, code: 'bad-config' });
    expect(send(core, 1, { t: 'config', config: { rounds: 5 } }).ack).toMatchObject({ ok: false, code: 'not-host' });
    expect(send(core, 0, { t: 'config', config: { mode: 'duel' } }).ack!.ok).toBe(true);
    expect(core.view(0, all).canStart).toBe(false);
    expect(send(core, 0, { t: 'config', config: { mode: 'expanded', rounds: 5, timer: 60, away: 'autopass', target: 15 } }).ack!.ok).toBe(true);
    expect(send(core, 0, { t: 'start' }).ack!.ok).toBe(true);
    expect(state(core).config).toEqual({ mode: 'expanded', rounds: 5, target: 15, timer: 60, away: 'autopass' });
    expect(send(core, 0, { t: 'config', config: { rounds: 1 } }).ack).toMatchObject({ ok: false, code: 'started' });
  });

  it('MS-ROOM2: a retried message counts once; a move for a turn gone by is refused', () => {
    const { core } = playing();
    const before = state(core).turn;
    const { seat, ack } = pass(core, 'same-id');
    expect(ack.ok).toBe(true);
    const again = act(core, seat, { type: 'pass', turn: before, cards: [] }, 'same-id');
    expect(again.ok).toBe(true);
    expect(state(core).turn).toBe(before + 1);
    const s = state(core);
    expect(act(core, s.current, { type: 'pass', turn: before, cards: [s.seats[s.current].hand[0].id] })).toMatchObject({ ok: false, code: 'stale' });
  });

  it('MS-ROOM3: chat never makes the player who is up send a stale move', () => {
    const { core } = playing();
    const s = state(core);
    const v = core.version;
    const other = (s.current + 1) % 3;
    expect(act(core, other, { type: 'chat', text: 'dig east' }).ok).toBe(true);
    const r = core.handle(s.current, { id: `m${++ids}`, t: 'act', v, a: { type: 'pass', turn: s.turn, cards: [s.seats[s.current].hand[0].id] } }, all).ack!;
    expect(r.ok).toBe(true);
  });

  it('MS-ROOM4: under pause an absent player’s seat waits; under auto-pass a stand-in discards for them', () => {
    for (const away of ['pause', 'autopass']) {
      const { core } = playing({ away });
      const up = state(core).current;
      const here = new Set([0, 1, 2].filter((x) => x !== up));
      core.presence(here);
      clock += GRACE_MS + 1;
      core.presence(here);
      expect(core.view((up + 1) % 3, here).seats[up].standIn).toBe(true);
      const move = core.nextBot();
      if (away === 'pause') expect(move).toBeNull();
      else {
        expect(move!.actions).toHaveLength(1);
        expect(core.playBot()).toBe(true);
        expect(state(core).log.at(-2)).toMatchObject({ t: 'pass', seat: up });
      }
      // They come back and have their seat again.
      core.presence(all);
      expect(core.view(up, all).seats[up].standIn).toBeUndefined();
    }
  });

  it('MS-ROOM5: the turn timer can be called by anyone once it runs out', () => {
    const { core } = playing({ timer: 30 });
    const s = state(core);
    const other = (s.current + 1) % 3;
    expect(act(core, other, { type: 'timeout', turn: s.turn })).toMatchObject({ ok: false, code: 'early' });
    clock += 30_000;
    expect(act(core, other, { type: 'timeout', turn: s.turn }).ok).toBe(true);
    expect(state(core).current).not.toBe(s.current);
  });

  it('MS-ROOM6: the host role passes on when the host leaves the lobby', () => {
    const { core } = lobby();
    send(core, 0, { t: 'leave' });
    expect(core.view(0, new Set([0, 1])).seats.find((x) => x.host)!.name).toBe('Bo');
  });

  it('MS-ROOM7: history rows and action records hold no card, square, target or chat', () => {
    const { core, store } = playing();
    act(core, 1, { type: 'chat', text: 'the gold is north' });
    for (let i = 0; i < 4; i++) pass(core);
    const rows = JSON.stringify(store.history);
    expect(rows).not.toMatch(/north|"cards"|"turn"|"card"/);
    expect(rows).toContain('pass');
    expect(JSON.stringify([...store.actions.values()])).not.toMatch(/north/);
  });

  it('MS-ROOM8: a room view carries nobody else’s hand or role', () => {
    const { core } = playing();
    const s = state(core);
    const json = JSON.stringify(core.view(0, all));
    for (const x of s.seats.slice(1)) for (const c of x.hand) expect(json).not.toMatch(new RegExp(`"id":${c.id}[,}]`));
    expect(view(core, 0).me!.role).toBe(s.seats[0].role);
    expect(JSON.stringify({ ...view(core, 0), me: null })).not.toMatch(/"role"/);
  });

  it('MS-ATTR2: every player sees who laid a tunnel, and still does after the room reloads', () => {
    const { store, core } = playing();
    const s = state(core);
    const seat = s.current;
    // Stage a tunnel in the seat's hand through the stored state, as a reconnecting client would find it.
    s.seats[seat].hand[0] = { id: 999, kind: 'straightH' };
    expect(act(core, seat, { type: 'path', turn: s.turn, card: 999, x: 1, y: 0, rot: 0 }).ok).toBe(true);
    const fresh = new RoomCore(store, opts);
    for (const c of [core, fresh])
      for (const p of [0, 1, 2]) expect(view(c, p).cells.find((x) => x.x === 1 && x.y === 0)).toMatchObject({ kind: 'straightH', by: seat });
  });
});
