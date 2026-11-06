<script lang="ts">
  import { CHAT_MAX } from '../rules/engine';
  import type { DAction, DView, StatementV } from '../rules/types';
  import StatementRow from './StatementRow.svelte';
  import { clock } from './text';

  let { view, names, busy, act, onchallenge, shown }: { view: DView; names: string[]; busy: boolean; act: (a: DAction) => Promise<{ ok: boolean }>; onchallenge: (st: StatementV) => void; shown: boolean } = $props();

  const me = $derived(view.you ?? 0);
  const canChallenge = $derived(view.phase === 'briefing' && view.challengeToken[me]);
  const items = $derived(
    [...view.chat.map((c) => ({ id: c.id, at: c.at, chat: c, st: null })), ...view.statements.map((s) => ({ id: s.id, at: s.at, chat: null, st: s }))].sort((a, b) => a.id - b.id),
  );

  let text = $state('');
  let log = $state<HTMLElement>();

  // Keep the newest in view, unless the reader has scrolled up to look at something.
  let pinned = true;
  $effect(() => {
    void [items.length, shown];
    if (log && pinned) log.scrollTop = log.scrollHeight;
  });

  async function send(e: SubmitEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const r = await act({ type: 'chat', text });
    if (r.ok) text = '';
  }
</script>

<section class="talk" aria-label="Conversation and statements">
  <div class="log" bind:this={log} onscroll={() => log && (pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 40)} role="log" aria-live="polite" tabindex="-1">
    {#if !items.length}
      <p class="empty">Say what you like here. Nothing in chat is checked, or binding. Only formal statements can be challenged.</p>
    {/if}
    {#each items as it (it.id)}
      {#if it.st}
        <StatementRow st={it.st} {names} {me} {canChallenge} {onchallenge} />
      {:else if it.chat}
        <div class="line" class:mine={it.chat.seat === me}>
          <p class="who">{it.chat.seat === me ? 'You' : names[it.chat.seat]} · {clock(it.chat.at)}</p>
          <p class="text">{it.chat.text}</p>
        </div>
      {/if}
    {/each}
  </div>
  <form onsubmit={send}>
    <label class="visually-hidden" for="dd-chat">Message your rival</label>
    <input id="dd-chat" class="field-input" bind:value={text} maxlength={CHAT_MAX} autocomplete="off" placeholder="Say anything…" disabled={view.phase === 'over'} />
    <button class="btn" disabled={busy || !text.trim()}>Send</button>
  </form>
</section>

<style>
  .talk {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .log {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    overflow-wrap: anywhere;
  }
  .log:focus {
    outline: none;
  }
  .empty {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  .line {
    align-self: flex-start;
    max-width: 88%;
    padding: 5px 10px;
    border-radius: var(--r-md);
    background: var(--ground-3);
  }
  .line.mine {
    align-self: flex-end;
    background: var(--ground-2);
  }
  .who {
    margin: 0;
    font-size: 12px;
    color: var(--ink-3);
  }
  .text {
    margin: 0;
    font-size: 15px;
    white-space: pre-wrap;
  }
  form {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--rim);
  }
  input {
    flex: 1;
    min-width: 0;
  }
</style>
