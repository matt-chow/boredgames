<script lang="ts">
  import { router } from '../../../client/lib/router.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { RoomConnection } from '../../../client/lib/connection.svelte';
  import { LOCATION_NAMES, type DView, type Loc, type RoundRecord } from '../rules/types';
  import MissionCard from './MissionCard.svelte';
  import StatementRow from './StatementRow.svelte';
  import { METHOD_TEXT, orderText } from './text';

  let { view, names, conn }: { view: DView; names: string[]; conn: RoomConnection } = $props();

  const f = $derived(view.final!);
  const me = $derived(view.you ?? 0);
  const label = (seat: number) => (seat === me ? 'You' : names[seat]);
  const headline = $derived(f.winner === null ? 'A draw' : f.winner === me ? 'You win' : `${names[f.winner]} wins`);
  const how = $derived.by(() => {
    if (f.method === 'mission' || f.method === 'counterintelligence') return `${f.winner === me ? 'You' : names[f.winner!]} ${METHOD_TEXT[f.method]}.`;
    return METHOD_TEXT[f.method];
  });
  const challenged = $derived(view.statements.filter((s) => s.challenge));
  const deliveriesAt = (seat: number, l: Loc) => f.rounds.filter((r) => r.delivered[seat] && r.orders[seat]?.target === l).length;

  function notes(r: RoundRecord): string[] {
    const out: string[] = [];
    for (const seat of [0, 1]) {
      if (r.delivered[seat]) out.push(`${label(seat)}: delivered`);
      if (r.captured[seat]) out.push(`${label(seat)}: intercepted at ${LOCATION_NAMES[r.captured[seat]!]}`);
      if (r.coverGained[seat]) out.push(`${label(seat)}: gained Cover`);
      if (r.coverSpent[seat]) out.push(`${label(seat)}: spent Cover`);
    }
    return out;
  }

  async function rematch() {
    const r = await conn.send({ t: 'rematch' });
    if (!r.ok) toasts.push(r.error ?? 'Could not start a rematch.', 'error');
  }
</script>

<main class="res">
  <header class="banner" class:won={f.winner === me}>
    <p class="case">Case closed · Round {f.rounds.length} of {view.maxRounds}</p>
    <h1 class="label">{headline}</h1>
    <p class="how">{how}</p>
    <div class="acts">
      <button class="btn primary" disabled={conn.busy} onclick={rematch}>Rematch</button>
      <button class="btn" onclick={() => router.go('/')}>Back to the hub</button>
    </div>
  </header>

  <section aria-labelledby="sc-h">
    <h2 id="sc-h" class="label">Final score</h2>
    <table>
      <thead><tr><th scope="col"></th>{#each [0, 1] as s (s)}<th scope="col">{label(s)}</th>{/each}</tr></thead>
      <tbody>
        <tr><th scope="row">Deliveries</th>{#each f.deliveries as x, i (i)}<td class="num">{x}</td>{/each}</tr>
        <tr><th scope="row">Interceptions</th>{#each view.interceptions as x, i (i)}<td class="num">{x}</td>{/each}</tr>
        <tr><th scope="row">Challenge Points</th>{#each view.challengePoints as x, i (i)}<td class="num">{x}</td>{/each}</tr>
      </tbody>
    </table>
  </section>

  <section aria-labelledby="ms-h">
    <h2 id="ms-h" class="label">The missions</h2>
    <div class="missions">
      {#each [0, 1] as s (s)}
        <div>
          <h3>{label(s)}</h3>
          <div class="cards">
            {#each f.missions[s] as l (l)}<MissionCard loc={l} count={deliveriesAt(s, l)} />{/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section aria-labelledby="rc-h">
    <h2 id="rc-h" class="label">Round by round</h2>
    <ol class="recap">
      {#each f.rounds as r (r.round)}
        <li>
          <p class="rn">Round {r.round}</p>
          {#each [0, 1] as s (s)}
            <p><strong>{label(s)}:</strong> {orderText(r.orders[s])}</p>
          {/each}
          {#if notes(r).length}<p class="ev">{notes(r).join(' · ')}</p>{/if}
        </li>
      {/each}
    </ol>
  </section>

  {#if challenged.length}
    <section aria-labelledby="ch-h">
      <h2 id="ch-h" class="label">Challenges</h2>
      <div class="stack">
        {#each challenged as st (st.id)}<StatementRow {st} {names} {me} canChallenge={false} onchallenge={() => {}} />{/each}
      </div>
    </section>
  {/if}
</main>

<style>
  .res {
    height: 100%;
    overflow-y: auto;
    max-width: 880px;
    margin: 0 auto;
    padding: 16px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-wrap: anywhere;
  }
  .banner {
    padding: 16px 18px;
    background: var(--dd-paper) url('/art/deaddrop/paper.svg');
    color: var(--dd-paper-ink);
    border-top: 6px solid var(--dd-wine);
    animation: in var(--dur-3) var(--ease-out);
  }
  @keyframes in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  .case {
    margin: 0;
    font: 700 13px var(--dd-type);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--dd-wine);
  }
  h1 {
    margin: 2px 0 4px;
    font-size: clamp(40px, 9vw, 64px);
    line-height: 1;
  }
  .how {
    margin: 0;
    font-size: 16px;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .banner .btn:not(.primary) {
    color: var(--dd-paper-ink);
    background: transparent;
    border-color: var(--dd-paper-ink);
  }
  .banner .btn.primary {
    background: var(--dd-wine);
    border-color: var(--dd-wine);
    color: var(--dd-paper);
  }
  h2 {
    margin: 0 0 8px;
    font-size: 22px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 15px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 6px 8px;
    text-align: right;
    border-bottom: 1px solid var(--rim);
  }
  th[scope='row'] {
    text-align: left;
    font-weight: 500;
    color: var(--ink-2);
  }
  .missions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .recap {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .recap li {
    padding: 8px 0;
    border-bottom: 1px solid var(--rim);
  }
  .recap p {
    margin: 0;
    font-size: 14px;
  }
  .rn {
    font-weight: 700;
  }
  .ev {
    color: var(--dd-teal-hi);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  @media (max-width: 480px) {
    .missions {
      grid-template-columns: 1fr;
    }
  }
</style>
