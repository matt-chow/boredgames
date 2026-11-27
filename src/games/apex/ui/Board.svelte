<!--
  The circuit, printed on poster stock and dressed with miniatures. Everything is drawn from the circuit's geometry:
  bends are only paint, and only the numbered roundels are corners (AX-CRN-1). The camera moves only when asked.
-->
<script lang="ts" module>
  import type { Fit } from '../rules/content/upgrades';
  import type { Modules } from '../rules/race';

  /** What the board needs to know about a race: the live view and a replay frame both fit. */
  export interface BoardRace {
    circuit: string;
    laps: number;
    n: number;
    round: number;
    modules: Modules;
    weather: string;
    sectors: string[];
    cornerDelta: number[];
    cars: { id: number; name: string; number: number; livery: number; pos: number; lane: number; spun: boolean; done: unknown }[];
    last: { car: number; from: number; to: number; spun: boolean; corners: { at: number; limit: number; paid: number }[] }[];
  }
  export interface Preview {
    from: number;
    to: number;
    checks: { m: number; limit: number; cost: number }[];
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { settings } from '../../../client/lib/settings.svelte';
  import { LANE_W, lanePos } from '../rules/geometry';
  import { cornerLimit, spaceOf } from '../rules/race';
  import { livery, paint, propAsset } from './assets';
  import { sectorInfo } from './text';
  import { boardTrack } from './track';

  let {
    race,
    mine = null,
    fit = {},
    preview = null,
    label = 'The circuit',
  }: { race: BoardRace; mine?: number | null; fit?: Partial<Fit>; preview?: Preview | null; label?: string } = $props();

  const W = 1600, H = 1000;
  const T = $derived(boardTrack(race.circuit));
  const circ = $derived(T.circ);
  const geo = $derived(circ.geo);
  const n = $derived(geo.spaces.length);
  const ROAD = LANE_W * 2.2 + 8;

  const lanes = (sp: number) => (race.modules.mountains && circ.tunnel[sp] ? 1 : 2);
  function poseOf(pos: number, lane: number) {
    const sp = spaceOf(race, pos);
    const g = geo.spaces[sp];
    const [x, y] = lanePos(g, lane, lanes(sp));
    return { x, y, a: g.a };
  }
  const tf = (p: { x: number; y: number; a: number }, extra = 0) => `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${((p.a * 180) / Math.PI + extra).toFixed(1)}deg)`;

  /** Runs of consecutive spaces where `flag` holds, as [first, last] progress values. */
  function runs(flag: (sp: number) => boolean): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (!flag(i) || flag((i - 1 + n) % n)) continue;
      let j = i;
      while (flag((j + 1) % n) && j - i < n) j++;
      out.push([i, j]);
    }
    if (!out.length && flag(0)) out.push([0, n - 1]);
    return out;
  }
  const gravel = $derived(race.modules.dust ? runs((i) => circ.gravel[i]) : []);
  const tunnels = $derived(race.modules.mountains ? runs((i) => circ.tunnel[i]) : []);
  const passes = $derived(race.modules.mountains ? runs((i) => circ.pass[i] != null) : []);
  const sectorRuns = $derived([0, 1, 2].map((k) => ({ k, mod: race.sectors[k] ?? 'none', runs: runs((i) => circ.sector[i] === k) })));
  const bends = $derived.by(() => {
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    return geo.spaces.map((_, i) => wrap(geo.spaces[(i + 2) % n].a - geo.spaces[(i - 2 + n) % n].a));
  });
  const corners = $derived(
    circ.corners.map((k, i) => {
      const g = geo.spaces[k.at];
      const side = bends[k.at] > 0 ? -1 : 1; // the roundel stands on the outside of the bend
      const off = side * (ROAD / 2 + 26);
      return { i, name: k.name, at: k.at, limit: cornerLimit(race, { fit }, i), base: k.limit, x: g.x - Math.sin(g.a) * off, y: g.y + Math.cos(g.a) * off, g };
    }),
  );
  const models = $derived(
    circ.scenery
      .map(([kind, t, side, dist], i) => {
        const p = T.at(t * T.length);
        const off = side * dist;
        return { i, kind, a: propAsset(kind), x: p.x - Math.sin(p.a) * off, y: p.y + Math.cos(p.a) * off };
      })
      .sort((a, b) => a.y - b.y),
  );
  const ticks = $derived(
    geo.spaces.map((_, i) => {
      const p = T.at(i * T.step);
      const dx = -Math.sin(p.a) * (ROAD / 2 - 3), dy = Math.cos(p.a) * (ROAD / 2 - 3);
      return `M${(p.x - dx).toFixed(1)},${(p.y - dy).toFixed(1)}L${(p.x + dx).toFixed(1)},${(p.y + dy).toFixed(1)}`;
    }),
  );
  const start = $derived(T.at(0));
  const grid = $derived(race.cars.filter((c) => c.pos < 0).map((c) => ({ id: c.id, p: poseOf(c.pos, c.lane) })));
  const cars = $derived(race.cars.filter((c) => !c.done).map((c) => ({ c, p: poseOf(c.pos, c.lane), l: livery(c.livery) })));
  const trails = $derived(race.last.filter((r) => r.to > r.from));
  const previewPath = $derived(preview && preview.to > preview.from ? T.path(preview.from, preview.to) : null);
  const ghost = $derived(preview && preview.to > preview.from ? poseOf(preview.to, 0) : null);

  // The view frames the circuit and its dressing, not the whole poster page, so the road fills the box.
  const vb = $derived.by(() => {
    const xs = [...geo.line.map((q) => q[0]), ...corners.map((k) => k.x)];
    const ys = [...geo.line.map((q) => q[1]), ...corners.map((k) => k.y)];
    for (const m of models) xs.push(m.x - m.a.w / 2, m.x + m.a.w / 2), ys.push(m.y - m.a.h, m.y);
    const pad = ROAD;
    const x = Math.max(0, Math.min(...xs) - pad), y = Math.max(0, Math.min(...ys) - pad);
    return { x, y, w: Math.min(W, Math.max(...xs) + pad) - x, h: Math.min(H, Math.max(...ys) + pad) - y };
  });

  // ---- Camera. Moves only on the reader's command: drag, wheel, keys or the buttons. --------------------------------
  let cam = $state({ x: 0, y: 0, k: 1 });
  let svg: SVGSVGElement;
  const clampK = (k: number) => Math.min(6, Math.max(1, k));
  function clamp(c: { x: number; y: number; k: number }) {
    const k = clampK(c.k);
    const x1 = vb.x + vb.w, y1 = vb.y + vb.h;
    return { k, x: Math.min(vb.x - vb.x * k, Math.max(x1 - x1 * k, c.x)), y: Math.min(vb.y - vb.y * k, Math.max(y1 - y1 * k, c.y)) };
  }
  const mid = () => ({ x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 });
  function toBoard(cx: number, cy: number) {
    const m = svg.getScreenCTM();
    if (!m) return mid();
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function zoomAt(bx: number, by: number, f: number) {
    const k = clampK(cam.k * f);
    const r = k / cam.k;
    cam = clamp({ k, x: bx - (bx - cam.x) * r, y: by - (by - cam.y) * r });
  }
  const fit0 = () => (cam = { x: 0, y: 0, k: 1 });
  function centre(id: number | null) {
    const c = cars.find((x) => x.c.id === id) ?? grid.map((g) => ({ p: g.p })).find((_, i) => race.cars.filter((c) => c.pos < 0)[i]?.id === id);
    if (!c) return;
    const k = Math.max(cam.k, 2.2);
    cam = clamp({ k, x: mid().x - c.p.x * k, y: mid().y - c.p.y * k });
  }
  let drag: { id: number; x: number; y: number; cx: number; cy: number } | null = null;
  const pts = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  function down(e: PointerEvent) {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
      return;
    }
    const b = toBoard(e.clientX, e.clientY);
    drag = { id: e.pointerId, x: b.x, y: b.y, cx: cam.x, cy: cam.y };
    svg.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const m = toBoard((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(m.x, m.y, d / pinch);
      pinch = d;
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const b = toBoard(e.clientX, e.clientY);
    cam = clamp({ k: cam.k, x: drag.cx + (b.x - drag.x), y: drag.cy + (b.y - drag.y) });
    // The board's own coordinates moved with the camera; re-anchor so the drag tracks the finger.
    const nb = toBoard(e.clientX, e.clientY);
    drag.x = nb.x;
    drag.y = nb.y;
    drag.cx = cam.x;
    drag.cy = cam.y;
  }
  function up(e: PointerEvent) {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    if (drag?.id === e.pointerId) drag = null;
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    const b = toBoard(e.clientX, e.clientY);
    zoomAt(b.x, b.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }
  function key(e: KeyboardEvent) {
    const d = 60;
    const map: Record<string, () => void> = {
      ArrowLeft: () => (cam = clamp({ ...cam, x: cam.x + d })),
      ArrowRight: () => (cam = clamp({ ...cam, x: cam.x - d })),
      ArrowUp: () => (cam = clamp({ ...cam, y: cam.y + d })),
      ArrowDown: () => (cam = clamp({ ...cam, y: cam.y - d })),
      '+': () => zoomAt(mid().x, mid().y, 1.25),
      '=': () => zoomAt(mid().x, mid().y, 1.25),
      '-': () => zoomAt(mid().x, mid().y, 0.8),
      '0': fit0,
      c: () => centre(mine),
    };
    const f = map[e.key];
    if (f) {
      e.preventDefault();
      f();
    }
  }
  onMount(() => {
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  });

  // ---- Motion: each revealed move drives its car along the road, in resolution order. Confirmed state only. --------
  const els = new Map<number, SVGGElement>();
  function carEl(node: SVGGElement, id: number) {
    els.set(id, node);
    return { destroy: () => els.delete(id) };
  }
  let played = new Set<string>();
  let seenRace = '';
  $effect(() => {
    const key = `${race.circuit}:${race.laps}:${race.cars.length}`;
    const sigs = trails.map((r) => `${race.round}:${r.car}:${r.from}:${r.to}`);
    if (key !== seenRace) {
      // A new race or the first look: show where the cars are, don't replay how they got there.
      seenRace = key;
      played = new Set(sigs);
      return;
    }
    if (settings.instant) {
      played = new Set(sigs);
      return;
    }
    let delay = 0;
    trails.forEach((r, i) => {
      if (played.has(sigs[i])) return;
      played.add(sigs[i]);
      const el = els.get(r.car);
      const car = race.cars.find((c) => c.id === r.car);
      if (!el || !car) return;
      const steps = Math.max(2, Math.ceil((r.to - r.from) * 2));
      const a0 = T.arc(r.from), a1 = T.arc(r.to);
      const frames: Keyframe[] = [];
      for (let k = 0; k < steps; k++) frames.push({ transform: tf(T.at(a0 + ((a1 - a0) * k) / steps)) });
      frames.push({ transform: tf(poseOf(car.pos, car.lane), r.spun ? 35 : 0) });
      const duration = Math.min(1100, 260 + (r.to - r.from) * 45);
      el.animate(frames, { duration, delay, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'backwards' });
      delay += Math.min(420, duration * 0.45);
    });
  });
</script>

<div class="board">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <svg
    bind:this={svg}
    viewBox="{vb.x} {vb.y} {vb.w} {vb.h}"
    preserveAspectRatio="xMidYMid meet"
    role="application"
    aria-label="{label}. Drag or use the arrow keys to look around, plus and minus to zoom, 0 to fit, C to find your car."
    tabindex="0"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onkeydown={key}
  >
    <g style="transform: translate({cam.x}px, {cam.y}px) scale({cam.k})" class="cam">
      <rect width={W} height={H} fill={circ.ground} />
      <rect width={W} height={H} fill="var(--ax-paper)" opacity="0.38" />
      <rect width={W} height={H} fill="url(#ax-paper)" />

      <!-- Run-off and gravel traps sit under the road. -->
      {#each gravel as [a, b] (a)}<path d={T.path(a - 0.5, b + 0.5)} stroke="url(#ax-gravel)" stroke-width={ROAD + 34} fill="none" stroke-linecap="round" />{/each}

      <!-- Scenery shadows, then the road, then the models, so a model can stand over a verge but never the road. -->
      {#each models as p (p.i)}<ellipse cx={p.x + 6} cy={p.y + 2} rx={p.a.w * 0.5} ry={p.a.w * 0.16} fill="url(#ax-shadow)" />{/each}

      <path d="M{geo.line.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z" stroke="#000" stroke-opacity="0.22" stroke-width={ROAD + 10} fill="none" transform="translate(5 6)" stroke-linejoin="round" />
      <path d="M{geo.line.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z" stroke="var(--ax-paper)" stroke-width={ROAD + 6} fill="none" stroke-linejoin="round" />
      {#each corners as k (k.i)}<path d={T.path(k.at - 1.6, k.at + 1.4)} stroke="var(--ax-red)" stroke-width={ROAD + 9} fill="none" stroke-dasharray="7 7" />{/each}
      <path d="M{geo.line.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z" stroke="var(--ax-asphalt)" stroke-width={ROAD} fill="none" stroke-linejoin="round" class="road" />
      {#each sectorRuns as s (s.k)}
        {#if s.mod === 'wet' || s.mod === 'flood'}
          {#each s.runs as [a, b] (a)}<path d={T.path(a - 0.5, b + 0.5)} stroke={s.mod === 'flood' ? '#3f7fa8' : '#6fa0bf'} stroke-opacity={s.mod === 'flood' ? 0.55 : 0.35} stroke-width={ROAD - 4} fill="none"><title>{sectorInfo(s.mod)?.name}: {sectorInfo(s.mod)?.text}</title></path>{/each}
        {/if}
      {/each}
      <path d="M{geo.line.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L')}Z" stroke="var(--ax-paper)" stroke-opacity="0.5" stroke-width="1.4" stroke-dasharray="10 12" fill="none" />
      {#each ticks as d, i (i)}<path {d} stroke="var(--ax-paper)" stroke-opacity="0.28" stroke-width="1.2" />{/each}

      {#each passes as [a, b] (a)}
        <path d={T.path(a - 0.5, b + 0.5, ROAD / 2 + 4)} stroke="var(--ax-mustard)" stroke-width="4" stroke-dasharray="2 6" fill="none" stroke-linecap="round" />
        <path d={T.path(a - 0.5, b + 0.5, -ROAD / 2 - 4)} stroke="var(--ax-mustard)" stroke-width="4" stroke-dasharray="2 6" fill="none" stroke-linecap="round" />
        {@const g = geo.spaces[a]}
        <g transform="translate({(g.x - Math.sin(g.a) * (ROAD / 2 + 22)).toFixed(1)} {(g.y + Math.cos(g.a) * (ROAD / 2 + 22)).toFixed(1)})">
          <rect x="-15" y="-11" width="30" height="22" rx="3" fill="var(--ax-mustard)" stroke="var(--ax-paper-ink)" stroke-width="1.5" />
          <text y="5" class="num small">{circ.pass[a]}</text>
          <title>Mountain pass: speed limit {circ.pass[a]} on entry</title>
        </g>
      {/each}

      <!-- Start line and grid. -->
      <g style="transform: translate({start.x}px, {start.y}px) rotate({(start.a * 180) / Math.PI}deg)">
        <rect x="-4" y={-ROAD / 2} width="8" height={ROAD} fill="url(#ax-check)" />
      </g>
      {#each Array.from({ length: Math.ceil(race.cars.length / 2) }, (_, i) => -1 - i) as pos (pos)}
        {#each [0, 1] as lane (lane)}
          {@const p = poseOf(pos, lane)}
          <path d="M-9,-6 L-13,-6 L-13,6 L-9,6" stroke="var(--ax-paper)" stroke-width="1.5" fill="none" style="transform: {tf(p)}" stroke-opacity="0.8" />
        {/each}
      {/each}

      {#each tunnels as [a, b] (a)}
        <path d={T.path(a - 0.5, b + 0.5)} stroke="#2b2722" stroke-width={ROAD + 12} fill="none" stroke-linecap="butt" />
        <path d={T.path(a - 0.5, b + 0.5)} stroke="#7d7466" stroke-width={ROAD + 12} fill="none" stroke-dasharray="3 9" stroke-opacity="0.6" />
        <path d={T.path(a - 0.5, b + 0.5)} stroke="#4a443c" stroke-width="3" fill="none" />
        <title>Tunnel: one lane, no drafting in and no boosting from inside</title>
      {/each}

      <!-- Last round's moves, faint, in each car's colours. -->
      {#each trails as r (r.car)}
        {@const car = race.cars.find((c) => c.id === r.car)}
        {#if car}
          <path d={T.path(r.from, r.to)} stroke={livery(car.livery).body} stroke-width="3" stroke-opacity="0.55" fill="none" stroke-linecap="round" class="trail" class:me={r.car === mine} />
        {/if}
      {/each}

      {#if previewPath}
        <path d={previewPath} stroke="var(--sprout)" stroke-width="5" stroke-dasharray="10 7" fill="none" stroke-linecap="round" class="plan" />
        {#if ghost}<use href="#ax-car" x="-15" y="-7" width="30" height="14" style="transform: {tf(ghost)}; color: var(--sprout)" opacity="0.45" />{/if}
        {#each preview!.checks as ck (ck.m)}
          {@const p = poseOf(ck.m, 0)}
          <g transform="translate({p.x.toFixed(1)} {p.y.toFixed(1)})">
            <circle r="11" fill={ck.cost ? 'var(--ax-red)' : 'var(--sprout)'} stroke="var(--ax-paper)" stroke-width="2" />
            <text y="4.5" class="num small light">{ck.cost ? `−${ck.cost}` : '✓'}</text>
          </g>
        {/each}
      {/if}

      {#each corners as k (k.i)}
        <g transform="translate({k.x.toFixed(1)} {k.y.toFixed(1)})" class="corner">
          <circle r="17" fill="var(--ax-paper)" stroke="var(--ax-paper-ink)" stroke-width="2" />
          <circle r="13.5" fill="none" stroke="var(--ax-red)" stroke-width="3" />
          <text y="6.5" class="num" class:changed={k.limit !== k.base}>{k.limit}</text>
          <title>{k.name}: corner limit {k.limit}{k.limit !== k.base ? ` (printed ${k.base})` : ''}</title>
        </g>
      {/each}

      {#each cars as { c, p, l } (c.id)}
        {@const art = paint(`car.${((c.livery % 8) + 8) % 8}`)}
        <g class="car" class:mine={c.id === mine} style="transform: {tf(p, c.spun ? 35 : 0)}" use:carEl={c.id}>
          {#if c.id === mine}<ellipse rx="21" ry="13" fill="none" stroke="var(--sprout)" stroke-width="3" />{/if}
          <ellipse cx="3" cy="4" rx="15" ry="7" fill="#000" opacity="0.28" />
          {#if art}
            <!-- The painted car is already in its livery colour; stripe and roundel stay vector so they match the chips. -->
            <image href={art} x="-15" y="-7" width="30" height="14" />
            <path d="M-12 -0.6 L12 -0.6 L12 0.6 L-12 0.6 Z" fill={l.stripe} opacity="0.85" />
            <circle cx="5" r="2.4" fill={l.roundel} stroke="#292d2b" stroke-width="0.5" />
          {:else}
            <use href="#ax-car" x="-15" y="-7" width="30" height="14" style="color: {l.body}; --stripe: {l.stripe}; --roundel: {l.roundel}" />
          {/if}
          <title>No. {c.number}, {c.name}{c.spun ? ', spun' : ''}</title>
        </g>
      {/each}

      {#each models as p (p.i)}
        {#if p.a.raster}
          <image href={p.a.raster} x={p.x - p.a.w * p.a.ax} y={p.y - p.a.h * p.a.ay} width={p.a.w} height={p.a.h} preserveAspectRatio="xMidYMax meet" />
        {:else}
          <use href="#{p.a.symbol}" x={p.x - p.a.w * p.a.ax} y={p.y - p.a.h * p.a.ay} width={p.a.w} height={p.a.h} />
        {/if}
      {/each}
    </g>
  </svg>
  <div class="cambar" role="toolbar" aria-label="Board view">
    <button class="btn small ghost" onclick={fit0} title="Fit the whole circuit (0)">Fit</button>
    {#if mine != null}<button class="btn small ghost" onclick={() => centre(mine)} title="Centre on your car (C)">My car</button>{/if}
    <button class="btn small ghost" onclick={() => zoomAt(mid().x, mid().y, 1.25)} aria-label="Zoom in">+</button>
    <button class="btn small ghost" onclick={() => zoomAt(mid().x, mid().y, 0.8)} aria-label="Zoom out">−</button>
  </div>
</div>

<style>
  .board {
    position: relative;
    min-height: 0;
    height: 100%;
    border-radius: var(--r-md, 8px);
    overflow: hidden;
    background: var(--ax-paper-2);
    box-shadow:
      0 1px 0 rgb(255 255 255 / 0.06) inset,
      0 18px 40px -18px rgb(0 0 0 / 0.7);
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
    outline: none;
  }
  svg:focus-visible {
    box-shadow: inset 0 0 0 3px var(--sprout);
  }
  .cam {
    transform-origin: 0 0;
  }
  .num {
    font: 700 20px/1 'Big Shoulders Stencil', var(--ax-serif);
    text-anchor: middle;
    fill: var(--ax-paper-ink);
  }
  .num.small {
    font-size: 14px;
  }
  .num.light {
    fill: #fff;
  }
  .num.changed {
    fill: var(--ax-red);
  }
  .trail.me {
    stroke-opacity: 0.9;
  }
  .cambar {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: var(--r-md, 8px);
    background: rgb(16 27 23 / 0.78);
  }
  .cambar .btn {
    min-width: 40px;
    min-height: 36px;
  }
</style>
