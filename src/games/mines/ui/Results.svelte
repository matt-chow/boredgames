<script lang="ts">
  import type { RoomConnection } from '../../../client/lib/connection.svelte';
  import { router } from '../../../client/lib/router.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { RoomView } from '../../../shared/protocol';
  import { ROLE } from '../rules/cards';
  import type { MView } from '../rules/types';
  import { MODE_NAMES } from './text';

  let { view, room, conn, who }: { view: MView; room: RoomView; conn: RoomConnection; who: (seat: number) => string } = $props();

  const f = $derived(view.final!);
  const best = $derived(Math.max(...f.gold));
  const winners = $derived(f.gold.flatMap((g, i) => (g === best ? [i] : [])));
  const order = $derived(f.gold.map((g, i) => ({ g, i })).sort((a, b) => b.g - a.g));
  const headline = $derived(winners.length > 1 ? `${winners.map(who).join(' and ')} share the win` : winners[0] === view.me?.seat ? 'You win' : `${who(winners[0])} wins`);

  async function rematch() {
    const r = await conn.send({ t: 'rematch' });
    if (!r.ok) toasts.push(r.error ?? 'Could not start a rematch.', 'error');
  }
</script>

<main class="res">
  <header class="banner" class:won={view.me && winners.includes(view.me.seat)}>
    <p class="kicker">{MODE_NAMES[view.config.mode]} · {view.rounds.length} {view.rounds.length === 1 ? 'round' : 'rounds'}</p>
    <h1 class="label">{headline}</h1>
    <p class="how">with {best} gold.</p>
    <div class="acts">
      <button class="btn primary" disabled={conn.busy} onclick={rematch}>Rematch</button>
      <button class="btn" onclick={() => router.go('/')}>Back to the hub</button>
    </div>
  </header>

  <section aria-labelledby="ms-final">
    <h2 id="ms-final" class="label">Final gold</h2>
    <ol class="final">
      {#each order as { g, i } (i)}
        <li class:win={g === best}><span>{who(i)}</span><span class="num">{g}{#if f.rewards[i]?.length}<span class="muted"> ({f.rewards[i].join(' + ')})</span>{/if}</span></li>
      {/each}
    </ol>
  </section>

  <section aria-labelledby="ms-rounds">
    <h2 id="ms-rounds" class="label">Round by round</h2>
    <div class="scroll">
      <table>
        <thead><tr><th scope="col">Round</th><th scope="col">Outcome</th>{#each room.seats as s (s.seat)}<th scope="col">{who(s.seat)}</th>{/each}</tr></thead>
        <tbody>
          {#each view.rounds as r (r.round)}
            <tr>
              <th scope="row">{r.round}</th>
              <td>{r.end === 'gold' ? `Gold, by ${who(r.finder!)}` : 'Dry'}</td>
              {#each r.roles as role, s (s)}
                <td class:win={r.winners.includes(s)}>{role ? ROLE[role].name : '—'}{#each r.payouts.filter((p) => p.seat === s) as p, k (k)}{' '}<span class="num">+{p.gold}</span>{/each}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</main>

<style>
  .res {
    height: 100%;
    overflow-y: auto;
    max-width: 900px;
    margin: 0 auto;
    padding: max(16px, env(safe-area-inset-top)) 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .banner {
    padding: 16px;
    border: 1px solid var(--rim);
    border-radius: var(--r-md);
    background: var(--ground-2);
  }
  .banner.won {
    border-color: var(--sprout);
  }
  .kicker,
  .how {
    margin: 0;
    color: var(--ink-2);
  }
  h1 {
    margin: 4px 0;
    font-size: 30px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .final {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .final li {
    display: flex;
    justify-content: space-between;
    padding: 6px 8px;
    border-bottom: 1px solid var(--rim);
  }
  .win {
    font-weight: 700;
    color: var(--sprout);
  }
  .muted {
    color: var(--ink-3);
    font-weight: 400;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 13px;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 4px 8px;
    border-bottom: 1px solid var(--rim);
    white-space: nowrap;
  }
</style>
