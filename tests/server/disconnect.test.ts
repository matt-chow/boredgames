/** Losing the connection (DISC-*): grace, a bot standing in, coming back and closing an empty room. */
import { describe, expect, it } from 'vitest';
import type { DeckState, DeckView } from '../../src/engine/deckbuilder';
import { GRACE_MS, MemoryStore, RoomCore } from '../../src/server/core';

let clock = 1_000_000;
const opts = { now: () => clock, seed: () => 'fixed-seed' };

function table(gameId = 'bohnanza', names = ['Ann', 'Bo', 'Cy'], bots = 0) {
  const store = new MemoryStore();
  const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId, name: names[0], th: 'th0', bots });
  names.slice(1).forEach((n, i) => core.join(n, `th${i + 1}`));
  send(core, 0, { t: 'start' }, new Set(names.keys()));
  return { store, core };
}

let idc = 0;
const send = (core: RoomCore, seat: number, msg: Record<string, unknown>, connected: Set<number>) =>
  core.handle(seat, { id: `d${++idc}`, v: core.version, ...msg }, connected);

const seats = (...n: number[]) => new Set(n);
const after = (ms: number) => void (clock += ms);

/** Play the actor's own bot move on a person's behalf. */
function playFor(core: RoomCore, seat: number, connected: Set<number>) {
  const move = core.game.bot!(core.view(seat, connected).game);
  for (const a of move!.actions) if (send(core, seat, { t: 'act', a }, connected).ack!.ok) return true;
  return false;
}

/** Run the table until a person has to act; bots move, as they would from the alarm. */
function untilPerson(core: RoomCore) {
  for (let i = 0; i < 4000 && core.status === 'playing' && core.nextBot(); i++) expect(core.playBot()).toBe(true);
}

describe('DISC grace', () => {
  it('DISC-1: a lost connection starts a 60 second grace without touching the game or the version', () => {
    const { core, store } = table();
    const v = core.version;
    const hand = core.view(1, seats(0, 1, 2)).game;
    expect(core.presence(seats(0, 2))).toBe('changed');
    expect(core.version).toBe(v);
    expect(store.getMeta()!.away).toEqual({ 1: clock + GRACE_MS });
    expect(core.view(0, seats(0, 2)).seats[1]).toMatchObject({ connected: false, bot: false, graceUntil: clock + GRACE_MS });
    expect(core.graceEndsAt).toBe(clock + GRACE_MS);
    expect(core.isBotSeat(1)).toBe(false);
    // Nothing more to do until the time is up, and one ms short of it nothing happens.
    expect(core.presence(seats(0, 2))).toBe('same');
    after(GRACE_MS - 1);
    expect(core.presence(seats(0, 2))).toBe('same');
    // Back in time: the same seat and hand, no bot, nothing recorded.
    expect(core.presence(seats(0, 1, 2))).toBe('changed');
    expect(core.version).toBe(v);
    expect(core.view(1, seats(0, 1, 2)).game).toEqual(hand);
    expect(core.view(0, seats(0, 1, 2)).seats[1].graceUntil).toBeUndefined();
    expect(core.graceEndsAt).toBeNull();
  });

  it('DISC-2: lobby and finished rooms have no grace', () => {
    const store = new MemoryStore();
    const core = RoomCore.create(store, opts, { code: 'ABCDEF', gameId: 'bohnanza', name: 'Ann', th: 'th0' });
    expect(core.presence(seats())).toBe('same');
    expect(store.getMeta()!.away).toBeUndefined();
  });
});

