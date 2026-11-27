/** Apex '66 in a real room: config at the boundary, privacy of history and acks, retries, retention, closing. */
import { describe, expect, it } from 'vitest';
import { apex } from '../../src/games/apex';
import type { AState, AView } from '../../src/games/apex/rules/engine';
import { MemoryStore, RoomCore } from '../../src/server/core';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => `room-seed-${clock}` };
let ids = 0;
const DAY = 24 * 3600_000;

function room(n: number, config: Record<string, unknown> = {}) {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'APEX66', gameId: 'apex', name: 'P0', th: 't0' });
  for (let i = 1; i < n; i++) core.join(`P${i}`, `t${i}`);
  const all = new Set(Array.from({ length: n }, (_, i) => i));
  expect(core.handle(0, { id: `m${++ids}`, v: core.version, t: 'config', config: { laps: 1, ...config } }, all).ack!.ok).toBe(true);
  expect(core.handle(0, { id: `m${++ids}`, v: core.version, t: 'start' }, all).ack!.ok).toBe(true);
  core.presence(all);
  return { store, core, all };
}
const state = (core: RoomCore) => (core as unknown as { getState(): AState }).getState();
const view = (core: RoomCore, seat: number, all: Set<number>) => core.view(seat, all).game as AView;

function planNow(core: RoomCore, seat: number, all: Set<number>, id = `m${++ids}`) {
  const v = view(core, seat, all);
  const a = apex.bot!(v)!.actions[0];
  const r = core.handle(seat, { id, t: 'act', v: 0, a }, all);
  if (r.changed) core.presence(all);
  return r.ack!;
}

describe('AX-ROOM', () => {
  it('the host sets mode, grid and modules; bad values are refused', () => {
    const { core, all } = room(2, { cars: 6, storm: false, mode: 'quick', circuit: 'mizukawa' });
    const s = state(core);
    expect(s.race!.circuit).toBe('mizukawa');
    expect(s.race!.cars).toHaveLength(6);
    expect(s.race!.modules.storm).toBe(false);
    const fresh = new MemoryStore();
    const c2 = RoomCore.create(fresh, opts, { code: 'APEX67', gameId: 'apex', name: 'P0', th: 't0' });
    expect(c2.handle(0, { id: 'x', v: c2.version, t: 'config', config: { cars: 12 } }, new Set([0])).ack).toMatchObject({ ok: false, code: 'bad-config' });
    expect(all.size).toBe(2);
  });

  it('AX-PRV-1 / AX-NET-1 history and acks hold no cards; a retried plan counts once', () => {
    const { store, core, all } = room(2, { cars: 4 });
    const hands = state(core).race!.cars.map((c) => JSON.stringify(c.hand));
    const a = apex.bot!(view(core, 0, all))!.actions[0];
    const ack = core.handle(0, { id: 'same-id', t: 'act', v: 0, a }, all).ack!;
    expect(ack.ok).toBe(true);
    expect(core.handle(0, { id: 'same-id', t: 'act', v: 0, a }, all).ack).toEqual(ack);
    expect(state(core).race!.plans.filter(Boolean)).toHaveLength(1);
    planNow(core, 1, all);
    const rows = JSON.stringify(store.history) + JSON.stringify([...store.actions.values()]);
    expect(rows).not.toMatch(/"cards"|"discard"|"gear"|room-seed/);
    for (const h of hands) expect(rows).not.toContain(h);
    expect(JSON.stringify(view(core, 1, all))).not.toContain('room-seed');
  });

  it('AX-RET-1 a race in progress keeps 7 days; a finished single race 1 day', () => {
    const { core, all } = room(1, { mode: 'solo', cars: 2 });
    expect(core.expiresAt - clock).toBe(7 * DAY);
    for (let i = 0; i < 400 && core.view(0, all).status !== 'over'; i++) planNow(core, 0, all);
    expect(core.view(0, all).status).toBe('over');
    expect(core.expiresAt - clock).toBe(DAY);
  });

  it('AX-RET-1 the host can close the room at any time; nobody else can', () => {
    const { core, all } = room(2, { cars: 3 });
    expect(core.handle(1, { id: 'c1', t: 'close' } as never, all).ack).toMatchObject({ ok: false, code: 'not-host' });
    expect(core.handle(0, { id: 'c2', t: 'close' } as never, all).end).toBe('P0');
  });
});
