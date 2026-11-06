<script lang="ts">
  import type { DAction, DView } from '../rules/types';

  /** Waiting on the rival: a plain line, and a way forward once their time has run out. */
  let { view, rival, busy, act, what }: { view: DView; rival: string; busy: boolean; act: (a: DAction) => unknown; what: string } = $props();

  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });

  const left = $derived(view.callAt === null ? null : Math.max(0, Math.ceil((view.callAt - now) / 1000)));
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

{#if left !== null}
  <div class="wait">
    <p>Waiting for {rival}. {what}</p>
    <button class="btn small" disabled={left > 0 || busy} onclick={() => act({ type: 'callTime', round: view.round, phase: view.phase })}>
      {left > 0 ? `Call time in ${mmss(left)}` : 'Call time'}
    </button>
  </div>
{/if}

<style>
  .wait {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    color: var(--ink-2);
    font-size: 14px;
  }
  p {
    margin: 0;
    flex: 1 1 220px;
  }
  .btn {
    font-variant-numeric: tabular-nums;
  }
</style>
