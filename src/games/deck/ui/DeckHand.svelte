<script lang="ts">
  import type { CardDef, CardRefView } from '../../../engine/deckbuilder';
  import DeckCard from './DeckCard.svelte';

  let {
    cards,
    defs,
    seat,
    legal,
    selected,
    onpick,
  }: {
    /** In the server's order. The hand is never re-sorted. */
    cards: CardRefView[];
    defs: Record<string, CardDef>;
    seat: number;
    legal: Set<number>;
    selected: Set<number>;
    onpick: (id: number) => void;
  } = $props();

  let width = $state(600);
  // Must match the rendered card widths (lg 112px, md 76px).
  const big = $derived(width > 520);
  const cw = $derived(big ? 112 : 76);
  const spacing = $derived(cards.length > 1 ? Math.min(cw * 0.94, (width - cw - 16) / (cards.length - 1)) : 0);
  const total = $derived(cw + spacing * Math.max(cards.length - 1, 0));
  const mid = $derived((cards.length - 1) / 2);
</script>

<div class="hand" bind:clientWidth={width} data-anchor="hand-{seat}" aria-label="Your hand">
  <ol class="fan" style="width:{total}px; height:{cw * 1.4 + 18}px">
    {#each cards as c, i (c.id)}
      {@const off = i - mid}
      {@const live = legal.has(c.id) || selected.has(c.id)}
      <li class="slot" style="left:{i * spacing}px; --r:{off * Math.min(3, 26 / Math.max(cards.length, 1))}deg; --y:{Math.abs(off) ** 1.6 * 1.4}px; z-index:{i + 1}">
        <DeckCard
          def={defs[c.key]}
          id={c.id}
          zone="hand-{seat}"
          size={big ? 'lg' : 'md'}
          legal={legal.has(c.id) && !selected.has(c.id)}
          selected={selected.has(c.id)}
          dim={legal.size > 0 && !live}
          onclick={live ? () => onpick(c.id) : undefined}
        />
      </li>
    {/each}
  </ol>
  {#if !cards.length}<p class="empty">Your hand is empty.</p>{/if}
</div>

<style>
  .hand {
    width: 100%;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }
  .fan {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .slot {
    position: absolute;
    bottom: 0;
    transform-origin: 50% 160%;
    transform: translateY(var(--y)) rotate(var(--r));
    pointer-events: auto;
    transition:
      left var(--dur-3) var(--ease-out),
      transform var(--dur-3) var(--ease-out);
  }
  .slot:hover,
  .slot:focus-within {
    z-index: 50 !important;
  }
  .empty {
    color: var(--ink-3);
    margin: 0;
    padding: 24px;
  }
</style>
