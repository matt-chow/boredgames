/** Palazzo in a real room (PZ-NET*, PZ-TIME*, PZ-SET5–6): the server clock, retries, absences, rematches, storage. */
import { describe, expect, it } from 'vitest';
import type { PState, PView } from '../../src/games/palazzo/rules/types';
import { MemoryStore, RoomCore } from '../../src/server/core';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => `room-seed-${clock}` };
let ids = 0;
const everyone = (n: number) => new Set(Array.from({ length: n }, (_, i) => i));

function lobby(n = 3) {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'PALAZZ', gameId: 'palazzo', name: 'P0', th: 't0' });
  for (let i = 1; i < n; i++) core.join(`P${i}`, `t${i}`);
  return { store, core, all: everyone(n) };
}

const send = (core: RoomCore, seat: number, msg: Record<string, unknown>, connected: Set<number>) => {
  const r = core.handle(seat, { id: `m${++ids}`, v: core.version, ...msg }, connected);
  // As the Durable Object does: any change is followed by a presence pass, which runs the game's clock.
  if (r.changed) core.presence(connected);
  return r;
};
const state = (core: RoomCore) => (core as unknown as { getState(): PState }).getState();
const view = (core: RoomCore, seat: number, all: Set<number>) => core.view(seat, all).game as PView;
const act = (core: RoomCore, seat: number, a: Record<string, unknown>, all: Set<number>, id = `m${++ids}`) => {
  const r = core.handle(seat, { id, t: 'act', v: 0, a: { step: state(core).step, ...a } }, all);
  if (r.changed) core.presence(all);
  return r.ack!;
};

function playing(n = 3, config?: Record<string, unknown>) {
  const r = lobby(n);
  if (config) expect(send(r.core, 0, { t: 'config', config }, r.all).ack!.ok).toBe(true);
  expect(send(r.core, 0, { t: 'start' }, r.all).ack!.ok).toBe(true);
  return r;
}

