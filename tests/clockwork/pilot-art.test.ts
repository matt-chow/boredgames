import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artFor, artImages, artKeys } from '../../src/games/clockwork/ui/art';
// @ts-expect-error a build script with no type declarations
import { person } from '../../scripts/art/kit.mjs';
// @ts-expect-error a build script with no type declarations
import { PILOT } from '../../scripts/art/pilot.mjs';

const PILOT_KEYS = ['dynamo', 'monument', 'night_watch', 'relay_junction', 'royal_confessor'];
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

describe('ART: the five card pilot', () => {
  it('ART-1: exactly the five pilots exist, each for a real card', () => {
    expect(readdirSync('public/cards').sort()).toEqual(PILOT_KEYS.map((k) => `${k}.svg`));
    expect(Object.keys(PILOT).sort()).toEqual(PILOT_KEYS);
    for (const key of PILOT_KEYS) expect(artKeys(), key).toContain(key);
  });

  it('ART-2: each file is standalone, well formed and within budget', () => {
    for (const key of PILOT_KEYS) {
      const svg = read(key);
      expect(svg, key).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 640 360"/);
      expect(balanced(svg), key).toBe(true);
      expect(svg, key).not.toMatch(/<script|<image|<text|<style|<foreignObject|\son[a-z]+=|href=|https?:\/\/(?!www\.w3\.org\/2000\/svg)|gradient|<filter/i);
      expect(svg.length, key).toBeLessThan(48 * 1024);
    }
  });

  it('ART-3: each pilot is a distinct drawing and uses the bible palette', () => {
    expect(new Set(PILOT_KEYS.map(read)).size).toBe(5);
    for (const key of PILOT_KEYS) expect(read(key), key).toMatch(/#261D23/);
  });

  it('ART-4: a figure has no face, the head is one oval plus hair or a hat', () => {
    const hats = ['bare', 'beret', 'cap', 'black-cap', 'feather', 'coif', 'veil', 'kerchief', 'cowl', 'kettle', 'hood'];
    for (const hat of hats) {
      const head = /<g transform="translate\(0 -118\)">(.*?)<\/g>/.exec(person({ x: 0, y: 0, hat, armL: [[0, 0], [0, 0]], armR: [[0, 0], [0, 0]] }))![1];
      expect(head.match(/<ellipse/g), hat).toHaveLength(1);
    }
  });

  it('ART-5: registered cards show their file lazily, unknown and unregistered cards do not break', () => {
    for (const key of PILOT_KEYS) {
      expect(artImages()[key]).toBe(`/cards/${key}.svg`);
      expect(existsSync(`public${artImages()[key]}`)).toBe(true);
      expect(artFor(key)).toContain(`src="/cards/${key}.svg"`);
      expect(artFor(key)).toContain('loading="lazy"');
    }
    expect(artFor('not-a-card')).toBeNull();
    expect(artFor('cog')).toMatch(/^<svg /);
  });
});
