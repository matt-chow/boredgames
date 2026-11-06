<script lang="ts">
  import Icon from '../../../hub/Icon.svelte';
  import { STATEMENTS_PER_BRIEFING } from '../rules/engine';
  import { LOCATIONS, LOCATION_NAMES, type Claim, type DAction, type DView, type Loc, type StatementV } from '../rules/types';
  import CallTime from './CallTime.svelte';
  import StatementRow from './StatementRow.svelte';

  let { view, names, busy, act, onchallenge }: { view: DView; names: string[]; busy: boolean; act: (a: DAction) => Promise<{ ok: boolean }>; onchallenge: (st: StatementV) => void } = $props();

  type Kind = Claim['kind'];
  const KINDS: { kind: Kind; text: string; loc: boolean }[] = [
    { kind: 'delivered', text: 'I delivered at…', loc: true },
    { kind: 'investigated', text: 'I investigated…', loc: true },
    { kind: 'decoy', text: 'I deployed a decoy at…', loc: true },
    { kind: 'notDelivered', text: 'I did not deliver', loc: false },
    { kind: 'none', text: 'Nothing to report', loc: false },
  ];

  const me = $derived(view.you ?? 0);
  const opp = $derived(1 - me);
  const first = $derived(view.round === 1);
  const kinds = $derived(first ? KINDS.filter((k) => k.kind === 'none') : KINDS);
  const left = $derived(STATEMENTS_PER_BRIEFING - view.filed[me]);
  const today = $derived(view.statements.filter((s) => s.round === view.round));
  const theirs = $derived(today.filter((s) => s.seat === opp));
  const mine = $derived(today.filter((s) => s.seat === me));

  let kind = $state<Kind | null>(null);
  let loc = $state<Loc | null>(null);
  const shape = $derived(KINDS.find((k) => k.kind === kind));
  const ready = $derived(!!shape && (!shape.loc || !!loc));

  async function file() {
    if (!kind || !ready) return;
    const claim = (shape!.loc ? { kind, loc } : { kind }) as Claim;
    const r = await act({ type: 'claim', round: view.round, claim });
    if (r.ok) {
      kind = null;
      loc = null;
    }
  }
</script>

<section class="panel" aria-labelledby="brief-h">
  <h2 id="brief-h" class="label">Briefing</h2>
  <ul class="check">
    <li class:ok={view.filed[me] > 0}><Icon name="check" size={16} /> File at least one formal statement</li>
    <li class:ok={view.acked[me]}><Icon name="check" size={16} /> Acknowledge what {names[opp]} files {view.filed[opp] ? '' : '(nothing yet)'}</li>
  </ul>

  {#if theirs.length}
    <div class="stack">
      {#each theirs as st (st.id)}<StatementRow {st} {names} {me} canChallenge={view.challengeToken[me]} {onchallenge} />{/each}
    </div>
    {#if !view.acked[me]}
      <button class="btn primary" disabled={busy} onclick={() => act({ type: 'ack', round: view.round, count: view.filed[opp] })}>
        Acknowledge {theirs.length === 1 ? 'statement' : `${theirs.length} statements`}
      </button>
    {/if}
  {/if}

  {#if mine.length}
    <div class="stack">
      {#each mine as st (st.id)}<StatementRow {st} {names} {me} canChallenge={false} {onchallenge} />{/each}
    </div>
  {/if}

  {#if left > 0}
    <div class="compose">
      <p class="lab" id="kind-l">{view.filed[me] ? 'File another statement' : 'File a statement'} <span class="muted">(it may be false; {left} left)</span></p>
      <div class="chips" role="radiogroup" aria-labelledby="kind-l">
        {#each kinds as k (k.kind)}
          <button class="chip" role="radio" aria-checked={kind === k.kind} class:on={kind === k.kind} onclick={() => (kind = k.kind)}>{k.text}</button>
        {/each}
      </div>
      {#if first}<p class="muted note">No round has finished yet, so there is nothing else to say formally. Use chat for anything else.</p>{/if}
      {#if shape?.loc}
        <div class="chips" role="radiogroup" aria-label="Which location">
          {#each LOCATIONS as l (l)}
            <button class="chip" role="radio" aria-checked={loc === l} class:on={loc === l} onclick={() => (loc = l)}>{LOCATION_NAMES[l]}</button>
          {/each}
        </div>
      {/if}
      <button class="btn" class:primary={ready} disabled={!ready || busy} onclick={file}>File statement</button>
    </div>
  {/if}

  {#if view.done[me]}
    <CallTime {view} rival={names[opp]} {busy} {act} what="Time called: orders begin without them." />
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  h2 {
    margin: 0;
    font-size: 22px;
  }
  .check {
    list-style: none;
    margin: 0;
    padding: 0;
    color: var(--ink-2);
    font-size: 14px;
  }
  .check li {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
  }
  .check li :global(svg) {
    opacity: 0.25;
    flex: none;
  }
  .check li.ok {
    color: var(--ink);
  }
  .check li.ok :global(svg) {
    opacity: 1;
    color: var(--sprout);
  }
  .stack,
  .compose {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lab {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .muted {
    color: var(--ink-3);
    font-weight: 400;
  }
  .note {
    margin: 0;
    font-size: 13px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    min-height: 40px;
    padding: 0 12px;
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .chip.on {
    color: var(--sprout-ink);
    background: var(--sprout);
    border-color: var(--sprout);
    font-weight: 600;
  }
  .chip:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  .panel > .btn,
  .compose > .btn {
    align-self: flex-start;
  }
</style>
