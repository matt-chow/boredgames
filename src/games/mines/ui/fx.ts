import { settings } from '../../../client/lib/settings.svelte';

/**
 * The mine's effects layer: card flights, particles and shakes for confirmed public lines (see events.ts). Animations
 * use transform and opacity only, live in a flat overlay, and can all be finished at once.
 */

/** How long things take: 1 normally, shorter in fast or low-power mode. */
export const pace = (fast: boolean) => (fast || settings.lowPerf ? 0.55 : 1);

let layer: HTMLElement | null = null;
const live = new Set<Animation>();
const timers = new Set<number>();
// shortcut: a hard cap on particles in flight, not a frame-time budget; upgrade if low-end phones still stutter.
const MAX_LIVE = 160;

function overlay() {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'ms-fx';
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '85', overflow: 'hidden' });
    document.body.appendChild(layer);
  }
  return layer;
}

function track(el: HTMLElement | null, a: Animation) {
  live.add(a);
  const done = () => {
    live.delete(a);
    el?.remove();
  };
  a.onfinish = done;
  a.oncancel = done;
  return a;
}

/** Run `f` after `ms`, unless everything is skipped first. */
export function later(ms: number, f: () => void) {
  if (ms <= 0) return f();
  const t = window.setTimeout(() => {
    timers.delete(t);
    f();
  }, ms);
  timers.add(t);
}

/** Land everything now: a newer view arrived, or the player wants to get on. */
export function skipAll() {
  for (const t of timers) clearTimeout(t);
  timers.clear();
  for (const a of [...live]) a.finish();
}

export const busy = () => live.size > 0 || timers.size > 0;

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/**
 * A card travelling from one box to another: lift, travel, turn, settle. With `face`, it shows its back for the first
 * half and turns face up on the way (an opponent's play is only revealed as it lands).
 */
export function token(back: string, from: DOMRect, to: DOMRect, o: { face?: string; delay?: number; duration?: number; turn?: number } = {}) {
  if (settings.instant || live.size > MAX_LIVE) return;
  const w = to.width || 40;
  const h = to.height || 60;
  const img = document.createElement('img');
  img.src = back;
  img.alt = '';
  Object.assign(img.style, { position: 'absolute', left: `${to.left}px`, top: `${to.top}px`, width: `${w}px`, height: `${h}px`, borderRadius: '4px', boxShadow: '0 8px 18px rgb(0 0 0 / 0.5)' });
  overlay().appendChild(img);
  const a = centre(from);
  const b = centre(to);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const s0 = Math.max(0.3, (from.width || w) / w);
  const lift = Math.min(40, Math.hypot(dx, dy) * 0.15);
  const end = o.turn ?? 0;
  const duration = o.duration ?? 480;
  const flipX = o.face ? 0.05 : 1;
  const anim = img.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s0}) rotate(${end - 12}deg)`, opacity: 0 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - lift}px) scale(${1.12 * flipX}, 1.12) rotate(${end - 5}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(0, 0) scale(1) rotate(${end}deg)`, opacity: 1 },
    ],
    { duration, delay: o.delay ?? 0, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
  );
  track(img, anim);
  if (o.face) later((o.delay ?? 0) + duration * 0.45, () => (img.src = o.face!));
}

export type Burst = 'dust' | 'rocks' | 'crack' | 'glow' | 'gold' | 'coal';

const LOOK: Record<Burst, { n: number; colour: string; size: [number, number]; reach: number; fall: number; ms: number; round?: boolean }> = {
  dust: { n: 10, colour: 'rgb(196 170 130 / 0.55)', size: [6, 14], reach: 34, fall: -6, ms: 520, round: true },
  rocks: { n: 9, colour: '#6b5440', size: [3, 7], reach: 28, fall: 40, ms: 560 },
  crack: { n: 7, colour: '#c9b9a0', size: [2, 4], reach: 26, fall: 10, ms: 360 },
  glow: { n: 8, colour: 'rgb(255 215 122 / 0.9)', size: [3, 5], reach: 30, fall: -14, ms: 480, round: true },
  gold: { n: 16, colour: '#ffd77a', size: [3, 6], reach: 48, fall: -10, ms: 900, round: true },
  coal: { n: 6, colour: 'rgb(60 54 50 / 0.8)', size: [6, 12], reach: 22, fall: -4, ms: 700, round: true },
};

/** A small spray of particles from the middle of a box. */
export function burst(kind: Burst, at: DOMRect, o: { delay?: number; scale?: number } = {}) {
  if (settings.instant || settings.lowPerf || live.size > MAX_LIVE) return;
  const k = LOOK[kind];
  const c = centre(at);
  const scale = o.scale ?? 1;
  for (let i = 0; i < k.n; i++) {
    const d = document.createElement('i');
    const s = (k.size[0] + Math.random() * (k.size[1] - k.size[0])) * scale;
    Object.assign(d.style, { position: 'absolute', left: `${c.x - s / 2}px`, top: `${c.y - s / 2}px`, width: `${s}px`, height: `${s}px`, background: k.colour, borderRadius: k.round ? '50%' : '1px' });
    overlay().appendChild(d);
    const ang = (i / k.n) * Math.PI * 2 + Math.random() * 0.6;
    const r = k.reach * scale * (0.5 + Math.random() * 0.7);
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r * 0.6 + k.fall * scale;
    track(
      d,
      d.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${x}px, ${y}px) scale(${k.round ? 1.6 : 0.8}) rotate(${Math.random() * 180}deg)`, opacity: 0 },
        ],
        { duration: k.ms * (0.8 + Math.random() * 0.4), delay: o.delay ?? 0, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' },
      ),
    );
  }
}

/** Animate a real element in place (it stays in the page). */
export function move(el: Element | null, frames: Keyframe[], duration: number, delay = 0) {
  if (!el || settings.instant) return;
  track(null, el.animate(frames, { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
}

/** A tunnel coming down: a copy of the card shakes where it lay, then drops away. */
export function collapse(src: string, at: DOMRect, rot: boolean, duration: number) {
  if (settings.instant) return;
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  Object.assign(img.style, { position: 'absolute', left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` });
  overlay().appendChild(img);
  const r = rot ? 180 : 0;
  const shake = [0, -3, 3, -2, 2, 0].map((x, i) => ({ transform: `translate(${x}px, 0) rotate(${r}deg)`, offset: i * 0.08 }));
  track(img, img.animate([...shake, { transform: `translate(0, 2px) rotate(${r}deg)`, opacity: 1, offset: 0.5 }, { transform: `translate(4px, 30px) rotate(${r + 8}deg) scale(0.9)`, opacity: 0 }], { duration, easing: 'ease-in' }));
}

/** A face-down card turning edge-on where it lies, so the face beneath can turn up after it. */
export function flipOut(src: string, at: DOMRect, duration: number, delay = 0) {
  if (settings.instant) return;
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  Object.assign(img.style, { position: 'absolute', left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` });
  overlay().appendChild(img);
  track(img, img.animate([{ transform: 'perspective(400px) rotateY(0deg) scale(1)' }, { transform: 'perspective(400px) rotateY(90deg) scale(1.08)' }], { duration, delay, easing: 'ease-in', fill: 'backwards' }));
}
