/**
 * PZ-NET6, PZ-SENT2, PZ-SPEC1–2: hidden information never reaches anyone it doesn't belong to. Random seeded games are
 * played to the end; at every step each viewer's projection is checked, and re-dealing every card the viewer can't
 * see must not change a byte of what they are sent.
 */
import { describe, expect, it } from 'vitest';
import { actors, apply, isOut, project, setup, tick } from '../../src/games/palazzo/rules/engine';
import type { PState } from '../../src/games/palazzo/rules/types';
import { prng, randomMove } from './helpers';

/** The same game with every card `viewer` can't see shuffled among those unseen places (roles only; ids stay put). */
function redeal(s: PState, viewer: number | null, rnd: () => number): PState {
  const x = structuredClone(s);
  const seenIds = new Set(viewer === null ? [] : x.seen.filter((e) => e.by === viewer && !e.lapsed).map((e) => e.card));
  const slots = [
    ...x.seats.flatMap((seat, i) => (i === viewer ? [] : seat.hand.filter((c) => !c.up && !seenIds.has(c.id)))),
    ...x.deck,
    ...(x.pend?.drawn && x.pend.actor !== viewer ? [x.pend.drawn] : []),
  ];
  const roles = slots.map((c) => c.role);
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  slots.forEach((c, i) => (c.role = roles[i]));
  // The deck's order, and the ids of cards in it, are hidden too.
  x.deck.reverse();
  return x;
}

function play(n: number, seed: number, draft: boolean, check: (s: PState) => void) {
  const rnd = prng(seed);
  let s = setup(n, `proj-${seed}`, { timer: 15, disconnect: 'pause', draft }, 0);
  let now = 0;
  for (let i = 0; i < 2000 && s.phase !== 'over'; i++) {
    check(s);
    if (rnd() < 0.05 && s.window) {
      now = s.window.deadline;
      s = tick(s, now, s.online) ?? s;
      continue;
    }
    const m = randomMove(s, rnd)!;
    const r = apply(s, m.seat, m.action, ++now);
    if (!r.ok) throw new Error(`${r.code}: ${r.error} (${JSON.stringify(m)})`);
    s = r.state;
  }
  check(s);
  return s;
}

describe('PZ-NET6 projection', () => {
  it('opponents’ hidden cards, the deck and its order never reach a viewer', () => {
    const rnd = prng(99);
    let games = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const n = 2 + (seed % 5);
      const end = play(n, seed, n === 2 && seed % 2 === 0, (s) => {
        for (const viewer of [...Array(n).keys(), null]) {
          const v = project(s, viewer);
          const text = JSON.stringify(v);
          expect(text).not.toContain('"deck":[');
          expect(text).not.toContain('"rng"');
          expect(v.deck).toBe(s.deck.length);
          v.players.forEach((p, i) => expect(p.cards).toEqual(s.seats[i].hand.map((c) => (c.up ? c.role : null))));
          if (viewer === null) expect(v.me).toBeNull();
          else {
            expect(v.me!.hand).toEqual(s.seats[viewer].hand);
            expect(!!v.me!.drawn).toBe(s.phase === 'parley' && s.pend!.actor === viewer);
            if (isOut(s.seats[viewer])) expect(v.me!.seen).toEqual([]);
          }
          // Non-interference: what the viewer can't see makes no difference to what they get.
          expect(JSON.stringify(project(redeal(s, viewer, rnd), viewer))).toBe(text);
        }
        expect(actors(s).every((i) => !isOut(s.seats[i]))).toBe(true);
      });
      expect(end.phase).toBe('over');
      games++;
    }
    expect(games).toBe(30);
  }, 60_000);

  it('PZ-SPEC2: an eliminated player’s chat reaches only other eliminated players until the game ends', () => {
    let s = setup(3, 'ghost', { timer: 15, disconnect: 'pause', draft: false }, 0);
    s.seats[2].hand.forEach((c) => (c.up = true));
    const say = (seat: number, text: string) => {
      const r = apply(s, seat, { type: 'chat', text }, 1);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    };
    say(2, 'I knew it was a bluff');
    say(0, 'hello');
    expect(project(s, 0).chat.map((c) => c.text)).toEqual(['hello']);
    expect(project(s, null).chat.map((c) => c.text)).toEqual(['hello']);
    expect(project(s, 2).chat.map((c) => c.text)).toEqual(['I knew it was a bluff', 'hello']);
    const r = apply(s, 2, { type: 'react', key: 'bluff' }, 2);
    expect(r.ok && r.state.chat.at(-1)!.ghost).toBe(true);
    s.phase = 'over';
    expect(project(s, 0).chat).toHaveLength(2);
  });
});
