/**
 * The home page's game wheel, as plain numbers. Everything the wheel draws comes from one continuous position `pos`:
 * game i sits at signed distance `ring(i - pos, n)`, and its height, place, art and light all follow from that distance.
 */

/** Signed distance on a ring of n, in (-n/2, n/2]: each game appears exactly once, so no entry is ever duplicated. */
export function ring(d: number, n: number): number {
  const m = (((d % n) + n) % n);
  return m > n / 2 ? m - n : m;
}

export const mod = (i: number, n: number) => ((i % n) + n) % n;

const smooth = (x: number) => x * x * (3 - 2 * x);

/** How open a game is: 1 in the centre, 0 one place away, eased so the art unfolds rather than slides. */
export const openness = (d: number) => smooth(Math.max(0, 1 - Math.abs(d)));

/** How much of the open height a game's plate takes. Linear, so two neighbours always share exactly one open height. */
export const span = (d: number) => Math.max(0, 1 - Math.abs(d));

/**
 * Centre of the game at distance d, in px from the wheel's centre. Each plate is `row + (focus - row) * span(d)` tall
 * and the plates are stacked, so the centre grows while its neighbour shrinks and nothing ever overlaps: one step per
 * place, a big one through the centre and a row's height beyond it.
 */
export function offset(d: number, l: Pick<WheelLayout, 'row' | 'focus' | 'gap'>): number {
  const a = Math.abs(d);
  const step = (l.focus + l.row) / 2 + l.gap;
  return Math.sign(d) * (a <= 1 ? a * step : step + (a - 1) * (l.row + l.gap));
}

export interface WheelLayout {
  /** Games in view: 3, 5 or 7. */
  visible: number;
  /** Height of the open game. */
  focus: number;
  /** Height of a shut game. */
  row: number;
  gap: number;
  /** Height the wheel needs; more than it was given when the screen is too short, and then the page scrolls. */
  height: number;
}

/**
 * The most games that fit around an open game of at least `minFocus` (its content, or the design minimum).
 * Never as many as there are games: one place stays out of sight, where a game wraps from bottom to top.
 */
export function layout(height: number, n: number, minFocus: number, maxFocus: number, row: number, gap = 8): WheelLayout {
  const most = n % 2 ? n - 2 : n - 1;
  for (const visible of [7, 5, 3]) {
    if (visible > Math.max(1, most)) continue;
    const focus = height - (visible - 1) * (row + gap);
    if (focus >= minFocus) return { visible, focus: Math.min(focus, maxFocus), row, gap, height };
  }
  const visible = Math.max(1, Math.min(3, most));
  return { visible, focus: minFocus, row, gap, height: minFocus + (visible - 1) * (row + gap) };
}

/** Opacity of a game at distance d when `visible` are shown: full at the centre and neighbours, gone past the edge. */
export function fade(d: number, visible: number): number {
  const a = Math.abs(d);
  const edge = (visible - 1) / 2;
  if (a <= 1) return 1;
  if (a <= edge) return 1 - (a - 1) * 0.16;
  return Math.max(0, (1 - (edge - 1) * 0.16) * (1 - (a - edge) / 0.6));
}

/**
 * One step of the settling spring. ω 20 and ζ 0.86 land within a pixel in about 300ms with under 1% overshoot.
 * Semi-implicit Euler in 4ms substeps stays stable at any frame rate.
 */
export function spring(pos: number, vel: number, target: number, dt: number): [number, number] {
  const w = 20;
  const z = 0.86;
  for (let t = dt; t > 0; t -= 0.004) {
    const h = Math.min(t, 0.004);
    vel += (-w * w * (pos - target) - 2 * z * w * vel) * h;
    pos += vel * h;
  }
  return [pos, vel];
}

/** Where a flick lands: a little past where it was let go, never more than three games away. */
export function landing(pos: number, vel: number): number {
  const at = Math.round(pos);
  const thrown = Math.round(pos + vel * 0.14);
  return Math.max(at - 3, Math.min(at + 3, thrown));
}
