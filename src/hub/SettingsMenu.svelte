<script lang="ts">
  import { settings } from '../client/lib/settings.svelte';
  import { sfx } from '../client/lib/sound';
  import Icon from './Icon.svelte';

  let { onhelp = undefined }: { onhelp?: () => void } = $props();
  let open = $state(false);
  let root: HTMLElement;

  function outside(e: PointerEvent) {
    if (open && !root.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onpointerdown={outside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="menu" bind:this={root}>
  <button class="btn icon ghost" aria-label="Sound {settings.muted ? 'off' : 'on'}" aria-pressed={!settings.muted} onclick={() => ((settings.muted = !settings.muted), sfx.card())}>
    <Icon name={settings.muted ? 'mute' : 'sound'} />
  </button>
  {#if onhelp}
    <button class="btn icon ghost" aria-label="How to play" onclick={onhelp}><Icon name="help" /></button>
  {/if}
  <button class="btn icon ghost" aria-label="Settings" aria-expanded={open} onclick={() => (open = !open)}><Icon name="settings" /></button>
  {#if open}
    <div class="pop" role="group" aria-label="Settings">
      <label><input type="checkbox" checked={!settings.muted} onchange={(e) => (settings.muted = !e.currentTarget.checked)} /> Sound effects</label>
      <label><input type="checkbox" checked={settings.reducedMotion} onchange={(e) => (settings.reducedMotion = e.currentTarget.checked)} /> Reduce motion</label>
      <label><input type="checkbox" checked={settings.lowPerf} onchange={(e) => (settings.lowPerf = e.currentTarget.checked)} /> Low-power mode</label>
      <div class="seg" role="radiogroup" aria-label="Table layout">
        <span>Layout</span>
        <button role="radio" aria-checked={settings.layout === 'spatial'} class:on={settings.layout === 'spatial'} onclick={() => (settings.layout = 'spatial')}>Table</button>
        <button role="radio" aria-checked={settings.layout === 'compact'} class:on={settings.layout === 'compact'} onclick={() => (settings.layout = 'compact')}>Compact</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    display: flex;
    gap: 2px;
  }
  .pop {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 60;
    width: 240px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-radius: var(--r-md);
    border: 1px solid var(--rim-hi);
    background: var(--ground-2);
    box-shadow: var(--shadow-lift);
    transform-origin: top right;
    animation: pop var(--dur-2) var(--ease-out);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
  }
  label {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    font-size: 14px;
    cursor: pointer;
  }
  input {
    accent-color: var(--sprout);
    width: 16px;
    height: 16px;
  }
  .seg {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: 14px;
  }
  .seg span {
    flex: 1;
  }
  .seg button {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--rim-hi);
    background: transparent;
    color: var(--ink-2);
    font-size: 13px;
    cursor: pointer;
  }
  .seg button.on {
    background: var(--ink);
    color: var(--ground-1);
    border-color: var(--ink);
  }
</style>
