<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiFailure } from '../client/lib/api';
  import { router } from '../client/lib/router.svelte';
  import { recentRooms, rememberRoom } from '../client/lib/recent';
  import { loadString, save } from '../client/lib/storage';
  import { CODE_LENGTH, MAX_NAME, normalizeCode, normalizeName, type RoomSummary } from '../shared/protocol';
  import Card from '../games/bohnanza/ui/Card.svelte';
  import type { Bean } from '../games/bohnanza/rules/cards';
  import { CATALOG, type CatalogEntry } from './catalog';
  import Icon from './Icon.svelte';

  let name = $state(loadString('bg.name'));
  let code = $state('');
  /** `${gameId}:${mode}` while a create request is in flight. */
  let busy = $state('');
  let error = $state('');
  let codeError = $state('');
  let recent = $state<RoomSummary[]>([]);
  let nameInput: HTMLInputElement;

  const fan: Bean[] = ['red', 'blackeyed', 'chili', 'blue', 'green'];
  const BENCH: CatalogEntry | null = __DECK_BENCH__ ? { id: 'fixture', name: 'Deck bench', minPlayers: 2, maxPlayers: 6, minutes: '', pitch: '' } : null;

  onMount(() => {
    document.title = 'Boredgames';
    for (const c of recentRooms())
      api.summary(c).then(
        (s) => {
          if (s.member) recent = [...recent, s].sort((a, b) => recentRooms().indexOf(a.code) - recentRooms().indexOf(b.code));
        },
        () => {},
      );
  });

  async function open(g: CatalogEntry, withBots: boolean) {
    error = '';
    const n = normalizeName(name);
    if (!n) {
      error = `Enter your name first (up to ${MAX_NAME} characters).`;
      nameInput.focus();
      return;
    }
    save('bg.name', n);
    busy = `${g.id}:${withBots ? 'bots' : 'friends'}`;
    try {
      const r = await api.create(n, g.id, withBots ? g.minPlayers - 1 : 0);
      rememberRoom(r.code);
      router.go(`/r/${r.code}`);
    } catch (err) {
      error = err instanceof ApiFailure ? err.message : 'Could not open a table. Check your connection and try again.';
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

  const statusText = (s: RoomSummary) =>
    s.status === 'lobby' ? `Waiting · ${s.players}/${s.maxPlayers}` : s.status === 'playing' ? 'In progress' : 'Finished';
</script>

<main class="hub">
  <header class="top">
    <h1 class="wordmark">Boredgames</h1>
    <div class="who">
      <label class="lab" for="name">Your name at the table</label>
      <input
        id="name"
        class="field-input"
        bind:this={nameInput}
        bind:value={name}
        maxlength={MAX_NAME}
        autocomplete="nickname"
        placeholder="What should the table call you?"
        aria-describedby={error ? 'name-err' : undefined}
        oninput={() => (error = '')}
      />
      {#if error}<p class="err" id="name-err" role="alert">{error}</p>{/if}
    </div>
  </header>

  <section class="shelf" aria-label="Games">
    {#each CATALOG as g (g.id)}
      <article class="crate" aria-labelledby="g-{g.id}">
        <div class="hold" aria-hidden="true">
          <div class="fan">
            {#each fan as b, i (b)}
              <div class="slot" style="--i:{i - 2}"><Card bean={b} size="lg" /></div>
            {/each}
          </div>
        </div>
        <div class="tag">
          <h2 class="title" id="g-{g.id}">{g.name}</h2>
          <p class="pitch">{g.pitch}</p>
          <ul class="facts">
            <li><Icon name="users" size={16} /><span class="num">{g.minPlayers}–{g.maxPlayers}</span> players</li>
            <li><Icon name="clock" size={16} /><span class="num">{g.minutes}</span> min</li>
          </ul>
          <div class="acts">
            <button class="btn primary big" disabled={!!busy} onclick={() => open(g, false)}>
              {busy === `${g.id}:friends` ? 'Opening…' : 'Open a table'}
              <Icon name="arrowRight" />
            </button>
            <button class="btn big" disabled={!!busy} onclick={() => open(g, true)}>
              <Icon name="bot" size={18} />
              {busy === `${g.id}:bots` ? 'Seating bots…' : 'Practise with bots'}
            </button>
          </div>
          <p class="hint">With bots you play against {g.minPlayers - 1} simple computer players; add friends later from the lobby.</p>
        </div>
      </article>
    {/each}

    {#if BENCH}
      <p class="bench">
        Dev server:
        <button class="btn small" disabled={!!busy} onclick={() => open(BENCH, true)}><Icon name="bot" size={16} /> Deck bench with a bot</button>
      </p>
    {/if}

    <div class="crate empty">
      <div class="ghosts" aria-hidden="true"><span></span><span></span></div>
      <div class="copy">
        <p class="stencil">Next delivery</p>
        <p class="soon">More games are on the way. Each one gets its own crate on this shelf.</p>
      </div>
    </div>
  </section>

  <section class="lower">
    <form class="joinrow" onsubmit={join}>
      <label class="lab" for="code">Have a code? Join a table</label>
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

    <div class="recent">
      <h2 class="lab">Your tables</h2>
      {#if recent.length}
        <ul>
          {#each recent as r (r.code)}
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
      {:else}
        <p class="none">Tables you open or join on this device show up here.</p>
      {/if}
    </div>
  </section>
</main>

<style>
  .hub {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: clamp(28px, 4vw, 48px);
    padding: max(32px, env(safe-area-inset-top)) clamp(16px, 5vw, 80px) 48px;
    background:
      radial-gradient(90% 60% at 30% 0%, #261c13 0%, transparent 70%),
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.012) 0 1px, transparent 1px 64px),
      var(--ground-1);
  }
  .hub > * {
    width: 100%;
    max-width: 1180px;
    margin-inline: auto;
  }

  /* Header: wordmark and the one name every action uses. */
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px 48px;
    flex-wrap: wrap;
  }
  .wordmark {
    font-family: var(--font-label);
    font-weight: 800;
    font-size: clamp(56px, 9vw, 96px);
    line-height: 0.85;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    margin: 0;
    color: var(--ink);
  }
  .who {
    flex: 0 1 380px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lab {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    margin: 0;
  }
  .err {
    margin: 0;
    color: var(--warn);
    font-size: 14px;
  }

  /* The shelf: one timber crate per game. */
  .shelf {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(220px, 1fr);
    gap: 20px;
  }
  .crate {
    position: relative;
    border-radius: var(--r-lg);
    background:
      repeating-linear-gradient(0deg, rgb(0 0 0 / 0.22) 0 2px, transparent 2px 58px),
      linear-gradient(180deg, #2e2219, #1c150f);
    box-shadow:
      inset 0 0 0 1px var(--rim-hi),
      inset 0 0 0 9px #33261b,
      inset 0 0 0 10px var(--rim),
      var(--shadow-2);
  }
  article.crate {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(360px, 1.35fr);
    align-items: center;
    min-height: 380px;
    overflow: hidden;
  }

  /* The open crate, seen from above: the cards dealt into it. */
  .hold {
    align-self: stretch;
    display: grid;
    place-items: center;
    perspective: 1200px;
    padding: 32px 0;
  }
  .fan {
    position: relative;
    width: 96px;
    height: 140px;
    transform: rotateX(28deg) rotateZ(-6deg) translateY(12px) scale(var(--fan-scale, 1.3));
    transform-style: preserve-3d;
  }
  .slot {
    position: absolute;
    inset: 0;
    transform-origin: 50% 130%;
    transform: rotate(calc(var(--i) * 12deg)) translateZ(calc(var(--i) * 1px + 6px));
    transition: transform var(--dur-3) var(--ease-out);
    animation: deal 720ms var(--ease-out) backwards;
    animation-delay: calc((var(--i) + 2) * 70ms);
  }
  /* The one authored moment: lean towards a game and its hand opens wider. */
  article.crate:hover .slot,
  article.crate:focus-within .slot {
    transform: rotate(calc(var(--i) * 17deg)) translateY(-10px) translateZ(calc(var(--i) * 1px + 6px));
  }
  @keyframes deal {
    from {
      transform: rotate(0deg) translateY(-70px) translateZ(80px);
      opacity: 0;
    }
  }
  :global([data-motion='reduced']) .slot {
    animation: none;
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .slot {
      animation: none;
    }
  }

  /* The crate label: a paper tag stencilled with the game. */
  .tag {
    margin: 28px 28px 28px 0;
    padding: 28px 28px 24px;
    border-radius: var(--r-md);
    background: var(--ground-1);
    border: 1px solid var(--rim);
    box-shadow: var(--shadow-1);
  }
  .title {
    font-family: var(--font-label);
    font-weight: 800;
    font-size: clamp(44px, 5vw, 64px);
    line-height: 0.9;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    margin: 0 0 14px;
    color: var(--ink);
  }
  .pitch {
    margin: 0 0 16px;
    color: var(--ink-2);
    font-size: 16px;
    max-width: 44ch;
    text-wrap: pretty;
  }
  .facts {
    list-style: none;
    margin: 0 0 24px;
    padding: 0;
    display: flex;
    gap: 18px;
    color: var(--ink-2);
    font-size: 14px;
  }
  .facts li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .facts :global(svg) {
    color: var(--ink-3);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .big {
    min-height: 52px;
    font-size: 16px;
    padding: 0 20px;
  }
  .hint {
    margin: 12px 0 0;
    color: var(--ink-3);
    font-size: 13px;
    max-width: 52ch;
  }

  .bench {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--ink-3);
  }

  /* An empty crate keeps the place for the next game. */
  .crate.empty {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 8px;
    padding: 28px;
    background: repeating-linear-gradient(0deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 58px), var(--ground-1);
    box-shadow:
      inset 0 0 0 1px var(--rim),
      inset 0 0 0 9px var(--ground-2),
      inset 0 0 0 10px var(--rim);
  }
  .stencil {
    margin: 0;
    font-family: var(--font-label);
    font-weight: 800;
    font-size: 32px;
    line-height: 0.95;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ghosts {
    flex: 1;
    position: relative;
    min-height: 150px;
  }
  .ghosts span {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--card-w);
    height: var(--card-h);
    margin: calc(var(--card-h) / -2) 0 0 calc(var(--card-w) / -2);
    border: 1.5px dashed var(--rim-hi);
    border-radius: var(--r-sm);
    transform: rotate(-8deg) translateX(-14px);
  }
  .ghosts span + span {
    transform: rotate(6deg) translateX(14px);
  }
  .soon {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
    max-width: 30ch;
  }

  /* Below the shelf: join by code and tables on this device. */
  .lower {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 20px 48px;
    align-items: start;
  }
  .joinrow,
  .recent {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
    font-family: var(--font-label);
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    font-size: 22px;
  }
  .code::placeholder {
    letter-spacing: 0.24em;
    color: var(--rim-hi);
  }
  .recent ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .none {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
    min-height: 48px;
    display: flex;
    align-items: center;
  }
  .rrow {
    width: 100%;
    display: grid;
    grid-template-columns: 90px 1fr auto 16px;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
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
    font-size: 18px;
  }
  .rstat {
    font-size: 13px;
  }

  @media (max-width: 980px) {
    .shelf {
      grid-template-columns: 1fr;
    }
    .crate.empty {
      min-height: 0;
      flex-direction: row;
      align-items: center;
      gap: 20px;
    }
    .ghosts {
      flex: 0 0 110px;
      min-height: 120px;
    }
  }
  @media (max-width: 720px) {
    article.crate {
      grid-template-columns: 1fr;
      min-height: 0;
    }
    .hold {
      --fan-scale: 1;
      padding: 36px 0 8px;
      min-height: 200px;
    }
    .tag {
      margin: 0 14px 14px;
      padding: 22px 18px 18px;
    }
    .acts .btn {
      flex: 1 1 100%;
    }
    .lower {
      grid-template-columns: 1fr;
    }
    .crate.empty {
      padding: 20px;
    }
    .ghosts {
      flex-basis: 84px;
      min-height: 110px;
    }
    .ghosts span {
      width: 52px;
      height: 73px;
      margin: -36px 0 0 -26px;
    }
    .stencil {
      font-size: 26px;
    }
    .who {
      flex-basis: 100%;
    }
  }
</style>
