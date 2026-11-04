<script lang="ts">
  import { getContext } from 'svelte';
  import type { CardDef } from '../../../engine/deckbuilder';
  import { spine, typeLabel } from './text';

  let {
    def = null,
    id = undefined,
    zone = undefined,
    size = 'md',
    legal = false,
    selected = false,
    dim = false,
    label = undefined,
    onclick = undefined,
  }: {
    /** Null draws the card's back. */
    def?: CardDef | null;
    /** Set only where this physical card sits on the table: motion follows it by this id. */
    id?: number;
    /** Where the card is, as `play-2`, `discard-0` or `hand-1`, so motion knows where a new card came from. */
    zone?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    legal?: boolean;
    selected?: boolean;
    dim?: boolean;
    label?: string;
    onclick?: () => void;
  } = $props();

  /** A game's table can supply illustrations; a game without them draws plain cards. */
  const artOf = getContext<((key: string) => string | null) | undefined>('deck-art');
  const art = $derived(def && size !== 'xs' ? (artOf?.(def.key) ?? null) : null);

  const value = $derived.by(() => {
    if (!def) return null;
    if (def.coins !== undefined) return { text: `+${def.coins}`, kind: 'coins' };
    if (typeof def.vp === 'number') return { text: `${def.vp}`.replace('-', '−'), kind: def.vp < 0 ? 'minus' : 'points' };
    if (def.vp) return { text: 'per' in def.vp ? `${def.vp.each}/${def.vp.per}` : `${def.vp.base}+`, kind: 'points' };
    return null;
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
  this={onclick ? 'button' : 'div'}
  {...onclick ? { type: 'button' } : {}}
  class="dc {size}"
  class:face={!!def}
  class:back={!def}
  class:legal
  class:selected
  class:dim
  data-card={id}
  data-key={def?.key}
  data-zone={zone}
  aria-label={label ?? def?.name ?? 'Face-down card'}
  aria-pressed={onclick && (legal || selected) ? selected : undefined}
  style={def ? `--spine:${spine(def.types)}` : undefined}
  {onclick}
>
  {#if def}
    <span class="edge" aria-hidden="true"></span>
    <span class="head">
      <span class="cost num">{def.cost}</span>
      <span class="name label">{def.name}</span>
    </span>
    {#if art}<span class="art" aria-hidden="true">{@html art}</span>{/if}
    {#if value}<span class="value num {value.kind}" class:over={!!art}>{value.text}</span>{/if}
    {#if size === 'lg' || size === 'xl'}<span class="text">{def.text}</span>{/if}
    {#if size !== 'xs' && size !== 'sm'}<span class="types">{def.typeLine ?? typeLabel(def.types)}</span>{/if}
  {:else}
    <span class="mark" aria-hidden="true"></span>
  {/if}
</svelte:element>

<style>
  .dc {
    --w: 76px;
    --name: 11px;
    position: relative;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: var(--w);
    aspect-ratio: 5 / 7;
    padding: 5px 5px 5px 10px;
    border: 0;
    border-radius: 7px;
    font: inherit;
    text-align: left;
    color: var(--card-ink, #2c2118);
    overflow: hidden;
    box-shadow:
      var(--shadow-1),
      inset 0 0 0 1px var(--card-rim, rgb(44 33 24 / 0.22));
  }
  .xs {
    --w: 44px;
    --name: 8px;
    gap: 1px;
    padding: 2px 2px 2px 6px;
    border-radius: 4px;
  }
  .sm {
    --w: 60px;
    --name: 9.5px;
    gap: 2px;
    padding: 4px 3px 3px 8px;
    border-radius: 5px;
  }
  .lg {
    --w: 112px;
    --name: 12.5px;
    padding: 7px 7px 6px 13px;
    border-radius: 9px;
  }
  .xl {
    --w: 240px;
    --name: 22px;
    gap: 12px;
    padding: 14px 14px 12px 28px;
    border-radius: 16px;
  }
  .face {
    background: var(--card-face, #e8dec9);
  }
  .edge {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: var(--spine);
  }
  .xs .edge {
    width: 3px;
  }
  .lg .edge {
    width: 7px;
  }
  .xl .edge {
    width: 14px;
  }
  .head {
    display: flex;
    gap: 4px;
    align-items: flex-start;
    min-width: 0;
  }
  .cost {
    flex: none;
    display: grid;
    place-items: center;
    width: 1.5em;
    height: 1.5em;
    border-radius: 50%;
    font-size: var(--name);
    font-weight: 700;
    color: var(--card-cost-ink, var(--coin-ink));
    background: var(--card-cost, var(--coin));
  }
  .xs .cost {
    display: none;
  }
  .name {
    min-width: 0;
    font-size: var(--name);
    line-height: 1.12;
    overflow-wrap: break-word;
    hyphens: auto;
  }
  .value {
    align-self: center;
    margin-block: auto;
    font-size: calc(var(--w) * 0.3);
    font-weight: 800;
    line-height: 1;
  }
  .art {
    flex: none;
    display: block;
    aspect-ratio: 16 / 9;
    border-radius: 3px;
    overflow: hidden;
  }
  .art :global(svg),
  .art :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .value.over {
    margin-block: 0;
    font-size: calc(var(--w) * 0.17);
  }
  .coins {
    color: var(--card-coins, #8a6616);
  }
  .points {
    color: var(--card-points, #63497a);
  }
  .minus {
    color: var(--card-minus, #7d3a35);
  }
  .text {
    margin-top: 2px;
    font-size: 10.5px;
    line-height: 1.22;
    overflow: hidden;
  }
  .xl .text {
    font-size: 17px;
    line-height: 1.34;
  }
  .types {
    margin-top: auto;
    font-size: 8.5px;
    line-height: 1.1;
    color: var(--card-ink-2, rgb(44 33 24 / 0.72));
  }
  .xl .types {
    font-size: 13px;
  }
  .back {
    align-items: center;
    justify-content: center;
    background: var(--ground-3);
    box-shadow:
      var(--shadow-1),
      inset 0 0 0 1px var(--rim-hi);
  }
  .mark {
    width: 46%;
    aspect-ratio: 5 / 7;
    border-radius: 3px;
    border: 1.5px solid var(--rim-hi);
    transform: rotate(45deg) scale(0.7);
  }
  button.dc {
    cursor: pointer;
    transition: transform var(--dur-1) var(--ease-out);
  }
  button.dc:hover:not(:disabled) {
    transform: translateY(-4px);
  }
  .legal {
    outline: 2px solid var(--sprout);
    outline-offset: 1px;
  }
  .selected {
    outline: 3px solid var(--sprout);
    outline-offset: 1px;
    transform: translateY(-10px);
  }
  button.selected:hover:not(:disabled) {
    transform: translateY(-12px);
  }
  .dim {
    opacity: 0.55;
  }
</style>
