<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import { artOf } from '../rules/cards';
  import './theme.css';

  /** One tunnel, entrance to gold, laid card by card. */
  const items = ['entrance', 'straightH', 'cross', 'straightH', 'gold'];
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="mines" data-fan>
  <CardFan {items} cardWidth={112} motion="path">
    {#snippet card(k)}
      <img class="ms-fan" src={artOf(k)} alt="" width="112" height="168" loading="lazy" />
    {/snippet}
  </CardFan>
</div>

<style>
  .ms-fan {
    display: block;
    width: 112px;
    height: 168px;
    border-radius: 5px;
    box-shadow: var(--shadow-2);
  }
</style>
