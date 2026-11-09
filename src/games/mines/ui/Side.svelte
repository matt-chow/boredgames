<script lang="ts">
  import type { RoomView } from '../../../shared/protocol';
  import { ROLE, artOf } from '../rules/cards';
  import { REACTIONS, type MAction, type MView } from '../rules/types';
  import { REACTION_TEXT, TOOL_ART, TOOL_NAMES, logText, seenText } from './text';

  let { view, room, act, who, busy }: { view: MView; room: RoomView; act: (a: MAction) => unknown; who: (seat: number) => string; busy: boolean } = $props();

  const me = $derived(view.me);
  let tab = $state<'log' | 'chat'>('log');
  let text = $state('');
  async function say(e: SubmitEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    text = '';
    await act({ type: 'chat', text: t });
  }
  const log = $derived([...view.log].reverse());
  const chat = $derived([...view.chat].reverse());
  const seen = $derived([...(me?.seen ?? [])].reverse());
</script>

<div class="side">
  <section aria-labelledby="ms-players">
    <h2 id="ms-players" class="h">Players</h2>
    <ul class="players">
      {#each view.players as p (p.seat)}
        {@const s = room.seats[p.seat]}
        <li class:up={view.phase === 'play' && view.current === p.seat} class:you={p.seat === me?.seat}>
          <span class="who">
            <span class="dot" class:on={s?.connected || s?.bot} title={s?.connected || s?.bot ? 'Online' : 'Away'}></span>
            <span class="nm">{who(p.seat)}</span>
            {#if s?.standIn}<span class="tag">stand-in</span>{/if}
          </span>
          <span class="marks">
            <span class="cardsn" title="Cards in hand">{p.hand} cards</span>
            {#each p.broken as t (t)}<img src={artOf(`${TOOL_ART[t]}Broken`)} alt="Broken {TOOL_NAMES[t]}" title="Broken {TOOL_NAMES[t]}" width="22" height="22" />{/each}
            {#if p.theft}<img src={artOf('theft')} alt="Pickpocket laid" title="Pickpocket laid" width="16" height="24" />{/if}
            {#if p.trap}<img src={artOf('trap')} alt="Locked in" title="Locked in" width="16" height="24" />{/if}
            {#if p.hasGold}<img src={artOf('nugget')} alt="Has gold" title="Has gold" width="20" height="20" />{/if}
          </span>
        </li>
      {/each}
    </ul>
  </section>

  {#if me}
    <section class="private" aria-labelledby="ms-private">
      <h2 id="ms-private" class="h">Only you can see this</h2>
      <div class="role">
        {#if me.role}
          <img src={artOf(me.role)} alt="" width="60" height="90" />
          <div>
            <p class="rname">{ROLE[me.role].name}</p>
            <p class="rtext">{ROLE[me.role].text}</p>
          </div>
        {:else}
          <p class="rtext">No role in the Prospector Duel: you both dig for the gold, and whoever reaches it earns most.</p>
        {/if}
      </div>
      <p class="gold"><img src={artOf('nugget')} alt="" width="20" height="20" /> {me.gold} gold{#if me.rewards.length}<span class="muted"> ({me.rewards.join(' + ')})</span>{/if}</p>
      {#if seen.length}
        <h3 class="h3">What you have seen</h3>
        <ul class="seen">
          {#each seen as o, i (i)}<li><span class="muted">Round {o.round}{o.round !== view.round ? ' (may have changed)' : ''}:</span> {seenText(o, who)}</li>{/each}
        </ul>
      {/if}
    </section>
  {/if}

  <section class="talk">
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'log'} class:on={tab === 'log'} onclick={() => (tab = 'log')}>Log</button>
      <button role="tab" aria-selected={tab === 'chat'} class:on={tab === 'chat'} onclick={() => (tab = 'chat')}>Chat</button>
    </div>
    {#if tab === 'log'}
      <ol class="lines">{#each log as e, i (i)}<li>{logText(e, who)}</li>{/each}</ol>
    {:else}
      {#if me}
        <div class="reacts">
          {#each REACTIONS as r (r)}<button class="btn small ghost" disabled={busy} onclick={() => act({ type: 'react', key: r })}>{REACTION_TEXT[r]}</button>{/each}
        </div>
        <form onsubmit={say}>
          <input bind:value={text} maxlength="300" placeholder="Say something" aria-label="Chat message" />
          <button class="btn small" disabled={!text.trim()}>Send</button>
        </form>
      {/if}
      <ol class="lines">
        {#each chat as c (c.id)}<li><strong>{who(c.seat)}:</strong> {c.react ? REACTION_TEXT[c.react] : c.text}</li>{/each}
      </ol>
    {/if}
  </section>
</div>

<style>
  .side {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 10px 12px 16px;
    overflow-wrap: anywhere;
  }
  .h {
    margin: 0 0 6px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .h3 {
    margin: 8px 0 4px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .players {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .players li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 2px 8px;
    padding: 4px 6px;
    border-left: 3px solid transparent;
    border-bottom: 1px solid var(--rim);
  }
  .players li.up {
    border-left-color: var(--sprout);
    background: var(--sprout-dim);
  }
  .players li.you .nm {
    font-weight: 700;
  }
  .who,
  .marks {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--rim-hi);
  }
  .dot.on {
    background: var(--ms-lamp);
  }
  .tag,
  .cardsn,
  .muted {
    font-size: 12px;
    color: var(--ink-3);
  }
  .private {
    padding: 8px 10px;
    border: 1px dashed var(--rim-hi);
    border-radius: var(--r-md);
    background: var(--ground-2);
  }
  .role {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .role img {
    border-radius: 5px;
    flex: none;
  }
  .rname {
    margin: 0;
    font-weight: 700;
  }
  .rtext {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--ink-2);
  }
  .gold {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 0;
    font-weight: 600;
  }
  .seen {
    margin: 0;
    padding-left: 16px;
    font-size: 13px;
  }
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
  }
  .tabs button {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 4px 10px;
    min-height: 32px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--ink-2);
    cursor: pointer;
  }
  .tabs button.on {
    color: var(--ink);
    border-bottom-color: var(--sprout);
  }
  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 13px;
    max-height: 320px;
    overflow-y: auto;
  }
  .lines li {
    padding: 3px 0;
    border-bottom: 1px solid var(--rim);
  }
  .reacts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }
  form {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }
  input {
    flex: 1;
    min-width: 0;
    font: inherit;
    padding: 6px 8px;
    color: var(--ink);
    background: var(--ground-0);
    border: 1px solid var(--rim);
    border-radius: var(--r-sm, 4px);
  }
</style>
