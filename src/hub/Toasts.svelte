<script lang="ts">
  import { toasts } from '../client/lib/toast.svelte';
  import { fly } from 'svelte/transition';
  import { settings } from '../client/lib/settings.svelte';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <button
      class="toast {t.tone}"
      transition:fly={{ y: 12, duration: settings.instant ? 0 : 220 }}
      onclick={() => toasts.dismiss(t.id)}
    >
      {t.text}
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    top: calc(env(safe-area-inset-top) + 64px);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    z-index: 60;
    pointer-events: none;
    width: min(92vw, 460px);
  }
  .toast {
    pointer-events: auto;
    border: 1px solid var(--rim-hi);
    background: var(--ground-2);
    color: var(--ink);
    padding: 10px 16px;
    border-radius: var(--r-md);
    box-shadow: var(--shadow-2);
    font-size: 14px;
    text-align: left;
    max-width: 100%;
  }
  .toast.error {
    border-color: color-mix(in oklab, var(--warn) 60%, var(--rim));
    background: color-mix(in oklab, var(--warn) 14%, var(--ground-2));
  }
</style>
