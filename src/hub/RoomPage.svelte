<script lang="ts">
  import { onDestroy, onMount, type Component } from 'svelte';
  import { api, ApiFailure } from '../client/lib/api';
  import { RoomConnection } from '../client/lib/connection.svelte';
  import { forgetRoom, rememberRoom } from '../client/lib/recent';
  import { toasts } from '../client/lib/toast.svelte';
  import { router } from '../client/lib/router.svelte';
  import { loadString, save } from '../client/lib/storage';
  import { MAX_NAME, normalizeName, type RoomSummary } from '../shared/protocol';
  import { GAME_THEME, GAME_UI, type GameUiProps } from '../games/ui';
  import Lobby from './Lobby.svelte';
  import Icon from './Icon.svelte';

  let { code }: { code: string } = $props();

  type Stage = 'loading' | 'join' | 'missing' | 'closed' | 'live' | 'offline';
  let stage = $state<Stage>('loading');
  let summary = $state<RoomSummary | null>(null);
  let name = $state(loadString('bg.name'));
  let error = $state('');
  let joining = $state(false);
  let conn = $state<RoomConnection | null>(null);
  let GameUi = $state<Component<GameUiProps> | null>(null);
  let uiError = $state(false);

  async function probe() {
    stage = 'loading';
    try {
      summary = await api.summary(code);
      if (summary.member) connect();
      else stage = summary.joinable ? 'join' : 'closed';
    } catch (e) {
      stage = e instanceof ApiFailure && e.status === 404 ? 'missing' : 'offline';
    }
  }

  function connect() {
    rememberRoom(code);
    conn = new RoomConnection(code);
    // Someone quit mid-game while others play on: their seat is still there, now played by a bot.
    conn.onRoom((next, prev) => {
      if (!prev || prev.status !== 'playing') return;
      for (const s of next.seats)
        if (s.bot && s.seat !== next.you && prev.seats[s.seat] && !prev.seats[s.seat].bot)
          toasts.push(`${prev.seats[s.seat].name} left the game. A bot plays their seat now.`);
    });
    stage = 'live';
  }

  async function join(e: SubmitEvent) {
    e.preventDefault();
    const n = normalizeName(name);
    if (!n) {
      error = `Enter a name (up to ${MAX_NAME} characters).`;
      return;
    }
    save('bg.name', n);
    joining = true;
    error = '';
    try {
      await api.join(code, n);
      connect();
    } catch (err) {
      error = err instanceof ApiFailure ? err.message : 'Could not join.';
      if (err instanceof ApiFailure && (err.code === 'started' || err.code === 'full')) stage = 'closed';
    } finally {
      joining = false;
    }
  }

  onMount(() => {
    document.title = `Table ${code} · Boredgames`;
    probe();
  });
  onDestroy(() => conn?.dispose());

  const room = $derived(conn?.room ?? null);

  $effect(() => {
    // A theme that fails to load leaves the game playable in the shared look.
    GAME_THEME[room?.gameId ?? '']?.().catch(() => {});
  });

  $effect(() => {
    const id = room?.gameId;
    if (!id || GameUi || room?.status === 'lobby') return;
    const load = GAME_UI[id];
    if (!load) {
      uiError = true;
      return;
    }
    load().then(
      (m) => (GameUi = m.default),
      () => (uiError = true),
    );
  });

  $effect(() => {
    if (conn?.ended === 'left' || conn?.ended === 'removed' || conn?.ended === 'expired' || conn?.ended === 'ended')
      forgetRoom(code);
  });

  const endedText: Record<string, string> = {
    left: 'You left this table.',
    removed: 'The host removed you from this table.',
    unauthorized: 'This browser no longer holds a seat at this table.',
    expired: 'This table has closed.',
  };
</script>

{#if stage === 'live' && conn}
  <div class="themed" data-game-theme={room?.gameId}>
  {#if conn.ended}
    <div class="center">
      <div class="note">
        <h1>
          {conn.ended === 'ended' ? `${conn.endedBy || 'A player'} quit, so the game has ended.` : (endedText[conn.ended] ?? 'Disconnected.')}
        </h1>
        <button class="btn primary" onclick={() => router.go('/')}>Back to the hub</button>
      </div>
    </div>
  {:else if !room}
    <div class="center"><p class="muted">Connecting to table {code}…</p></div>
  {:else if room.status === 'lobby'}
    <Lobby {conn} {room} />
  {:else if GameUi}
    <GameUi {conn} {room} />
  {:else if uiError}
    <div class="center"><p class="muted">This game can’t be shown here. Reload to try again.</p></div>
  {:else}
    <div class="center"><p class="muted">Setting the table…</p></div>
  {/if}
  {#if conn.status === 'reconnecting' && !conn.ended}
    <div class="reconnect" role="status">
      <Icon name="wifiOff" size={16} /> Reconnecting… your seat is safe.
    </div>
  {/if}
  </div>
{:else}
  <div class="center">
    {#if stage === 'loading'}
      <p class="muted">Looking for table {code}…</p>
    {:else if stage === 'join' && summary}
      <form class="note" onsubmit={join}>
        <p class="code label">{code}</p>
        <h1>Join {summary.gameName}</h1>
        <p class="muted">{summary.players} of {summary.maxPlayers} seats taken.</p>
        <label class="lab" for="jname">Your name</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input id="jname" class="field-input" bind:value={name} maxlength={MAX_NAME} autocomplete="nickname" autofocus />
        {#if error}<p class="err" role="alert">{error}</p>{/if}
        <button class="btn primary" disabled={joining}>{joining ? 'Joining…' : 'Take a seat'}</button>
        <button type="button" class="btn ghost" onclick={() => router.go('/')}>Back</button>
      </form>
    {:else if stage === 'closed'}
      <div class="note">
        <h1>{summary?.status === 'lobby' ? 'This table is full.' : 'This game has already started.'}</h1>
        <p class="muted">Only players seated at the table can open it. Ask the host to start a new table.</p>
        <button class="btn primary" onclick={() => router.go('/')}>Back to the hub</button>
      </div>
    {:else if stage === 'missing'}
      <div class="note">
        <h1>No table with code {code}.</h1>
        <p class="muted">Check the code, or the table may have closed.</p>
        <button class="btn primary" onclick={() => router.go('/')}>Back to the hub</button>
      </div>
    {:else}
      <div class="note">
        <h1>Can’t reach the server.</h1>
        <button class="btn primary" onclick={probe}>Try again</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .themed {
    display: contents;
  }
  .center {
    height: 100%;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .note {
    width: min(420px, 100%);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .note h1 {
    font-size: 26px;
    line-height: 1.15;
    margin: 0 0 4px;
    text-wrap: balance;
  }
  .code {
    margin: 0;
    font-size: 20px;
    color: var(--sprout);
    letter-spacing: 0.2em;
  }
  .muted {
    color: var(--ink-2);
    margin: 0;
  }
  .lab {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    margin-top: 8px;
  }
  .err {
    color: var(--warn);
    margin: 0;
    font-size: 14px;
  }
  .reconnect {
    position: fixed;
    left: 50%;
    top: calc(env(safe-area-inset-top) + 12px);
    transform: translateX(-50%);
    z-index: 70;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--ground-3);
    border: 1px solid var(--warn);
    color: var(--ink);
    font-size: 14px;
    box-shadow: var(--shadow-2);
  }
</style>