describe('DISC takeover', () => {
  it('DISC-3: after the grace a bot takes the seat with everything in it; the seat stays the person’s', () => {
    const { core, store } = table();
    const before = core.view(1, seats(0, 1, 2)).game;
    const others = core.view(0, seats(0, 1, 2)).game;
    core.presence(seats(0, 2));
    after(GRACE_MS);
    expect(core.presence(seats(0, 2))).toBe('changed');
    expect(core.isBotSeat(1)).toBe(true);
    expect(core.seatOf('th1')).toBe(1);
    expect(core.view(0, seats(0, 2)).seats[1]).toMatchObject({ name: 'Bo', bot: true, standIn: true, connected: false });
    // Hand, score and everything the others can see are exactly as they were, and only a takeover is on record.
    expect(core.view(1, seats(0, 2)).game).toEqual(before);
    expect(core.view(0, seats(0, 2)).game).toEqual(others);
    expect(store.history.at(-1)).toMatchObject({ kind: 'takeover', seat: 1, data: '{}' });
  });

  it('DISC-4: a stand-in resolves its pending choices through the normal rules, and the game finishes', () => {
    const { core, store } = table('clockwork', ['Ann', 'Bo']);
    core.presence(seats(0));
    after(GRACE_MS);
    core.presence(seats(0));
    let decisions = 0;
    for (let i = 0; i < 20000 && core.status === 'playing'; i++) {
      const state = store.getState() as { pending: { seat: number } | null };
      if (core.nextBot()) {
        if (state.pending?.seat === 1) decisions++;
        expect(core.playBot()).toBe(true);
      } else expect(playFor(core, 0, seats(0))).toBe(true);
    }
    expect(core.status).toBe('over');
    expect(decisions).toBeGreaterThan(0);
    // The finished room keeps the person's seat, with no bot left in it.
    expect(core.view(1, seats(0, 1)).seats[1]).toMatchObject({ bot: false, connected: true });
    expect(store.getMeta()!.standIn).toBeUndefined();
    expect(core.seatOf('th1')).toBe(1);
  });

  it('DISC-5: several people dropping at once each get their own takeover; a stand-in never gets the person’s undo', () => {
    const { core, store } = table('bohnanza', ['Ann', 'Bo', 'Cy', 'Di']);
    core.presence(seats(0));
    after(GRACE_MS);
    expect(core.presence(seats(0))).toBe('changed');
    expect(store.getMeta()!.standIn).toEqual([1, 2, 3]);
    expect(store.history.filter((h) => h.kind === 'takeover').map((h) => h.seat)).toEqual([1, 2, 3]);
    untilPerson(core);
    // Reconnecting in the same instant as another seat's grace running out: one back, one still gone.
    expect(core.presence(seats(0, 2))).toBe('changed');
    expect(store.getMeta()!.standIn).toEqual([1, 3]);
    expect(core.isBotSeat(2)).toBe(false);
  });
});

describe('DISC reclaim', () => {
  it('DISC-6: coming back ends the bot at once: its move is gone and an older human move is stale, so nothing plays twice', () => {
    const { core, store } = table('bohnanza', ['Ann', 'Bo', 'Cy']);
    const [actor] = core.view(0, seats(0, 1, 2)).actors;
    const other = actor === 0 ? 1 : 0;
    const everyone = seats(0, 1, 2);
    const hereWithout = new Set([...everyone].filter((s) => s !== actor));
    core.presence(hereWithout);
    after(GRACE_MS);
    core.presence(hereWithout);
    expect(core.nextBot()?.seat).toBe(actor);
    const oldVersion = core.version;
    const move = core.nextBot()!;
    expect(core.presence(everyone)).toBe('changed');
    expect(store.history.at(-1)).toMatchObject({ kind: 'reclaim', seat: actor });
    expect(core.isBotSeat(actor)).toBe(false);
    expect(core.nextBot()).toBeNull();
    expect(core.playBot()).toBe(false);
    // A move sent before the reclaim, under the old version, must not land on top of it.
    const stale = core.handle(actor, { id: `d${++idc}`, v: oldVersion, t: 'act', a: move.actions[0] }, everyone);
    expect(stale.ack).toMatchObject({ ok: false, code: 'stale' });
    expect(core.view(other, everyone).seats[actor]).toMatchObject({ bot: false, connected: true });
    expect(core.view(other, everyone).seats[actor].standIn).toBeUndefined();
    expect(playFor(core, actor, everyone)).toBe(true);
  });

  it('DISC-7: reclaiming and takeover cost another player nothing: their undo still works', () => {
    const { core } = table('clockwork', ['Ann', 'Bo', 'Cy']);
    const everyone = seats(0, 1, 2);
    const seat = core.view(0, everyone).actors[0];
    const absent = (seat + 1) % 3;
    const here = new Set([...everyone].filter((s) => s !== absent));
    expect(playFor(core, seat, everyone)).toBe(true);
    expect(core.view(seat, everyone).canUndo).toBe(true);
    core.presence(here);
    after(GRACE_MS);
    core.presence(here);
    expect(core.view(seat, here).canUndo).toBe(true);
    core.presence(everyone);
    expect(core.view(seat, everyone).canUndo).toBe(true);
  });

  it('DISC-8: a person losing the connection on their own turn loses their own undo at takeover', () => {
    const { core } = table('clockwork', ['Ann', 'Bo', 'Cy']);
    const everyone = seats(0, 1, 2);
    const seat = core.view(0, everyone).actors[0];
    const here = new Set([...everyone].filter((s) => s !== seat));
    playFor(core, seat, everyone);
    expect(core.view(seat, everyone).canUndo).toBe(true);
    core.presence(here);
    after(GRACE_MS);
    core.presence(here);
    expect(core.view(seat, here).canUndo).toBe(false);
  });
});

