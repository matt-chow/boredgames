import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARDS, WORKS } from '../../src/games/clockwork/rules/ruleset';
import { artFor, artImages } from '../../src/games/clockwork/ui/art';
// @ts-expect-error a build script with no type declarations
import { person } from '../../scripts/art/kit.mjs';
// @ts-expect-error a build script with no type declarations
import { PILOT } from '../../scripts/art/pilot.mjs';

const PILOT_KEYS = ['dynamo', 'monument', 'night_watch', 'relay_junction', 'royal_confessor'];
const CATALOG = [...CARDS.map((c) => c.key), ...WORKS.map((w) => w.key)].sort();
const read = (key: string) => readFileSync(`public/cards/${key}.svg`, 'utf8');

/** A small well-formedness check: every tag closes in order. */
function balanced(xml: string) {
  const open: string[] = [];
  for (const [, close, name, self] of xml.matchAll(/<(\/?)([a-zA-Z]+)(?:\s[^<>]*?)?(\/?)>/g)) {
    if (self) continue;
    if (!close) open.push(name);
    else if (open.pop() !== name) return false;
  }
  return open.length === 0;
}

describe('ART: the card illustrations', () => {
  it('ART-1: exactly the catalogue has files, and the pilots are still the approved five', () => {
    expect(readdirSync('public/cards').sort()).toEqual(CATALOG.map((k) => `${k}.svg`).sort());
    expect(Object.keys(PILOT).sort()).toEqual(PILOT_KEYS);
  });

  it('ART-2: each file is standalone, well formed and within budget', () => {
    let total = 0;
    for (const key of CATALOG) {
      const svg = read(key);
      total += svg.length;
      expect(svg, key).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 640 360"/);
      expect(balanced(svg), key).toBe(true);
      expect(svg, key).not.toMatch(/<script|<image|<text|<style|<foreignObject|\son[a-z]+=|href=|https?:\/\/(?!www\.w3\.org\/2000\/svg)|gradient|<filter/i);
      expect(svg.length, key).toBeLessThan(48 * 1024);
    }
    expect(total).toBeLessThan(1.5 * 1024 * 1024);
  });

  it('ART-3: every card is its own drawing, in the bible palette with no empty leftovers', () => {
    const hashes = CATALOG.map((key) => createHash('sha256').update(read(key).replace(/<title>.*?<\/title>/, '')).digest('hex'));
    expect(new Set(hashes).size).toBe(CATALOG.length);
    for (const key of CATALOG) {
      expect(read(key), key).toMatch(/#261D23/);
      expect(read(key), key).not.toMatch(/NaN|undefined/);
    }
  });

  it('ART-4: a figure has no face, the head is one oval plus hair or a hat', () => {
    const hats = ['bare', 'beret', 'cap', 'black-cap', 'feather', 'coif', 'veil', 'kerchief', 'cowl', 'kettle', 'hood'];
    for (const hat of hats) {
      const head = /<g transform="translate\(0 -118\)">(.*?)<\/g>/.exec(person({ x: 0, y: 0, hat, armL: [[0, 0], [0, 0]], armR: [[0, 0], [0, 0]] }))![1];
      expect(head.match(/<ellipse/g), hat).toHaveLength(1);
    }
  });

  it('ART-5: every card shows its file lazily, and an unknown key does not break', () => {
    for (const key of CATALOG) {
      expect(artImages()[key]).toBe(`/cards/${key}.svg`);
      expect(existsSync(`public${artImages()[key]}`)).toBe(true);
      expect(artFor(key)).toContain(`src="/cards/${key}.svg"`);
      expect(artFor(key)).toContain('loading="lazy"');
    }
    expect(artFor('not-a-card')).toBeNull();
  });
});
