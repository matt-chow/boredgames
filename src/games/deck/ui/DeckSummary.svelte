<script lang="ts">
  import type { RoomConnection } from '../../../client/lib/connection.svelte';
  import { router } from '../../../client/lib/router.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { CardDef, DeckView, FinalScore } from '../../../engine/deckbuilder';
  import type { RoomView } from '../../../shared/protocol';

  let {
    g,
    room,
    conn,
    defs,
    code,
    name,
    points,
    projectName,
    onclose,
  }: {
    g: DeckView;
    room: RoomView;
    conn: RoomConnection;
    defs: Record<string, CardDef>;
    /** The share code for this game's market. */
    code: string;
    name: (s: number) => string;
    points: string;
    projectName: (key: string) => string;
    onclose: () => void;
  } = $props();

  /** The server's ranking, so ties read the same here as in the room's results. */
  const rankOf = $derived(new Map((room.results ?? []).map((r) => [r.seat, r])));
  const ranked = $derived([...(g.final ?? [])].sort((a, b) => (rankOf.get(a.seat)?.rank ?? 0) - (rankOf.get(b.seat)?.rank ?? 0)));
  const winners = $derived(ranked.filter((r) => rankOf.get(r.seat)?.winner));
  const headline = $derived(
    winners.some((w) => w.seat === g.you) ? 'You win' : winners.length ? `${winners.map((w) => name(w.seat)).join(' & ')} ${winners.length > 1 ? 'win' : 'wins'}` : 'Game over',
  );
  const scoring = (r: FinalScore) => r.cards.filter((c) => c.vp !== 0).map((c) => `${c.count} ${defs[c.key]?.name ?? c.key}: ${c.vp}`.replace('-', '−'));

  async function rematch() {
    const r = await conn.send({ t: 'rematch' });
    if (!r.ok) toasts.push(r.error ?? 'Couldn’t start a rematch.', 'error');
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toasts.push('Market code copied.');
    } catch {
      toasts.push(`Market code: ${code}`);
    }
  }
</script>

<div class="scrim">
  <div class="sum" role="dialog" aria-modal="true" aria-labelledby="dsum-h">
    <h2 id="dsum-h">{headline}</h2>
    <ol>
      {#each ranked as r (r.seat)}
        {@const res = rankOf.get(r.seat)}
        <li class:win={res?.winner}>
          <span class="rk num">{res?.rank}</span>
          <span class="nm">{r.seat === g.you ? `${name(r.seat)} (you)` : name(r.seat)}</span>
          <span class="dt">
            {[...scoring(r), ...r.projects.map((p) => `${projectName(p.key)}: ${p.vp}`), ...(r.tokens ? [`Tokens: ${r.tokens}`] : [])].join(' · ') || `No ${points}`} · {r.turns} {r.turns === 1 ? 'turn' : 'turns'}
          </span>
          <span class="sc num">{r.total}</span>
        </li>
      {/each}
    </ol>
    <p class="note">On equal {points}, the player who took fewer turns ranks higher.</p>
    <p class="market">
      Market code <button class="btn ghost small" onclick={copyCode}>Copy</button>
    </p>
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
    width: min(520px, 100%);
    max-height: 100%;
    overflow-y: auto;
    padding: 26px 24px 22px;
    border-radius: var(--r-lg);
    border: 1px solid var(--rim-hi);
    background: var(--ground-2);
    box-shadow: var(--shadow-lift);
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
    margin: 14px 0 6px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .market {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
