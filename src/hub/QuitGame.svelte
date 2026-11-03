<script lang="ts">
  import type { RoomConnection } from '../client/lib/connection.svelte';
  import { forgetRoom } from '../client/lib/recent';
  import { router } from '../client/lib/router.svelte';
  import { toasts } from '../client/lib/toast.svelte';
  import type { RoomView } from '../shared/protocol';
  import Dialog from './Dialog.svelte';

  let { conn, room, open = $bindable(false) }: { conn: RoomConnection; room: RoomView; open: boolean } = $props();

  // The server keeps the seat and hands it to a bot; with nobody else seated in person, the game simply stops.
  const othersHere = $derived(room.seats.some((s) => s.seat !== room.you && !s.bot));
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
    {#if othersHere}
      A bot takes over your seat, with your hand and fields, so everyone else can finish the game.
    {:else}
      Nobody else is playing in person, so the game stops here.
    {/if}
    You can’t come back to this game.
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
