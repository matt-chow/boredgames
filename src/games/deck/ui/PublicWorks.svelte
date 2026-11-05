<script lang="ts">
  import { getContext } from 'svelte';
  import type { DeckView, ProjectDef } from '../../../engine/deckbuilder';
  import Icon from '../../../hub/Icon.svelte';
  import ResText from './ResText.svelte';

  let {
    g,
    works,
    title,
    points,
    tokenName,
    busy,
    name,
    onclaim,
  }: {
    g: DeckView;
    works: ProjectDef[];
    title: string;
    points: string;
    tokenName: (token: string) => string;
    busy: boolean;
    name: (seat: number) => string;
    onclaim: (key: string) => void;
  } = $props();

  const artOf = getContext<((key: string) => string | null) | undefined>('deck-art');
  const def = (key: string) => works.find((w) => w.key === key);
</script>

<section class="works" aria-label={title}>
  {#each g.projects as p (p.key)}
    {@const on = g.legal.claim.includes(p.key) && !busy}
    <button type="button" class="work" class:on class:taken={p.by !== null} disabled={!on} data-project={p.key} onclick={() => onclaim(p.key)}>
      {#if artOf?.(p.key)}<span class="art" aria-hidden="true">{@html artOf(p.key)}</span>{/if}
      <span class="nm label">{def(p.key)?.name ?? p.key}</span>
      <span class="price num"><Icon name="coin" size={12} /> {p.coins} Coins{#each Object.entries(p.tokens) as [t, n] (t)}{' + '}<Icon name="influence" size={12} /> {n} {tokenName(t)}{/each}</span>
      <span class="gets"><Icon name="crown" size={12} /> <b class="num">{p.vp}</b> {points}. <ResText text={def(p.key)?.text ?? ''} /></span>
      {#if p.by !== null}<span class="by">Built by {name(p.by)}</span>{/if}
    </button>
  {/each}
</section>

<style>
  .works {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 6px;
    min-width: 0;
    margin-top: 16px;
  }
  .work {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 6px 8px;
    border: 0;
    border-radius: var(--r-sm);
    font: inherit;
    font-size: 12px;
    text-align: left;
    color: var(--ink-2);
    background: var(--ground-2);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
    transition: transform var(--dur-1) var(--ease-out);
  }
  .work.on {
    cursor: pointer;
    box-shadow: inset 0 0 0 2px var(--sprout);
  }
  .work.on:active {
    transform: scale(0.97);
  }
  .work.taken {
    opacity: 0.6;
  }
  .art {
    display: block;
    height: 24px;
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
  @media (hover: hover) and (pointer: fine) {
    .work.on:hover {
      transform: translateY(-2px);
    }
  }
  .nm {
    font-size: 13px;
    color: var(--ink);
  }
  .price {
    color: var(--coin);
  }
  .price :global(svg),
  .gets > :global(svg) {
    vertical-align: -2px;
  }
</style>
