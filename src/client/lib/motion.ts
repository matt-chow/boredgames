import { settings } from './settings.svelte';

/**
 * Card motion driven purely by confirmed state.
 *
 * Every rendered card carries `data-card="<id>"`. Before a new authoritative
 * view renders we record where each card is; after it renders we fly clones
 * from the old position to the new one (FLIP) in a flat overlay above the
 * tilted table. Cards that appear without a previous position fly in from an
 * anchor (`data-anchor="deck"`, `seat-2`, …); cards that vanish fly to one.
 * The real element stays hidden only while its clone is in flight, so an
 * interrupted animation can always be finished instantly.
 */

/** Where a card was drawn: its bounding box, its visual size and its 2D rotation (the hand fan tilts cards). */
export interface Spot {
  rect: DOMRect;
  el: HTMLElement;
  w: number;
  h: number;
  rot: number;
}

export interface Snapshot {
  rects: Map<string, Spot>;
  anchors: Map<string, DOMRect>;
}

export interface Hints {
  /** Anchor a newly visible card should come from. */
  originOf?(id: string, el: HTMLElement): string | null;
  /** Anchor a card that left the table should go to. */
  exitOf?(id: string): string | null;
}

let overlay: HTMLElement | null = null;
const flights = new Set<{ clone: HTMLElement; real: HTMLElement | null; anim: Animation }>();

function layer(): HTMLElement {
  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement('div');
    overlay.className = 'flight-layer';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }
  return overlay;
}

const visible = (r: DOMRect) => r.width > 2 && r.height > 2;

/** Rotation of a flat 2D transform on the element or its parent, in degrees; 0 for none or for 3D. */
function rotationOf(el: HTMLElement): number {
  for (const e of [el, el.parentElement]) {
    const m = e && /^matrix\(([^,]+),\s*([^,]+)/.exec(getComputedStyle(e).transform);
    if (m) return (Math.atan2(Number(m[2]), Number(m[1])) * 180) / Math.PI;
  }
  return 0;
}

function spot(el: HTMLElement, rect: DOMRect): Spot {
  const rot = rotationOf(el);
  // A rotated card's bounds are larger than the card; use its layout size instead (the fan does not scale).
  return Math.abs(rot) > 0.1
    ? { rect, el, w: el.offsetWidth, h: el.offsetHeight, rot }
    : { rect, el, w: rect.width, h: rect.height, rot: 0 };
}

const box = (rect: DOMRect) => ({ rect, w: rect.width, h: rect.height, rot: 0 });

/**
 * A card dropped by drag waits where it was dropped (as its drag ghost) until
 * the server answers, so it never snaps back to the hand first. The next
 * animation takes off from the ghost.
 */
let held: { id: string; ghost: HTMLElement; source: HTMLElement; rot: number; scale: number; timer: number } | null = null;

export function hold(id: string, ghost: HTMLElement, source: HTMLElement, rot: number, scale: number) {
  release();
  held = { id, ghost, source, rot, scale, timer: window.setTimeout(release, 1500) };
}

/** Remove the held ghost: the move was refused, or its animation has taken over. */
export function release() {
  if (!held) return;
  clearTimeout(held.timer);
  held.ghost.remove();
  held.source.style.opacity = '';
  held = null;
}

export function snapshot(root: ParentNode = document): Snapshot {
  const rects = new Map<string, Spot>();
  root.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (visible(rect)) rects.set(el.dataset.card!, spot(el, rect));
  });
  if (held && rects.has(held.id)) {
    const g = held.ghost;
    rects.set(held.id, { rect: g.getBoundingClientRect(), el: g, w: g.offsetWidth * held.scale, h: g.offsetHeight * held.scale, rot: held.rot });
  }
  const anchors = new Map<string, DOMRect>();
  root.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => anchors.set(el.dataset.anchor!, el.getBoundingClientRect()));
  return { rects, anchors };
}

/** Land every flight immediately (a newer state arrived, or the user is dragging). */
export function finishAll() {
  for (const f of flights) f.anim.finish();
}

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const at = (x: number, y: number, sx: number, sy: number, r: number) =>
  `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sx}, ${sy})`;

type Box = Pick<Spot, 'rect' | 'w' | 'h' | 'rot'>;

