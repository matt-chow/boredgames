<script lang="ts">
  import { getContext, onDestroy, onMount, tick } from 'svelte';
  import { finishAll, play, snapshot, type Snapshot } from '../../../client/lib/motion';
  import { settings } from '../../../client/lib/settings.svelte';
  import { sfx } from '../../../client/lib/sound';
  import { toasts } from '../../../client/lib/toast.svelte';
  import { encodeMarket, type CardRefView, type DeckAction, type DeckGame, type DeckView, type LogEntry } from '../../../engine/deckbuilder';
  import Dialog from '../../../hub/Dialog.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import Icon from '../../../hub/Icon.svelte';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import Camera from '../../bohnanza/ui/Camera.svelte';
  import { GAMES } from '../../registry';
  import type { GameUiProps } from '../../ui';
  import DeckCard from './DeckCard.svelte';
  import DeckHand from './DeckHand.svelte';
  import DeckSummary from './DeckSummary.svelte';
  import Opponent from './Opponent.svelte';
  import Prompt from './Prompt.svelte';
  import PublicWorks from './PublicWorks.svelte';
  import Supply from './Supply.svelte';
  import { defsOf, logLine, typeLabel } from './text';

  let { conn, room }: GameUiProps = $props();

  const g = $derived(room.game as DeckView);
  const rules = $derived((GAMES[room.gameId] as unknown as DeckGame).rulesFor(g.rulesVersion));
  const defs = $derived(defsOf(rules));
  const me = $derived(g.you ?? 0);
  const mine = $derived(g.players[me]);
  const others = $derived(g.players.map((_, i) => (me + 1 + i) % g.players.length).slice(0, -1));
  const seatInfo = (s: number) => room.seats.find((x) => x.seat === s);
  const name = (s: number) => seatInfo(s)?.name ?? `Player ${s + 1}`;
  const cardName = (key: string) => defs[key]?.name ?? rules.projects?.find((w) => w.key === key)?.name ?? key;
  const words = $derived(rules.labels);
  const buyStep = $derived(words?.buyPhase ?? 'buying');
  const tokenName = (t: string) => rules.labels?.tokens[t] ?? t;
  const isActive = $derived(g.turn.seat === g.you);
  const over = $derived(g.over);
  const compact = $derived(settings.layout === 'compact');

  let quitting = $state(false);
  let howto = $state(false);
  let helpAt = $state<string | null>(null);
  const guideDoc = getContext<GuideDoc | undefined>('deck-guide');
  const olderEdition = $derived((g.rulesVersion ?? 0) < ((GAMES[room.gameId] as unknown as DeckGame).rules.version ?? 0));
  function help(id: string | null) {
    helpAt = id;
    howto = true;
  }
  let logOpen = $state(false);
  let showSummary = $state(true);
  let root: HTMLElement;

  // ── the decision in front of this player ────────────────────────────
  const q = $derived(g.pending);
  const asked = $derived(q && q.seat === g.you ? q : null);
  const helpHere = $derived(asked ? (asked.kind === 'react' ? 'f-attacks' : 'f-words') : g.turn.phase === 'action' ? 'f-action' : 'f-market');
  let picked = $state<number[]>([]);
  let pickedFor = -1;
  $effect(() => {
    const id = q?.id ?? -1;
    if (id !== pickedFor) {
      pickedFor = id;
      picked = [];
    }
  });

  const inHand = $derived(new Set(g.hand.map((c) => c.id)));
  const choosable = $derived(new Set(asked && (asked.kind === 'cards' || asked.kind === 'react') ? (asked.cards ?? []).map((c) => c.id) : []));
  /** Cards drawn on the table already; a copy in the prompt must not share their motion id. */
  const onTable = $derived(new Set([...g.players.flatMap((p) => [...p.play.map((c) => c.id), ...(p.discardTop ? [p.discardTop.id] : [])]), ...(g.trash.length ? [g.trash[g.trash.length - 1].id] : [])]));
  const shown = $derived((asked?.cards ?? []).filter((c) => !inHand.has(c.id)).map((c) => ({ ...c, tracked: !onTable.has(c.id) })));
  const shownIds = $derived(new Set(shown.map((c) => c.id)));
  const revealed = $derived(g.revealed.filter((c) => !shownIds.has(c.id)));

  function toggle(id: number) {
    if (!asked) return;
    if (picked.includes(id)) picked = picked.filter((x) => x !== id);
    else picked = asked.max === 1 ? [id] : picked.length < asked.max ? [...picked, id] : picked;
  }

  // ── what can be touched right now ───────────────────────────────────
  const handLegal = $derived(asked ? new Set(g.hand.filter((c) => choosable.has(c.id)).map((c) => c.id)) : new Set(g.legal.play));
  const handSelected = $derived(new Set(picked));
  const livePiles = $derived(new Set(asked?.kind === 'pile' ? (asked.piles ?? []) : g.legal.buy));

  async function act(a: DeckAction): Promise<boolean> {
    const r = await conn.act(a);
    if (!r.ok) {
      sfx.error();
      if (r.code !== 'stale') toasts.push(r.error ?? 'That move isn’t allowed.', 'error');
      else toasts.push('The table changed just before your move. Look again and retry.', 'info');
    }
    return r.ok;
  }

  function pickHand(id: number) {
    if (conn.busy) return;
    if (asked) return toggle(id);
    if (g.legal.play.includes(id)) act({ type: 'play', card: id });
  }
  function pickPile(key: string) {
    if (conn.busy) return;
    if (asked) act({ type: 'decide', id: asked.id, pile: key });
    else act({ type: 'buy', pile: key });
  }

  // ── guidance: only the next step ────────────────────────────────────
  const step = $derived.by((): { text: string; mine: boolean } => {
    if (over) return { text: 'The game is over.', mine: false };
    if (q && !asked) return { text: `${name(q.seat)} is deciding: ${q.prompt}`, mine: false };
    if (asked) return { text: asked.prompt, mine: true };
    const A = name(g.turn.seat);
    if (!isActive) return { text: g.turn.phase === 'action' ? `${A} is in the ${(words?.actionPhase ?? 'action').toLowerCase()} phase.` : `${A} is in the ${(words?.buyPhase ?? 'buy').toLowerCase()} phase.`, mine: false };
    if (g.turn.phase === 'action') return g.legal.play.length ? { text: `Play an action, or move on to ${buyStep}.`, mine: true } : { text: `No actions to play. Move on to ${buyStep}.`, mine: true };
    if (g.legal.play.length) return { text: `Play your ${(words?.treasures ?? 'treasures').toLowerCase()}, then buy.`, mine: true };
    return g.legal.buy.length ? { text: 'Buy a card, or end your turn.', mine: true } : { text: 'Nothing more to buy. End your turn.', mine: true };
  });
  const turnLabel = $derived(over ? 'Game over' : asked ? 'Your decision' : isActive ? 'Your turn' : `${name(g.turn.seat)}’s turn`);

  const canTreasures = $derived(!asked && isActive && g.turn.phase === 'buy' && g.legal.play.length > 0);
  const phaseLabel = $derived(g.turn.phase === 'action' ? `Move on to ${words?.buyPhase ?? 'buying'}` : 'End turn');
  const phaseIsPrimary = $derived(g.turn.phase === 'action' ? g.legal.play.length === 0 : !canTreasures && !g.legal.buy.length);

  const matNames = $derived(Object.entries(mine.mats).filter(([, m]) => m.count));
  const myTokens = $derived(Object.entries(mine.tokens).filter(([t, n]) => n && rules.tokenCaps?.[t] === undefined));

  // ── piles you can look through ──────────────────────────────────────
  let listing = $state<{ title: string; cards: CardRefView[] } | null>(null);
  let listOpen = $state(false);
  function list(title: string, cards: CardRefView[] | undefined) {
    listing = { title, cards: [...(cards ?? [])].reverse() };
    listOpen = true;
  }

  // ── motion & sound: driven only by confirmed views ──────────────────
  let before: Snapshot | null = null;
  /** Keys of cards just taken from the supply, and who last held each card, for the frame being animated. */
  let gained = new Set<string>();
  let held = new Map<number, number>();

  onMount(() =>
    conn.onRoom((next, prev) => {
      finishAll();
      if (!prev || prev.version === next.version || !root) return;
      before = snapshot(document);
      const n = next.game as DeckView | null;
      const p = prev.game as DeckView | null;
      if (!n || !p) return;
      const fresh = n.log.filter((e) => e.n > (p.log.at(-1)?.n ?? 0));
      gained = new Set(fresh.filter((e) => e.kind === 'gain' || e.kind === 'buy').flatMap((e) => e.keys ?? []));
      held = new Map(p.players.flatMap((x) => x.play.map((c): [number, number] => [c.id, x.seat])));
      sounds(fresh, n, p);
    }),
  );
  onDestroy(finishAll);

  function sounds(fresh: LogEntry[], n: DeckView, p: DeckView) {
    const kinds = new Set(fresh.map((e) => e.kind));
    if (kinds.has('game-over')) return sfx.end();
    if (kinds.has('turn')) n.turn.seat === n.you ? sfx.yourTurn() : sfx.turn();
    else if (n.pending?.seat === n.you && p.pending?.seat !== n.you && n.turn.seat !== n.you) sfx.yourTurn();
    if (kinds.has('buy') || kinds.has('claim')) sfx.coin();
    if (kinds.has('move:trash')) sfx.reject();
    if (kinds.has('draw') || kinds.has('shuffle')) sfx.flip();
    if (kinds.has('play') || kinds.has('gain')) sfx.card();
  }

  function originOf(_id: string, el: HTMLElement): string | null {
    const zone = el.dataset.zone ?? '';
    const key = el.dataset.key ?? '';
    const [where, seat] = zone.split('-');
    if ((where === 'hand' || where === 'discard') && gained.has(key)) return `pile-${key}`;
    if (where === 'hand') return `deck-${seat}`;
    if (where === 'panel') return `deck-${me}`;
    if (where === 'revealed') return `deck-${g.turn.seat}`;
    if (where === 'play' || where === 'discard') return `hand-${seat}`;
    return null;
  }

  function exitOf(id: string): string | null {
    const n = Number(id);
    if (g.trash.some((c) => c.id === n)) return 'trash';
    if (g.discard.some((c) => c.id === n)) return `discard-${me}`;
    const owner = held.get(n);
    return owner !== undefined ? `discard-${owner}` : `deck-${me}`;
  }

  $effect(() => {
    void room.version;
    const b = before;
    if (!b) return;
    before = null;
    tick().then(() => play(b, { originOf, exitOf }));
  });

  // ── inspection: right-click, long-press, the i key, or tap a card you can't play ──
  let inspect = $state<string | null>(null);
  let inspectOpen = $state(false);
  const inspected = $derived(inspect ? defs[inspect] : null);
  const inspectedPile = $derived(inspect ? g.supply.find((p) => p.key === inspect) : undefined);
  function showCard(key: string) {
    inspect = key;
    inspectOpen = true;
  }
  const keyAt = (t: EventTarget | null) => ((t as HTMLElement | null)?.closest?.('[data-key]') as HTMLElement | null)?.dataset.key ?? null;

  let press: { t: number; x: number; y: number } | null = null;
  /** A long-press opens the card; the click that ends it must not also play the card. */
  let swallowClick = false;
  function onContext(e: MouseEvent) {
    const k = keyAt(e.target);
    if (k) {
      e.preventDefault();
      showCard(k);
    }
  }
  function onPress(e: PointerEvent) {
    swallowClick = false;
    if (e.pointerType !== 'touch') return;
    const k = keyAt(e.target);
    if (!k) return;
    press = {
      x: e.clientX,
      y: e.clientY,
      t: window.setTimeout(() => {
        press = null;
        swallowClick = true;
        showCard(k);
      }, 520),
    };
  }
  function onMove(e: PointerEvent) {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
      clearTimeout(press.t);
      press = null;
    }
  }
  function onUp() {
    if (press) clearTimeout(press.t);
    press = null;
  }
  function onClickCapture(e: MouseEvent) {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  }
  function onClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, [role="dialog"]')) return;
    const k = keyAt(t);
    if (k) showCard(k);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'i' || (e.target as HTMLElement).closest('input, textarea')) return;
    const k = keyAt(document.activeElement);
    if (k) showCard(k);
  }

  $effect(() => {
    document.title = `${(isActive || asked) && !over ? '● ' : ''}${rules.name} · ${room.code}`;
  });

  const lastLog = $derived(g.log.length ? logLine(g.log[g.log.length - 1], name, cardName, tokenName) : '');
  const marketCode = $derived(encodeMarket(rules, g.market, g.projects.map((p) => p.key)));
  const trashTop = $derived(g.trash.length ? g.trash[g.trash.length - 1] : null);

  // ── what you own: counts only, sorted so nothing hints at where a card is ──
  let overviewOpen = $state(false);
  const ownedList = $derived(Object.entries(g.owned).sort(([a], [b]) => defs[b].cost - defs[a].cost || defs[a].name.localeCompare(defs[b].name)));
  const ownedTotal = $derived(ownedList.reduce((n, [, c]) => n + c, 0));
  const pointsWord = $derived(words?.points ?? 'Points');
  const scoreLines = $derived(
    g.score
      ? [
          ['Estates', g.score.estates],
          ['Special scoring', g.score.special],
          [words?.projects ?? 'Projects', g.score.projects],
          ['Negative cards', g.score.negative],
          ['Conditional cards', g.score.conditional],
        ] as [string, number][]
      : [],
  );
  const signed = (n: number) => String(n).replace('-', '−');
  const endPileNames = $derived(rules.endPiles.map(cardName).join(', '));
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="table"
  class:compact
  bind:this={root}
  oncontextmenu={onContext}
  onpointerdown={onPress}
  onpointermove={onMove}
  onpointerup={onUp}
  onpointercancel={onUp}
  onclickcapture={onClickCapture}
  onclick={onClick}
