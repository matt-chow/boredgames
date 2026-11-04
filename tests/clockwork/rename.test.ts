/** The Kingdom & Commerce wording: nothing a player reads keeps the old theme, and rooms saved under it read the new one. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DeckState, DeckView } from '../../src/engine/deckbuilder';
import { botMove, PROFILES } from '../../src/games/clockwork/rules/bot';
import { modernise } from '../../src/games/clockwork/rules/legacy';
import { CARDS, RULES, WORKS } from '../../src/games/clockwork/rules/ruleset';
import { logLine } from '../../src/games/deck/ui/text';
import { ALL_SETS, game } from './helpers';

const OLD = /Clockwork|Spark|Prestige|Public Work|Device|Workshop|Foundry|Night Shift|Town Hall|Hazard|\b(steam|gears?|cogs?|brass|boiler|dynamo)\b/i;
const mapping = JSON.parse(readFileSync('data/clockwork-commons/name-mapping.json', 'utf8')) as { cards: Record<string, { old: string; new: string }>; terms: Record<string, string> };
const saved = JSON.parse(readFileSync('tests/clockwork/saved-rooms-v1.json', 'utf8')) as Record<string, DeckState>;

/** Every string a player can read on a definition, skipping keys and other identifiers. */
function words(x: unknown): string[] {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) return x.flatMap(words);
  if (!x || typeof x !== 'object') return [];
  return Object.entries(x).flatMap(([k, v]) => (typeof v === 'string' && !['name', 'text', 'typeLine', 'prompt', 'label'].includes(k) ? [] : words(v)));
}

/** A whole seeded game with every set in, returning all that its players were asked. */
function asked(seed: string): string[] {
  let s = game.setup({ playerCount: 4, seed, config: { market: [], bans: [], sets: ALL_SETS, projects: [] } });
  const seen: string[] = [];
  for (let step = 0; step < 30_000 && !s.over; step++) {
    const [seat] = game.actors(s);
    const view = game.project(s, seat) as DeckView;
    if (view.pending) seen.push(view.pending.prompt, ...(view.pending.options ?? []), view.pending.after ?? '');
    const move = botMove(view, PROFILES[(seat + 1 + seed.length) % PROFILES.length], 0);
    for (const a of move?.actions ?? []) {
      const r = game.apply(s, seat, a);
      if (r.ok) {
        s = r.state;
        break;
      }
    }
  }
  return seen;
}

describe('Kingdom & Commerce wording', () => {
  it('KC-TERM-1: no card, project, label or set still uses an old term', () => {
    expect(RULES.name).toBe('Kingdom & Commerce');
    expect(game.meta.name).toBe('Kingdom & Commerce');
    for (const w of [...words(CARDS), ...words(WORKS), ...words(RULES.labels), ...words(RULES.sets)]) expect(w).not.toMatch(OLD);
  });

  it('KC-TERM-2: no question asked during play uses an old term', () => {
    const seen = ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff'].flatMap(asked);
    expect(seen.length).toBeGreaterThan(50);
    for (const w of seen) expect(w).not.toMatch(OLD);
  }, 120_000);

  it('KC-TERM-5: no text in the rules source uses an old term, including questions bots never reach', () => {
    for (const file of ['cards', 'expansions', 'ruleset']) {
      const source = readFileSync(`src/games/clockwork/rules/${file}.ts`, 'utf8').replace(/^\s*(\/\/|\/?\*).*$/gm, '');
      for (const [, , text] of source.matchAll(/(['"`])((?:(?!\1).)*)\1/g)) expect(text, file).not.toMatch(/Clockwork|Spark|Prestige|Public Work|Device|Workshop|Night Shift|Town Hall|Hazard/);
    }
  });

  it('KC-TERM-3: the name mapping covers every card and project, and matches them', () => {
    const all = [...CARDS, ...WORKS];
    expect(Object.keys(mapping.cards).sort()).toEqual(all.map((c) => c.key).sort());
    for (const c of all) expect(mapping.cards[c.key].new, c.key).toBe(c.name);
  });

  it('KC-TERM-4: rewording is stable, and turns every old card name into its new one', () => {
    for (const { old, new: now } of Object.values(mapping.cards)) {
      expect(modernise(old)).toBe(now);
      expect(modernise(now)).toBe(now);
    }
    for (const old of ['Spark', 'Prestige', 'Public Works', 'Public Work', 'Devices', 'Device', 'Workshop']) expect(modernise(old)).toBe(mapping.terms[old]);
  });

  it.each(Object.keys(saved))('KC-SAVED-1: a room saved under the old wording (%s) now reads the new wording', (name) => {
    const s = saved[name];
    const q = s.pending!;
    const before = JSON.stringify(s);
    const view = game.project(s, q.seat) as DeckView;
    expect(view.pending!.options?.length).toBe(q.options?.length);
    expect(view.pending!.prompt).toBe(modernise(q.prompt));
    for (const w of [view.pending!.prompt, ...(view.pending!.options ?? [])]) expect(w).not.toMatch(OLD);
    // The saved state itself is left as it was: rewording happens on the way out.
    expect(JSON.stringify(s)).toBe(before);
  });

  it('KC-SAVED-2: a log written before the rename shows the current names', () => {
    const name = (k: string) => CARDS.find((c) => c.key === k)?.name ?? k;
    const token = (t: string) => (t === 'spark' ? RULES.labels!.tokens!.spark : t);
    expect(logLine({ kind: 'token', seat: 0, token: 'spark', count: 2 } as never, () => 'Ada', name, token)).toBe('Ada: 2 Influence');
  });
});

describe('Kingdom & Commerce theme', () => {
  it('KC-THEME-2: every rule in theme.css is scoped to the game, so it cannot reach the hub or another game', () => {
    const css = readFileSync('src/games/clockwork/ui/theme.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
    expect(selectors.length).toBeGreaterThan(10);
    for (const s of selectors) expect(s).toMatch(/^(body:has\()?\[data-game-theme='clockwork'\]/);
  });
});
