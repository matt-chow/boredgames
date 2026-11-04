<script lang="ts">
  import { router } from '../client/lib/router.svelte';
  import type { RoomSummary } from '../shared/protocol';
  import Icon from './Icon.svelte';

  let { rooms }: { rooms: RoomSummary[] } = $props();

  const statusText = (s: RoomSummary) =>
    s.status === 'lobby' ? `Waiting · ${s.players}/${s.maxPlayers}` : s.status === 'playing' ? 'In progress' : 'Finished';
</script>

<ul>
  {#each rooms as r (r.code)}
    <li>
      <button class="rrow" onclick={() => router.go(`/r/${r.code}`)}>
        <span class="rcode label">{r.code}</span>
        <span class="rgame">{r.gameName}</span>
        <span class="rstat">{statusText(r)}</span>
        <Icon name="arrowRight" size={16} />
      </button>
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 6px 10px;
  }
  .rrow {
    width: 100%;
    min-height: 44px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto 16px;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--rim);
    background: var(--ground-2);
    text-align: left;
    color: var(--ink-2);
    transition:
      border-color var(--dur-1) var(--ease-out),
      background-color var(--dur-1) var(--ease-out);
  }
  .rrow:hover {
    border-color: var(--rim-hi);
    background: var(--ground-3);
    color: var(--ink);
  }
  .rcode {
    color: var(--ink);
    font-size: 16px;
  }
  .rgame {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rstat {
    font-size: 13px;
  }
</style>
