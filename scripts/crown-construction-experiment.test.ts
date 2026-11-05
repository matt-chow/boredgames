/**
 * Crown Project construction experiment (CC-STAGE-*): not part of the game. Plays paired seeded tables under the live rule and
 * the six trial editions, and writes data/clockwork-commons/crown-construction-experiment.json and
 * docs/CROWN_CONSTRUCTION_RESULTS.md. EXPERIMENT_GAMES sets games per family, edition and player count (default 30).
 * One process, one game at a time, so it fits a low-memory machine.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../src/engine/deckbuilder';
import { clockwork as game } from '../src/games/clockwork';
import { botMove, PROFILES } from '../src/games/clockwork/rules/bot';
import { SPARK } from '../src/games/clockwork/rules/cards';

const N = Number(process.env.EXPERIMENT_GAMES ?? 30);
const COUNTS = [2, 3, 4, 5, 6];
const LONG_ROUNDS = 40;
const STEP_CAP = 30_000;
const CONFIGS: { id: string; edition: string | null; name: string }[] = [
  { id: 'Live', edition: null, name: 'Reference: the live rule, 4 of 5 claimed whole, live bots' },
  { id: 'C0', edition: 'C0', name: 'Single stage, original costs, all 5 to end' },
  { id: 'C1', edition: 'C1', name: 'Single stage, +1 Coin each, all 5 to end' },
  { id: 'F1', edition: 'F1', name: 'Fixed 1/2/2/3/3, original totals, all 5 to end' },
  { id: 'F2', edition: 'F2', name: 'Fixed 1/2/2/3/3, +1 Coin per multi-stage Project, all 5 to end' },
  { id: 'S1', edition: 'S1', name: 'Scaled by players, original totals, all 5 to end' },
  { id: 'S2', edition: 'S2', name: 'Scaled by players, +1 Coin per multi-stage Project, all 5 to end' },
];
const FAMILIES: { id: string; sets: string[]; note: string }[] = [
  { id: 'standard', sets: ['core', 'crown'], note: 'Default sets' },
  { id: 'artisans', sets: ['core', 'foundry'], note: 'Economy and Establishments' },
  { id: 'rivals', sets: ['core', 'night'], note: 'Attacks and Debt' },
  { id: 'chancery', sets: ['core', 'town'], note: 'Project rivalry and 5 more Projects' },
];
const TREASURY = ['cog', 'dynamo', 'notebook', 'blueprint', 'monument'];

interface Row {
  rounds: number;
  ended: 'grand-duchy' | 'projects' | 'piles' | 'cap' | 'stuck';
  seats: string[];
  winners: number[];
  order: number[];
  margin: number;
  score: number[];
  project: number[];
  other: number[];
  completed: number;
  stagesFunded: number;
  stagesExist: number;
  contributors: number[];
  zero: number;
  topShare: number | null;
  hhi: number | null;
  bought: Record<string, number>;
  marketBought: number;
  gained: number;
  spentProject: number;
  spentConvert: number;
  spentOther: number;
  unused: number;
  completedAt: number[];
}

function play(edition: string | null, sets: string[], players: number, seed: string, i: number): Row {
  const profiles = Array.from({ length: players }, (_, k) => PROFILES[1 + ((i * 7 + k * 5) % (PROFILES.length - 1))]);
  const config = { market: [], bans: [], projects: [], sets, ...(edition ? { edition } : {}) };
  let s = game.setup({ playerCount: players, seed, config }) as DeckState;
  const first = s.turn.seat;
  const roundOf = (x: DeckState) => (x.turn.number + 1) / players;
  const bought: Record<string, number> = {};
  let marketBought = 0;
  let gained = 0;
  let spentProject = 0;
  let spentConvert = 0;
  let spentOther = 0;
  const completedAt: number[] = [];
  let stuck = false;
  for (let step = 0; step < STEP_CAP && !s.over; step++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
    let done = false;
    for (const a of (move?.actions ?? []) as DeckAction[]) {
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      const before = s.players.map((p) => p.tokens[SPARK] ?? 0);
      const openBefore = s.projects.filter((p) => p.by === null).length;
      r.state.players.forEach((p, k) => {
        const d = (p.tokens[SPARK] ?? 0) - before[k];
        if (d > 0) gained += d;
        else if (a.type === 'claim' && k === seat) spentProject -= d;
        else if (a.type === 'convert' && k === seat) spentConvert -= d;
        else spentOther -= d;
      });
      if (a.type === 'buy') {
        if (TREASURY.includes(a.pile)) bought[a.pile] = (bought[a.pile] ?? 0) + 1;
        else marketBought++;
      }
      for (let c = r.state.projects.filter((p) => p.by === null).length; c < openBefore; c++) completedAt.push(roundOf(s));
      s = r.state;
      done = true;
      break;
    }
    if (!done) {
      stuck = true;
      break;
    }
  }
  const finals = s.over ? (game.project(s, 0) as DeckView).final! : [];
  const results = s.over ? game.results!(s)! : [];
  const project = finals.map((f) => f.breakdown.projects);
  const sum = project.reduce((a, b) => a + b, 0);
  const shares = project.map((x) => (sum ? x / sum : 0));
  const stageBy = s.projects.flatMap((p) => (p.stages ? p.stages.map((x) => x.by) : [p.by]));
  const ended: Row['ended'] = stuck
    ? 'stuck'
    : !s.over
      ? 'cap'
      : (s.supply.monument?.length ?? 1) === 0
        ? 'grand-duchy'
        : s.projects.filter((p) => p.by !== null).length >= (edition ? 5 : 4)
          ? 'projects'
          : 'piles';
  return {
    rounds: roundOf(s),
    ended,
    seats: profiles.map((p) => p.name),
    winners: results.filter((r) => r.winner).map((r) => r.seat),
    order: Array.from({ length: players }, (_, k) => (k - first + players) % players),
    margin: finals.length ? (() => {
      const sorted = finals.map((f) => f.total).sort((a, b) => b - a);
      return sorted[0] - sorted[1];
    })() : 0,
    score: finals.map((f) => f.total),
    project,
    other: finals.map((f) => f.total - f.breakdown.projects),
    completed: s.projects.filter((p) => p.by !== null).length,
    stagesFunded: stageBy.filter((x) => x !== null).length,
    stagesExist: stageBy.length,
    // Only Projects somebody has funded: an untouched one says nothing about sharing.
    contributors: s.projects
      .map((p) => new Set((p.stages ? p.stages.map((x) => x.by) : [p.by]).filter((x) => x !== null)).size)
      .filter((n) => n > 0),
    zero: project.filter((x) => x === 0).length,
    topShare: sum ? Math.max(...shares) : null,
    hhi: sum ? shares.reduce((a, x) => a + x * x, 0) : null,
    bought,
    marketBought,
    gained,
    spentProject,
    spentConvert,
    spentOther,
    unused: s.players.reduce((a, p) => a + (p.tokens[SPARK] ?? 0), 0),
    completedAt,
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const y = [...xs].sort((a, b) => a - b);
  return y.length % 2 ? y[(y.length - 1) / 2] : (y[y.length / 2 - 1] + y[y.length / 2]) / 2;
};
const ci = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return 1.96 * Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1) / xs.length);
};
const wilson = (wins: number, n: number): [number, number] => {
  if (!n) return [0, 0];
  const z = 1.96;
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
};

function summarise(rows: Row[], players: number) {
  const fin = rows.filter((r) => r.ended !== 'cap' && r.ended !== 'stuck');
  const rounds = fin.map((r) => r.rounds);
  const seatsPlayed = fin.length * players;
  const strategies: Record<string, { n: number; wins: number; lo: number; hi: number; rate: number; project: number }> = {};
  const positions = Array.from({ length: players }, () => ({ n: 0, wins: 0 }));
  for (const r of fin) {
    const share = 1 / Math.max(1, r.winners.length);
    r.seats.forEach((name, k) => {
      const e = (strategies[name] ??= { n: 0, wins: 0, lo: 0, hi: 0, rate: 0, project: 0 });
      e.n++;
      e.project += r.project[k];
      positions[r.order[k]].n++;
      if (r.winners.includes(k)) {
        e.wins += share;
        positions[r.order[k]].wins += share;
      }
    });
  }
  for (const e of Object.values(strategies)) {
    [e.lo, e.hi] = wilson(e.wins, e.n);
    e.rate = e.n ? e.wins / e.n : 0;
    e.project = e.n ? e.project / e.n : 0;
  }
  const sumOf = (f: (r: Row) => number) => fin.reduce((a, r) => a + f(r), 0);
  const ended: Record<string, number> = {};
  for (const r of rows) ended[r.ended] = (ended[r.ended] ?? 0) + 1;
  const rates = Object.values(strategies).map((e) => e.rate);
  return {
    games: rows.length,
    completed: fin.length,
    softlocks: rows.length - fin.length,
    rounds: { mean: mean(rounds), median: median(rounds), ci: ci(rounds), over40: rounds.filter((x) => x > LONG_ROUNDS).length },
    ended,
    strategies,
    worksRate: strategies.Works?.rate ?? 0,
    bestRate: rates.length ? Math.max(...rates) : 0,
    worstRate: rates.length ? Math.min(...rates) : 0,
    /** A strategy's chance if every seat were equal. */
    even: 1 / players,
    positions: positions.map((p) => (p.n ? p.wins / p.n : 0)),
    projectRenownPerPlayer: sumOf((r) => mean(r.project)) / Math.max(1, fin.length),
    otherRenownPerPlayer: sumOf((r) => mean(r.other)) / Math.max(1, fin.length),
    projectShare: sumOf((r) => r.project.reduce((a, b) => a + b, 0)) / Math.max(1, sumOf((r) => r.score.reduce((a, b) => a + b, 0))),
    completedProjects: sumOf((r) => r.completed) / Math.max(1, fin.length),
    stageContributions: sumOf((r) => r.stagesFunded) / Math.max(1, fin.length),
    stagesExist: sumOf((r) => r.stagesExist) / Math.max(1, fin.length),
    uniqueContributors: mean(fin.flatMap((r) => r.contributors)),
    zeroProjectPct: seatsPlayed ? sumOf((r) => r.zero) / seatsPlayed : 0,
    topShare: mean(fin.flatMap((r) => (r.topShare === null ? [] : [r.topShare]))),
    hhi: mean(fin.flatMap((r) => (r.hhi === null ? [] : [r.hhi]))),
    margin: mean(fin.map((r) => r.margin)),
    treasury: Object.fromEntries(TREASURY.map((k) => [k, sumOf((r) => r.bought[k] ?? 0) / Math.max(1, seatsPlayed)])),
    marketBought: sumOf((r) => r.marketBought) / Math.max(1, seatsPlayed),
    influence: {
      gained: sumOf((r) => r.gained) / Math.max(1, seatsPlayed),
      spentProject: sumOf((r) => r.spentProject) / Math.max(1, seatsPlayed),
      spentConvert: sumOf((r) => r.spentConvert) / Math.max(1, seatsPlayed),
      spentOther: sumOf((r) => r.spentOther) / Math.max(1, seatsPlayed),
      unused: sumOf((r) => r.unused) / Math.max(1, seatsPlayed),
    },
    completionRound: mean(fin.flatMap((r) => r.completedAt)),
  };
}
type Summary = ReturnType<typeof summarise>;

