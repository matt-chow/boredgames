import { load, save } from './storage';

export type Layout = 'spatial' | 'compact';

interface Settings {
  muted: boolean;
  volume: number;
  reducedMotion: boolean | null;
  lowPerf: boolean;
  layout: Layout | null;
}

const KEY = 'bg.settings';
const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => typeof innerWidth !== 'undefined' && innerWidth < 760;

class SettingsStore {
  #s = $state<Settings>(load(KEY, { muted: false, volume: 0.6, reducedMotion: null, lowPerf: false, layout: null }));
  #narrow = $state(narrow());

  constructor() {
    if (typeof window !== 'undefined') addEventListener('resize', () => (this.#narrow = narrow()));
    $effect.root(() => {
      $effect(() => {
        save(KEY, this.#s);
        document.documentElement.dataset.motion = this.reducedMotion ? 'reduced' : 'full';
        document.documentElement.dataset.perf = this.#s.lowPerf ? 'low' : 'full';
      });
    });
  }

  get muted() {
    return this.#s.muted;
  }
  set muted(v: boolean) {
    this.#s.muted = v;
  }
  get volume() {
    return this.#s.volume;
  }
  set volume(v: number) {
    this.#s.volume = Math.min(1, Math.max(0, v));
  }
  /** User choice, else the OS preference. */
  get reducedMotion() {
    return this.#s.reducedMotion ?? prefersReduced();
  }
  set reducedMotion(v: boolean) {
    this.#s.reducedMotion = v;
  }
  get lowPerf() {
    return this.#s.lowPerf;
  }
  set lowPerf(v: boolean) {
    this.#s.lowPerf = v;
  }
  /** User choice, else compact on narrow screens. */
  get layout(): Layout {
    return this.#s.layout ?? (this.#narrow ? 'compact' : 'spatial');
  }
  set layout(v: Layout) {
    this.#s.layout = v;
  }
  /** Flights and settles are skipped entirely. */
  get instant() {
    return this.reducedMotion;
  }
}

export const settings = new SettingsStore();
