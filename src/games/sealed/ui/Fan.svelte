<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import type { Kind } from '../rules/cards';
  import Card from './Card.svelte';
  import './theme.css';

  const items: Kind[] = ['censor', 'scribe', 'confessor', 'heir', 'ambassador', 'duelist', 'dowager'];
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="sealed" data-fan>
  <CardFan {items} cardWidth={120}>
    {#snippet card(k)}<Card kind={k} size="md" />{/snippet}
  </CardFan>
</div>