const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

function table(title: string, head: string[], rows: (string | number)[][]) {
  return [`### ${title}`, '', `| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`), ''].join('\n');
}

it('runs the construction experiment', () => {
  const started = Date.now();
  const raw: Record<string, Row[]> = {};
  for (const fam of FAMILIES)
    for (const players of COUNTS)
      for (const cfg of CONFIGS) {
        const rows: Row[] = [];
        for (let i = 0; i < N; i++) rows.push(play(cfg.edition, fam.sets, players, `crown-construction-${fam.id}-${players}-${i}`, i));
        raw[`${fam.id}|${cfg.id}|${players}`] = rows;
        console.log(`${fam.id} ${cfg.id} ${players}p ${mean(rows.map((r) => r.rounds)).toFixed(1)} rounds; ${((Date.now() - started) / 1000).toFixed(0)} s`);
      }

  const all: Record<string, Record<number, Summary>> = {};
  const byFamily: Record<string, Record<string, Record<number, Summary>>> = {};
  for (const cfg of CONFIGS) {
    all[cfg.id] = {};
    for (const players of COUNTS) {
      all[cfg.id][players] = summarise(FAMILIES.flatMap((fam) => raw[`${fam.id}|${cfg.id}|${players}`]), players);
      for (const fam of FAMILIES) ((byFamily[fam.id] ??= {})[cfg.id] ??= {})[players] = summarise(raw[`${fam.id}|${cfg.id}|${players}`], players);
    }
  }
  mkdirSync('data/clockwork-commons', { recursive: true });
  writeFileSync(
    'data/clockwork-commons/crown-construction-experiment.json',
    JSON.stringify({ gamesPerCell: N, seeds: 'crown-construction-<family>-<players>-<i>', families: FAMILIES, configs: CONFIGS, all, byFamily }, null, 1),
  );

  const each = (f: (s: Summary, id: string, p: number) => (string | number)[]) => CONFIGS.flatMap((c) => COUNTS.map((p) => [c.id, p, ...f(all[c.id][p], c.id, p)]));
  const end = (s: Summary, k: string) => pct((s.ended[k] ?? 0) / s.games);
  const out = [
    '# Crown Project construction: raw results',
    '',
    `Generated by \`npm run experiment:crown-construction\`. ${N} games per family, edition and player count, so ${N * FAMILIES.length} per row below.`,
    `Seeds are \`crown-construction-<family>-<players>-<i>\`; edition tables on one seed share market, Projects, deal and first player. Reading and recommendation: CROWN_CONSTRUCTION_EXPERIMENT.md.`,
    '',
    table('Length and endings', ['Rules', 'Players', 'Done', 'Mean rounds (±95%)', 'Median', '>40 rounds', 'Grand Duchy', 'Projects', 'Piles', 'Stuck/cap'], each((s) => [`${s.completed}/${s.games}`, `${f1(s.rounds.mean)} ±${f1(s.rounds.ci)}`, f1(s.rounds.median), s.rounds.over40, end(s, 'grand-duchy'), end(s, 'projects'), end(s, 'piles'), s.softlocks])),
    table('Crown Projects', ['Rules', 'Players', 'Complete of 5', 'Stages funded', 'Of stages', 'Contributors per Project', 'Completed in round'], each((s) => [f2(s.completedProjects), f1(s.stageContributions), f1(s.stagesExist), f2(s.uniqueContributors), f1(s.completionRound)])),
    table('Renown and sharing', ['Rules', 'Players', 'Project Renown per player', 'Other Renown per player', 'Project share', 'Zero-Project players', 'Top player’s share', 'Concentration (HHI)', 'Win margin'], each((s) => [f1(s.projectRenownPerPlayer), f1(s.otherRenownPerPlayer), pct(s.projectShare), pct(s.zeroProjectPct), pct(s.topShare), f2(s.hhi), f1(s.margin)])),
    table('Strategy fairness', ['Rules', 'Players', 'Even chance', 'Projects bot', '(95% CI)', 'Best strategy', 'Worst strategy', 'First seat', 'Last seat'], each((s) => {
      const w = s.strategies.Works ?? { lo: 0, hi: 0 };
      return [pct(s.even), pct(s.worksRate), `${pct(w.lo)}–${pct(w.hi)}`, pct(s.bestRate), pct(s.worstRate), pct(s.positions[0]), pct(s.positions.at(-1)!)];
    })),
    table('Treasury and market purchases per player', ['Rules', 'Players', 'Silver', 'Gold', 'Homestead', 'Noble Estate', 'Grand Duchy', 'Market'], each((s) => [f2(s.treasury.cog), f2(s.treasury.dynamo), f2(s.treasury.notebook), f2(s.treasury.blueprint), f2(s.treasury.monument), f2(s.marketBought)])),
    table('Influence per player', ['Rules', 'Players', 'Gained', 'On Projects', 'To Coins', 'Other', 'Unused at end'], each((s) => [f1(s.influence.gained), f1(s.influence.spentProject), f1(s.influence.spentConvert), f1(s.influence.spentOther), f1(s.influence.unused)])),
    table('Strategy win rates, all player counts together', ['Strategy', ...CONFIGS.map((c) => c.id)], PROFILES.slice(1).map((p) => p.name).sort().map((name) => [name, ...CONFIGS.map((c) => {
      const games = COUNTS.map((p) => all[c.id][p].strategies[name]).filter(Boolean);
      return pct(games.reduce((a, e) => a + e.wins, 0) / Math.max(1, games.reduce((a, e) => a + e.n, 0)));
    })])),
    '## By market family',
    '',
    ...FAMILIES.map((fam) =>
      table(`${fam.id}: ${fam.note} (${fam.sets.join(' + ')})`, ['Rules', 'Players', 'Mean rounds', 'Projects ended', 'Grand Duchy ended', 'Complete of 5', 'Projects bot', 'Zero-Project players'], CONFIGS.flatMap((c) => COUNTS.map((p) => {
        const s = byFamily[fam.id][c.id][p];
        return [c.id, p, f1(s.rounds.mean), end(s, 'projects'), end(s, 'grand-duchy'), f2(s.completedProjects), pct(s.worksRate), pct(s.zeroProjectPct)];
      }))),
    ),
    `Run time: ${((Date.now() - started) / 60000).toFixed(1)} minutes, one process, on the development laptop.`,
    '',
  ];
  writeFileSync('docs/CROWN_CONSTRUCTION_RESULTS.md', out.join('\n'));
}, 6 * 3_600_000);
