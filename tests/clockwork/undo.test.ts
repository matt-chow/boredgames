/** Undoing several conversions, one at a time, through the room (KC3-UNDO). See docs/CLOCKWORK.md. */
import { describe, expect, it } from 'vitest';
import { createDeckGame, type DeckState, type DeckView } from '../../src/engine/deckbuilder';
import { SPARK } from '../../src/games/clockwork/rules/cards';
import { RULES_V2 } from '../../src/games/clockwork/rules/ruleset';
import { MemoryStore, RoomCore, type UndoRow } from '../../src/server/core';

const opts = { now: () => 1000, seed: () => 'undo-room' };
const connected = new Set([0, 1]);

/** A two-person game in the turn's Market phase, with Influence in hand: the state the bug report starts from. */
function table(influence = 3) {
  const store = new MemoryStore();
  const setup = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: 'clockwork', name: 'One', th: 'a' });
  setup.join('Two', 'b');
  setup.handle(0, { t: 'start', id: 's', v: setup.version }, connected);
  const start = store.getState() as DeckState;
  const seat = start.turn.seat;
  start.players[seat].tokens[SPARK] = influence;
  start.turn.phase = 'buy';
  store.putState(start);
  let n = 0;
  const core = new RoomCore(store, opts);
  const send = (msg: Record<string, unknown>) => core.handle(seat, { id: `m${++n}`, v: core.version, ...msg }, connected).ack!;
  const res = () => {
    const s = store.getState() as DeckState;
    return { coins: s.turn.coins, influence: s.players[seat].tokens[SPARK], converted: s.turn.converted };
  };
  return { store, core, seat, send, res, canUndo: () => core.view(seat, connected).canUndo };
}

