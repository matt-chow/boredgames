<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { settings } from '../../../client/lib/settings.svelte';
  import { sfx } from '../../../client/lib/sound';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Dialog from '../../../hub/Dialog.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import Icon from '../../../hub/Icon.svelte';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import { ACTION, ROLE, TUNNEL, artOf, type ActionKind, type Tool } from '../rules/cards';
  import type { MAction, MView, Rot, Spot } from '../rules/types';
  import Board from './Board.svelte';
  import Encyclopedia from './Encyclopedia.svelte';
  import Results from './Results.svelte';
  import Side from './Side.svelte';
  import { MODE_NAMES, TOOL_NAMES, nameOf, payText, textOf } from './text';
  import Tutorial from './Tutorial.svelte';

  let { conn, room }: GameUiProps = $props();

  const view = $derived(room.game as MView);
  const me = $derived(view.me);
  const seat = $derived(me?.seat ?? -1);
  const who = (s: number) => (s === seat ? 'You' : (room.seats[s]?.name ?? `Seat ${s + 1}`));
  const myTurn = $derived(view.phase === 'play' && view.current === seat);
  const mine = $derived(seat >= 0 ? view.players[seat] : null);
  const canDig = $derived(!!mine && !mine.trap && !mine.broken.length);

  /** Refusals become a toast; the screen only ever changes when the server's view does. */
  async function act(a: MAction) {
    const r = await conn.act(a);
    if (!r.ok) {
      sfx.error();
      toasts.push(r.error ?? 'Not allowed.', 'error');
    }
    return r;
  }

  // ---- Choosing cards (this device only) ------------------------------------------------------------------------------
  let sel = $state<number[]>([]);
  let rot = $state<Rot>(0);
  let seenTurn = -1;
  $effect(() => {
    if (view.turn === seenTurn) return;
    seenTurn = view.turn;
    sel = sel.filter((id) => me?.hand.some((c) => c.id === id));
  });
  const one = $derived(sel.length === 1 ? (me?.hand.find((c) => c.id === sel[0]) ?? null) : null);
  const tunnel = $derived(one && TUNNEL[one.kind] ? one : null);
  const action = $derived(one && !TUNNEL[one.kind] ? ACTION[one.kind as ActionKind] : null);
  const maxDiscard = $derived(view.config.mode === 'expanded' ? 3 : 1);

  function toggle(id: number) {
    if (sel.includes(id)) sel = sel.filter((x) => x !== id);
    else sel = view.config.mode === 'expanded' && sel.length && sel.length < 3 ? [...sel, id] : [id];
  }
  const done = () => ((sel = []), (rot = 0));
  async function place(s: Spot) {
    if (!tunnel) return;
    const r = await act({ type: 'path', turn: view.turn, card: tunnel.id, x: s.x, y: s.y, rot: s.rot });
    if (r.ok) done();
  }
  async function play(extra: { on?: number; tool?: Tool; goal?: number; x?: number; y?: number }) {
    if (!one) return;
    const r = await act({ type: 'act', turn: view.turn, card: one.id, ...extra });
    if (r.ok) done();
  }
  async function discard() {
    const r = await act({ type: 'pass', turn: view.turn, cards: sel });
    if (r.ok) done();
  }
  async function clear(what: Tool | 'theft' | 'trap') {
    const r = await act({ type: 'clear', turn: view.turn, cards: sel, clear: what });
    if (r.ok) done();
  }

  /** Who a card may sensibly go to. The server checks again; this only keeps the buttons honest. */
  const targets = $derived.by((): { on: number; tool?: Tool; label: string }[] => {
    if (!action || !mine) return [];
    const others = view.players.filter((p) => p.seat !== seat);
    const k = action.kind;
    if (k.startsWith('break')) return others.filter((p) => !p.broken.includes(action.tools![0])).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (k.startsWith('fix')) return view.players.flatMap((p) => action.tools!.filter((t) => p.broken.includes(t)).map((t) => ({ on: p.seat, tool: t, label: action.tools!.length > 1 ? `${who(p.seat)}: ${TOOL_NAMES[t]}` : who(p.seat) })));
    if (k === 'guard') return view.players.filter((p) => p.theft).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (k === 'free') return view.players.filter((p) => p.trap).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (k === 'trap') return others.filter((p) => !p.trap).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (k === 'swapRole') return view.players.map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (k === 'swapHands' || k === 'inspect') return others.map((p) => ({ on: p.seat, label: who(p.seat) }));
    return [];
  });
  const clearable = $derived(mine ? ([...mine.broken, ...(mine.trap ? ['trap' as const] : []), ...(mine.theft ? ['theft' as const] : [])] as (Tool | 'theft' | 'trap')[]) : []);
  const clearName = (c: Tool | 'theft' | 'trap') => (c === 'trap' ? 'the lock' : c === 'theft' ? 'your Pickpocket' : `your ${TOOL_NAMES[c]}`);

  function keys(e: KeyboardEvent) {
    if ((e.key === 'r' || e.key === 'R') && tunnel && !(e.target instanceof HTMLInputElement)) rot = rot ? 0 : 1;
    if (e.key === 'Escape') sel = [];
  }

  // ---- The turn timer ---------------------------------------------------------------------------------------------------
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });
  const waiting = $derived(view.phase === 'play' || view.phase === 'draft' || view.phase === 'theft');
  const left = $derived(view.config.timer && waiting ? Math.max(0, Math.ceil((view.since + view.config.timer * 1000 - now) / 1000)) : null);
  let calledAt = 0;
  let calledTurn = -1;
  $effect(() => {
    // Anyone at the table may call time; the server makes the single non-strategic move and refuses doubles.
    if (left !== 0 || !me) return;
    if (calledTurn === view.turn && now - calledAt < 3000) return;
    calledTurn = view.turn;
    calledAt = now;
    conn.act({ type: 'timeout', turn: view.turn });
  });

  // ---- Sounds and the round summary ------------------------------------------------------------------------------------
  let heard = { turn: -1, cells: -1, rounds: -1, mine: false };
  let summary = $state(false);
  $effect(() => {
    const cells = view.cells.length;
    if (heard.turn >= 0) {
      if (cells > heard.cells) sfx.plant();
      if (view.rounds.length > heard.rounds) {
        summary = view.phase !== 'over';
        sfx.coin();
      }
      if (myTurn && !heard.mine) sfx.yourTurn();
    }
    heard = { turn: view.turn, cells, rounds: view.rounds.length, mine: myTurn };
  });
  const lastRound = $derived(view.rounds.at(-1));

  // ---- Views and menus ------------------------------------------------------------------------------------------------
  const VIEW_KEY = 'mines.view';
  let deep = $state(false);
  try {
    deep = localStorage.getItem(VIEW_KEY) === 'deep';
  } catch {
    // Storage can be blocked; the tabletop view is the default.
  }
  function setDeep(on: boolean) {
    deep = on;
    try {
      localStorage.setItem(VIEW_KEY, on ? 'deep' : 'table');
    } catch {
      // Keep the choice for this visit only.
    }
  }

  const wide = new MediaQuery('(min-width: 980px)');
  let tab = $state<'mine' | 'side'>('mine');
  let guideOpen = $state(false);
  let guideDoc = $state<GuideDoc | null>(null);
  function help() {
    guideOpen = true;
    import('./guide').then((m) => (guideDoc = m.guide));
  }
  let quitOpen = $state(false);
  let cardsOpen = $state(false);
  let tutorialOpen = $state(false);

  // The draft and theft choices open by themselves; closing one leaves a button to bring it back.
  const picking = $derived(view.phase === 'draft' && view.draft?.picker === seat && !!me?.draft);
  const stealing = $derived(view.phase === 'theft' && view.thief === seat);
  let pickOpen = $state(false);
  let stealOpen = $state(false);
  $effect(() => {
    pickOpen = picking;
  });
  $effect(() => {
    stealOpen = stealing;
  });

  const status = $derived.by(() => {
    if (view.phase === 'draft' && view.draft) return view.draft.picker === seat ? 'Choose your gold card.' : `${who(view.draft.picker)} is choosing gold (${view.draft.left} left).`;
    if (view.phase === 'theft' && view.thief !== null) return view.thief === seat ? 'Choose who to steal from.' : `${who(view.thief)} is choosing who to rob.`;
    if (view.phase !== 'play') return '';
    const s = room.seats[view.current];
    const away = s && !s.connected && !s.bot ? (view.config.away === 'pause' ? ' They are away; the table waits for them.' : ' They are away; their turn will be passed.') : '';
    return myTurn ? (canDig ? 'Your turn: lay a tunnel, play an action, or discard.' : 'Your turn. You cannot dig right now: play an action or discard.') : `${who(view.current)} is up.${away}`;
  });
