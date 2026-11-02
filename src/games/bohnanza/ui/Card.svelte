<script lang="ts">
  import { BEANS, type Bean } from '../rules/cards';
  import { ART, ASSET_OVERRIDES } from './art';

  let {
    bean = null,
    id = undefined,
    size = 'md',
    selected = false,
    legal = false,
    dim = false,
    tag = undefined,
    label = undefined,
    onclick = undefined,
    onpointerdown = undefined,
  }: {
    /** null = face down. */
    bean?: Bean | null;
    id?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    selected?: boolean;
    legal?: boolean;
    dim?: boolean;
    /** Small ribbon (e.g. "FRONT"). */
    tag?: string;
    label?: string;
    onclick?: (e: MouseEvent) => void;
    onpointerdown?: (e: PointerEvent) => void;
  } = $props();

  const art = $derived(bean ? ART[bean] : null);
  const info = $derived(bean ? BEANS[bean] : null);
  const image = $derived(bean ? ASSET_OVERRIDES[bean] : undefined);
  const meter = $derived(info ? info.meter.map((need, i) => ({ need, coins: i + 1 })).filter((m) => m.need !== null) : []);
  const name = $derived(info ? info.name.replace(/ Bean$/, '') : '');
  const aria = $derived(label ?? (info ? info.name : 'Face-down card'));
</script>

<svelte:element
  this={onclick ? 'button' : 'div'}
  class="card {size}"
  class:back={!bean}
  class:selected
  class:legal
  class:dim
  class:interactive={!!onclick}
  data-card={id}
  data-bean={bean ?? undefined}
  style={art ? `--bg:${art.bg};--fg:${art.fg};--mark:${art.mark};--ink:${art.ink}` : undefined}
  aria-label={aria}
  aria-pressed={onclick ? selected : undefined}
  type={onclick ? 'button' : undefined}
  role={onclick ? undefined : 'img'}
  {onclick}
  {onpointerdown}
>
  {#if art && info}
    {#if image}
      <img src={image} alt="" draggable="false" />
    {:else}
      <span class="count num">{info.count}</span>
      <svg class="glyph" viewBox="0 0 100 100" aria-hidden="true">{@html art.svg}</svg>
      <span class="name">{name}</span>
      {#if meter.length}
        <span class="meter" aria-hidden="true">
          {#each meter as m (m.coins)}
            <span class="m"><b class="num">{m.need}</b><i style="--n:{m.coins}"></i></span>
          {/each}
        </span>
      {/if}
    {/if}
  {:else}
    <span class="back-mark" aria-hidden="true">
      <svg viewBox="0 0 100 100"><path d="M30 34C42 16 76 20 74 48c-2 20-22 22-28 14-5-6-12-1-18-4-11-5-8-17 2-24Z" /></svg>
    </span>
  {/if}
  {#if tag}<span class="tag">{tag}</span>{/if}
</svelte:element>

<style>
  .card {
    --w: var(--card-w);
    position: relative;
    flex: none;
    display: block;
    width: var(--w);
    aspect-ratio: 5 / 7;
    border-radius: calc(var(--w) * 0.09);
    background: var(--bg);
    color: var(--ink);
    border: 1px solid rgb(0 0 0 / 0.35);
    box-shadow:
      inset 0 0 0 calc(var(--w) * 0.04) rgb(255 255 255 / 0.08),
      var(--shadow-1);
    padding: 0;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition:
      transform var(--dur-2) var(--ease-out),
      box-shadow var(--dur-2) var(--ease-out),
      opacity var(--dur-2) var(--ease-out);
    font-family: var(--font-label);
  }
  .xs {
    --w: 30px;
  }
  .sm {
    --w: 52px;
  }
  .md {
    --w: var(--card-w);
  }
  .lg {
    --w: 96px;
  }
  .xl {
    --w: min(240px, 58vw);
  }
  .interactive {
    cursor: pointer;
  }
  .interactive:hover {
    transform: translateY(-4px);
    box-shadow:
      inset 0 0 0 calc(var(--w) * 0.04) rgb(255 255 255 / 0.1),
      var(--shadow-lift);
  }
  .legal {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  .selected {
    transform: translateY(-10px);
    outline: 3px solid var(--sprout);
    outline-offset: 2px;
    box-shadow: var(--shadow-lift);
  }
  .selected:hover {
    transform: translateY(-12px);
  }
  .dim {
    opacity: 0.55;
    filter: saturate(0.55);
  }
  .count {
    position: absolute;
    top: 4%;
    left: 8%;
    font-size: calc(var(--w) * 0.2);
    font-weight: 800;
    line-height: 1;
    opacity: 0.9;
  }
  .glyph {
    position: absolute;
    left: 10%;
    top: 12%;
    width: 80%;
    height: 50%;
  }
  .name {
    position: absolute;
    left: 0;
    right: 0;
    top: 60%;
    text-align: center;
    font-size: calc(var(--w) * 0.155);
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
    white-space: nowrap;
  }
  .meter {
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: 5%;
    display: flex;
    justify-content: center;
    gap: 6%;
    border-top: 1px solid color-mix(in srgb, var(--ink) 30%, transparent);
    padding-top: 5%;
  }
  .m {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--w) * 0.02);
  }
  .m b {
    font-size: calc(var(--w) * 0.14);
    font-weight: 700;
    line-height: 1;
  }
  .m i {
    display: block;
    height: calc(var(--w) * 0.05);
    width: calc(var(--w) * 0.05 * var(--n) + var(--w) * 0.025 * (var(--n) - 1));
    background: radial-gradient(circle at center, var(--coin) 60%, transparent 62%) 0 0 / calc(var(--w) * 0.075) 100% repeat-x;
  }
  .xs .meter,
  .xs .name,
  .xs .count {
    display: none;
  }
  .xs .glyph {
    top: 18%;
    height: 64%;
  }
  .sm .meter {
    display: none;
  }
  .sm .name {
    top: auto;
    bottom: 9%;
    font-size: calc(var(--w) * 0.17);
  }
  .sm .glyph {
    top: 16%;
    height: 56%;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .back {
    --bg: #3a2a1d;
    background:
      repeating-linear-gradient(90deg, rgb(0 0 0 / 0.12) 0 2px, transparent 2px 9px),
      linear-gradient(180deg, #4a3624, #2f2217);
    border-color: #1a120c;
  }
  .back-mark {
    position: absolute;
    inset: 22% 18%;
    border: 1.5px solid rgb(232 184 74 / 0.45);
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .back-mark svg {
    width: 70%;
    fill: rgb(232 184 74 / 0.55);
  }
  .tag {
    position: absolute;
    top: 0;
    right: 0;
    background: var(--sprout);
    color: var(--sprout-ink);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 2px 6px;
    border-bottom-left-radius: 6px;
  }
  :global(.in-flight) {
    z-index: 80;
    box-shadow: var(--shadow-lift) !important;
  }
  :global([data-perf='low']) .card {
    box-shadow: none;
  }
</style>
