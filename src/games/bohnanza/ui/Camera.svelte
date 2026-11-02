<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../../../hub/Icon.svelte';

  /**
   * Fixed-angle table camera: pan and zoom only, never rotate. The plane is
   * laid out flat at its natural size and fitted to the viewport; the tilt is
   * a single static rotateX so nothing renders continuously.
   */
  let { enabled = true, children }: { enabled?: boolean; children: Snippet } = $props();

  const MIN = 0.7;
  const MAX = 1.6;
  const TILT = 20;

  let vw = $state(0);
  let vh = $state(0);
  let pw = $state(0);
  let ph = $state(0);
  let zoom = $state(1);
  let px = $state(0);
  let py = $state(0);
  let gesturing = $state(false);

  // Leave room for the hand HUD that overlaps the bottom of the viewport.
  const fit = $derived(pw && ph ? Math.min(1.25, (vw - 24) / pw, (vh - 16) / (ph * Math.cos((TILT * Math.PI) / 180))) : 1);
  const scale = $derived(fit * zoom);

  function clamp() {
    const mx = Math.max(0, (pw * scale - vw) / 2) + 80;
    const my = Math.max(0, (ph * scale - vh) / 2) + 80;
    px = Math.max(-mx, Math.min(mx, px));
    py = Math.max(-my, Math.min(my, py));
  }

  function zoomTo(z: number, cx = 0, cy = 0) {
    const nz = Math.max(MIN, Math.min(MAX, z));
    const k = nz / zoom;
    // Keep the point under the cursor fixed.
    px = cx - (cx - px) * k;
    py = cy - (cy - py) * k;
    zoom = nz;
    clamp();
  }

  function reset() {
    zoom = 1;
    px = 0;
    py = 0;
  }

  let vp = $state<HTMLElement>()!;
  const rel = (e: { clientX: number; clientY: number }) => {
    const r = vp.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  function onWheel(e: WheelEvent) {
    if (!enabled) return;
    e.preventDefault();
    const p = rel(e);
    zoomTo(zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
  }

  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; z: number } | null = null;

  function onDown(e: PointerEvent) {
    if (!enabled || e.button > 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, [data-card], [data-drop] .hit')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    vp.setPointerCapture(e.pointerId);
    gesturing = true;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
    }
  }
  function onMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const m = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      zoomTo((pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d, m.x, m.y);
    } else if (pointers.size === 1) {
      px += cur.x - prev.x;
      py += cur.y - prev.y;
      clamp();
    }
  }
  function onUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) gesturing = false;
  }

  function onKey(e: KeyboardEvent) {
    if (!enabled || (e.target as HTMLElement).closest('input, textarea')) return;
    if (e.key === '+' || e.key === '=') zoomTo(zoom * 1.15);
    else if (e.key === '-') zoomTo(zoom / 1.15);
    else if (e.key === '0') reset();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if enabled}
  <div
    class="viewport"
    class:gesturing
    bind:this={vp}
    bind:clientWidth={vw}
    bind:clientHeight={vh}
    onwheel={onWheel}
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
    role="presentation"
  >
    <div
      class="plane"
      bind:clientWidth={pw}
      bind:clientHeight={ph}
      style="transform: translate(-50%, -50%) translate({px}px, {py}px) scale({scale}) rotateX({TILT}deg)"
    >
      {@render children()}
    </div>
    <div class="cam" role="group" aria-label="Camera">
      <button class="btn icon ghost" aria-label="Zoom in" disabled={zoom >= MAX} onclick={() => zoomTo(zoom * 1.2)}><Icon name="zoomIn" size={18} /></button>
      <button class="btn icon ghost" aria-label="Zoom out" disabled={zoom <= MIN} onclick={() => zoomTo(zoom / 1.2)}><Icon name="zoomOut" size={18} /></button>
      <button class="btn icon ghost" aria-label="Reset view" disabled={zoom === 1 && !px && !py} onclick={reset}><Icon name="reset" size={18} /></button>
    </div>
  </div>
{:else}
  <div class="flat">{@render children()}</div>
{/if}

<style>
  .viewport {
    position: absolute;
    inset: 0;
    overflow: hidden;
    perspective: 1800px;
    perspective-origin: 50% 30%;
    touch-action: none;
    cursor: grab;
  }
  .viewport.gesturing {
    cursor: grabbing;
  }
  .plane {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1180px;
    padding: 28px 40px 48px;
    transform-origin: 50% 50%;
    transform-style: flat;
    transition: transform var(--dur-2) var(--ease-out);
    border-radius: 28px;
    background:
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.012) 0 2px, transparent 2px 120px),
      linear-gradient(#211912, #1a140f);
    box-shadow:
      inset 0 0 0 1px var(--rim),
      0 40px 80px rgb(0 0 0 / 0.55);
  }
  .gesturing .plane {
    transition: none;
  }
  .cam {
    position: absolute;
    left: 12px;
    top: 12px;
    display: flex;
    gap: 2px;
    padding: 2px;
    border-radius: 10px;
    background: rgb(15 11 8 / 0.7);
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .flat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
