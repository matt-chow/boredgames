<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import type { Bean } from '../rules/cards';
  import Card from './Card.svelte';

  const beans: Bean[] = ['red', 'blackeyed', 'chili', 'blue', 'green'];
</script>

<CardFan items={beans} cardWidth={96}>
  {#snippet card(bean)}<Card {bean} size="lg" />{/snippet}
</CardFan>
