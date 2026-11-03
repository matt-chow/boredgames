<script lang="ts">
  import Icon from '../../../hub/Icon.svelte';
  import { BEANS, type Bean } from '../rules/cards';
  import { setupSpec } from '../rules/config';
  import type { BAction } from '../rules/state';
  import type { BView, CardV, OfferV } from '../rules/view';
  import Card from './Card.svelte';
  import { canFill, countOf, forcedChoice, offerTargets, sameCounts, countTypes, type Choosing, type Draft } from './trade';

  let {
    g,
    name,
    act,
    draft = $bindable(),
    choosing = $bindable(),
  }: {
    g: BView;
    name: (seat: number) => string;
    act: (a: BAction) => Promise<boolean>;
    draft: Draft | null;
    choosing: Choosing | null;
  } = $props();

  const me = $derived(g.you ?? 0);
  const hand = $derived(g.players[me]?.hand ?? []);
  const targets = $derived(offerTargets(g));
  const beans = $derived(
    (Object.keys(setupSpec(g.config, g.n).composition) as Bean[]).sort((a, b) => BEANS[b].count - BEANS[a].count),
  );
  // Ids may be masked on others' offers, so every card the panel can name comes from this lookup.
  const known = $derived(new Map<string, CardV>([...hand, ...g.faceUp].map((c) => [c.id, c])));

  const open = $derived(g.offers.filter((o) => o.status === 'open'));
  const settled = $derived(
    g.offers
      .filter((o) => o.status !== 'open')
      .slice(-4)
      .reverse(),
  );
  const involving = (o: OfferV) => o.from === me || o.to === me;
  const sorted = $derived([...open].sort((a, b) => Number(involving(b)) - Number(involving(a)) || b.id - a.id));
  let busy = $state(false);

  async function run(a: BAction) {
    busy = true;
    const ok = await act(a);
    busy = false;
    return ok;
  }

  function startDraft(to: number, replyTo: number | null = null) {
    choosing = null;
    draft = { to, give: [], wantCards: [], wantTypes: {}, replyTo };
  }

  function pickRecipient(to: number) {
    if (!draft) return;
    // Only the active player owns the turned-over cards, so asking for them makes sense only towards them.
    draft = { ...draft, to, wantCards: to === g.active ? draft.wantCards : [] };
  }

  function counter(o: OfferV) {
    // Start from the mirror image of their offer: you give what they asked for.
    choosing = null;
    const wantCards = o.give.filter((c) => g.faceUp.some((f) => f.id === c.id)).map((c) => c.id);
    const wantTypes = countTypes(o.give.filter((c) => !wantCards.includes(c.id)));
    const give = forcedChoice(hand, o.wantTypes) ?? [];
    const giveFace = o.wantCards.map((c) => c.id).filter((id) => g.faceUp.some((f) => f.id === id));
    draft = { to: o.from, give: [...giveFace, ...give], wantCards, wantTypes, replyTo: o.id };
  }

  function bump(b: Bean, d: number) {
    if (!draft) return;
    const n = Math.max(0, Math.min(9, (draft.wantTypes[b] ?? 0) + d));
    const next = { ...draft.wantTypes, [b]: n };
    if (!n) delete next[b];
    draft = { ...draft, wantTypes: next };
  }

  const draftSize = $derived(draft ? draft.give.length + draft.wantCards.length + countOf(draft.wantTypes) : 0);
  const draftKind = $derived(
    !draft ? '' : !draft.give.length ? 'Ask for a gift' : !draft.wantCards.length && !countOf(draft.wantTypes) ? 'Donation' : 'Trade',
  );

  async function send() {
    if (!draft || draft.to === null) return;
    const d = draft;
    if (await run({ type: 'offer', to: draft.to, give: d.give, wantCards: d.wantCards, wantTypes: d.wantTypes, replyTo: d.replyTo }))
      draft = null;
  }

  async function accept(o: OfferV) {
    if (!countOf(o.wantTypes)) return run({ type: 'accept', offer: o.id, cards: [] });
    const forced = forcedChoice(hand, o.wantTypes);
    if (forced) return run({ type: 'accept', offer: o.id, cards: forced });
    draft = null;
    choosing = { offer: o.id, cards: [] };
  }

  const choosingOffer = $derived(choosing ? g.offers.find((o) => o.id === choosing!.offer && o.status === 'open') : null);
  const choiceReady = $derived(
    !!choosingOffer && !!choosing && sameCounts(countTypes(hand.filter((c) => choosing!.cards.includes(c.id))), choosingOffer.wantTypes),
  );
  $effect(() => {
    if (choosing && !choosingOffer) choosing = null;
  });

  async function confirmChoice() {
    if (!choosing) return;
    if (await run({ type: 'accept', offer: choosing.offer, cards: choosing.cards })) choosing = null;
  }

  const typeList = (c: Partial<Record<Bean, number>>) => Object.entries(c) as [Bean, number][];
  const statusText: Record<string, string> = {
    accepted: 'Accepted',
    rejected: 'Declined',
    cancelled: 'Withdrawn',
    countered: 'Countered',
    void: 'No longer possible',
  };
  const who = (s: number) => (s === me ? 'You' : name(s));
  const whom = (s: number) => (s === me ? 'you' : name(s));
