<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import { ROLE_ORDER } from '../rules/roles';
  import Card from './Card.svelte';
  import './theme.css';
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="palazzo" data-fan>
  <CardFan items={ROLE_ORDER} cardWidth={112}>
    {#snippet card(r)}<Card role={r} size="md" />{/snippet}
  </CardFan>
</div>
