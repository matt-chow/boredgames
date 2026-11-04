/**
 * Kingdom & Commerce balance report. Plays seeded games with the strategy bots and writes
 * data/clockwork-commons/balance-report.json and docs/CLOCKWORK_BALANCE.md. Same seeds, same report.
 * BALANCE_GAMES scales the sample (default 100 per comparison).
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { DeckAction, DeckState, DeckView } from '../src/engine/deckbuilder';
import { clockwork as game } from '../src/games/clockwork';
import { BALANCED, botMove, PROFILES, STYLES, type Profile } from '../src/games/clockwork/rules/bot';
import { CARDS } from '../src/games/clockwork/rules/ruleset';

const N = Number(process.env.BALANCE_GAMES ?? 100);
const ALL = ['core', 'foundry', 'night', 'town', 'crown'];
const STANDARD = ['core', 'crown'];
const MARKET = CARDS.filter((c) => !c.basic);
const ATTACKS = new Set(MARKET.filter((c) => c.types.includes('attack')).map((c) => c.key));

interface Played {
  s: DeckState;
  winners: number[];
  bought: Record<string, number>[];
  claims: number[];
  sparkGained: number[];
  coinsSpent: number[];
  turns: number[];
  ended: 'monument' | 'piles' | 'works' | 'cap';
  /** Turns that bought nothing and completed nothing. */
  idle: number[];
  attacks: number;
  trashed: number;
  firstTreasury: (number | null)[];
}

function play(players: number, seed: string, profiles: Profile[], config: Record<string, unknown>): Played {
  let s = game.setup({ playerCount: players, seed, config: { market: [], bans: [], projects: [], sets: ALL, ...config } });
  const bought = Array.from({ length: players }, () => ({}) as Record<string, number>);
  const claims: number[] = Array(players).fill(0);
  const sparkGained: number[] = Array(players).fill(0);
  const coinsSpent: number[] = Array(players).fill(0);
  const idle: number[] = Array(players).fill(0);
  const firstTreasury: (number | null)[] = Array(players).fill(null);
  const busy = new Set<number>();
  let attacks = 0;
  for (let step = 0; step < 20_000 && !s.over; step++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
    if (!move) throw new Error(`${seed}: seat ${seat} has no move`);
    let applied = false;
    for (const a of move.actions as DeckAction[]) {
      const before = s.nextLog;
      const coins = s.turn.coins;
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      if (a.type === 'buy' || a.type === 'claim') busy.add(seat);
      if (a.type === 'buy' && a.pile === 'dynamo') firstTreasury[seat] ??= s.players[seat].turns;
      if (r.state.players[seat].turns > s.players[seat].turns) {
        if (!busy.has(seat)) idle[seat]++;
        busy.delete(seat);
      }
      if (a.type === 'buy') {
        bought[seat][a.pile] = (bought[seat][a.pile] ?? 0) + 1;
        coinsSpent[seat] += coins - r.state.turn.coins;
      }
      if (a.type === 'claim') claims[seat]++;
      for (const l of r.state.log) if (l.n >= before && l.kind === 'play' && (l.keys ?? []).some((k) => ATTACKS.has(k))) attacks++;
      for (const l of r.state.log) if (l.n >= before && l.kind === 'token' && l.seat !== undefined && (l.count ?? 0) > 0) sparkGained[l.seat] += l.count!;
      s = r.state;
      applied = true;
      break;
    }
    if (!applied) throw new Error(`${seed}: nothing legal for seat ${seat}`);
  }
  const results = s.over ? game.results!(s)! : [];
  const claimed = s.projects.filter((p) => p.by !== null).length;
  const ended = !s.over ? 'cap' : s.supply.monument.length === 0 ? 'monument' : claimed >= 4 ? 'works' : 'piles';
  return { s, winners: results.filter((r) => r.winner).map((r) => r.seat), bought, claims, sparkGained, coinsSpent, turns: s.players.map((p) => p.turns), ended, idle, attacks, trashed: s.trash.length, firstTreasury };
}

