import { describe, expect, it } from 'vitest';
import { CIRCUITS, resolveCircuit } from '../../src/games/apex/rules/content/circuits';
import { bendiness, besideTrack, LANE_W, selfCrossings } from '../../src/games/apex/rules/geometry';

const TABLE: Record<string, { level: string; length: number; laps: number; limits: number[] }> = {
  ashford: { level: 'beginner', length: 60, laps: 3, limits: [5, 3, 4, 6] },
  bellavista: { level: 'intermediate', length: 64, laps: 2, limits: [6, 4, 2, 5, 3, 4, 7] },
  bellerive: { level: 'advanced', length: 72, laps: 2, limits: [3, 4, 2, 5, 3, 4, 2, 3, 5, 4, 3, 6] },
  redwood: { level: 'intermediate', length: 66, laps: 2, limits: [5, 3, 6, 4, 2, 5, 4, 6] },
  mizukawa: { level: 'advanced', length: 70, laps: 2, limits: [4, 6, 3, 5, 2, 4, 3, 5, 6, 3, 4] },
  puerto: { level: 'advanced', length: 74, laps: 2, limits: [4, 3, 5, 2, 4, 3, 6, 3, 2, 4, 5, 3, 4] },
  noordzee: { level: 'intermediate', length: 66, laps: 2, limits: [5, 3, 4, 6, 3, 5, 2, 4, 6] },
  kalahari: { level: 'advanced', length: 70, laps: 2, limits: [4, 6, 3, 5, 2, 4, 6, 3, 5, 4] },
};

/** Unrestricted bends: peaks of heading change (over ±2 spaces) of 0.3 rad or more, over 1 space from any corner. */
function freeBends(id: string): number {
  const c = resolveCircuit(id);
  const b = bendiness(c.geo).map(Math.abs);
  const n = b.length;
  const near = (i: number) => c.corners.some((k) => Math.min((i - k.at + n) % n, (k.at - i + n) % n) <= 1);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (b[i] < 0.3 || b[i] < b[(i + n - 1) % n] || b[i] < b[(i + 1) % n] || near(i)) continue;
    count++;
  }
  return count;
}

describe('circuits', () => {
  it('there are eight with distinct ids and names', () => {
    expect(CIRCUITS).toHaveLength(8);
    expect(new Set(CIRCUITS.map((c) => c.id)).size).toBe(8);
    expect(new Set(CIRCUITS.map((c) => c.name)).size).toBe(8);
  });

  for (const d of CIRCUITS) {
    describe(d.name, () => {
      const c = resolveCircuit(d.id);
      const g = c.geo;
      const n = d.length;

      it('AX-TRK-1 matches the content table', () => {
        const t = TABLE[d.id];
        expect(d.level).toBe(t.level);
        expect(d.length).toBe(t.length);
        expect(d.laps).toBe(t.laps);
        expect(c.corners.map((k) => k.limit)).toEqual(t.limits);
        expect(g.spaces).toHaveLength(n);
      });

      it('AX-TRK-2 the spline never crosses itself and stays on the board', () => {
        expect(selfCrossings(g.line)).toEqual([]);
        for (const [x, y] of g.line) {
          expect(x).toBeGreaterThan(60);
          expect(x).toBeLessThan(1540);
          expect(y).toBeGreaterThan(60);
          expect(y).toBeLessThan(940);
        }
      });

      it('AX-TRK-3 spaces more than 3 apart are at least two lane widths away', () => {
        for (let i = 0; i < n; i++)
          for (let j = i + 4; j < n; j++) {
            if (n - j + i < 4) continue;
            const a = g.spaces[i], b = g.spaces[j];
            expect(Math.hypot(a.x - b.x, a.y - b.y), `${i}-${j}`).toBeGreaterThanOrEqual(4 * LANE_W);
          }
      });

      it('AX-TRK-4 corners are in travel order, 2+ apart, off the grid and the first space', () => {
        const at = c.corners.map((k) => k.at);
        for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(2);
        expect(n - at[at.length - 1] + at[0]).toBeGreaterThanOrEqual(2);
        for (const a of at) expect(a >= 1 && a < n - 4).toBe(true);
        for (const k of c.corners) expect(k.limit >= 2 && k.limit <= 7).toBe(true);
      });

      it('AX-TRK-5 narrow runs (tunnels) are 1–4 spaces and the grid is wide', () => {
        for (const [a, b] of d.tunnels) {
          const len = c.tunnel.filter(Boolean).length;
          expect(len, `${a}-${b}`).toBeGreaterThanOrEqual(1);
          expect(len).toBeLessThanOrEqual(4 * d.tunnels.length);
        }
        // Eight cars start two abreast on the last four spaces before the line.
        for (let i = n - 4; i < n; i++) {
          expect(c.tunnel[i]).toBe(false);
          expect(c.pass[i]).toBe(null);
        }
      });

      it('AX-TRK-6 overlays and sectors are in range and well formed', () => {
        expect(c.sector[0]).toBe(0);
        expect(c.sector[n - 1]).toBe(2);
        for (let i = 1; i < n; i++) expect(c.sector[i] - c.sector[i - 1]).toBeGreaterThanOrEqual(0);
        expect(new Set(c.sector).size).toBe(3);
        for (const r of [...d.tunnels, ...d.gravel]) for (const cp of r) expect(cp).toBeLessThan(d.points.length);
        for (const p of d.passes) expect(p.cap).toBeGreaterThanOrEqual(7);
      });

      it('AX-TRK-7 has at least three unrestricted bends', () => {
        expect(freeBends(d.id)).toBeGreaterThanOrEqual(3);
      });

      it('AX-TRK-8 scenery stays on the board and off the tarmac', () => {
        for (const [kind, t, side, off] of d.scenery) {
          if (kind === 'bridge') continue;
          const [x, y] = besideTrack(g, t, side * off);
          expect(x > 0 && x < 1600 && y > 0 && y < 1000, `${kind}@${t}`).toBe(true);
          const near = Math.min(...g.line.map((p) => Math.hypot(p[0] - x, p[1] - y)));
          expect(near, `${kind}@${t}`).toBeGreaterThanOrEqual(40);
        }
      });
    });
  }
});
