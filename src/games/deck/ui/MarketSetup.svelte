<script lang="ts">
  import { getContext } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { loadString, save } from '../../../client/lib/storage';
  import { toasts } from '../../../client/lib/toast.svelte';
  import { activeSets, decodeMarket, encodeMarket, selectable, selectableProjects, type CardDef, type DeckGame, type ProjectDef } from '../../../engine/deckbuilder';
  import Dialog from '../../../hub/Dialog.svelte';
  import Icon from '../../../hub/Icon.svelte';
  import { cardMatches, costOptions, nameMatches, NO_FILTER, typeOptions, typeWords } from './catalog';
  import ResText from './ResText.svelte';
  import { GAMES } from '../../registry';
  import type { GameUiProps } from '../../ui';

  /**
   * The lobby's market section. It only sends the host's choices: the server cleans them, reports what is wrong
   * through `room.configError`, and picks the random market when the game starts.
   */
  let { conn, room }: GameUiProps = $props();

  const rules = $derived((GAMES[room.gameId] as unknown as DeckGame).rules);
  const sets = $derived((room.config.sets as string[] | undefined) ?? []);
  const onSets = $derived(activeSets(rules, { sets }));
  const pool = $derived([...selectable(rules, [], onSets), ...selectable(rules).filter((c) => market.includes(c.key) && !selectable(rules, [], onSets).includes(c))].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)));
  const market = $derived((room.config.market as string[] | undefined) ?? []);
  const bans = $derived((room.config.bans as string[] | undefined) ?? []);
  const canEdit = $derived(room.canConfigure);
  const host = $derived(room.seats.find((s) => s.host));

  /** Stays on "choose" after the last pile is removed, until the host switches back. */
  let wantManual = $state(false);
  const manual = $derived(wantManual || market.length > 0);
  let codeInput = $state('');
  const need = $derived(rules.projectCount ?? 0);
  const projects = $derived((room.config.projects as string[] | undefined) ?? []);
  const projectPool = $derived(selectableProjects(rules, onSets));
  const code = $derived(market.length === rules.marketSize && (!projects.length || projects.length === need) ? encodeMarket(rules, market, projects) : '');
  const projectWord = $derived(rules.labels?.projects ?? 'Projects');

  const artOf = getContext<((key: string) => string | null) | undefined>('deck-art');
  const ART_KEY = 'catalogArt';
  let showArt = $state(!!artOf && loadString(ART_KEY) !== 'off');
  function setShowArt(on: boolean) {
    showArt = on;
    save(ART_KEY, on ? 'on' : 'off');
  }
  /** Art only exists for tiles that have come near the list's visible part, so a long catalog stays cheap. */
  const near = new SvelteSet<string>();
  function lazyArt(el: HTMLElement, key: string) {
    if (typeof IntersectionObserver === 'undefined') {
      near.add(key);
      return;
    }
    const io = new IntersectionObserver(
      (seen) => {
        if (seen.some((s) => s.isIntersecting)) {
          near.add(key);
          io.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return { destroy: () => io.disconnect() };
  }

  let filter = $state({ ...NO_FILTER });
  const filtering = $derived(!!(filter.q.trim() || filter.type || filter.cost || filter.set));
  const basics = $derived(rules.cards.filter((c) => c.basic && c.status === 'ready').sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)));
  const shownBasics = $derived(basics.filter((c) => cardMatches(c, filter)));
  const shownPool = $derived(pool.filter((c) => cardMatches(c, filter)));
  const shownProjects = $derived(projectPool.filter((p) => nameMatches(p.name, filter.q) && !filter.type && (!filter.cost || p.coins === Number(filter.cost)) && (!filter.set || p.set === filter.set)));
  const hiddenPicks = $derived(market.filter((k) => !shownPool.some((c) => c.key === k)).length + projects.filter((k) => !shownProjects.some((p) => p.key === k)).length);
  const setName = (key?: string) => rules.sets?.find((s) => s.key === key)?.name;
  const tokenText = (p: ProjectDef) => Object.entries(p.tokens).map(([t, n]) => `${n} ${rules.labels?.tokens[t] ?? t}`).join(', ');

  type Looked = { card: CardDef } | { project: ProjectDef };
  let looked = $state<Looked | null>(null);
  let lookOpen = $state(false);
  function look(what: Looked) {
    looked = what;
    lookOpen = true;
  }

  async function send(config: Record<string, unknown>) {
    const r = await conn.send({ t: 'config', config });
    if (!r.ok) toasts.push(r.error ?? 'That can’t be chosen.', 'error');
  }

  function setMode(toManual: boolean) {
    wantManual = toManual;
    if (!toManual && market.length) send({ market: [] });
  }

  function togglePile(key: string) {
    const on = market.includes(key);
    if (!on && market.length >= rules.marketSize) {
      toasts.push(`A market has ${rules.marketSize} piles. Remove one first.`, 'error');
      return;
    }
    // A chosen pile can't also be banned, so choosing one lifts its ban.
    send({ market: on ? market.filter((k) => k !== key) : [...market, key], bans: bans.filter((k) => k !== key) });
  }

  function toggleSet(key: string) {
    const now = onSets ?? [];
    const next = now.includes(key) ? now.filter((k) => k !== key) : [...now, key];
    if (!next.length) {
      toasts.push('Keep at least one set switched on.', 'error');
      return;
    }
    send({ sets: next });
  }

  function toggleProject(key: string) {
    const on = projects.includes(key);
    if (!on && projects.length >= need) {
      toasts.push(`A game has ${need} ${projectWord}. Remove one first.`, 'error');
      return;
    }
    send({ projects: on ? projects.filter((k) => k !== key) : [...projects, key] });
  }

  const edition = $derived((room.config.edition as string | undefined) ?? '');
  const chosen = $derived(room.editions?.find((e) => e.code === edition));

  const toggleBan = (key: string) => send({ bans: bans.includes(key) ? bans.filter((k) => k !== key) : [...bans, key] });

  function applyCode(e: SubmitEvent) {
    e.preventDefault();
    const d = decodeMarket(rules, codeInput);
    if ('error' in d) {
      toasts.push(d.error, 'error');
      return;
    }
    wantManual = true;
    codeInput = '';
    send({ market: d.keys, bans: bans.filter((k) => !d.keys.includes(k)), ...(d.projects ? { projects: d.projects } : {}) });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toasts.push('Market code copied.');
    } catch {
      toasts.push(`Market code: ${code}`);
    }
  }
