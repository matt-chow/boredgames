/** Staged construction: how a project's price and points divide into stages, and which projects get how many. CC-STAGE-* */
import { seedRng, shuffle } from '../rng';
import type { ProjectDef, ProjectStage, ProjectState, Ruleset } from './types';

/**
 * Split a project into `n` stages. Points and tokens lean to the later stages and coins to the earlier ones, so a stage
 * with no tokens still has a real coin price. Stage 1 of a 3-stage project uses the first name, 2-stage the first and last.
 */
export function splitProject(def: ProjectDef, n: number, extraCoins: number, names: readonly string[]): ProjectStage[] {
  const coinTotal = def.coins + (n > 1 ? extraCoins : 0);
  const early = (total: number, i: number) => Math.floor(total / n) + (i < total % n ? 1 : 0);
  const late = (total: number, i: number) => Math.floor(total / n) + (i >= n - total % n ? 1 : 0);
  const title = (i: number) => (n === 1 ? def.name : n === 2 ? names[i * 2] : names[i]);
  return Array.from({ length: n }, (_, i) => ({
    name: title(i),
    coins: early(coinTotal, i),
    tokens: Object.fromEntries(Object.entries(def.tokens).map(([t, v]) => [t, late(v, i)])),
    vp: late(def.vp, i),
    by: null,
    onTurn: null,
  }));
}

/** Each key's stage count. Dealt from its own stream, so it says nothing about the market, the deal or a project's price. */
export function assignStages(rules: Ruleset, seed: string, keys: string[], players: number): Map<string, number> {
  const [, two, three] = rules.staged!.counts(players);
  const order = shuffle(seedRng(seed + ':stages'), [...keys]);
  return new Map(order.map((k, i) => [k, i < three ? 3 : i < three + two ? 2 : 1]));
}

export function stagedProjects(rules: Ruleset, seed: string, keys: string[], players: number): ProjectState[] {
  const staged = rules.staged!;
  const sizes = assignStages(rules, seed, keys, players);
  return keys.map((key) => {
    const def = rules.projects!.find((p) => p.key === key)!;
    return { key, by: null, onTurn: null, surcharges: [], stages: splitProject(def, sizes.get(key)!, staged.extraCoins, staged.names[key]) };
  });
}

export const nextStage = (p: ProjectState): ProjectStage | undefined => p.stages?.find((x) => x.by === null);

/** Whether this finished project counts as one `seat` completed. For a staged one, anyone who funded a stage did (CC-STAGE-7). */
export const helpedComplete = (p: ProjectState, seat: number): boolean =>
  p.by !== null && (p.stages ? p.stages.some((x) => x.by === seat) : p.by === seat);
