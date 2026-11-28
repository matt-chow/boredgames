<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import { api, ApiFailure } from '../client/lib/api';
  import { recentRooms } from '../client/lib/recent';
  import { router } from '../client/lib/router.svelte';
  import { settings } from '../client/lib/settings.svelte';
  import { audio, sfx } from '../client/lib/sound';
  import { load, save } from '../client/lib/storage';
  import { CODE_LENGTH, normalizeCode, type RoomSummary } from '../shared/protocol';
  import { CATALOG, type CatalogEntry } from './catalog';
  import Dialog from './Dialog.svelte';
  import GameGallery from './GameGallery.svelte';
  import GamePanel from './GamePanel.svelte';
  import GameWheel from './GameWheel.svelte';
  import Icon from './Icon.svelte';
  import RoomList from './RoomList.svelte';

  let code = $state('');
  let codeError = $state('');
  let recent = $state<RoomSummary[]>([]);
  let unreachable = $state(false);
  let chosen = $state<CatalogEntry | null>(null);
  let panelOpen = $state(false);
  let roomsOpen = $state(false);

  /** Dev server only: the deck bench, and with ?games=24 a long list, to prove any number of games fits. */
  const benchGames: CatalogEntry[] = __DECK_BENCH__
    ? [
        { id: 'fixture', name: 'Deck bench', status: 'available', minPlayers: 2, maxPlayers: 6, minutes: '5', pitch: 'Fixture cards for the deck table.', accent: '#39424e', howTo: [], settings: [] },
        ...Array.from({ length: Number(new URLSearchParams(location.search).get('games')) || 0 }, (_, i): CatalogEntry => ({
          id: `sample-${i}`,
          name: i % 3 ? `Sample ${i}` : `A very long sample game title that keeps on going, number ${i}`,
          status: 'soon',
          minPlayers: 0,
          maxPlayers: 0,
          minutes: '',
          pitch: 'A sample game.',
          accent: '#4a4038',
          howTo: [],
          settings: [],
        })),
      ]
    : [];
  const games = [...CATALOG, ...benchGames];

  /** Which game was last in the centre, by id so a new game in the catalog doesn't shift it, and the view chosen. */
  const KEY = 'bg.hub';
  const saved = load(KEY, { focus: games[0].id, view: 'wheel' as 'wheel' | 'gallery' });
  let focus = $state(games.some((g) => g.id === saved.focus) ? saved.focus : games[0].id);
  let view = $state(saved.view === 'gallery' ? 'gallery' : 'wheel');
  let preferred = saved.view === 'gallery' ? 'gallery' : 'wheel';
  const remember = () => save(KEY, { focus, view: preferred });

  /** Rooms still going come first; finished ones only behind "All rooms". */
  const active = $derived(recent.filter((r) => r.status !== 'over'));

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

  /** Swap views with the browser's shared-element transition where it has one: the game's title carries across. */
  function swap(next: () => void) {
    if (settings.instant || !document.startViewTransition) return next();
    document.startViewTransition(() => flushSync(next));
  }
  function choose(v: 'wheel' | 'gallery') {
    if (v === view) return;
    preferred = v;
    swap(() => (view = v));
    remember();
  }
  /** A tile turns the wheel to its game; the person's chosen view stays as it was. */
  function pick(id: string) {
    focus = id;
    remember();
    swap(() => (view = 'wheel'));
  }
</script>

