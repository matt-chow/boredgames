<script lang="ts">
  import type { RoomConnection } from '../client/lib/connection.svelte';
  import { router } from '../client/lib/router.svelte';
  import { toasts } from '../client/lib/toast.svelte';
  import { GAMES } from '../games/registry';
  import type { OptionDescriptor } from '../engine/types';
  import type { RoomView } from '../shared/protocol';
  import Icon from './Icon.svelte';

  let { conn, room }: { conn: RoomConnection; room: RoomView } = $props();

  const n = $derived(room.seats.length);
  const module = $derived(GAMES[room.gameId]);
  const host = $derived(room.seats.find((s) => s.host));
  const link = $derived(`${location.origin}/r/${room.code}`);
  let copied = $state(false);

  async function send(msg: Parameters<RoomConnection['send']>[0]) {
    const r = await conn.send(msg);
    if (!r.ok) toasts.push(r.error ?? 'Not allowed.', 'error');
    return r;
  }

  /** Player-count fit is only advisory here: the host may pick variants before everyone has joined. */
  const fits = (o: OptionDescriptor) => !o.unavailableReason && o.playerCounts.includes(n);

  /** Turning one option on switches off any it can't be combined with. */
  function toggle(o: OptionDescriptor) {
    const on = !room.config[o.key];
    const change: Record<string, boolean> = { [o.key]: on };
    if (on && module) {
      const next = { ...room.config, [o.key]: on };
      for (const other of room.options) {
        if (other.key === o.key || !next[other.key]) continue;
        const without = { ...next, [other.key]: false };
        const count = o.playerCounts.includes(n) ? n : Math.max(...o.playerCounts);
        if (module.validateConfig(next, count) !== null && module.validateConfig(without, count) === null) {
          next[other.key] = false;
          change[other.key] = false;
        }
      }
    }
    send({ t: 'config', config: change });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      toasts.push(`Share this link: ${link}`);
    }
  }

  async function leave() {
    const r = await send({ t: 'leave' });
    if (r.ok) router.go('/');
  }
</script>

