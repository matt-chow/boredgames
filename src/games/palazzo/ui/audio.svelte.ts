import { settings } from '../../../client/lib/settings.svelte';
import { noise, tone } from '../../../client/lib/sound';
import { load, save } from '../../../client/lib/storage';

/** Palazzo's sounds, all synthesized and off until a player turns them on (PZ-UI4). Kept on this device. */
export interface PalazzoPrefs {
  sfx: boolean;
  sfxVol: number;
}

const KEY = 'palazzo.prefs';
export const prefs = $state<PalazzoPrefs>({ sfx: false, sfxVol: 0.6, ...load<Partial<PalazzoPrefs>>(KEY, {}) });
$effect.root(() => {
  $effect(() => save(KEY, $state.snapshot(prefs)));
});

const on = () => prefs.sfx && !settings.muted;
const v = (g: number) => g * prefs.sfxVol;

export const sounds = {
  coin: () => on() && (tone(1320, 0.08, { gain: v(0.07) }), tone(1760, 0.12, { gain: v(0.05), delay: 0.05 })),
  claim: () => on() && tone(330, 0.16, { type: 'triangle', gain: v(0.12) }),
  challenge: () => on() && (noise(0.06, { gain: v(0.14), freq: 1800 }), tone(196, 0.3, { type: 'square', gain: v(0.04), slide: 0.8 })),
  lose: () => on() && tone(220, 0.5, { type: 'triangle', gain: v(0.12), slide: 0.55 }),
  turn: () => on() && (tone(523, 0.16, { gain: v(0.1) }), tone(784, 0.3, { gain: v(0.09), delay: 0.1 })),
  chat: () => on() && tone(1250, 0.05, { gain: v(0.05) }),
  warn: () => on() && tone(440, 0.12, { type: 'square', gain: v(0.03) }),
};
