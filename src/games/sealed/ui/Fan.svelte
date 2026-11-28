<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import type { Kind } from '../rules/cards';
  import Card from './Card.svelte';
  import { artOf } from './text';
  import './theme.css';

  const items: Kind[] = ['censor', 'scribe', 'confessor', 'heir', 'ambassador', 'duelist', 'dowager'];
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="sealed" data-fan>
  <CardFan {items} cardWidth={120} motion="emerge">
    {#snippet card(k)}<Card kind={k} size="md" />{/snippet}
    {#snippet extra()}
      <img class="letter" src={artOf('back')} alt="" draggable="false" />
      <img class="seal" src={artOf('seal')} alt="" draggable="false" />
    {/snippet}
  </CardFan>
</div>

<style>
  /* A sealed letter waits in the middle; the court rises out of it and the seal settles at the front. */
  .letter,
  .seal {
    position: absolute;
    left: 50%;
    --o: calc(1 - var(--f, 1));
  }
  .letter {
    top: 58%;
    width: var(--card);
    z-index: -1;
    border-radius: 4px;
    opacity: calc(var(--o) * 1.6);
    transform: translate(-50%, -50%) scale(calc(1 - var(--f, 1) * 0.1));
    box-shadow: var(--shadow-2);
  }
  .seal {
    top: 74%;
    width: calc(var(--w) * 0.11);
    z-index: 20;
    transform: translate(-50%, calc(-50% - var(--o) * var(--w) * 0.1)) scale(calc(1 + var(--o) * 0.5)) rotate(calc(var(--o) * -18deg));
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.5));
  }
</style>
