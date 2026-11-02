/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type BohnanzaConfig } from '../../src/games/bohnanza/rules/config';
import { project } from '../../src/games/bohnanza/rules/view';
import type { BState } from '../../src/games/bohnanza/rules/state';
import { replay, simulate, type Step } from './bot';
import { assertConservation } from './helpers';

/**
 * Full-game simulations with recorded seeds. Every run writes its seed and
 * action sequence to test-results/sim/<name>.json so any failure can be
 * replayed exactly with `replay(seed, n, config, steps)`.
 */
const OUT = 'test-results/sim';

function handOrderPreserved(prev: BState, next: BState) {
  for (let p = 0; p < prev.n; p++) {
    const before = prev.players[p].hand;
    const after = next.players[p].hand;
    const kept = before.filter((id) => after.includes(id));
    // Surviving cards keep their relative order and stay in front of any new cards.
    expect(after.slice(0, kept.length)).toEqual(kept);
  }
}

function noLeak(s: BState) {
  for (let seat = 0; seat < s.n; seat++) {
    const json = JSON.stringify(project(s, seat));
    for (const id of s.deck) if (json.includes(`"${id}"`)) throw new Error(`deck card ${id} leaked to seat ${seat}`);
    s.players.forEach((p, i) => {
      if (i === seat) return;
      for (const id of p.hand) {
        const at = json.indexOf(`"${id}"`);
        if (at >= 0) throw new Error(`hand card ${id} of ${i} leaked to ${seat}: …${json.slice(Math.max(0, at - 160), at + 40)}`);
      }
    });
  }
}

const cfg = (c: Partial<BohnanzaConfig>): BohnanzaConfig => ({ ...DEFAULT_CONFIG, ...c });

const MATRIX: { name: string; n: number; config: BohnanzaConfig }[] = [
  { name: 'base-3', n: 3, config: cfg({}) },
  { name: 'base-4', n: 4, config: cfg({}) },
  { name: 'base-5', n: 5, config: cfg({}) },
  { name: 'magpie-4', n: 4, config: cfg({ magpie: true }) },
  { name: 'coin-3', n: 3, config: cfg({ beanCoin: true }) },
  { name: 'coin-5', n: 5, config: cfg({ beanCoin: true }) },
  { name: 'v1-3', n: 3, config: cfg({ threeNewBeans: true }) },
  { name: 'v1-5-magpie', n: 5, config: cfg({ threeNewBeans: true, magpie: true }) },
  { name: 'v2-4', n: 4, config: cfg({ fieldBean: true }) },
  { name: 'v2-5-magpie', n: 5, config: cfg({ fieldBean: true, magpie: true }) },
];

/** Actions that move cards between hidden and public zones. */
const RISKY = new Set(['offer', 'accept', 'reject', 'cancel', 'endTrading', 'coinRespond', 'playMagpie', 'flip', 'endTurn']);

const SEEDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

describe('S full-game simulations', () => {
  mkdirSync(OUT, { recursive: true });
  for (const m of MATRIX)
    for (const seed of SEEDS) {
      it(`S ${m.name} seed=${seed} terminates with all invariants`, () => {
        let checks = 0;
        const log: Step[] = [];
        const record = () =>
          writeFileSync(`${OUT}/${m.name}-${seed}.json`, JSON.stringify({ seed: `${m.name}:${seed}`, n: m.n, config: m.config, steps: log }));
        let res: ReturnType<typeof simulate>;
        try {
          res = simulate(`${m.name}:${seed}`, m.n, m.config, (prev, next, step: Step) => {
          assertConservation(next);
          handOrderPreserved(prev, next);
          if (RISKY.has(step.action.type) || next.seq % 5 === 0 || next.phase === 'over') noLeak(next);
          expect(next.seq).toBe(prev.seq + 1);
          if (step.action.type === 'plant') expect(next.planted).toBeLessThanOrEqual(2);
          checks++;
          log.push(step);
        });
        } finally {
          record();
        }
        const f = res.final;
        expect(f.phase).toBe('over');
        expect(f.exhaustions).toBe(f.exhaustLimit);
        expect(f.result).toHaveLength(m.n);
        expect(f.result!.filter((r) => r.winner)).toHaveLength(1);
        // Final harvest emptied every field; scores equal coin stacks.
        for (const r of f.result!) expect(r.score).toBe(f.players[r.seat].coins.length);
        expect(f.players.every((p) => p.fields.every((x) => x.length === 0))).toBe(true);
        expect(checks).toBe(res.steps.length);
        // Determinism: replaying the recorded actions reproduces the result.
        expect(replay(res.seed, m.n, m.config, res.steps).result).toEqual(f.result);
      });
    }
});
