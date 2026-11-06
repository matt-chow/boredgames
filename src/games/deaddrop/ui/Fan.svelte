<script lang="ts">
  import CardFan from '../../../hub/CardFan.svelte';
  import { LOCATIONS, LOCATION_NAMES, type Loc } from '../rules/types';
  import { sceneOf } from './text';
  import './theme.css';

  const items: Loc[] = [...LOCATIONS];
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="deaddrop" data-fan>
  <CardFan {items} cardWidth={112}>
    {#snippet card(l)}
      <div class="dd-fan">
        <img src={sceneOf(l)} alt="" width="640" height="400" loading="lazy" />
        <span>{LOCATION_NAMES[l]}</span>
      </div>
    {/snippet}
  </CardFan>
</div>

<style>
  .dd-fan {
    width: 112px;
    height: 157px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 4px;
    background: var(--dd-paper);
    box-shadow: var(--shadow-2);
  }
  img {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: cover;
  }
  span {
    padding: 4px 6px;
    color: var(--dd-paper-ink);
    font: 700 11px/1.2 var(--dd-type);
    text-align: center;
  }
</style>