describe('undoing conversions', () => {
  it('KC3-UNDO-1: two conversions undo one at a time, back to the balances the turn began with', () => {
    const { send, res, canUndo } = table();
    const start = res();
    expect(start).toMatchObject({ converted: 0, influence: 3 });
    send({ t: 'act', a: { type: 'convert' } });
    const one = res();
    expect(send({ t: 'act', a: { type: 'convert' } }).ok).toBe(true);
    expect(res()).toEqual({ coins: start.coins + 2, influence: 1, converted: 2 });

    expect(send({ t: 'undo' }).ok).toBe(true);
    expect(res()).toEqual(one);
    expect(one).toEqual({ coins: start.coins + 1, influence: 2, converted: 1 });
    expect(canUndo()).toBe(true);

    expect(send({ t: 'undo' }).ok).toBe(true);
    expect(res()).toEqual(start);
    expect(canUndo()).toBe(false);
    expect(send({ t: 'undo' })).toMatchObject({ ok: false, code: 'no-undo' });
  });

  it('KC3-UNDO-2: after a partial undo, converting again counts towards the same limit and can still be undone', () => {
    const { send, res } = table();
    const start = res();
    send({ t: 'act', a: { type: 'convert' } });
    send({ t: 'act', a: { type: 'convert' } });
    send({ t: 'undo' });
    expect(send({ t: 'act', a: { type: 'convert' } }).ok).toBe(true);
    expect(res().converted).toBe(2);
    expect(send({ t: 'act', a: { type: 'convert' } })).toMatchObject({ ok: false, code: 'illegal-convert' });
    expect(res()).toEqual({ coins: start.coins + 2, influence: 1, converted: 2 });
    send({ t: 'undo' });
    send({ t: 'undo' });
    expect(res()).toEqual(start);
  });

  it('KC3-UNDO-3: undo stops at anything that showed hidden information', () => {
    const { store, send, res, seat, canUndo } = table();
    send({ t: 'act', a: { type: 'convert' } });
    expect(canUndo()).toBe(true);
    // Ending the turn draws a new hand: a conversion before it stays done, whoever asks.
    send({ t: 'act', a: { type: 'end-phase' } });
    expect((store.getState() as DeckState).turn.seat).not.toBe(seat);
    expect(canUndo()).toBe(false);
    expect(send({ t: 'undo' })).toMatchObject({ ok: false, code: 'no-undo' });
    expect(res().converted).toBe(0);
    expect(res().influence).toBe(2);
  });

  it('KC3-UNDO-4: a revealing action in the middle ends the chain, and only later steps can be undone', () => {
    const { store, res, seat } = table(8);
    const s = store.getState() as DeckState;
    // A Crown Project that draws a card from a hidden deck.
    s.projects[0] = { key: 'public_clock', by: null, onTurn: null, surcharges: [] };
    s.turn.coins = 20;
    store.putState(s);
    const core = new RoomCore(store, opts);
    const go = (msg: Record<string, unknown>, id: string) => core.handle(seat, { id, v: core.version, ...msg }, connected).ack!;
    go({ t: 'act', a: { type: 'convert' } }, 'a');
    expect(go({ t: 'act', a: { type: 'claim', project: 'public_clock' } }, 'b').ok).toBe(true);
    expect(core.view(seat, connected).canUndo).toBe(false);
    expect(go({ t: 'undo' }, 'c')).toMatchObject({ ok: false, code: 'no-undo' });
    go({ t: 'act', a: { type: 'convert' } }, 'd');
    expect(res().converted).toBe(2);
    expect(go({ t: 'undo' }, 'e').ok).toBe(true);
    expect(res().converted).toBe(1);
    expect(core.view(seat, connected).canUndo).toBe(false);
    expect((store.getState() as DeckState).projects[0].by).toBe(seat);
  });

  it('KC3-UNDO-5: only the author can use the chain', () => {
    const { core, send, res, seat, canUndo } = table();
    send({ t: 'act', a: { type: 'convert' } });
    send({ t: 'act', a: { type: 'convert' } });
    expect(core.handle(seat === 0 ? 1 : 0, { t: 'undo', id: 'other', v: core.version }, connected).ack).toMatchObject({ ok: false, code: 'no-undo' });
    expect(canUndo()).toBe(true);
    expect(res().converted).toBe(2);
    expect(core.view(seat === 0 ? 1 : 0, connected).canUndo).toBe(false);
  });

  it('KC3-UNDO-6: the chain survives a reload, and a row saved by the older build still undoes one step', () => {
    const { store, send, res, seat } = table();
    const start = res();
    send({ t: 'act', a: { type: 'convert' } });
    send({ t: 'act', a: { type: 'convert' } });
    const reborn = new RoomCore(store, opts);
    expect(reborn.view(seat, connected).canUndo).toBe(true);
    expect(reborn.handle(seat, { t: 'undo', id: 'r1', v: reborn.version }, connected).ack!.ok).toBe(true);
    expect(reborn.handle(seat, { t: 'undo', id: 'r2', v: reborn.version }, connected).ack!.ok).toBe(true);
    expect(res()).toEqual(start);

    const again = new RoomCore(store, opts);
    again.handle(seat, { t: 'act', id: 'r3', v: again.version, a: { type: 'convert' } }, connected);
    const { prior: _, ...older } = store.getUndo()!;
    store.putUndo(older as UndoRow);
    const old = new RoomCore(store, opts);
    expect(old.handle(seat, { t: 'undo', id: 'r4', v: old.version }, connected).ack!.ok).toBe(true);
    expect(res()).toEqual(start);
    expect(old.view(seat, connected).canUndo).toBe(false);
  });

  it('KC3-UNDO-7: a long run keeps the most recent 8 steps, so the saved row stays small', () => {
    const { store, seat } = table(3);
    const s = store.getState() as DeckState;
    const me = s.players[seat];
    me.hand.push(...me.deck.splice(0));
    store.putState(s);
    const core = new RoomCore(store, opts);
    let n = 0;
    const go = (msg: Record<string, unknown>) => core.handle(seat, { id: `x${++n}`, v: core.version, ...msg }, connected).ack!;
    const treasures = (core.view(seat, connected).game as DeckView).hand.filter((c) => c.key === 'scrap');
    expect(treasures.length).toBe(7);
    const states: unknown[] = [];
    for (const c of treasures) {
      states.push(store.getState());
      expect(go({ t: 'act', a: { type: 'play', card: c.id } }).ok).toBe(true);
    }
    for (const a of [1, 2]) {
      states.push(store.getState());
      expect(go({ t: 'act', a: { type: 'convert' } }).ok, String(a)).toBe(true);
    }
    const depth = (u?: UndoRow | null): number => (u ? 1 + depth(u.prior) : 0);
    expect(depth(store.getUndo())).toBe(8);
    for (let i = states.length - 1; i >= 1; i--) {
      expect(go({ t: 'undo' }).ok).toBe(true);
      expect(store.getState()).toEqual(states[i]);
    }
    expect(go({ t: 'undo' })).toMatchObject({ ok: false, code: 'no-undo' });
  });

  it('KC3-UNDO-8: a saved room coming forward brings every undo step with it', () => {
    const { store } = table();
    const { rulesVersion: _, ...old } = createDeckGame(RULES_V2).setup({ playerCount: 2, seed: 'older', config: { market: [], bans: [], sets: ['core'], projects: [] } });
    store.putState(old);
    const meta = store.getMeta()!;
    meta.stateVersion = 1;
    store.putMeta(meta);
    store.putUndo({ seat: 0, version: meta.version, state: structuredClone(old), prior: { seat: 0, version: 0, state: structuredClone(old) } });
    const core = new RoomCore(store, opts);
    expect(core.view(0, connected).canUndo).toBe(true);
    for (const id of ['m1', 'm2']) {
      expect(core.handle(0, { t: 'undo', id, v: core.version }, connected).ack!.ok).toBe(true);
      expect((store.getState() as DeckState).rulesVersion).toBe(RULES_V2.version);
    }
  });
});
