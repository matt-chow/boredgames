/**
 * Kingdom & Commerce is Clockwork Commons with new names and art. These tests hold the game itself still: the baseline and
 * the saved rooms were written by the code as it stood before the rename (see git history), and must never be regenerated
 * for a presentation change. KC_WRITE_BASELINE=1 rewrites them, for a deliberate rules change only.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DeckState, DeckView } from '../../src/engine/deckbuilder';
import { botMove, PROFILES } from '../../src/games/clockwork/rules/bot';
import { CARDS, RULES, WORKS } from '../../src/games/clockwork/rules/ruleset';
import { ALL_SETS, assertConserved, game, Table } from './helpers';

const BASELINE = 'data/clockwork-commons/mechanics-baseline.json';
const SAVED = 'tests/clockwork/saved-rooms-v1.json';
const WRITE = !!process.env.KC_WRITE_BASELINE;
const PLAYER_COUNTS = [2, 3, 4, 5, 6];

/** Words on the card, which may change. Everything else is the game, which may not. */
const WORDING = new Set(['name', 'text', 'typeLine', 'prompt', 'label']);

function mechanics<T>(x: T): T {
  if (Array.isArray(x)) return x.map(mechanics) as T;
  if (!x || typeof x !== 'object') return x;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x)) {
    if (WORDING.has(k)) continue;
    // A trigger's `optional` is its question: what matters is that it asks.
    out[k] = k === 'optional' ? !!v : mechanics(v);
  }
  return out as T;
}

function catalogue() {
  const perPlayers = (f: (n: number) => unknown) => Object.fromEntries(PLAYER_COUNTS.map((n) => [n, f(n)]));
  return {
    rulesetId: RULES.id,
    players: [RULES.minPlayers, RULES.maxPlayers],
    handSize: RULES.handSize,
    marketSize: RULES.marketSize,
    startingDeck: RULES.startingDeck,
    basicPiles: perPlayers((n) => RULES.basicPiles(n)),
    marketPile: perPlayers((n) => RULES.marketPileSize('any', n)),
    penaltyPile: Object.fromEntries(CARDS.filter((c) => !c.basic).map((c) => [c.key, RULES.extraPiles!([c.key], 4)])),
    endPiles: RULES.endPiles,
    emptyPilesToEnd: perPlayers((n) => RULES.emptyPilesToEnd!(n)),
    emptyMarketPilesOnly: RULES.emptyMarketPilesOnly,
    projectCount: RULES.projectCount,
    projectsToEnd: perPlayers((n) => RULES.projectsToEnd!(n)),
    tokenCaps: RULES.tokenCaps,
    convert: RULES.convert,
    lateTreasures: RULES.lateTreasures,
    sets: RULES.sets!.map((s) => s.key),
    defaultSets: RULES.defaultSets,
    handlers: Object.keys(RULES.handlers ?? {}),
    cards: mechanics(CARDS),
    projects: mechanics(WORKS),
    labelKeys: Object.keys(RULES.labels!.tokens),
  };
}

/** A whole seeded bot game, as a fingerprint of everything that happened. */
function fingerprint(players: number, seed: string) {
  let s = game.setup({ playerCount: players, seed, config: { market: [], bans: [], sets: ALL_SETS, projects: [] } });
  const profiles = Array.from({ length: players }, (_, i) => PROFILES[(i * 3 + seed.length) % PROFILES.length]);
  let steps = 0;
  for (; steps < 30_000 && !s.over; steps++) {
    const [seat] = game.actors(s);
    const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
    let done = false;
    for (const a of move?.actions ?? []) {
      const r = game.apply(s, seat, a);
      if (!r.ok) continue;
      s = JSON.parse(JSON.stringify(r.state));
      done = true;
      break;
    }
    if (!done) throw new Error(`${seed}: seat ${seat} has no legal move`);
  }
  const view = game.project(s, null) as DeckView;
  return {
    seed,
    players,
    steps,
    market: s.market,
    projects: s.projects,
    final: view.final!.map((f) => ({ seat: f.seat, total: f.total, turns: f.turns })),
    log: createHash('sha256').update(JSON.stringify(s.log)).digest('hex'),
  };
}

const GAMES = PLAYER_COUNTS.flatMap((n) => [`golden-${n}-a`, `golden-${n}-b`].map((seed) => [n, seed] as const));
const playedGames = () => GAMES.map(([n, seed]) => fingerprint(n, seed));

/** Rooms caught mid-decision, with the old wording stored inside them: prompts, options, pending effects and delays. */
function savedRooms(): Record<string, DeckState> {
  const rust = new Table(['capacitor_bank', 'rust', 'scrap'], { spark: 2 });
  rust.s.turn.actions = 3;
  rust.play('capacitor_bank').play('rust');
  const foreman = new Table(['foreman', 'scrap', 'scrap', 'notebook'], { spark: 1 });
  foreman.play('foreman');
  const attack = new Table(['corrosion_crew'], { spark: 0, others: [['scrap', 'night_watch', 'scrap', 'scrap', 'scrap']] });
  attack.setSpark(1, 1 - attack.me);
  attack.play('corrosion_crew');
  return { rust: rust.s, foreman: foreman.s, attack: attack.s };
}

if (WRITE) {
  writeFileSync(BASELINE, `${JSON.stringify({ note: 'Written before the Kingdom & Commerce rename. See tests/clockwork/compat.test.ts.', catalogue: catalogue(), games: playedGames() }, null, 1)}\n`);
  writeFileSync(SAVED, `${JSON.stringify(savedRooms())}\n`);
}

describe('Kingdom & Commerce keeps the game it renamed', () => {
  const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
  const saved: Record<string, DeckState> = existsSync(SAVED) ? JSON.parse(readFileSync(SAVED, 'utf8')) : {};

  it('KC-COMPAT-1: costs, effects, piles, caps, scoring, sets and end conditions are unchanged', () => {
    expect(JSON.parse(JSON.stringify(catalogue()))).toEqual(base.catalogue);
  });

  it('KC-COMPAT-2: every seeded game at every player count plays out exactly as before', () => {
    expect(JSON.parse(JSON.stringify(playedGames()))).toEqual(base.games);
  });

  it('KC-COMPAT-3: every internal key is still the one saved rooms refer to', () => {
    expect(game.meta.id).toBe('clockwork');
    expect(RULES.id).toBe('clockwork');
    expect(CARDS.map((c) => c.key)).toEqual(base.catalogue.cards.map((c: { key: string }) => c.key));
    expect(WORKS.map((w) => w.key)).toEqual(base.catalogue.projects.map((w: { key: string }) => w.key));
    expect(game.meta.stateVersion).toBe(1);
  });

  it.each(['rust', 'foreman', 'attack'])('KC-COMPAT-4: a room saved mid-decision (%s) opens and plays to the end', (name) => {
    let s = saved[name];
    expect(s.pending).toBeTruthy();
    for (let seat = 0; seat < s.n; seat++) expect(() => game.project(s, seat)).not.toThrow();
    const profiles = Array.from({ length: s.n }, () => PROFILES[0]);
    for (let steps = 0; steps < 30_000 && !s.over; steps++) {
      const [seat] = game.actors(s);
      const move = botMove(game.project(s, seat) as DeckView, profiles[seat], 0);
      let done = false;
      for (const a of move?.actions ?? []) {
        const r = game.apply(s, seat, a);
        if (!r.ok) continue;
        s = JSON.parse(JSON.stringify(r.state));
        done = true;
        break;
      }
      expect(done, `seat ${seat} stuck`).toBe(true);
    }
    expect(s.over).toBe(true);
    assertConserved(s);
  });
});