</script>

<svelte:window onkeydown={keys} />

{#if view.phase === 'over' && view.final}
  <Results {view} {room} {conn} {who} />
{:else}
  <div class="table" class:still={settings.instant}>
    <header class="top">
      <p class="round label">Round {view.round}<span class="of">of {view.config.rounds}</span></p>
      <p class="meta"><span class="mode">{MODE_NAMES[view.config.mode]}</span> · Deck {view.deck}{#if left !== null} · <span class="clock" class:low={left <= 10}><Icon name="clock" size={14} /> {left}s</span>{/if}</p>
      <div class="views" role="radiogroup" aria-label="Board view">
        <button role="radio" aria-checked={!deep} class:on={!deep} onclick={() => setDeep(false)}>Tabletop</button>
        <button role="radio" aria-checked={deep} class:on={deep} onclick={() => setDeep(true)}>Deep mine</button>
      </div>
      <button class="btn small ghost" onclick={() => (cardsOpen = true)}>Cards</button>
      <button class="btn small ghost" onclick={() => (tutorialOpen = true)}>Tutorial</button>
      <SettingsMenu onhelp={help} onquit={() => (quitOpen = true)} />
    </header>

    <p class="status" class:mine={myTurn || picking || stealing} role="status">
      {status}
      {#if picking && !pickOpen}<button class="btn small primary" onclick={() => (pickOpen = true)}>Choose</button>{/if}
      {#if stealing && !stealOpen}<button class="btn small primary" onclick={() => (stealOpen = true)}>Choose</button>{/if}
    </p>

    <div class="main" class:wide={wide.current}>
      <div class="pane play" class:hide={!wide.current && tab !== 'mine'}>
        <div class="boardwrap">
          <Board {view} {deep} card={myTurn && canDig ? tunnel : null} {rot} target={myTurn && action?.target === 'tunnel' ? 'tunnel' : myTurn && action?.target === 'goal' ? 'goal' : null} onplace={place} ontunnel={(x, y) => play({ x, y })} ongoal={(goal) => play({ goal })} />
        </div>

        {#if me}
          <section class="hand" aria-label="Your hand">
            <ul class="cards">
              {#each me.hand as c (c.id)}
                {@const on = sel.includes(c.id)}
                <li>
                  <button class="card" class:on aria-pressed={on} title="{nameOf(c.kind)}: {textOf(c.kind)}" onclick={() => toggle(c.id)}>
                    <img src={artOf(c.kind)} alt={nameOf(c.kind)} class:rot={on && tunnel?.id === c.id && rot === 1} draggable="false" />
                  </button>
                </li>
              {/each}
            </ul>
            {#if myTurn}
              <div class="bar">
                {#if one}<p class="what"><strong>{nameOf(one.kind)}</strong> {textOf(one.kind)}</p>{/if}
                <div class="acts">
                  {#if tunnel}
                    <button class="btn small" onclick={() => (rot = rot ? 0 : 1)}><Icon name="reset" size={16} /> Turn round (R)</button>
                    {#if !canDig}<span class="note">You cannot dig while {mine?.trap ? 'locked in' : 'a tool is broken'}.</span>{:else if !me.spots[tunnel.id]?.length}<span class="note">It fits nowhere right now.</span>{:else}<span class="note">Choose a glowing square.</span>{/if}
                  {:else if action}
                    {#if action.target === 'self'}
                      <button class="btn small primary" disabled={conn.busy} onclick={() => play({})}>Lay it before you</button>
                    {:else if action.target === 'goal'}
                      <span class="note">Choose a face-down destination.</span>
                    {:else if action.target === 'tunnel'}
                      <span class="note">Choose a tunnel on the board.</span>
                    {:else if targets.length}
                      {#each targets as t (`${t.on}-${t.tool}`)}
                        <button class="btn small primary" disabled={conn.busy} onclick={() => play({ on: t.on, tool: t.tool })}>{t.label}</button>
                      {/each}
                    {:else}
                      <span class="note">Nobody it could go to right now.</span>
                    {/if}
                  {/if}
                  {#if sel.length && sel.length <= maxDiscard}
                    <button class="btn small" disabled={conn.busy} onclick={discard}>Discard {sel.length === 1 ? 'it' : `these ${sel.length}`}</button>
                  {/if}
                  {#if view.config.mode === 'expanded' && sel.length === 2}
                    {#each clearable as c (c)}
                      <button class="btn small" disabled={conn.busy} onclick={() => clear(c)}>Discard both to clear {clearName(c)}</button>
                    {/each}
                  {/if}
                  {#if !sel.length}<span class="note">Choose a card.{view.config.mode === 'expanded' ? ' Choose up to three to discard together.' : ''}</span>{/if}
                </div>
              </div>
            {/if}
          </section>
        {/if}
      </div>
      <div class="pane side" class:hide={!wide.current && tab !== 'side'}>
        <Side {view} {room} {act} {who} busy={conn.busy} />
      </div>
    </div>

    {#if !wide.current}
      <nav class="tabs" aria-label="Views">
        <button class:on={tab === 'mine'} aria-current={tab === 'mine' ? 'page' : undefined} onclick={() => (tab = 'mine')}>Mine</button>
        <button class:on={tab === 'side'} aria-current={tab === 'side' ? 'page' : undefined} onclick={() => (tab = 'side')}>Players &amp; chat</button>
      </nav>
    {/if}
  </div>
{/if}

<Dialog bind:open={pickOpen} title="Choose your gold">
  <p class="body">The gold is found. Take one card; the rest go on to the next miner.</p>
  <div class="choices">
    {#each me?.draft ?? [] as v, i (i)}
      <button class="reward" disabled={conn.busy} onclick={() => act({ type: 'pick', turn: view.turn, index: i })}>
        <img src={artOf(`reward${v}`)} alt="" width="80" height="120" /><span>{v} gold</span>
      </button>
    {/each}
  </div>
</Dialog>

<Dialog bind:open={stealOpen} title="Your Pickpocket">
  <p class="body">Steal 1 gold from a player who has some.</p>
  <div class="row">
    {#each view.players.filter((p) => p.seat !== seat && p.hasGold) as p (p.seat)}
      <button class="btn primary" disabled={conn.busy} onclick={() => act({ type: 'steal', turn: view.turn, from: p.seat })}>{who(p.seat)}</button>
    {/each}
    <button class="btn" disabled={conn.busy} onclick={() => act({ type: 'steal', turn: view.turn, from: null })}>Nobody</button>
  </div>
</Dialog>

<Dialog bind:open={summary} title="Round {lastRound?.round ?? ''} is over">
  {#if lastRound}
    <p class="body">
      {lastRound.end === 'gold' ? `${who(lastRound.finder!)} reached the gold.` : 'The cards ran out before anyone reached the gold.'}
      {lastRound.winners.length ? `Winners: ${lastRound.winners.map(who).join(', ')}.` : 'Nobody won this round.'}
    </p>
    <ul class="roles">
      {#each lastRound.roles as r, s (s)}
        <li><span>{who(s)}</span><strong>{r ? ROLE[r].name : '—'}</strong></li>
      {/each}
    </ul>
    {#if lastRound.payouts.length}
      <ul class="pay">{#each lastRound.payouts as p, i (i)}<li>{payText(p, who)}</li>{/each}</ul>
    {:else if lastRound.end === 'gold' && view.config.mode === 'classic'}
      <p class="body">The miners shared the gold cards in secret.</p>
    {/if}
    {#each lastRound.steals as st, i (i)}<p class="body">{st.from === null ? `${who(st.seat)} stole nothing.` : `${who(st.seat)} stole 1 gold from ${who(st.from)}.`}</p>{/each}
    <div class="row"><button class="btn primary" onclick={() => (summary = false)}>Next round</button></div>
  {/if}
</Dialog>

<Guide bind:open={guideOpen} doc={guideDoc} />
<Encyclopedia bind:open={cardsOpen} mode={view.config.mode} />
<Tutorial bind:open={tutorialOpen} />
<QuitGame {conn} {room} bind:open={quitOpen} />

<style>
  .table {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    padding: 4px 10px 4px 14px;
    padding-top: max(4px, env(safe-area-inset-top));
    border-bottom: 1px solid var(--rim);
  }
  .round {
    margin: 0;
    font-size: 20px;
    white-space: nowrap;
  }
  .of {
    color: var(--ink-3);
    font-size: 15px;
    margin-left: 6px;
  }
  .meta {
    margin: 0;
    flex: 1 1 12em;
    font-size: 14px;
    color: var(--ink-2);
  }
  .clock {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .clock.low {
    color: var(--warn);
    font-weight: 700;
  }
  .views {
    display: flex;
    border: 1px solid var(--rim);
    border-radius: var(--r-sm, 4px);
    overflow: hidden;
  }
  .views button {
    font: inherit;
    font-size: 13px;
    padding: 4px 10px;
    min-height: 32px;
    background: none;
    color: var(--ink-2);
    border: 0;
    cursor: pointer;
  }
  .views button.on {
    background: var(--sprout);
    color: var(--sprout-ink);
    font-weight: 700;
  }
  .status {
    margin: 0;
    padding: 6px 14px;
    font-size: 14px;
    background: var(--ground-1);
    border-bottom: 1px solid var(--rim);
  }
  .status.mine {
    background: var(--sprout-dim);
    font-weight: 600;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .main.wide {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  .hide {
    display: none !important;
  }
  .pane {
    min-height: 0;
  }
  .play {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .boardwrap {
    flex: 1;
    min-height: 0;
  }
  .side {
    border-left: 1px solid var(--rim);
    overflow-y: auto;
  }
  .hand {
    border-top: 1px solid var(--rim);
    background: var(--ground-1);
    padding: 6px 10px calc(6px + env(safe-area-inset-bottom));
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 6px;
    overflow-x: auto;
  }
  .card {
    padding: 0;
    border: 2px solid transparent;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    transition: transform 120ms ease-out;
  }
  .card img {
    width: 64px;
    height: 96px;
    display: block;
    border-radius: 6px;
  }
  .card img.rot {
    transform: rotate(180deg);
  }
  .card.on {
    border-color: var(--sprout);
    transform: translateY(-6px);
  }
  .card:focus-visible {
    outline: 2px solid var(--sprout);
  }
  .bar {
    margin-top: 6px;
  }
  .what {
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .note {
    font-size: 13px;
    color: var(--ink-3);
  }
  .tabs {
    display: flex;
    border-top: 1px solid var(--rim);
    background: var(--ground-0);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabs button {
    flex: 1;
    min-height: 48px;
    font: inherit;
    font-weight: 600;
    font-size: 14px;
    color: var(--ink-2);
    background: none;
    border: 0;
    border-top: 3px solid transparent;
    cursor: pointer;
  }
  .tabs button.on {
    color: var(--ink);
    border-top-color: var(--sprout);
  }
  .body {
    margin: 0 0 8px;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .row,
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .reward {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    font: inherit;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim);
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .reward:hover,
  .reward:focus-visible {
    border-color: var(--sprout);
  }
  .roles,
  .pay {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    font-size: 14px;
  }
  .roles li {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    border-bottom: 1px solid var(--rim);
  }
  .still .card {
    transition: none;
  }
</style>