describe('DISC during a Crown Project', () => {
  const trial = { now: () => clock, seed: () => 'fixed-seed', experiments: true };

  it('DISC-14: a stand-in answers the reward of a Project its person just completed, and later funds stages under the same rules', () => {
    const store = new MemoryStore();
    const core = RoomCore.create(store, trial, { code: 'ABCDEF', gameId: 'clockwork', name: 'Ann', th: 'th0' });
    core.join('Bo', 'th1');
    const both = seats(0, 1);
    const config = {
      edition: 'S1',
      market: ['supply_crane', 'corrosion_crew', 'gearwright', 'foreman', 'hand_crank', 'glow_mason', 'tally_clerk', 'paper_fan', 'conveyor', 'flywheel'],
      projects: ['merchants_guildhall', 'canal_lights', 'public_clock', 'makers_fair', 'skybridge'],
    };
    expect(send(core, 0, { t: 'config', config }, both).ack!.ok).toBe(true);
    send(core, 0, { t: 'start' }, both);

    // Make the Guildhall one stage and hand the player to move what it costs: the reward asks about the hand.
    const saved = store.getState() as DeckState;
    const person = saved.turn.seat;
    const guild = saved.projects.find((p) => p.key === 'merchants_guildhall')!;
    guild.stages = guild.stages!.flatMap((x, i, all) => (i === 0 ? [{ ...x, name: 'Merchants’ Guildhall', coins: 5, tokens: { spark: 3 }, vp: 6 }] : all.length ? [] : [x]));
    saved.turn.phase = 'buy';
    saved.turn.coins = 20;
    saved.players[person].tokens.spark = 8;
    store.putState(saved);
    const fresh = new RoomCore(store, trial);
    const everyone = seats(0, 1);
    expect(send(fresh, person, { t: 'act', a: { type: 'claim', project: 'merchants_guildhall' } }, everyone).ack!.ok).toBe(true);
    expect(fresh.nextBot()).toBeNull();
    const asked = fresh.view(person, everyone).game as DeckView;
    expect(asked.pending?.seat).toBe(person);

    // The person goes. Nothing is answered for them during the grace.
    const here = seats(1 - person);
    fresh.presence(here);
    after(GRACE_MS - 1);
    fresh.presence(here);
    expect(fresh.isBotSeat(person)).toBe(false);
    after(1);
    fresh.presence(here);
    expect(fresh.isBotSeat(person)).toBe(true);
    expect(fresh.nextBot()).not.toBeNull();
    expect(fresh.playBot()).toBe(true);
    const answered = fresh.view(1 - person, here).game as DeckView;
    expect(answered.pending).toBeNull();
    // The Project and its Renown still belong to the seat, and the person gets them back.
    expect(answered.projects.find((p) => p.key === 'merchants_guildhall')!.by).toBe(person);

    // The stand-in keeps playing through a whole game; each stage it funds is checked like anyone's.
    for (let i = 0; i < 20000 && fresh.status === 'playing'; i++) {
      if (fresh.nextBot()) expect(fresh.playBot()).toBe(true);
      else expect(playFor(fresh, 1 - person, here)).toBe(true);
    }
    expect(fresh.status).toBe('over');
    fresh.presence(seats(0, 1));
    expect(fresh.seatOf(`th${person}`)).toBe(person);
    const final = (fresh.view(person, seats(0, 1)).game as DeckView).final!;
    expect(final[person].projects.some((p) => p.key === 'merchants_guildhall' && p.vp === 6)).toBe(true);
    // A game's bookkeeping names a move's kind, never a hidden card.
    expect(JSON.stringify(store.history.filter((h) => h.kind === 'takeover'))).not.toContain('hand');
  });
});

