import { describe, expect, it } from 'vitest';
import { fade, landing, layout, offset, openness, ring, span, spring } from '../../src/hub/wheel';

const L = { row: 56, focus: 400, gap: 8 };

describe('the game wheel', () => {
  it('places every game once on the ring, so looping never shows a duplicate', () => {
    for (const n of [3, 8, 33])
      for (const pos of [0, 0.4, 2.5, -7.2, 1000.3]) {
        const ds = Array.from({ length: n }, (_, i) => ring(i - pos, n));
        for (const d of ds) expect(d > -n / 2 - 1e-9 && d <= n / 2 + 1e-9).toBe(true);
        expect(new Set(ds.map((d) => Math.round((d + pos) * 1000))).size).toBe(n);
      }
  });

  it('wraps seamlessly: the far side of the ring is out of sight', () => {
    for (const n of [4, 8, 9]) {
      const l = layout(2000, n, 300, 460, 56);
      const edge = (l.visible - 1) / 2;
      // The wrap point is at n/2, which must sit beyond the fade-out.
      expect(n / 2).toBeGreaterThan(edge + 0.6 - 1e-9);
      expect(fade(n / 2, l.visible)).toBe(0);
    }
  });

  it('opens the centre fully and its neighbours not at all', () => {
    expect(openness(0)).toBe(1);
    expect(openness(1)).toBe(0);
    expect(openness(-0.5)).toBeCloseTo(0.5);
  });

  it('stacks the games without overlap at any position', () => {
    for (let pos = 0; pos <= 1; pos += 0.05) {
      const ys = [-3, -2, -1, 0, 1, 2, 3].map((k) => {
        const d = k - pos;
        const h = L.row + (L.focus - L.row) * span(d);
        return { top: offset(d, L) - h / 2, bottom: offset(d, L) + h / 2 };
      });
      for (let i = 1; i < ys.length; i++) expect(ys[i].top - ys[i - 1].bottom).toBeCloseTo(L.gap);
    }
  });

  it('moves continuously and symmetrically', () => {
    expect(offset(0, L)).toBe(0);
    expect(offset(1, L)).toBeCloseTo((L.focus + L.row) / 2 + L.gap);
    expect(offset(-2.3, L)).toBeCloseTo(-offset(2.3, L));
    expect(Math.abs(offset(1.0001, L) - offset(0.9999, L))).toBeLessThan(0.1);
  });

  it('shows 7, 5 or 3 games by height, and never all of them', () => {
    expect(layout(900, 8, 340, 460, 56).visible).toBe(7);
    expect(layout(640, 8, 340, 460, 56).visible).toBe(5);
    expect(layout(480, 8, 340, 460, 56).visible).toBe(3);
    expect(layout(900, 4, 340, 460, 56).visible).toBe(3);
    const short = layout(300, 8, 340, 460, 56);
    expect(short.visible).toBe(3);
    expect(short.height).toBeGreaterThan(300); // too short: the page scrolls instead of squashing the game
  });

  it('settles in 240 to 380ms with minimal overshoot', () => {
    let [p, v] = [0, 0];
    let over = 0;
    let t = 0;
    while (t < 1 && !(Math.abs(p - 1) < 0.004 && Math.abs(v) < 0.05)) {
      [p, v] = spring(p, v, 1, 1 / 60);
      over = Math.max(over, p - 1);
      t += 1 / 60;
    }
    expect(t).toBeGreaterThan(0.24);
    expect(t).toBeLessThan(0.38);
    expect(over).toBeLessThan(0.02);
  });

  it('lands a flick a little ahead, within reach', () => {
    expect(landing(2.2, 0)).toBe(2);
    expect(landing(2.2, 4)).toBe(3);
    expect(landing(2.2, -60)).toBe(-1);
  });
});
