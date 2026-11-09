/**
 * Seeded games played to the end by the practice bots through the real rules, every mode and player count. They check
 * the invariants on every move and that no projection carries another seat's secrets. MS_SIM=<file> writes the
 * balance tables recorded in docs/MINES_BALANCE.md.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { project } from '../../src/games/mines/rules/engine';
import type { MConfig, MState } from '../../src/games/mines/rules/types';
import { autoplay, cardCount } from './helpers';

const MODES: [MConfig['mode'], number[]][] = [
  ['classic', [3, 4, 5, 6, 7, 8, 9, 10]],
  ['expanded', [2, 3, 5, 7, 10]],
  ['duel', [2]],
];

/** Secrets a seat must never see: others' hands and roles, the deck, the set-aside cards, unused roles, hidden goals. */
function leaks(s: MState, seat: number | null): string[] {
  const json = JSON.stringify(project(s, seat));
  const out: string[] = [];
  const ids = [...s.deck, ...s.removed, ...s.seats.flatMap((x, i) => (i === seat ? [] : x.hand))].map((c) => c.id);
  for (const id of ids) if (new RegExp(`"id":${id}[,}]`).test(json)) out.push(`card ${id}`);
  // Roles appear only in your own panel and in finished rounds' records.
  if (/"role/.test(JSON.stringify({ ...project(s, seat), rounds: [], me: null }))) out.push('role');
  if (/spareRoles|removed|rewardDeck|"rng"/.test(json)) out.push('internal field');
  for (const g of s.goals) if (!g.revealed && s.phase !== 'over' && json.includes(`"x":${g.x},"y":${g.y},"revealed":false,"kind"`)) out.push('goal');
  return out;
}

describe('MS-SIM: bots play every mode to the end', () => {
  for (const [mode, counts] of MODES)
    for (const n of counts)
      it(`${mode}, ${n} players`, () => {
        for (let g = 0; g < 4; g++) {
          let total = -1;
          let round = 0;
          autoplay(n, { mode }, `sim-${mode}-${n}-${g}`, (s) => {
            if (s.round !== round) {
              round = s.round;
              total = cardCount(s);
            }
            if (s.phase === 'play') expect(cardCount(s)).toBe(total);
            const seat = (s.n + g) % s.n;
            expect(leaks(s, seat)).toEqual([]);
            expect(leaks(s, null)).toEqual([]);
          });
        }
      });
});

describe('MS-BAL: balance tables', () => {
  it.skipIf(!process.env.MS_SIM)('runs seeded batches', { timeout: 1_800_000 }, () => {
    const lines: string[] = [];
    const games = Number(process.env.MS_GAMES ?? 100);
    for (const [mode, counts] of MODES)
      for (const n of counts) {
        let gold = 0, rounds = 0, firstSeatWins = 0, openerFinds = 0;
        const bySeat = Array(n).fill(0);
        for (let g = 0; g < games; g++) {
          const s = autoplay(n, { mode }, `bal-${mode}-${n}-${g}`);
          for (const r of s.rounds) {
            rounds++;
            if (r.end === 'gold') gold++;
          }
          const best = Math.max(...s.seats.map((x) => x.gold));
          s.seats.forEach((x, i) => x.gold === best && bySeat[i]++);
          if (s.seats[s.rounds[0].start].gold === best) firstSeatWins++;
          for (const r of s.rounds) if (r.finder !== null && r.finder === r.start) openerFinds++;
        }
        lines.push(`| ${mode} | ${n} | ${((100 * gold) / rounds).toFixed(0)}% | ${bySeat.join(' / ')} | ${firstSeatWins} | ${gold ? ((100 * openerFinds) / gold).toFixed(0) : '-'}% |`);
        expect(rounds).toBeGreaterThan(0);
      }
    if (process.env.MS_SIM) writeFileSync(process.env.MS_SIM, lines.join('\n') + '\n');
  });
});
