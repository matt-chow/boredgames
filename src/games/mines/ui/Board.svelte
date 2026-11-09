<script lang="ts">
  import { settings } from '../../../client/lib/settings.svelte';
  import Icon from '../../../hub/Icon.svelte';
  import { TUNNEL } from '../rules/cards';
  import type { MView, Rot, Spot } from '../rules/types';
  import { GOAL_NAMES, goalWord, nameOf, tileArt } from './text';

  /**
   * The mine. Pure rendering of the confirmed view: legal squares come from the server's `me.spots`, so the board never
   * decides what fits. Drag to pan, wheel or pinch to zoom; the +, − and fit buttons do the same for keyboards.
   */
  let {
    view,
    deep = false,
    low = false,
    card = null,
    rot = 0,
    target = null,
    onplace,
    ontunnel,
    ongoal,
  }: {
    view: MView;
    deep?: boolean;
    low?: boolean;
    /** The tunnel card being laid, when it is yours to lay. */
    card?: { id: number; kind: string } | null;
    rot?: Rot;
    /** An action card waiting for a square: a tunnel to cave in or a destination to survey. */
    target?: 'tunnel' | 'goal' | null;
    onplace?: (s: Spot) => void;
    ontunnel?: (x: number, y: number) => void;
    ongoal?: (i: number) => void;
  } = $props();

  const TW = 56;
  const TH = 84;

  /** Every square this card may go, once per square: the rotation you chose if it fits there, else the other. */
  const spots = $derived.by(() => {
    if (!card) return [];
    const all = view.me?.spots[card.id] ?? [];
    const by = new Map<string, Spot>();
    for (const s of all) {
      const k = `${s.x},${s.y}`;
      if (!by.has(k) || s.rot === rot) by.set(k, s);
    }
    return [...by.values()];
  });

  const box = $derived.by(() => {
    const pts = [...view.cells, ...view.goals, ...spots];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { x0: Math.min(...xs) - 1, x1: Math.max(...xs) + 1, y0: Math.min(...ys) - 1, y1: Math.max(...ys) + 1 };
  });
  const width = $derived((box.x1 - box.x0 + 1) * TW);
  const height = $derived((box.y1 - box.y0 + 1) * TH);
  const left = (x: number) => (x - box.x0) * TW;
  const top = (y: number) => (y - box.y0) * TH;

  const lastPath = $derived.by(() => {
    const e = [...view.log].reverse().find((l) => l.t === 'path' || l.t === 'round');
    return e?.t === 'path' ? `${e.x},${e.y}` : null;
  });
  const peeked = $derived(new Map((view.me?.seen ?? []).flatMap((o) => (o.t === 'survey' && o.round === view.round ? [[o.goal, o.kind] as const] : []))));

  // ---- Pan and zoom --------------------------------------------------------------------------------------------------
  let port = $state<HTMLElement>();
  let scale = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  function fit() {
    if (!port) return;
    const r = port.getBoundingClientRect();
    scale = clamp(Math.min(r.width / width, r.height / height) * 0.96, 0.25, 1.6);
    tx = (r.width - width * scale) / 2;
    ty = (r.height - height * scale) / 2;
  }
  function zoom(f: number, cx?: number, cy?: number) {
    if (!port) return;
    const r = port.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    const next = clamp(scale * f, 0.25, 2.5);
    tx = px - ((px - tx) * next) / scale;
    ty = py - ((py - ty) * next) / scale;
    scale = next;
  }
  // Fit once the board has a size, and again whenever it grows past the edge of the view.
  let fitted = '';
  $effect(() => {
    const k = `${box.x0},${box.x1},${box.y0},${box.y1}`;
    if (port && k !== fitted) {
      fitted = k;
      fit();
    }
  });

  const pointers = new Map<number, { x: number; y: number }>();
  let dragged = false;
  let pinch = 0;
  function down(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function move(e: PointerEvent) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!dragged && Math.hypot(dx, dy) < 5) return;
    if (!dragged) port?.setPointerCapture(e.pointerId);
    dragged = true;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = port!.getBoundingClientRect();
      if (pinch) zoom(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = d;
    } else {
      tx += dx;
      ty += dy;
    }
  }
  function up(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    const r = port!.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
  }
  /** A drag that ends on a square is a pan, not a choice. */
  const tap = (f: () => void) => (e: MouseEvent) => {
    if (dragged) {
      e.preventDefault();
      dragged = false;
      return;
    }
    f();
  };

  let hover = $state<string | null>(null);
</script>

