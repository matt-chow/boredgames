<script lang="ts">
  import type { GameUiProps } from '../ui';
  import { toasts } from '../../client/lib/toast.svelte';

  let { conn, room }: GameUiProps = $props();
  const g = $derived(room.game as { total: number; target: number; turn: number });

  async function add(amount: number) {
    const r = await conn.act({ type: 'add', amount });
    if (!r.ok) toasts.push(r.error ?? 'Not allowed.', 'error');
  }
</script>

<main class="tally">
  <p class="num total">{g.total} / {g.target}</p>
  <p>{room.status === 'over' ? 'Game over' : room.actors.includes(room.you) ? 'Your turn' : 'Waiting…'}</p>
  <div class="row">
    {#each [1, 2, 3] as n (n)}
      <button class="btn" disabled={!room.actors.includes(room.you)} onclick={() => add(n)}>+{n}</button>
    {/each}
  </div>
</main>

<style>
  .tally {
    height: 100%;
    display: grid;
    place-content: center;
    text-align: center;
    gap: 12px;
  }
  .total {
    font-family: var(--font-label);
    font-size: 72px;
    margin: 0;
  }
  .row {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
</style>
