<script lang="ts">
  import { LOCATION_NAMES, type DAction, type DView } from '../rules/types';
  import CallTime from './CallTime.svelte';
  import { missionNote, outcomeText } from './text';

  let { view, names, busy, act }: { view: DView; names: string[]; busy: boolean; act: (a: DAction) => unknown } = $props();

  const me = $derived(view.you ?? 0);
  const opp = $derived(1 - me);
  const last = $derived(view.rounds.at(-1)!);
  const own = $derived(view.mine?.rounds.at(-1) ?? null);
  const signal = (seat: number) => {
    const l = last.signals[seat];
    return l ? LOCATION_NAMES[l] : 'No signal';
  };
</script>

<section class="panel" aria-labelledby="rep-h">
  <div class="sheet">
    <img class="head" src="/art/deaddrop/report.svg" alt="" width="640" height="82" />
    <div class="body">
      <h2 id="rep-h" class="round">Round {last.round} of {view.maxRounds}</h2>

      <div class="block">
        <span class="stamp ver">Verified · for your eyes</span>
        {#if own}<p>{outcomeText(own)}</p>{/if}
        {#if view.mine}<p class="sub">{missionNote(view.mine)}</p>{/if}
      </div>

      {#if last.captures.length || last.coverGained.some(Boolean)}
        <div class="block">
          <span class="stamp ver">Verified · public</span>
          {#each last.captures as c (c.seat)}
            <p>{c.seat === me ? 'You' : names[c.seat]} intercepted a delivery at {LOCATION_NAMES[c.loc]}.</p>
          {/each}
          {#each [0, 1] as seat (seat)}
            {#if last.coverGained[seat]}<p>{seat === me ? 'You' : names[seat]} gained Cover: a decoy was intercepted.</p>{/if}
          {/each}
        </div>
      {/if}

      <div class="block">
        <span class="stamp un">Unverified · public signals</span>
        <dl>
          <dt>You</dt><dd>{signal(me)}{last.coverSpent[me] ? ' (false, under Cover)' : ''}</dd>
          <dt>{names[opp]}</dt><dd>{signal(opp)}{last.coverSpent[opp] ? ' (Cover spent: this signal is false)' : ''}</dd>
        </dl>
        <p class="sub">A signal shows a location, never the action behind it.</p>
      </div>
    </div>
  </div>

  {#if view.done[me]}
    <CallTime {view} rival={names[opp]} {busy} {act} what="Time called: the next briefing begins." />
  {:else}
    <button class="btn primary" disabled={busy} onclick={() => act({ type: 'continue', round: view.round })}>
      {view.round >= view.maxRounds ? 'Close the report' : 'On to the next briefing'}
    </button>
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .panel > .btn {
    align-self: flex-start;
  }
  .sheet {
    background: var(--dd-paper) url('/art/deaddrop/paper.svg');
    color: var(--dd-paper-ink);
    border-radius: 2px;
    box-shadow: var(--shadow-2);
    animation: in var(--dur-2) var(--ease-out);
  }
  @keyframes in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
  .head {
    display: block;
    width: 100%;
    height: auto;
  }
  .body {
    padding: 8px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: var(--dd-type);
  }
  .round {
    margin: 0;
    font: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .block p {
    margin: 4px 0 0;
    font-weight: 700;
    line-height: 1.35;
  }
  .block p.sub {
    font-weight: 400;
    font-size: 13px;
    color: var(--dd-paper-ink-2);
  }
  .stamp {
    display: inline-block;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .ver {
    color: var(--dd-paper);
    background: var(--dd-teal);
  }
  .un {
    color: var(--dd-wine);
    border: 2px dashed var(--dd-wine);
  }
  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 2px 12px;
    margin: 6px 0 0;
  }
  dt {
    color: var(--dd-paper-ink-2);
    overflow-wrap: anywhere;
    max-width: 16ch;
  }
  dd {
    margin: 0;
    font-weight: 700;
  }
</style>
