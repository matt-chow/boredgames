<script lang="ts">
  import Icon, { type IconName } from '../../../hub/Icon.svelte';
  import { REACTIONS, type LogEntry, type MAction, type MChat, type MView } from '../rules/types';
  import { REACTION_TEXT, logText } from './text';

  /**
   * Mine Activity: the public log and the chat in one feed, in the server's order (log lines and chat messages share
   * one id sequence). Newest at the bottom; it follows new lines only while you are reading the bottom.
   */
  let {
    view,
    act,
    who,
    busy,
    shown = true,
    unread = $bindable(0),
  }: { view: MView; act: (a: MAction) => unknown; who: (seat: number) => string; busy: boolean; shown?: boolean; unread?: number } = $props();

  type Row = { id: number; at: number; chat?: MChat; line?: LogEntry };
  let filter = $state<'all' | 'chat' | 'log'>('all');
  let open = $state(true);
  let text = $state('');

  const rows = $derived.by(() => {
    const out: Row[] = [];
    if (filter !== 'chat') for (const e of view.log) if (e.t !== 'draw' || e.n || e.next !== null) out.push({ id: e.id, at: e.at, line: e });
    if (filter !== 'log') for (const c of view.chat) out.push({ id: c.id, at: c.at, chat: c });
    return out.sort((a, b) => a.id - b.id);
  });

  const ICON: Record<LogEntry['t'], IconName> = { path: 'plus', act: 'action', pass: 'undo', clear: 'reset', reveal: 'eye', pick: 'coin', steal: 'gift', round: 'clock', draw: 'arrowRight' };
  const time = (at: number) => (at ? new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  // Unread: chat from others that arrived while the feed was out of sight.
  let seenChat = 0;
  let started = false;
  $effect(() => {
    const last = view.chat.at(-1)?.id ?? 0;
    // Messages from before you arrived are not unread.
    if (!started) (started = true), (seenChat = last);
    if (shown && open) {
      seenChat = last;
      unread = 0;
    } else unread = view.chat.filter((c) => c.id > seenChat && c.seat !== view.me?.seat).length;
  });

  // Follow the bottom only when the reader is already there.
  let list = $state<HTMLElement>();
  let atBottom = true;
  let behind = $state(false);
  $effect.pre(() => {
    void rows.length;
    if (list) atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  });
  $effect(() => {
    void rows.length;
    if (!list) return;
    if (atBottom) list.scrollTop = list.scrollHeight;
    behind = !atBottom;
  });
  const toBottom = () => {
    if (list) list.scrollTop = list.scrollHeight;
    behind = false;
  };

  async function say(e: SubmitEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    text = '';
    await act({ type: 'chat', text: t });
  }
</script>

<section class="activity" aria-labelledby="ms-activity">
  <div class="head">
    <button class="title" id="ms-activity" aria-expanded={open} onclick={() => (open = !open)}>
      Mine Activity
      {#if unread}<span class="badge" aria-label="{unread} unread">{unread}</span>{/if}
    </button>
    {#if open}
      <div class="filters" role="radiogroup" aria-label="Show">
        {#each [['all', 'All'], ['chat', 'Chat'], ['log', 'Log']] as [k, label] (k)}
          <button role="radio" aria-checked={filter === k} class:on={filter === k} onclick={() => (filter = k as typeof filter)}>{label}</button>
        {/each}
      </div>
    {/if}
  </div>
  {#if open}
    <div class="feedwrap">
      <ol class="feed" bind:this={list} onscroll={() => list && list.scrollHeight - list.scrollTop - list.clientHeight < 40 && (behind = false)} aria-live="polite" aria-relevant="additions">
        {#each rows as r (r.id)}
          {#if r.chat}
            <li class="chat" class:you={r.chat.seat === view.me?.seat}>
              <span class="who">{who(r.chat.seat)}</span>
              <span class="msg" class:react={!!r.chat.react}>{r.chat.react ? REACTION_TEXT[r.chat.react] : r.chat.text}</span>
              <time>{time(r.at)}</time>
            </li>
          {:else if r.line}
            <li class="line" class:round={r.line.t === 'round'}>
              <span class="ic" aria-hidden="true"><Icon name={ICON[r.line.t]} size={12} /></span>
              <span class="msg">{logText(r.line, who)}</span>
              <time>{time(r.at)}</time>
            </li>
          {/if}
        {:else}
          <li class="empty">{filter === 'chat' ? 'No messages yet.' : 'Nothing has happened yet.'}</li>
        {/each}
      </ol>
      {#if behind}<button class="btn small latest" onclick={toBottom}>Latest <Icon name="arrowRight" size={12} /></button>{/if}
    </div>
    {#if view.me}
      <div class="reacts">
        {#each REACTIONS as k (k)}<button class="btn small ghost" disabled={busy} onclick={() => act({ type: 'react', key: k })}>{REACTION_TEXT[k]}</button>{/each}
      </div>
      <form onsubmit={say}>
        <input bind:value={text} maxlength="300" placeholder="Say something" aria-label="Chat message" />
        <button class="btn small" disabled={!text.trim()}>Send</button>
      </form>
    {/if}
  {/if}
</section>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 6px;
  }
  .title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0;
    font: inherit;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
    background: none;
    border: 0;
    cursor: pointer;
  }
  .badge {
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    background: var(--sprout);
    color: var(--sprout-ink);
  }
  .filters {
    display: flex;
    border: 1px solid var(--rim);
    border-radius: var(--r-sm, 4px);
    overflow: hidden;
  }
  .filters button {
    font: inherit;
    font-size: 12px;
    padding: 2px 9px;
    min-height: 28px;
    border: 0;
    background: none;
    color: var(--ink-2);
    cursor: pointer;
  }
  .filters button.on {
    background: var(--ground-3);
    color: var(--ink);
    font-weight: 700;
  }
  .feedwrap {
    position: relative;
  }
  .feed {
    list-style: none;
    margin: 0 0 6px;
    padding: 0;
    font-size: 13px;
    height: clamp(160px, 34vh, 360px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .feed li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 6px;
    align-items: baseline;
    padding: 3px 2px;
    border-bottom: 1px solid var(--rim);
  }
  .line {
    color: var(--ink-2);
  }
  .line.round {
    color: var(--ink);
    font-weight: 600;
  }
  .ic {
    color: var(--ink-3);
    align-self: center;
    display: inline-flex;
  }
  .chat .who {
    font-weight: 700;
    color: var(--ink);
  }
  .chat.you .who {
    color: var(--ms-lamp);
  }
  .chat .msg {
    color: var(--ink);
  }
  .msg.react {
    font-style: italic;
  }
  time {
    font-size: 11px;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  .empty {
    color: var(--ink-3);
    display: block !important;
  }
  .latest {
    position: absolute;
    right: 8px;
    bottom: 8px;
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
