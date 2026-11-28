<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import Card from './Card.svelte';
  import { PAINTED } from './painted';
  import './theme.css';

  const SHOWN = ['P1', 'P3', 'C', 'P5', 'S', 'X', 'P4'];
  /** A starting grid in echelon, the way the cars line up on the table. */
  const GRID = [
    { car: 0, x: 0.2, y: 0.53 },
    { car: 3, x: 0, y: 0.56 },
    { car: 5, x: -0.2, y: 0.59 },
  ];
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="apex" data-fan>
  <CardFan items={SHOWN} cardWidth={96}>
    {#snippet card(c)}<Card card={c} />{/snippet}
    {#snippet extra()}
      {#each GRID as g, k (g.car)}
        <img class="car" src={PAINTED[`car.${g.car}`]} alt="" width="240" height="112" draggable="false" style="--cx:{g.x};--cy:{g.y};--k:{k}" />
      {/each}
    {/snippet}
  </CardFan>
</div>

<style>
  /* The fan's slots are zero-width flex boxes: keep each card at its own width instead of shrinking to nothing. */
  [data-fan] :global(.card) {
    flex: none;
  }
  /* The cars roll in from the left once the hand is mostly open, the lead car first. */
  .car {
    --p: clamp(0, var(--f, 1) * 2.4 - 1 - var(--k) * 0.2, 1);
    --e: calc(1 - (1 - var(--p)) * (1 - var(--p)));
    position: absolute;
    z-index: 20;
    left: calc(50% + var(--cx) * var(--w));
    top: calc(var(--cy) * var(--w));
    width: calc(var(--w) * 0.2);
    height: auto;
    opacity: calc(var(--p) * 4);
    transform: translate(-50%, -50%) translateX(calc((1 - var(--e)) * var(--w) * -0.5));
    filter: drop-shadow(0 5px 5px rgb(0 0 0 / 0.45));
  }
</style>
