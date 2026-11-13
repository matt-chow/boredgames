<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { finishAll, play as flip, snapshot, type Snapshot } from '../../../client/lib/motion';
  import { router } from '../../../client/lib/router.svelte';
  import { settings } from '../../../client/lib/settings.svelte';
  import { load, save } from '../../../client/lib/storage';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import { KIND_ORDER, KINDS, MUST_DEPOSE, ROLES, whyNot, type Kind, type Role } from '../rules/roles';
  import { CHAT_MAX, REACTIONS, type PAction, type PView } from '../rules/types';
  import { prefs, sounds } from './audio.svelte';
  import Card from './Card.svelte';
  import Reference from './Reference.svelte';
  import { REACTION_TEXT, cap, claimText, logText, windowText } from './text';

  let { conn, room }: GameUiProps = $props();

  const view = $derived(room.game as PView);
  const me = $derived(view.me);
  const seat = $derived(view.you ?? -1);
  const who = (s: number) => (s === seat ? 'you' : (room.seats[s]?.name ?? `Seat ${s + 1}`));
  const out = $derived(seat < 0 || view.players[seat].out);
  const mine = $derived(seat >= 0 && room.actors.includes(seat));
  const facts = $derived(view.players.map((p) => ({ coins: p.coins, hidden: p.cards.filter((c) => c === null).length })));
  const holds = (r: Role) => !!me?.hand.some((c) => !c.up && c.role === r);
  const others = $derived(view.players.map((p, i) => ({ ...p, seat: i })).filter((p) => p.seat !== seat));

  /** Refusals become a toast; the table only changes when the server's view does. */
  async function act(a: PAction) {
    const r = await conn.act(a);
    if (!r.ok) toasts.push(r.error ?? 'Not allowed.', 'error');
    return r;
  }

  // ---- Choices being made on this device. They reset whenever the server opens a new decision. --------------------------
  let kind = $state<Kind | null>(null);
  let tgt = $state<number | null>(null);
  let card = $state<number | null>(null);
  let lastStep = -1;
  $effect(() => {
    if (view.step === lastStep) return;
    lastStep = view.step;
    kind = tgt = card = null;
  });

  const myTurn = $derived(view.phase === 'turn' && view.current === seat && !out);
  const targets = $derived(others.filter((p) => !p.out).map((p) => p.seat));
  /** Why an action can't be declared at all right now (cost, the forced Depose, nobody to target), or null. */
  function kindWhy(k: Kind): string | null {
    if (view.pause) return 'The table is paused.';
    const r = whyNot(facts, seat, k);
    if (r !== 'Choose a player.') return r;
    const reasons = targets.map((t) => whyNot(facts, seat, k, t));
    return reasons.some((x) => x === null) ? null : (reasons[0] ?? 'Nobody to choose.');
  }
  const ready = $derived(kind !== null && (!KINDS[kind].target || (tgt !== null && !whyNot(facts, seat, kind, tgt))));
  function pickKind(k: Kind) {
    if (kindWhy(k)) return;
    kind = kind === k ? null : k;
    tgt = null;
  }
  async function declare() {
    if (!ready || kind === null) return;
    sounds.claim();
    await act({ type: 'declare', step: view.step, kind, ...(KINDS[kind].target ? { target: tgt! } : {}) });
  }

  // Response windows: who is claiming what, and whether this seat may answer.
  const w = $derived(view.window);
  const claimant = $derived(!view.pend || !w ? -1 : w.kind === 'counter' ? view.pend.blocker! : view.pend.actor);
  const canAnswer = $derived(!!w && w.open.includes(seat) && !w.passed.includes(seat) && !view.pause);
  const respond = (choice: 'pass' | 'challenge' | 'block') => {
    if (choice !== 'pass') sounds.claim();
    return act({ type: 'respond', step: view.step, choice });
  };

  // Lose, Parley and draft: choose a card; nothing is ever chosen for anyone.
  const losing = $derived(view.losing?.seat === seat);
  const parleying = $derived(view.phase === 'parley' && !!me?.drawn);
  const drafting = $derived(view.phase === 'draft' && view.drafting.includes(seat));
  const pool = $derived(!me ? [] : parleying ? [...me.hand.filter((c) => !c.up), me.drawn!] : losing || drafting ? me.hand.filter((c) => !c.up) : []);
  const roleOf = (id: number | null) => pool.find((c) => c.id === id)?.role ?? null;
  async function confirmCard() {
    if (card === null) return;
    if (losing) sounds.lose();
    await act(losing ? { type: 'reveal', step: view.step, card } : { type: 'return', step: view.step, card });
  }

  // ---- The clock: counted from the server's own time of the last change, so a fast or slow device clock can't move it. --
  let now = $state(Date.now());
  let recv = $state(Date.now());
  $effect(() => {
    void view.at;
    recv = Date.now();
  });
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(t);
  });
  const msLeft = $derived(!w ? null : w.left !== undefined && view.pause ? w.left : Math.max(0, w.deadline - view.at - (now - recv)));
  const secs = $derived(msLeft === null ? null : Math.ceil(msLeft / 1000));
  let warned = -1;
  $effect(() => {
    if (secs === 5 && canAnswer && warned !== view.step) {
      warned = view.step;
      sounds.warn();
    }
  });

  const status = $derived.by(() => {
    if (view.phase === 'over') return view.winner === null ? 'The game is over.' : `${cap(who(view.winner))} ${view.winner === seat ? 'are' : 'is'} the last one standing.`;
    if (view.pause) return `Paused until ${view.pause.seats.map(who).join(' and ')} ${view.pause.seats.length === 1 && view.pause.seats[0] !== seat ? 'reconnects' : 'reconnect'}. The clock is stopped.`;
    if (view.phase === 'draft') return drafting ? 'Draft: choose one card to return to the deck.' : `Waiting for ${view.drafting.map(who).join(' and ')} to draft.`;
    if (view.phase === 'turn') {
      if (myTurn) return facts[seat].coins >= MUST_DEPOSE ? `Your turn. With ${MUST_DEPOSE} or more coins you must Depose.` : 'Your turn: choose an action.';
      return `${cap(who(view.current))} is choosing an action.`;
    }
    if (view.phase === 'window' && w && view.pend) {
      const q = windowText(w.kind, view.pend.kind, claimant, who);
      return canAnswer ? `${q} Your answer?` : `${q} Waiting for answers.`;
    }
    if (view.phase === 'lose' && view.losing) return losing ? 'Choose a card to reveal. It is lost for good.' : `${cap(who(view.losing.seat))} is choosing a card to reveal.`;
    if (view.phase === 'parley') return parleying ? 'Parley: choose one card to return to the deck.' : `${cap(who(view.current))} is choosing a card to return.`;
    return '';
  });

  // ---- Layout, side panel and reference -----------------------------------------------------------------------------------
  const wide = new MediaQuery('(min-width: 900px)');
  let tab = $state<'table' | 'chat' | 'log'>('table');
  let sideTab = $state<'chat' | 'log'>('chat');
  const chatShown = $derived(wide.current ? sideTab === 'chat' : tab === 'chat');
  const logShown = $derived(wide.current ? sideTab === 'log' : tab === 'log');
  let seenChat = $state(0);
  const lastChat = $derived(Math.max(0, ...view.chat.filter((c) => c.seat !== seat).map((c) => c.id)));
  $effect(() => {
    if (chatShown) seenChat = lastChat;
  });
  const unread = $derived(!chatShown && lastChat > seenChat);
  let text = $state('');
  async function say(e: SubmitEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if ((await act({ type: 'chat', text })).ok) text = '';
  }
  let chatLog = $state<HTMLElement>();
  $effect(() => {
    void [view.chat.length, chatShown];
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
  });

  const PIN_KEY = 'palazzo.refPinned';
  let pinned = $state(load<boolean>(PIN_KEY, false));
  $effect(() => save(PIN_KEY, pinned));
  let refOpen = $state(false);
  const refDocked = $derived(wide.current && pinned);
  let guideOpen = $state(false);
  let guideAt = $state<string | null>(null);
  let guideDoc = $state<GuideDoc | null>(null);
  function rules(at: string | null = null) {
    guideAt = at;
    guideOpen = true;
    import('./guide').then((m) => (guideDoc = m.guide));
  }
  let quitOpen = $state(false);

  // ---- Confirmed-state presentation. Nothing here waits: answers stay open while anything plays. -------------------------
  let before: Snapshot | null = null;
  let banner = $state<string | null>(null);
  let bannerTimer = 0;
  function announce(t: string) {
    banner = t;
    clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => (banner = null), 2400);
  }
  onMount(() =>
    conn.onRoom((next, prev) => {
      finishAll();
      const nv = next.game as PView | null;
      const pv = prev?.game as PView | null;
      if (!nv || !pv || prev!.version === next.version) return;
      const fresh = nv.log.filter((e) => e.id > (pv.log.at(-1)?.id ?? 0));
      const name = (x: number) => (x === nv.you ? 'you' : (next.seats[x]?.name ?? ''));
      for (const e of fresh) {
        if (e.t === 'challenge') {
          sounds.challenge();
          announce(`${cap(name(e.seat))} challenged ${name(e.of)}: ${e.truthful ? `the ${ROLES[e.role].name} was real.` : 'a bluff!'}`);
        } else if (e.t === 'out') announce(`${cap(name(e.seat))} ${e.seat === nv.you ? 'are' : 'is'} out.`);
        else if (e.t === 'win') announce(`${cap(name(e.seat))} ${e.seat === nv.you ? 'win' : 'wins'} Palazzo.`);
      }
      if (fresh.some((e) => e.t === 'coins' || e.t === 'parley')) sounds.coin();
      if (fresh.some((e) => e.t === 'lose')) sounds.lose();
      if (nv.phase === 'turn' && nv.current === nv.you && (pv.current !== nv.you || pv.phase !== 'turn')) sounds.turn();
      if (nv.chat.some((c) => c.id > (pv.chat.at(-1)?.id ?? 0) && c.seat !== nv.you)) sounds.chat();
      before = snapshot(document);
    }),
  );
  $effect(() => {
    void room.version;
    const b = before;
    if (!b) return;
    before = null;
    // Cards new to your hand come from the deck, and cards that leave it go back there.
    tick().then(() => flip(b, { originOf: () => 'deck', exitOf: () => 'deck' }));
  });
  onDestroy(() => {
    finishAll();
    clearTimeout(bannerTimer);
  });

  const seenOf = (s: number) => me?.seen.find((x) => x.seat === s) ?? null;
  async function rematch() {
    const r = await conn.send({ t: 'rematch' });
    if (!r.ok) toasts.push(r.error ?? 'Could not start a rematch.', 'error');
  }
