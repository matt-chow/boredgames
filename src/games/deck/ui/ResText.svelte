<script lang="ts">
  import { getContext } from 'svelte';
  import type { Labels } from '../../../engine/deckbuilder';
  import Icon from '../../../hub/Icon.svelte';
  import { resParts } from './text';

  let { text, labels = undefined }: { text: string; labels?: Labels } = $props();

  const fromTable = getContext<(() => Labels | undefined) | undefined>('deck-labels');
  const parts = $derived(resParts(text, labels ?? fromTable?.()));
</script>

{#each parts as p, i (i)}{#if p.icon}<span class="sym"><Icon name={p.icon} size={12} />{p.text}</span>{:else}{p.text}{/if}{/each}

<style>
  .sym {
    white-space: nowrap;
  }
  .sym :global(svg) {
    width: 1.05em;
    height: 1.05em;
    margin-right: 0.14em;
    vertical-align: -0.16em;
  }
</style>