<!-- Starting audio takes a moment, so it happens on the first press, before the wheel moves, not on its first click. -->
<main class="hub" class:wheeling={view === 'wheel'} onpointerdowncapture={() => audio()} onkeydowncapture={() => audio()}>
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

  <div class="bar">
    {#if recent.length}
      <section class="resume" aria-labelledby="resume-title">
        <h2 class="lab" id="resume-title">Your rooms</h2>
        <ul class="chips">
          {#each active.slice(0, 3) as r (r.code)}
            <li>
              <button class="chip" onclick={() => router.go(`/r/${r.code}`)} aria-label="Resume {r.gameName}, room {r.code}, {r.status === 'lobby' ? 'waiting' : 'in progress'}">
                <span class="dot" class:live={r.status === 'playing'}></span>
                <span class="rcode">{r.code}</span>
                <span class="rgame">{r.gameName}</span>
              </button>
            </li>
          {/each}
        </ul>
        <button class="btn ghost small all" class:alone={!active.length} aria-haspopup="dialog" onclick={() => (roomsOpen = true)}>
          <span class="wide">All rooms</span><span class="narrow">Rooms</span>&nbsp;<span class="num">({recent.length})</span>
        </button>
      </section>
    {/if}
    {#if unreachable}<p class="err" role="status">Can’t reach the server to check your rooms. Reload to try again.</p>{/if}
    <div class="tools">
      <div class="seg" role="group" aria-label="View">
        <button class="btn icon ghost" aria-label="Wheel" aria-pressed={view === 'wheel'} onclick={() => choose('wheel')}><Icon name="wheel" /></button>
        <button class="btn icon ghost" aria-label="Gallery" aria-pressed={view === 'gallery'} onclick={() => choose('gallery')}><Icon name="grid" /></button>
      </div>
      <button class="btn icon ghost" aria-label="Sound {settings.muted ? 'off' : 'on'}" aria-pressed={!settings.muted} onclick={() => ((settings.muted = !settings.muted), sfx.card())}>
        <Icon name={settings.muted ? 'mute' : 'sound'} />
      </button>
    </div>
  </div>

  {#if view === 'wheel'}
    <GameWheel
      {games}
      {focus}
      onopen={show}
      onfocus={(id) => {
        focus = id;
        remember();
      }}
    />
  {:else}
    <GameGallery {games} {focus} onpick={pick} />
  {/if}
</main>

{#if recent.length}
  <Dialog bind:open={roomsOpen} title="Your rooms on this device" wide>
    <RoomList rooms={[...active, ...recent.filter((r) => r.status === 'over')]} />
  </Dialog>
{/if}

{#if chosen}
  {#key chosen.id}
    <GamePanel game={chosen} bind:open={panelOpen} rooms={recent.filter((r) => r.gameId === chosen?.id)} />
  {/key}
{/if}

<style>
  .hub {
    position: relative;
    isolation: isolate;
    height: 100%;
    overflow-y: auto;
    overflow-x: clip;
    display: flex;
    flex-direction: column;
    gap: clamp(14px, 2.2vh, 24px);
    padding: max(20px, env(safe-area-inset-top)) clamp(16px, 5vw, 64px) 56px;
    background: #1b1816;
  }
  .hub.wheeling {
    padding-bottom: 40px;
  }
  .hub > :global(*:not(.glows)) {
    width: 100%;
    max-width: 1040px;
    margin-inline: auto;
  }
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 40px;
  }
  .wordmark {
    margin: 0;
    font-family: var(--font-label);
    font-weight: 800;
    font-size: clamp(36px, min(6vw, 7vh), 64px);
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

  .bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    min-height: 44px;
  }
  .resume {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px 12px;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }
  .chips li {
    min-width: 0;
  }
  .chip {
    max-width: 100%;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    border: 1px solid var(--rim);
    border-radius: 99px;
    background: var(--ground-1);
    color: var(--ink);
    font-size: 14px;
    white-space: nowrap;
    transition: transform var(--dur-1) var(--ease-out);
  }
  .chip:active {
    transform: scale(0.97);
  }
  .rcode {
    font-family: var(--font-label);
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  .rgame {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ink-2);
  }
  .dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--rim-hi);
  }
  /* A game in progress is waiting on you: the one signal colour. */
  .dot.live {
    background: var(--sprout);
  }
  .all {
    flex: none;
    min-height: 44px;
  }
  .narrow {
    display: none;
  }
  .tools {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .seg {
    display: flex;
    padding: 2px;
    border: 1px solid var(--rim);
    border-radius: var(--r-md, 10px);
  }
  .seg .btn[aria-pressed='true'] {
    background: var(--ground-2);
    color: var(--ink);
  }
  .seg .btn[aria-pressed='false'] {
    color: var(--ink-3);
  }
  /* Phones: the rooms fold behind one button, so the wheel keeps the screen. */
  @media (max-width: 639px) {
    .top {
      flex-wrap: nowrap;
      align-items: center;
    }
    .lab[for='code'] {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    #resume-title,
    .chips {
      display: none;
    }
    .joinrow {
      flex: 0 1 200px;
    }
    .joinbox .btn {
      padding: 0 12px;
    }
    .code {
      font-size: 16px;
      letter-spacing: 0.12em;
    }
    .wide {
      display: none;
    }
    .narrow {
      display: inline;
    }
  }
</style>
