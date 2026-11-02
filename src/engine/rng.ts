/**
 * Seedable, serializable PRNG (sfc32). The full generator state is a plain
 * tuple so it can live inside persisted game state and replay deterministically.
 */
export type RngState = [number, number, number, number];

/** Derive an RNG state from an arbitrary string seed (cyrb128 hash). */
export function seedRng(seed: string): RngState {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const s: RngState = [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  // Warm up so similar seeds diverge.
  for (let i = 0; i < 15; i++) nextU32(s);
  return s;
}

/** Advance the state in place and return a uint32. */
export function nextU32(s: RngState): number {
  let [a, b, c, d] = s;
  a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) >>> 0;
  s[0] = a >>> 0; s[1] = b; s[2] = c; s[3] = d;
  return t;
}

/** Uniform integer in [0, n). Rejection sampling avoids modulo bias. */
export function randInt(s: RngState, n: number): number {
  if (n <= 0) throw new Error('randInt: n must be positive');
  const limit = Math.floor(0x100000000 / n) * n;
  let x: number;
  do x = nextU32(s);
  while (x >= limit);
  return x % n;
}

/** In-place Fisher–Yates shuffle. */
export function shuffle<T>(s: RngState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
