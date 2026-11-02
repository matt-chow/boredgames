<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiFailure } from '../client/lib/api';
  import { router } from '../client/lib/router.svelte';
  import { recentRooms, rememberRoom } from '../client/lib/recent';
  import { loadString, save } from '../client/lib/storage';
  import { CODE_LENGTH, MAX_NAME, normalizeCode, normalizeName, type RoomSummary } from '../shared/protocol';
  import Card from '../games/bohnanza/ui/Card.svelte';
  import type { Bean } from '../games/bohnanza/rules/cards';
  import Icon from './Icon.svelte';

  let name = $state(loadString('bg.name'));
  let code = $state('');
  let creating = $state(false);
  let error = $state('');
  let codeError = $state('');
  let recent = $state<RoomSummary[]>([]);

  const fan: Bean[] = ['red', 'blackeyed', 'chili', 'blue', 'green'];

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

  async function create(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    const n = normalizeName(name);
    if (!n) {
      error = `Enter a name (up to ${MAX_NAME} characters).`;
      return;
    }
    save('bg.name', n);
    creating = true;
    try {
      const r = await api.create(n);
      rememberRoom(r.code);
      router.go(`/r/${r.code}`);
    } catch (err) {
      error = err instanceof ApiFailure ? err.message : 'Could not open a table.';
    } finally {
      creating = false;
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
  <section class="intro">
    <h1 class="wordmark">Boredgames</h1>
    <p class="lede">A private table for you and your friends. Open one, share the code, play Bohnanza from any device.</p>

    <form class="panel" onsubmit={create}>
      <label class="lab" for="name">Your name</label>
      <input
        id="name"
        class="field-input"
        bind:value={name}
        maxlength={MAX_NAME}
        autocomplete="nickname"
        placeholder="What should the table call you?"
        oninput={() => (error = '')}
      />
      {#if error}<p class="err" role="alert">{error}</p>{/if}
      <button class="btn primary big" disabled={creating}>
        {creating ? 'Opening…' : 'Open a new table'}
        <Icon name="arrowRight" />
      </button>
    </form>

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

    {#if recent.length}
      <div class="recent">
        <h2 class="lab">Your tables</h2>
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
      </div>
    {/if}
  </section>

  <section class="stage" aria-hidden="true">
    <div class="crate">
      <div class="fan">
        {#each fan as b, i (b)}
          <div class="slot" style="--i:{i - 2}">
            <Card bean={b} size="lg" />
          </div>
        {/each}
      </div>
    </div>
  </section>
</main>

<style>
  .hub {
    height: 100%;
    overflow-y: auto;
    display: grid;
    grid-template-columns: minmax(320px, 520px) 1fr;
    align-items: center;
    gap: 48px;
    padding: max(48px, env(safe-area-inset-top)) clamp(20px, 6vw, 96px) 48px;
    background:
      radial-gradient(120% 80% at 80% 40%, #241a12 0%, transparent 60%),
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.012) 0 1px, transparent 1px 64px),
      var(--ground-1);
  }
  .wordmark {
    font-family: var(--font-label);
    font-weight: 800;
    font-size: clamp(56px, 9vw, 96px);
    line-height: 0.9;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    margin: 0 0 16px;
    color: var(--ink);
  }
  .lede {
    margin: 0 0 32px;
    color: var(--ink-2);
    font-size: 17px;
    max-width: 40ch;
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lab {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    margin: 0;
  }
  .big {
    min-height: 52px;
    font-size: 16px;
    margin-top: 6px;
  }
  .err {
    margin: 0;
    color: var(--warn);
    font-size: 14px;
  }
  .joinrow {
    margin-top: 32px;
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
  .recent {
    margin-top: 36px;
  }
  .recent ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
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
  .stage {
    display: grid;
    place-items: center;
    perspective: 1400px;
    min-height: 420px;
  }
  .crate {
    position: relative;
    width: min(560px, 100%);
    aspect-ratio: 4 / 3;
    border-radius: 14px;
    background:
      repeating-linear-gradient(0deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 46px),
      linear-gradient(180deg, #2c2118, #1d1610);
    box-shadow:
      inset 0 0 0 10px #3a2b1f,
      inset 0 0 0 11px #4d3a2a,
      0 40px 60px -20px rgb(0 0 0 / 0.8);
    transform: rotateX(42deg) rotateZ(-8deg);
    transform-style: preserve-3d;
    display: grid;
    place-items: center;
  }
  .fan {
    position: relative;
    width: 96px;
    height: 140px;
    transform-style: preserve-3d;
  }
  .slot {
    position: absolute;
    inset: 0;
    transform-origin: 50% 130%;
    transform: rotate(calc(var(--i) * 11deg)) translateZ(calc(var(--i) * 1px + 6px));
    animation: deal 700ms var(--ease-out) backwards;
    animation-delay: calc((var(--i) + 2) * 70ms);
  }
  @keyframes deal {
    from {
      transform: rotate(0deg) translateY(-60px) translateZ(80px);
      opacity: 0;
    }
  }
  :global([data-motion='reduced']) .slot {
    animation: none;
  }
  @media (max-width: 860px) {
    .hub {
      grid-template-columns: 1fr;
      align-content: start;
      gap: 8px;
    }
    .stage {
      order: -1;
      min-height: 220px;
    }
    .crate {
      width: min(360px, 90%);
    }
  }
</style>
