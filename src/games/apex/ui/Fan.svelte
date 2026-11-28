<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import Card from './Card.svelte';
  import './theme.css';

  const SHOWN = ['P1', 'P3', 'C', 'P5', 'S', 'X', 'P4'];
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="apex" data-fan>
  <CardFan items={SHOWN} cardWidth={96}>
    {#snippet card(c)}<Card card={c} />{/snippet}
  </CardFan>
</div>

<style>
  /* The fan's slots are zero-width flex boxes: keep each card at its own width instead of shrinking to nothing. */
  [data-fan] :global(.card) {
    flex: none;
  }
</style>
