/**
 * SC-SIM: seeded games played to the end by a random legal player through the real rules, every ruleset and player
 * count. Every move checks card conservation, turn ownership, favor accounting and that no projection leaks.
 */
import { describe, expect, it } from 'vitest';
import { deckKinds, KINDS, NAMEABLE } from '../../src/games/sealed/rules/cards';
import { apply, choosable, playable, project, setup } from '../../src/games/sealed/rules/engine';
import type { SAction, SState } from '../../src/games/sealed/rules/types';

const cards = (s: SState) => [...s.deck, ...s.faceUp, ...(s.reserve ? [s.reserve] : []), ...s.seats.flatMap((x) => [...x.hand, ...x.pile.map((p) => p.card)])];

/** What a seat must never see: other hands, the deck, the reserve, others' secrets, the generator. */
export function leaks(s: SState, seat: number | null): string[] {
  const v = project(s, seat);
  const json = JSON.stringify(v);
  const out: string[] = [];
  const hidden = [...s.deck, ...(s.reserve ? [s.reserve] : []), ...s.seats.flatMap((x, i) => (i === seat ? [] : x.hand))];
  for (const c of hidden) if (new RegExp(`"id":${c.id}[,}]`).test(json)) out.push(`card ${c.id}`);
  if (/"rng"|"secrets"/.test(JSON.stringify({ ...v, me: null }))) out.push('internal field');
  return out;
}

function randomMove(s: SState, r: () => number): SAction {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  if (s.phase === 'between') return { type: 'deal', turn: s.turn };
  const hand = s.seats[s.current].hand;
  if (s.phase === 'file') {
    const keep = pick(hand).id;
    return { type: 'file', turn: s.turn, keep, under: hand.filter((c) => c.id !== keep).map((c) => c.id).sort(() => r() - 0.5) };
  }
  const id = pick(playable(hand));
  const card = hand.find((c) => c.id === id)!;
  const open = choosable(s, s.current);
  const t = KINDS[card.kind].targets;
  const target = t === 'any' ? pick([s.current, ...open]) : t === 'other' && open.length ? pick(open) : undefined;
  return { type: 'play', turn: s.turn, card: card.id, ...(target !== undefined ? { target } : {}), ...(card.kind === 'censor' && target !== undefined ? { guess: pick(NAMEABLE) } : {}) };
}

const RUNS: ['classic' | 'expanded', number][] = [['classic', 2], ['classic', 3], ['classic', 4], ['expanded', 2], ['expanded', 3], ['expanded', 4], ['expanded', 5], ['expanded', 6]];

describe('SC-SIM: random legal players finish every ruleset and player count', () => {
  for (const [ruleset, n] of RUNS)
    it(`${ruleset}, ${n} players`, () => {
      for (let g = 0; g < 6; g++) {
        let seed = 1 + g * 7919 + n;
        const r = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
        let s = setup(n, `sim-${ruleset}-${n}-${g}`, { ruleset, target: g % 2 ? 2 : 0, timer: 0 }, 0);
        const total = deckKinds(ruleset).length;
        for (let step = 0; s.phase !== 'over'; step++) {
          expect(step).toBeLessThan(5000);
          expect(cards(s)).toHaveLength(total);
          expect(new Set(cards(s).map((c) => c.id)).size).toBe(total);
          const actor = s.phase === 'between' ? s.next! : s.current;
          if (s.phase !== 'between') expect(s.seats[actor].out).toBe(false);
          const move = randomMove(s, r);
          expect(apply(s, (actor + 1) % n, move, 0).ok).toBe(false);
          const res = apply(s, actor, move, 0);
          if (!res.ok) throw new Error(`${res.code}: ${res.error}`);
          s = res.state;
          const awarded = s.rounds.reduce((sum, x) => sum + x.winners.length + (x.informant === null ? 0 : 1), 0);
          expect(s.seats.reduce((sum, x) => sum + x.favors, 0)).toBe(awarded);
          expect(leaks(s, step % n)).toEqual([]);
          expect(leaks(s, null)).toEqual([]);
        }
        expect(s.seats.some((x) => x.favors >= s.target)).toBe(true);
      }
    });
});
