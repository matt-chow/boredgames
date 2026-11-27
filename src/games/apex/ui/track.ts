/** Board-side geometry: arc-length lookups on a circuit's centreline, for paths and motion. Display only. */
import { resolveCircuit, type Circuit } from '../rules/content/circuits';

export interface Pose {
  x: number;
  y: number;
  a: number;
}

export interface BoardTrack {
  circ: Circuit;
  step: number;
  length: number;
  /** Point and heading at arc position `s` (any real; wraps). */
  at(s: number): Pose;
  /** Arc position of the centre of progress `pos`, unwrapped so later progress is further along. */
  arc(pos: number): number;
  /** Smooth path data from progress `from` to `to` along the centreline. */
  path(from: number, to: number, off?: number): string;
}

const cache = new Map<string, BoardTrack>();

export function boardTrack(id: string): BoardTrack {
  const hit = cache.get(id);
  if (hit) return hit;
  const circ = resolveCircuit(id);
  const line = circ.geo.line;
  const cum = [0];
  for (let i = 1; i <= line.length; i++) {
    const a = line[i - 1], b = line[i % line.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[line.length];
  const step = length / circ.geo.spaces.length;
  const at = (s: number): Pose => {
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
  const arc = (pos: number) => (pos + 0.5) * step;
  const path = (from: number, to: number, off = 0) => {
    const a0 = arc(from), a1 = arc(to);
    const n = Math.max(2, Math.ceil(((a1 - a0) / step) * 6));
    let d = '';
    for (let i = 0; i <= n; i++) {
      const p = at(a0 + ((a1 - a0) * i) / n);
      d += `${i ? 'L' : 'M'}${(p.x - Math.sin(p.a) * off).toFixed(1)},${(p.y + Math.cos(p.a) * off).toFixed(1)}`;
    }
    return d;
  };
  const t: BoardTrack = { circ, step, length, at, arc, path };
  cache.set(id, t);
  return t;
}
