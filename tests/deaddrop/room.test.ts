/** Dead Drop in a real room (DD-ROOM-*): simultaneity, retries, reconnection, ready checks and what gets stored. */
import { describe, expect, it } from 'vitest';
import type { DState, DView } from '../../src/games/deaddrop/rules/types';
import { GRACE_MS, MemoryStore, RoomCore } from '../../src/server/core';
import { deliver, decoy, intercept } from './helpers';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => 'room-seed' };
const both = new Set([0, 1]);
let ids = 0;

function lobby() {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: 'deaddrop', name: 'Ann', th: 't0' });
  core.join('Bo', 't1');
  return { store, core };
}

const send = (core: RoomCore, seat: number, msg: Record<string, unknown>, connected = both) => core.handle(seat, { id: `m${++ids}`, v: core.version, ...msg }, connected);

function playing() {
  const r = lobby();
  send(r.core, 0, { t: 'ready', on: true });
  send(r.core, 1, { t: 'ready', on: true });
  expect(send(r.core, 0, { t: 'start' }).ack!.ok).toBe(true);
  return r;
}

const view = (core: RoomCore, seat: number) => core.view(seat, both).game as DView;
const act = (core: RoomCore, seat: number, a: unknown, v = core.version) => core.handle(seat, { id: `m${++ids}`, t: 'act', v, a }, both).ack!;

function brief(core: RoomCore) {
  const round = view(core, 0).round;
  for (const seat of [0, 1]) expect(act(core, seat, { type: 'claim', round, claim: { kind: 'none' } }).ok).toBe(true);
  for (const seat of [0, 1]) expect(act(core, seat, { type: 'ack', round, count: 1 }).ok).toBe(true);
}

describe('DD-ROOM lobby', () => {
  it('DD-ROOM1: both must be ready; a change of seats or a rematch clears it', () => {
    const { core } = lobby();
    expect(core.view(0, both).canStart).toBe(false);
    expect(core.view(0, both).configError).toContain('Ann and Bo');
    send(core, 0, { t: 'ready', on: true });
    expect(core.view(1, both).ready).toEqual([0]);
    expect(core.view(0, both).canStart).toBe(false);
    expect(send(core, 0, { t: 'start' }).ack).toMatchObject({ ok: false, code: 'cannot-start' });
    // Both pressing Ready at once, against the same room version, must both count.
    const v = core.version;
    send(core, 0, { t: 'ready', on: false });
    send(core, 0, { t: 'ready', on: true, v });
    send(core, 1, { t: 'ready', on: true, v });
    expect(core.view(0, both).canStart).toBe(true);
    send(core, 1, { t: 'ready', on: false });
    expect(core.view(0, both).canStart).toBe(false);
    send(core, 1, { t: 'leave' });
    expect(core.view(0, new Set([0])).ready).toEqual([]);
  });

  it('DD-ROOM2: games without a ready check refuse the message and start as before', () => {
    const store = new MemoryStore();
    const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: 'clockwork', name: 'Ann', th: 't0' });
    expect(send(core, 0, { t: 'ready', on: true }).ack).toMatchObject({ ok: false, code: 'bad-request' });
    expect(core.view(0, new Set([0])).ready).toBeUndefined();
  });

  it('DD-ROOM3: a third player cannot sit down, and no bots can be seated', () => {
    const { core } = lobby();
    expect(() => core.join('Cy', 't2')).toThrow(/full/);
    expect(core.view(0, both).canAddBot).toBe(false);
    expect(send(core, 0, { t: 'addBot' }).ack).toMatchObject({ ok: false });
  });
});

describe('DD-ROOM simultaneity', () => {
  it('DD-ROOM4: orders sent against the same room version both count, and resolve once', () => {
    const { core } = playing();
    brief(core);
    const v = core.version;
    expect(act(core, 0, { type: 'order', round: 1, order: deliver(view(core, 0).mine!.missions[0]) }, v).ok).toBe(true);
    expect(act(core, 1, { type: 'order', round: 1, order: decoy('hotel') }, v).ok).toBe(true);
    expect(view(core, 0).phase).toBe('report');
    expect(view(core, 0).rounds).toHaveLength(1);
  });

  it('DD-ROOM5: a repeated delivery of one message changes nothing and replays its answer', () => {
    const { core, store } = playing();
    brief(core);
    const msg = { id: 'once', t: 'act', v: core.version, a: { type: 'order', round: 1, order: decoy('hotel') } };
    expect(core.handle(0, msg, both).ack!.ok).toBe(true);
    const v = core.version;
    const rows = store.history.length;
    const again = core.handle(0, msg, both);
    expect(again.ack!.ok).toBe(true);
    expect(again.changed).toBe(false);
    expect(core.version).toBe(v);
    expect(store.history.length).toBe(rows);
  });

  it('DD-ROOM6: a double-click (two ids, same order) locks one order, and the second is refused', () => {
    const { core } = playing();
    brief(core);
    const v = core.version;
    expect(act(core, 0, { type: 'order', round: 1, order: decoy('hotel') }, v).ok).toBe(true);
    expect(act(core, 0, { type: 'order', round: 1, order: decoy('harbour') }, v)).toMatchObject({ ok: false, code: 'locked' });
    expect(view(core, 0).mine!.order).toEqual(decoy('hotel'));
  });

  it('DD-ROOM7: a stale version never ends up on a later round', () => {
    const { core } = playing();
    brief(core);
    act(core, 0, { type: 'order', round: 1, order: decoy('hotel') });
    act(core, 1, { type: 'order', round: 1, order: decoy('hotel') });
    act(core, 0, { type: 'continue', round: 1 });
    act(core, 1, { type: 'continue', round: 1 });
    brief(core);
    expect(act(core, 0, { type: 'order', round: 1, order: decoy('harbour') })).toMatchObject({ ok: false, code: 'wrong-round' });
    expect(view(core, 0).mine!.order).toBeNull();
  });
});

