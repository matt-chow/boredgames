import { settings } from '../../../client/lib/settings.svelte';
import { noise, tone } from '../../../client/lib/sound';
import { load, save } from '../../../client/lib/storage';

/** Apex's small tactile sounds, synthesized and off until a driver turns them on. Kept on this device. */
export interface ApexPrefs {
  sfx: boolean;
  sfxVol: number;
  /** Skip the grid introduction and the podium flourish. */
  skipIntro: boolean;
}

const KEY = 'apex.prefs';
export const prefs = $state<ApexPrefs>({ sfx: false, sfxVol: 0.6, skipIntro: false, ...load<Partial<ApexPrefs>>(KEY, {}) });
$effect.root(() => {
  $effect(() => save(KEY, $state.snapshot(prefs)));
});

const on = () => prefs.sfx && !settings.muted;
const v = (g: number) => g * prefs.sfxVol;

export const sounds = {
  card: () => on() && noise(0.035, { gain: v(0.08), freq: 2600 }),
  shift: () => on() && (noise(0.03, { gain: v(0.12), freq: 900 }), tone(140, 0.06, { type: 'square', gain: v(0.03), delay: 0.02 })),
  lock: () => on() && (tone(392, 0.07, { type: 'triangle', gain: v(0.1) }), tone(587, 0.1, { type: 'triangle', gain: v(0.08), delay: 0.06 })),
  reveal: () => on() && tone(220, 0.22, { type: 'sawtooth', gain: v(0.025), slide: 1.8 }),
  spin: () => on() && noise(0.25, { gain: v(0.1), freq: 700 }),
  turn: () => on() && tone(660, 0.12, { gain: v(0.07) }),
  flag: () => on() && (tone(523, 0.12, { gain: v(0.08) }), tone(659, 0.12, { gain: v(0.08), delay: 0.1 }), tone(784, 0.25, { gain: v(0.08), delay: 0.2 })),
};
