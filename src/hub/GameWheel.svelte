<script lang="ts" module>
  import type { Component } from 'svelte';
  import type { CatalogEntry } from './catalog';

  /** Each game's fan module, loaded once and kept across visits to the wheel. */
  const fans = new Map<string, Promise<{ default: Component }>>();
  export function fanOf(g: CatalogEntry) {
    if (!g.fan) return null;
    let p = fans.get(g.id);
    if (!p) fans.set(g.id, (p = g.fan()));
    return p;
  }
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { settings } from '../client/lib/settings.svelte';
  import { sfx } from '../client/lib/sound';
  import CardFan from './CardFan.svelte';
  import Icon from './Icon.svelte';
  import { fade, landing, layout, mod, offset, openness, ring, span, spring, type WheelLayout } from './wheel';

  /**
   * The home page's games on a vertical wheel. One number, `pos`, says where the wheel is; every frame each nearby game
   * is drawn from its distance to it, written straight to the element so nothing else re-renders. Svelte only hears
   * about it when the game in the centre changes.
   */
  let { games, focus, onopen, onfocus }: { games: CatalogEntry[]; focus: string; onopen: (g: CatalogEntry) => void; onfocus: (id: string) => void } = $props();

  const n = $derived(games.length);
  const start = Math.max(0, untrack(() => games.findIndex((g) => g.id === focus)));
  let pos = start;
  let vel = 0;
  let target = start;
  let mode: 'rest' | 'spring' | 'drag' | 'wheel' = 'rest';
  /** The game in the centre, as Svelte sees it. */
  let index = $state(start);
  let settled = $state(start);
  let detent = start;
  let moved = false;

  let stage = $state<HTMLElement>();
  let wheel = $state<HTMLElement>();
  let box = $state({ w: 0, h: 0 });
  let content = $state(0);
  const narrow = $derived(box.w < 640);
  const L: WheelLayout = $derived.by(() => {
    const min = narrow ? Math.max(400, content + 150) : Math.max(340, content);
    return layout(box.h, n, min, narrow ? 620 : 470, narrow ? 52 : 58);
  });
  /** Distance the pointer moves per game: the step through the centre, so the open game follows the finger. */
  const pitch = () => (L.focus + L.row) / 2 + L.gap;
  const reach = $derived(Math.min(Math.floor(n / 2), (L.visible - 1) / 2 + 1));

  /** Only the games near the centre are in the page; each at most once, however few games there are. */
  const near = $derived.by(() => {
    const seen = new Set<number>();
    for (let k = -reach; k <= reach; k++) seen.add(mod(index + k, n));
    return [...seen].sort((a, b) => a - b);
  });
  /** Games whose art is in the page: the one at rest and its neighbours, fixed while the wheel moves so nothing mounts mid-turn. */
  let art = $state(untrack(() => around(start)));
  function around(i: number) {
    return new Set([mod(i - 1, n), i, mod(i + 1, n)]);
  }
  const rows = new Map<number, HTMLElement>();
  const glows = new Map<number, HTMLElement>();

  const players = (g: CatalogEntry) => (g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`);

  function paint() {
    const k = Math.round(pos);
    if (k !== detent) {
      detent = k;
      index = mod(k, n);
      tick();
    }
    const edge = (L.visible - 1) / 2;
    for (const [i, el] of rows) {
      const d = ring(i - pos, n);
      const a = Math.abs(d);
      const op = fade(d, L.visible);
      // A little cylinder: rows lean back as they leave the centre and shrink a touch past the first neighbour.
      const lean = Math.max(-edge - 1, Math.min(edge + 1, d)) * -5;
      el.style.transform = `translate3d(0, ${offset(d, L).toFixed(2)}px, 0) rotateX(${lean.toFixed(2)}deg) scale(${(1 - Math.max(0, a - 1) * 0.035).toFixed(4)})`;
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op < 0.005 ? 'hidden' : '';
      el.style.zIndex = String(100 - Math.round(a * 10));
      set(el, '--s', span(d));
      set(el, '--f', openness(d));
      set(el, '--m', Math.max(0, 1 - Math.abs(a - 1) * 1.6));
      const glow = glows.get(i);
      if (glow) glow.style.opacity = openness(d).toFixed(3);
    }
  }
  /** Custom properties restyle everything under them, so only write one that has really changed. */
  function set(el: HTMLElement, name: string, v: number) {
    const s = v.toFixed(3);
    if (el.style.getPropertyValue(name) !== s) el.style.setProperty(name, s);
  }

  let raf = 0;
  let last = 0;
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (mode === 'spring') {
      [pos, vel] = spring(pos, vel, target, dt);
      if (Math.abs(pos - target) < 0.002 && Math.abs(vel) < 0.05) {
        pos = target;
        vel = 0;
        mode = 'rest';
      }
    }
    paint();
    if (mode === 'spring') kick();
    else if (mode === 'rest') rest();
  }

  /** Head for game `to` (unwrapped), carrying on from wherever the wheel is now: a new aim replaces the old one. */
  function snap(to: number, v = vel) {
    target = Math.max(Math.round(pos) - 3, Math.min(Math.round(pos) + 3, to));
    moved = true;
    if (settings.instant) {
      pos = target;
      vel = 0;
      mode = 'rest';
      paint();
      rest();
      return;
    }
    vel = v;
    mode = 'spring';
    kick();
  }
  const step = (by: number) => snap((mode === 'spring' ? target : Math.round(pos)) + by, mode === 'spring' ? vel : 0);
  /** Bring game i to the centre the short way round. */
  const show = (i: number) => snap(Math.round(pos + ring(i - pos, n)), vel);

  function rest() {
    if (settled === index) return;
    settled = index;
    art = around(index);
    onfocus(games[index].id);
    if (moved) play(sfx.select, 0);
  }

  let lastSound = 0;
  /** Sounds only after the person has touched the page (browsers block audio before that), and never in a burst. */
  function play(s: () => void, gap: number) {
    const t = performance.now();
    if (t - lastSound < gap || !navigator.userActivation?.hasBeenActive) return;
    lastSound = t;
    s();
  }
  const tick = () => play(sfx.detent, 45);

  // Wheel and trackpad. A mouse wheel clicks one game per notch; a trackpad glides and then settles on the nearest.
  let gesture: 'notch' | 'glide' = 'glide';
  let lastWheel = -1e9;
  let idle = 0;
  function onwheel(e: WheelEvent) {
    if (e.ctrlKey) return; // pinch to zoom stays with the browser
    e.preventDefault();
    const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const dy = raw * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1);
    if (!dy) return;
    if (e.timeStamp - lastWheel > 160) gesture = e.deltaMode !== 0 || Math.abs(dy) >= 50 ? 'notch' : 'glide';
    lastWheel = e.timeStamp;
    if (gesture === 'notch') return step(Math.sign(dy));
    mode = 'wheel';
    moved = true;
    pos += dy / pitch();
    // The tail of a glide is drawn toward the nearest game, so it lands rather than stops.
    if (Math.abs(dy) < 4) pos += (Math.round(pos) - pos) * 0.2;
    kick();
    clearTimeout(idle);
    idle = window.setTimeout(() => snap(Math.round(pos), 0), 90);
  }

  // Touch, pen and mouse drags. A press that doesn't travel stays a click.
  let press: { y: number; pos: number; id: number } | null = null;
  let samples: { t: number; pos: number }[] = [];
  let dragged = false;
  function ondown(e: PointerEvent) {
    if (e.button !== 0) return;
    press = { y: e.clientY, pos, id: e.pointerId };
    dragged = false;
    samples = [];
  }
  function onmove(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    const dy = e.clientY - press.y;
    if (!dragged) {
      if (Math.abs(dy) < 8) return;
      dragged = true;
      moved = true;
      wheel!.setPointerCapture(e.pointerId);
      // Catch the wheel mid-flight: the finger takes over from where it is.
      press = { y: e.clientY, pos, id: e.pointerId };
      mode = 'drag';
      return;
    }
    pos = press.pos - dy / pitch();
    samples.push({ t: e.timeStamp, pos });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
    kick();
  }
  function onup(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    press = null;
    if (!dragged) return;
    const first = samples[0];
    const v = first && e.timeStamp > first.t ? ((pos - first.pos) / (e.timeStamp - first.t)) * 1000 : 0;
    snap(landing(pos, v), Math.max(-12, Math.min(12, v)));
  }
  /** A drag that ends over a button must not press it. */
  function onclickcapture(e: MouseEvent) {
    if (!dragged) return;
    dragged = false;
    e.preventDefault();
    e.stopPropagation();
  }

  function onkeydown(e: KeyboardEvent) {
    const by = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1, PageUp: -3, PageDown: 3 }[e.key];
    if (by) {
      e.preventDefault();
      return step(by);
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      return show(e.key === 'Home' ? 0 : n - 1);
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target === wheel) {
      e.preventDefault();
      open(games[index]);
    }
  }

  /** Open Table only from a wheel at rest on that game, so a swipe can't launch one. */
  function open(g: CatalogEntry) {
    if (g.status !== 'available' || mode === 'drag' || Math.abs(pos - Math.round(pos)) > 0.15 || games[index] !== g) return;
    onopen(g);
  }

  // Keep keyboard focus on the wheel when the game it was on moves out of the centre (its controls go inert).
  $effect(() => {
    void index;
    const a = document.activeElement;
    if (a && wheel?.contains(a) && a !== wheel && !a.closest('.row.on')) wheel.focus({ preventScroll: true });
  });

  // Repaint whenever the layout or the set of rows changes; between those, only motion repaints.
  $effect(() => {
    void L;
    void near;
    paint();
  });

  /** The open game's own content, so a large text size gets a taller game (and the page scrolls) rather than clipping. */
  function measure(el: HTMLElement) {
    const ro = new ResizeObserver(() => {
      if (el.closest('.row.on')) content = el.offsetHeight + (narrow ? 0 : 48);
    });
    ro.observe(el);
    return { destroy: () => ro.disconnect() };
  }
  /** Where the title sits in the open game, so a shut row can carry it to its middle. */
  function titled(el: HTMLElement) {
    const row = el.closest<HTMLElement>('.row')!;
    const ro = new ResizeObserver(() => row.style.setProperty('--ty', `${(row.offsetHeight / 2 - (el.offsetTop + el.offsetHeight / 2)).toFixed(1)}px`));
    ro.observe(row);
    ro.observe(el);
    return { destroy: () => ro.disconnect() };
  }
  function track(el: HTMLElement, [map, i]: [Map<number, HTMLElement>, number]) {
    map.set(i, el);
    return { destroy: () => void map.delete(i) };
  }

  onMount(() => {
    const ro = new ResizeObserver(() => (box = { w: stage!.clientWidth, h: stage!.clientHeight }));
    ro.observe(stage!);
    // Load every game's art while the page is idle, so a fast spin never waits for it.
    const warm = window.setTimeout(() => games.forEach(fanOf), 400);
    return () => {
      ro.disconnect();
      clearTimeout(warm);
      clearTimeout(idle);
      cancelAnimationFrame(raf);
    };
  });
</script>

<div class="glows" aria-hidden="true">
  {#each near as i (games[i].id)}
    <div class="glow" style="--accent:{games[i].accent}" use:track={[glows, i]}></div>
  {/each}
</div>

<div class="stage" bind:this={stage}>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (a carousel region takes the arrow keys) -->
  <div
    class="wheel"
    class:narrow
    bind:this={wheel}
    style="height:{L.height}px;--focus:{L.focus}px;--row:{L.row}px;--open:{L.focus - L.row}px;--shut:{(L.row - 32) / (L.focus - 32)}"
    role="region"
    aria-roledescription="carousel"
    aria-label="Games. Use the arrow keys to turn, Enter to open."
    tabindex="0"
    {onwheel}
    onpointerdown={ondown}
    onpointermove={onmove}
    onpointerup={onup}
    onpointercancel={onup}
    onclickcapture={onclickcapture}
    {onkeydown}
  >
    {#each near as i (games[i].id)}
      {@const g = games[i]}
      {@const on = i === index}
      <div class="row" class:on class:soon={g.status === 'soon'} use:track={[rows, i]} style="--accent:{g.accent};--title:{g.titleFont ?? 'var(--font-label)'}">
        <div class="plate top"></div>
        <div class="plate body"></div>
        <div class="plate bottom"></div>
        {#if !on}
          <button class="pick" tabindex="-1" aria-hidden="true" onclick={() => show(i)}></button>
        {/if}
        <div class="sheet" inert={!on}>
          <div class="scene">
            {#if art.has(i)}
              {@const fan = fanOf(g)}
              {#if fan}
                {#await fan then m}<m.default />{:catch}{@render blanks()}{/await}
              {:else}
                {@render blanks()}
              {/if}
            {/if}
          </div>
          <div class="info" use:measure>
            <h2 class="title" class:plain={!!g.titleFont} id="game-{g.id}" use:titled style="--len:{g.name.length};{on ? `view-transition-name:title-${g.id}` : ''}">{g.name}</h2>
            <div class="more">
              <p class="pitch">{g.pitch}</p>
              {#if g.status === 'soon'}
                <p class="pill">Coming soon</p>
              {:else}
                <ul class="facts">
                  <li><Icon name="users" size={16} /><span class="num">{players(g)}</span> players</li>
                  <li><Icon name="clock" size={16} /><span class="num">{g.minutes}</span> min</li>
                </ul>
                <button class="btn primary open" aria-haspopup="dialog" aria-label="Open Table: {g.name}" onclick={() => open(g)}>Open Table <Icon name="arrowRight" /></button>
              {/if}
            </div>
          </div>
        </div>
        <p class="meta" aria-hidden="true">
          {#if g.status === 'soon'}Soon{:else}<Icon name="users" size={14} /><span class="num">{players(g)}</span><Icon name="clock" size={14} /><span class="num">{g.minutes}</span>{/if}
        </p>
      </div>
    {/each}
  </div>

  <nav class="rail" aria-label="All games">
    <ol>
      {#each games as g, i (g.id)}
        <li><button tabindex="-1" aria-label="Show {g.name}" aria-current={i === index ? 'true' : undefined} onclick={() => show(i)}></button></li>
      {/each}
    </ol>
    <p class="count num" aria-hidden="true">{index + 1}<span> / {n}</span></p>
  </nav>
  <p class="hint" aria-hidden="true"><span class="fine">Scroll or use ↑ ↓ to turn</span><span class="coarse">Swipe to turn</span></p>
  <p class="visually-hidden" aria-live="polite">{games[settled].name}, {settled + 1} of {n}</p>
</div>

{#snippet blanks()}
  <CardFan items={[0, 1, 2]} cardWidth={100}>
    {#snippet card()}<span class="blank"></span>{/snippet}
  </CardFan>
{/snippet}

<style>
  /* The light of the game in the centre, cross-faded as the wheel turns: only opacity changes, so nothing repaints. */
  .glows {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }
  .glow {
    position: absolute;
    inset: 0;
    opacity: 0;
    background: radial-gradient(70% 60% at 62% 62%, color-mix(in srgb, var(--accent) 34%, transparent), transparent 72%);
    will-change: opacity;
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  .wheel {
    position: relative;
    flex: 1;
    max-width: 1040px;
    perspective: 1600px;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    outline-offset: 6px;
    border-radius: var(--r-lg);
  }
  .row {
    --s: 0;
    --f: 0;
    --m: 0;
    position: absolute;
    left: 0;
    right: 0;
    top: calc(50% - var(--focus) / 2);
    height: var(--focus);
    pointer-events: none;
    will-change: transform, opacity;
    container-type: inline-size;
  }
  /* The plate is two rounded caps that slide together over a body that stretches between them: the game grows and
     shrinks by transforms alone. The caps are --r-lg tall; --shut is the body's shut height over its open height. */
  .plate {
    position: absolute;
    left: 0;
    right: 0;
    height: var(--r-lg);
    background: color-mix(in srgb, var(--accent) 24%, #1f1a17);
    border: 1px solid rgb(255 255 255 / 0.07);
  }
  .plate.top {
    top: 0;
    border-bottom: 0;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    transform: translateY(calc((1 - var(--s)) * var(--open) / 2));
  }
  .plate.body {
    top: calc(var(--r-lg) - 1px);
    height: calc(var(--focus) - 2 * var(--r-lg) + 2px);
    border-block: 0;
    transform: scaleY(calc(var(--shut) + (1 - var(--shut)) * var(--s)));
  }
  .plate.bottom {
    bottom: 0;
    border-top: 0;
    border-radius: 0 0 var(--r-lg) var(--r-lg);
    transform: translateY(calc((var(--s) - 1) * var(--open) / 2));
  }
  .soon .plate {
    background: var(--ground-1);
    border-color: var(--rim);
  }
  .pick {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(50% - var(--row) / 2);
    height: var(--row);
    padding: 0;
    border: 0;
    border-radius: var(--r-lg);
    background: transparent;
    pointer-events: auto;
    z-index: 3;
  }
  @media (hover: hover) and (pointer: fine) {
    .pick:hover {
      background: rgb(255 255 255 / 0.04);
    }
  }

  .sheet {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 46% 1fr;
    grid-template-areas: 'info scene';
  }
  .narrow .sheet {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas: 'scene' 'info';
  }
  .info {
    grid-area: info;
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding: 24px clamp(20px, 4cqw, 40px);
    min-width: 0;
  }
  .narrow .info {
    padding: 0 16px 18px;
    gap: 10px;
  }
  .title {
    --ts: 0.5;
    margin: 0;
    /* Shut, the title is drawn at --ts scale, so it has room for that much more before it trims. */
    max-width: calc(100% / var(--ts));
    font-family: var(--title);
    font-weight: 800;
    /* Long names come down in size so the open title fits its column. */
    font-size: max(24px, min(46px, 4.4cqw, calc(70cqw / var(--len))));
    line-height: 1.05;
    letter-spacing: 0.015em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ink);
    transform-origin: left center;
    /* Shut, the title rides in the middle of its row at about half size; it grows into place as the game opens. */
    transform: translateY(calc(var(--ty, 0px) * (1 - var(--s)))) scale(calc(var(--ts) + (1 - var(--ts)) * var(--s)));
  }
  .narrow .title {
    --ts: 0.68;
    font-size: max(20px, min(28px, calc(160cqw / var(--len))));
  }
  .title.plain {
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
  }
  .more {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    width: 100%;
    opacity: calc(var(--f) * 2 - 1);
    transform: translateY(calc((1 - var(--f)) * 14px));
  }
  .narrow .more {
    gap: 10px;
  }
  .pitch {
    margin: 0;
    max-width: 44ch;
    color: var(--ink-2);
    text-wrap: pretty;
  }
  .narrow .pitch {
    font-size: 14px;
  }
  .facts {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    margin: 0;
    padding: 0;
    font-size: 14px;
    color: var(--ink-2);
  }
  .facts li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .open {
    min-height: 48px;
    padding-inline: 22px;
    pointer-events: auto;
    transition: transform var(--dur-1) var(--ease-out);
  }
  .open:active {
    transform: scale(0.97);
  }
  .narrow .open {
    width: 100%;
  }
  .pill {
    margin: 0;
    padding: 2px 10px;
    border-radius: 99px;
    border: 1px solid var(--rim-hi);
    font-size: 13px;
    color: var(--ink-2);
  }
  .scene {
    grid-area: scene;
    position: relative;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 20px 12px 0;
    container-type: size;
    opacity: calc(var(--f) * 3);
  }
  .narrow .scene {
    padding: 8px 12px 0;
  }
  /* The fan keeps its proportions and fits whichever is tighter, the width or the height. */
  .scene > :global(*) {
    width: min(100%, calc(100cqh * 1.6));
  }
  /* Only three rows hold art. Their moving parts get layers of their own, so a turn moves them without repainting. */
  .scene :global(.slot),
  .title,
  .more {
    will-change: transform;
  }
  .meta {
    position: absolute;
    right: 20px;
    top: 50%;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ink-2);
    opacity: var(--m);
    transform: translateY(-50%);
  }
  .meta :global(svg:not(:first-child)) {
    margin-left: 8px;
  }

  .rail {
    position: absolute;
    right: -36px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .rail ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .rail button {
    display: block;
    width: 20px;
    height: 14px;
    padding: 0;
    border: 0;
    background: transparent;
    position: relative;
  }
  .rail button::after {
    content: '';
    position: absolute;
    left: 7px;
    top: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--rim-hi);
    transition:
      transform var(--dur-2) var(--ease-out),
      opacity var(--dur-2) var(--ease-out);
  }
  .rail button[aria-current='true']::after {
    background: var(--ink);
    transform: scale(1.35);
  }
  .count {
    margin: 0;
    font-size: 12px;
    color: var(--ink-2);
  }
  .count span {
    color: var(--ink-3);
  }
  .hint {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translate(-50%, 100%);
    margin: 0;
    padding-top: 6px;
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .coarse {
    display: none;
  }
  @media (pointer: coarse) {
    .coarse {
      display: inline;
    }
    .fine {
      display: none;
    }
  }
  /* Too narrow for a rail beside the wheel: the position is still announced, and the count stays. */
  @media (max-width: 1119px) {
    .rail ol {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .rail {
      top: auto;
      bottom: 0;
      right: 4px;
      transform: translateY(100%);
      padding-top: 6px;
    }
  }

  .blank {
    flex: none;
    display: block;
    width: 100px;
    aspect-ratio: 5 / 7;
    border-radius: 8px;
    background: var(--accent);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
  }
  .soon .blank {
    background: var(--ground-2);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
</style>
