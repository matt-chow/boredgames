<script lang="ts">
  import type { RoomConnection } from '../client/lib/connection.svelte';
  import { forgetRoom } from '../client/lib/recent';
  import { router } from '../client/lib/router.svelte';
  import { toasts } from '../client/lib/toast.svelte';
  import { GAMES } from '../games/registry';
  import type { RoomView } from '../shared/protocol';
  import Dialog from './Dialog.svelte';

  let { conn, room, open = $bindable(false) }: { conn: RoomConnection; room: RoomView; open: boolean } = $props();

  // With other people seated, the server hands the seat to a bot; otherwise the game ends and the table is deleted.
  const othersHere = $derived(room.seats.some((s) => s.seat !== room.you && !s.bot));
  const hasBots = $derived(!!GAMES[room.gameId]?.bot);
  let busy = $state(false);

  async function quit() {
    busy = true;
    const r = await conn.send({ t: 'leave' });
    busy = false;
    if (!r.ok) return toasts.push(r.error ?? 'Could not leave the game.', 'error');
    open = false;
    forgetRoom(room.code);
    router.go('/');
  }
</script>

<Dialog bind:open title="Quit this game?">
  <p>
    {#if !hasBots}
      Nobody can take your seat in this game, so quitting ends it for everyone and the table closes. It can’t be resumed.
    {:else if othersHere}
      A bot takes over your seat, with your hand and fields, so everyone else can finish the game. You can’t come back
      to this game.
    {:else}
      Only bots are left at this table, so the game ends and the table closes. It can’t be resumed.
    {/if}
  </p>
  <div class="actions">
    <button class="btn" disabled={busy} onclick={quit}>Quit game</button>
    <button class="btn primary" onclick={() => (open = false)}>Keep playing</button>
  </div>
</Dialog>

<style>
  p {
    margin: 0 0 20px;
    color: var(--ink-2);
    line-height: 1.5;
    text-wrap: pretty;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
