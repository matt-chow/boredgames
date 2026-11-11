<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { finishAll, play as flip, snapshot, type Snapshot } from '../../../client/lib/motion';
  import { router } from '../../../client/lib/router.svelte';
  import { settings } from '../../../client/lib/settings.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import { KINDS, NAMEABLE, RULESET_NAMES, type Kind } from '../rules/cards';
  import { CHAT_MAX } from '../rules/engine';
  import { REACTIONS, type SAction, type SView } from '../rules/types';
  import { ambience, prefs, sounds, stopAmbience } from './audio.svelte';
  import Card from './Card.svelte';
  import { REACTION_TEXT, artOf, cap, logText, roundText, secretText } from './text';
  import Tutorial from './Tutorial.svelte';

  let { conn, room }: GameUiProps = $props();

  const view = $derived(room.game as SView);
  const me = $derived(view.me);
  const seat = $derived(me?.seat ?? -1);
  const who = (s: number) => (s === seat ? 'you' : (room.seats[s]?.name ?? `Seat ${s + 1}`));
  const others = $derived(view.players.filter((p) => p.seat !== seat));
  const myTurn = $derived(view.phase === 'play' && view.current === seat);
  const filing = $derived(view.phase === 'file' && view.current === seat);
  const kindOf = (id: number | null) => me?.hand.find((c) => c.id === id)?.kind ?? null;

  /** Refusals become a toast; the table only changes when the server's view does. */
  async function act(a: SAction) {
    const r = await conn.act(a);
    if (!r.ok) toasts.push(r.error ?? 'Not allowed.', 'error');
    return r;
  }

  // ---- The move being drafted: a card, then a player and a guess if it needs them. Stays on this device. ------------------
  let sel = $state<number | null>(null);
  let tgt = $state<number | null>(null);
  let guess = $state<Kind | null>(null);
  let keep = $state<number | null>(null);
  let under = $state<number[]>([]);
  let draftTurn = -1;
  $effect(() => {
    if (view.turn === draftTurn) return;
    draftTurn = view.turn;
    sel = tgt = guess = keep = null;
    under = [];
  });
  const selKind = $derived(kindOf(sel));
  const aim = $derived(selKind ? KINDS[selKind].targets : null);
  const choices = $derived(!me ? [] : aim === 'any' ? [seat, ...me.targets] : aim === 'other' ? me.targets : []);
  const needsTarget = $derived(choices.length > 0);
  const needsGuess = $derived(selKind === 'censor' && tgt !== null);
  const ready = $derived(sel !== null && (!needsTarget || tgt !== null) && (!needsGuess || guess !== null));
  const idle = $derived(aim === 'other' && !needsTarget);

  function pickCard(id: number) {
    if (!myTurn || !me?.playable.includes(id)) return;
    sel = sel === id ? null : id;
    tgt = guess = null;
  }
  function pickSeat(s: number) {
    if (sel === null || !choices.includes(s)) return;
    tgt = s;
    guess = null;
  }
  async function commit() {
    if (!ready || sel === null) return;
    sounds.seal();
    await act({ type: 'play', turn: view.turn, card: sel, ...(needsTarget ? { target: tgt! } : {}), ...(needsGuess ? { guess: guess! } : {}) });
  }

  // The Archivist: choose the card to keep, then the order the rest go under the deck.
  function pickKeep(id: number) {
    if (!filing || !me) return;
    keep = id;
    under = me.hand.filter((c) => c.id !== id).map((c) => c.id);
  }
  const swap = () => (under = [...under].reverse());
  async function file() {
    if (keep === null) return;
    sounds.seal();
    await act({ type: 'file', turn: view.turn, keep, under });
  }

  const status = $derived.by(() => {
    if (view.phase === 'over') return 'The game is over.';
    if (view.phase === 'between') return view.next === seat ? 'Deal the next round when everyone is ready.' : `${cap(who(view.next!))} deals the next round.`;
    if (filing) return 'Archivist: keep one card; the rest go under the deck in the order shown.';
    if (view.phase === 'file') return `${cap(who(view.current))} is consulting the archive.`;
    if (!myTurn) return me?.hand.length === 0 ? `You are out of this round. ${cap(who(view.current))} is choosing.` : `${cap(who(view.current))} is choosing a card.`;
    if (sel === null) return me!.playable.length < me!.hand.length ? 'Your move. You must play the Dowager.' : 'Your move: choose a card to play.';
    if (needsTarget && tgt === null) return aim === 'any' ? 'Choose a player, or yourself.' : 'Choose a player.';
    if (needsGuess && guess === null) return `Name a character ${who(tgt!)} might hold.`;
    if (idle) return 'Everyone else is protected or out: this card will do nothing.';
    return 'Ready. Seal it to play.';
  });

  // ---- Turn timer: only a warning (SC-TIME1). Nothing is ever played for anyone. -------------------------------------
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });
  const left = $derived(view.config.timer && (view.phase === 'play' || view.phase === 'file') ? Math.ceil((view.since + view.config.timer * 1000 - now) / 1000) : null);
  let warned = -1;
  $effect(() => {
    if (left === 5 && (myTurn || filing) && warned !== view.turn) {
      warned = view.turn;
      sounds.warn();
    }
  });

  // ---- Absent players: the table waits for them (SC-NET3). ---------------------------------------------------------------
  const away = $derived(room.seats.filter((s) => !s.connected && s.seat !== seat));

  // ---- Layout and side panel --------------------------------------------------------------------------------------------
  const wide = new MediaQuery('(min-width: 900px)');
  let tab = $state<'table' | 'chat' | 'log'>('table');
  let sideTab = $state<'chat' | 'log'>('chat');
  const chatShown = $derived(wide.current ? sideTab === 'chat' : tab === 'chat');
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
  const react = (key: string) => act({ type: 'react', key });
  let chatLog = $state<HTMLElement>();
  $effect(() => {
    void [view.chat.length, chatShown];
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
  });

  // ---- Help ---------------------------------------------------------------------------------------------------------------
  let guideOpen = $state(false);
  let guideDoc = $state<GuideDoc | null>(null);
  function help() {
    guideOpen = true;
    import('./guide').then((m) => (guideDoc = m.guideFor(view.config.ruleset)));
  }
  let quitOpen = $state(false);
  const TUTORIAL_KEY = 'sealed.tutorialSeen';
  let tutorialOpen = $state(false);
  onMount(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) tutorialOpen = true;
    } catch {
      /* storage unavailable: the tutorial stays a button away */
    }
  });
  $effect(() => {
    if (tutorialOpen) return;
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      /* ignore */
    }
  });

  // ---- Confirmed-state presentation: cards fly between where they were and where the new view puts them. ------------
  let before: Snapshot | null = null;
  let tradeWith: number | null = null;
  let filed = false;
  let banner = $state<string | null>(null);
  let bannerTimer = 0;
  function announce(t: string) {
    banner = t;
    clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => (banner = null), settings.instant ? 2500 : 2200);
  }
  onMount(() =>
    conn.onRoom((next, prev) => {
      finishAll();
      const nv = next.game as SView | null;
      const pv = prev?.game as SView | null;
      if (!nv || !pv || prev!.version === next.version) return;
      const fresh = nv.log.filter((e) => e.id > (pv.log.at(-1)?.id ?? 0));
      const s = nv.me?.seat ?? -1;
      const tr = fresh.find((e) => e.t === 'play' && e.kind === 'ambassador' && e.on !== undefined && (e.seat === s || e.on === s));
      tradeWith = tr && tr.t === 'play' ? (tr.seat === s ? tr.on! : tr.seat) : null;
      filed = fresh.some((e) => e.t === 'file' && e.seat === s);
      if (fresh.some((e) => e.t === 'play' || e.t === 'discard')) sounds.play();
      if (fresh.some((e) => e.t === 'out')) sounds.out(0.15);
      if (nv.rounds.length > pv.rounds.length) {
        sounds.favor(0.3);
        announce(roundText(nv.rounds.at(-1)!, (x) => (x === s ? 'you' : (next.seats[x]?.name ?? ''))));
      }
      if (nv.round > pv.round) announce(`Round ${nv.round}`);
      if (nv.phase === 'play' && nv.current === s && (pv.current !== s || pv.phase !== 'play')) sounds.turn();
      if (nv.chat.some((c) => c.id > (pv.chat.at(-1)?.id ?? 0) && c.seat !== s)) sounds.chat();
      before = snapshot(document);
    }),
  );
  $effect(() => {
    void room.version;
    const b = before;
    if (!b) return;
    before = null;
    tick().then(() =>
      flip(b, {
        // New cards in your hand come from the deck, or from the other hand in a trade; new cards on a pile were played
        // from that player's hand. Cards filed by the Archivist go back under the deck.
        originOf: (id) => {
          if (id.startsWith('b')) return 'deck';
          if (me?.hand.some((c) => `c${c.id}` === id)) return tradeWith !== null ? `seat-${tradeWith}` : 'deck';
          const p = view.players.find((x) => x.pile.some((e) => `c${e.card.id}` === id));
          return p && p.seat !== seat ? `seat-${p.seat}` : 'deck';
        },
        exitOf: () => (tradeWith !== null ? `seat-${tradeWith}` : filed ? 'deck' : null),
      }),
    );
  });
  $effect(() => ambience(prefs.ambience && !settings.muted && prefs.ambVol >= 0));
  onDestroy(() => {
    finishAll();
    stopAmbience();
    clearTimeout(bannerTimer);
  });

  const lastRound = $derived(view.rounds.at(-1) ?? null);
  const best = $derived(Math.max(...view.players.map((p) => p.favors)));
  const kindsHere = $derived(NAMEABLE.filter((k) => KINDS[k].count[view.config.ruleset] > 0));
  const roundSecrets = $derived(me?.secrets ?? []);