</script>

<section class="trade" aria-labelledby="trade-h">
  <header class="head">
    <h2 id="trade-h">Trading</h2>
    {#if g.phase === 'trade' && !draft && !choosing && targets.length}
      <div class="new">
        {#each targets as t (t)}
          <button class="btn small" onclick={() => startDraft(t)}><Icon name="swap" size={16} /> Offer to {name(t)}</button>
        {/each}
      </div>
    {/if}
  </header>

  {#if g.phase === 'plant'}
    <p class="hint">Trading opens once {g.active === me ? 'you turn' : `${name(g.active)} turns`} over two cards.</p>
  {:else if g.phase === 'resolve'}
    <p class="hint">Trading is closed. Everyone plants the beans they kept and received.</p>
  {/if}

  {#if draft}
    <div class="slip draft" aria-label="New offer">
      <div class="slip-top">
        <span class="kind">
          {draft.replyTo ? 'Counteroffer' : draftKind || 'New offer'}{#if draft.to !== null}&nbsp;to <b>{name(draft.to)}</b>{/if}
        </span>
        <button class="btn icon ghost" aria-label="Discard draft" onclick={() => (draft = null)}><Icon name="close" size={16} /></button>
      </div>
      {#if !draft.replyTo && targets.length > 1}
        <div class="side">
          <span class="sl" id="recipient-l">To</span>
          <div class="recipients" role="group" aria-labelledby="recipient-l">
            {#each targets as t (t)}
              <button class="recipient" aria-pressed={draft.to === t} onclick={() => pickRecipient(t)}>{name(t)}</button>
            {/each}
          </div>
        </div>
      {/if}
      <div class="side">
        <span class="sl">You give</span>
        <div class="cards">
          {#each draft.give as id (id)}
            {@const c = known.get(id)}
            {#if c}<Card bean={c.t} size="sm" onclick={() => (draft = { ...draft!, give: draft!.give.filter((x) => x !== id) })} label="Remove {BEANS[c.t].name}" />{/if}
          {/each}
          {#if !draft.give.length}<span class="empty">Tap cards in your hand{g.active === me ? ' or the turned-over cards' : ''} — or leave empty to ask for a gift.</span>{/if}
        </div>
      </div>
      <div class="side">
        <span class="sl">You get</span>
        <div class="cards">
          {#each draft.wantCards as id (id)}
            {@const c = known.get(id)}
            {#if c}<Card bean={c.t} size="sm" onclick={() => (draft = { ...draft!, wantCards: draft!.wantCards.filter((x) => x !== id) })} label="Remove {BEANS[c.t].name}" />{/if}
          {/each}
          {#each typeList(draft.wantTypes) as [b, n] (b)}
            {#each Array(n) as _, i (i)}<Card bean={b} size="sm" />{/each}
          {/each}
          {#if !draft.wantCards.length && !countOf(draft.wantTypes)}<span class="empty">Nothing — a donation.</span>{/if}
        </div>
        {#if draft.to === g.active && g.faceUp.length}
          <span class="note">Tap a turned-over card on the table to ask for it.</span>
        {/if}
        <div class="types" role="group" aria-label="Ask for beans from {draft.to === null ? 'their' : `${name(draft.to)}’s`} hand">
          {#each beans as b (b)}
            {@const n = draft.wantTypes[b] ?? 0}
            <div class="type" class:on={n > 0}>
              <button class="tbtn" onclick={() => bump(b, 1)} aria-label="Ask for one more {BEANS[b].name}">
                <Card bean={b} size="xs" />
                {#if n}<span class="badge num">{n}</span>{/if}
              </button>
              {#if n}<button class="minus" onclick={() => bump(b, -1)} aria-label="Ask for one fewer {BEANS[b].name}"><Icon name="minus" size={12} /></button>{/if}
            </div>
          {/each}
        </div>
      </div>
      <div class="slip-actions">
        {#if draft.to === null}<span class="wait">Choose who gets this offer.</span>{/if}
        <button class="btn primary" disabled={!draftSize || draft.to === null || busy} onclick={send}>
          {draft.replyTo ? 'Send counteroffer' : `Send ${draftKind.toLowerCase() || 'offer'}`}
        </button>
      </div>
    </div>
  {/if}

  {#if choosing && choosingOffer}
    <div class="slip draft">
      <div class="slip-top">
        <span class="kind">Choose cards for {name(choosingOffer.from)}</span>
        <button class="btn icon ghost" aria-label="Cancel" onclick={() => (choosing = null)}><Icon name="close" size={16} /></button>
      </div>
      <p class="hint">
        Tap {typeList(choosingOffer.wantTypes)
          .map(([b, n]) => `${n} ${BEANS[b].name}${n > 1 ? 's' : ''}`)
          .join(' and ')} in your hand. Which copy you give decides which cards move up.
      </p>
      <div class="slip-actions">
        <button class="btn primary" disabled={!choiceReady || busy} onclick={confirmChoice}>Make the trade</button>
      </div>
    </div>
  {/if}

  <ol class="offers" aria-live="polite">
    {#each sorted as o (o.id)}
      {@const mineIn = o.to === me}
      {@const fillable = canFill(hand, o.wantTypes)}
      <li class="slip" class:incoming={mineIn} class:dim={!involving(o)}>
        <div class="slip-top">
          <span class="kind">
            <b>{who(o.from)}</b>
            {o.replyTo ? 'counter' : !o.give.length ? 'ask' : !o.wantCards.length && !countOf(o.wantTypes) ? 'donate' : 'offer'}{o.from === me ? '' : 's'}
            {o.give.length && !o.wantCards.length && !countOf(o.wantTypes) ? 'to' : '→'} <b>{whom(o.to)}</b>
          </span>
        </div>
        <div class="flow">
          <div class="cards">
            {#each o.give as c (c.id)}<Card bean={c.t} size="sm" />{/each}
            {#if !o.give.length}<span class="empty">nothing</span>{/if}
          </div>
          <Icon name="swap" size={18} />
          <div class="cards">
            {#each o.wantCards as c (c.id)}<Card bean={c.t} size="sm" />{/each}
            {#each typeList(o.wantTypes) as [b, n] (b)}
              {#each Array(n) as _, i (i)}<Card bean={b} size="sm" />{/each}
            {/each}
            {#if !o.wantCards.length && !countOf(o.wantTypes)}<span class="empty">nothing</span>{/if}
          </div>
        </div>
        {#if mineIn}
          <div class="slip-actions">
            <button class="btn primary small" disabled={busy || !fillable} onclick={() => accept(o)}>Accept</button>
            <button class="btn small" disabled={busy} onclick={() => counter(o)}>Counter</button>
            <button class="btn ghost small" disabled={busy} onclick={() => run({ type: 'reject', offer: o.id })}>Decline</button>
          </div>
          {#if !fillable}<p class="why">You don’t hold the beans they asked for.</p>{/if}
        {:else if o.from === me}
          <div class="slip-actions">
            <span class="wait">Waiting for {name(o.to)}</span>
            <button class="btn ghost small" disabled={busy} onclick={() => run({ type: 'cancel', offer: o.id })}>Withdraw</button>
          </div>
        {/if}
      </li>
    {/each}
    {#each settled as o (o.id)}
      <li class="slip settled" class:ok={o.status === 'accepted'}>
        <span class="kind"><b>{who(o.from)}</b> → <b>{whom(o.to)}</b></span>
        <span class="st">{statusText[o.status]}</span>
      </li>
    {/each}
  </ol>

  {#if g.phase === 'trade' && !open.length && !draft && !choosing}
    <p class="hint">
      {g.active === me
        ? 'No offers yet. Offer the turned-over cards or beans from your hand — or end trading.'
        : `Offer ${name(g.active)} beans from your hand, or ask for a turned-over card.`}
    </p>
  {/if}
</section>

<style>
  .trade {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-label);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .new {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .hint {
    margin: 0;
    color: var(--ink-2);
    font-size: 14px;
  }
  .offers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .slip {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    background: var(--ground-2);
    border: 1.5px dashed var(--rim-hi);
  }
  .slip.incoming {
    border-color: var(--sprout);
    background: color-mix(in srgb, var(--sprout) 5%, var(--ground-2));
  }
  .slip.draft {
    border-style: solid;
    border-color: var(--rim-hi);
    background: var(--ground-3);
  }
  .slip.dim {
    opacity: 0.72;
  }
  .slip.settled {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-style: solid;
    border-color: var(--rim);
    background: transparent;
    font-size: 13px;
    color: var(--ink-3);
  }
  .settled.ok .st {
    color: var(--ink);
  }
  .slip-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .kind {
    font-size: 14px;
    color: var(--ink-2);
  }
  .kind b {
    color: var(--ink);
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sl {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-3);
  }
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 30px;
    align-items: center;
  }
  .flow {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
    color: var(--ink-3);
  }
  .flow .cards:last-child {
    justify-content: flex-end;
  }
  .empty,
  .note {
    font-size: 13px;
    color: var(--ink-3);
  }
  .types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }
  .type {
    position: relative;
  }
  .tbtn {
    position: relative;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: 6px;
    opacity: 0.7;
    transition:
      opacity var(--dur-1) var(--ease-out),
      transform var(--dur-1) var(--ease-out);
  }
  .tbtn:hover,
  .type.on .tbtn {
    opacity: 1;
  }
  .tbtn:active {
    transform: scale(0.94);
  }
  .tbtn:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  .badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--sprout);
    color: var(--sprout-ink);
    font-size: 12px;
    font-weight: 800;
    display: grid;
    place-items: center;
  }
  .minus {
    position: absolute;
    bottom: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--rim-hi);
    background: var(--ground-1);
    color: var(--ink);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .recipients {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .recipient {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 18px;
    border: 1px solid var(--rim-hi);
    background: var(--ground-1);
    color: var(--ink-2);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform var(--dur-1) var(--ease-out);
  }
  .recipient:hover {
    color: var(--ink);
  }
  .recipient:active {
    transform: scale(0.96);
  }
  .recipient[aria-pressed='true'] {
    background: var(--sprout-dim);
    border-color: var(--sprout);
    color: var(--ink);
  }
  .recipient:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  .slip-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    justify-content: flex-end;
  }
  .wait {
    margin-right: auto;
    font-size: 13px;
    color: var(--ink-3);
    font-style: italic;
  }
  .why {
    margin: 0;
    font-size: 13px;
    color: var(--warn);
  }
</style>