const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);
const mean = (xs: number[]) => (xs.length ? Math.round((10 * xs.reduce((a, b) => a + b, 0)) / xs.length) / 10 : 0);
/** Half-width of a 95% interval, in percentage points, so readers don't over-read small gaps. */
const margin = (rate: number, n: number) => (n ? Math.round(1960 * Math.sqrt(((rate / 100) * (1 - rate / 100)) / n)) / 10 : 0);
/** One game's share of a shared win. */
const share = (p: Played, seat: number) => (p.winners.includes(seat) ? 1 / p.winners.length : 0);

/** Two bots with swapped seats on the same random markets, so seat order and market cancel out. */
function versus(a: Profile, b: Profile, games: number, tag: string, config: (i: number) => Record<string, unknown> = () => ({})) {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const swap = i % 2 === 1;
    const p = play(2, `${tag}-${Math.floor(i / 2)}`, swap ? [b, a] : [a, b], config(i));
    wins += share(p, swap ? 1 : 0);
  }
  return pct(wins, games);
}

it('writes the balance report', () => {
  const started = Date.now();

  // Whole-table figures, each table a random mix of playstyles.
  const tables = [2, 3, 4, 5, 6].map((players) => {
    const games = Array.from({ length: N }, (_, i) => {
      const profiles = Array.from({ length: players }, (_, k) => PROFILES[1 + ((i * 7 + k * 5) % (PROFILES.length - 1))]);
      return play(players, `table-${players}-${i}`, profiles, { sets: STANDARD });
    });
    const firstWins = games.reduce((a, g) => a + share(g, 0), 0);
    const turnsAll = (g: Played) => Math.max(1, g.turns.reduce((a, b) => a + b, 0));
    const finals = games.flatMap((g) => (game.project(g.s, 0) as DeckView).final!.map((r) => r.breakdown));
    const debts = games.flatMap((g) => g.s.players.map((p) => [...p.deck, ...p.hand, ...p.discard, ...p.play].filter((id) => g.s.cards[id] === 'rust').length));
    const firsts = games.flatMap((g) => g.firstTreasury.filter((t) => t !== null));
    const winnerShare = (key: 'estates' | 'special' | 'projects' | 'negative' | 'conditional') => mean(finals.map((b) => b[key]));
    return {
      players,
      games: games.length,
      unfinished: games.filter((g) => g.ended === 'cap').length,
      roundsMean: mean(games.map((g) => Math.max(...g.turns))),
      turnsMax: Math.max(...games.map((g) => Math.max(...g.turns))),
      winnerScoreMean: mean(games.map((g) => Math.max(...game.results!(g.s)!.map((r) => r.score)))),
      worksClaimedMean: mean(games.map((g) => g.claims.reduce((a, b) => a + b, 0))),
      sparkPerTurnMean: mean(games.map((g) => g.sparkGained.reduce((a, b) => a + b, 0) / turnsAll(g))),
      coinsPerTurnMean: mean(games.map((g) => g.coinsSpent.reduce((a, b) => a + b, 0) / turnsAll(g))),
      endedBy: {
        monument: pct(games.filter((g) => g.ended === 'monument').length, games.length),
        piles: pct(games.filter((g) => g.ended === 'piles').length, games.length),
        works: pct(games.filter((g) => g.ended === 'works').length, games.length),
      },
      idleTurnPct: pct(games.reduce((a, g) => a + g.idle.reduce((x, y) => x + y, 0), 0), games.reduce((a, g) => a + turnsAll(g), 0)),
      attacksPerGame: mean(games.map((g) => g.attacks)),
      trashedPerGame: mean(games.map((g) => g.trashed)),
      debtPerPlayer: mean(debts),
      debtMax: Math.max(0, ...debts),
      firstTreasuryTurn: mean(firsts),
      scoring: { estates: winnerShare('estates'), special: winnerShare('special'), projects: winnerShare('projects'), negative: winnerShare('negative'), conditional: winnerShare('conditional') },
      firstSeatWinPct: pct(firstWins, games.length),
      fairShare: pct(1, players),
      firstSeatMargin: margin(pct(firstWins, games.length), games.length),
    };
  });

  // Each playstyle against the plain Currency baseline and against Balanced.
  const money = PROFILES[0];
  const styles = PROFILES.filter((p) => p !== money).map((p) => ({
    profile: p.name,
    vsMoneyCore: versus(p, money, N, `money-core-${p.name}`, () => ({ sets: ['core'] })),
    vsMoneyAll: versus(p, money, N, `money-all-${p.name}`),
    vsBalancedAll: p === BALANCED ? null : versus(p, BALANCED, N, `bal-all-${p.name}`),
  }));
  // A round robin of the non-baseline styles: a universally dominant one would beat all the others.
  const field = PROFILES.filter((p) => p !== money);
  const roundRobin: Record<string, Record<string, number>> = {};
  for (const a of field) roundRobin[a.name] = {};
  for (let i = 0; i < field.length; i++) {
    for (let j = i + 1; j < field.length; j++) {
      const rate = versus(field[i], field[j], Math.max(20, N / 2), `rr-${i}-${j}`);
      roundRobin[field[i].name][field[j].name] = rate;
      roundRobin[field[j].name][field[i].name] = Math.round((100 - rate) * 10) / 10;
    }
  }

  // Favour test: Balanced that always buys the card, against plain Balanced, on the same market with the card in it.
  const cards = MARKET.map((c, idx) => {
    const fav: Profile = { ...BALANCED, favour: c.key, name: `+${c.key}` };
    const pool = MARKET.filter((m) => m.key !== c.key).map((m) => m.key);
    const marketFor = (i: number) => {
      const start = ((i >> 1) * 13 + idx * 3) % pool.length;
      const rest = new Set<string>();
      for (let k = 0; rest.size < 9; k++) rest.add(pool[(start + k * 7) % pool.length]);
      return { market: [c.key, ...rest] };
    };
    const rate = versus(fav, BALANCED, N, `fav-${c.key}`, marketFor);
    return { key: c.key, name: c.name, cost: c.cost, set: c.set, styles: STYLES[c.key], favourWinPct: rate, margin: margin(rate, N) };
  });

  // Random markets, mixed styles at 3 players: how often a card is bought, and how its buyers do.
  const seen: Record<string, { games: number; buyers: number; copies: number; wins: number }> = {};
  const pairs: Record<string, { n: number; wins: number }> = {};
  const baseGames = N * 12;
  for (let i = 0; i < baseGames; i++) {
    const profiles = [0, 1, 2].map((k) => PROFILES[1 + ((i * 5 + k * 4) % (PROFILES.length - 1))]);
    const g = play(3, `market-${i}`, profiles, {});
    for (const key of g.s.market) (seen[key] ??= { games: 0, buyers: 0, copies: 0, wins: 0 }).games++;
    for (let seat = 0; seat < 3; seat++) {
      const keys = Object.keys(g.bought[seat]).filter((k) => g.s.market.includes(k));
      for (const k of keys) {
        const r = seen[k];
        r.buyers++;
        r.copies += g.bought[seat][k];
        r.wins += share(g, seat);
      }
      for (let a = 0; a < keys.length; a++) {
        for (let b = a + 1; b < keys.length; b++) {
          const id = [keys[a], keys[b]].sort().join('+');
          (pairs[id] ??= { n: 0, wins: 0 }).n++;
          pairs[id].wins += share(g, seat);
        }
      }
    }
  }
  const usage = Object.entries(seen)
    .map(([key, r]) => ({ key, markets: r.games, buyersPerGame: Math.round((100 * r.buyers) / r.games) / 100, copiesPerBuyer: r.buyers ? Math.round((100 * r.copies) / r.buyers) / 100 : 0, buyerWinPct: pct(r.wins, r.buyers) }))
    .sort((a, b) => b.buyerWinPct - a.buyerWinPct);
  const combos = Object.entries(pairs)
    .filter(([, r]) => r.n >= 30)
    .map(([id, r]) => ({ pair: id, n: r.n, winPct: pct(r.wins, r.n) }))
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 12);

  const report = { generated: 'npm run balance', gamesPerComparison: N, tables, styles, roundRobin, cards, usage, combos };
  writeFileSync('data/clockwork-commons/balance-report.json', `${JSON.stringify(report, null, 2)}\n`);
  const row = (xs: unknown[]) => `| ${xs.join(' | ')} |`;
  const head = (xs: string[]) => `${row(xs)}\n${row(xs.map(() => '---'))}`;
  const rrAverages = field.map((p) => ({ name: p.name, avg: mean(Object.values(roundRobin[p.name])), beats: Object.values(roundRobin[p.name]).filter((x) => x > 50).length }));
  const byFav = [...cards].sort((a, b) => b.favourWinPct - a.favourWinPct);
  const md = `# Kingdom & Commerce balance report

Generated by \`npm run balance\` from seeded bot games, ${N} games per comparison (seats swapped, so seat order cancels out).
Bots are heuristics, not strong players. Treat these as a screen for outliers, not as a verdict on a card. Design decisions
that came from them are recorded in docs/CLOCKWORK.md.

## Tables

${head(['Players', 'Games', 'Unfinished', 'Mean rounds', 'Longest', 'Winner score', 'Projects claimed', 'Influence/turn', 'Coins spent/turn', 'Ended: Grand Duchy %', 'piles %', 'Projects %', 'First seat win %', 'Fair share %'])}
${tables.map((t) => row([t.players, t.games, t.unfinished, t.roundsMean, t.turnsMax, t.winnerScoreMean, t.worksClaimedMean, t.sparkPerTurnMean, t.coinsPerTurnMean, t.endedBy.monument, t.endedBy.piles, t.endedBy.works, `${t.firstSeatWinPct} ±${t.firstSeatMargin}`, t.fairShare])).join('\n')}

## Pacing, attacks and scoring

The Standard game (Core and Crown Decrees), mixed playstyles. Debt is copies held at the end. The scoring columns are the mean
Renown per player from each source. Idle means a turn with nothing bought and nothing completed.

${head(['Players', 'Idle turns %', 'First Royal Treasury (turn)', 'Attacks/game', 'Trashed/game', 'Debt per player', 'Most Debt', 'Estates', 'Special', 'Projects', 'Negative', 'Conditional'])}
${tables.map((t) => row([t.players, t.idleTurnPct, t.firstTreasuryTurn, t.attacksPerGame, t.trashedPerGame, t.debtPerPlayer, t.debtMax, t.scoring.estates, t.scoring.special, t.scoring.projects, t.scoring.negative, t.scoring.conditional])).join('\n')}

## Playstyles

Win % in two-player games with seats swapped.

${head(['Style', 'vs Currency only (Core)', 'vs Currency only (all sets)', 'vs Balanced (all sets)', 'Round-robin average', 'Rivals beaten'])}
${styles
  .map((s) => {
    const rr = rrAverages.find((r) => r.name === s.profile)!;
    return row([s.profile, s.vsMoneyCore, s.vsMoneyAll, s.vsBalancedAll ?? '-', rr.avg, `${rr.beats}/${field.length - 1}`]);
  })
  .join('\n')}

## Cards: favour test

A Balanced bot that always buys the card (up to 3) against a plain Balanced bot, on the same market. 50% means no effect.
The interval is about ±${margin(50, N)} points at this sample. It measures the bot's simple way of using the card, so a low score
often means a card that asks for support, not a weak card.

${head(['Card', 'Set', 'Cost', 'Win %'])}
${byFav.map((c) => row([c.name, c.set, c.cost, c.favourWinPct])).join('\n')}

## Cards: random markets

3-player mixed tables, ${baseGames} games. Associations only: good players and good markets both inflate these. Fair share is 33.3%.

${head(['Card', 'In markets', 'Buyers per game', 'Copies per buyer', 'Buyer win %'])}
${usage.map((u) => row([u.key, u.markets, u.buyersPerGame, u.copiesPerBuyer, u.buyerWinPct])).join('\n')}

## Strongest pairs

Bought by the same player, at least 30 occurrences.

${head(['Pair', 'n', 'Win %'])}
${combos.map((c) => row([c.pair, c.n, c.winPct])).join('\n')}
`;
  writeFileSync('docs/CLOCKWORK_BALANCE.md', md);
  console.log(`balance report done in ${Math.round((Date.now() - started) / 1000)}s`);
});