</script>

{#snippet coinsOf(n: number)}<span class="coins" aria-label="{n} {n === 1 ? 'coin' : 'coins'}"><span class="coin" aria-hidden="true"></span>{n}</span>{/snippet}

<div class="table" class:still={settings.instant} class:wide={wide.current}>
  <header class="top">
    <p class="title"><span class="label">Palazzo</span><span class="sub">{view.config.timer}s to answer · deck {view.deck}</span></p>
    {#if !refDocked}<button class="btn small ghost" aria-expanded={refOpen} onclick={() => (refOpen = !refOpen)}>Reference</button>{/if}
    <SettingsMenu onhelp={() => rules()} onquit={() => (quitOpen = true)}>
      <div class="pzset" role="group" aria-label="Palazzo sound">
        <p class="subhead">Palazzo</p>
        <label><input type="checkbox" bind:checked={prefs.sfx} /> Sound effects</label>
        <label class="range">Effects volume <input type="range" min="0" max="1" step="0.05" bind:value={prefs.sfxVol} disabled={!prefs.sfx} /></label>
      </div>
    </SettingsMenu>
  </header>

  <p class="status" class:mine role="status">
    <span>{status}</span>
    {#if secs !== null}<span class="timer" class:late={secs <= 5}>{view.pause ? 'Paused' : `${secs}s`}</span>{/if}
  </p>
  {#if w && msLeft !== null}
    <div class="bar" aria-hidden="true"><span style="transform: scaleX({Math.min(1, msLeft / (view.config.timer * 1000))})"></span></div>
  {/if}
  {#if out && view.phase !== 'over' && seat >= 0}
    <p class="note" role="status">You are out of the game. You can watch everything that is public. Your chat reaches only other players who are out until the game ends.</p>
  {/if}

  <div class="main">
    <section class="pane play" class:hide={!wide.current && tab !== 'table'} aria-label="The table">
      <ul class="opps" aria-label="Other players">
        {#each others as p (p.seat)}
          {@const choosable = myTurn && kind !== null && KINDS[kind].target && targets.includes(p.seat)}
          {@const why = choosable ? whyNot(facts, seat, kind!, p.seat) : null}
          {@const seen = seenOf(p.seat)}
          <li>
            <button class="opp" class:turn={view.current === p.seat && view.phase !== 'over'} class:out={p.out} class:can={choosable && !why} class:chosen={tgt === p.seat} disabled={!choosable || !!why} title={why ?? undefined} aria-pressed={choosable ? tgt === p.seat : undefined} data-anchor="seat-{p.seat}" onclick={() => (tgt = p.seat)}>
              <span class="who"><span class="dot" class:on={p.online} title={p.online ? 'Online' : 'Offline'}></span><span class="nm">{cap(who(p.seat))}</span></span>
              {@render coinsOf(p.coins)}
              <span class="cards">{#each p.cards as r, i (i)}<Card role={r} up={r !== null} card={r ? undefined : `b${p.seat}-${i}`} />{/each}</span>
              <span class="flags">
                {#if p.out}Out{:else if view.pend?.actor === p.seat && view.phase !== 'turn'}Acting{:else if view.pend?.blocker === p.seat}Blocking{:else if w?.passed.includes(p.seat)}Let it stand{/if}
                {#if seen && !p.out}<span class="seen" class:lapsed={seen.lapsed}>You saw a {ROLES[seen.role].name}{seen.lapsed ? ' (out of date)' : ''}</span>{/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>

      <div class="centre">
        <div class="deck" data-anchor="deck"><Card /><span class="cap">Deck · {view.deck}</span></div>
        {#if view.pend && view.phase !== 'turn' && view.phase !== 'over'}
          <p class="claim">
            <span class="cap">{cap(who(view.pend.actor))}</span>
            <span class="what">{claimText(view.pend.kind, view.pend.target, who)}</span>
            {#if view.pend.blocker !== undefined}<span class="cap">Blocked by {who(view.pend.blocker)}, claiming the {ROLES[KINDS[view.pend.kind].blockRole!].name}</span>{/if}
          </p>
        {/if}
      </div>

      {#if view.phase === 'over'}
        <section class="end" aria-label="Final result">
          <p class="headline">{status}</p>
          <ol class="final">
            {#each room.results ?? [] as r (r.seat)}<li class:win={r.winner}><span>{cap(who(r.seat))}</span><span>{r.detail}</span></li>{/each}
          </ol>
          <div class="row">
            <button class="btn primary" disabled={conn.busy} onclick={rematch}>Rematch</button>
            <button class="btn" onclick={() => router.go('/')}>Back to the hub</button>
          </div>
        </section>
      {/if}

      {#if canAnswer && w && view.pend}
        {@const k = KINDS[view.pend.kind]}
        {@const role = w.kind === 'block' ? k.blockRole! : w.kind === 'counter' ? k.blockRole! : k.role!}
        <section class="answer" aria-label="Your answer">
          <p class="q">{windowText(w.kind, view.pend.kind, claimant, who)}</p>
          {#if w.kind === 'block'}
            <p class="hint">{holds(role) ? `You hold the ${ROLES[role].name}.` : `You don’t hold the ${ROLES[role].name}: blocking would be a bluff, and anyone may challenge it.`}</p>
            <div class="row">
              <button class="btn primary" disabled={conn.busy} onclick={() => respond('block')}>Block, claiming the {ROLES[role].name}</button>
              <button class="btn" disabled={conn.busy} onclick={() => respond('pass')}>Let it happen</button>
            </div>
          {:else}
            <p class="hint">Challenge if you think it is a bluff. If the claim is true, you lose an influence.</p>
            <div class="row">
              <button class="btn primary" disabled={conn.busy} onclick={() => respond('challenge')}>Challenge</button>
              <button class="btn" disabled={conn.busy} onclick={() => respond('pass')}>{w.kind === 'counter' ? 'Accept the block' : 'Let it stand'}</button>
            </div>
          {/if}
        </section>
      {/if}

      {#if me}
        <section class="myseat" aria-label="Your cards" data-anchor="seat-{seat}">
          <div class="mehead">
            <span class="who"><span class="nm">You</span>{#if out}<span class="flag">Out</span>{/if}</span>
            {@render coinsOf(view.players[seat].coins)}
          </div>
          <ul class="hand">
            {#each me.hand as c (c.id)}
              {@const can = pool.some((x) => x.id === c.id)}
              <li>
                <button class="slot" class:raised={card === c.id} disabled={!can || conn.busy} aria-pressed={can ? card === c.id : undefined} onclick={() => (card = c.id)}>
                  <Card role={c.role} up={c.up} size="lg" card="c{c.id}" />
                </button>
              </li>
            {/each}
            {#if me.drawn}
              <li class="drawn">
                <button class="slot" class:raised={card === me.drawn.id} disabled={conn.busy} aria-pressed={card === me.drawn.id} onclick={() => (card = me.drawn!.id)}>
                  <Card role={me.drawn.role} size="lg" card="c{me.drawn.id}" />
                </button>
                <span class="cap">Drawn</span>
              </li>
            {/if}
          </ul>

          {#if losing || parleying || drafting}
            <div class="choose">
              <p class="hint">{losing ? 'The card you reveal stays face up and no longer counts as influence.' : 'The card you return is shuffled into the deck. Nobody sees which one.'}</p>
              <button class="btn primary" disabled={card === null || conn.busy || !!view.pause} onclick={confirmCard}>
                {card === null ? 'Choose a card' : `${losing ? 'Reveal' : 'Return'} the ${ROLES[roleOf(card)!].name}`}
              </button>
            </div>
          {:else if myTurn}
            <div class="actions" role="group" aria-label="Actions">
              {#each KIND_ORDER as k (k)}
                {@const why = kindWhy(k)}
                <button class="act" class:on={kind === k} class:claimed={!!KINDS[k].role} disabled={!!why || conn.busy} aria-pressed={kind === k} title={why ?? KINDS[k].text} onclick={() => pickKind(k)}>
                  <span class="an">{KINDS[k].name}</span>
                  <span class="ar">{KINDS[k].role ? ROLES[KINDS[k].role!].name : KINDS[k].cost ? `${KINDS[k].cost} coins` : 'General'}</span>
                  {#if why}<span class="aw">{why}</span>{/if}
                </button>
              {/each}
            </div>
            {#if kind}
              {@const k = KINDS[kind]}
              <div class="choose">
                <p class="hint">{k.text}{k.role && !holds(k.role) ? ` You don’t hold the ${ROLES[k.role].name}: this is a bluff, and anyone may challenge it.` : ''} <button class="link" onclick={() => rules(kind === 'strike' ? 'strike' : kind === 'parley' ? 'parley' : kind === 'inspect' ? 'inspect' : 'order')}>More</button></p>
                {#if k.target}
                  <div class="chips" role="radiogroup" aria-label="Choose a player">
                    {#each targets as t (t)}
                      {@const why = whyNot(facts, seat, kind, t)}
                      <button role="radio" class="chip" class:on={tgt === t} aria-checked={tgt === t} disabled={!!why} title={why ?? undefined} onclick={() => (tgt = t)}>{cap(who(t))}</button>
                    {/each}
                  </div>
                {/if}
                <button class="btn primary" disabled={!ready || conn.busy} onclick={declare}>{k.target && tgt === null ? 'Choose a player' : `Declare ${claimText(kind, tgt ?? undefined, who)}`}</button>
              </div>
            {/if}
          {/if}
        </section>
      {/if}
    </section>

    <aside class="side" class:hide={!wide.current && tab === 'table'}>
      {#if refDocked}<div class="docked"><Reference pinned canPin onpin={() => (pinned = false)} onrules={() => rules()} /></div>{/if}
      {#if wide.current}
        <nav class="tabs" aria-label="Side panel">
          <button class:on={chatShown} aria-current={chatShown ? 'page' : undefined} onclick={() => (sideTab = 'chat')}>Chat{#if unread}<span class="new" title="New messages"></span><span class="visually-hidden"> (new)</span>{/if}</button>
          <button class:on={logShown} aria-current={logShown ? 'page' : undefined} onclick={() => (sideTab = 'log')}>History</button>
        </nav>
      {/if}
      <section class="pane chat" class:hide={!chatShown} aria-label="Chat">
        <div class="log" bind:this={chatLog} role="log" aria-live="polite">
          {#if !view.chat.length}<p class="muted">Talk, bluff and accuse here. Nothing said in chat is checked.</p>{/if}
          {#each view.chat as c (c.id)}
            <p class="line" class:mine={c.seat === seat} class:ghost={c.ghost}><span class="by">{cap(who(c.seat))}{c.ghost ? ' (out)' : ''}</span> {c.text ?? REACTION_TEXT[c.react!]}</p>
          {/each}
        </div>
        {#if me}
          <div class="reacts" role="group" aria-label="Reactions">
            {#each REACTIONS as r (r)}<button class="chip" disabled={conn.busy} onclick={() => act({ type: 'react', key: r })}>{REACTION_TEXT[r]}</button>{/each}
          </div>
          <form onsubmit={say}>
            <label class="visually-hidden" for="pz-chat">{out && view.phase !== 'over' ? 'Message the players who are out' : 'Message the table'}</label>
            <input id="pz-chat" class="field-input" bind:value={text} maxlength={CHAT_MAX} autocomplete="off" placeholder={out && view.phase !== 'over' ? 'Only players who are out will see this…' : 'Say anything…'} />
            <button class="btn" disabled={conn.busy || !text.trim()}>Send</button>
          </form>
        {/if}
      </section>
      <section class="pane history" class:hide={!logShown} aria-label="History">
        <ol class="log">
          {#each [...view.log].reverse() as e (e.id)}<li class:big={e.t === 'start' || e.t === 'win' || e.t === 'out'}>{logText(e, who)}</li>{/each}
        </ol>
      </section>
    </aside>
  </div>

  {#if !wide.current}
    <nav class="tabs bottom" aria-label="Views">
      <button class:on={tab === 'table'} aria-current={tab === 'table' ? 'page' : undefined} onclick={() => (tab = 'table')}>Table{#if mine && tab !== 'table'}<span class="new" title="Your decision"></span>{/if}</button>
      <button class:on={tab === 'chat'} aria-current={tab === 'chat' ? 'page' : undefined} onclick={() => (tab = 'chat')}>Chat{#if unread}<span class="new" title="New messages"></span><span class="visually-hidden"> (new)</span>{/if}</button>
      <button class:on={tab === 'log'} aria-current={tab === 'log' ? 'page' : undefined} onclick={() => (tab = 'log')}>History</button>
    </nav>
  {/if}

  {#if refOpen && !refDocked}
    <div class="overlay" role="dialog" aria-label="Reference" aria-modal="false">
      <Reference canPin={wide.current} onpin={() => ((pinned = true), (refOpen = false))} onclose={() => (refOpen = false)} onrules={() => rules()} />
    </div>
  {/if}

  {#if banner}<button class="banner" onclick={() => (banner = null)} aria-live="polite">{banner}</button>{/if}
</div>

<Guide bind:open={guideOpen} doc={guideDoc} at={guideAt} />
<QuitGame {conn} {room} bind:open={quitOpen} />

<style>
  .table {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: radial-gradient(ellipse at 50% 30%, var(--ground-2), var(--ground-1) 70%);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 14px;
    padding-top: max(4px, env(safe-area-inset-top));
    border-bottom: 1px solid var(--rim);
  }
  .title {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 10px;
    margin: 0;
    min-width: 0;
  }
  .title .label {
    font: 700 20px/1.2 var(--pz-serif);
    font-variant: small-caps;
    letter-spacing: 0.04em;
  }
  .sub,
  .muted,
  .cap {
    color: var(--ink-3);
    font-size: 13px;
  }
  .pzset {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--rim);
  }
  .subhead {
    margin: 0;
    font-size: 12px;
    color: var(--ink-3);
  }
  .range {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 0;
    padding: 6px 14px;
    font-size: 15px;
    border-bottom: 1px solid var(--rim);
  }
  .status.mine {
    color: var(--sprout-ink);
    background: var(--sprout);
    font-weight: 600;
  }
  .timer {
    flex: none;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .timer.late {
    color: var(--warn);
  }
  .status.mine .timer.late {
    color: var(--pz-blood);
  }
  .bar {
    height: 3px;
    background: var(--ground-0);
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--pz-gilt);
    transform-origin: left;
    transition: transform 250ms linear;
  }
  .note {
    margin: 0;
    padding: 6px 14px;
    font-size: 14px;
    background: var(--ground-3);
  }
  .main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }
  .wide .main {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  .hide {
    display: none !important;
  }
  .play {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    padding: 10px 12px 12px;
    overflow-y: auto;
  }
  .wide .play {
    padding: 16px 20px;
  }
  .opps {
    list-style: none;
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 0 0 4px;
    overflow-x: auto;
    flex-shrink: 0;
  }
  .wide .opps {
    flex-wrap: wrap;
    justify-content: center;
    overflow: visible;
  }
  .opp {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: 'who coins' 'cards cards' 'flags flags';
    align-items: center;
    gap: 4px 8px;
    min-width: 150px;
    padding: 8px 10px;
    font: inherit;
    text-align: left;
    color: var(--ink);
    background: var(--ground-2);
    border: 2px solid var(--rim);
    border-radius: var(--r-md);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-2) var(--ease-out);
  }
  .opp:disabled {
    cursor: default;
  }
  .opp.turn {
    border-color: var(--rim-hi);
    box-shadow: inset 0 0 0 1px var(--pz-gilt);
  }
  .opp.can {
    border-color: var(--sprout);
    cursor: pointer;
  }
  .opp.chosen {
    background: var(--sprout-dim);
    transform: translateY(-3px);
  }
  .opp.out {
    opacity: 0.5;
  }
  .who {
    grid-area: who;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 600;
  }
  .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--rim-hi);
  }
  .dot.on {
    background: var(--pz-gilt);
  }
  .coins {
    grid-area: coins;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .coin {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #f3d78f, var(--coin) 55%, #9b7a32);
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4);
  }
  .cards {
    grid-area: cards;
    display: flex;
    gap: 4px;
  }
  .flags {
    grid-area: flags;
    display: flex;
    flex-direction: column;
    font-size: 12px;
    color: var(--ink-3);
    min-height: 1em;
  }
  .seen {
    color: var(--ink);
  }
  .seen.lapsed {
    color: var(--ink-3);
    text-decoration: line-through;
  }
  .centre {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 18px;
    padding: 6px 0;
  }
  .deck {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .claim {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 8px 12px;
    max-width: 320px;
    background: var(--ground-3);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-md);
    animation: rise var(--dur-3) var(--ease-out) backwards;
  }
  .what {
    font: 700 16px/1.3 var(--pz-serif);
  }
  .answer,
  .end {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
    background: var(--ground-3);
    border: 1px solid var(--sprout);
    border-radius: var(--r-md);
    animation: rise var(--dur-3) var(--ease-out) backwards;
  }
  .end {
    border-color: var(--rim-hi);
  }
  .q,
  .headline {
    margin: 0;
    font: 700 17px/1.35 var(--pz-serif);
  }
  .hint {
    margin: 0;
    font-size: 14px;
    color: var(--ink-2);
    text-align: center;
  }
  .link {
    padding: 0;
    font: inherit;
    color: var(--sprout);
    background: none;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
  }
  .final {
    list-style: none;
    margin: 0;
    padding: 0;
    width: min(100%, 320px);
  }
  .final li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 8px;
  }
  .final li.win {
    font-weight: 700;
    color: var(--sprout);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .myseat {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--rim);
  }
  .mehead {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .flag {
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-3);
    margin-left: 6px;
  }
  .hand {
    list-style: none;
    display: flex;
    gap: 10px;
    margin: 0;
    padding: 8px 0 0;
  }
  .drawn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding-left: 10px;
    border-left: 1px dashed var(--rim-hi);
  }
  .slot {
    padding: 0;
    border: 0;
    background: none;
    border-radius: 8px;
    transition: transform var(--dur-2) var(--ease-out);
  }
  .slot:not(:disabled) {
    cursor: pointer;
  }
  .slot:not(:disabled):hover {
    transform: translateY(-4px);
  }
  .slot.raised {
    transform: translateY(-12px);
  }
  .slot.raised :global(.pz-card) {
    outline: 3px solid var(--sprout);
  }
  .slot:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 3px;
  }
  .choose {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
    width: 100%;
    max-width: 640px;
  }
  .act {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-height: 48px;
    padding: 6px 8px;
    font: inherit;
    text-align: left;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .act.claimed {
    border-style: dashed;
  }
  .act.on {
    color: var(--sprout-ink);
    background: var(--sprout);
    border: 1px solid var(--sprout);
  }
  .act:disabled {
    cursor: default;
    opacity: 0.55;
  }
  .an {
    font-weight: 700;
  }
  .ar,
  .aw {
    font-size: 12px;
  }
  .act:not(.on) .ar {
    color: var(--ink-3);
  }
  .aw {
    color: var(--ink-2);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }
  .chip {
    min-height: 36px;
    padding: 4px 12px;
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim-hi);
    border-radius: 999px;
    cursor: pointer;
  }
  .chip:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .chip.on {
    color: var(--sprout-ink);
    background: var(--sprout);
    border-color: var(--sprout);
    font-weight: 600;
  }
  .side {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .wide .side {
    border-left: 1px solid var(--rim);
    background: var(--ground-1);
  }
  .docked {
    max-height: 50%;
    overflow-y: auto;
    border-bottom: 1px solid var(--rim);
  }
  .pane.chat,
  .pane.history {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .log {
    overflow-wrap: anywhere;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0;
    padding: 10px 12px;
    font-size: 14px;
  }
  .history .log {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--ink-2);
  }
  .history li.big {
    color: var(--ink);
    font-weight: 700;
  }
  .line {
    margin: 0 0 6px;
  }
  .line.ghost {
    color: var(--ink-3);
    font-style: italic;
  }
  .by {
    font-weight: 700;
    color: var(--ink-2);
  }
  .line.mine .by {
    color: var(--pz-gilt);
  }
  .reacts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 10px;
    border-top: 1px solid var(--rim);
  }
  .reacts .chip {
    min-height: 30px;
    font-size: 13px;
  }
  form {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--rim);
  }
  .field-input {
    flex: 1;
    min-width: 0;
  }
  .tabs {
    display: flex;
    background: var(--ground-0);
  }
  .tabs.bottom {
    border-top: 1px solid var(--rim);
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
  .new {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--sprout);
    vertical-align: middle;
  }
  /* The reference floats over the table without blocking it: a bottom sheet on a phone, a panel by the menu on a desk. */
  .overlay {
    position: absolute;
    z-index: 30;
    left: 8px;
    right: 8px;
    bottom: 56px;
    max-height: 70%;
    overflow-y: auto;
    background: var(--ground-1);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-lift);
    animation: rise var(--dur-3) var(--ease-out) backwards;
  }
  .wide .overlay {
    left: auto;
    right: 12px;
    top: 52px;
    bottom: auto;
    width: 460px;
  }
  .banner {
    position: absolute;
    left: 50%;
    top: 22%;
    z-index: 20;
    max-width: min(92%, 520px);
    margin: 0;
    padding: 12px 18px;
    font: 700 18px/1.35 var(--pz-serif);
    text-align: center;
    color: var(--pz-paper-ink);
    background: var(--pz-paper);
    border: 2px solid var(--pz-gilt);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-lift);
    transform: translateX(-50%);
    cursor: pointer;
    animation: banner 2.4s var(--ease-out) forwards;
  }
  @keyframes banner {
    0% {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    10%,
    85% {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -6px);
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  .still,
  .still :global(*) {
    animation: none !important;
    transition: none !important;
  }
</style>
