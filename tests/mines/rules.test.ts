/** Miners & Saboteurs rules, one test per rule ID in docs/MINES.md. */
import { describe, expect, it } from 'vitest';
import { mines } from '../../src/games/mines';
import { goldJoined, misfit, reach, spots } from '../../src/games/mines/rules/board';
import { ACTIONS, CLASSIC_DECK, CLASSIC_POOL, EXPANDED_ROLES, EXPANSION_DECK, REWARD_CARDS, TUNNEL, classicHand, isTunnel } from '../../src/games/mines/rules/cards';
import { deckKinds, SET_ASIDE } from '../../src/games/mines/rules/engine';
import { botMove } from '../../src/games/mines/rules/bot';
import type { Role } from '../../src/games/mines/rules/cards';
import { CLOCK, Game } from './helpers';

const sum = (l: [string, number][], f: (k: string) => boolean) => l.filter(([k]) => f(k)).reduce((a, [, n]) => a + n, 0);

/** A straight gallery from the entrance to just short of the middle destination, which is made the gold. */
function corridor(g: Game, to = 6) {
  for (let x = 1; x <= to; x++) g.place('straightH', x, 0);
  g.s.goals[0].kind = 'coalL';
  g.s.goals[1].kind = 'gold';
  g.s.goals[2].kind = 'coalR';
  return g;
}

/** Make `seat` the one to move, with the given roles. */
function upNext(g: Game, seat: number, roles?: Role[]) {
  g.s.current = seat;
  if (roles) roles.forEach((r, i) => (g.s.seats[i].role = r));
  return g;
}

describe('MS-INV: components', () => {
  it('MS-C-INV1: the classic deck is 40 tunnels and 27 actions', () => {
    expect(sum(CLASSIC_DECK, isTunnel)).toBe(40);
    expect(sum(CLASSIC_DECK, (k) => !isTunnel(k))).toBe(27);
    const count = (k: string) => CLASSIC_DECK.find(([x]) => x === k)?.[1] ?? 0;
    expect(count('breakPick') + count('breakLamp') + count('breakCart')).toBe(9);
    expect(['fixPick', 'fixLamp', 'fixCart'].map(count)).toEqual([2, 2, 2]);
    expect(['fixPickLamp', 'fixPickCart', 'fixLampCart'].map(count)).toEqual([1, 1, 1]);
    expect(count('survey')).toBe(6);
    expect(count('caveIn')).toBe(3);
    expect(sum(CLASSIC_DECK, (k) => isTunnel(k) && TUNNEL[k].links.every((g) => g.length < 2))).toBe(9);
    expect(deckKinds('classic')).toHaveLength(67);
  });

  it('MS-X-INV1: the expanded rules add 30 tunnels and 21 actions, 118 cards in all', () => {
    expect(sum(EXPANSION_DECK, isTunnel)).toBe(30);
    expect(sum(EXPANSION_DECK, (k) => !isTunnel(k))).toBe(21);
    expect(deckKinds('expanded')).toHaveLength(118);
    const by = (f: (k: string) => boolean) => sum(EXPANSION_DECK, f);
    expect(by((k) => TUNNEL[k]?.door === 'green')).toBe(3);
    expect(by((k) => TUNNEL[k]?.door === 'blue')).toBe(3);
    expect(by((k) => !!TUNNEL[k]?.ladder)).toBe(4);
    expect(by((k) => !!TUNNEL[k]?.crystals)).toBe(10);
    expect(EXPANSION_DECK.filter(([k]) => ['theft', 'guard', 'swapHands', 'inspect', 'swapRole', 'trap', 'free'].includes(k)).map(([, n]) => n)).toEqual([4, 3, 2, 2, 2, 3, 4]);
  });

  it('MS-C-ROLE1, MS-X-ROLE1, MS-C-GOLD1: role pools and reward cards', () => {
    for (let n = 3; n <= 10; n++) expect(CLASSIC_POOL[n][0] + CLASSIC_POOL[n][1]).toBe(n + 1);
    expect(EXPANDED_ROLES.reduce((a, [, n]) => a + n, 0)).toBe(15);
    expect(REWARD_CARDS.reduce((a, [, n]) => a + n, 0)).toBe(28);
    expect(REWARD_CARDS.reduce((a, [v, n]) => a + v * n, 0)).toBe(44);
  });

  it('every action card has text and a target', () => {
    for (const a of ACTIONS) expect(a.text.length && a.limits.length).toBeTruthy();
  });
});

