<script lang="ts">
  import { ROLE, artOf } from '../rules/cards';
  import type { MAction, MView } from '../rules/types';
  import Activity from './Activity.svelte';
  import { seenText } from './text';

  /** The private panel and the Mine Activity feed. The players sit around the board (Seats). */
  let {
    view,
    act,
    who,
    busy,
    shown = true,
    unread = $bindable(0),
  }: { view: MView; act: (a: MAction) => unknown; who: (seat: number) => string; busy: boolean; shown?: boolean; unread?: number } = $props();

  const me = $derived(view.me);
  const seen = $derived([...(me?.seen ?? [])].reverse());
</script>

<div class="side">
  {#if me}
    <section class="private" aria-labelledby="ms-private">
      <h2 id="ms-private" class="h">Only you can see this</h2>
      <div class="role">
        {#if me.role}
          <img src={artOf(me.role)} alt="" width="60" height="90" />
          <div>
            <p class="rname">{ROLE[me.role].name}</p>
            <p class="rtext">{ROLE[me.role].text}</p>
          </div>
        {:else}
          <p class="rtext">No role in the Prospector Duel: you both dig for the gold, and whoever reaches it earns most.</p>
        {/if}
      </div>
      <p class="gold"><img src={artOf('nugget')} alt="" width="20" height="20" /> {me.gold} gold{#if me.rewards.length}<span class="muted"> ({me.rewards.join(' + ')})</span>{/if}</p>
      {#if seen.length}
        <h3 class="h3">What you have seen</h3>
        <ul class="seen">
          {#each seen as o, i (i)}<li><span class="muted">Round {o.round}{o.round !== view.round ? ' (may have changed)' : ''}:</span> {seenText(o, who)}</li>{/each}
        </ul>
      {/if}
    </section>
  {/if}

  <Activity {view} {act} {who} {busy} {shown} bind:unread />
</div>

<style>
  .side {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 10px 12px 16px;
    overflow-wrap: anywhere;
  }
  .h {
    margin: 0 0 6px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .h3 {
    margin: 8px 0 4px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .muted {
    font-size: 12px;
    color: var(--ink-3);
  }
  .private {
    padding: 8px 10px;
    border: 1px dashed var(--rim-hi);
    border-radius: var(--r-md);
    background: var(--ground-2);
  }
  .role {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .role img {
    border-radius: 5px;
    flex: none;
  }
  .rname {
    margin: 0;
    font-weight: 700;
  }
  .rtext {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--ink-2);
  }
  .gold {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 0;
    font-weight: 600;
  }
  .seen {
    margin: 0;
    padding-left: 16px;
    font-size: 13px;
  }
</style>
