<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { beginDrag, consumeDragClick } from '../../../client/lib/drag';
  import { finishAll, play, pulse, release, snapshot, type Snapshot } from '../../../client/lib/motion';
  import { settings } from '../../../client/lib/settings.svelte';
  import { sfx } from '../../../client/lib/sound';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Icon from '../../../hub/Icon.svelte';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import { BEANS, type Bean } from '../rules/cards';
  import type { BAction } from '../rules/state';
  import type { BView, CardV } from '../rules/view';
  import Camera from './Camera.svelte';
  import Card from './Card.svelte';
  import Coins from './Coins.svelte';
  import Field from './Field.svelte';
  import Hand from './Hand.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import { guide } from './guide';
  import Inspect from './Inspect.svelte';
  import Seat from './Seat.svelte';
  import Summary from './Summary.svelte';
  import TradePanel from './TradePanel.svelte';
  import { newDraft, offerTargets, type Choosing, type Draft } from './trade';

  let { conn, room }: GameUiProps = $props();

  const g = $derived(room.game as BView);
  const me = $derived(g.you ?? 0);
  const h = $derived(g.hints);
  const mine = $derived(g.players[me]);
  const hand = $derived(mine.hand ?? []);
  const isActive = $derived(g.active === me);
  const others = $derived(Array.from({ length: g.n - 1 }, (_, i) => (me + 1 + i) % g.n));
  const seatInfo = (s: number) => room.seats.find((x) => x.seat === s);
  const name = (s: number) => seatInfo(s)?.name ?? `Player ${s + 1}`;
  const over = $derived(g.phase === 'over');

  let draft = $state<Draft | null>(null);
  let choosing = $state<Choosing | null>(null);
  let pendingPick = $state<string | null>(null);
  let stealPick = $state<{ victim: number; field: number; bean: Bean } | null>(null);
  let inspect = $state<Bean | null>(null);
  let howto = $state(false);
  let helpAt = $state<string | null>(null);
  function help(id: string | null) {
    helpAt = id;
    howto = true;
  }
  let quitting = $state(false);
  let showSummary = $state(true);
  let logOpen = $state(false);
  let dockOpen = $state(true);
  let root: HTMLElement;

  // ── what the player can do right now ────────────────────────────────
  const front = $derived(hand[0] ?? null);
  const selPending = $derived(
    g.phase === 'resolve' && mine.pending.length
      ? (mine.pending.find((c) => c.id === pendingPick)?.id ?? mine.pending[0].id)
      : null,
  );
  const mode = $derived.by(() => {
    if (!h) return 'idle';
    if (g.modal === 'coinPlant' && isActive) return 'coinPlant';
    if (g.modal === 'magpie' && isActive) return stealPick ? 'stealPlace' : 'steal';
    if (selPending && h.pendingTargets[selPending]) return 'pending';
    if (h.plantFront.length) return 'plant';
    return 'idle';
  });
  const targets = $derived.by((): number[] => {
    if (!h) return [];
    switch (mode) {
      case 'coinPlant':
        return h.coinPlantTargets;
      case 'stealPlace':
        return h.stealTargets[stealPick!.bean] ?? [];
      case 'pending':
        return h.pendingTargets[selPending!] ?? [];
      case 'plant':
        return h.plantFront;
      default:
        return [];
    }
  });

  $effect(() => {
    if (g.modal !== 'magpie') stealPick = null;
    if (g.phase !== 'trade') {
      draft = null;
      choosing = null;
    }
  });

  // ── actions ─────────────────────────────────────────────────────────
  async function act(a: BAction): Promise<boolean> {
    const r = await conn.act(a);
    if (!r.ok) {
      sfx.error();
      if (r.code !== 'stale') toasts.push(r.error ?? 'That move isn’t allowed.', 'error');
      else toasts.push('The table changed just before your move. Look again and retry.', 'info');
    }
    return r.ok;
  }

  function plantAt(field: number) {
    switch (mode) {
      case 'coinPlant':
        return act({ type: 'plantCoinCard', field });
      case 'stealPlace': {
        const p = stealPick!;
        stealPick = null;
        return act({ type: 'steal', victim: p.victim, victimField: p.field, field });
      }
      case 'pending':
        return act({ type: 'plantPending', card: selPending!, field });
      case 'plant':
        return act({ type: 'plant', field });
    }
  }

  function steal(victim: number, field: number) {
    const f = g.players[victim].fields[field];
    const bean = f[f.length - 1].t;
    const t = h?.stealTargets[bean] ?? [];
    if (t.length === 1) return act({ type: 'steal', victim, victimField: field, field: t[0] });
    stealPick = { victim, field, bean };
  }

  /** Drop handler shared by every draggable card that can go into a field. */
  function dragToField(e: PointerEvent, el: HTMLElement, prepare?: () => void) {
    beginDrag(e, el, {
      onStart: prepare,
      onDrop(t) {
        const key = t?.dataset.drop;
        if (!key?.startsWith('mine-')) return false;
        const i = Number(key.slice(5));
        if (targets.includes(i)) {
          // The ghost waits on the field until the server answers; a refusal sends it home.
          plantAt(i)?.then((ok) => ok || release());
          return true;
        } else {
          sfx.error();
          pulse(t, 'nudge');
          toasts.push(fieldReason(), 'error');
          return false;
        }
      },
    });
  }

  function fieldReason() {
    return mode === 'plant' && g.planted === 0
      ? 'That field holds a different bean. Plant into a matching or empty field, or harvest one first.'
      : 'That field holds a different bean.';
  }

  const tradeTargets = $derived(offerTargets(g));

  function pickHand(id: string) {
    if (consumeDragClick()) return;
    if (choosing) {
      const has = choosing.cards.includes(id);
      choosing = { ...choosing, cards: has ? choosing.cards.filter((x) => x !== id) : [...choosing.cards, id] };
      return;
    }
    if (g.phase === 'trade' && tradeTargets.length) {
      if (!draft) draft = newDraft(tradeTargets);
      const has = draft.give.includes(id);
      draft = { ...draft, give: has ? draft.give.filter((x) => x !== id) : [...draft.give, id] };
      return;
    }
    if (front && id === front.id) {
      if (h?.frontIsMagpie) return act({ type: 'playMagpie' });
      if (h?.plantFront.length === 1) return act({ type: 'plant', field: h.plantFront[0] });
      if (h?.plantFront.length) pulseTargets();
    }
  }

  function pickFaceUp(id: string) {
    if (g.phase !== 'trade' || !tradeTargets.length) return;
    if (isActive) {
      if (!draft) draft = newDraft(tradeTargets);
      const has = draft.give.includes(id);
      draft = { ...draft, give: has ? draft.give.filter((x) => x !== id) : [...draft.give, id] };
    } else {
      if (!draft || draft.to !== g.active) draft = { to: g.active, give: [], wantCards: [], wantTypes: {}, replyTo: null };
      const has = draft.wantCards.includes(id);
      draft = { ...draft, wantCards: has ? draft.wantCards.filter((x) => x !== id) : [...draft.wantCards, id] };
    }
  }

  function pulseTargets() {
    const els = root?.querySelectorAll('.crate.target') ?? [];
    els[0]?.scrollIntoView({ block: 'nearest', behavior: settings.instant ? 'auto' : 'smooth' });
    els.forEach((el) => pulse(el));
  }

  // Hand: what is tappable and what is lifted.
  const handLegal = $derived.by(() => {
    const s = new Set<string>();
    if (!h) return s;
    if (choosing) {
      const o = g.offers.find((x) => x.id === choosing!.offer);
      if (o) for (const c of hand) if (o.wantTypes[c.t]) s.add(c.id);
      return s;
    }
    if (g.phase === 'trade' && tradeTargets.length) {
      for (const c of hand) s.add(c.id);
      return s;
    }
    if (front && (h.plantFront.length || h.frontIsMagpie)) s.add(front.id);
    return s;
  });
  const handSelected = $derived(new Set(choosing ? choosing.cards : (draft?.give ?? [])));
  const faceSelected = $derived(new Set(draft ? [...draft.give, ...draft.wantCards] : []));

  const helpHere = $derived(g.phase === 'plant' ? 'f-phase1' : g.phase === 'trade' ? 'f-trade' : g.phase === 'resolve' ? 'f-phase3' : 'f-end');
  const variantNote = $derived(
    [g.config.threeNewBeans && 'Three New Bean Types', g.config.fieldBean && 'The Field Bean', g.config.beanCoin && 'AMIGO Bean Coin', g.config.magpie && 'Magpie Bean'].filter(Boolean).join(', ').replace(/^(.+)$/, 'Variants at this table: $1.'),
  );

  // ── phase guidance: only the next decision ─────────────────────────
  const step = $derived.by((): { text: string; mine: boolean } => {
    if (over) return { text: 'The game is over.', mine: false };
    const A = name(g.active);
    if (g.modal === 'magpie')
      return isActive
        ? { text: stealPick ? 'Choose a field for the stolen bean.' : 'Magpie! Tap a bean on top of another player’s field to steal it.', mine: true }
        : { text: `${A} is stealing with a Magpie.`, mine: false };
    if (g.modal === 'coinClaim')
      return g.coin?.owner === me
        ? { text: `${A} claims your Bean Coin. Hand it over or resist.`, mine: true }
        : { text: `${A} claims the Bean Coin. ${name(g.coin!.owner)} decides.`, mine: false };
    if (g.modal === 'coinPlant')
      return isActive ? { text: 'Plant the revealed bean.', mine: true } : { text: `${A} plants the revealed bean.`, mine: false };
    if (g.phase === 'plant') {
      if (!isActive) return { text: `${A} is planting.`, mine: false };
      if (h?.frontIsMagpie) return { text: 'Your front card is a Magpie. Play it to steal.', mine: true };
      if (g.planted === 0 && hand.length)
        return h?.plantFront.length
          ? { text: 'Plant your front bean.', mine: true }
          : { text: 'Your front bean fits no field. Harvest a field to make room.', mine: true };
      if (h?.plantFront.length) return { text: 'Plant your next bean too, or turn over two cards.', mine: true };
      return { text: 'Turn over two cards to start trading.', mine: true };
    }
    if (g.phase === 'trade')
      return isActive
        ? { text: 'Trade the turned-over cards and your beans. End trading when you’re done.', mine: true }
        : { text: `Trade with ${A}: offer beans from your hand.`, mine: true };
    if (mine.pending.length) return { text: 'Plant the beans you kept and received.', mine: true };
    const waiting = g.players.map((p, i) => (p.pending.length ? i : -1)).filter((i) => i >= 0);
    if (waiting.length) return { text: `Waiting for ${waiting.map(name).join(', ')} to plant.`, mine: false };
    return isActive ? { text: 'Draw to end your turn.', mine: true } : { text: `${A} is ending their turn.`, mine: false };
  });

  const primary = $derived.by((): { label: string; a: BAction } | null => {
    if (!h) return null;
    if (g.modal === 'magpie' && isActive) return { label: 'Stop stealing', a: { type: 'endSteal' } };
    if (h.frontIsMagpie && g.planted === 0) return { label: 'Play Magpie', a: { type: 'playMagpie' } };
    if (h.canFlip) return { label: 'Turn over 2 cards', a: { type: 'flip' } };
    if (h.canEndTrading) return { label: 'End trading', a: { type: 'endTrading' } };
    if (h.canEndTurn)
      return { label: g.drawMode === 'each' ? 'End turn · all draw 1' : `Draw ${h.drawCount} · end turn`, a: { type: 'endTurn' } };
    return null;
  });
  const secondary = $derived.by(() => {
    const out: { label: string; a: BAction }[] = [];
    if (h?.frontIsMagpie && g.planted > 0) out.push({ label: 'Play Magpie', a: { type: 'playMagpie' } });
    if (h?.canClaimCoin) out.push({ label: 'Claim Bean Coin', a: { type: 'claimCoin' } });
    return out;
  });

  const fmt = (text: string) => text.replace(/@(\d+)/g, (_, s) => name(Number(s)));
  const lastLog = $derived(g.log.length ? fmt(g.log[g.log.length - 1].text) : '');

  // ── motion & sound: driven only by confirmed views ──────────────────
  let before: Snapshot | null = null;
  onMount(() =>
    conn.onRoom((next, prev) => {
    finishAll();
    if (!prev || prev.version === next.version || !root) return;
    before = snapshot(document);
    const ng = next.game as BView | null;
    const pg = prev.game as BView | null;
    if (ng && pg && ng.seq !== pg.seq) sounds(ng, pg);
    }),
  );
  onDestroy(finishAll);

  function sounds(n: BView, p: BView) {
    const kinds = new Set(n.fx.map((f) => f.k));
    if (kinds.has('gameOver')) return sfx.end();
    if (n.active !== p.active && n.active === n.you) sfx.yourTurn();
    else if (kinds.has('turn')) sfx.turn();
    if (kinds.has('harvest') || kinds.has('coinMove')) sfx.coin();
    if (kinds.has('trade')) sfx.trade();
    else if (kinds.has('offer')) sfx.offer();
    else if (kinds.has('reject')) sfx.reject();
    if (kinds.has('flip')) sfx.flip();
    if (kinds.has('plant') || kinds.has('steal')) sfx.plant();
    if (kinds.has('draw')) sfx.card();
    for (const f of n.fx) if (f.k === 'draw' && f.seat !== n.you) pulse(document.querySelector(`[data-anchor="seat-${f.seat}"]`), 'settle');
  }

  function originOf(id: string): string | null {
    if (hand.some((c) => c.id === id) || g.faceUp.some((c) => c.id === id)) return 'deck';
    for (let s = 0; s < g.n; s++) {
      const p = g.players[s];
      if (p.pending.some((c) => c.id === id) || p.fields.some((f) => f.some((c) => c.id === id)))
        return s === me ? 'hand' : `seat-${s}`;
    }
    return null;
  }

  $effect(() => {
    void room.version;
    const b = before;
    if (!b) return;
    before = null;
    tick().then(() => play(b, { originOf, exitOf: () => 'discard' }));
  });

  // ── inspection: right-click, long-press, or tap a non-interactive card ──
  let press: { t: number; x: number; y: number } | null = null;
  function beanAt(target: EventTarget | null): Bean | null {
    const el = (target as HTMLElement | null)?.closest?.('[data-bean]') as HTMLElement | null;
    return (el?.dataset.bean as Bean) || null;
  }
  function onContext(e: MouseEvent) {
    const b = beanAt(e.target);
    if (b) {
      e.preventDefault();
      inspect = b;
    }
  }
  function onPress(e: PointerEvent) {
    if (e.pointerType !== 'touch' || !beanAt(e.target)) return;
    const target = e.target;
    const x = e.clientX;
    const y = e.clientY;
    const t = window.setTimeout(() => {
      if (press) inspect = beanAt(target);
      press = null;
    }, 520);
    press = { t, x, y };
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
  function onClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, [role="dialog"]')) return;
    const b = beanAt(t);
    if (b) inspect = b;
  }

  $effect(() => {
    document.title = `${isActive && !over ? '● ' : ''}Bohnanza · ${room.code}`;
  });

  const exhaustText = $derived(
    `Deck pass ${Math.min(g.exhaustions + 1, g.exhaustLimit)} of ${g.exhaustLimit}`,
  );
  const compact = $derived(settings.layout === 'compact');
  const incoming = $derived(g.offers.filter((o) => o.status === 'open' && o.to === me).length);
  $effect(() => {
    // A new offer for me, or my own draft, reopens the sheet.
    if (incoming || draft || choosing) dockOpen = true;
  });
  const trading = $derived(g.phase === 'trade');
  $effect(() => {
    // On a phone the sheet opens with trading and closes after it, so it never covers the fields you plant into.
    if (!compact) return;
    const open = trading;
    untrack(() => {
      dockOpen = open;
      if (!open && mine.pending.length)
        tick().then(() => root?.querySelector('.mine')?.scrollIntoView({ block: 'center', behavior: settings.instant ? 'auto' : 'smooth' }));
    });
  });
  // Spatial keeps the dock in place so the table never re-fits between turns.
  const showTrade = $derived(!over && (!compact || g.phase === 'trade' || g.offers.length > 0));
  $effect(() => {
    // On a phone, bring your own fields into view when your turn starts.
    if (compact && isActive && g.phase === 'plant' && g.planted === 0)
      tick().then(() => root?.querySelector('.mine')?.scrollIntoView({ block: 'nearest', behavior: settings.instant ? 'auto' : 'smooth' }));
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="table"
  class:compact
  class:trading={showTrade}
  bind:this={root}
  oncontextmenu={onContext}
  onpointerdown={onPress}
  onpointermove={onMove}
  onpointerup={onUp}
  onpointercancel={onUp}
  onclick={onClick}
>
  <header class="bar">
    <div class="who">
      <span class="code label" title="Table code">{room.code}</span>
      <span class="turn" class:you={isActive}>
        {#if over}Game over{:else if isActive}Your turn{:else}{name(g.active)}’s turn{/if}
      </span>
    </div>
    <div class="stepline"><p class="step" class:mine={step.mine} aria-live="polite">{step.text}</p><button type="button" class="ctx" aria-label="Explain this step" onclick={() => help(helpHere)}>?</button></div>
    <div class="tools">
      <button class="btn icon ghost" aria-label="Table log" onclick={() => (logOpen = !logOpen)}><Icon name="log" /></button>
      <SettingsMenu onhelp={() => help(null)} onquit={room.status === 'playing' ? () => (quitting = true) : undefined} />
    </div>
  </header>

  <div class="stage">
    <Camera enabled={!compact}>
      <div class="opps" style="--n:{others.length}">
        {#each others as s (s)}
          <Seat
            p={g.players[s]}
            seat={s}
            name={name(s)}
            connected={seatInfo(s)?.connected ?? false}
            bot={seatInfo(s)?.bot ?? false}
            standIn={seatInfo(s)?.standIn}
            away={!!seatInfo(s)?.graceUntil}
            active={g.active === s}
            coinHolder={g.coin?.owner === s}
            acting={room.actors.includes(s)}
            stealFields={mode === 'steal' && h?.stealVictims.includes(s)
              ? g.players[s].fields.map((f, i) => (f.length && (h?.stealTargets[f[f.length - 1].t]?.length ?? 0) ? i : -1)).filter((i) => i >= 0)
              : []}
            onsteal={(f) => steal(s, f)}
          />
        {/each}
      </div>

      <div class="market">
        <div class="pile" data-anchor="deck" aria-label="Draw pile: {g.deckCount} cards">
          {#if g.deckCount}
            <div class="deck" style="--d:{Math.min(8, Math.ceil(g.deckCount / 12))}"><Card size="md" /></div>
          {:else}
            <div class="slot-empty"></div>
          {/if}
          <span class="pl"><b class="num">{g.deckCount}</b> in deck</span>
          <span class="pass">{exhaustText}</span>
        </div>

        <div class="faceup" aria-label="Turned-over cards">
          {#each g.faceUp as c (c.id)}
            {@const pickable = g.phase === 'trade' && tradeTargets.length > 0}
            <Card
              id={c.id}
              bean={c.t}
              size="md"
              legal={pickable && !faceSelected.has(c.id)}
              selected={faceSelected.has(c.id)}
              onclick={pickable ? () => pickFaceUp(c.id) : undefined}
            />
          {/each}
          {#if g.coin?.mustPlant}
            <div class="revealed">
              <Card id={g.coin.mustPlant.id} bean={g.coin.mustPlant.t} size="md" tag="DRAWN" />
            </div>
          {/if}
          {#if !g.faceUp.length && !g.coin?.mustPlant}
            <span class="fu-empty">{g.phase === 'plant' ? 'Two cards are turned over here in step 2.' : ''}</span>
          {/if}
        </div>

        <div class="pile" data-anchor="discard" aria-label="Discard pile: {g.discardCount} cards">
          {#if g.discardTop}
            <Card id={g.discardTop.id} bean={g.discardTop.t} size="md" />
          {:else}
            <div class="slot-empty"></div>
          {/if}
          <span class="pl"><b class="num">{g.discardCount}</b> discarded</span>
        </div>
      </div>

      <section class="mine" aria-label="Your fields">
        <div class="mine-head">
          <span class="me-name">{name(me)}{#if g.coin?.owner === me}<span class="beancoin">Bean Coin</span>{/if}</span>
          <Coins count={mine.coins} ids={mine.coinIds} anchor="coins-{me}" big />
        </div>
        <div class="my-fields">
          {#each mine.fields as f, i (i)}
            <Field
              cards={f}
              index={i}
              big
              dropKey="mine-{i}"
              target={targets.includes(i)}
              harvestable={h?.harvestable.includes(i) ?? false}
              onplant={() => plantAt(i)}
              onharvest={() => act({ type: 'harvest', field: i })}
            />
          {/each}
        </div>
        {#if mine.pending.length}
          <div class="pending" aria-label="Beans you must plant">
            <span class="plab">To plant</span>
            {#each mine.pending as c (c.id)}
              <span onpointerdown={(e) => dragToField(e, e.currentTarget.firstElementChild as HTMLElement, () => (pendingPick = c.id))} role="presentation">
                <Card
                  id={c.id}
                  bean={c.t}
                  size="md"
                  selected={selPending === c.id && mine.pending.length > 1}
                  legal={selPending !== c.id || mine.pending.length === 1}
                  onclick={() => !consumeDragClick() && (pendingPick = c.id)}
                />
              </span>
            {/each}
          </div>
        {/if}
      </section>
    </Camera>
  </div>

  {#if showTrade}
    <aside class="dock" class:shut={compact && !dockOpen}>
      {#if compact}
        <button class="handle" aria-expanded={dockOpen} onclick={() => (dockOpen = !dockOpen)}>
          <span class="grip" aria-hidden="true"></span>
          {dockOpen ? 'Hide trading' : incoming ? `Trading · ${incoming} for you` : 'Show trading'}
        </button>
      {/if}
      {#if !compact || dockOpen}
        <TradePanel {g} {name} {act} bind:draft bind:choosing />
      {/if}
    </aside>
  {/if}

  <footer class="hud">
    <div class="hand-wrap">
      <Hand
        cards={hand}
        legal={handLegal}
        selected={handSelected}
        dim={handLegal.size > 0}
        outline={!(g.phase === 'trade' && !choosing)}
        onpick={pickHand}
        ondrag={mode === 'plant'
          ? (id, e, el) => {
              if (id === front?.id) dragToField(e, el);
            }
          : undefined}
      />
    </div>
    <div class="actions">
      {#if room.canUndo}
        <button class="btn ghost" onclick={() => conn.send({ t: 'undo' }).then((r) => !r.ok && toasts.push(r.error ?? 'Can’t undo now.', 'error'))}>
          <Icon name="undo" size={18} /> Undo
        </button>
      {/if}
      {#each secondary as s (s.label)}
        <button class="btn" disabled={conn.busy} onclick={() => act(s.a)}>{s.label}</button>
      {/each}
      {#if primary}
        <button class="btn primary go" disabled={conn.busy} onclick={() => act(primary!.a)}>
          {primary.label} <Icon name="arrowRight" />
        </button>
      {:else if over}
        <button class="btn primary go" onclick={() => (showSummary = true)}>Results</button>
      {/if}
    </div>
  </footer>

  {#if lastLog && !over}
    <p class="ticker" aria-hidden="true">{lastLog}</p>
  {/if}

  {#if logOpen}
    <aside class="log" aria-label="Table log">
      <header><b>Table log</b><button class="btn icon ghost" aria-label="Close log" onclick={() => (logOpen = false)}><Icon name="close" size={16} /></button></header>
      <ol>
        {#each [...g.log].reverse() as l (l.seq + l.text)}
          <li>{fmt(l.text)}</li>
        {/each}
      </ol>
    </aside>
  {/if}
</div>

{#if g.modal === 'coinClaim' && g.coin?.owner === me}
  <div class="scrim">
    <div class="ask" role="alertdialog" aria-labelledby="coin-h">
      <h2 id="coin-h">{name(g.active)} claims your Bean Coin</h2>
      <p>Hand it over, or resist: {name(g.active)} draws a random card from your hand and must plant it. If it’s a Blue Bean, you keep the coin.</p>
      <div class="ask-actions">
        <button class="btn" disabled={conn.busy} onclick={() => act({ type: 'coinRespond', resist: false })}>Hand it over</button>
        <button class="btn primary" disabled={conn.busy} onclick={() => act({ type: 'coinRespond', resist: true })}>Resist</button>
      </div>
    </div>
  </div>
{/if}

<Inspect bind:bean={inspect} />
<Guide bind:open={howto} doc={guide} at={helpAt} note={variantNote} />
<QuitGame {conn} {room} bind:open={quitting} />
{#if over && showSummary && g.result}
  <Summary {g} {room} {conn} {name} onclose={() => (showSummary = false)} />
{/if}

<style>
  .table {
    --dock-w: 360px;
    position: relative;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 0;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      'bar bar'
      'stage dock'
      'hud dock';
    background:
      radial-gradient(90% 70% at 50% 45%, #2a1f16 0%, transparent 70%),
      var(--ground-1);
    overflow: hidden;
  }
  .table.trading {
    grid-template-columns: 1fr var(--dock-w);
  }
  .bar {
    grid-area: bar;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: max(8px, env(safe-area-inset-top)) 12px 8px 16px;
    border-bottom: 1px solid var(--rim);
    background: rgb(15 11 8 / 0.6);
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
    align-items: flex-start;
    gap: 18px;
    flex-wrap: wrap;
  }
  .market {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 40px;
    margin: 26px 0 22px;
  }
  .pile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    min-width: 96px;
  }
  .deck {
    filter: drop-shadow(0 calc(var(--d) * 1px) 0 #24190f) drop-shadow(0 calc(var(--d) * 0.5px) 0 #3a2a1d);
  }
  .pl {
    font-size: 13px;
    color: var(--ink-3);
  }
  .pl b {
    color: var(--ink-2);
  }
  .pass {
    font-size: 12px;
    color: var(--ink-3);
  }
  .slot-empty {
    width: var(--card-w);
    height: var(--card-h);
    border-radius: 8px;
    border: 1.5px dashed var(--rim);
  }
  .faceup {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-width: 200px;
    min-height: calc(var(--card-h) + 12px);
    padding: 10px 18px;
    border-radius: 14px;
    background: rgb(0 0 0 / 0.18);
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .fu-empty {
    max-width: 22ch;
    text-align: center;
    font-size: 13px;
    color: var(--ink-3);
  }
  .revealed {
    margin-left: 8px;
  }
  .mine {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .mine-head {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .me-name {
    font-weight: 700;
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }
  .beancoin {
    font-size: 11px;
    font-weight: 700;
    color: var(--coin-ink);
    background: var(--coin);
    padding: 2px 7px;
    border-radius: 999px;
  }
  .my-fields {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .pending {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1.5px dashed var(--sprout);
  }
  .plab {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    margin-right: 4px;
  }
  .dock {
    grid-area: dock;
    min-height: 0;
    overflow-y: auto;
    padding: 16px;
    border-left: 1px solid var(--rim);
    background: rgb(15 11 8 / 0.55);
    z-index: 10;
  }
  .hud {
    grid-area: hud;
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 16px;
    padding: 0 16px max(12px, env(safe-area-inset-bottom));
    z-index: 15;
    pointer-events: none;
  }
  .hand-wrap {
    flex: 1;
    min-width: 0;
  }
  .actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding-bottom: 8px;
    pointer-events: auto;
    min-width: 0;
  }
  .go {
    min-height: 52px;
    padding: 0 22px;
    font-size: 16px;
    white-space: nowrap;
  }
  .ticker {
    position: absolute;
    left: 50%;
    top: 58px;
    transform: translateX(-50%);
    margin: 0;
    max-width: min(560px, 80%);
    padding: 4px 12px;
    border-radius: 999px;
    background: rgb(15 11 8 / 0.7);
    color: var(--ink-3);
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    z-index: 12;
  }
  .trading .ticker {
    left: calc((100% - var(--dock-w)) / 2);
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
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(8 5 3 / 0.6);
  }
  .ask {
    width: min(440px, 100%);
    padding: 22px;
    border-radius: var(--r-lg);
    border: 1px solid var(--coin);
    background: var(--ground-2);
    box-shadow: var(--shadow-lift);
  }
  .ask h2 {
    margin: 0 0 8px;
    font-size: 20px;
  }
  .ask p {
    margin: 0 0 18px;
    color: var(--ink-2);
  }
  .ask-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  :global(.drag-ghost) {
    box-shadow: var(--shadow-lift) !important;
  }
  :global(body.dragging) {
    cursor: grabbing;
  }

  /* Compact: a flat, scrolling column for phones and small windows. */
  .compact {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      'bar'
      'stage'
      'hud';
  }
  .compact.trading {
    grid-template-columns: 1fr;
  }
  .compact .stage {
    overflow-y: auto;
    padding: 12px 8px 24px;
  }
  .compact .dock {
    grid-area: stage;
    align-self: end;
    max-height: 55%;
    border-left: 0;
    border-top: 1px solid var(--rim-hi);
    background: var(--ground-1);
    box-shadow: 0 -16px 32px rgb(0 0 0 / 0.5);
    border-radius: 16px 16px 0 0;
  }
  .handle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin: -8px 0 8px;
    padding: 4px 0 6px;
    border: 0;
    background: none;
    color: var(--ink-2);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .grip {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--rim-hi);
  }
  .compact .dock.shut {
    padding-bottom: 4px;
  }
  .compact .opps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    justify-items: center;
    gap: 4px;
  }
  .compact .opps:not([style*='--n:1']) > :global(*) {
    zoom: 0.62;
  }
  .compact .market {
    gap: 12px;
    margin: 16px 0;
  }
  .compact .pile {
    min-width: 0;
  }
  .compact .faceup {
    min-width: 0;
    padding: 8px;
  }
  .compact .ticker {
    display: none;
  }
  .compact .hud {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 0 8px max(8px, env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--ground-1) 60%, transparent);
  }
  .compact .actions {
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: wrap;
    padding: 0;
  }
  .compact .go {
    flex: 1;
    min-height: 48px;
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