describe('MS-SETUP', () => {
  it('MS-C-HAND1: classic hand sizes; one role stays undealt', () => {
    for (const [n, size] of [[3, 6], [5, 6], [6, 5], [7, 5], [8, 4], [10, 4]]) {
      const g = new Game(n);
      expect(classicHand(n)).toBe(size);
      expect(g.s.seats.every((x) => x.hand.length === size)).toBe(true);
      expect(g.s.spareRoles).toHaveLength(1);
      const roles = [...g.s.seats.map((x) => x.role), ...g.s.spareRoles];
      expect(roles.filter((r) => r === 'saboteur')).toHaveLength(CLASSIC_POOL[n][1]);
    }
  });

  it('MS-X-SETUP1: expanded sets 10 cards aside each round, deals 6, and deals roles from all 15', () => {
    const g = new Game(4, { mode: 'expanded' });
    expect(g.s.removed).toHaveLength(SET_ASIDE);
    expect(g.s.seats.every((x) => x.hand.length === 6)).toBe(true);
    expect(g.s.deck).toHaveLength(118 - 10 - 24);
    expect(g.s.spareRoles).toHaveLength(11);
  });

  it('MS-D-SETUP1: the duel has no roles and deals 6 from the classic deck', () => {
    const g = new Game(2, { mode: 'duel' });
    expect(g.s.seats.map((x) => x.role)).toEqual([null, null]);
    expect(g.s.seats.every((x) => x.hand.length === 6)).toBe(true);
    expect(g.s.deck).toHaveLength(67 - 12);
  });

  it('MS-SEC2: card ids say nothing about the card', () => {
    const a = new Game(4, {}, 'one');
    const b = new Game(4, {}, 'two');
    expect(a.s.seats[0].hand.map((c) => c.id)).toEqual(b.s.seats[0].hand.map((c) => c.id));
    expect(a.s.seats[0].hand.map((c) => c.kind)).not.toEqual(b.s.seats[0].hand.map((c) => c.kind));
  });

  it('MS-CFG1: players per mode, and only listed settings', () => {
    const c = mines.defaultConfig(3);
    expect(c).toEqual({ mode: 'classic', rounds: 3, target: 0, timer: 0, away: 'pause' });
    expect(mines.validateConfig(c, 2)).toContain('Expanded Mining or the Prospector Duel');
    expect(mines.validateConfig({ ...c, mode: 'expanded' }, 2)).toBeNull();
    expect(mines.validateConfig({ ...c, mode: 'duel' }, 2)).toBeNull();
    expect(mines.validateConfig({ ...c, mode: 'duel' }, 3)).not.toBeNull();
    expect(mines.validateConfig(c, 10)).toBeNull();
    expect(mines.sanitizeConfig!({ mode: 'duel', rounds: 5, timer: 60 })).toEqual({ config: { mode: 'duel', rounds: 5, timer: 60 } });
    expect(mines.sanitizeConfig!({ rounds: 4 })).toHaveProperty('error');
    expect(mines.sanitizeConfig!({ mode: 'secret' })).toHaveProperty('error');
    expect(mines.sanitizeConfig!({ away: 'kick' })).toHaveProperty('error');
  });
});

describe('MS-GEO: tunnels', () => {
  it('MS-GEO1/2: a half turn swaps each opening for the one opposite', () => {
    const g = new Game(3);
    const j = reach(g.s.cells);
    // A left bend (west and south) fits east of the entrance only when turned (north and east)... it needs a west opening.
    expect(misfit(g.s.cells, g.s.goals, j, 'bendL', 1, 0, 0)).toBeNull();
    expect(misfit(g.s.cells, g.s.goals, j, 'bendL', 1, 0, 1)).toMatch(/line up/);
    expect(misfit(g.s.cells, g.s.goals, j, 'bendR', 1, 0, 1)).toBeNull();
  });

  it('MS-GEO3: a card must match every neighbour and join the entrance', () => {
    const g = new Game(3);
    g.place('deadH', 1, 0);
    const j = reach(g.s.cells);
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 2, 0, 0)).toMatch(/join up/);
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 4, 0, 0)).toMatch(/touch/);
    expect(misfit(g.s.cells, g.s.goals, j, 'straightV', 0, 1, 0)).toBeNull();
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 0, 1, 0)).toMatch(/line up/);
    expect(misfit(g.s.cells, g.s.goals, j, 'cross', 0, 0, 0)).toMatch(/already/);
  });

  it('MS-GEO6: the two tunnels of an overpass never join', () => {
    const g = new Game(3, { mode: 'expanded' });
    g.place('overpass', 1, 0);
    const j = reach(g.s.cells);
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 2, 0, 0)).toBeNull();
    // The north–south tunnel is not joined, so nothing may hang off it.
    expect(misfit(g.s.cells, g.s.goals, j, 'straightV', 1, 1, 0)).toMatch(/join up/);
  });

  it('MS-GEO4: a face-down destination imposes nothing on its neighbours', () => {
    const g = corridor(new Game(3), 6);
    const j = reach(g.s.cells);
    // Beside the face-down goal at (8,0), an open side and a closed side are both allowed.
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 7, 0, 0)).toBeNull();
    expect(misfit(g.s.cells, g.s.goals, j, 'bendL', 7, 0, 0)).toBeNull();
    expect(spots(g.s.cells, g.s.goals, 'bendL', j)).toContainEqual({ x: 7, y: 0, rot: 0 });
  });

  it('MS-GEO5: reaching a destination turns it face up, coal turned to meet the tunnel', () => {
    const g = corridor(new Game(3), 6);
    g.s.goals[1].kind = 'coalR';
    g.s.goals[2].kind = 'gold';
    const [c] = g.give(0, 'straightH');
    upNext(g, 0, ['miner', 'miner', 'saboteur']).do(0, { type: 'path', turn: g.turn, card: c.id, x: 7, y: 0, rot: 0 });
    expect(g.s.goals[1].revealed).toBe(true);
    // Coal with east and south openings is turned to west and north to meet a tunnel from the west.
    expect(g.s.cells['8,0']).toEqual({ kind: 'coalR', rot: 1 });
    expect(g.s.phase).toBe('play');
    expect(g.view(1).log.find((e) => e.t === 'reveal')).toMatchObject({ t: 'reveal', goal: 1, kind: 'coalR' });
  });

  it('MS-X-LAD1: a ladder is joined to the entrance wherever it touches the mine, but never beside a destination', () => {
    const g = new Game(3, { mode: 'expanded' });
    g.place('deadH', 1, 0).place('straightH', 2, 0);
    let j = reach(g.s.cells);
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 3, 0, 0)).toMatch(/join up/);
    expect(misfit(g.s.cells, g.s.goals, j, 'ladderH', 3, 0, 0)).toBeNull();
    g.place('ladderH', 3, 0);
    j = reach(g.s.cells);
    expect(misfit(g.s.cells, g.s.goals, j, 'straightH', 4, 0, 0)).toBeNull();
    for (let x = 4; x <= 6; x++) g.place('straightH', x, 0);
    expect(misfit(g.s.cells, g.s.goals, reach(g.s.cells), 'ladderH', 7, 0, 0)).toMatch(/destination/);
  });

  it('MS-X-DOOR1: a gate lets only its own crew through', () => {
    const g = corridor(new Game(4, { mode: 'expanded' }), 7);
    g.place('gateBlueH', 3, 0);
    g.s.cells['8,0'] = { kind: 'gold', rot: 0 };
    g.s.goals[1].revealed = true;
    expect(goldJoined(g.s.cells, g.s.goals)).toBe(true);
    expect(goldJoined(g.s.cells, g.s.goals, 'green')).toBe(true);
    expect(goldJoined(g.s.cells, g.s.goals, 'blue')).toBe(false);
  });
});