describe('DD-ROOM persistence', () => {
  it('DD-ROOM8: a fresh room object over the same store restores the game for both players', () => {
    const { core, store } = playing();
    brief(core);
    act(core, 0, { type: 'order', round: 1, order: decoy('hotel') });
    const fresh = new RoomCore(store, opts);
    expect(fresh.seatOf('t0')).toBe(0);
    expect(view(fresh, 0)).toEqual(view(core, 0));
    expect(view(fresh, 1)).toEqual(view(core, 1));
    expect(act(fresh, 0, { type: 'order', round: 1, order: decoy('harbour') })).toMatchObject({ ok: false, code: 'locked' });
    expect(act(fresh, 1, { type: 'order', round: 1, order: decoy('hotel') }).ok).toBe(true);
    expect(view(fresh, 0).phase).toBe('report');
  });

  it('DD-ROOM9: a player who loses the connection keeps the seat through the grace period and beyond', () => {
    const { core } = playing();
    brief(core);
    const alone = new Set([0]);
    expect(core.presence(alone)).toBe('changed');
    clock += GRACE_MS + 1;
    expect(core.presence(alone)).toBe('same');
    expect(core.isBotSeat(1)).toBe(false);
    expect(core.status).toBe('playing');
    expect(core.presence(both)).toBe('changed');
    expect(core.view(1, both).seats[1].graceUntil).toBeUndefined();
  });

  it('DD-ROOM10: quitting ends the match and deletes the room, as for any game without bots', () => {
    const { core } = playing();
    const r = send(core, 1, { t: 'leave' });
    expect(r.end).toBe('Bo');
  });

  it('DD-ROOM11: the server clock stamps statements and drives the phase clock', () => {
    const { core } = playing();
    clock += 5000;
    act(core, 0, { type: 'claim', round: 1, claim: { kind: 'none' } });
    expect(view(core, 1).statements[0].at).toBe(clock);
    expect(act(core, 0, { type: 'callTime', round: 1, phase: 'briefing' })).toMatchObject({ ok: false, code: 'too-early' });
    clock += 120_000;
    expect(act(core, 0, { type: 'callTime', round: 1, phase: 'briefing' }).ok).toBe(true);
    expect(view(core, 0).phase).toBe('orders');
  });

  it('DD-ROOM12: a finished match is immutable, and a rematch starts over from ready', () => {
    const { core } = playing();
    const state = () => (core as unknown as { getState(): DState }).getState();
    const finish = (seat: number) => {
      for (let i = 0; i < 7 && core.status === 'playing'; i++) {
        brief(core);
        const m = state().seats[seat].missions;
        const round = view(core, 0).round;
        act(core, seat, { type: 'order', round, order: deliver(m[i % 2]) });
        act(core, 1 - seat, { type: 'order', round, order: decoy(m[0] === 'hotel' ? 'harbour' : 'hotel') });
        if (core.status !== 'playing') break;
        act(core, 0, { type: 'continue', round });
        act(core, 1, { type: 'continue', round });
      }
    };
    finish(0);
    expect(core.status).toBe('over');
    const end = core.view(0, both);
    expect(end.results!.some((r) => r.seat === 0 && r.winner)).toBe(true);
    expect(act(core, 0, { type: 'chat', text: 'too late' })).toMatchObject({ ok: false, code: 'not-playing' });
    expect(core.view(0, both).game).toEqual(end.game);
    expect(send(core, 1, { t: 'rematch' }).ack!.ok).toBe(true);
    expect(core.status).toBe('lobby');
    expect(core.view(0, both).ready).toEqual([]);
    expect(send(core, 0, { t: 'start' }).ack).toMatchObject({ ok: false, code: 'cannot-start' });
  });
});

describe('DD-ROOM privacy', () => {
  it('DD-ROOM13: history rows and action records hold no order, target, claim or chat', () => {
    const { core, store } = playing();
    act(core, 0, { type: 'chat', text: 'meet me at the harbour' });
    brief(core);
    act(core, 0, { type: 'order', round: 1, order: intercept('embassy') });
    act(core, 1, { type: 'order', round: 1, order: decoy('embassy') });
    const rows = JSON.stringify(store.history);
    expect(rows).not.toMatch(/embassy|hotel|harbour|station|intercept|decoy|deliver|meet me/);
    expect(rows).toContain('"order');
    expect(JSON.stringify([...store.actions.values()])).not.toMatch(/embassy|meet me/);
  });

  it('DD-ROOM14: refusals say nothing about the opponent', () => {
    const { core } = playing();
    brief(core);
    const missions = (core as unknown as { getState(): DState }).getState().seats[1].missions;
    const other = ['embassy', 'station', 'hotel', 'harbour'].filter((l) => !(core as unknown as { getState(): DState }).getState().seats[0].missions.includes(l as never));
    const r = act(core, 0, { type: 'order', round: 1, order: deliver(other[0] as never) }) as { error?: string };
    expect(r.error).toBe('You can only deliver at your own mission locations.');
    for (const m of missions) expect(r.error).not.toContain(m);
  });

  it('DD-ROOM15: the room view holds no hidden field before the end', () => {
    const { core } = playing();
    brief(core);
    act(core, 0, { type: 'order', round: 1, order: decoy('embassy') });
    const raw = JSON.stringify(core.view(1, both));
    expect(raw).not.toContain('"action"');
    expect(raw).not.toContain('embassy');
    expect(raw).not.toContain('"seed"');
    expect(core.view(1, both).results).toBeNull();
  });
});
