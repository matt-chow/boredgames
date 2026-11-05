import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS, WORKS } from '../../src/games/clockwork/rules/ruleset';
import { artFor, artKeys, artParts, knownPart, sceneOf } from '../../src/games/clockwork/ui/art';

const everything = [...CARDS.map((c) => c.key), ...WORKS.map((w) => w.key)];
const manifest = JSON.parse(readFileSync('data/clockwork-commons/art-manifest.json', 'utf8')) as { entries: { key: string; name: string; brief: string; status: string; asset: string | null }[] };

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
      expect(artFor(key)).toMatch(/^(<svg [^]*<\/svg>|<img [^<>]*\/>)$/);
    }
    expect(artFor('not-a-card')).toBeNull();
  });
  it('CC-ART-3: the manifest lists everything, under its current name, and only claims the art that exists', () => {
    expect(manifest.entries.map((e) => e.key).sort()).toEqual([...everything].sort());
    const names = new Map([...CARDS, ...WORKS].map((c) => [c.key, c.name]));
    for (const e of manifest.entries) {
      expect(e.name, e.key).toBe(names.get(e.key));
      expect(e.brief, e.key).toBeTruthy();
      expect(e.status === 'svg' ? e.asset : existsSync(`public${e.asset}`), e.key).toBe(e.status === 'svg' ? null : true);
    }
  });
  it('KC-ART-1: scenes hold no machinery left over from the old theme', () => {
    const scenes = artKeys().map((k) => sceneOf(k)!).join('|');
    for (const part of ['gear', 'cog', 'boiler', 'pipe', 'piston', 'dynamo', 'gauge']) expect(scenes).not.toMatch(new RegExp(`(^|\\|| )${part}( |$)`));
  });
});
