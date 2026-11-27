/**
 * Circuit geometry: a closed Catmull-Rom spline through a circuit's control points, cut into spaces of equal arc
 * length. Pure math with no runtime imports. The rules never read positions; the board and the validation tests do.
 */
export type Pt = [number, number];

export interface SpaceGeo {
  /** Centre of the space on the racing line. */
  x: number;
  y: number;
  /** Heading in radians (direction of travel). */
  a: number;
}

export interface TrackGeo {
  /** Dense polyline of the centreline, closed (last point joins the first). */
  line: Pt[];
  /** Arc length of the whole lap. */
  length: number;
  spaces: SpaceGeo[];
  /** Arc position of each control point, so data can refer to "the bend at control point k". */
  cpAt: number[];
}

/** Lane spacing in board units. A space is drawn about 2.2 lanes wide. */
export const LANE_W = 15;
const STEPS = 24;

function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  // Centripetal parameterisation avoids cusps and self-loops on uneven point spacing.
  const d = (a: Pt, b: Pt) => Math.max(1e-4, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5);
  const t0 = 0, t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const lerp = (a: Pt, b: Pt, ta: number, tb: number): Pt => {
    const w = (u - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

export function buildTrack(points: Pt[], spaces: number): TrackGeo {
  const n = points.length;
  const line: Pt[] = [];
  const cpIndex: number[] = [];
  for (let i = 0; i < n; i++) {
    cpIndex.push(line.length);
    const p = (k: number) => points[(k + n) % n];
    for (let s = 0; s < STEPS; s++) line.push(catmull(p(i - 1), p(i), p(i + 1), p(i + 2), s / STEPS));
  }
  const cum = [0];
  for (let i = 1; i <= line.length; i++) {
    const a = line[i - 1], b = line[i % line.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[line.length];
  const at = (s: number): SpaceGeo => {
    s = ((s % length) + length) % length;
    let lo = 0, hi = line.length;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = line[lo], b = line[(lo + 1) % line.length];
    const w = (s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
    return { x: a[0] + (b[0] - a[0]) * w, y: a[1] + (b[1] - a[1]) * w, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  const step = length / spaces;
  return {
    line,
    length,
    spaces: Array.from({ length: spaces }, (_, i) => at((i + 0.5) * step)),
    cpAt: cpIndex.map((k) => cum[k]),
  };
}

/** The space nearest to a control point's position along the lap. */
export function spaceAtCp(g: TrackGeo, cp: number): number {
  return Math.round(g.cpAt[cp] / (g.length / g.spaces.length) - 0.5 + g.spaces.length) % g.spaces.length;
}

/** Where lane `lane` of `count` lanes sits in space `sp`. Lane 0 is the racing line on the inside of the next bend. */
export function lanePos(sp: SpaceGeo, lane: number, count: number): Pt {
  const off = count === 1 ? 0 : (lane === 0 ? -0.5 : 0.5) * LANE_W * 1.1;
  return [sp.x - Math.sin(sp.a) * off, sp.y + Math.cos(sp.a) * off];
}

/** Signed heading change per space, smoothed over a window: the board's idea of "how much it bends here". */
export function bendiness(g: TrackGeo, window = 2): number[] {
  const n = g.spaces.length;
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  return g.spaces.map((_, i) => wrap(g.spaces[(i + window) % n].a - g.spaces[(i - window + n) % n].a));
}

/** Point a distance `off` to the side of the centreline at arc fraction `t` of the lap. Used to place scenery. */
export function besideTrack(g: TrackGeo, t: number, off: number): Pt {
  const n = g.spaces.length;
  const f = (((t % 1) + 1) % 1) * n;
  const sp = g.spaces[Math.floor(f) % n];
  return [sp.x - Math.sin(sp.a) * off, sp.y + Math.cos(sp.a) * off];
}

/** SVG path data for the closed centreline (or any closed polyline). */
export function pathD(line: Pt[]): string {
  return 'M' + line.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';
}

/** Segments of the polyline that properly cross each other (excluding neighbours). Empty for a valid circuit. */
export function selfCrossings(line: Pt[]): [number, number][] {
  const n = line.length;
  const out: [number, number][] = [];
  const cross = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  };
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (cross(line[i], line[(i + 1) % n], line[j], line[(j + 1) % n])) out.push([i, j]);
    }
  return out;
}
