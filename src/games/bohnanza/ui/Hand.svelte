<script lang="ts">
  import { BEANS } from '../rules/cards';
  import type { CardV } from '../rules/view';
  import Card from './Card.svelte';

  let {
    cards,
    legal = new Set<string>(),
    selected = new Set<string>(),
    dim = false,
    outline = true,
    onpick = undefined,
    ondrag = undefined,
  }: {
    /** Fixed order; index 0 is the front card. Never re-sorted. */
    cards: CardV[];
    legal?: Set<string>;
    selected?: Set<string>;
    /** Cards that can't be used right now are muted. */
    dim?: boolean;
    /** Outline playable cards (off while every card is tradeable). */
    outline?: boolean;
    onpick?: (id: string) => void;
    ondrag?: (id: string, e: PointerEvent, el: HTMLElement) => void;
  } = $props();

  let width = $state(600);
  let big = $state(true);
  $effect(() => {
    big = width > 520;
  });
  // Must match the rendered Card widths (lg 96px, md 76px).
  const cw = $derived(big ? 96 : 76);
  const spacing = $derived(cards.length > 1 ? Math.min(cw * 0.78, (width - cw - 16) / (cards.length - 1)) : 0);
  const total = $derived(cw + spacing * Math.max(cards.length - 1, 0));
  const mid = $derived((cards.length - 1) / 2);
</script>

<div class="hand" bind:clientWidth={width} data-anchor="hand" aria-label="Your hand, front card first">
  <ol class="fan" style="width:{total}px; height:{cw * 1.4 + 22}px">
    {#each cards as c, i (c.id)}
      {@const off = i - mid}
      {@const interactive = legal.has(c.id) || selected.has(c.id)}
      <li
        class="slot"
        style="left:{i * spacing}px; --r:{off * Math.min(3, 26 / Math.max(cards.length, 1))}deg; --y:{Math.abs(off) ** 1.6 * 1.4}px; z-index:{i + 1}"
        onpointerdown={ondrag && legal.has(c.id) ? (e) => ondrag(c.id, e, e.currentTarget.firstElementChild as HTMLElement) : undefined}
      >
        <Card
          id={c.id}
          bean={c.t}
          size={big ? 'lg' : 'md'}
          tag={i === 0 ? 'FRONT' : undefined}
          legal={outline && legal.has(c.id) && !selected.has(c.id)}
          selected={selected.has(c.id)}
          dim={dim && !interactive}
          label="{i === 0 ? 'Front card: ' : `Card ${i + 1}: `}{BEANS[c.t].name}"
          onclick={onpick && interactive ? () => onpick(c.id) : undefined}
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
    pointer-events: auto;
  }
</style>
