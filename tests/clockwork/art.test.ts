import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS, WORKS } from '../../src/games/clockwork/rules/ruleset';
import { artFor, artKeys, artParts, knownPart, sceneOf } from '../../src/games/clockwork/ui/art';

const everything = [...CARDS.map((c) => c.key), ...WORKS.map((w) => w.key)];
const manifest = JSON.parse(readFileSync('data/clockwork-commons/art-manifest.json', 'utf8')) as { entries: { key: string; prompt: string; source: string }[] };
const spec = JSON.parse(readFileSync('data/clockwork-commons/clockwork_commons_original_cardset.json', 'utf8'));

describe('coverage report', () => {
  it('CC-COVER-1: every card and Public Work is defined and has its own named test', () => {
    const report = JSON.parse(readFileSync('data/clockwork-commons/coverage-report.json', 'utf8')) as { entries: { key: string; definedIn: string | null; dedicatedTest: string | null }[] };
    expect(report.entries.map((e) => e.key).sort()).toEqual([...everything].sort());
    for (const e of report.entries) {
      expect(e.definedIn, e.key).toBeTruthy();
      expect(e.dedicatedTest, e.key).toBeTruthy();
    }
  });
});

describe('card art', () => {
  it('CC-ART-1: every card and Public Work has its own scene, with no key left over', () => {
    expect([...artKeys()].sort()).toEqual([...everything].sort());
    expect(new Set(artKeys().map(sceneOf)).size).toBe(everything.length);
  });
  it('CC-ART-2: scenes only use parts that exist, and render as a single SVG', () => {
    for (const key of everything) {
      for (const part of artParts(sceneOf(key)!)) expect(knownPart(part), `${key}: ${part}`).toBe(true);
      expect(artFor(key)).toMatch(/^<svg [^]*<\/svg>$/);
    }
    expect(artFor('not-a-card')).toBeNull();
  });
  it('CC-ART-3: the manifest lists everything, and keeps each supplied art direction word for word', () => {
    expect(manifest.entries.map((e) => e.key).sort()).toEqual([...everything].sort());
    const supplied = new Map<string, string>([...spec.basic_cards, ...spec.market_cards, ...spec.public_works].map((c: { id: string; art_prompt: string }) => [c.id, c.art_prompt]));
    for (const e of manifest.entries) {
      expect(e.prompt, e.key).toBeTruthy();
      if (supplied.has(e.key)) expect(e.prompt).toBe(supplied.get(e.key));
      expect(e.source).toBe(supplied.has(e.key) ? 'supplied' : 'added');
    }
  });
});