describe('MS-TURN: turns', () => {
  it('MS-TURN2: laying a tunnel draws a card and passes the turn on', () => {
    const g = new Game(3);
    const [c] = g.give(g.s.current, 'straightH');
    const seat = g.s.current;
    g.do(seat, { type: 'path', turn: g.turn, card: c.id, x: 1, y: 0, rot: 0 });
    expect(g.s.seats[seat].hand).toHaveLength(6);
    expect(g.s.seats[seat].hand.at(-1)!.id).not.toBe(c.id);
    expect(g.s.current).toBe((seat + 1) % 3);
  });

  it('MS-SEC1: a stale or doubled move is refused, and only the seat that is up may play', () => {
    const g = upNext(new Game(3), 0);
    const [c] = g.give(0, 'straightH');
    const move = { type: 'path' as const, turn: g.turn, card: c.id, x: 1, y: 0, rot: 0 as const };
    expect(g.code(1, move)).toBe('not-your-turn');
    g.do(0, move);
    expect(g.code(0, move)).toBe('stale');
  });

  it('MS-C-TURN1: classic passes discard exactly one card; expanded one to three', () => {
    const g = upNext(new Game(3), 0);
    const ids = g.s.seats[0].hand.map((c) => c.id);
    expect(g.code(0, { type: 'pass', turn: g.turn, cards: ids.slice(0, 2) })).toBe('bad-pass');
    g.do(0, { type: 'pass', turn: g.turn, cards: [ids[2]] });
    // Hand order is kept: the rest stay where they were and the new card goes on the end.
    expect(g.s.seats[0].hand.map((c) => c.id).slice(0, 5)).toEqual(ids.filter((_, i) => i !== 2));
    const x = upNext(new Game(3, { mode: 'expanded' }), 0);
    const xi = x.s.seats[0].hand.map((c) => c.id);
    expect(x.code(0, { type: 'pass', turn: x.turn, cards: xi.slice(0, 4) })).toBe('bad-pass');
    x.do(0, { type: 'pass', turn: x.turn, cards: xi.slice(0, 3) });
    expect(x.s.seats[0].hand).toHaveLength(6);
  });

  it('MS-TURN3: with the deck gone, empty hands are skipped and the round ends when every hand is empty', () => {
    const g = upNext(new Game(3), 0, ['miner', 'miner', 'saboteur']);
    g.s.deck = [];
    g.s.seats[0].hand = g.s.seats[0].hand.slice(0, 1);
    g.s.seats[1].hand = [];
    g.s.seats[2].hand = g.s.seats[2].hand.slice(0, 1);
    g.do(0, { type: 'pass', turn: g.turn, cards: [g.s.seats[0].hand[0].id] });
    expect(g.s.current).toBe(2);
    g.do(2, { type: 'pass', turn: g.turn, cards: [g.s.seats[2].hand[0].id] });
    expect(g.s.rounds[0]).toMatchObject({ end: 'dry', winners: [2], finder: null });
    // MS-TURN4: the next round opens after whoever played last.
    expect(g.s.round).toBe(2);
    expect(g.s.current).toBe(0);
  });

  it('MS-TIME1/2: once the timer runs out, anyone may end the turn with a non-strategic pass', () => {
    const g = upNext(new Game(3, { timer: 30 }), 1);
    const first = g.s.seats[1].hand[0].id;
    expect(g.code(0, { type: 'timeout', turn: g.turn })).toBe('early');
    g.now += 30_000;
    g.do(0, { type: 'timeout', turn: g.turn });
    expect(g.s.seats[1].hand.some((c) => c.id === first)).toBe(false);
    expect(g.s.log.at(-2)).toMatchObject({ t: 'pass', seat: 1, n: 1, auto: true });
    const none = new Game(3);
    none.now += 10 ** 9;
    expect(none.code(0, { type: 'timeout', turn: none.turn })).toBe('early');
  });
});