describe('PZ-ROOM', () => {
  it('PZ-SET6: the host sets the timer, disconnect rule and draft; they lock once the game starts', () => {
    const { core, all } = lobby(2);
    expect(send(core, 1, { t: 'config', config: { timer: 30 } }, all).ack).toMatchObject({ ok: false, code: 'not-host' });
    expect(send(core, 0, { t: 'config', config: { timer: 11 } }, all).ack).toMatchObject({ ok: false, code: 'bad-config' });
    expect(send(core, 0, { t: 'config', config: { timer: 30, disconnect: 'continue', draft: true } }, all).ack!.ok).toBe(true);
    expect(send(core, 0, { t: 'start' }, all).ack!.ok).toBe(true);
    expect(state(core).config).toEqual({ timer: 30, disconnect: 'continue', draft: true });
    expect(state(core).phase).toBe('draft');
    expect(send(core, 0, { t: 'config', config: { timer: 10 } }, all).ack).toMatchObject({ ok: false, code: 'started' });
  });

  it('PZ-TIME2: the server closes a window when its time is up, with nobody sending anything', () => {
    const { core, all } = playing(3, { timer: 10 });
    const up = state(core).current;
    expect(act(core, up, { type: 'declare', kind: 'collect' }, all).ok).toBe(true);
    expect(core.wakeAt).toBe(clock + 10_000);
    clock += 9_000;
    expect(core.presence(all)).toBe('same');
    clock += 1_000;
    expect(core.presence(all)).toBe('changed');
    expect(state(core).seats[up].coins).toBe(5);
    expect(core.wakeAt).toBeNull();
  });

  it('PZ-CHAL4 / PZ-NET1: two challenges in the same window — the first counts, the second is stale; a retry counts once', () => {
    const { core, all } = playing();
    const up = state(core).current;
    const [a, b] = [1, 2].map((d) => (up + d) % 3);
    act(core, up, { type: 'declare', kind: 'collect' }, all);
    const step = state(core).step;
    const first = core.handle(a, { id: 'c1', t: 'act', v: 0, a: { type: 'respond', step, choice: 'challenge' } }, all);
    const second = core.handle(b, { id: 'c2', t: 'act', v: 0, a: { type: 'respond', step, choice: 'challenge' } }, all);
    expect(first.ack!.ok).toBe(true);
    expect(second.ack).toMatchObject({ ok: false, code: 'stale' });
    expect(state(core).log.filter((e) => e.t === 'challenge')).toHaveLength(1);
    // The same message again (a dropped ack) is answered from the record, not applied twice.
    const v = core.version;
    expect(core.handle(a, { id: 'c1', t: 'act', v: 0, a: { type: 'respond', step, choice: 'challenge' } }, all).ack!.ok).toBe(true);
    expect(core.version).toBe(v);
  });

  it('PZ-NET5: only the seat whose decision it is can make it; nobody acts for another seat', () => {
    const { core, all } = playing();
    const up = state(core).current;
    const other = (up + 1) % 3;
    expect(act(core, other, { type: 'declare', kind: 'income' }, all)).toMatchObject({ ok: false, code: 'not-your-turn' });
    expect(act(core, up, { type: 'respond', choice: 'pass' }, all)).toMatchObject({ ok: false, code: 'no-window' });
  });

  it('PZ-NET2: a closed connection pauses the table at once, and coming back resumes it with the time it had', () => {
    const { core, all } = playing();
    const up = state(core).current;
    act(core, up, { type: 'declare', kind: 'collect' }, all);
    const away = new Set([...all].filter((i) => i !== (up + 2) % 3));
    clock += 3_000;
    expect(core.presence(away)).toBe('changed');
    expect(view(core, up, away).pause).toMatchObject({ seats: [(up + 2) % 3] });
    expect(core.wakeAt).toBeNull();
    expect(act(core, (up + 1) % 3, { type: 'respond', choice: 'pass' }, away)).toMatchObject({ ok: false, code: 'paused' });
    expect(act(core, (up + 1) % 3, { type: 'chat', text: 'waiting' }, away).ok).toBe(true);
    clock += 300_000;
    core.presence(away);
    expect(state(core).phase).toBe('window');
    expect(core.status).toBe('playing');
    clock += 1_000;
    core.presence(all);
    expect(state(core).pause).toBeNull();
    expect(core.wakeAt).toBe(clock + 12_000);
  });

  it('PZ-NET5: the room waits ten minutes for a table everyone has left before closing it', () => {
    const { core } = playing();
    const none = new Set<number>();
    expect(core.presence(none)).toBe('changed');
    clock += 9 * 60_000;
    expect(core.presence(none)).not.toBe('closed');
    clock += 61_000;
    expect(core.presence(none)).toBe('closed');
  });

  it('PZ-SET5: in a rematch the last winner starts, if still seated', () => {
    for (let round = 0; round < 3; round++) {
      const { core, all } = playing(2);
      finish(core, all);
      const winner = core.view(0, all).results!.find((r) => r.winner)!.seat;
      expect(send(core, 0, { t: 'rematch' }, all).ack!.ok).toBe(true);
      expect(send(core, 0, { t: 'start' }, all).ack!.ok).toBe(true);
      expect(state(core).current).toBe(winner);
      clock += 7919;
    }
  });

  it('PZ-SET5: a rematch whose winner left starts with a random player', () => {
    const { core, all } = playing(2);
    finish(core, all);
    const winner = core.view(0, all).results!.find((r) => r.winner)!.seat;
    expect(send(core, 0, { t: 'rematch' }, all).ack!.ok).toBe(true);
    core.join('P2', 't2');
    expect(send(core, winner, { t: 'leave' }, everyone(3)).ack!.ok).toBe(true);
    const rest = everyone(core.seatCount);
    expect(send(core, 0, { t: 'start' }, rest).ack!.ok).toBe(true);
    expect(core.seatCount).toBe(2);
    expect(state(core).n).toBe(2);
  });

  it('PZ-NET6: history rows and stored actions hold no card, role, target or chat; the view holds no hidden card', () => {
    const { core, store, all } = playing(4);
    act(core, 1, { type: 'chat', text: 'she is no magistrate' }, all);
    const up = state(core).current;
    act(core, up, { type: 'declare', kind: 'collect' }, all);
    const rows = JSON.stringify(store.history);
    expect(rows).not.toMatch(/chancellor|magistrate|bravo|envoy|sentinel|"card"|"target"|collect/);
    // Nothing has been revealed yet, so the only roles in the view are the viewer's own cards.
    const g = view(core, 0, all);
    expect(JSON.stringify({ ...g, me: null })).not.toMatch(/"role"|"up"|"hand"/);
    expect(g.me!.hand).toEqual(state(core).seats[0].hand);
  });

  it('a game played to the end through the room finishes and shows results', () => {
    const { core, all } = playing(2);
    finish(core, all);
    expect(core.status).toBe('over');
    expect(core.view(0, all).results!.filter((r) => r.winner)).toHaveLength(1);
  });
});

/** Two players trade Income and Depose until one is out. */
function finish(core: RoomCore, all: Set<number>) {
  for (let i = 0; i < 400 && core.status === 'playing'; i++) {
    const s = state(core);
    const seat = core.view(0, all).actors[0];
    if (s.phase === 'turn') act(core, seat, s.seats[seat].coins >= 7 ? { type: 'declare', kind: 'depose', target: 1 - seat } : { type: 'declare', kind: 'income' }, all);
    else if (s.phase === 'lose') act(core, seat, { type: 'reveal', card: s.seats[seat].hand.find((c) => !c.up)!.id }, all);
  }
  expect(core.status).toBe('over');
}
