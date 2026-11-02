<script lang="ts">
  import { BEANS, coinsFor } from '../rules/cards';
  import type { CardV } from '../rules/view';
  import Card from './Card.svelte';

  let {
    cards,
    index,
    big = false,
    target = false,
    harvestable = false,
    stealable = false,
    dropKey = undefined,
    onplant = undefined,
    onharvest = undefined,
    onsteal = undefined,
  }: {
    cards: CardV[];
    index: number;
    /** Your own crates are full size; opponents' are compact. */
    big?: boolean;
    /** A legal destination for the card in hand right now. */
    target?: boolean;
    harvestable?: boolean;
    stealable?: boolean;
    dropKey?: string;
    onplant?: () => void;
    onharvest?: () => void;
    onsteal?: () => void;
  } = $props();

  const top = $derived(cards.length ? cards[cards.length - 1] : null);
  const bean = $derived(top?.t ?? null);
  const info = $derived(bean ? BEANS[bean] : null);
  const worth = $derived(bean ? coinsFor(bean, cards.length) : 0);
  const next = $derived.by(() => {
    if (!info || bean === 'field') return null;
    const need = info.meter.find((m) => m !== null && m > cards.length);
    return need ?? null;
  });
  const step = $derived(big ? 7 : 3);
  const shown = $derived(cards.slice(-12));
  const label = $derived(
    bean
      ? `Field ${index + 1}: ${cards.length} ${info!.name}${cards.length === 1 ? '' : 's'}, worth ${worth} coin${worth === 1 ? '' : 's'}`
      : `Field ${index + 1}: empty`,
  );
</script>

<div class="crate" class:big class:target class:empty={!cards.length} data-drop={dropKey} aria-label={label} role="group">
  {#if target}
    <button class="hit" onclick={onplant} aria-label="Plant in field {index + 1}"></button>
  {/if}
  <div class="stack" style="--step:{step}px; --n:{shown.length}">
    {#each shown as c, i (c.id)}
      <div class="slot" style="--i:{i}">
        <Card id={c.id} bean={c.t} size={big ? 'md' : 'sm'} />
      </div>
    {/each}
    {#if !cards.length}
      <span class="placeholder" aria-hidden="true">{index + 1}</span>
    {/if}
  </div>
  {#if stealable && top}
    <button class="steal" onclick={onsteal}>Steal {info?.name.replace(/ Bean$/, '')}</button>
  {/if}
  <div class="foot">
    {#if cards.length}
      <span class="cnt num" title="Beans in this field">{cards.length}</span>
      <span class="worth" class:zero={!worth}>
        <i class="coin-dot" aria-hidden="true"></i><span class="num">{worth}</span>
        {#if big && next}<span class="next">· next at {next}</span>{/if}
      </span>
    {/if}
  </div>
  {#if harvestable && cards.length}
    <button class="btn small harvest" onclick={onharvest}>
      Harvest{#if worth}<span class="num"> +{worth}</span>{/if}
    </button>
  {/if}
</div>

<style>
  .crate {
    --cw: 52px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 10px 8px;
    min-width: calc(var(--cw) + 22px);
    border-radius: 10px;
    background:
      repeating-linear-gradient(0deg, rgb(0 0 0 / 0.16) 0 2px, transparent 2px 22px),
      linear-gradient(180deg, #2b2017, #1f1711);
    box-shadow:
      inset 0 0 0 4px #3a2b1f,
      inset 0 0 0 5px #4d3a2a,
      0 10px 18px -8px rgb(0 0 0 / 0.7);
    transition: box-shadow var(--dur-2) var(--ease-out);
  }
  .big {
    --cw: var(--card-w);
    padding: 14px 14px 10px;
    border-radius: 14px;
    box-shadow:
      inset 0 0 0 6px #3a2b1f,
      inset 0 0 0 7px #4d3a2a,
      0 18px 28px -10px rgb(0 0 0 / 0.75);
  }
  .target {
    box-shadow:
      inset 0 0 0 4px #3a2b1f,
      inset 0 0 0 5px #4d3a2a,
      0 0 0 2px var(--sprout),
      0 0 24px -4px rgb(201 224 74 / 0.5);
  }
  .big.target {
    box-shadow:
      inset 0 0 0 6px #3a2b1f,
      inset 0 0 0 7px #4d3a2a,
      0 0 0 3px var(--sprout),
      0 0 30px -4px rgb(201 224 74 / 0.5);
  }
  :global(.drop-over).crate {
    background:
      repeating-linear-gradient(0deg, rgb(0 0 0 / 0.16) 0 2px, transparent 2px 22px),
      linear-gradient(180deg, #3a3018, #262011);
  }
  .hit {
    position: absolute;
    inset: 0;
    z-index: 3;
    border: 0;
    background: transparent;
    border-radius: inherit;
    cursor: pointer;
  }
  .hit:focus-visible {
    outline: 3px solid var(--sprout);
    outline-offset: 3px;
  }
  .stack {
    position: relative;
    width: var(--cw);
    height: calc(var(--cw) * 1.4 + (max(var(--n), 1) - 1) * var(--step));
  }
  .slot {
    position: absolute;
    left: 0;
    top: calc(var(--i) * var(--step));
  }
  .placeholder {
    position: absolute;
    inset: 0;
    height: calc(var(--cw) * 1.4);
    border: 1.5px dashed var(--rim-hi);
    border-radius: 8px;
    display: grid;
    place-items: center;
    font-family: var(--font-label);
    font-size: calc(var(--cw) * 0.4);
    color: var(--rim-hi);
  }
  .target .placeholder {
    border-color: var(--sprout);
    color: var(--sprout);
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 18px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .cnt {
    font-weight: 700;
    color: var(--ink);
  }
  .worth {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--coin);
  }
  .worth.zero {
    color: var(--ink-3);
  }
  .coin-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: currentColor;
  }
  .next {
    color: var(--ink-3);
    margin-left: 2px;
  }
  .harvest {
    position: relative;
    z-index: 4;
  }
  .steal {
    position: absolute;
    z-index: 4;
    left: 50%;
    top: 40%;
    transform: translateX(-50%);
    white-space: nowrap;
    padding: 6px 10px;
    border-radius: 999px;
    border: 0;
    background: var(--sprout);
    color: var(--sprout-ink);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: var(--shadow-2);
  }
  :global([data-perf='low']) .crate {
    background: #241b14;
  }
</style>