describe('MS-C-ACT: tools and maps', () => {
  it('MS-C-ACT1: breaks go on others, never twice on one tool, and stop digging', () => {
    const g = upNext(new Game(3), 0);
    const [b, b2] = g.give(0, 'breakPick', 'breakPick');
    expect(g.code(0, { type: 'act', turn: g.turn, card: b.id, on: 0 })).toBe('bad-target');
    g.do(0, { type: 'act', turn: g.turn, card: b.id, on: 1 });
    expect(g.s.seats[1].broken).toEqual(['pick']);
    expect(g.view(1).me!.spots).toEqual({});
    const [p] = g.give(1, 'straightH');
    expect(g.code(1, { type: 'path', turn: g.turn, card: p.id, x: 1, y: 0, rot: 0 })).toBe('broken');
    upNext(g, 0);
    expect(g.code(0, { type: 'act', turn: g.turn, card: b2.id, on: 1 })).toBe('bad-target');
  });

  it('MS-C-ACT2: a repair mends one named tool on anyone, a two-tool repair either one', () => {
    const g = upNext(new Game(3), 0);
    g.s.seats[0].broken = ['lamp', 'cart'];
    const [f, t] = g.give(0, 'fixPick', 'fixLampCart');
    expect(g.code(0, { type: 'act', turn: g.turn, card: f.id, on: 0 })).toBe('bad-target');
    expect(g.code(0, { type: 'act', turn: g.turn, card: t.id, on: 0 })).toBe('bad-target');
    g.do(0, { type: 'act', turn: g.turn, card: t.id, on: 0, tool: 'cart' });
    expect(g.s.seats[0].broken).toEqual(['lamp']);
  });

  it('MS-C-ACT3: a survey shows one hidden destination to its player only', () => {
    const g = upNext(new Game(3), 0);
    const [m] = g.give(0, 'survey');
    g.do(0, { type: 'act', turn: g.turn, card: m.id, goal: 2 });
    expect(g.view(0).me!.seen).toEqual([{ t: 'survey', round: 1, goal: 2, kind: g.s.goals[2].kind }]);
    expect(g.view(1).me!.seen).toEqual([]);
    expect(JSON.stringify(g.view(1).log)).not.toContain(g.s.goals[2].kind);
  });

  it('MS-C-ACT4: a cave-in removes a tunnel, never the entrance or a destination', () => {
    const g = upNext(corridor(new Game(3)), 0);
    const [c] = g.give(0, 'caveIn');
    expect(g.code(0, { type: 'act', turn: g.turn, card: c.id, x: 0, y: 0 })).toBe('bad-target');
    expect(g.code(0, { type: 'act', turn: g.turn, card: c.id, x: 8, y: 0 })).toBe('bad-target');
    g.do(0, { type: 'act', turn: g.turn, card: c.id, x: 3, y: 0 });
    expect(g.s.cells['3,0']).toBeUndefined();
  });
});

describe('MS-C-PAY: classic rewards', () => {
  it('MS-C-DRAFT1: the finder picks first from as many cards as players, then the rest go to miners against the turn order', () => {
    const g = upNext(corridor(new Game(4)), 1, ['miner', 'miner', 'saboteur', 'miner']);
    g.s.rewardDeck = [1, 3, 2, 1, 1, 2];
    const [c] = g.give(1, 'straightH');
    g.do(1, { type: 'path', turn: g.turn, card: c.id, x: 7, y: 0, rot: 0 });
    expect(g.s.phase).toBe('draft');
    expect(g.view(1).me!.draft).toEqual([3, 2, 1, 1]);
    expect(g.view(0).me!.draft).toBeUndefined();
    expect(g.view(0).draft).toEqual({ picker: 1, left: 4 });
    g.do(1, { type: 'pick', turn: g.turn, index: 0 });
    expect(g.s.draft!.picker).toBe(0);
    g.do(0, { type: 'pick', turn: g.turn, index: 0 });
    // Seat 3 is next against the turn order; seat 2, the saboteur, is passed over.
    expect(g.s.draft!.picker).toBe(3);
    g.do(3, { type: 'pick', turn: g.turn, index: 0 });
    expect(g.s.draft!.picker).toBe(1);
    g.do(1, { type: 'pick', turn: g.turn, index: 0 });
    expect(g.s.seats.map((x) => x.rewards)).toEqual([[2], [3, 1], [], [1]]);
    expect(g.s.rounds[0]).toMatchObject({ end: 'gold', finder: 1, winners: [0, 1, 3] });
    // Draft cards are private: the public record carries no miner's gold.
    expect(g.s.rounds[0].payouts).toEqual([]);
  });

  it('MS-C-DRAFT2: a saboteur who opens the gold hands the draft to the next miner', () => {
    const g = upNext(corridor(new Game(3)), 2, ['miner', 'miner', 'saboteur']);
    const [c] = g.give(2, 'straightH');
    g.do(2, { type: 'path', turn: g.turn, card: c.id, x: 7, y: 0, rot: 0 });
    expect(g.s.draft!.picker).toBe(1);
  });

  it('MS-C-PAY2/3: saboteurs are paid by how many were dealt; with none dealt, nobody is paid', () => {
    for (const [roles, each] of [
      [['saboteur', 'miner', 'miner'], 4],
      [['saboteur', 'saboteur', 'miner', 'miner', 'miner'], 3],
      [['saboteur', 'saboteur', 'saboteur', 'saboteur', 'miner', 'miner', 'miner', 'miner'], 2],
      [['miner', 'miner', 'miner'], 0],
    ] as [Role[], number][]) {
      const g = upNext(new Game(roles.length), 0, roles);
      g.s.deck = [];
      g.s.seats.forEach((x, i) => (x.hand = i === 0 ? x.hand.slice(0, 1) : []));
      g.do(0, { type: 'pass', turn: g.turn, cards: [g.s.seats[0].hand[0].id] });
      expect(g.s.seats.map((x) => x.gold)).toEqual(roles.map((r) => (r === 'saboteur' ? each : 0)));
    }
  });
});

