<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let { open = $bindable(false), title, wide = false, children }: { open: boolean; title: string; wide?: boolean; children: Snippet } = $props();
  let el: HTMLDialogElement;

  $effect(() => {
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  });
</script>

<dialog bind:this={el} class:wide onclose={() => (open = false)} onclick={(e) => e.target === el && (open = false)} aria-labelledby="dlg-title">
  <div class="inner">
    <header>
      <h2 id="dlg-title">{title}</h2>
      <button class="btn icon ghost" aria-label="Close" onclick={() => (open = false)}><Icon name="close" /></button>
    </header>
    <div class="body">{@render children()}</div>
  </div>
</dialog>

<style>
  dialog {
    width: min(560px, calc(100vw - 32px));
    max-height: min(84vh, 760px);
    padding: 0;
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-lg);
    background: var(--ground-2);
    color: var(--ink);
    box-shadow: var(--shadow-lift);
  }
  dialog.wide {
    width: min(760px, calc(100vw - 32px));
  }
  dialog[open] {
    animation: rise var(--dur-3) var(--ease-out);
  }
  dialog::backdrop {
    background: rgb(8 5 3 / 0.66);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
  }
  .inner {
    display: flex;
    flex-direction: column;
    max-height: inherit;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 8px 22px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-label);
    font-weight: 800;
    font-size: 26px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .body {
    overflow-y: auto;
    padding: 4px 22px 22px;
  }
</style>