</script>

<section class="setup" aria-labelledby="market-h">
  <h2 id="market-h" class="h">
    Market
    {#if manual}<span class="num muted">{market.length}/{rules.marketSize}</span>{/if}
  </h2>
  {#if !canEdit}
    <p class="note">{host?.name ?? 'The host'} chooses the market.</p>
  {/if}

  {#if room.editions?.length}
    <label class="edition">
      <span class="nm">Rules for this room (testing only)</span>
      <select data-edition value={edition} disabled={!canEdit || conn.busy} onchange={(e) => send({ edition: e.currentTarget.value || null })}>
        <option value="">Live rules</option>
        {#each room.editions as e (e.code)}<option value={e.code}>{e.name}</option>{/each}
      </select>
      <span class="ds">{chosen?.text ?? 'The rules everyone plays today.'}</span>
    </label>
  {/if}

  {#if rules.sets?.length}
    <ul class="sets" aria-label="Card sets">
      {#each rules.sets as s (s.key)}
        <li>
          <label class="set" class:on={onSets?.includes(s.key)}>
            <input type="checkbox" data-set={s.key} checked={onSets?.includes(s.key)} disabled={!canEdit || conn.busy} onchange={() => toggleSet(s.key)} />
            <span class="nm">{s.name}</span>
            <span class="ds">{s.text}</span>
          </label>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="modes" role="radiogroup" aria-label="How the market is chosen">
    <label class:on={!manual}>
      <input type="radio" name="market-mode" checked={!manual} disabled={!canEdit || conn.busy} onchange={() => setMode(false)} />
      Random
    </label>
    <label class:on={manual}>
      <input type="radio" name="market-mode" checked={manual} disabled={!canEdit || conn.busy} onchange={() => setMode(true)} />
      Choose piles
    </label>
  </div>

  <p class="note">
    {#if !manual}
      {rules.marketSize} piles are drawn when the game starts. Tap a pile to ban it from the draw.
      {#if bans.length}<span class="num">{bans.length}</span> banned.{/if}
    {:else if !market.length}
      Nothing chosen yet. Starting now uses a random market.
    {:else}
      Choose {rules.marketSize} piles for this game.
    {/if}
  </p>

  {#snippet artBox(key: string)}
    {#if showArt && artOf?.(key)}
      <span class="art" aria-hidden="true" use:lazyArt={key}>{#if near.has(key)}{@html artOf(key)}{/if}</span>
    {/if}
  {/snippet}

  <div class="tools">
    <input class="search" type="search" data-catalog-search aria-label="Search cards by name" placeholder="Search by name" bind:value={filter.q} autocomplete="off" spellcheck="false" />
    <select data-filter-type aria-label="Filter by type" bind:value={filter.type}>
      <option value="">Any type</option>
      {#each typeOptions([...basics, ...pool]) as t (t)}<option value={t}>{t}</option>{/each}
    </select>
    <select data-filter-cost aria-label="Filter by cost" bind:value={filter.cost}>
      <option value="">Any cost</option>
      {#each costOptions([...basics, ...pool]) as n (n)}<option value={String(n)}>Costs {n}</option>{/each}
    </select>
    {#if rules.sets?.length}
      <select data-filter-set aria-label="Filter by set" bind:value={filter.set}>
        <option value="">Any set</option>
        {#each rules.sets.filter((s) => onSets?.includes(s.key)) as s (s.key)}<option value={s.key}>{s.name}</option>{/each}
      </select>
    {/if}
    {#if filtering}<button type="button" class="btn small" data-filter-clear onclick={() => (filter = { ...NO_FILTER })}>Clear filters</button>{/if}
    {#if artOf}
      <label class="artswitch">
        <input type="checkbox" data-art-toggle checked={showArt} onchange={(e) => setShowArt(e.currentTarget.checked)} />
        Show card artwork
      </label>
    {/if}
  </div>
  <p class="note count" aria-live="polite" data-catalog-count>
    {shownPool.length} of {pool.length} market cards shown.
    {#if filtering && hiddenPicks}<span class="num">{hiddenPicks}</span> chosen {hiddenPicks === 1 ? 'is' : 'are'} hidden by these filters and still count.{/if}
  </p>

  {#if shownBasics.length}
    <h3 class="h sub">{rules.labels?.basics ?? 'Always available'}</h3>
    <p class="note">{rules.labels?.basicsNote ?? 'In every game. These can’t be chosen or banned.'}</p>
    <ul class="piles fixed" class:visual={showArt} data-treasury>
      {#each shownBasics as c (c.key)}
        <li class="slot">
          <button type="button" class="pile" data-basic={c.key} aria-label="Details of {c.name}" onclick={() => look({ card: c })}>
            {@render artBox(c.key)}
            <span class="cost num">{c.cost}</span>
            <span class="txt">
              <span class="nm">{c.name}</span>
              <span class="meta">{typeWords(c).join(' · ')}</span>
              <span class="ds"><ResText text={c.text} labels={rules.labels} /></span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
    <h3 class="h sub">{rules.labels?.market ?? 'Market'}</h3>
  {/if}

  {#if !shownPool.length}
    <p class="note empty">No market cards match these filters.</p>
  {/if}
  <ul class="piles" class:visual={showArt}>
    {#each shownPool as c (c.key)}
      {@const picked = market.includes(c.key)}
      {@const banned = !manual && bans.includes(c.key)}
      <li class="slot">
        <button
          type="button"
          class="pile"
          class:picked
          class:banned
          data-pile={c.key}
          aria-pressed={manual ? picked : banned}
          disabled={!canEdit || conn.busy}
          onclick={() => (manual ? togglePile(c.key) : toggleBan(c.key))}
        >
          {@render artBox(c.key)}
          <span class="cost num">{c.cost}</span>
          <span class="txt">
            <span class="nm">{c.name}{#if banned}<span class="tag"> · banned</span>{/if}{#if picked}<span class="mark"><Icon name="check" size={16} /></span>{/if}</span>
            <span class="meta">{[...typeWords(c), setName(c.set)].filter(Boolean).join(' · ')}</span>
            <span class="ds"><ResText text={c.text} labels={rules.labels} /></span>
          </span>
        </button>
        <button type="button" class="look" data-inspect={c.key} aria-label="Details of {c.name}" onclick={() => look({ card: c })}><Icon name="eye" size={15} /></button>
      </li>
    {/each}
  </ul>

  {#if need}
    <h3 class="h sub">
      {projectWord}
      <span class="num muted">{projects.length ? `${projects.length}/${need}` : `${need} at random`}</span>
    </h3>
    <p class="note">Leave these unchosen to draw {need} when the game starts, or choose exactly {need}.</p>
    {#if !shownProjects.length}<p class="note empty">No {projectWord} match these filters.</p>{/if}
    <ul class="piles works" class:visual={showArt}>
      {#each shownProjects as p (p.key)}
        {@const picked = projects.includes(p.key)}
        <li class="slot">
          <button type="button" class="pile" class:picked data-work={p.key} aria-pressed={picked} disabled={!canEdit || conn.busy} onclick={() => toggleProject(p.key)}>
            {@render artBox(p.key)}
            <span class="cost num">{p.coins}</span>
            <span class="txt">
              <span class="nm">{p.name} · <ResText text="{p.vp} {rules.labels?.points ?? 'points'}" labels={rules.labels} />{#if picked}<span class="mark"><Icon name="check" size={16} /></span>{/if}</span>
              {#if setName(p.set)}<span class="meta">{setName(p.set)}</span>{/if}
              <span class="ds"><ResText text="{tokenText(p)}. {p.text}" labels={rules.labels} /></span>
            </span>
          </button>
          <button type="button" class="look" data-inspect={p.key} aria-label="Details of {p.name}" onclick={() => look({ project: p })}><Icon name="eye" size={15} /></button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="codes">
    {#if code}
      <button type="button" class="btn small" onclick={copyCode}><Icon name="copy" size={16} /> Copy market code</button>
    {/if}
    {#if canEdit}
      <form onsubmit={applyCode}>
        <input class="code-in" aria-label="Market code" placeholder="Paste a market code" bind:value={codeInput} autocomplete="off" spellcheck="false" />
        <button type="submit" class="btn small" disabled={!codeInput.trim() || conn.busy}>Use code</button>
      </form>
    {/if}
  </div>
</section>

<Dialog bind:open={lookOpen} title={looked ? ('card' in looked ? looked.card.name : looked.project.name) : 'Details'}>
  {#if looked}
    {@const key = 'card' in looked ? looked.card.key : looked.project.key}
    <div class="detail" data-detail={key}>
      {#if artOf?.(key)}<span class="big" aria-hidden="true">{@html artOf(key)}</span>{/if}
      {#if 'card' in looked}
        {@const c = looked.card}
        <p class="meta">{[...typeWords(c), setName(c.set)].filter(Boolean).join(' · ')}</p>
        <p><b>Costs <span class="num">{c.cost}</span>.</b> <ResText text={c.text} labels={rules.labels} /></p>
        <p class="state">
          {#if c.basic}In every game.
          {:else if market.includes(c.key)}Chosen for this market.
          {:else if !manual && bans.includes(c.key)}Banned from the random draw.
          {:else}Not chosen.{/if}
        </p>
      {:else}
        {@const p = looked.project}
        {#if setName(p.set)}<p class="meta">{setName(p.set)}</p>{/if}
        <p><b><span class="num">{p.coins}</span> {p.coins === 1 ? 'Coin' : 'Coins'}{#if tokenText(p)}, {tokenText(p)}{/if}, for <span class="num">{p.vp}</span> <ResText text={rules.labels?.points ?? 'points'} labels={rules.labels} />.</b> <ResText text={p.text} labels={rules.labels} /></p>
        {#if chosen}<p class="state">{chosen.name}: the cost and {rules.labels?.points ?? 'points'} are divided into stages when the game starts.</p>{/if}
        <p class="state">{projects.includes(p.key) ? 'Chosen for this game.' : 'Not chosen.'}</p>
      {/if}
    </div>
  {/if}
</Dialog>

<style>
  .setup {
    grid-column: 2;
    min-width: 0;
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
  .sub {
    margin-top: 16px;
  }
  .works {
    max-height: 220px;
  }
  .edition {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  .edition select {
    min-height: 40px;
    padding: 0 8px;
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-sm);
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--ground-0);
  }
  .sets {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
  }
  .set {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 8px;
    align-items: center;
    padding: 8px 10px;
    border-radius: var(--r-sm);
    box-shadow: inset 0 0 0 1px var(--rim);
    cursor: pointer;
  }
  .set.on {
    box-shadow: inset 0 0 0 1.5px var(--sprout);
  }
  .set input {
    accent-color: var(--sprout);
  }
  .set .ds {
    grid-column: 2;
  }
  .note {
    margin: 0 0 10px;
    font-size: 14px;
    color: var(--ink-2);
  }
  .modes {
    display: inline-flex;
    margin-bottom: 10px;
    border-radius: var(--r-sm);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
    overflow: hidden;
  }
  .modes label {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
  }
  .modes label.on {
    color: var(--ink);
    background: var(--ground-3);
  }
  .modes input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  .modes label:has(input:focus-visible) {
    outline: 2px solid var(--sprout);
    outline-offset: -2px;
  }
  .piles {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 4px 12px;
    max-height: 340px;
    overflow-y: auto;
  }
  .pile {
    width: 100%;
    display: grid;
    grid-template-columns: 22px 1fr auto;
    gap: 8px;
    align-items: center;
    min-height: 48px;
    padding: 6px 8px;
    border: 0;
    border-radius: var(--r-sm);
    font: inherit;
    text-align: left;
    color: var(--ink);
    background: none;
    box-shadow: inset 0 -1px 0 var(--rim);
    cursor: pointer;
  }
  .pile:hover:not(:disabled) {
    background: var(--ground-2);
  }
  .pile:disabled {
    cursor: default;
  }
  .pile.picked {
    color: var(--ink);
    box-shadow: inset 0 0 0 1.5px var(--sprout);
  }
  .mark {
    display: inline-flex;
    margin-left: 6px;
    vertical-align: -3px;
    color: var(--sprout);
  }
  .slot {
    position: relative;
    min-width: 0;
  }
  .slot:has(.look) .pile {
    padding-right: 44px;
  }
  .look {
    position: absolute;
    top: 6px;
    right: 6px;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: var(--r-sm);
    color: var(--ink-2);
    background: var(--ground-1);
    box-shadow: inset 0 0 0 1px var(--rim);
    cursor: pointer;
  }
  .look:hover {
    color: var(--ink);
    background: var(--ground-3);
  }
  .look:focus-visible,
  .pile:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: -2px;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .tools select,
  .search {
    min-height: 40px;
    padding: 0 8px;
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-sm);
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--ground-0);
  }
  .search {
    flex: 1 1 160px;
    min-width: 0;
  }
  .tools select {
    flex: 0 1 auto;
    min-width: 0;
  }
  .artswitch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .artswitch input {
    accent-color: var(--sprout);
  }
  .count {
    font-size: 13px;
  }
  .empty {
    color: var(--ink-3);
  }
  .meta {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
  }
  .fixed {
    max-height: none;
    margin-bottom: 8px;
  }
  .art {
    display: block;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--ground-2);
  }
  .art :global(svg),
  .art :global(img),
  .big :global(svg),
  .big :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .piles.visual {
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
    max-height: 560px;
    padding: 2px;
  }
  .piles.visual.fixed {
    max-height: none;
  }
  .visual .pile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    height: 100%;
    padding: 0;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .visual .slot:has(.look) .pile {
    padding-right: 0;
  }
  .visual .pile .cost {
    position: absolute;
    top: 6px;
    left: 6px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
  }
  .visual .txt {
    padding: 8px 10px 10px;
  }
  .visual .pile.picked {
    box-shadow: inset 0 0 0 2px var(--sprout);
  }
  .visual .pile.picked .art {
    margin: 2px 2px 0;
  }
  .visual .pile.banned .art {
    opacity: 0.35;
  }
  .detail {
    display: grid;
    gap: 10px;
  }
  .detail p {
    margin: 0;
    font-size: 15px;
    line-height: 1.4;
  }
  .detail .meta {
    font-size: 13px;
  }
  .state {
    color: var(--ink-2);
  }
  .big {
    display: block;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--r-sm);
  }
  .pile.banned .nm,
  .pile.banned .ds {
    color: var(--ink-3);
  }
  .pile.banned .nm {
    text-decoration: line-through;
  }
  .tag {
    display: inline-block;
    text-decoration: none;
  }
  .cost {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
    color: var(--coin-ink);
    background: var(--coin);
  }
  .txt {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .nm {
    font-size: 14px;
    font-weight: 600;
  }
  .ds {
    font-size: 12.5px;
    line-height: 1.25;
    color: var(--ink-2);
  }
  .codes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
  .codes form {
    display: flex;
    flex: 1 1 240px;
    gap: 6px;
    min-width: 0;
  }
  .code-in {
    flex: 1;
    min-width: 0;
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-sm);
    font: inherit;
    font-size: 13px;
    color: var(--ink);
    background: var(--ground-0);
  }
  @media (max-width: 760px) {
    .setup {
      grid-column: auto;
    }
  }
  /* A phone has room for a thumbnail beside the text, not two thin columns. */
  @media (max-width: 520px) {
    .piles.visual {
      grid-template-columns: minmax(0, 1fr);
    }
    .visual .pile {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      align-items: start;
    }
    .visual .txt {
      padding: 6px 44px 8px 10px;
    }
  }
</style>
