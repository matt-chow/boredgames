<script lang="ts">
  import { LOCATIONS, LOCATION_NAMES, type DView } from '../rules/types';
  import StatementRow from './StatementRow.svelte';
  import { journalOf, missionNote, outcomeText } from './text';

  let { view, names }: { view: DView; names: string[] } = $props();

  const me = $derived(view.you ?? 0);
  const opp = $derived(1 - me);
  const journal = $derived(journalOf(view.mine));
  const WORDS = { mission: 'Rival mission', not: 'Not a rival mission', unknown: 'Unknown' };
  const newest = $derived([...view.rounds].reverse());
  const privateOf = (round: number) => view.mine?.rounds.find((r) => r.round === round) ?? null;
</script>

<section class="intel" aria-label="Intelligence journal">
  {#if view.mine}
    <h3 class="label">Your mission</h3>
    <p class="note">{missionNote(view.mine)}</p>
  {/if}

  <h3 class="label">Verified on {names[opp]}</h3>
  <ul class="journal">
    {#each LOCATIONS as l (l)}
      <li class={journal[l]}><span>{LOCATION_NAMES[l]}</span><span class="v">{WORDS[journal[l]]}</span></li>
    {/each}
  </ul>
  <p class="hint">Only your own investigations and the deliveries you caught count here. These are facts.</p>

  <h3 class="label">Round by round</h3>
  {#if !newest.length}<p class="hint">Nothing yet.</p>{/if}
  <ol class="rounds">
    {#each newest as r (r.round)}
      {@const own = privateOf(r.round)}
      <li>
        <p class="rn">Round {r.round}</p>
        {#if own}<p class="fact"><span class="tag ver">Verified</span> {outcomeText(own)}</p>{/if}
        {#each r.captures as c (c.seat)}<p class="fact"><span class="tag ver">Public</span> {c.seat === me ? 'You' : names[c.seat]} intercepted at {LOCATION_NAMES[c.loc]}.</p>{/each}
        <p class="fact">
          <span class="tag un">Signals</span>
          You: {r.signals[me] ? LOCATION_NAMES[r.signals[me]!] : 'none'}{r.coverSpent[me] ? ' (false)' : ''} ·
          {names[opp]}: {r.signals[opp] ? LOCATION_NAMES[r.signals[opp]!] : 'none'}{r.coverSpent[opp] ? ' (Cover spent: false)' : ''}
        </p>
      </li>
    {/each}
  </ol>

  <h3 class="label">Statements and challenges</h3>
  {#if !view.statements.length}<p class="hint">Nothing filed yet.</p>{/if}
  <div class="stack">
    {#each [...view.statements].reverse() as st (st.id)}
      <StatementRow {st} {names} {me} canChallenge={false} onchallenge={() => {}} />
    {/each}
  </div>
</section>

<style>
  .intel {
    height: 100%;
    overflow-y: auto;
    padding: 10px 12px 16px;
  }
  h3 {
    margin: 14px 0 6px;
    font-size: 17px;
  }
  h3:first-child {
    margin-top: 0;
  }
  p {
    margin: 0;
  }
  .note {
    font-size: 15px;
  }
  .hint {
    margin-top: 4px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .journal {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .journal li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 5px 0;
    border-bottom: 1px solid var(--rim);
    font-size: 14px;
  }
  .journal .v {
    color: var(--ink-3);
    text-align: right;
  }
  .journal .mission .v {
    color: var(--dd-teal-hi);
    font-weight: 700;
  }
  .journal .not .v {
    color: var(--ink);
  }
  .rounds {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .rounds li {
    padding: 6px 0;
    border-bottom: 1px solid var(--rim);
  }
  .rn {
    font-weight: 700;
    font-size: 14px;
  }
  .fact {
    margin-top: 3px;
    font-size: 13.5px;
    line-height: 1.35;
    color: var(--ink-2);
  }
  .tag {
    display: inline-block;
    padding: 0 5px;
    font: 700 11px/1.5 var(--dd-type);
    text-transform: uppercase;
    border-radius: 2px;
  }
  .ver {
    color: #10201f;
    background: var(--dd-teal-hi);
  }
  .un {
    color: var(--ink-2);
    border: 1px dashed var(--ink-3);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
