import { settings } from '../../../client/lib/settings.svelte';
import { audio, mixer, noise, tone } from '../../../client/lib/sound';
import { load, save } from '../../../client/lib/storage';

/**
 * The mine's sounds, all synthesized (nothing to download or stream). The site-wide switch and master volume live in
 * `settings`; these are the mine's own choices, kept on this device.
 */
export interface MinePrefs {
  sfx: boolean;
  sfxVol: number;
  ambience: boolean;
  ambVol: number;
  /** A chime and banner when it becomes your turn. */
  turn: boolean;
  chat: boolean;
  /** Shorter animations. */
  fast: boolean;
}

const KEY = 'mines.prefs';
const DEFAULTS: MinePrefs = { sfx: true, sfxVol: 0.8, ambience: false, ambVol: 0.5, turn: true, chat: false, fast: false };

export const prefs = $state<MinePrefs>({ ...DEFAULTS, ...load<Partial<MinePrefs>>(KEY, {}) });
$effect.root(() => {
  $effect(() => save(KEY, $state.snapshot(prefs)));
});

const on = () => prefs.sfx && !settings.muted;
const v = (g: number) => g * prefs.sfxVol;

export const sounds = {
  draw: (delay = 0) => on() && noise(0.08, { gain: v(0.16), freq: 3400, delay }),
  play: (delay = 0) => on() && (noise(0.06, { gain: v(0.18), freq: 2800, delay }), tone(320, 0.08, { type: 'triangle', gain: v(0.1), delay })),
  rotate: () => on() && noise(0.05, { gain: v(0.12), freq: 4200 }),
  dig: (delay = 0) => {
    if (!on()) return;
    tone(120, 0.16, { type: 'triangle', gain: v(0.3), slide: 0.6, delay });
    noise(0.22, { gain: v(0.2), freq: 700, delay });
    noise(0.12, { gain: v(0.1), freq: 1600, delay: delay + 0.06 });
  },
  breakTool: (delay = 0) => {
    if (!on()) return;
    tone(240, 0.14, { type: 'square', gain: v(0.05), slide: 0.5, delay });
    noise(0.12, { gain: v(0.22), freq: 1900, delay });
  },
  repair: (delay = 0) => {
    if (!on()) return;
    noise(0.03, { gain: v(0.18), freq: 3600, delay });
    tone(880, 0.1, { gain: v(0.12), delay: delay + 0.04 });
    tone(1320, 0.18, { gain: v(0.1), delay: delay + 0.1 });
  },
  caveIn: (delay = 0) => {
    if (!on()) return;
    tone(70, 0.7, { type: 'triangle', gain: v(0.32), slide: 0.5, delay });
    noise(0.75, { gain: v(0.34), freq: 320, delay });
    noise(0.35, { gain: v(0.16), freq: 1100, delay: delay + 0.18 });
  },
  reveal: (delay = 0) => on() && (noise(0.07, { gain: v(0.2), freq: 3600, delay }), noise(0.07, { gain: v(0.16), freq: 3000, delay: delay + 0.08 })),
  gold: (delay = 0) => on() && [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.4, { gain: v(0.12), delay: delay + i * 0.08 })),
  coal: (delay = 0) => on() && tone(196, 0.32, { type: 'triangle', gain: v(0.12), slide: 0.9, delay }),
  turn: () => prefs.turn && !settings.muted && (tone(659, 0.2, { gain: v(0.16) }), tone(988, 0.4, { gain: v(0.14), delay: 0.12 })),
  roundEnd: () => on() && [784, 659, 523, 392].forEach((f, i) => tone(f, 0.45, { type: 'triangle', gain: v(0.12), delay: i * 0.12 })),
  chat: () => prefs.chat && on() && tone(1200, 0.06, { gain: v(0.06) }),
};

// ---- Ambience: a low air bed, a faint resonance and the odd drip. Off by default; starts only after a gesture. ----------
let bed: { src: AudioBufferSourceNode; hum: OscillatorNode; gain: GainNode } | null = null;
let drips = 0;

function startAmbience() {
  const a = audio();
  const out = mixer();
  if (!a || !out || bed) return;
  const len = a.sampleRate * 4;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  // Brown noise: integrated white noise, kept in range.
  let last = 0;
  for (let i = 0; i < len; i++) d[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  const hum = a.createOscillator();
  hum.frequency.value = 55;
  const humGain = a.createGain();
  humGain.gain.value = 0.04;
  const gain = a.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(prefs.ambVol * 1.6, a.currentTime + 2);
  src.connect(lp).connect(gain);
  hum.connect(humGain).connect(gain);
  gain.connect(out);
  src.start();
  hum.start();
  bed = { src, hum, gain };
  const drip = () => {
    if (!bed) return;
    tone(1700 + Math.random() * 600, 0.09, { gain: 0.05 * prefs.ambVol, slide: 0.45 });
    if (Math.random() < 0.3) noise(0.2, { gain: 0.03 * prefs.ambVol, freq: 500 });
    drips = window.setTimeout(drip, 2500 + Math.random() * 6000);
  };
  drips = window.setTimeout(drip, 3000);
}

function stopAmbience() {
  clearTimeout(drips);
  if (!bed) return;
  const b = bed;
  bed = null;
  b.src.stop();
  b.hum.stop();
  b.gain.disconnect();
}

/** Keep the ambience in step with the choices. Call from a component effect; returns the cleanup. */
export function ambience(want: boolean) {
  if (!want) return stopAmbience();
  if (bed) {
    bed.gain.gain.value = prefs.ambVol * 1.6;
    return;
  }
  // Browsers only allow sound after a gesture; the first press anywhere starts it.
  const go = () => prefs.ambience && !settings.muted && startAmbience();
  addEventListener('pointerdown', go, { once: true });
  addEventListener('keydown', go, { once: true });
  go();
}
export { stopAmbience };
