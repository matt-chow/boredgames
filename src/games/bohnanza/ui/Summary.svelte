<script lang="ts">
  import type { RoomConnection } from '../../../client/lib/connection.svelte';
  import { router } from '../../../client/lib/router.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { RoomView } from '../../../shared/protocol';
  import type { BView } from '../rules/view';

  let {
    g,
    room,
    conn,
    name,
    onclose,
  }: { g: BView; room: RoomView; conn: RoomConnection; name: (s: number) => string; onclose: () => void } = $props();

  const ranked = $derived([...(g.result ?? [])].sort((a, b) => a.rank - b.rank));
  const winners = $derived(ranked.filter((r) => r.winner));
  const headline = $derived(
    winners.some((w) => w.seat === g.you)
      ? 'You win'
      : winners.length
        ? `${winners.map((w) => name(w.seat)).join(' & ')} ${winners.length > 1 ? 'win' : 'wins'}`
        : 'Game over',
  );

  async function rematch() {
    const r = await conn.send({ t: 'rematch' });
    if (!r.ok) toasts.push(r.error ?? 'Couldn’t start a rematch.', 'error');
  }
</script>

<div class="scrim">
  <div class="sum" role="dialog" aria-modal="true" aria-labelledby="sum-h">
    <h2 id="sum-h">{headline}</h2>
    <ol>
      {#each ranked as r, i (r.seat)}
        <li class:win={r.winner} class:you={r.seat === g.you} style="--i:{i}">
          <span class="rk num">{r.rank}</span>
          <span class="nm">{r.seat === g.you ? `${name(r.seat)} (you)` : name(r.seat)}</span>
          {#if r.detail}<span class="dt">{r.detail}</span>{/if}
          <span class="sc num">{r.score}</span>
        </li>
      {/each}
    </ol>
    <p class="note">Ties go to the player who sat furthest clockwise from the starting player.</p>
    <div class="acts">
      <button class="btn ghost" onclick={() => router.go('/')}>Back to hub</button>
      <button class="btn" onclick={onclose}>View table</button>
      {#if g.you !== null}
        <button class="btn primary" onclick={rematch}>Play again</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 65;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(8 5 3 / 0.7);
  }
  .sum {
    width: min(480px, 100%);
    padding: 26px 24px 22px;
    border-radius: var(--r-lg);
    border: 1px solid var(--rim-hi);
    background: var(--ground-2);
    box-shadow: var(--shadow-lift);
    animation: rise var(--dur-3) var(--ease-out);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
  }
  h2 {
    margin: 0 0 18px;
    font-family: var(--font-label);
    font-size: 38px;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: baseline;
    column-gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--rim);
    animation: rise var(--dur-3) var(--ease-out) backwards;
    animation-delay: calc(var(--i) * 70ms + 120ms);
  }
  .rk {
    color: var(--ink-3);
  }
  .nm {
    font-weight: 600;
  }
  .dt {
    grid-column: 2;
    grid-row: 2;
    font-size: 13px;
    color: var(--ink-3);
  }
  .sc {
    grid-column: 3;
    grid-row: 1;
    font-size: 22px;
    font-weight: 700;
    color: var(--coin);
  }
  .win .nm {
    color: var(--sprout);
  }
  .note {
    margin: 14px 0 20px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