describe('MS-X: expanded rules', () => {
  /** Finish a round by opening the gold at (8,0) from the corridor, by `finder`. */
  function strike(g: Game, finder: number) {
    const [c] = g.give(finder, 'straightH');
    upNext(g, finder).do(finder, { type: 'path', turn: g.turn, card: c.id, x: 7, y: 0, rot: 0 });
  }

  it('MS-X-WIN1/PAY1: the worked example: the foreman opens the gold through a blue gate', () => {
    const roles: Role[] = ['blue', 'green', 'green', 'foreman', 'opportunist', 'saboteur', 'saboteur'];
    const g = upNext(corridor(new Game(7, { mode: 'expanded' })), 0, roles);
    g.place('gateBlueH', 4, 0);
    g.s.seats[5].theft = g.s.seats[6].theft = true;
    g.s.theftOrder = [5, 6];
    g.s.seats[6].trap = true;
    strike(g, 3);
    expect(g.s.pending!.winners).toEqual([0, 3, 4]);
    expect(g.s.seats.map((x) => x.gold)).toEqual([3, 0, 0, 2, 1, 0, 0]);
    // The trapped thief may not steal; the other one picks.
    expect(g.s.phase).toBe('theft');
    expect(g.view(5).thief).toBe(5);
    expect(g.code(5, { type: 'steal', turn: g.turn, from: 1 })).toBe('bad-target');
    g.do(5, { type: 'steal', turn: g.turn, from: 0 });
    expect(g.s.seats.map((x) => x.gold)).toEqual([2, 0, 0, 2, 1, 1, 0]);
    expect(g.s.rounds[0].steals).toEqual([{ seat: 5, from: 0 }]);
  });

  it('MS-X-WIN2: a digger blocked by the other crew’s gate wins it for them; a crew with its own way wins alone', () => {
    const a = corridor(new Game(4, { mode: 'expanded' }));
    a.place('gateBlueH', 4, 0);
    upNext(a, 0, ['green', 'blue', 'green', 'saboteur']);
    strike(a, 0);
    expect(a.s.rounds[0].winners).toEqual([1]);
    const b = corridor(new Game(4, { mode: 'expanded' }));
    upNext(b, 0, ['green', 'blue', 'green', 'saboteur']);
    strike(b, 0);
    expect(b.s.rounds[0].winners).toEqual([0, 2]);
    expect(b.s.seats.map((x) => x.gold)).toEqual([4, 0, 4, 0]);
  });

  it('MS-X-WIN3: a neutral finder lets every crew with an open way win; a route through both colours lets only the opportunist win', () => {
    const a = corridor(new Game(4, { mode: 'expanded' }));
    upNext(a, 0, ['seeker', 'blue', 'green', 'foreman']);
    strike(a, 0);
    expect(a.s.rounds[0].winners).toEqual([1, 2, 3]);
    const b = corridor(new Game(4, { mode: 'expanded' }));
    b.place('gateBlueH', 2, 0).place('gateGreenH', 4, 0);
    upNext(b, 0, ['green', 'blue', 'opportunist', 'foreman']);
    strike(b, 0);
    expect(b.s.rounds[0].winners).toEqual([2]);
    expect(b.s.seats[2].gold).toBe(3);
  });

  it('MS-X-WIN4: a dry round pays untrapped saboteurs and the opportunist', () => {
    const g = upNext(new Game(4, { mode: 'expanded' }), 0, ['saboteur', 'saboteur', 'opportunist', 'green']);
    g.s.seats[1].trap = true;
    g.s.deck = [];
    g.s.seats.forEach((x, i) => (x.hand = i === 0 ? x.hand.slice(0, 1) : []));
    g.do(0, { type: 'pass', turn: g.turn, cards: [g.s.seats[0].hand[0].id] });
    expect(g.s.rounds[0].winners).toEqual([0, 2]);
    expect(g.s.seats.map((x) => x.gold)).toEqual([4, 0, 2, 0]);
  });

  it('MS-X-SEEK1: seekers split the crystals showing, rounded down, whoever wins', () => {
    const g = corridor(new Game(4, { mode: 'expanded' }));
    g.place('crystalH', 2, 0).place('crystalH', 3, 0).place('crystalH', 4, 0);
    upNext(g, 0, ['seeker', 'seeker', 'green', 'saboteur']);
    strike(g, 2);
    expect(g.s.rounds[0].crystals).toBe(3);
    expect(g.s.seats.map((x) => x.gold)).toEqual([1, 1, 5, 0]);
  });

  it('MS-X-TRAP1: a locked-in player cannot dig and is paid nothing; a rope frees them', () => {
    const g = upNext(new Game(3, { mode: 'expanded' }), 0);
    const [t] = g.give(0, 'trap');
    g.do(0, { type: 'act', turn: g.turn, card: t.id, on: 1 });
    expect(g.s.seats[1].trap).toBe(true);
    const [p, r] = g.give(1, 'straightH', 'free');
    expect(g.code(1, { type: 'path', turn: g.turn, card: p.id, x: 1, y: 0, rot: 0 })).toBe('trapped');
    g.do(1, { type: 'act', turn: g.turn, card: r.id, on: 1 });
    expect(g.s.seats[1].trap).toBe(false);
  });

  it('MS-X-SWAP1: trading satchels swaps whole hands; the other player draws, the player does not', () => {
    const g = upNext(new Game(3, { mode: 'expanded' }), 0);
    const [s] = g.give(0, 'swapHands');
    const mine = g.s.seats[0].hand.slice(1).map((c) => c.id);
    const theirs = g.s.seats[1].hand.map((c) => c.id);
    g.do(0, { type: 'act', turn: g.turn, card: s.id, on: 1 });
    expect(g.s.seats[0].hand.map((c) => c.id)).toEqual(theirs);
    expect(g.s.seats[1].hand.map((c) => c.id).slice(0, 5)).toEqual(mine);
    expect(g.s.seats[1].hand).toHaveLength(6);
  });

  it('MS-X-INSP1/HAT1: a glance is a lasting private record; a new badge comes from the undealt roles', () => {
    const g = upNext(new Game(3, { mode: 'expanded' }), 0, ['green', 'saboteur', 'blue']);
    const [i, h] = g.give(0, 'inspect', 'swapRole');
    g.do(0, { type: 'act', turn: g.turn, card: i.id, on: 1 });
    expect(g.view(0).me!.seen).toEqual([{ t: 'inspect', round: 1, seat: 1, role: 'saboteur' }]);
    expect(g.view(2).me!.seen).toEqual([]);
    upNext(g, 0);
    const spare = g.s.spareRoles.length;
    g.do(0, { type: 'act', turn: g.turn, card: h.id, on: 1 });
    expect(g.s.spareRoles).toHaveLength(spare - 1);
    // What was seen is kept as it was seen.
    expect(g.view(0).me!.seen[0]).toMatchObject({ role: 'saboteur' });
  });

  it('MS-X-THEFT2: one Pickpocket per player; a Strongbox removes one; two discards clear a card in front of you', () => {
    const g = upNext(new Game(3, { mode: 'expanded' }), 0);
    const [a, b, gd] = g.give(0, 'theft', 'theft', 'guard');
    g.do(0, { type: 'act', turn: g.turn, card: a.id });
    upNext(g, 0);
    expect(g.code(0, { type: 'act', turn: g.turn, card: b.id })).toBe('bad-target');
    g.do(0, { type: 'act', turn: g.turn, card: gd.id, on: 0 });
    expect(g.s.seats[0].theft).toBe(false);
    upNext(g, 1);
    g.s.seats[1].broken = ['lamp'];
    const ids = g.s.seats[1].hand.slice(0, 2).map((c) => c.id);
    expect(g.code(1, { type: 'clear', turn: g.turn, cards: ids, clear: 'pick' })).toBe('bad-target');
    g.do(1, { type: 'clear', turn: g.turn, cards: ids, clear: 'lamp' });
    expect(g.s.seats[1].broken).toEqual([]);
    expect(g.s.seats[1].hand).toHaveLength(5);
    expect(new Game(3).code(0, { type: 'clear', turn: 0, cards: [], clear: 'pick' })).not.toBe('ok');
  });

  it('MS-X-THEFT1: the last Pickpocket laid steals first, then the others in turn order', () => {
    const g = corridor(new Game(4, { mode: 'expanded' }));
    upNext(g, 0, ['green', 'green', 'saboteur', 'saboteur']);
    for (const s of [3, 0, 2]) g.s.seats[s].theft = true;
    g.s.theftOrder = [3, 0, 2];
    strike(g, 0);
    expect(g.s.thieves).toEqual([2, 3, 0]);
  });
});

