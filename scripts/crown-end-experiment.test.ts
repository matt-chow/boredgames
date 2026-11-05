/**
 * Crown Project end rule experiment: not part of the game, and it changes nothing the game ships. Plays the same seeded tables
 * under three end rules, on private copies of the rules, and writes data/clockwork-commons/crown-end-experiment.json and
 * docs/CROWN_END_EXPERIMENT.md. EXPERIMENT_GAMES sets the games per rule and player count (default 100).
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { createDeckGame, type DeckAction, type DeckState, type DeckView } from '../src/engine/deckbuilder';
import { botMove, PROFILES } from '../src/games/clockwork/rules/bot';
import { RULES } from '../src/games/clockwork/rules/ruleset';

const N = Number(process.env.EXPERIMENT_GAMES ?? 100);
const COUNTS = [2, 3, 4, 5, 6];
/** Longer than any table game seen under the current rule, so it flags games that drag. */
const LONG_ROUNDS = 40;
const COINS = ['scrap', 'cog', 'dynamo'];
const RENOWN = ['notebook', 'blueprint', 'monument'];

const VARIANTS = [
  { id: 'A', name: 'Current: ends at 4 of 5 Projects', rules: { ...RULES } },
  { id: 'B', name: 'Projects never end the game', rules: { ...RULES, projectsToEnd: undefined } },
  { id: 'C', name: 'Ends when all 5 are claimed', rules: { ...RULES, projectsToEnd: () => 5 } },
];

interface Played {
  winners: number[];
  seats: string[];
  scores: number[];
  rounds: number;
  steps: number;
  claims: number[];
  bought: Record<string, number>[];
  breakdowns: Record<string, number>[];
  ended: 'grand-duchy' | 'piles' | 'projects' | 'cap';
}

