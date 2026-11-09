import { settings } from './settings.svelte';

/**
 * Tiny synthesized sound set (no audio files to download).
 * The AudioContext is created lazily on the first user gesture.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function audio(): AudioContext | null {
  if (settings.muted || typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  master!.gain.value = settings.volume * 0.5;
  return ctx;
}

export function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slide?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (opts.delay ?? 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(freq * opts.slide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.3, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function noise(dur: number, opts: { gain?: number; delay?: number; freq?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (opts.delay ?? 0);
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = opts.freq ?? 2400;
  f.Q.value = 0.8;
  const g = a.createGain();
  g.gain.value = opts.gain ?? 0.25;
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

/** The gain node every sound ends in, so a game can add its own long-running sources (ambience). */
export const mixer = () => (audio() ? master : null);

export const sfx = {
  card: () => noise(0.09, { gain: 0.22, freq: 3200 }),
  plant: () => {
    tone(150, 0.12, { type: 'triangle', gain: 0.35, slide: 0.6 });
    noise(0.05, { gain: 0.12, freq: 900 });
  },
  flip: () => {
    noise(0.07, { gain: 0.2, freq: 3600 });
    noise(0.07, { gain: 0.16, freq: 3000, delay: 0.08 });
  },
  coin: () => {
    tone(1568, 0.18, { gain: 0.16 });
    tone(2093, 0.26, { gain: 0.14, delay: 0.07 });
  },
  offer: () => tone(660, 0.14, { type: 'triangle', gain: 0.18 }),
  trade: () => {
    tone(523, 0.16, { type: 'triangle', gain: 0.2 });
    tone(784, 0.22, { type: 'triangle', gain: 0.18, delay: 0.09 });
  },
  reject: () => tone(330, 0.16, { type: 'triangle', gain: 0.16, slide: 0.8 }),
  turn: () => tone(880, 0.35, { gain: 0.12 }),
  yourTurn: () => {
    tone(659, 0.2, { gain: 0.16 });
    tone(988, 0.4, { gain: 0.14, delay: 0.12 });
  },
  error: () => tone(180, 0.18, { type: 'square', gain: 0.06, slide: 0.85 }),
  end: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.14, delay: i * 0.11 })),
};