describe('MS-D: the duel', () => {
  it('MS-D-PAY1: whoever opens the gold gets 3, the other 1; a dry round pays nobody', () => {
    const g = upNext(corridor(new Game(2, { mode: 'duel' })), 1);
    const [c] = g.give(1, 'straightH');
    g.do(1, { type: 'path', turn: g.turn, card: c.id, x: 7, y: 0, rot: 0 });
    expect(g.s.seats.map((x) => x.gold)).toEqual([1, 3]);
    expect(g.s.rounds[0].payouts).toHaveLength(2);
    const d = upNext(new Game(2, { mode: 'duel' }), 0);
    d.s.deck = [];
    d.s.seats[0].hand = d.s.seats[0].hand.slice(0, 1);
    d.s.seats[1].hand = [];
    d.do(0, { type: 'pass', turn: d.turn, cards: [d.s.seats[0].hand[0].id] });
    expect(d.s.seats.map((x) => x.gold)).toEqual([0, 0]);
  });
});

describe('MS-END: the end', () => {
  it('MS-END1: the game lasts the chosen rounds; ties share first place', () => {
    const g = new Game(3, { rounds: 1 });
    g.s.deck = [];
    upNext(g, 0, ['miner', 'saboteur', 'saboteur']);
    g.s.seats.forEach((x, i) => (x.hand = i === 0 ? x.hand.slice(0, 1) : []));
    g.do(0, { type: 'pass', turn: g.turn, cards: [g.s.seats[0].hand[0].id] });
    expect(mines.isOver(g.s)).toBe(true);
    expect(mines.results(g.s)!.map((r) => [r.rank, r.winner])).toEqual([[3, false], [1, true], [1, true]]);
    expect(g.view(0).final!.gold).toEqual([0, 3, 3]);
  });

  it('MS-END2: a target ends the game only after a whole round', () => {
    const g = new Game(3, { rounds: 10, target: 10 });
    g.s.seats[1].gold = 9;
    g.s.deck = [];
    upNext(g, 0, ['miner', 'saboteur', 'miner']);
    g.s.seats.forEach((x, i) => (x.hand = i === 0 ? x.hand.slice(0, 1) : []));
    g.do(0, { type: 'pass', turn: g.turn, cards: [g.s.seats[0].hand[0].id] });
    expect(g.s.phase).toBe('over');
    expect(g.s.round).toBe(1);
  });

  it('chat and reactions are open to every seat at any time, trimmed and capped', () => {
    const g = new Game(3);
    g.do(2, { type: 'chat', text: '  hello  ' }).do(1, { type: 'react', key: 'gg' });
    expect(g.code(1, { type: 'react', key: 'boo' })).toBe('bad-react');
    expect(g.code(1, { type: 'chat', text: '   ' })).toBe('bad-chat');
    expect(g.view(0).chat.map((c) => c.text ?? c.react)).toEqual(['hello', 'gg']);
    expect(g.turn).toBe(0);
  });

  it('MS-LOG1: log lines and chat share one rising id; every move ends with a public draw count and whose turn it is', () => {
    const g = upNext(new Game(3, { mode: 'expanded' }), 0);
    g.do(2, { type: 'chat', text: 'hi' });
    g.now += 5_000;
    const [s] = g.give(0, 'swapHands');
    g.do(0, { type: 'act', turn: g.turn, card: s.id, on: 1 });
    const v = g.view(2);
    const ids = [...v.log.map((e) => e.id), ...v.chat.map((c) => c.id)].sort((a, b) => a - b);
    expect(new Set(ids).size).toBe(ids.length);
    expect(v.chat[0].id).toBeLessThan(v.log.at(-1)!.id);
    // Trade Satchels: the other player draws one, the player who played it none, then it is seat 1's turn.
    expect(v.log.slice(-3).map(({ id: _i, at, ...e }) => ({ ...e, at: at === g.now }))).toEqual([
      { t: 'act', seat: 0, kind: 'swapHands', on: 1, at: true },
      { t: 'draw', seat: 1, n: 1, next: null, at: true },
      { t: 'draw', seat: 0, n: 0, next: 1, at: true },
    ]);
  });

  it('MS-LOG2: a saved v1 game gets ids on its log lines, numbered after its chat', () => {
    const g = new Game(3);
    g.do(1, { type: 'chat', text: 'old' });
    const { nextId, ...rest } = structuredClone(g.s);
    const v1 = { ...rest, nextChat: nextId, log: rest.log.map(({ id: _i, at: _a, ...e }) => e) };
    const s = mines.migrate!(v1, 1);
    expect(s.log.map((e) => e.id)).toEqual(s.log.map((_, i) => nextId + i));
    expect(s.nextId).toBe(nextId + s.log.length);
    expect('nextChat' in s).toBe(false);
  });
});

