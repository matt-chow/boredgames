import { finishAll } from './motion';

/**
 * Pointer drag for cards. A clone follows the pointer in the flat flight layer;
 * on release the element under the pointer marked `[data-drop]` is reported.
 * A press that never travels past the threshold stays a click, so every drag
 * target also works by click-to-select. Drag only proposes a move: the server
 * decides, and the confirmed view moves the real card.
 */

export interface DragOptions {
  /** Called when the press becomes a drag. */
  onStart?(): void;
  onOver?(target: HTMLElement | null): void;
  onDrop(target: HTMLElement | null): void;
}

const THRESHOLD = 6;
let suppressClick = false;

/** True right after a drag ended, so the trailing click can be ignored. */
export function consumeDragClick(): boolean {
  const v = suppressClick;
  suppressClick = false;
  return v;
}

function dropAt(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y);
  return (el?.closest('[data-drop]') as HTMLElement | null) ?? null;
}

export function beginDrag(e: PointerEvent, source: HTMLElement, opts: DragOptions) {
  if (e.button !== 0) return;
  const sx = e.clientX;
  const sy = e.clientY;
  const id = e.pointerId;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  let dx = 0;
  let dy = 0;

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    if (!ghost) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < THRESHOLD) return;
      finishAll();
      const r = source.getBoundingClientRect();
      dx = sx - r.left;
      dy = sy - r.top;
      ghost = source.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('data-card');
      ghost.classList.add('drag-ghost');
      Object.assign(ghost.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: `${r.width}px`,
        height: `${r.height}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: '90',
      });
      document.body.appendChild(ghost);
      source.style.opacity = '0.25';
      document.body.classList.add('dragging');
      opts.onStart?.();
    }
    ev.preventDefault();
    ghost.style.transform = `translate(${ev.clientX - dx}px, ${ev.clientY - dy}px) rotate(-3deg) scale(1.06)`;
    const t = dropAt(ev.clientX, ev.clientY);
    if (t !== over) {
      over?.classList.remove('drop-over');
      t?.classList.add('drop-over');
      over = t;
      opts.onOver?.(t);
    }
  };

  const end = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', end);
    removeEventListener('pointercancel', end);
    if (!ghost) return;
    over?.classList.remove('drop-over');
    ghost.remove();
    source.style.opacity = '';
    document.body.classList.remove('dragging');
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    opts.onDrop(ev.type === 'pointerup' ? dropAt(ev.clientX, ev.clientY) : null);
  };

  addEventListener('pointermove', move, { passive: false });
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
}
