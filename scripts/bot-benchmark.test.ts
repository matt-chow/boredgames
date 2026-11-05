/**
 * Edition 4 bot benchmark: not part of the game. Seat-rotated mirrors, mixed tables, and the new bots against the earlier logic.
 * Writes data/clockwork-commons/bot-benchmark.json and docs/BOT_BENCHMARK.md. BENCH_GAMES scales it (default 20 per cell).
 * One process, one game at a time, so it fits a low-memory machine.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../src/engine/deckbuilder';
import { clockwork as game } from '../src/games/clockwork';
import { botMove, PROFILES, type Profile } from '../src/games/clockwork/rules/bot';

const N = Number(process.env.BENCH_GAMES ?? 20);
const COUNTS = [2, 3, 4, 5, 6];
const FAMILIES = [['core', 'crown'], ['core', 'foundry'], ['core', 'night'], ['core', 'town']];
const STEP_CAP = 30_000;

interface Seat { profile: Profile; old?: boolean }
interface Row { rounds: number; ended: 'duchy' | 'projects' | 'piles' | 'stuck'; winners: number[]; order: number[]; scores: number[]; projects: number[]; stages: number; complete: number; trigger: number | null; triggerWon: boolean }

function play(seats: Seat[], seed: string, sets: string[]): Row {
  const n = seats.length;
  let s = game.setup({ playerCount: n, seed, config: { market: [], bans: [], projects: [], sets } }) as DeckState;
  const first = s.turn.seat;
  let stuck = false;
  for (let step = 0; step < STEP_CAP && !s.over; step++) {
    const [seat] = game.actors(s);
    const v = game.project(s, seat) as DeckView;
    // The earlier logic is what a room on edition 3 runs, so showing it that number is enough.
    const move = botMove(seats[seat].old ? { ...v, rulesVersion: 3 } : v, seats[seat].profile, 0);
    const r = ((move?.actions ?? []) as DeckAction[]).map((a) => game.apply(s, seat, a)).find((x) => x.ok);
    if (!r || !r.ok) {
      stuck = true;
      break;
    }
    s = r.state;
  }
  const finals = s.over ? (game.project(s, 0) as DeckView).final! : [];
  const results = s.over ? game.results!(s)! : [];
  const winners = results.filter((r) => r.winner).map((r) => r.seat);
  const trigger = s.finalRound?.by ?? null;
  return {
    rounds: (s.turn.number + 1) / n,
    ended: !s.over || stuck ? 'stuck' : s.supply.monument.length === 0 ? 'duchy' : s.projects.every((p) => p.by !== null) ? 'projects' : 'piles',
    winners,
    order: Array.from({ length: n }, (_, k) => (k - first + n) % n),
    scores: finals.map((f) => f.total),
    projects: finals.map((f) => f.breakdown.projects),
    stages: s.projects.flatMap((p) => p.stages ?? []).filter((x) => x.by !== null).length,
    complete: s.projects.filter((p) => p.by !== null).length,
    trigger,
    triggerWon: trigger !== null && winners.includes(trigger),
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  const y = [...xs].sort((a, b) => a - b);
  return !y.length ? 0 : y.length % 2 ? y[(y.length - 1) / 2] : (y[y.length / 2 - 1] + y[y.length / 2]) / 2;
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
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

function seatRates(rows: Row[], n: number) {
  const wins = Array<number>(n).fill(0);
  for (const r of rows) for (const w of r.winners) wins[r.order[w]] += 1 / r.winners.length;
  return wins.map((w) => w / Math.max(1, rows.length));
}
function endings(rows: Row[]) {
  const share = (e: Row['ended']) => pct(rows.filter((r) => r.ended === e).length / Math.max(1, rows.length));
  return { duchy: share('duchy'), projects: share('projects'), piles: share('piles'), stuck: rows.filter((r) => r.ended === 'stuck').length };
}

it('benchmarks edition 4 bots', () => {
  const started = Date.now();
  // Mirrors: one strategy in every seat. Any seat gap comes from turn order and the deal, not the strategy.
  const mirror: Record<string, unknown>[] = [];
  const mirrorByCount: Row[][] = COUNTS.map(() => []);
  for (const profile of PROFILES) {
    const rows: Row[] = [];
    COUNTS.forEach((players, c) => {
      for (let i = 0; i < N; i++) {
        const row = play(Array.from({ length: players }, () => ({ profile })), `bot-mirror-${profile.name}-${players}-${i}`, FAMILIES[i % FAMILIES.length]);
        rows.push(row);
        mirrorByCount[c].push(row);
      }
    });
    const ok = rows.filter((r) => r.ended !== 'stuck');
    mirror.push({ name: profile.name, games: rows.length, rounds: median(ok.map((r) => r.rounds)), score: mean(ok.flatMap((r) => r.scores)), stages: mean(ok.map((r) => r.stages)), complete: mean(ok.map((r) => r.complete)), projectShare: mean(ok.map((r) => mean(r.projects) / Math.max(1, mean(r.scores)))), ...endings(rows) });
  }
  const byCount = COUNTS.map((players, c) => {
    const ok = mirrorByCount[c].filter((r) => r.ended !== 'stuck');
    return { players, games: ok.length, rounds: median(ok.map((r) => r.rounds)), seats: seatRates(ok, players).map(pct), triggerWon: pct(ok.filter((r) => r.triggerWon).length / Math.max(1, ok.filter((r) => r.trigger !== null).length)), ...endings(mirrorByCount[c]) };
  });

  // Mixed: every seat a different strategy where possible, rotated so each meets each seat.
  const mixedGames = N * 12;
  const tally = new Map<string, { n: number; wins: number; byCount: Record<number, { n: number; wins: number }> }>();
  const mixedByCount = COUNTS.map((players) => {
    const rows: Row[] = [];
    for (let i = 0; i < mixedGames; i++) {
      const seats = Array.from({ length: players }, (_, k) => ({ profile: PROFILES[(i * 7 + k * 5 + Math.floor(i / PROFILES.length)) % PROFILES.length] }));
      const row = play(seats, `bot-mixed-${players}-${i}`, FAMILIES[i % FAMILIES.length]);
      rows.push(row);
      if (row.ended === 'stuck') continue;
      seats.forEach(({ profile }, k) => {
        const e = tally.get(profile.name) ?? { n: 0, wins: 0, byCount: {} };
        const c = (e.byCount[players] ??= { n: 0, wins: 0 });
        const share = row.winners.includes(k) ? 1 / row.winners.length : 0;
        e.n++;
        e.wins += share;
        c.n++;
        c.wins += share;
        tally.set(profile.name, e);
      });
    }
    const ok = rows.filter((r) => r.ended !== 'stuck');
    return { players, games: ok.length, rounds: median(ok.map((r) => r.rounds)), stages: mean(ok.map((r) => r.stages)), seats: seatRates(ok, players).map(pct), ...endings(rows) };
  });
  const expected = (e: { byCount: Record<number, { n: number; wins: number }> }) => {
    const c = Object.entries(e.byCount);
    return c.reduce((a, [p, x]) => a + (x.wins / x.n) * Number(p), 0) / c.length;
  };
  const mixed = [...tally.entries()].map(([name, e]) => ({ name, seats: e.n, winRate: e.wins / e.n, ci: wilson(e.wins, e.n), vsFair: expected(e) })).sort((a, b) => b.vsFair - a.vsFair);

  // One new bot against a field of the earlier logic, then the reverse. The fair share is 1/players.
  const versus = [2, 4].map((players) => {
    const run = (oldField: boolean) => {
      let wins = 0;
      let games = 0;
      for (const profile of PROFILES) {
        for (let i = 0; i < N * 2; i++) {
          const hero = i % players;
          const seats = Array.from({ length: players }, (_, k) => ({ profile, old: oldField ? k !== hero : k === hero }));
          const row = play(seats, `bot-versus-${profile.name}-${players}-${i}`, FAMILIES[i % FAMILIES.length]);
          if (row.ended === 'stuck') continue;
          games++;
          if (row.winners.includes(hero)) wins += 1 / row.winners.length;
        }
      }
      return { games, rate: wins / Math.max(1, games) };
    };
    return { players, fair: 1 / players, newAgainstOld: run(true), oldAgainstNew: run(false) };
  });

  const seconds = Math.round((Date.now() - started) / 1000);
  const out = { games: { perCell: N, mixedPerCount: mixedGames }, seconds, byCount, mirror, mixedByCount, mixed, versus };
  mkdirSync('data/clockwork-commons', { recursive: true });
  writeFileSync('data/clockwork-commons/bot-benchmark.json', JSON.stringify(out, null, 1) + '\n');
  writeFileSync('docs/BOT_BENCHMARK.md', [
    '# Kingdom & Commerce: bot benchmark (edition 4)',
    '',
    `Generated by \`scripts/bot-benchmark.test.ts\` (\`npm run experiment:bots\`), ${N} games per cell, ${mixedGames} mixed tables per player count, seats rotated, in ${seconds} s. Bots are not people: these numbers rank the bots and flag things to look at. They don't prove a card is too strong.`,
    '',
    '## New bots against the earlier logic',
    '',
    'One bot in a field of the other kind, same strategy in every seat. Fair share is 1/players.',
    '',
    table(['Players', 'Fair share', 'New bot among old', 'Old bot among new'], versus.map((x) => [x.players, pct(x.fair), `${pct(x.newAgainstOld.rate)} of ${x.newAgainstOld.games}`, `${pct(x.oldAgainstNew.rate)} of ${x.oldAgainstNew.games}`])),
    '',
    '## Mirrors by player count',
    '',
    'All strategies pooled. Seats are in turn order. Trigger won is how often the player who triggered the ending won.',
    '',
    table(['Players', 'Games', 'Median rounds', 'Grand Duchy', 'Projects', 'Piles', 'Stuck', 'Trigger won', 'Win share by seat'], byCount.map((x) => [x.players, x.games, x.rounds.toFixed(1), x.duchy, x.projects, x.piles, x.stuck, x.triggerWon, x.seats.join(', ')])),
    '',
    '## Mirrors by strategy',
    '',
    table(['Strategy', 'Games', 'Median rounds', 'Mean score', 'Stages funded of 11', 'Projects complete', 'Project share of Renown', 'Grand Duchy', 'Projects', 'Piles', 'Stuck'], (mirror as { name: string; games: number; rounds: number; score: number; stages: number; complete: number; projectShare: number; duchy: string; projects: string; piles: string; stuck: number }[]).map((x) => [x.name, x.games, x.rounds.toFixed(1), x.score.toFixed(1), x.stages.toFixed(1), x.complete.toFixed(1), pct(x.projectShare), x.duchy, x.projects, x.piles, x.stuck])),
    '',
    '## Mixed tables',
    '',
    'Win rate pools all counts. Against fair is win rate relative to 1/players, averaged across counts: 1.00 is an even share.',
    '',
    table(['Strategy', 'Seats played', 'Win rate', '95% interval', 'Against fair'], mixed.map((x) => [x.name, x.seats, pct(x.winRate), `${pct(x.ci[0])} to ${pct(x.ci[1])}`, x.vsFair.toFixed(2)])),
    '',
    table(['Players', 'Games', 'Median rounds', 'Stages funded', 'Grand Duchy', 'Projects', 'Piles', 'Stuck', 'Win share by seat'], mixedByCount.map((x) => [x.players, x.games, x.rounds.toFixed(1), x.stages.toFixed(1), x.duchy, x.projects, x.piles, x.stuck, x.seats.join(', ')])),
    '',
  ].join('\n'));
});