describe('MS-AWAY: stand-ins', () => {
  it('MS-AWAY1: under pause a stand-in waits; under auto-pass it discards its first card', () => {
    const g = upNext(new Game(3), 0);
    expect(botMove(g.view(0), true)).toBeNull();
    const a = upNext(new Game(3, { away: 'autopass' }), 0);
    const move = botMove(a.view(0), true)!;
    expect(move.actions).toEqual([{ type: 'pass', turn: a.turn, cards: [a.s.seats[0].hand[0].id] }]);
    expect(botMove(a.view(1), true)).toBeNull();
    expect(CLOCK).toBeGreaterThan(0);
  });
});

describe('MS-ROLE2: someone is always a saboteur', () => {
  const tally = (l: (Role | null)[]) => l.reduce<Record<string, number>>((a, r) => ((a[r ?? '-'] = (a[r ?? '-'] ?? 0) + 1), a), {});

  it('MS-C-ROLE2, MS-X-ROLE2: every classic and expanded deal seats a saboteur, and the pool keeps its make-up', () => {
    for (const [mode, from] of [['classic', 3], ['expanded', 2]] as const)
      for (let n = from; n <= 10; n++)
        for (let i = 0; i < 60; i++) {
          const g = new Game(n, { mode }, `role-${mode}-${n}-${i}`);
          const dealt = g.s.seats.map((x) => x.role);
          expect(dealt).toContain('saboteur');
          const pool = mode === 'classic' ? { miner: CLASSIC_POOL[n][0], saboteur: CLASSIC_POOL[n][1] } : Object.fromEntries(EXPANDED_ROLES);
          expect(tally([...dealt, ...g.s.spareRoles])).toEqual(pool);
        }
  });

  it('MS-D-ROLE: the duel still deals no roles', () => {
    const g = new Game(2, { mode: 'duel' });
    expect(g.s.seats.map((x) => x.role)).toEqual([null, null]);
  });

  it('MS-C-ROLE2: hidden roles stay hidden, saboteur or not', () => {
    const g = new Game(5, {}, 'role-hidden');
    const v = g.view(0);
    for (const p of v.players) if (p.seat !== 0) expect(JSON.stringify(p)).not.toMatch(/saboteur|miner/);
    expect(JSON.stringify(v)).not.toMatch(/spareRoles/);
  });
});