>
  <header class="bar">
    <div class="who">
      <span class="code label" title="Table code">{room.code}</span>
      <span class="turn" class:you={!over && (isActive || !!asked)}>{turnLabel}</span>
    </div>
    <div class="stepline"><p class="step" class:mine={step.mine} aria-live="polite">{step.text}</p>{#if guideDoc}<button type="button" class="ctx" aria-label="Explain this step" onclick={() => help(helpHere)}>?</button>{/if}</div>
    <div class="tools">
      <button class="btn icon ghost" aria-label="Table log" onclick={() => (logOpen = !logOpen)}><Icon name="log" /></button>
      <SettingsMenu onhelp={() => help(null)} onquit={room.status === 'playing' ? () => (quitting = true) : undefined} />
    </div>
  </header>

  <div class="stage">
    <Camera enabled={!compact}>
      <div class="opps">
        {#each others as s (s)}
          <Opponent
            {tokenName}
            p={g.players[s]}
            {defs}
            name={name(s)}
            connected={seatInfo(s)?.connected ?? false}
            bot={seatInfo(s)?.bot ?? false}
            active={g.turn.seat === s}
            deciding={q?.seat === s}
          />
        {/each}
      </div>

      <Supply {g} {defs} live={livePiles} onpick={pickPile} />

      {#if g.projects.length}
        <PublicWorks {g} works={rules.projects ?? []} title={words?.projects ?? 'Projects'} points={words?.points ?? 'points'} {tokenName} busy={conn.busy} {name} onclaim={(project) => act({ type: 'claim', project })} />
      {/if}

      <section class="own" aria-label="Your area">
        <button class="pile tap" data-anchor="deck-{me}" onclick={() => (overviewOpen = true)} aria-label="Your deck: {mine.deckCount} cards. Open your deck overview.">
          {#if mine.deckCount}<DeckCard size="sm" />{:else}<span class="slot-empty"></span>{/if}
          <span class="pl"><b class="num">{mine.deckCount}</b> deck</span>
        </button>

        <div class="inplay" aria-label="Your cards in play">
          {#if revealed.length}
            <div class="revealed" aria-label="Revealed cards">
              <span class="tag">Revealed</span>
              {#each revealed as c (c.id)}
                <DeckCard def={defs[c.key]} id={c.id} zone="revealed" size="sm" />
              {/each}
            </div>
          {/if}
          {#each mine.play as c (c.id)}
            <span class="slot"><DeckCard def={defs[c.key]} id={c.id} zone="play-{me}" size="md" /></span>
          {/each}
          {#if !mine.play.length && !revealed.length}<span class="hint">Cards you play land here.</span>{/if}
        </div>

        <div class="side">
          {#each matNames as [m, info] (m)}
            <button class="btn small" onclick={() => list(m, info.cards)}>{m} <span class="num">{info.count}</span></button>
          {/each}
          {#each myTokens as [t, n] (t)}<span class="tok num">{n} {tokenName(t)}</span>{/each}
        </div>

        <button class="pile tap" data-anchor="discard-{me}" onclick={() => list('Your discard pile', g.discard)} aria-label="Your discard pile: {mine.discardCount} cards. Look through it.">
          {#if mine.discardTop}
            <DeckCard def={defs[mine.discardTop.key]} id={mine.discardTop.id} zone="discard-{me}" size="sm" />
          {:else}
            <span class="slot-empty"></span>
          {/if}
          <span class="pl"><b class="num">{mine.discardCount}</b> discard</span>
        </button>

        <button class="pile tap" data-anchor="trash" onclick={() => list('Trash', g.trash)} aria-label="Trash: {g.trash.length} cards. Look through it.">
          {#if trashTop}
            <DeckCard def={defs[trashTop.key]} id={trashTop.id} zone="trash" size="sm" />
          {:else}
            <span class="slot-empty"></span>
          {/if}
          <span class="pl"><b class="num">{g.trash.length}</b> trash</span>
        </button>
      </section>
    </Camera>

    {#if lastLog && !over}
      <p class="ticker" aria-hidden="true">{lastLog}</p>
    {/if}

    {#if asked}
      <div class="prompt-wrap">
        <Prompt
          q={asked}
          {defs}
          {picked}
          {shown}
          busy={conn.busy}
          ontoggle={toggle}
          onconfirm={() => act({ type: 'decide', id: asked!.id, cards: [...picked] })}
          onoption={(i) => act({ type: 'decide', id: asked!.id, option: i })}
          onskip={() => act({ type: 'decide', id: asked!.id })}
          onplayer={(seat) => act({ type: 'decide', id: asked!.id, seat })}
          {name}
        />
      </div>
    {/if}
  </div>

  <footer class="hud">
    <dl class="res" aria-label="{isActive ? 'Your' : `${name(g.turn.seat)}’s`} turn: resources">
      <div><dt>Actions</dt><dd class="num">{g.turn.actions}</dd></div>
      <div><dt>Buys</dt><dd class="num">{g.turn.buys}</dd></div>
      <div class="coins"><dt>Coins</dt><dd class="num">{g.turn.coins}</dd></div>
      {#each Object.entries(rules.tokenCaps ?? {}) as [t, cap] (t)}<div class="token" title="Yours. Holds up to {cap}.{rules.convert?.token === t ? ` Convert up to ${rules.convert.maxPerTurn} a turn at ${rules.convert.coinsEach} Coin each in the ${buyStep} phase, or spend it on ${words?.projects ?? 'projects'}.` : ''}"><dt>{tokenName(t)}</dt><dd class="num">{mine.tokens[t] ?? 0}<small>/{cap}</small></dd></div>{/each}
      {#if g.score}<div class="renown"><dt>{pointsWord}</dt><dd><button type="button" class="num" aria-label="Your {pointsWord}: {g.score.total}. Open the breakdown and your deck overview." onclick={() => (overviewOpen = true)}>{signed(g.score.total)}</button></dd></div>{/if}
      <div class="phase"><dt>Phase</dt><dd>{g.turn.phase === 'action' ? (words?.actionPhase ?? 'Actions') : (words?.buyPhase ?? 'Buying')}</dd></div>
    </dl>
    <div class="hand-wrap">
      <DeckHand cards={g.hand} {defs} seat={me} legal={handLegal} selected={handSelected} onpick={pickHand} />
    </div>
    <div class="actions">
      {#if room.canUndo}
        <button class="btn ghost" onclick={() => conn.send({ t: 'undo' }).then((r) => !r.ok && toasts.push(r.error ?? 'Can’t undo now.', 'error'))}>
          <Icon name="undo" size={18} /> Undo
        </button>
      {/if}
      {#if canTreasures}
        <button class="btn primary go" disabled={conn.busy} onclick={() => act({ type: 'play-treasures' })}>Play all {(words?.treasures ?? 'treasures').toLowerCase()}</button>
      {/if}
      {#if g.legal.convert}
        <button class="btn go" disabled={conn.busy} onclick={() => act({ type: 'convert' })}>Convert {tokenName(rules.convert?.token ?? '')} <span class="num">({g.turn.converted}/{rules.convert?.maxPerTurn})</span></button>
      {/if}
      {#if g.legal.endPhase}
        <button class="btn go" class:primary={phaseIsPrimary} disabled={conn.busy} onclick={() => act({ type: 'end-phase' })}>
          {phaseLabel} <Icon name="arrowRight" />
        </button>
      {:else if over}
        <button class="btn primary go" onclick={() => (showSummary = true)}>Results</button>
      {/if}
    </div>
  </footer>

  {#if logOpen}
    <aside class="log" aria-label="Table log">
      <header><b>Table log</b><button class="btn icon ghost" aria-label="Close log" onclick={() => (logOpen = false)}><Icon name="close" size={16} /></button></header>
      <ol>
        {#each [...g.log].reverse() as l (`${l.n}:${l.to ?? ''}`)}
          <li>{logLine(l, name, cardName, tokenName)}</li>
        {/each}
      </ol>
    </aside>
  {/if}
</div>

<Dialog bind:open={listOpen} title={listing?.title ?? ''} wide>
  {#if listing}
    {#if listing.cards.length}
      <div class="listing">
        {#each listing.cards as c, i (`${c.id}:${i}`)}
          <DeckCard def={defs[c.key]} size="md" onclick={() => showCard(c.key)} />
        {/each}
      </div>
    {:else}
      <p class="none">Nothing here yet.</p>
    {/if}
  {/if}
</Dialog>

<Dialog bind:open={overviewOpen} title="Your deck overview" wide>
  {#if g.score}
    <dl class="tally" aria-label="Your {pointsWord}">
      {#each scoreLines as [label, n] (label)}<div><dt>{label}</dt><dd class="num">{signed(n)}</dd></div>{/each}
      <div class="sum"><dt>Your {pointsWord}</dt><dd class="num">{signed(g.score.total)}</dd></div>
    </dl>
    <p class="none">Only you can see this until the game ends. Trashed cards don’t count.</p>
  {/if}
  {#if guideDoc}<button type="button" class="btn small" onclick={() => ((overviewOpen = false), help('f-renown'))}>How {pointsWord} works</button>{/if}
  <h3 class="own-h">You own <span class="num">{ownedTotal}</span> cards</h3>
  <p class="none">Deck <b class="num">{mine.deckCount}</b> · Hand <b class="num">{g.hand.length}</b> · In play <b class="num">{mine.play.length}</b> · Discard <b class="num">{mine.discardCount}</b>. Your deck’s order stays hidden, from you too.</p>
  <ul class="owned">
    {#each ownedList as [key, n] (key)}
      <li><DeckCard def={defs[key]} size="xs" onclick={() => showCard(key)} /><span class="num">×{n}</span><span class="own-nm">{defs[key].name}</span></li>
    {/each}
  </ul>
</Dialog>

<Dialog bind:open={inspectOpen} title={inspected?.name ?? 'Card'}>
  {#if inspected}
    <div class="ins">
      <DeckCard def={inspected} size="xl" />
      <div class="facts">
        <p>{inspected.text}</p>
        <p class="meta">{inspected.typeLine ?? typeLabel(inspected.types)}</p>
        <p class="meta">Costs <b class="num">{inspectedPile?.cost ?? inspected.cost}</b></p>
        {#if inspectedPile}<p class="meta"><b class="num">{inspectedPile.count}</b> left in the supply</p>{/if}
      </div>
    </div>
  {/if}
</Dialog>

{#if guideDoc}
  <Guide bind:open={howto} doc={guideDoc} at={helpAt} note={olderEdition ? 'This table began under an earlier edition and keeps its original rules to the end. See “Sets, variants and older rooms” in Detailed rules.' : ''} />
{:else}
<Dialog bind:open={howto} title="How a turn works">
  <ol class="how">
    <li><b>{words?.actionPhase ?? 'Actions'}.</b> Play action cards while you have actions. Each one spends an action and tells you what to do.</li>
    <li><b>{words?.buyPhase ?? 'Buying'}.</b> Play {(words?.treasures ?? 'treasures').toLowerCase()} for coins, then buy from the supply. Each card costs a buy.{#if rules.projects?.length} You can also complete one of the {words?.projects}.{/if}</li>
    <li><b>Clean-up.</b> Everything goes to your discard pile and you draw {rules.handSize} new cards. When your deck runs out, your discard pile is shuffled into a new one.</li>
  </ol>
  {#if rules.convert}
    <p class="how-end">{tokenName(rules.convert.token)} carries over between turns, up to {rules.tokenCaps?.[rules.convert.token]}. In the {words?.buyPhase ?? 'buying'} phase you can convert it, {rules.convert.coinsEach} Coin each, up to {rules.convert.maxPerTurn} a turn.</p>
  {/if}
  {#if g.projects.length}
    <p class="how-end">Each of the {words?.projects} can be completed once, by the first player to pay its price. It gives {(words?.points ?? 'points')} and a one-time reward.</p>
  {/if}
  <p class="how-end">The game ends when {endPileNames} runs out, when {rules.emptyPilesToEnd(g.players.length)} {rules.emptyMarketPilesOnly ? 'market' : 'supply'} piles are empty{#if rules.projectsToEnd}, or when {rules.projectsToEnd(g.players.length)} {words?.projects ?? 'projects'} are complete{/if}. Most {words?.points ?? 'points'} wins.</p>
  <p class="how-end">Right-click or long-press any card to read it, or press <kbd>i</kbd> on a focused card.</p>
</Dialog>
{/if}

<QuitGame {conn} {room} bind:open={quitting} />
{#if over && showSummary && g.final}
  <DeckSummary {g} {room} {conn} {defs} code={marketCode} {name} points={words?.points ?? 'points'} projectsWord={words?.projects ?? 'Projects'} projectName={cardName} onclose={() => (showSummary = false)} />
{/if}

<style>
  .table {
    position: relative;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'bar'
      'stage'
      'hud';
    background:
      radial-gradient(90% 70% at 50% 45%, var(--table-glow, #2a1f16) 0%, transparent 70%),
      var(--ground-1);
    overflow: hidden;
  }
  .bar {
    grid-area: bar;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: max(8px, env(safe-area-inset-top)) 12px 8px 16px;
    border-bottom: 1px solid var(--rim);
    background: var(--table-veil, rgb(15 11 8 / 0.6));
    z-index: 20;
  }
  .who {
    display: flex;
    align-items: baseline;
    gap: 12px;
    min-width: 0;
  }
  .code {
    font-size: 16px;
    color: var(--ink-3);
    letter-spacing: 0.16em;
  }
  .turn {
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ink-2);
  }
  .turn.you {
    color: var(--sprout);
  }
  /* The ? sits beside the live region, so a screen reader announces the step and not the button. */
  .stepline {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }
  .ctx {
    flex: none;
  }
  .step {
    margin: 0;
    text-align: center;
    font-size: 15px;
    color: var(--ink-2);
    text-wrap: balance;
  }
  .step.mine {
    color: var(--ink);
    font-weight: 600;
  }
  .tools {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
  }
  .stage {
    grid-area: stage;
    position: relative;
    min-height: 0;
    min-width: 0;
  }
  .opps {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .own {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    margin-top: 18px;
    padding: 10px 14px;
    border-radius: var(--r-md);
    background: rgb(0 0 0 / 0.18);
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .pile {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: 0;
    font: inherit;
    color: inherit;
    background: none;
  }
  .pile.tap {
    cursor: pointer;
    border-radius: var(--r-sm);
  }
  .pl {
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .pl b {
    color: var(--ink-2);
  }
  .slot-empty {
    display: block;
    width: 60px;
    aspect-ratio: 5 / 7;
    border-radius: 5px;
    border: 1.5px dashed var(--rim);
  }
  .inplay {
    flex: 1;
    min-width: 0;
    min-height: 108px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .slot {
    flex: 0 1 80px;
    min-width: 0;
  }
  .revealed {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: var(--r-sm);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
  .tag {
    font-size: 12px;
    color: var(--ink-2);
  }
  .hint {
    width: 100%;
    text-align: center;
    font-size: 13px;
    color: var(--ink-3);
  }
  .side {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .tok {
    font-size: 13px;
    color: var(--ink-2);
  }
  .prompt-wrap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 4px;
    z-index: 14;
    display: flex;
    justify-content: center;
    padding: 0 12px;
    pointer-events: none;
  }
  .hud {
    grid-area: hud;
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 16px;
    padding: 0 16px max(10px, env(safe-area-inset-bottom));
    z-index: 15;
    pointer-events: none;
  }
  .res {
    flex: none;
    display: flex;
    gap: 14px;
    margin: 0 0 8px;
    padding: 8px 12px;
    border-radius: var(--r-md);
    background: var(--table-veil, rgb(15 11 8 / 0.6));
    box-shadow: inset 0 0 0 1px var(--rim);
    pointer-events: auto;
  }
  .res div {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .res dt {
    font-size: 12px;
    color: var(--ink-3);
  }
  .res dd {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.1;
  }
  .res .coins dd {
    color: var(--coin);
  }
  .ctx {
    margin-left: 8px;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    font: inherit;
    font-size: 12px;
    color: var(--ink-2);
    cursor: pointer;
    background: none;
    box-shadow: inset 0 0 0 1px var(--rim-hi);
    pointer-events: auto;
  }
  .res small {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-3);
  }
  .res .renown button {
    padding: 0 6px;
    border: 0;
    border-radius: var(--r-sm);
    font: inherit;
    color: inherit;
    cursor: pointer;
    background: none;
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
  .res .phase dd {
    font-size: 14px;
    font-weight: 600;
    line-height: 26px;
    white-space: nowrap;
  }
  .tally {
    margin: 0 0 8px;
  }
  .tally div {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
  }
  .tally dt {
    color: var(--ink-2);
  }
  .tally dd {
    margin: 0;
    font-weight: 600;
  }
  .tally .sum {
    border-top: 1px solid var(--rim-hi);
    font-size: 17px;
  }
  .tally .sum dt {
    color: var(--ink);
  }
  .own-h {
    margin: 16px 0 2px;
    font-size: 15px;
  }
  .owned {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 8px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }
  .owned li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 14px;
  }
  .own-nm {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .hand-wrap {
    flex: 1;
    min-width: 0;
    padding-bottom: 6px;
  }
  .actions {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    min-width: 170px;
    padding-bottom: 8px;
    pointer-events: auto;
  }
  .go {
    min-height: 52px;
    padding: 0 18px;
    white-space: nowrap;
  }
  .ticker {
    position: absolute;
    left: 50%;
    top: 6px;
    transform: translateX(-50%);
    margin: 0;
    max-width: min(560px, 80%);
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--table-veil, rgb(15 11 8 / 0.7));
    color: var(--ink-3);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    z-index: 12;
  }
  .log {
    position: absolute;
    right: 12px;
    top: 60px;
    width: min(360px, calc(100% - 24px));
    max-height: 60%;
    display: flex;
    flex-direction: column;
    border-radius: var(--r-md);
    border: 1px solid var(--rim-hi);
    background: var(--ground-2);
    box-shadow: var(--shadow-lift);
    z-index: 40;
  }
  .log header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 8px 8px 14px;
    border-bottom: 1px solid var(--rim);
  }
  .log ol {
    list-style: none;
    margin: 0;
    padding: 8px 14px 12px;
    overflow-y: auto;
    font-size: 14px;
    color: var(--ink-2);
  }
  .log li {
    padding: 4px 0;
  }
  .log li:first-child {
    color: var(--ink);
  }
  .listing {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .none {
    margin: 0;
    color: var(--ink-3);
  }
  .ins {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 22px;
  }
  .facts {
    flex: 1;
    min-width: 180px;
    color: var(--ink-2);
  }
  .facts p {
    margin: 0 0 10px;
  }
  .meta {
    font-size: 14px;
    color: var(--ink-3);
  }
  .meta b {
    color: var(--coin);
  }
  .how {
    margin: 0 0 12px;
    padding-left: 20px;
    color: var(--ink-2);
  }
  .how li {
    margin-bottom: 8px;
  }
  .how b {
    color: var(--ink);
  }
  .how-end {
    margin: 0 0 8px;
    color: var(--ink-2);
  }

  /* Compact: a flat, scrolling column for phones and small windows. */
  .compact .stage {
    overflow-y: auto;
    padding: 8px 8px 16px;
  }
  .compact .opps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 6px;
    margin-bottom: 8px;
  }
  .compact .own {
    flex-wrap: wrap;
    gap: 8px 10px;
    margin-top: 10px;
    padding: 8px;
  }
  .compact .inplay {
    order: 5;
    flex: 1 0 100%;
    min-height: 0;
  }
  .compact .side {
    flex: 1;
  }
  .compact .hint,
  .compact .ticker {
    display: none;
  }
  .compact .prompt-wrap {
    position: sticky;
    bottom: 0;
    margin-top: 8px;
    padding: 0;
  }
  .compact .hud {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'hand'
      'res'
      'actions';
    gap: 6px;
    padding: 0 8px max(8px, env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--ground-1) 60%, transparent);
  }
  .compact .hand-wrap {
    grid-area: hand;
  }
  .compact .res {
    grid-area: res;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2px 10px;
    margin: 0;
    padding: 4px 8px;
  }
  .compact .res dd {
    font-size: 18px;
  }
  .compact .res dt {
    font-size: 11px;
  }
  .compact .res .phase dd {
    font-size: 14px;
  }
  .compact .actions {
    grid-area: actions;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 0;
    padding: 0;
  }
  .compact .go {
    min-height: 48px;
    padding: 0 12px;
    font-size: 14px;
  }
  @media (max-width: 760px) {
    .bar {
      grid-template-columns: 1fr auto;
      grid-template-areas: 'who tools' 'step step';
      row-gap: 4px;
    }
    .who {
      grid-area: who;
    }
    .tools {
      grid-area: tools;
    }
    .stepline {
      grid-area: step;
      justify-content: flex-start;
    }
    .step {
      text-align: left;
      font-size: 14px;
    }
  }
</style>