function fly(source: HTMLElement, src: Box, dst: Box, real: HTMLElement | null, delay: number, fade: 'in' | 'out' | 'none') {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-card');
  const w = source.offsetWidth || dst.w;
  const h = source.offsetHeight || dst.h;
  const a = center(src.rect);
  const b = center(dst.rect);
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${b.x - w / 2}px`,
    top: `${b.y - h / 2}px`,
    width: `${w}px`,
    height: `${h}px`,
    margin: '0',
    transform: 'none',
    pointerEvents: 'none',
  });
  layer().appendChild(clone);
  // Scale each axis on its own: on the tilted table a card's box is shorter than the card.
  const [sx0, sy0, sx1, sy1] = [src.w / w, src.h / h, dst.w / w, dst.h / h];
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  let frames: Keyframe[];
  let duration: number;
  if (dist < 48 && fade === 'none') {
    // A layout nudge: slide quietly, with no lift, pop or stagger.
    clone.style.zIndex = '79';
    duration = settings.lowPerf ? 160 : 220;
    delay = 0;
    frames = [{ transform: at(dx, dy, sx0, sy0, src.rot) }, { transform: at(0, 0, sx1, sy1, dst.rot) }];
  } else {
    clone.classList.add('in-flight');
    const lift = Math.min(36, dist * 0.12);
    duration = settings.lowPerf ? 260 : Math.min(620, 320 + dist * 0.35);
    frames = [
      { transform: at(dx, dy, sx0, sy0, src.rot), opacity: fade === 'in' ? 0 : 1 },
      {
        transform: at(dx * 0.45, dy * 0.45 - lift, Math.max(sx0, sx1) * 1.06, Math.max(sy0, sy1) * 1.06, (src.rot + dst.rot) / 2),
        opacity: 1,
        offset: 0.5,
      },
      { transform: at(0, 0, sx1, sy1, dst.rot), opacity: fade === 'out' ? 0 : 1 },
    ];
  }
  if (real) real.style.visibility = 'hidden';
  const anim = clone.animate(frames, { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
  const f = { clone, real, anim };
  flights.add(f);
  const done = () => {
    flights.delete(f);
    clone.remove();
    if (real) real.style.visibility = '';
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

/** Animate from `before` to the current DOM. Call after the new view has rendered. */
export function play(before: Snapshot, hints: Hints = {}, root: ParentNode = document) {
  // The held ghost was measured into `before`; from here the flight (or the plain render) takes over.
  release();
  if (settings.instant) return;
  const after = snapshot(root);
  let n = 0;
  const stagger = settings.lowPerf ? 0 : 45;
  const delay = () => Math.min(n++, 8) * stagger;
  for (const [id, cur] of after.rects) {
    const prev = before.rects.get(id);
    if (prev) {
      const moved = Math.abs(prev.rect.left - cur.rect.left) + Math.abs(prev.rect.top - cur.rect.top) > 3;
      const changed = Math.abs(prev.w - cur.w) > 3 || Math.abs(prev.h - cur.h) > 3 || Math.abs(prev.rot - cur.rot) > 1;
      if (moved || changed) fly(cur.el, prev, cur, cur.el, delay(), 'none');
      continue;
    }
    const anchor = hints.originOf?.(id, cur.el);
    const from = anchor ? (after.anchors.get(anchor) ?? before.anchors.get(anchor)) : null;
    if (from && visible(from)) fly(cur.el, box(from), cur, cur.el, delay(), 'in');
    else
      cur.el.animate([{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], {
        duration: 220,
        easing: 'ease-out',
      });
  }
  for (const [id, prev] of before.rects) {
    if (after.rects.has(id)) continue;
    const anchor = hints.exitOf?.(id);
    const to = anchor ? after.anchors.get(anchor) : null;
    if (to && visible(to)) fly(prev.el, prev, box(to), null, delay(), 'out');
  }
}

/** A short settle on a single element (plant, coin landing). */
export function pulse(el: Element | null, kind: 'settle' | 'nudge' = 'settle') {
  if (!el || settings.instant) return;
  const frames =
    kind === 'settle'
      ? [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }]
      : [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-2px)' },
          { transform: 'translateX(0)' },
        ];
  el.animate(frames, { duration: kind === 'settle' ? 280 : 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
}
