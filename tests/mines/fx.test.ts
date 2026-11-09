/** The mine's presentation layer: which confirmed lines to animate, and who is next (MS-FX*, docs/MINES.md). */
import { describe, expect, it } from 'vitest';
import { newEvents, nextUp } from '../../src/games/mines/ui/events';
import { Game } from './helpers';

describe('MS-FX: presentation events', () => {
  it('MS-FX1: only lines the last view had not seen are presented, once, and nothing on a first view', () => {
    const g = new Game(3);
    const a = g.view(1);
    expect(newEvents(null, a)).toEqual([]);
    g.do(0, { type: 'pass', turn: g.turn, cards: [g.s.seats[g.s.current].hand[0].id] });
    const b = g.view(1);
    const fresh = newEvents(a, b);
    expect(fresh.map((e) => e.t)).toEqual(['pass', 'draw']);
    // The same view again (a resend or a reconnect) presents nothing.
    expect(newEvents(b, b)).toEqual([]);
    // Chat moves the shared id on, but chat is never presented as a board event.
    g.do(2, { type: 'chat', text: 'hi' });
    expect(newEvents(b, g.view(1))).toEqual([]);
  });

  it('MS-FX2: the next player comes from public counts; empty hands are skipped once the deck is gone', () => {
    const v = { phase: 'play' as const, current: 0, deck: 5, players: [0, 1, 2].map((seat) => ({ seat, hand: seat === 1 ? 0 : 3 })) };
    expect(nextUp(v)).toBe(1);
    expect(nextUp({ ...v, deck: 0 })).toBe(2);
    expect(nextUp({ ...v, deck: 0, players: v.players.map((p) => ({ ...p, hand: p.seat === 0 ? 2 : 0 })) })).toBeNull();
    expect(nextUp({ ...v, phase: 'draft' })).toBeNull();
  });

  it('MS-FX3: presentation lines carry no hand, deck order or role', () => {
    const g = new Game(4, { mode: 'expanded' });
    for (let i = 0; i < 12; i++) g.do(g.s.current, { type: 'pass', turn: g.turn, cards: [g.s.seats[g.s.current].hand[0].id] });
    for (const e of g.view(0).log) expect(Object.keys(e).filter((k) => ['hand', 'card', 'cards', 'role', 'deck'].includes(k))).toEqual([]);
  });
});
