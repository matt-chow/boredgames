<script lang="ts">
  import type { CardDef, PendingView } from '../../../engine/deckbuilder';
  import DeckCard from './DeckCard.svelte';

  let {
    q,
    defs,
    picked,
    /** Choices that aren't in the hand, drawn here. `id` is set when this is the only place the card appears. */
    shown,
    busy,
    ontoggle,
    onconfirm,
    onoption,
    onskip,
    onplayer,
    name,
  }: {
    q: PendingView;
    defs: Record<string, CardDef>;
    picked: number[];
    shown: { id: number; key: string; tracked: boolean }[];
    busy: boolean;
    ontoggle: (id: number) => void;
    onconfirm: () => void;
    onoption: (i: number) => void;
    onskip: () => void;
    onplayer: (seat: number) => void;
    name: (seat: number) => string;
  } = $props();

  const takesCards = $derived(q.kind === 'cards' || q.kind === 'react');
  const ready = $derived(picked.length >= q.min && picked.length <= q.max);
  const count = $derived(q.min === q.max ? `${picked.length} of ${q.max}` : `${picked.length} chosen, up to ${q.max}`);
  const confirmLabel = $derived(q.kind === 'react' ? (picked.length ? 'Reveal' : 'Don’t reveal') : picked.length || q.min ? 'Confirm' : 'Choose none');
</script>

<section class="prompt" aria-label="Your decision">
  <div class="words">
    {#if q.source}<span class="source label">{defs[q.source]?.name}</span>{/if}
    <p class="ask">{q.prompt}</p>
    {#if q.after}<p class="after">{q.after}</p>{/if}
  </div>

  {#if shown.length}
    <div class="cards">
      {#each shown as c (c.id)}
        <DeckCard
          def={defs[c.key]}
          id={c.tracked ? c.id : undefined}
          zone="panel"
          size="sm"
          legal={!picked.includes(c.id)}
          selected={picked.includes(c.id)}
          onclick={() => ontoggle(c.id)}
        />
      {/each}
    </div>
  {/if}

  <div class="answers">
    {#if takesCards}
      {#if q.max > 1 || q.min !== 1}<span class="count num">{count}</span>{/if}
      <button class="btn primary" disabled={busy || !ready} onclick={onconfirm}>{confirmLabel}</button>
    {:else if q.kind === 'pile'}
      <span class="count">Choose a pile in the supply.</span>
      {#if q.optional}<button class="btn" disabled={busy} onclick={onskip}>Skip</button>{/if}
    {:else if q.kind === 'player'}
      {#each q.seats ?? [] as s (s)}
        <button class="btn" disabled={busy} onclick={() => onplayer(s)}>{name(s)}</button>
      {/each}
    {:else}
      {#each q.options ?? [] as o, i (i)}
        <button class="btn" class:primary={i === 0} disabled={busy} onclick={() => onoption(i)}>{o}</button>
      {/each}
    {/if}
  </div>
</section>

<style>
  .prompt {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px 16px;
    max-width: min(760px, 100%);
    padding: 10px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--sprout);
    background: var(--ground-2);
    box-shadow: var(--shadow-lift);
    pointer-events: auto;
  }
  .words {
    flex: 1 1 200px;
    min-width: 0;
  }
  .source {
    font-size: 13px;
    color: var(--ink-3);
  }
  .ask {
    margin: 0;
    font-weight: 600;
    text-wrap: balance;
  }
  .after {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--ink-2);
  }
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 10px;
  }
  .answers {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }
  .count {
    font-size: 13px;
    color: var(--ink-2);
  }
</style>
