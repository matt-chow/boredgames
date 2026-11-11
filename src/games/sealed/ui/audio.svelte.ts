import { settings } from '../../../client/lib/settings.svelte';
import { audio, mixer, noise, tone } from '../../../client/lib/sound';
import { load, save } from '../../../client/lib/storage';

/** The court's sounds, all synthesized. The site-wide switch and master volume live in `settings`; these stay on this device. */
export interface SealPrefs {
  sfx: boolean;
  sfxVol: number;
  ambience: boolean;
  ambVol: number;
}

const KEY = 'sealed.prefs';
export const prefs = $state<SealPrefs>({ sfx: true, sfxVol: 0.7, ambience: false, ambVol: 0.4, ...load<Partial<SealPrefs>>(KEY, {}) });
$effect.root(() => {
  $effect(() => save(KEY, $state.snapshot(prefs)));
});

const on = () => prefs.sfx && !settings.muted;
const v = (g: number) => g * prefs.sfxVol;

export const sounds = {
  draw: (delay = 0) => on() && noise(0.07, { gain: v(0.12), freq: 3800, delay }),
  play: (delay = 0) => on() && (noise(0.05, { gain: v(0.16), freq: 2600, delay }), tone(300, 0.07, { type: 'triangle', gain: v(0.08), delay })),
  /** Wax pressed: a soft low thud. */
  seal: (delay = 0) => on() && (tone(150, 0.18, { type: 'triangle', gain: v(0.18), slide: 0.7, delay }), noise(0.05, { gain: v(0.08), freq: 900, delay })),
  out: (delay = 0) => on() && tone(220, 0.5, { type: 'triangle', gain: v(0.12), slide: 0.55, delay }),
  favor: (delay = 0) => on() && [659, 880, 1109].forEach((f, i) => tone(f, 0.45, { gain: v(0.09), delay: delay + i * 0.09 })),
  turn: () => on() && (tone(587, 0.18, { gain: v(0.12) }), tone(880, 0.35, { gain: v(0.1), delay: 0.11 })),
  chat: () => on() && tone(1250, 0.05, { gain: v(0.05) }),
  warn: () => on() && tone(440, 0.12, { type: 'square', gain: v(0.03) }),
};

// ---- Ambience: a quiet hall and a fire, now and then a page turned. Off by default; starts after a gesture. -------------
let bed: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let timer = 0;

function start() {
  const a = audio();
  const out = mixer();
  if (!a || !out || bed) return;
  const len = a.sampleRate * 4;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) d[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  const gain = a.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(prefs.ambVol * 1.2, a.currentTime + 2);
  src.connect(lp).connect(gain).connect(out);
  src.start();
  bed = { src, gain };
  const crackle = () => {
    if (!bed) return;
    noise(0.03, { gain: 0.04 * prefs.ambVol, freq: 2200 + Math.random() * 1500 });
    if (Math.random() < 0.08) noise(0.35, { gain: 0.025 * prefs.ambVol, freq: 4200 });
    timer = window.setTimeout(crackle, 300 + Math.random() * 2200);
  };
  timer = window.setTimeout(crackle, 1500);
}

export function stopAmbience() {
  clearTimeout(timer);
  if (!bed) return;
  bed.src.stop();
  bed.gain.disconnect();
  bed = null;
}

/** Keep the ambience in step with the choices; call from a component effect. */
export function ambience(want: boolean) {
  if (!want) return stopAmbience();
  if (bed) {
    bed.gain.gain.value = prefs.ambVol * 1.2;
    return;
  }
  const go = () => prefs.ambience && !settings.muted && start();
  addEventListener('pointerdown', go, { once: true });
  addEventListener('keydown', go, { once: true });
  go();
}
