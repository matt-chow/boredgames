/**
 * Compatibility check, not part of the game: plays seeded games on every older edition and trial and prints a hash of each.
 * It must print the same before and after any change to edition 4's bots (CC-BOT-OLD). Run with --config scripts/bots.config.ts; the hashes go to FP_OUT.
 */
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { createDeckGame, type DeckAction, type DeckState, type DeckView } from '../src/engine/deckbuilder';
import { clockwork as game } from '../src/games/clockwork';
import { botMove, PROFILES } from '../src/games/clockwork/rules/bot';
import { RULES_V2, RULES_V3 } from '../src/games/clockwork/rules/ruleset';

const EDITIONS: [string, typeof game, Record<string, unknown>][] = [
  ['v2', createDeckGame(RULES_V2), {}],
  ['v3', createDeckGame(RULES_V3), {}],
  ...['C0', 'C1', 'F1', 'F2', 'S1', 'S2'].map((edition): [string, typeof game, Record<string, unknown>] => [edition, game, { edition }]),
];

it('prints a hash of seeded bot games on older editions', () => {
  for (const [name, g, extra] of EDITIONS) {
    const hash = createHash('sha256');
    for (let i = 0; i < 6; i++) {
      const players = 2 + (i % 5);
      let s = g.setup({ playerCount: players, seed: `fingerprint-${i}`, config: { market: [], bans: [], projects: [], sets: ['core', 'crown'], ...extra } }) as DeckState;
      const profiles = Array.from({ length: players }, (_, k) => PROFILES[(i + k * 5) % PROFILES.length]);
      for (let step = 0; step < 30_000 && !s.over; step++) {
        const [seat] = g.actors(s);
        const move = botMove(g.project(s, seat) as DeckView, profiles[seat], 0);
        let done = false;
        for (const a of (move?.actions ?? []) as DeckAction[]) {
          const r = g.apply(s, seat, a);
          if (r.ok) {
            s = r.state;
            hash.update(JSON.stringify(a));
            done = true;
            break;
          }
        }
        if (!done) break;
      }
      hash.update(String(s.turn.number));
    }
    appendFileSync(process.env.FP_OUT!, `${name} ${hash.digest('hex').slice(0, 16)}\n`);
  }
}, 300_000);