function play(game: ReturnType<typeof createDeckGame>, players: number, i: number): Played {
  const profiles = Array.from({ length: players }, (_, k) => PROFILES[1 + ((i * 7 + k * 5) % (PROFILES.length - 1))]);
  let s: DeckState = game.setup({ playerCount: players, seed: `crown-end-${players}-${i}`, config: { market: [], bans: [], projects: [], sets: ['core', 'crown'] } });
  const claims: number[] = Array(players).fill(0);
  const bought = Array.from({ length: players }, () => ({}) as Record<string, number>);
  let step = 0;
  for (; step < 20_000 && !s.over; step++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
    if (!move) throw new Error(`seat ${seat} has no move`);
    let done = false;
    for (const a of move.actions as DeckAction[]) {
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      if (a.type === 'claim') claims[seat]++;
      if (a.type === 'buy') bought[seat][a.pile] = (bought[seat][a.pile] ?? 0) + 1;
      s = r.state;
      done = true;
      break;
    }
    if (!done) throw new Error(`nothing legal for seat ${seat}`);
  }
  const results = s.over ? game.results!(s)! : [];
  const emptied = s.market.filter((k) => s.supply[k].length === 0).length >= (players >= 5 ? 4 : 3);
  return {
    winners: results.filter((r) => r.winner).map((r) => r.seat),
    seats: profiles.map((p) => p.name),
    scores: results.map((r) => r.score),
    rounds: Math.max(...s.players.map((p) => p.turns)),
    steps: step,
    claims,
    bought,
    breakdowns: s.over ? (game.project(s, 0) as DeckView).final!.map((r) => r.breakdown as unknown as Record<string, number>) : [],
    // shortcut: a game that meets two conditions on the same turn counts once, in this order. Fine for comparing rules.
    ended: !s.over ? 'cap' : s.supply.monument.length === 0 ? 'grand-duchy' : emptied ? 'piles' : 'projects',
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? round1(sum(xs) / xs.length) : 0);
const median = (xs: number[]) => {
  const y = [...xs].sort((a, b) => a - b);
  return y.length ? (y[y.length >> 1] + y[(y.length - 1) >> 1]) / 2 : 0;
};
const pct = (a: number, b: number) => (b ? round1((100 * a) / b) : 0);
const share = (g: Played, seat: number) => (g.winners.includes(seat) ? 1 / g.winners.length : 0);
const copies = (g: Played, keys: string[]) => mean(g.bought.map((b) => sum(keys.map((k) => b[k] ?? 0))));

function summarise(games: Played[]) {
  const seatsAll = games.flatMap((g) => g.breakdowns);
  const source = (k: string) => mean(seatsAll.map((b) => b[k] ?? 0));
  const claimed = games.map((g) => sum(g.claims));
  const rounds = games.map((g) => g.rounds);
  return {
    games: games.length,
    roundsMean: mean(rounds),
    roundsMedian: median(rounds),
    roundsMax: Math.max(...rounds),
    stepsMean: mean(games.map((g) => g.steps)),
    unfinished: games.filter((g) => g.ended === 'cap').length,
    overLong: games.filter((g) => g.rounds > LONG_ROUNDS).length,
    ended: {
      grandDuchy: pct(games.filter((g) => g.ended === 'grand-duchy').length, games.length),
      piles: pct(games.filter((g) => g.ended === 'piles').length, games.length),
      projects: pct(games.filter((g) => g.ended === 'projects').length, games.length),
    },
    projectsClaimed: mean(claimed),
    allFiveClaimedPct: pct(claimed.filter((c) => c >= 5).length, games.length),
    atLeastFourPct: pct(claimed.filter((c) => c >= 4).length, games.length),
    renownBySource: { estates: source('estates'), special: source('special'), projects: source('projects'), conditional: source('conditional'), negative: source('negative') },
    winnerScore: mean(games.map((g) => Math.max(...g.scores))),
    margin: mean(games.map((g) => {
      const top = [...g.scores].sort((a, b) => b - a);
      return top[0] - (top[1] ?? 0);
    })),
    coinCardsPerPlayer: mean(games.map((g) => copies(g, COINS))),
    goldPerPlayer: mean(games.map((g) => copies(g, ['dynamo']))),
    estatesPerPlayer: mean(games.map((g) => copies(g, RENOWN))),
    grandDuchyPerPlayer: mean(games.map((g) => copies(g, ['monument']))),
    firstSeatWinPct: pct(sum(games.map((g) => share(g, 0))), games.length),
  };
}

function byStrategy(games: Played[]) {
  const t: Record<string, { seats: number; wins: number; fair: number }> = {};
  for (const g of games) {
    g.seats.forEach((name, seat) => {
      const r = (t[name] ??= { seats: 0, wins: 0, fair: 0 });
      r.seats++;
      r.wins += share(g, seat);
      r.fair += 1 / g.seats.length;
    });
  }
  return Object.fromEntries(Object.entries(t).map(([k, r]) => [k, { seats: r.seats, winPct: pct(r.wins, r.seats), fairPct: pct(r.fair, r.seats) }]));
}

it('compares the three end rules on the same tables', () => {
  const started = Date.now();
  const out = VARIANTS.map((v) => {
    const game = createDeckGame(v.rules);
    const all: Played[] = [];
    const tables = COUNTS.map((players) => {
      const games = Array.from({ length: N }, (_, i) => play(game, players, i));
      all.push(...games);
      return { players, ...summarise(games) };
    });
    return { id: v.id, name: v.name, overall: summarise(all), strategy: byStrategy(all), tables };
  });
  const report = { generated: 'npm run experiment:crown-end', gamesPerRuleAndCount: N, totalGames: N * COUNTS.length * VARIANTS.length, seconds: Math.round((Date.now() - started) / 1000), variants: out };
  writeFileSync('data/clockwork-commons/crown-end-experiment.json', `${JSON.stringify(report, null, 2)}\n`);

  const row = (xs: unknown[]) => `| ${xs.join(' | ')} |`;
  const head = (xs: string[]) => `${row(xs)}\n${row(xs.map(() => '---'))}`;
  const lines = [
    ['Mean rounds', (o: ReturnType<typeof summarise>) => o.roundsMean],
    ['Median rounds', (o: ReturnType<typeof summarise>) => o.roundsMedian],
    ['Longest game (rounds)', (o: ReturnType<typeof summarise>) => o.roundsMax],
    [`Over ${LONG_ROUNDS} rounds`, (o: ReturnType<typeof summarise>) => o.overLong],
    ['Unfinished at the step cap', (o: ReturnType<typeof summarise>) => o.unfinished],
    ['Ended by Grand Duchy %', (o: ReturnType<typeof summarise>) => o.ended.grandDuchy],
    ['Ended by empty piles %', (o: ReturnType<typeof summarise>) => o.ended.piles],
    ['Ended by Projects %', (o: ReturnType<typeof summarise>) => o.ended.projects],
    ['Projects claimed per game', (o: ReturnType<typeof summarise>) => o.projectsClaimed],
    ['Games with 4+ claimed %', (o: ReturnType<typeof summarise>) => o.atLeastFourPct],
    ['Games with all 5 claimed %', (o: ReturnType<typeof summarise>) => o.allFiveClaimedPct],
    ['Renown: Estates', (o: ReturnType<typeof summarise>) => o.renownBySource.estates],
    ['Renown: Special', (o: ReturnType<typeof summarise>) => o.renownBySource.special],
    ['Renown: Projects', (o: ReturnType<typeof summarise>) => o.renownBySource.projects],
    ['Renown: Conditional', (o: ReturnType<typeof summarise>) => o.renownBySource.conditional],
    ['Renown: Negative', (o: ReturnType<typeof summarise>) => o.renownBySource.negative],
    ['Winner’s score', (o: ReturnType<typeof summarise>) => o.winnerScore],
    ['Winning margin', (o: ReturnType<typeof summarise>) => o.margin],
    ['Currency cards bought per player', (o: ReturnType<typeof summarise>) => o.coinCardsPerPlayer],
    ['Gold bought per player', (o: ReturnType<typeof summarise>) => o.goldPerPlayer],
    ['Renown cards bought per player', (o: ReturnType<typeof summarise>) => o.estatesPerPlayer],
    ['Grand Duchy bought per player', (o: ReturnType<typeof summarise>) => o.grandDuchyPerPlayer],
    ['First seat win %', (o: ReturnType<typeof summarise>) => o.firstSeatWinPct],
  ] as const;
  const names = Object.keys(out[0].strategy).sort();
  writeFileSync(
    'docs/CROWN_END_EXPERIMENT.md',
    `# Crown Project end rule experiment

Generated by \`npm run experiment:crown-end\`. An experiment only: the game still ends at 4 of 5 Projects. ${N} seeded games for each
rule and each of 2 to 6 players, ${report.totalGames} in all, on the Standard game (Core and Crown Decrees). Each rule plays the same
seeds, markets, Projects, bots and seats, and only the end rule differs. Every other way to end the game is unchanged: the Grand Duchy
pile running out, or 3 market piles running out (4 at 5 or 6 players).

${VARIANTS.map((v) => `- **${v.id}.** ${v.name}.`).join('\n')}

## Overall

${head(['Measure', ...out.map((v) => v.id)])}
${lines.map(([label, f]) => row([label, ...out.map((v) => f(v.overall))])).join('\n')}

## By player count

${head(['Players', 'Rule', 'Mean rounds', 'Median', 'Longest', 'Ended: Grand Duchy %', 'Piles %', 'Projects %', 'Claimed', 'All 5 %', 'Project Renown', 'Estate Renown', 'Currency cards', 'Renown cards', 'First seat %'])}
${COUNTS.flatMap((_, c) => out.map((v) => {
  const t = v.tables[c];
  return row([t.players, v.id, t.roundsMean, t.roundsMedian, t.roundsMax, t.ended.grandDuchy, t.ended.piles, t.ended.projects, t.projectsClaimed, t.allFiveClaimedPct, t.renownBySource.projects, t.renownBySource.estates, t.coinCardsPerPlayer, t.estatesPerPlayer, t.firstSeatWinPct]);
})).join('\n')}

## Win rate by strategy

Each style's share of wins across all player counts, with its fair share given the tables it sat at.

${head(['Style', 'Seats', 'Fair %', ...out.map((v) => `${v.id} win %`)])}
${names.map((n) => row([n, out[0].strategy[n].seats, out[0].strategy[n].fairPct, ...out.map((v) => v.strategy[n].winPct)])).join('\n')}
`,
  );
  console.log(`experiment done in ${report.seconds}s`);
});