</script>

<div class="table" class:still={settings.instant} class:wide={wide.current}>
  <header class="top">
    <p class="round">
      <span class="label">Round {view.round}</span>
      <span class="sub">{RULESET_NAMES[view.config.ruleset]} · first to {view.target} {view.target === 1 ? 'favor' : 'favors'}</span>
    </p>
    <button class="btn small ghost" onclick={() => (tutorialOpen = true)}>Tutorial</button>
    <SettingsMenu onhelp={help} onquit={() => (quitOpen = true)}>
      <div class="scset" role="group" aria-label="Court sound">
        <p class="subhead">At court</p>
        <label class="range">Master volume <input type="range" min="0" max="1" step="0.05" bind:value={settings.volume} /></label>
        <label><input type="checkbox" bind:checked={prefs.sfx} /> Card sounds</label>
        <label class="range">Effects volume <input type="range" min="0" max="1" step="0.05" bind:value={prefs.sfxVol} disabled={!prefs.sfx} /></label>
        <label><input type="checkbox" bind:checked={prefs.ambience} /> Hall ambience</label>
        <label class="range">Ambience volume <input type="range" min="0" max="1" step="0.05" bind:value={prefs.ambVol} disabled={!prefs.ambience} /></label>
      </div>
    </SettingsMenu>
  </header>

  <p class="status" class:mine={myTurn || filing || (view.phase === 'between' && view.next === seat)} role="status">
    <span>{status}</span>
    {#if left !== null}<span class="timer" class:late={left <= 0}>{left > 0 ? `${left}s` : 'Over time'}</span>{/if}
  </p>
  {#if away.length}
    <p class="away" role="status">
      {away.map((s) => s.name).join(', ')} {away.length === 1 ? 'is' : 'are'} offline. The game waits for them{away.some((s) => s.graceUntil && s.graceUntil > now) ? '' : ' and stays paused'}; nobody plays in their place. Anyone can end the game for everyone from the menu.
    </p>
  {/if}

  <div class="main">
    <section class="pane play" class:hide={!wide.current && tab !== 'table'} aria-label="The table">
      <ul class="opps" aria-label="Other players">
        {#each others as p (p.seat)}
          {@const choosable = choices.includes(p.seat)}
          <li>
            <button class="opp" class:turn={view.current === p.seat && view.phase !== 'between' && view.phase !== 'over'} class:out={p.out} class:can={choosable} class:chosen={tgt === p.seat} disabled={!choosable} data-anchor="seat-{p.seat}" aria-pressed={choosable ? tgt === p.seat : undefined} onclick={() => pickSeat(p.seat)}>
              <span class="who"><span class="dot" class:on={room.seats[p.seat]?.connected} title={room.seats[p.seat]?.connected ? 'Online' : 'Offline'}></span><span class="nm">{who(p.seat)}</span></span>
              <span class="seals" aria-label="{p.favors} {p.favors === 1 ? 'favor' : 'favors'}">{#each { length: p.favors } as _, i (i)}<img src={artOf('seal')} alt="" width="18" height="18" />{/each}</span>
              <span class="flags">{p.out ? 'Out' : p.guarded ? 'Protected' : ''}</span>
              <span class="backs">{#each { length: p.hand } as _, i (i)}<Card card="b{p.seat}-{i}" />{/each}</span>
              <span class="pile" aria-label="Played by {who(p.seat)}">{#each p.pile as e (e.card.id)}<span class:disc={e.how === 'discarded'}><Card kind={e.card.kind} card="c{e.card.id}" /></span>{/each}</span>
            </button>
          </li>
        {/each}
      </ul>

      <div class="centre">
        <div class="deck" data-anchor="deck">
          {#if view.deck}<Card />{:else}<span class="empty">Empty</span>{/if}
          <span class="cap">Deck · {view.deck}</span>
        </div>
        <div class="deck">
          {#if view.reserve}<Card />{:else}<span class="empty">—</span>{/if}
          <span class="cap">Reserve</span>
        </div>
        {#if view.faceUp.length}
          <div class="faceup">
            <span class="fu">{#each view.faceUp as c (c.id)}<Card kind={c.kind} card="c{c.id}" />{/each}</span>
            <span class="cap">Set aside</span>
          </div>
        {/if}
      </div>

      {#if view.phase === 'between' && lastRound}
        <section class="roundend" aria-label="Round {lastRound.round} result">
          <p class="headline">{roundText(lastRound, who)}</p>
          {#if lastRound.end === 'showdown'}
            <div class="shown">
              {#each lastRound.shown as k, s (s)}
                {#if k}<figure class:won={lastRound.winners.includes(s)}><span class="turnup"><Card kind={k} size="md" /></span><figcaption>{cap(who(s))}</figcaption></figure>{/if}
              {/each}
            </div>
          {/if}
          {#if lastRound.reserve}<p class="muted">The reserve was the {KINDS[lastRound.reserve].name}.</p>{/if}
          {#if view.next === seat}<button class="btn primary" disabled={conn.busy} onclick={() => act({ type: 'deal', turn: view.turn })}>Deal round {view.round + 1}</button>{/if}
        </section>
      {:else if view.phase === 'over'}
        <section class="roundend" aria-label="Final result">
          <p class="headline">{(() => { const w = view.players.filter((p) => p.favors >= view.target).map((p) => who(p.seat)); return w.length > 1 ? `${cap(w.join(' and '))} win together.` : w[0] === 'you' ? 'You win the court’s favor.' : `${cap(w[0])} wins the court’s favor.`; })()}</p>
          {#if lastRound}<p class="muted">{roundText(lastRound, who)}</p>{/if}
          <ol class="final">
            {#each [...view.players].sort((a, b) => b.favors - a.favors) as p (p.seat)}
              <li class:win={p.favors === best}><span>{cap(who(p.seat))}</span><span>{p.favors} {p.favors === 1 ? 'favor' : 'favors'}</span></li>
            {/each}
          </ol>
          <div class="row">
            <button class="btn primary" disabled={conn.busy} onclick={() => conn.send({ t: 'rematch' }).then((r) => r.ok || toasts.push(r.error ?? 'Could not start a rematch.', 'error'))}>Rematch</button>
            <button class="btn" onclick={() => router.go('/')}>Back to the hub</button>
          </div>
        </section>
      {/if}

      {#if me}
        <section class="myseat" aria-label="Your hand" data-anchor="seat-{seat}">
          <div class="mehead">
            <span class="who"><span class="nm">You</span>{#if view.players[seat].guarded}<span class="flag">Protected</span>{/if}{#if view.players[seat].out}<span class="flag">Out</span>{/if}</span>
            <span class="seals" aria-label="{view.players[seat].favors} favors">{#each { length: view.players[seat].favors } as _, i (i)}<img src={artOf('seal')} alt="" width="22" height="22" />{/each}</span>
          </div>
          {#if view.players[seat].pile.length}
            <span class="pile mypile" aria-label="Your played cards">{#each view.players[seat].pile as e (e.card.id)}<span class:disc={e.how === 'discarded'}><Card kind={e.card.kind} card="c{e.card.id}" /></span>{/each}</span>
          {/if}
          {#if roundSecrets.length}
            <ul class="secrets" aria-label="What only you know">{#each roundSecrets as s, i (i)}<li>{secretText(s, who)}</li>{/each}</ul>
          {/if}

          <ul class="hand">
            {#each me.hand as c (c.id)}
              {@const can = (myTurn && me.playable.includes(c.id)) || filing}
              <li>
                <button class="slot" class:raised={sel === c.id || keep === c.id} class:dim={myTurn && !can} disabled={!can || conn.busy} aria-pressed={can ? sel === c.id || keep === c.id : undefined} onclick={() => (filing ? pickKeep(c.id) : pickCard(c.id))}>
                  <Card kind={c.kind} size="lg" card="c{c.id}" />
                </button>
              </li>
            {/each}
          </ul>

          {#if myTurn && sel !== null}
            <div class="choose">
              {#if aim === 'any'}
                <div class="chips" role="radiogroup" aria-label="Choose a player">
                  {#each choices as s (s)}<button role="radio" class="chip" class:on={tgt === s} aria-checked={tgt === s} onclick={() => pickSeat(s)}>{cap(who(s))}</button>{/each}
                </div>
              {:else if needsTarget}
                <div class="chips" role="radiogroup" aria-label="Choose a player">
                  {#each choices as s (s)}<button role="radio" class="chip" class:on={tgt === s} aria-checked={tgt === s} onclick={() => pickSeat(s)}>{cap(who(s))}</button>{/each}
                </div>
              {/if}
              {#if needsGuess}
                <div class="chips" role="radiogroup" aria-label="Name a character">
                  {#each kindsHere as k (k)}<button role="radio" class="chip" class:on={guess === k} aria-checked={guess === k} onclick={() => (guess = k)}>{KINDS[k].value} {KINDS[k].name}</button>{/each}
                </div>
              {/if}
              <button class="btn primary" disabled={!ready || conn.busy} onclick={commit}>Seal and play the {KINDS[selKind!].name}</button>
            </div>
          {:else if filing && keep !== null}
            <div class="choose">
              <p class="muted">Under the deck, from top to bottom: {under.map((id) => KINDS[kindOf(id)!].name).join(', then ')}.</p>
              {#if under.length > 1}<button class="btn small" onclick={swap}>Swap their order</button>{/if}
              <button class="btn primary" disabled={conn.busy} onclick={file}>Keep the {KINDS[kindOf(keep)!].name}</button>
            </div>
          {/if}
        </section>
      {/if}
    </section>

    <section class="pane side chat" class:hide={!chatShown} aria-label="Chat">
      <div class="log" bind:this={chatLog} role="log" aria-live="polite">
        {#if !view.chat.length}<p class="muted">Talk, bluff and accuse here. Nothing said in chat is checked.</p>{/if}
        {#each view.chat as c (c.id)}
          <p class="line" class:mine={c.seat === seat}><span class="by">{cap(who(c.seat))}</span> {c.text ?? REACTION_TEXT[c.react!] ?? c.react}</p>
        {/each}
      </div>
      <div class="reacts" role="group" aria-label="Reactions">
        {#each REACTIONS as r (r)}<button class="chip" disabled={conn.busy} onclick={() => react(r)}>{REACTION_TEXT[r]}</button>{/each}
      </div>
      <form onsubmit={say}>
        <label class="visually-hidden" for="sc-chat">Message the table</label>
        <input id="sc-chat" class="field-input" bind:value={text} maxlength={CHAT_MAX} autocomplete="off" placeholder="Say anything…" />
        <button class="btn" disabled={conn.busy || !text.trim()}>Send</button>
      </form>
    </section>

    <section class="pane side history" class:hide={wide.current ? sideTab !== 'log' : tab !== 'log'} aria-label="History">
      <ol class="log">
        {#each [...view.log].reverse() as e (e.id)}<li class:rnd={e.t === 'round'}>{logText(e, who)}</li>{/each}
      </ol>
    </section>
  </div>

  <nav class="tabs" aria-label="Views">
    {#if !wide.current}<button class:on={tab === 'table'} aria-current={tab === 'table' ? 'page' : undefined} onclick={() => (tab = 'table')}>Table</button>{/if}
    <button class:on={chatShown} aria-current={chatShown ? 'page' : undefined} onclick={() => (wide.current ? (sideTab = 'chat') : (tab = 'chat'))}>Chat{#if unread}<span class="new" title="New messages"></span><span class="visually-hidden"> (new)</span>{/if}</button>
    <button class:on={wide.current ? sideTab === 'log' : tab === 'log'} onclick={() => (wide.current ? (sideTab = 'log') : (tab = 'log'))}>History</button>
  </nav>

  {#if banner}<p class="banner" role="status">{banner}</p>{/if}
</div>

<Guide bind:open={guideOpen} doc={guideDoc} />
<QuitGame {conn} {room} bind:open={quitOpen} />
<Tutorial bind:open={tutorialOpen} />

<style>
  .table {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-wrap: anywhere;
    background: radial-gradient(ellipse at 50% 35%, var(--ground-2), var(--ground-1) 70%);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 10px 4px 14px;
    padding-top: max(4px, env(safe-area-inset-top));
    border-bottom: 1px solid var(--rim);
  }
  .round {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 10px;
    margin: 0;
    min-width: 0;
  }
  .round .label {
    font: 700 20px/1.2 var(--sc-serif);
  }
  .sub,
  .muted {
    color: var(--ink-3);
    font-size: 14px;
  }
  .scset {
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
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .timer.late {
    color: var(--warn);
  }
  .status.mine .timer.late {
    color: var(--sc-wine);
  }
  .away {
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
  .hide {
    display: none !important;
  }
  .pane {
    min-height: 0;
  }
  .play {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 12px 12px;
    overflow-y: auto;
  }
  /* Opponents: a strip that scrolls sideways on a phone, a row around the top of the table on a desk. */
  .opps {
    list-style: none;
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 0 0 4px;
    overflow-x: auto;
  }
  .wide .opps {
    flex-wrap: wrap;
    justify-content: center;
    overflow: visible;
  }
  .opp {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: 'who seals' 'flags flags' 'backs pile';
    align-items: center;
    gap: 4px 8px;
    min-width: 168px;
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
    box-shadow: inset 0 0 0 1px var(--sc-brass);
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
    opacity: 0.45;
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
    background: var(--sc-brass);
  }
  .seals {
    grid-area: seals;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px;
    min-height: 18px;
  }
  .seals img {
    border-radius: 50%;
    animation: stamp var(--dur-3) var(--ease-out) backwards;
  }
  .flags {
    grid-area: flags;
    font-size: 12px;
    color: var(--ink-3);
    min-height: 1em;
  }
  .backs {
    grid-area: backs;
    display: flex;
    gap: 3px;
  }
  .pile {
    grid-area: pile;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    --w: 36px;
  }
  .pile :global(.sc-card) {
    --w: 34px;
  }
  .pile :global(.sc-card .plate) {
    display: none;
  }
  .disc {
    opacity: 0.7;
    transform: rotate(-6deg);
  }
  .centre {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 18px;
    padding: 6px 0;
  }
  .deck,
  .faceup {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .fu {
    display: flex;
    gap: 4px;
  }
  .cap {
    font-size: 12px;
    color: var(--ink-3);
  }
  .empty {
    display: grid;
    place-items: center;
    width: 54px;
    aspect-ratio: 5 / 7;
    font-size: 12px;
    color: var(--ink-3);
    border: 1px dashed var(--rim-hi);
    border-radius: 4px;
  }
  .roundend {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 12px;
    text-align: center;
    background: var(--ground-3);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-md);
    animation: rise var(--dur-3) var(--ease-out) backwards;
  }
  .headline {
    margin: 0;
    font: 700 18px/1.35 var(--sc-serif);
  }
  .shown {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .shown figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    opacity: 0.7;
  }
  .shown figure.won {
    opacity: 1;
  }
  .shown figure.won :global(.sc-card) {
    outline: 2px solid var(--sprout);
  }
  .turnup {
    display: block;
    animation: turnup var(--dur-3) var(--ease-out) backwards;
  }
  .shown figure:nth-child(2) .turnup {
    animation-delay: 120ms;
  }
  .shown figure:nth-child(3) .turnup {
    animation-delay: 240ms;
  }
  .shown figure:nth-child(n + 4) .turnup {
    animation-delay: 360ms;
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
  /* Your own seat stays at the bottom of the table. */
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
    gap: 10px;
    align-items: center;
  }
  .flag {
    font-size: 12px;
    font-weight: 400;
    color: var(--ink-3);
    margin-left: 6px;
  }
  .mypile :global(.sc-card) {
    --w: 40px;
  }
  .secrets {
    margin: 0;
    padding: 6px 10px 6px 26px;
    font-size: 14px;
    color: var(--ink-2);
    background: rgb(124 34 51 / 0.2);
    border: 1px solid rgb(124 34 51 / 0.6);
    border-radius: var(--r-md);
  }
  .hand {
    list-style: none;
    display: flex;
    gap: 12px;
    margin: 0;
    padding: 12px 0 0;
  }
  .slot {
    padding: 0;
    border: 0;
    background: none;
    border-radius: 8px;
    transition: transform var(--dur-2) var(--ease-out), opacity var(--dur-2);
  }
  .slot:not(:disabled) {
    cursor: pointer;
  }
  .slot:not(:disabled):hover {
    transform: translateY(-4px);
  }
  .slot.raised {
    transform: translateY(-14px);
  }
  .slot.raised :global(.sc-card) {
    outline: 3px solid var(--sprout);
  }
  .slot.dim {
    opacity: 0.55;
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
  .chip.on {
    color: var(--sprout-ink);
    background: var(--sprout);
    border-color: var(--sprout);
    font-weight: 600;
  }
  .chat {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .log {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0;
    padding: 10px 12px;
    font-size: 14px;
  }
  .history .log {
    height: 100%;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--ink-2);
  }
  .history li.rnd {
    margin-top: 6px;
    color: var(--ink);
    font-weight: 700;
  }
  .line {
    margin: 0 0 6px;
  }
  .by {
    font-weight: 700;
    color: var(--ink-2);
  }
  .line.mine .by {
    color: var(--sc-brass);
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
  input:not([type]) ,
  .field-input {
    flex: 1;
    min-width: 0;
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
  .new {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--sprout);
    vertical-align: middle;
  }
  .banner {
    position: absolute;
    left: 50%;
    top: 30%;
    z-index: 20;
    max-width: min(92%, 520px);
    margin: 0;
    padding: 12px 18px;
    font: 700 18px/1.35 var(--sc-serif);
    text-align: center;
    color: var(--sc-paper-ink);
    background: var(--sc-ivory);
    border: 2px solid var(--sc-brass);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-lift);
    transform: translateX(-50%);
    pointer-events: none;
    animation: banner 2.2s var(--ease-out) forwards;
  }
  @keyframes banner {
    0% {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    12%,
    82% {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -6px);
    }
  }
  @keyframes stamp {
    from {
      opacity: 0;
      transform: scale(1.8);
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes turnup {
    from {
      transform: perspective(600px) rotateY(90deg);
    }
  }
  .still *,
  .still {
    animation: none !important;
    transition: none !important;
  }
  /* Desktop: the table on the left, chat and history on the right under their own tabs. */
  @media (min-width: 900px) {
    .table {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      grid-template-rows: auto auto auto 48px minmax(0, 1fr);
    }
    .top,
    .status,
    .away {
      grid-column: 1 / -1;
    }
    .main {
      display: contents;
    }
    .play {
      grid-column: 1;
      grid-row: 4 / 6;
      padding: 16px 20px;
    }
    .tabs {
      grid-column: 2;
      grid-row: 4;
      border-top: 0;
      border-left: 1px solid var(--rim);
    }
    .side {
      grid-column: 2;
      grid-row: 5;
      border-left: 1px solid var(--rim);
      background: var(--ground-1);
    }
    .table:not(:has(.away)) {
      grid-template-rows: auto auto 48px minmax(0, 1fr);
    }
    .table:not(:has(.away)) .play {
      grid-row: 3 / 5;
    }
    .table:not(:has(.away)) .tabs {
      grid-row: 3;
    }
    .table:not(:has(.away)) .side {
      grid-row: 4;
    }
  }
</style>