<div class="mine" class:deep class:low={low || settings.lowPerf}>
  <div class="port" bind:this={port} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onwheel={wheel} role="region" aria-label="The mine">
    <div class="board" style:width="{width}px" style:height="{height}px" style:transform="translate({tx}px, {ty}px) scale({scale})">
      {#each view.cells as c (`${c.x},${c.y},${c.kind}`)}
        {@const caveable = target === 'tunnel' && !!TUNNEL[c.kind]}
        <div class="tile" class:fresh={!settings.instant && lastPath === `${c.x},${c.y}`} class:last={lastPath === `${c.x},${c.y}`} style:left="{left(c.x)}px" style:top="{top(c.y)}px">
          <img src={tileArt(c.kind, deep)} alt={nameOf(c.kind)} draggable="false" class:rot={c.rot} />
          {#if caveable}
            <button class="pick" aria-label="Bring down {nameOf(c.kind)} at column {c.x}, row {c.y}" onclick={tap(() => ontunnel?.(c.x, c.y))}></button>
          {/if}
        </div>
      {/each}
      {#each view.goals as g, i (i)}
        {#if !g.revealed}
          <div class="tile goal" style:left="{left(g.x)}px" style:top="{top(g.y)}px">
            <img src={tileArt('goalBack', deep)} alt="Face-down destination ({GOAL_NAMES[i]})" draggable="false" />
            {#if peeked.has(i)}<span class="peek" class:gold={peeked.get(i) === 'gold'}>You saw: {goalWord(peeked.get(i))}</span>{/if}
            {#if target === 'goal'}
              <button class="pick" aria-label="Survey the {GOAL_NAMES[i]} destination" onclick={tap(() => ongoal?.(i))}></button>
            {/if}
          </div>
        {/if}
      {/each}
      {#each spots as s (`${s.x},${s.y}`)}
        {@const k = `${s.x},${s.y}`}
        <button
          class="spot"
          class:turned={s.rot !== rot}
          style:left="{left(s.x)}px"
          style:top="{top(s.y)}px"
          aria-label="Lay {nameOf(card!.kind)} at column {s.x}, row {s.y}{s.rot !== rot ? ', turned round' : ''}"
          onpointerenter={() => (hover = k)}
          onpointerleave={() => hover === k && (hover = null)}
          onfocus={() => (hover = k)}
          onblur={() => hover === k && (hover = null)}
          onclick={tap(() => onplace?.(s))}
        >
          {#if hover === k}<img src={tileArt(card!.kind, deep)} alt="" class:rot={s.rot} draggable="false" />{/if}
          {#if s.rot !== rot}<span class="turn" aria-hidden="true">↻</span>{/if}
        </button>
      {/each}
    </div>
    {#if deep && !(low || settings.lowPerf)}<div class="lamp" class:still={settings.instant} aria-hidden="true"></div>{/if}
  </div>
  <div class="zoom">
    <button class="btn icon small" aria-label="Zoom in" onclick={() => zoom(1.25)}><Icon name="zoomIn" size={16} /></button>
    <button class="btn icon small" aria-label="Zoom out" onclick={() => zoom(0.8)}><Icon name="zoomOut" size={16} /></button>
    <button class="btn small" onclick={fit}>Fit</button>
  </div>
</div>

<style>
  .mine {
    position: relative;
    height: 100%;
    min-height: 240px;
    background: radial-gradient(circle at 50% 40%, #3a2c20, #1c140e 75%);
    overflow: hidden;
  }
  .mine.deep {
    background: radial-gradient(circle at 50% 45%, #1b2030, #06070a 80%);
  }
  .port {
    position: absolute;
    inset: 0;
    touch-action: none;
    cursor: grab;
    overflow: hidden;
  }
  .board {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .tile,
  .spot {
    position: absolute;
    width: 56px;
    height: 84px;
  }
  .tile img,
  .spot img {
    width: 100%;
    height: 100%;
    display: block;
    user-select: none;
  }
  .deep .tile img {
    border-radius: 0;
  }
  img.rot {
    transform: rotate(180deg);
  }
  .tile.last {
    outline: 2px solid var(--ms-lamp);
    outline-offset: -1px;
    z-index: 1;
  }
  .fresh {
    animation: settle 320ms ease-out;
  }
  @keyframes settle {
    from {
      opacity: 0;
      transform: scale(1.15);
    }
  }
  .peek {
    position: absolute;
    left: 2px;
    right: 2px;
    bottom: 4px;
    padding: 1px 2px;
    font-size: 9px;
    text-align: center;
    border-radius: 2px;
    background: #000c;
    color: #ddd;
  }
  .peek.gold {
    color: #f6d98a;
  }
  .pick,
  .spot {
    border: 2px dashed var(--sprout);
    border-radius: 6px;
    background: var(--sprout-dim);
    cursor: pointer;
    padding: 0;
  }
  .pick {
    position: absolute;
    inset: 0;
  }
  .spot.turned {
    border-style: dotted;
  }
  .spot img {
    opacity: 0.7;
  }
  .pick:hover,
  .pick:focus-visible,
  .spot:hover,
  .spot:focus-visible {
    border-style: solid;
    outline: none;
    background: rgb(255 255 255 / 0.08);
  }
  .turn {
    position: absolute;
    top: 2px;
    right: 4px;
    color: var(--sprout);
    font-size: 14px;
    pointer-events: none;
  }
  .lamp {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 50% 50%, transparent 30%, rgb(0 0 0 / 0.55) 85%);
    animation: flicker 4s ease-in-out infinite alternate;
  }
  .lamp.still {
    animation: none;
  }
  @keyframes flicker {
    to {
      opacity: 0.8;
    }
  }
  .zoom {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    .fresh,
    .lamp {
      animation: none;
    }
  }
</style>
