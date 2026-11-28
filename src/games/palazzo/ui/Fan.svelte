<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import { ROLE_ORDER } from '../rules/roles';
  import Card from './Card.svelte';
  import './theme.css';
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="palazzo" data-fan>
  <CardFan items={ROLE_ORDER} cardWidth={112} motion="assemble">
    {#snippet card(r)}<Card role={r} size="md" />{/snippet}
    {#snippet extra()}
      {#each [0, 1, 2, 3, 4] as k (k)}<span class="coin" style="--k:{k}"></span>{/each}
    {/snippet}
  </CardFan>
</div>

<style>
  /* The courtiers gather, then the purse is counted out onto the table, one coin on another. */
  .coin {
    --p: clamp(0, (var(--f, 1) - 0.45 - var(--k) * 0.08) * 5, 1);
    --e: calc(var(--p) * var(--p));
    position: absolute;
    left: 74%;
    top: calc(86% - var(--k) * var(--w) * 0.011);
    z-index: 20;
    width: calc(var(--w) * 0.07);
    aspect-ratio: 1 / 0.42;
    border-radius: 50%;
    background: radial-gradient(ellipse at 40% 30%, #f3d78f, var(--coin) 55%, #9b7a32);
    box-shadow:
      0 1px 0 #7a5d22,
      0 3px 4px rgb(0 0 0 / 0.45);
    opacity: calc(var(--p) * 5);
    transform: translate(-50%, calc((1 - var(--e)) * var(--w) * -0.18));
  }
</style>
