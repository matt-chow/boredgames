/**
 * Balance screen for the five 2026 expansions. Plays seeded bot games at 2 to 6 players with Crown Projects on and off,
 * and a favour test per card, then writes docs/expansions/FIVE_EXPANSION_BALANCE.md and
 * data/clockwork-commons/expansion5-balance.json. Same seeds, same report. BALANCE_GAMES scales it (default 40).
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../src/engine/deckbuilder';
import { clockwork as game } from '../src/games/clockwork';
import { BALANCED, botMove, PROFILES, type Profile } from '../src/games/clockwork/rules/bot';
import { GLORY } from '../src/games/clockwork/rules/glory';
import { HOUSES } from '../src/games/clockwork/rules/houses';
import { MASTERS } from '../src/games/clockwork/rules/masters';
import { PORTS } from '../src/games/clockwork/rules/ports';
import { REPUBLICS } from '../src/games/clockwork/rules/republics';

const N = Number(process.env.BALANCE_GAMES ?? 40);
const SETS = [['republics', REPUBLICS], ['houses', HOUSES], ['masters', MASTERS], ['ports', PORTS], ['glory', GLORY]] as const;
const BASE = ['core', 'crown'];

interface Played { s: DeckState; winners: number[]; turns: number[]; ended: 'grand duchy' | 'projects' | 'piles' | 'cap'; bought: string[] }

function play(players: number, seed: string, profiles: Profile[], config: Record<string, unknown>): Played {
  let s = game.setup({ playerCount: players, seed, config: { market: [], bans: [], projects: [], ...config } });
  const bought: string[] = [];
  for (let step = 0; step < 20_000 && !s.over; step++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
    if (!move) throw new Error(`${seed}: seat ${seat} has no move`);
    const next = (move.actions as DeckAction[]).map((a) => [a, game.apply(s, seat, a)] as const).find(([, r]) => r.ok);
    if (!next || !next[1].ok) throw new Error(`${seed}: nothing legal for seat ${seat}`);
    if (next[0].type === 'buy') bought.push(next[0].pile);
    s = next[1].state;
  }
  const results = s.over ? game.results!(s)! : [];
  // `by` is set when the last stage is funded, so it marks a complete Project in either rule.
  const done = s.projects.length > 0 && s.projects.every((p) => p.by !== null);
  const ended = !s.over ? 'cap' : s.supply.monument.length === 0 ? 'grand duchy' : done ? 'projects' : 'piles';
  return { s, winners: results.filter((r) => r.winner).map((r) => r.seat), turns: s.players.map((p) => p.turns), ended, bought };
}

const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);
const mean = (xs: number[]) => (xs.length ? Math.round((10 * xs.reduce((a, b) => a + b, 0)) / xs.length) / 10 : 0);
const margin = (rate: number, n: number) => (n ? Math.round(1960 * Math.sqrt(((rate / 100) * (1 - rate / 100)) / n)) / 10 : 0);
const share = (p: Played, seat: number) => (p.winners.includes(seat) ? 1 / p.winners.length : 0);

it('writes the five-expansion balance report', () => {
  const started = Date.now();
  // Every table: one new set (or all five) on top of the default sets, mixed playstyles, Projects on and off.
  const mixes = [...SETS.map(([k]) => [k]), SETS.map(([k]) => k)];
  const tables = mixes.flatMap((extra) =>
    [true, false].flatMap((crownProjects) =>
      [2, 3, 4, 5, 6].map((players) => {
        const games = Array.from({ length: N }, (_, i) => {
          const profiles = Array.from({ length: players }, (_, k) => PROFILES[1 + ((i * 7 + k * 5) % (PROFILES.length - 1))]);
          return play(players, `x5-${extra.join('+')}-${crownProjects ? 'p' : 'np'}-${players}-${i}`, profiles, { sets: [...BASE, ...extra], crownProjects });
        });
        const newKeys = new Set(SETS.filter(([k]) => extra.includes(k)).flatMap(([, cards]) => cards.map((c) => c.key)));
        return {
          sets: extra.length > 1 ? 'all five' : extra[0],
          projects: crownProjects,
          players,
          games: games.length,
          unfinished: games.filter((g) => g.ended === 'cap').length,
          unequalTurns: games.filter((g) => g.s.over && new Set(g.turns).size > 1).length,
          rounds: mean(games.map((g) => Math.max(...g.turns))),
          longest: Math.max(...games.map((g) => Math.max(...g.turns))),
          winnerScore: mean(games.filter((g) => g.s.over).map((g) => Math.max(...game.results!(g.s)!.map((r) => r.score)))),
          newCardBuys: mean(games.map((g) => g.bought.filter((k) => newKeys.has(k)).length)),
          ended: { grandDuchy: pct(games.filter((g) => g.ended === 'grand duchy').length, N), projects: pct(games.filter((g) => g.ended === 'projects').length, N), piles: pct(games.filter((g) => g.ended === 'piles').length, N) },
          firstSeat: pct(games.reduce((a, g) => a + share(g, 0), 0), N),
          fair: pct(1, players),
        };
      }),
    ),
  );

  // Favour test, as in npm run balance: Balanced that always buys the card against plain Balanced on the same market.
  const cards = SETS.flatMap(([set, defs], si) =>
    defs.map((c, idx) => {
      const pool = defs.filter((m) => m.key !== c.key).map((m) => m.key);
      const fav: Profile = { ...BALANCED, favour: c.key, name: `+${c.key}` };
      let wins = 0;
      for (let i = 0; i < N; i++) {
        const swap = i % 2 === 1;
        const start = ((i >> 1) * 5 + idx * 3) % pool.length;
        const rest = new Set<string>();
        for (let k = 0; rest.size < 4; k++) rest.add(pool[(start + k * 3) % pool.length]);
        const p = play(2, `x5-fav-${si}-${c.key}-${i >> 1}`, swap ? [BALANCED, fav] : [fav, BALANCED], { sets: [...BASE, set], market: [c.key, ...rest] });
        wins += share(p, swap ? 1 : 0);
      }
      const rate = pct(wins, N);
      return { key: c.key, name: c.name, set, cost: c.cost, favourWinPct: rate, margin: margin(rate, N) };
    }),
  );

  writeFileSync('data/clockwork-commons/expansion5-balance.json', `${JSON.stringify({ generated: 'npm run balance:expansions', gamesPerRow: N, tables, cards }, null, 2)}\n`);
  const row = (xs: unknown[]) => `| ${xs.join(' | ')} |`;
  const head = (xs: string[]) => `${row(xs)}\n${row(xs.map(() => '---'))}`;
  const setName = (k: string) => ({ republics: 'Merchant Republics', houses: 'Houses of Influence', masters: 'Masters & Apprentices', ports: 'Ports & Provinces', glory: 'Glory of the Realm' })[k] ?? k;
  const md = `# Five expansions: balance screen

Generated by \`npm run balance:expansions\` from seeded bot games, ${N} per row. Each table adds one new set (or all five) to
Core and Crown Decrees, with mixed playstyles. Bots are heuristics, not strong players: read this as a screen for outliers
and broken games, not a verdict on a card. Nothing in it has been used to change a card; see the review notes below.

## Tables

Unequal turns counts finished games where some seat had fewer turns. It must be 0, with Projects on or off.

${head(['Sets', 'Projects', 'Players', 'Games', 'Unfinished', 'Unequal turns', 'Mean rounds', 'Longest', 'Winner score', 'New-set buys/game', 'Ended: Grand Duchy %', 'Projects %', 'Piles %', 'First seat win %', 'Fair share %'])}
${tables.map((t) => row([t.sets === 'all five' ? t.sets : setName(t.sets), t.projects ? 'on' : 'off', t.players, t.games, t.unfinished, t.unequalTurns, t.rounds, t.longest, t.winnerScore, t.newCardBuys, t.ended.grandDuchy, t.ended.projects, t.ended.piles, t.firstSeat, t.fair])).join('\n')}

## Cards: favour test

Two players, Projects on. A Balanced bot that always buys the card (up to 3) against plain Balanced, on a market of the card,
four others from its set and five from the default sets. 50% means no effect; the interval is about ±${margin(50, N)} points.

${head(['Card', 'Set', 'Cost', 'Win %'])}
${[...cards].sort((a, b) => b.favourWinPct - a.favourWinPct).map((c) => row([c.name, setName(c.set), c.cost, c.favourWinPct])).join('\n')}
`;
  writeFileSync('docs/expansions/FIVE_EXPANSION_BALANCE.md', md);
  console.log(`expansion balance done in ${Math.round((Date.now() - started) / 1000)}s`);
});
