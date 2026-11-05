<script lang="ts">
  import { getContext } from 'svelte';
  import type { CardDef, DeckView, Labels } from '../../../engine/deckbuilder';
  import Icon from '../../../hub/Icon.svelte';
  import ResText from './ResText.svelte';
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
  const labels = getContext<(() => Labels | undefined) | undefined>('deck-labels');
  const words = $derived(labels?.());

  /** Sorted on the printed cost, so piles keep their place when a card changes what they cost this turn. */
  const byCost = (a: { key: string }, b: { key: string }) => defs[a.key].cost - defs[b.key].cost || defs[a.key].name.localeCompare(defs[b.key].name);
  const basics = $derived(g.supply.filter((p) => !g.market.includes(p.key)).sort(byCost));
  const market = $derived(g.supply.filter((p) => g.market.includes(p.key)).sort(byCost));
  const coins = $derived(basics.filter((p) => defs[p.key].types.includes('treasure')));
  const scoring = $derived(basics.filter((p) => defs[p.key].types.includes('victory')));
  // Royal Debt, in the games that hand it out. It sits under both columns.
  const others = $derived(basics.filter((p) => !coins.includes(p) && !scoring.includes(p)));
  const pointsWord = $derived(words?.points ?? 'Points');

  function worth(def: CardDef): string | null {
    if (def.coins !== undefined) return `+${def.coins} ${def.coins === 1 ? 'Coin' : 'Coins'}`;
    return typeof def.vp === 'number' ? `${def.vp} ${pointsWord}`.replace('-', '−') : null;
  }
</script>

{#snippet price(p: DeckView['supply'][number], def: CardDef)}
  <span class="price"><Icon name="coin" size={12} /><span class="cost num" class:changed={p.cost !== def.cost}>{p.cost}</span></span>
{/snippet}

{#snippet tile(p: DeckView['supply'][number], bank = false)}
  {@const def = defs[p.key]}
  {@const on = live.has(p.key)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svelte:element
    this={on ? 'button' : 'div'}
    {...on ? { type: 'button' } : {}}
    class="tile"
    class:bank
    class:on
    class:out={p.count === 0}
    data-key={p.key}
    data-anchor="pile-{p.key}"
    aria-label="{def.name}. Costs {p.cost} {p.cost === 1 ? 'Coin' : 'Coins'}. {p.count} left. {def.text}"
    title={def.text}
    style="--spine:{spine(def.types)}"
    onclick={on ? () => onpick(p.key) : undefined}
  >
    <span class="edge" aria-hidden="true"></span>
    {#if artOf?.(p.key)}<span class="art" aria-hidden="true">{@html artOf(p.key)}</span>{/if}
    {#if bank}
      <span class="body">
        <span class="name label">{def.name}</span>
        <span class="row">
          {@render price(p, def)}
          {#if worth(def)}<span class="worth"><ResText text={worth(def)!} /></span>{/if}
          <span class="count num">{p.count}</span>
        </span>
      </span>
    {:else}
      <span class="row">
        {@render price(p, def)}
        <span class="count num">{p.count}</span>
      </span>
      <span class="name label">{def.name}</span>
      <span class="types">{def.typeLine ?? typeLabel(def.types)}</span>
    {/if}
  </svelte:element>
{/snippet}

<section class="supply" aria-label="Supply">
  <div class="group treasury">
    <div class="head">
      <h3 class="title label">{words?.basics ?? 'Always available'}</h3>
      {#if words?.basicsNote}<p class="note">{words.basicsNote}</p>{/if}
    </div>
    <div class="columns">
      <div class="column">
        <h4 class="kind"><Icon name="coin" size={12} />Coins</h4>
        {#each coins as p (p.key)}{@render tile(p, true)}{/each}
      </div>
      <div class="column">
        <h4 class="kind"><Icon name="crown" size={12} />{pointsWord}</h4>
        {#each scoring as p (p.key)}{@render tile(p, true)}{/each}
      </div>
      {#each others as p (p.key)}<div class="wide">{@render tile(p, true)}</div>{/each}
    </div>
  </div>
  <div class="group">
    <div class="head">
      <h3 class="title label">{words?.market ?? 'Market'}</h3>
      {#if words?.marketNote}<p class="note">{words.marketNote}</p>{/if}
    </div>
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
  .treasury {
    display: flex;
    flex-direction: column;
    padding: 7px 8px 8px;
    border-radius: var(--r-md);
    background: var(--treasury-bg, rgb(0 0 0 / 0.22));
    box-shadow: inset 0 0 0 1px var(--treasury-rim, var(--rim-hi));
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 8px;
    margin-bottom: 5px;
  }
  .title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
    color: var(--ink);
  }
  .note {
    margin: 0;
    font-size: 11px;
    color: var(--ink-3);
  }
  .columns {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    min-height: 0;
  }
  .column {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  .kind {
    display: flex;
    align-items: center;
    gap: 3px;
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--ink-2);
  }
  .wide {
    grid-column: 1 / -1;
    display: flex;
    min-width: 0;
  }
  .grid {
    display: grid;
    gap: 6px;
    min-width: 0;
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
  .bank {
    flex: 1;
    flex-direction: row;
    gap: 7px;
    min-height: 44px;
    padding: 5px 7px 5px 11px;
  }
  /* Out of flow, so the picture fills the tile and doesn't set its height. */
  .bank .art {
    position: relative;
    flex: 0 0 30%;
    height: auto;
    margin: 0;
  }
  .bank .art :global(svg),
  .bank .art :global(img) {
    position: absolute;
    inset: 0;
  }
  .body {
    flex: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'name name name' 'worth worth worth' 'price . count';
    align-content: space-between;
    gap: 2px 5px;
    min-width: 0;
  }
  .body .name {
    grid-area: name;
  }
  .bank .row {
    display: contents;
  }
  .bank .price {
    grid-area: price;
  }
  .bank .count {
    grid-area: count;
    align-self: center;
  }
  .worth {
    grid-area: worth;
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
  .price {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: var(--card-ink-2, rgb(44 33 24 / 0.76));
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
    .market {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 4px;
    }
    .treasury {
      padding: 4px 5px 5px;
    }
    .head {
      margin-bottom: 2px;
    }
    .title {
      font-size: 12px;
    }
    .columns {
      gap: 3px 5px;
    }
    .column {
      gap: 3px;
    }
    .kind {
      font-size: 10px;
    }
    .tile.bank {
      gap: 4px;
      min-height: 38px;
      padding: 3px 4px 3px 8px;
    }
    .bank .art {
      flex-basis: 26%;
    }
    .body {
      grid-template-areas: 'name name name' 'price worth count';
    }
    .worth {
      font-size: 10px;
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
