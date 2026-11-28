<script lang="ts" module>
  /**
   * How a game's cards unfold as it reaches the centre of the home wheel. Every mode ends on the same open hand; they
   * differ in where the cards start: `fan` from a squared stack, `spread` from a deck to the left, `emerge` rising
   * from below, `assemble` gathering in from the sides, `deal` dropping from above, and `path` laid edge to edge.
   */
  export type FanMotion = 'fan' | 'spread' | 'emerge' | 'assemble' | 'deal' | 'path';
</script>

<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  /**
   * A hand of a game's own cards, sized from its container so it fits any column. `cardWidth` is a card's natural width.
   * How open it is comes from `--f` (0 to 1) on any ancestor, set by the wheel each frame; outside the wheel it's open.
   * `extra` draws a game's own pieces (cars, coins, a seal) over the cards and can read `--f`, `--w` and `--card`.
   */
  let { items, cardWidth, card, motion = 'fan', extra }: { items: T[]; cardWidth: number; card: Snippet<[T]>; motion?: FanMotion; extra?: Snippet } = $props();

  let w = $state(0);
  /** Narrow columns show the middle few, large enough to read as cards. A path keeps every card: it's one tunnel. */
  const shown = $derived.by(() => {
    if (!w || w >= 340 || items.length <= 3 || motion === 'path') return items;
    const from = Math.floor((items.length - 3) / 2);
    return items.slice(from, from + 3);
  });
  const scale = $derived(motion === 'path' ? Math.min((w * 0.36) / cardWidth, (w * 0.94) / (shown.length * cardWidth)) : (w * 0.36) / cardWidth);
  const place = (i: number) => {
    const n = shown.length;
    const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
    const reach = (n <= 3 ? 0.22 : 0.3) * w;
    const [x, y] = motion === 'path' ? [(i - (n - 1) / 2) * cardWidth * scale, 0] : [t * reach, t * t * w * 0.035];
    return `--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--t:${t.toFixed(3)};--i:${i};--s:${scale.toFixed(3)};z-index:${i}`;
  };
</script>

<div class="fan" data-motion={motion} bind:clientWidth={w} style="--w:{w}px;--n:{Math.max(1, shown.length - 1)};--card:{(cardWidth * scale).toFixed(1)}px" aria-hidden="true">
  {#if w}
    {#each shown as item, i (i)}
      <div class="slot" style={place(i)}>{@render card(item)}</div>
    {/each}
    {#if extra}<div class="extra">{@render extra()}</div>{/if}
  {/if}
</div>

<style>
  .fan {
    position: relative;
    isolation: isolate;
    width: 100%;
    aspect-ratio: 8 / 5;
    pointer-events: none;
  }
  .slot {
    /* Each card follows the hand a beat behind the one before it. */
    --p: clamp(0, var(--f, 1) * 1.4 - var(--i) / var(--n) * 0.4, 1);
    --e: calc(var(--p) * var(--p) * (3 - 2 * var(--p)));
    --o: calc(1 - var(--e));
    position: absolute;
    left: 50%;
    top: 46%;
    width: 0;
    height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Every card shares one pivot, so the hand opens as a hand does; a little perspective stops it reading as flat. */
    transform: translate(calc(var(--x) * var(--e)), calc(var(--y) * var(--e) + var(--o) * 10px)) rotate(calc(var(--t) * 15deg * var(--e)))
      perspective(900px) rotateY(calc(var(--t) * -7deg * var(--e))) scale(calc(var(--s) * (0.88 + 0.12 * var(--e))));
    filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.32));
  }
  /* A deck squared up to the left, dealt out across the table. */
  [data-motion='spread'] .slot {
    transform: translate(calc(var(--x) * var(--e) - var(--o) * (var(--w) * 0.16 - var(--i) * 3px)), calc(var(--y) * var(--e) + var(--o) * 14px))
      rotate(calc(var(--t) * 15deg * var(--e) - var(--o) * 6deg)) perspective(900px) rotateY(calc(var(--t) * -7deg * var(--e))) scale(calc(var(--s) * (0.9 + 0.1 * var(--e))));
  }
  /* Rising out of the letter below. */
  [data-motion='emerge'] .slot {
    opacity: calc(0.15 + var(--p) * 2);
    transform: translate(calc(var(--x) * var(--e)), calc(var(--y) * var(--e) + var(--o) * var(--w) * 0.2)) rotate(calc(var(--t) * 15deg * var(--e)))
      perspective(900px) rotateY(calc(var(--t) * -7deg * var(--e))) scale(calc(var(--s) * (0.7 + 0.3 * var(--e))));
  }
  /* Gathering in from both sides of the room. */
  [data-motion='assemble'] .slot {
    opacity: calc(var(--p) * 2.5);
    transform: translate(calc(var(--x) + var(--t) * var(--o) * var(--w) * 0.34), calc(var(--y) + var(--o) * 6px)) rotate(calc(var(--t) * (15deg + var(--o) * 20deg)))
      perspective(900px) rotateY(calc(var(--t) * -7deg)) scale(var(--s));
  }
  /* Dropping onto the table from above. */
  [data-motion='deal'] .slot {
    opacity: calc(var(--p) * 3);
    transform: translate(calc(var(--x) * var(--e)), calc(var(--y) * var(--e) - var(--o) * var(--w) * 0.12)) rotate(calc(var(--t) * 15deg * var(--e) - var(--o) * 12deg))
      perspective(900px) rotateY(calc(var(--t) * -7deg * var(--e))) scale(calc(var(--s) * (1.08 - 0.08 * var(--e))));
  }
  /* Laid edge to edge from a pile on the left, so the tunnels join up. */
  [data-motion='path'] .slot {
    --p: clamp(0, var(--f, 1) * 1.6 - var(--i) / var(--n) * 0.6, 1);
    transform: translate(calc(var(--x) * var(--e) - var(--o) * var(--w) * 0.3), calc(var(--o) * (var(--i) * -3px + 8px))) rotate(calc(var(--o) * (var(--t) * 9deg - 4deg)))
      scale(var(--s));
    filter: drop-shadow(0 6px 8px rgb(0 0 0 / 0.3));
  }
  .extra {
    position: absolute;
    inset: 0;
  }
</style>
