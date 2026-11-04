<script lang="ts">
  import type { CardDef, PlayerView } from '../../../engine/deckbuilder';
  import Icon from '../../../hub/Icon.svelte';
  import DeckCard from './DeckCard.svelte';

  let {
    p,
    defs,
    name,
    connected,
    bot,
    active,
    deciding,
    tokenName,
  }: {
    p: PlayerView;
    defs: Record<string, CardDef>;
    name: string;
    connected: boolean;
    bot: boolean;
    active: boolean;
    deciding: boolean;
    tokenName: (token: string) => string;
  } = $props();

  const matTotal = $derived(Object.values(p.mats).reduce((a, m) => a + m.count, 0));
  const tokens = $derived(Object.entries(p.tokens).filter(([, n]) => n));
</script>

<section class="opp" class:active class:deciding aria-label={name}>
  <header>
    {#if bot}
      <span class="bot" title="Computer player"><Icon name="bot" size={14} /></span>
    {:else}
      <span class="dot" class:on={connected} title={connected ? 'Online' : 'Offline'}></span>
    {/if}
    <b class="who">{name}</b>
  </header>
  <div class="zones">
    <span class="zone" data-anchor="hand-{p.seat}" title="Cards in hand"><DeckCard size="xs" /><b class="num">{p.handCount}</b></span>
    <span class="zone" data-anchor="deck-{p.seat}" title="Cards in deck"><span class="pile"></span><b class="num">{p.deckCount}</b></span>
    <span class="zone" data-anchor="discard-{p.seat}" title="Cards in discard pile">
      {#if p.discardTop}
        <DeckCard def={defs[p.discardTop.key]} id={p.discardTop.id} zone="discard-{p.seat}" size="xs" />
      {:else}
        <span class="pile empty"></span>
      {/if}
      <b class="num">{p.discardCount}</b>
    </span>
    <div class="play" aria-label="{name}’s cards in play">
      {#each p.play as c (c.id)}
        <span class="slot"><DeckCard def={defs[c.key]} id={c.id} zone="play-{p.seat}" size="xs" /></span>
      {/each}
    </div>
  </div>
  {#if matTotal || tokens.length}
    <p class="extra">
      {#if matTotal}<span>{matTotal} set aside</span>{/if}
      {#each tokens as [t, n] (t)}<span class="num">{n} {tokenName(t)}</span>{/each}
    </p>
  {/if}
</section>

<style>
  .opp {
    flex: 1 1 0;
    min-width: 0;
    max-width: 460px;
    padding: 6px 10px 8px;
    border-radius: var(--r-md);
    background: rgb(0 0 0 / 0.18);
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .opp.active {
    box-shadow: inset 0 0 0 1.5px var(--ink-3);
  }
  .opp.deciding {
    box-shadow: inset 0 0 0 1.5px var(--ink-2);
  }
  header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 5px;
  }
  .who {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--rim-hi);
  }
  .dot.on {
    background: var(--sprout);
  }
  .bot {
    display: inline-flex;
    color: var(--ink-3);
  }
  .zones {
    display: flex;
    align-items: flex-end;
    gap: 7px;
    min-width: 0;
  }
  .zone {
    position: relative;
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .zone b {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .pile {
    display: block;
    width: 44px;
    aspect-ratio: 5 / 7;
    border-radius: 4px;
    background: var(--ground-3);
    box-shadow:
      inset 0 0 0 1px var(--rim-hi),
      0 2px 0 -1px var(--rim-hi);
  }
  .pile.empty {
    background: none;
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .play {
    flex: 1;
    min-width: 0;
    display: flex;
    padding-left: 4px;
    margin-bottom: 18px;
  }
  .slot {
    flex: 0 1 46px;
    min-width: 0;
  }
  .extra {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--ink-3);
  }
</style>
