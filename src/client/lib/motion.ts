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

export interface Snapshot {
  rects: Map<string, { rect: DOMRect; el: HTMLElement }>;
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

export function snapshot(root: ParentNode = document): Snapshot {
  const rects = new Map<string, { rect: DOMRect; el: HTMLElement }>();
  root.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (visible(rect)) rects.set(el.dataset.card!, { rect, el });
  });
  const anchors = new Map<string, DOMRect>();
  root.querySelectorAll<HTMLElement>('[data-anchor]').forEach((el) => anchors.set(el.dataset.anchor!, el.getBoundingClientRect()));
  return { rects, anchors };
}

/** Land every flight immediately (a newer state arrived, or the user is dragging). */
export function finishAll() {
  for (const f of flights) f.anim.finish();
}

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function fly(source: HTMLElement, from: DOMRect, to: DOMRect, real: HTMLElement | null, delay: number, fade: 'in' | 'out' | 'none') {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-card');
  clone.classList.add('in-flight');
  const w = source.offsetWidth || to.width;
  const h = source.offsetHeight || to.height;
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${center(to).x - w / 2}px`,
    top: `${center(to).y - h / 2}px`,
    width: `${w}px`,
    height: `${h}px`,
    margin: '0',
    transform: 'none',
    pointerEvents: 'none',
  });
  layer().appendChild(clone);
  const a = center(from);
  const b = center(to);
  const s0 = from.width / w;
  const s1 = to.width / w;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  const lift = Math.min(36, dist * 0.12);
  const fast = settings.lowPerf;
  const duration = fast ? 260 : Math.min(620, 320 + dist * 0.35);
  const frames: Keyframe[] = [
    { transform: `translate(${dx}px, ${dy}px) scale(${s0})`, opacity: fade === 'in' ? 0 : 1 },
    {
      transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(${Math.max(s0, s1) * 1.06})`,
      opacity: 1,
      offset: 0.5,
    },
    { transform: `translate(0, 0) scale(${s1})`, opacity: fade === 'out' ? 0 : 1 },
  ];
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
  if (settings.instant) return;
  const after = snapshot(root);
  let n = 0;
  const stagger = settings.lowPerf ? 0 : 45;
  const delay = () => Math.min(n++, 8) * stagger;
  for (const [id, { rect, el }] of after.rects) {
    const prev = before.rects.get(id);
    if (prev) {
      const moved = Math.abs(prev.rect.left - rect.left) + Math.abs(prev.rect.top - rect.top) > 3;
      const resized = Math.abs(prev.rect.width - rect.width) > 3;
      if (moved || resized) fly(el, prev.rect, rect, el, delay(), 'none');
      continue;
    }
    const anchor = hints.originOf?.(id, el);
    const from = anchor ? (after.anchors.get(anchor) ?? before.anchors.get(anchor)) : null;
    if (from && visible(from)) fly(el, from, rect, el, delay(), 'in');
    else
      el.animate([{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], {
        duration: 220,
        easing: 'ease-out',
      });
  }
  for (const [id, { rect, el }] of before.rects) {
    if (after.rects.has(id)) continue;
    const anchor = hints.exitOf?.(id);
    const to = anchor ? after.anchors.get(anchor) : null;
    if (to && visible(to)) fly(el, rect, to, null, delay(), 'out');
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
