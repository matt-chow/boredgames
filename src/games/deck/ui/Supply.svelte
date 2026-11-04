<script lang="ts">
  import { getContext } from 'svelte';
  import type { CardDef, DeckView } from '../../../engine/deckbuilder';
  import { spine, typeLabel } from './text';

  let {
    g,
    defs,
    live,
    onpick,
  }: {
    g: DeckView;
    defs: Record<string, CardDef>;
    /** The piles that can be taken right now: bought, or chosen for a decision. */
    live: Set<string>;
    onpick: (key: string) => void;
  } = $props();

  const artOf = getContext<((key: string) => string | null) | undefined>('deck-art');

  /** Sorted on the printed cost, so piles keep their place when a card changes what they cost this turn. */
  const byCost = (a: { key: string }, b: { key: string }) => defs[a.key].cost - defs[b.key].cost || defs[a.key].name.localeCompare(defs[b.key].name);
  const basics = $derived(g.supply.filter((p) => !g.market.includes(p.key)).sort(byCost));
  const market = $derived(g.supply.filter((p) => g.market.includes(p.key)).sort(byCost));
</script>

{#snippet tile(p: DeckView['supply'][number])}
  {@const def = defs[p.key]}
  {@const on = live.has(p.key)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svelte:element
    this={on ? 'button' : 'div'}
    {...on ? { type: 'button' } : {}}
    class="tile"
    class:on
    class:out={p.count === 0}
    data-key={p.key}
    data-anchor="pile-{p.key}"
    aria-label="{def.name}. Costs {p.cost}. {p.count} left. {def.text}"
    title={def.text}
    style="--spine:{spine(def.types)}"
    onclick={on ? () => onpick(p.key) : undefined}
  >
    <span class="edge" aria-hidden="true"></span>
    {#if artOf?.(p.key)}<span class="art" aria-hidden="true">{@html artOf(p.key)}</span>{/if}
    <span class="row">
      <span class="cost num" class:changed={p.cost !== def.cost}>{p.cost}</span>
      <span class="count num">{p.count}</span>
    </span>
    <span class="name label">{def.name}</span>
    <span class="types">{def.typeLine ?? typeLabel(def.types)}</span>
  </svelte:element>
{/snippet}

<section class="supply" aria-label="Supply">
  <div class="group">
    <h3 class="cap">Always available</h3>
    <div class="grid basics">
      {#each basics as p (p.key)}{@render tile(p)}{/each}
    </div>
  </div>
  <div class="group">
    <h3 class="cap">Market</h3>
    <div class="grid market">
      {#each market as p (p.key)}{@render tile(p)}{/each}
    </div>
  </div>
</section>

<style>
  .supply {
    display: grid;
    grid-template-columns: 3fr 5fr;
    gap: 16px;
    min-width: 0;
  }
  .group {
    min-width: 0;
  }
  .cap {
    margin: 0 0 5px;
    font: inherit;
    font-size: 11px;
    color: var(--ink-3);
  }
  .grid {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .basics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .market {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    min-height: 86px;
    padding: 6px 7px 6px 12px;
    border: 0;
    border-radius: 7px;
    font: inherit;
    text-align: left;
    color: var(--card-ink, #2c2118);
    background: var(--card-stack, #d9cdb5);
    overflow: hidden;
    box-shadow:
      0 3px 0 -1px var(--card-edge-1, #a89a82),
      0 5px 0 -2px var(--card-edge-2, #8a7d68),
      var(--shadow-1);
  }
  button.tile {
    cursor: pointer;
    background: var(--card-face, #e8dec9);
    outline: 2px solid var(--sprout);
    outline-offset: 1px;
    transition: transform var(--dur-1) var(--ease-out);
  }
  button.tile:hover {
    transform: translateY(-3px);
  }
  .out {
    opacity: 0.32;
    box-shadow: inset 0 0 0 1px rgb(44 33 24 / 0.3);
  }
  .edge {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: var(--spine);
  }
  .art {
    display: block;
    height: 28px;
    margin-bottom: 1px;
    border-radius: 3px;
    overflow: hidden;
  }
  .art :global(svg),
  .art :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cost {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
    color: var(--card-cost-ink, var(--coin-ink));
    background: var(--card-cost, var(--coin));
  }
  .cost.changed {
    box-shadow: 0 0 0 2px var(--card-ink, #2c2118);
  }
  .count {
    font-size: 12px;
    font-weight: 600;
    color: var(--card-ink-2, rgb(44 33 24 / 0.76));
  }
  .name {
    font-size: 12.5px;
    line-height: 1.12;
    overflow-wrap: anywhere;
  }
  .types {
    margin-top: auto;
    font-size: 9px;
    color: var(--card-ink-2, rgb(44 33 24 / 0.76));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 760px) {
    .supply {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
    }
    .basics,
    .market {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px;
    }
    .tile {
      min-height: 68px;
      gap: 2px;
      padding: 4px 3px 4px 8px;
    }
    .cost {
      width: 17px;
      height: 17px;
      font-size: 11px;
    }
    .name {
      font-size: 10px;
    }
    .types {
      display: none;
    }
    .art {
      height: 18px;
    }
  }
</style>