<main class="lobby">
  <header class="top">
    <button class="btn ghost small" onclick={() => router.go('/')}><Icon name="arrowLeft" size={16} /> Hub</button>
    <span class="game">{room.gameName}</span>
  </header>

  <section class="code-block">
    <p class="lab">Table code</p>
    <p class="code label" aria-label="Table code {room.code.split('').join(' ')}">{room.code}</p>
    <button class="btn small" onclick={copy}>
      <Icon name={copied ? 'check' : 'copy'} size={16} />
      {copied ? 'Link copied' : 'Copy invite link'}
    </button>
  </section>

  <div class="cols">
    <section class="seats" aria-labelledby="seats-h">
      <h2 id="seats-h" class="h">Seats <span class="num muted">{n}/{room.maxPlayers}</span></h2>
      <ol>
        {#each room.seats as s (s.seat)}
          <li class:you={s.seat === room.you}>
            <span class="dot" class:on={s.connected} title={s.connected ? 'Online' : 'Offline'}></span>
            <span class="sname">{s.name}{s.seat === room.you ? ' (you)' : ''}</span>
            {#if s.host}<span class="host"><Icon name="crown" size={14} /> Host</span>{/if}
            {#if room.canConfigure && s.seat !== room.you}
              <button class="btn ghost small" onclick={() => send({ t: 'kick', seat: s.seat })} aria-label="Remove {s.name}">Remove</button>
            {/if}
          </li>
        {/each}
        {#each Array(Math.max(0, room.minPlayers - n)) as _, i (i)}
          <li class="empty"><span class="dot"></span><span class="sname">Waiting for a player…</span></li>
        {/each}
      </ol>
      <button class="btn ghost small leave" onclick={leave}><Icon name="leave" size={16} /> Leave table</button>
    </section>

    <section class="opts" aria-labelledby="opts-h">
      <h2 id="opts-h" class="h">Variants</h2>
      {#if !room.canConfigure}
        <p class="muted small">{host?.name ?? 'The host'} chooses the variants.</p>
      {/if}
      <ul>
        {#each room.options as o (o.key)}
          {@const ok = fits(o)}
          {@const on = !!room.config[o.key]}
          <li class:on class:off={!ok}>
            <label>
              <input
                type="checkbox"
                role="switch"
                checked={on}
                class:busy={conn.busy && room.canConfigure}
                disabled={!room.canConfigure || conn.busy || (!!o.unavailableReason && !on)}
                onchange={() => toggle(o)}
              />
              <span class="sw" aria-hidden="true"></span>
              <span class="otext">
                <span class="oname">{o.label}</span>
                <span class="odesc">{o.unavailableReason ?? o.description}</span>
                {#if !o.unavailableReason && !ok && n >= room.minPlayers}
                  <span class="onote">Needs {o.playerCounts[0]}–{o.playerCounts[o.playerCounts.length - 1]} players.</span>
                {/if}
              </span>
            </label>
          </li>
        {/each}
      </ul>
    </section>
  </div>

  <footer class="start">
    <p class="status" class:problem={!!room.configError}>
      {room.configError ?? (room.canStart ? 'Everyone’s here. Start when ready.' : `Waiting for ${host?.name ?? 'the host'} to start.`)}
    </p>
    {#if room.canConfigure}
      <button class="btn primary go" disabled={!room.canStart || conn.busy} onclick={() => send({ t: 'start' })}>
        Start the game <Icon name="arrowRight" />
      </button>
    {/if}
  </footer>
</main>

<style>
  .lobby {
    height: 100%;
    overflow-y: auto;
    max-width: 980px;
    margin: 0 auto;
    padding: max(16px, env(safe-area-inset-top)) 20px 120px;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .game {
    color: var(--ink-2);
    font-weight: 600;
  }
  .code-block {
    margin: 28px 0 36px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .lab {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .code {
    margin: 0;
    font-size: clamp(56px, 12vw, 104px);
    line-height: 0.95;
    letter-spacing: 0.14em;
    color: var(--ink);
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 1.4fr;
    gap: 40px;
  }
  .h {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 12px;
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .muted {
    color: var(--ink-3);
    font-weight: 500;
  }
  .small {
    font-size: 13px;
  }
  ol,
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .seats li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 4px 0 12px;
    border-bottom: 1px solid var(--rim);
  }
  .seats li.you .sname {
    color: var(--ink);
    font-weight: 600;
  }
  .sname {
    flex: 1;
    color: var(--ink-2);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty .sname {
    color: var(--ink-3);
    font-style: italic;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--rim-hi);
    flex: none;
  }
  .dot.on {
    background: var(--sprout);
  }
  .host {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--coin);
  }
  .leave {
    margin-top: 16px;
  }
  .opts li {
    border-bottom: 1px solid var(--rim);
  }
  .opts label {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 14px;
    padding: 14px 4px;
    cursor: pointer;
    position: relative;
  }
  .opts li.off:has(input:disabled) label {
    cursor: default;
  }
  .opts input {
    position: absolute;
    opacity: 0;
    width: 40px;
    height: 24px;
    margin: 14px 0 0;
  }
  .sw {
    pointer-events: none;
    width: 40px;
    height: 24px;
    border-radius: 12px;
    background: var(--ground-0);
    border: 1px solid var(--rim-hi);
    position: relative;
    transition: background-color var(--dur-2) var(--ease-out);
  }
  .sw::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--ink-3);
    transition:
      transform var(--dur-2) var(--ease-out),
      background-color var(--dur-2) var(--ease-out);
  }
  li.on .sw {
    background: var(--sprout-dim);
    border-color: var(--sprout);
  }
  li.on .sw::after {
    transform: translateX(16px);
    background: var(--sprout);
  }
  input:focus-visible + .sw {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  /* Briefly locked while a change is in flight: no visual dimming. */
  input:disabled:not(.busy) + .sw {
    opacity: 0.5;
  }
  .otext {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .oname {
    font-weight: 600;
  }
  .odesc {
    color: var(--ink-2);
    font-size: 14px;
    max-width: 60ch;
  }
  li.off .oname,
  li.off .odesc {
    color: var(--ink-3);
  }
  .onote {
    color: var(--warn);
    font-size: 13px;
  }
  .start {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 16px 20px max(16px, env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--ground-1) 70%, transparent);
  }
  .status {
    margin: 0;
    color: var(--ink-2);
    max-width: 52ch;
  }
  .status.problem {
    color: var(--ink);
  }
  .go {
    min-height: 52px;
    padding: 0 24px;
  }
  @media (max-width: 760px) {
    .cols {
      grid-template-columns: 1fr;
      gap: 28px;
    }
    .start {
      flex-direction: column;
      gap: 10px;
    }
    .go {
      width: 100%;
    }
  }
</style>
