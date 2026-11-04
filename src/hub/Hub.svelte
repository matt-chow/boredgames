<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiFailure } from '../client/lib/api';
  import { recentRooms } from '../client/lib/recent';
  import { router } from '../client/lib/router.svelte';
  import { CODE_LENGTH, normalizeCode, type RoomSummary } from '../shared/protocol';
  import { CATALOG, type CatalogEntry } from './catalog';
  import GameBox from './GameBox.svelte';
  import GamePanel from './GamePanel.svelte';
  import RoomList from './RoomList.svelte';

  let code = $state('');
  let codeError = $state('');
  let recent = $state<RoomSummary[]>([]);
  let unreachable = $state(false);
  let chosen = $state<CatalogEntry | null>(null);
  let panelOpen = $state(false);

  /** Dev server only: the deck bench, and with ?shelf=24 a full shelf, to prove any number of games fits. */
  const benchGames: CatalogEntry[] = __DECK_BENCH__
    ? [
        { id: 'fixture', name: 'Deck bench', status: 'available', minPlayers: 2, maxPlayers: 6, minutes: '5', pitch: 'Fixture cards for the deck table.', accent: '#39424e', howTo: [], settings: [] },
        ...Array.from({ length: Number(new URLSearchParams(location.search).get('shelf')) || 0 }, (_, i): CatalogEntry => ({
          id: `sample-${i}`,
          name: i % 3 ? `Sample ${i}` : `A very long sample game title that keeps on going, number ${i}`,
          status: 'soon',
          minPlayers: 0,
          maxPlayers: 0,
          minutes: '',
          pitch: 'A sample box.',
          cover: i % 2 ? undefined : '/art/covers/missing.svg',
          accent: '#4a4038',
          howTo: [],
          settings: [],
        })),
      ]
    : [];
  const games = [...CATALOG, ...benchGames];

  onMount(() => {
    document.title = 'Boredgames';
    for (const c of recentRooms())
      api.summary(c).then(
        (s) => {
          if (s.member) recent = [...recent, s].sort((a, b) => recentRooms().indexOf(a.code) - recentRooms().indexOf(b.code));
        },
        (err) => {
          if (err instanceof ApiFailure && err.status === 0) unreachable = true;
        },
      );
  });

  function show(g: CatalogEntry) {
    chosen = g;
    panelOpen = true;
  }

  function join(e: SubmitEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!c) {
      codeError = `Codes are ${CODE_LENGTH} letters and digits.`;
      return;
    }
    router.go(`/r/${c}`);
  }
</script>

<main class="hub">
  <header class="top">
    <h1 class="wordmark">Boredgames</h1>
    <form class="joinrow" onsubmit={join}>
      <label class="lab" for="code">Have a code?</label>
      <div class="joinbox">
        <input
          id="code"
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
  </header>

  {#if recent.length}
    <section class="resume" aria-labelledby="resume-title">
      <h2 class="lab" id="resume-title">Your rooms on this device</h2>
      <RoomList rooms={recent} />
    </section>
  {/if}
  {#if unreachable}<p class="err" role="status">Can’t reach the server to check your rooms. Reload to try again.</p>{/if}

  <section class="case" aria-label="Games">
    {#each games as g (g.id)}
      <GameBox game={g} onopen={() => show(g)} />
    {/each}
  </section>
</main>

{#if chosen}
  {#key chosen.id}
    <GamePanel game={chosen} bind:open={panelOpen} rooms={recent.filter((r) => r.gameId === chosen?.id)} />
  {/key}
{/if}

<style>
  .hub {
    height: 100%;
    overflow-y: auto;
    overflow-x: clip;
    display: flex;
    flex-direction: column;
    gap: clamp(24px, 4vw, 40px);
    padding: max(28px, env(safe-area-inset-top)) clamp(16px, 5vw, 64px) 56px;
    /* Charcoal wall, lit gently from above. */
    background:
      radial-gradient(70% 420px at 50% 0, rgb(226 170 110 / 0.09), transparent 75%),
      #1b1816;
  }
  .hub > * {
    width: 100%;
    max-width: 1180px;
    margin-inline: auto;
  }
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px 40px;
  }
  .wordmark {
    margin: 0;
    font-family: var(--font-label);
    font-weight: 800;
    font-size: clamp(44px, 7vw, 76px);
    line-height: 0.85;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    color: var(--ink);
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
  .joinrow {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 0 1 280px;
    min-width: 0;
  }
  .joinbox {
    display: flex;
    gap: 8px;
  }
  .joinbox .btn {
    min-height: 44px;
    padding: 0 18px;
  }
  .code {
    min-width: 0;
    min-height: 44px;
    font-family: var(--font-label);
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-size: 18px;
  }
  .code::placeholder {
    letter-spacing: 0.2em;
    color: var(--rim-hi);
  }
  .resume {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* As many boxes per row as fit. No game has a position of its own, so none can end up out of reach. */
  .case {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(136px, 15vw, 172px), 1fr));
    gap: 32px clamp(20px, 3vw, 36px);
    overflow-x: clip;
    overflow-clip-margin: 0;
    padding-top: 10px;
  }
  @media (max-width: 480px) {
    .case {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 28px 20px;
    }
  }
</style>
