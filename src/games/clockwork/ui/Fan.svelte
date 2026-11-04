<script lang="ts">
  import { setContext } from 'svelte';
  import type { CardDef } from '../../../engine/deckbuilder';
  import CardFan from '../../../hub/CardFan.svelte';
  import DeckCard from '../../deck/ui/DeckCard.svelte';
  import { BASICS, CORE } from '../rules/cards';
  import { artFor } from './art';
  import './theme.css';

  setContext('deck-art', artFor);
  const all = [...BASICS, ...CORE];
  const cards = ['permit_office', 'dynamo', 'mutual_aid', 'monument', 'clock_garden'].map((k) => all.find((c) => c.key === k)).filter((c): c is CardDef => !!c);
</script>

<!-- data-fan keeps the theme's tokens on these cards and off the page around them. -->
<div data-game-theme="clockwork" data-fan>
  <CardFan items={cards} cardWidth={112}>
    {#snippet card(def)}<DeckCard {def} size="lg" />{/snippet}
  </CardFan>
</div>
