<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  /** A hand of a game's own cards, sized from its container so it fits any column. `cardWidth` is a card's natural width. */
  let { items, cardWidth, card }: { items: T[]; cardWidth: number; card: Snippet<[T]> } = $props();

  let w = $state(0);
  /** Narrow columns show the middle few, large enough to read as cards. */
  const shown = $derived.by(() => {
    if (!w || w >= 340 || items.length <= 3) return items;
    const from = Math.floor((items.length - 3) / 2);
    return items.slice(from, from + 3);
  });
  const place = (i: number) => {
    const n = shown.length;
    const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
    const reach = (n <= 3 ? 0.22 : 0.3) * w;
    return `--x:${(t * reach).toFixed(1)}px;--y:${(t * t * w * 0.035).toFixed(1)}px;--t:${t.toFixed(3)};--s:${((w * 0.36) / cardWidth).toFixed(3)};z-index:${i}`;
  };
</script>

<div class="fan" bind:clientWidth={w} aria-hidden="true">
  {#if w}
    {#each shown as item, i (i)}
      <div class="slot" style={place(i)}>{@render card(item)}</div>
    {/each}
  {/if}
</div>

<style>
  .fan {
    position: relative;
    width: 100%;
    aspect-ratio: 8 / 5;
    --spread: 1;
    pointer-events: none;
  }
  .slot {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 0;
    height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Every card shares one pivot, so the hand opens as a hand does; a little perspective stops it reading as flat. */
    transform: translate(calc(var(--x) * var(--spread)), var(--y)) rotate(calc(var(--t) * 15deg * var(--spread))) perspective(900px) rotateY(calc(var(--t) * -7deg)) scale(var(--s));
    transition: transform var(--dur-2) var(--ease-out);
    filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.32));
  }
  /* Only where a pointer can hover: the fan opens slightly as you reach for the table. */
  @media (hover: hover) and (pointer: fine) {
    :global(.feature:hover) .fan,
    :global(.feature:focus-within) .fan {
      --spread: 1.1;
    }
  }
</style>
