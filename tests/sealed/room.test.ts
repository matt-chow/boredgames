/** Sealed Correspondence in a real room (SC-NET*, SC-SET6): settings, retries, absent players, quitting, storage. */
import { describe, expect, it } from 'vitest';
import { KINDS } from '../../src/games/sealed/rules/cards';
import type { SState, SView } from '../../src/games/sealed/rules/types';
import { MemoryStore, RoomCore } from '../../src/server/core';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => 'room-seed' };
let ids = 0;
const everyone = (n: number) => new Set(Array.from({ length: n }, (_, i) => i));

function lobby(n = 3) {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'SEALED', gameId: 'sealed', name: 'P0', th: 't0' });
  for (let i = 1; i < n; i++) core.join(`P${i}`, `t${i}`);
  return { store, core, all: everyone(n) };
}

const send = (core: RoomCore, seat: number, msg: Record<string, unknown>, connected: Set<number>) => core.handle(seat, { id: `m${++ids}`, v: core.version, ...msg }, connected);
const state = (core: RoomCore) => (core as unknown as { getState(): SState }).getState();
const view = (core: RoomCore, seat: number, all: Set<number>) => core.view(seat, all).game as SView;
const act = (core: RoomCore, seat: number, a: unknown, all: Set<number>, id = `m${++ids}`) => core.handle(seat, { id, t: 'act', v: core.version, a }, all).ack!;

function playing(n = 3) {
  const r = lobby(n);
  expect(send(r.core, 0, { t: 'start' }, r.all).ack!.ok).toBe(true);
  return r;
}

/** Some legal move for whoever is up: a deal between rounds, else their first playable card at a legal target. */
function anyMove(core: RoomCore, all: Set<number>, id?: string) {
  const s = state(core);
  if (s.phase === 'between') return { seat: s.next!, turn: s.turn, ack: act(core, s.next!, { type: 'deal', turn: s.turn }, all, id) };
  const me = view(core, s.current, all).me!;
  const card = me.hand.find((c) => c.id === me.playable[0])!;
  const aim = KINDS[card.kind].targets;
  const target = aim === 'any' ? s.current : aim === 'other' ? me.targets[0] : undefined;
  const a = { type: 'play', turn: s.turn, card: card.id, ...(target !== undefined ? { target } : {}), ...(card.kind === 'censor' && target !== undefined ? { guess: 'heir' } : {}) };
  return { seat: s.current, turn: s.turn, ack: act(core, s.current, a, all, id) };
}

describe('SC-ROOM', () => {
  it('SC-SET6: a fifth player in a Classic lobby is told to switch; the ruleset is locked once the game starts', () => {
    const { core, all } = lobby(5);
    expect(core.view(0, all).canStart).toBe(false);
    expect(core.view(0, all).configError).toMatch(/Expanded/);
    expect(send(core, 1, { t: 'config', config: { ruleset: 'expanded' } }, all).ack).toMatchObject({ ok: false, code: 'not-host' });
    expect(send(core, 0, { t: 'config', config: { ruleset: 'expanded', target: 7, timer: 30 } }, all).ack!.ok).toBe(true);
    expect(core.view(0, all).canStart).toBe(true);
    expect(send(core, 0, { t: 'start' }, all).ack!.ok).toBe(true);
    expect(state(core).config).toEqual({ ruleset: 'expanded', target: 7, timer: 30 });
    expect(state(core).deck.length + 1 + 5 + 1).toBe(21);
    expect(send(core, 0, { t: 'config', config: { ruleset: 'classic' } }, all).ack).toMatchObject({ ok: false, code: 'started' });
  });

  it('SC-NET1: a retried action counts once; an action for a turn gone by is refused', () => {
    const { core, all } = playing();
    const first = anyMove(core, all, 'same-id');
    expect(first.ack.ok).toBe(true);
    expect(act(core, first.seat, { type: 'play', turn: first.turn, card: 1 }, all, 'same-id').ok).toBe(true);
    expect(state(core).turn).toBe(first.turn + 1);
    const s = state(core);
    if (s.phase === 'play') expect(act(core, s.current, { type: 'play', turn: first.turn, card: s.seats[s.current].hand[0].id }, all)).toMatchObject({ ok: false, code: 'stale' });
  });

  it('SC-NET3: an absent player’s seat waits for them past the 90 second grace, and nobody plays for them', () => {
    const { core, all } = playing();
    const up = state(core).current;
    const here = new Set([...all].filter((x) => x !== up));
    const turn = state(core).turn;
    core.presence(here);
    expect(core.view((up + 1) % 3, here).seats[up].graceUntil).toBe(clock + 90_000);
    clock += 90_001;
    core.presence(here);
    expect(core.nextBot()).toBeNull();
    expect(state(core).turn).toBe(turn);
    expect(core.view((up + 1) % 3, here).seats[up].standIn).toBeUndefined();
    // Back again: the same hand, and still their move.
    core.presence(all);
    expect(view(core, up, all).me!.hand.map((c) => c.id)).toEqual(state(core).seats[up].hand.map((c) => c.id));
    expect(view(core, up, all).current).toBe(up);
  });

  it('SC-TIME1: the turn timer is shown in the view but never moves the game when it runs out', () => {
    const { core, all } = lobby();
    expect(send(core, 0, { t: 'config', config: { timer: 15 } }, all).ack!.ok).toBe(true);
    expect(send(core, 0, { t: 'start' }, all).ack!.ok).toBe(true);
    const before = structuredClone(state(core));
    expect(view(core, 0, all)).toMatchObject({ since: clock, config: { timer: 15 } });
    clock += 600_000;
    core.presence(all);
    expect(core.nextBot()).toBeNull();
    expect(state(core)).toEqual(before);
  });

  it('SC-NET6: anyone can end an abandoned game; it ends for everyone with no winner', () => {
    const { core, all } = playing();
    const r = send(core, 2, { t: 'leave' }, all);
    expect(r.ack!.ok).toBe(true);
    expect(r.end).toBe('P2');
  });

  it('SC-SEC1: history rows and stored actions hold no card, target, guess or chat', () => {
    const { core, store, all } = playing();
    act(core, 1, { type: 'chat', text: 'she holds the heir' }, all);
    for (let i = 0; i < 3; i++) anyMove(core, all);
    const rows = JSON.stringify(store.history);
    expect(rows).not.toMatch(/heir|dowager|ambassador|magistrate|confessor|duelist|scribe|censor|"card"|"target"|"guess"/);
    expect(JSON.stringify([...store.actions.values()])).not.toMatch(/heir/);
  });

  it('SC-SEC1: a room view carries nobody else’s hand, the deck or the reserve', () => {
    const { core, all } = playing(4);
    const s = state(core);
    const json = JSON.stringify(core.view(0, all));
    const hidden = [...s.deck, s.reserve!, ...s.seats.slice(1).flatMap((x) => x.hand)];
    for (const c of hidden) expect(json).not.toMatch(new RegExp(`"id":${c.id}[,}]`));
    expect(view(core, 0, all).me!.hand).toEqual(s.seats[0].hand);
  });
});