describe('MS-ATTR: who laid each tunnel', () => {
  it('MS-ATTR1: a laid tunnel names its seat in every view; setup cards name nobody', () => {
    const g = new Game(3);
    const [c] = g.give(0, 'straightH');
    upNext(g, 0).do(0, { type: 'path', turn: g.turn, card: c.id, x: 1, y: 0, rot: 0 });
    for (const seat of [0, 1, 2, null]) {
      const cells = g.view(seat).cells;
      expect(cells.find((x) => x.x === 1 && x.y === 0)).toMatchObject({ kind: 'straightH', by: 0 });
      expect(cells.find((x) => x.x === 0 && x.y === 0)).not.toHaveProperty('by');
    }
  });

  it('MS-ATTR1: a laid tunnel keeps its maker after the maker’s role changes', () => {
    const g = new Game(3, { mode: 'expanded' });
    const [c] = g.give(1, 'straightH');
    upNext(g, 1).do(1, { type: 'path', turn: g.turn, card: c.id, x: 1, y: 0, rot: 0 });
    g.s.seats[1].role = g.s.seats[1].role === 'saboteur' ? 'green' : 'saboteur';
    expect(g.view(2).cells.find((x) => x.x === 1)).toMatchObject({ by: 1 });
  });
});

describe('MS-GEO7: the starting area', () => {
  const at = (x: number, y: number) => (p: { x: number; y: number }) => p.x === x && p.y === y;

  it('MS-GEO7: while a tunnel fits inside the starting area, nothing may go outside it', () => {
    const g = upNext(new Game(3), 0);
    g.s.seats[0].hand = [{ id: 901, kind: 'straightH' }];
    const mine = g.view(0).me!.spots[901];
    expect(mine.some(at(1, 0))).toBe(true);
    // West of the entrance fits the tunnels, but lies outside the starting area.
    expect(misfit(g.s.cells, g.s.goals, reach(g.s.cells), 'straightH', -1, 0, 0)).toBeNull();
    expect(mine.some(at(-1, 0))).toBe(false);
    expect(g.code(0, { type: 'path', turn: g.turn, card: 901, x: -1, y: 0, rot: 0 })).toBe('outside');
  });

  it('MS-GEO7: building back toward the entrance is fine inside the area', () => {
    const g = upNext(new Game(3), 0);
    g.place('straightH', 1, 0).place('straightH', 2, 0).place('cross', 3, 0).place('cross', 3, 1);
    g.s.seats[0].hand = [{ id: 901, kind: 'straightH' }, { id: 902, kind: 'straightH' }];
    expect(g.view(0).me!.spots[901].some(at(2, 1))).toBe(true);
    g.do(0, { type: 'path', turn: g.turn, card: 901, x: 2, y: 1, rot: 0 });
    upNext(g, 0);
    g.do(0, { type: 'path', turn: g.turn, card: 902, x: 1, y: 1, rot: 0 });
    expect(g.s.cells['1,1']).toMatchObject({ kind: 'straightH', by: 0 });
  });

  it('MS-GEO7: when no tunnel in hand fits inside, the player may build beyond it', () => {
    const g = upNext(new Game(3), 0);
    // A shaft runs south out of the area; east of the entrance is walled off.
    g.place('straightV', 0, 1).place('straightV', 0, 2).place('straightV', 0, 3).place('straightV', 1, 0);
    g.s.seats[0].hand = [{ id: 901, kind: 'straightV' }];
    // The way north is still open, so the shaft may not go deeper yet.
    expect(g.view(0).me!.spots[901]).toEqual([{ x: 0, y: -1, rot: 0 }]);
    expect(g.code(0, { type: 'path', turn: g.turn, card: 901, x: 0, y: 4, rot: 0 })).toBe('outside');
    g.place('straightH', 0, -1);
    expect(g.view(0).me!.spots[901]).toEqual([{ x: 0, y: 4, rot: 0 }]);
    g.do(0, { type: 'path', turn: g.turn, card: 901, x: 0, y: 4, rot: 0 });
    expect(g.s.cells['0,4']).toMatchObject({ kind: 'straightV', by: 0 });
  });
});