describe('DISC closing', () => {
  it('DISC-9: alone with bots, the grace ends in the room closing, and returning in time keeps playing', () => {
    const solo = table('clockwork', ['Ann'], 2);
    expect(solo.core.presence(seats())).toBe('changed');
    after(GRACE_MS - 1);
    expect(solo.core.presence(seats())).toBe('same');
    expect(solo.core.presence(seats(0))).toBe('changed');
    expect(solo.core.status).toBe('playing');
    expect(solo.core.presence(seats())).toBe('changed');
    after(GRACE_MS);
    expect(solo.core.presence(seats())).toBe('closed');
  });

  it('DISC-10: with everyone gone the room closes and doesn’t run bot-only', () => {
    const { core, store } = table('bohnanza', ['Ann', 'Bo', 'Cy']);
    core.presence(seats(0, 1));
    after(GRACE_MS);
    core.presence(seats(0, 1));
    expect(store.getMeta()!.standIn).toEqual([2]);
    core.presence(seats(0));
    after(1000);
    core.presence(seats());
    after(GRACE_MS - 1000);
    // Bo's grace is out, Ann's isn't: Bo gets a bot and the room stays for Ann.
    expect(core.presence(seats())).toBe('changed');
    expect(store.getMeta()!.standIn).toEqual([1, 2]);
    after(1000);
    expect(core.presence(seats())).toBe('closed');
  });

  it('DISC-11: quitting while everyone else is only a stand-in ends the room, and a quitter’s grace goes with them', () => {
    const { core, store } = table('bohnanza', ['Ann', 'Bo', 'Cy']);
    core.presence(seats(0, 1));
    after(GRACE_MS);
    core.presence(seats(0, 1));
    core.presence(seats(0));
    expect(send(core, 0, { t: 'leave' }, seats(0)).end).toBeUndefined();
    // Ann handed to a bot because Bo is still in grace; Ann's seat is gone, and no grace is kept for it.
    expect(core.seatOf('th0')).toBe(-1);
    expect(store.getMeta()!.away?.[0]).toBeUndefined();
    after(GRACE_MS);
    expect(core.presence(seats())).toBe('closed');

    const two = table('bohnanza', ['Ann', 'Bo', 'Cy']);
    two.core.presence(seats(0));
    after(GRACE_MS);
    two.core.presence(seats(0));
    expect(send(two.core, 0, { t: 'leave' }, seats(0)).end).toBe('Ann');
  });

  it('DISC-12: a game without bots waits for the seat, and closes once nobody is left', () => {
    const { core } = table('tally', ['Ann', 'Bo']);
    core.presence(seats(0));
    after(GRACE_MS);
    expect(core.presence(seats(0))).toBe('same');
    expect(core.isBotSeat(1)).toBe(false);
    expect(core.graceEndsAt).toBeNull();
    expect(core.presence(seats())).toBe('changed');
    after(GRACE_MS);
    expect(core.presence(seats())).toBe('closed');
  });

  it('DISC-13: a room saved before this policy has neither field and works the same', () => {
    const { core, store } = table();
    const meta = store.getMeta()!;
    delete meta.away;
    delete meta.standIn;
    store.putMeta(meta);
    const loaded = new RoomCore(store, opts);
    expect(loaded.isBotSeat(1)).toBe(false);
    expect(loaded.presence(seats(0, 1, 2))).toBe('same');
    expect(loaded.view(0, seats(0, 1, 2)).seats[1]).toEqual({ seat: 1, name: 'Bo', connected: true, host: false, bot: false });
  });
});
