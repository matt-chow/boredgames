<script lang="ts">
  import { api, ApiFailure } from '../client/lib/api';
  import { rememberRoom } from '../client/lib/recent';
  import { router } from '../client/lib/router.svelte';
  import { loadString, save } from '../client/lib/storage';
  import { CODE_LENGTH, MAX_NAME, normalizeCode, normalizeName, type RoomSummary } from '../shared/protocol';
  import type { CatalogEntry } from './catalog';
  import Dialog from './Dialog.svelte';
  import Guide from './Guide.svelte';
  import type { GuideDoc } from './guide';
  import Icon from './Icon.svelte';
  import RoomList from './RoomList.svelte';

  let { game, open = $bindable(false), rooms }: { game: CatalogEntry; open: boolean; rooms: RoomSummary[] } = $props();

  let name = $state(loadString('bg.name'));
  let code = $state('');
  let busy = $state<'' | 'friends' | 'bots'>('');
  let error = $state('');
  let codeError = $state('');
  let broken = $state(false);
  let nameInput = $state<HTMLInputElement>();
  let guideOpen = $state(false);
  let guideDoc = $state<GuideDoc | null>(null);

  function openGuide() {
    guideOpen = true;
    if (!guideDoc) game.guide?.().then((m) => (guideDoc = m.guide));
  }

  async function create(withBots: boolean) {
    error = '';
    const n = normalizeName(name);
    if (!n) {
      error = `Enter your name first (up to ${MAX_NAME} characters).`;
      nameInput?.focus();
      return;
    }
    save('bg.name', n);
    busy = withBots ? 'bots' : 'friends';
    try {
      const r = await api.create(n, game.id, withBots ? game.minPlayers - 1 : 0);
      rememberRoom(r.code);
      router.go(`/r/${r.code}`);
    } catch (err) {
      error = err instanceof ApiFailure ? err.message : 'Could not create a room. Check your connection and try again.';
    } finally {
      busy = '';
    }
  }

  function join(e: SubmitEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!c) {
      codeError = `Codes are ${CODE_LENGTH} letters and digits.`;
      return;
    }
    const n = normalizeName(name);
    if (n) save('bg.name', n);
    router.go(`/r/${c}`);
  }
</script>

<Dialog bind:open title={game.name} wide>
  <div class="panel">
    <div class="cover" style="--accent:{game.accent}" aria-hidden="true">
      {#if game.cover && !broken}<img src={game.cover} alt="" width="300" height="420" onerror={() => (broken = true)} />{/if}
    </div>

    <div class="info">
      <ul class="facts">
        <li><Icon name="users" size={16} /><span class="num">{game.minPlayers}–{game.maxPlayers}</span> players</li>
        <li><Icon name="clock" size={16} /><span class="num">{game.minutes}</span> min</li>
      </ul>
      <p class="pitch">{game.pitch}</p>

      <label class="lab" for="name">Your name at the table</label>
        <input
          id="name"
          class="field-input"
          bind:this={nameInput}
          bind:value={name}
          maxlength={MAX_NAME}
          autocomplete="nickname"
          placeholder="Your name"
          aria-describedby={error ? 'name-err' : undefined}
          oninput={() => (error = '')}
        />
        {#if error}<p class="err" id="name-err" role="alert">{error}</p>{/if}

        <div class="acts">
          <button class="btn primary" disabled={!!busy} onclick={() => create(false)}>
            {busy === 'friends' ? 'Creating…' : 'Create room'}
            <Icon name="arrowRight" />
          </button>
          <button class="btn" disabled={!!busy} onclick={() => create(true)}>
            <Icon name="bot" size={18} />
            {busy === 'bots' ? 'Seating bots…' : 'Practise with bots'}
          </button>
        </div>
        <p class="hint">With bots you play {game.minPlayers - 1} simple computer {game.minPlayers === 2 ? 'player' : 'players'}. You can add friends from the room.</p>
    </div>
  </div>

  <form class="join" onsubmit={join}>
      <label class="lab" for="panel-code">Join a room</label>
      <div class="joinbox">
        <input
          id="panel-code"
          class="field-input code"
          bind:value={code}
          maxlength={CODE_LENGTH + 2}
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="ABC123"
          oninput={() => (codeError = '')}
        />
        <button class="btn">Join</button>
      </div>
      {#if codeError}<p class="err" role="alert">{codeError}</p>{/if}
    </form>

    {#if rooms.length}
      <section class="sect">
        <h3 class="lab">Your rooms</h3>
        <RoomList {rooms} />
      </section>
    {/if}

    <details class="sect">
      <summary>How to play</summary>
      <ul class="lines">
        {#each game.howTo as line (line)}<li>{line}</li>{/each}
      </ul>
      {#if game.guide}<button type="button" class="btn small" onclick={openGuide}>Open the full guide</button>{/if}
    </details>

    <details class="sect">
      <summary>Room setup</summary>
      <p class="hint">The host sets these in the room, before the game starts. Sound and motion are in the Settings menu at the table.</p>
      <ul class="lines">
        {#each game.settings as line (line)}<li>{line}</li>{/each}
      </ul>
    </details>
</Dialog>

<Guide bind:open={guideOpen} doc={guideDoc} />

<style>
  .panel {
    display: grid;
    grid-template-columns: minmax(120px, 190px) minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }
  .cover {
    aspect-ratio: 5 / 7;
    border-radius: 4px;
    overflow: hidden;
    background: var(--accent);
    box-shadow: var(--shadow-2);
  }
  .cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .facts {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    margin: 0;
    padding: 0;
    font-size: 14px;
    color: var(--ink-2);
  }
  .facts li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .pitch {
    margin: 0 0 6px;
    color: var(--ink-2);
    text-wrap: pretty;
  }
  .lab {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .err {
    margin: 0;
    font-size: 14px;
    color: var(--warn);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }
  .acts .btn {
    min-height: 48px;
    flex: 1 1 170px;
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--ink-3);
  }
  .join {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 18px;
  }
  .joinbox {
    display: flex;
    gap: 8px;
  }
  .joinbox .btn {
    min-height: 48px;
    padding: 0 22px;
  }
  .code {
    min-width: 0;
    font-family: var(--font-label);
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    font-size: 20px;
  }
  .code::placeholder {
    letter-spacing: 0.24em;
    color: var(--rim-hi);
  }
  .sect {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--rim);
  }
  section.sect {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  summary {
    min-height: 32px;
    font-weight: 600;
    cursor: pointer;
  }
  .lines {
    margin: 8px 0 0;
    padding-left: 18px;
    color: var(--ink-2);
    font-size: 14px;
  }
  .lines li + li {
    margin-top: 4px;
  }
  @media (max-width: 560px) {
    .panel {
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 14px;
    }
    /* The name and buttons need the whole width; only the summary sits beside the cover. */
    .cover {
      grid-row: span 2;
    }
    .info {
      display: contents;
    }
    .info > * {
      grid-column: 1 / -1;
      margin-block: 0;
    }
    .info > .facts,
    .info > .pitch {
      grid-column: 2;
    }
  }
</style>
