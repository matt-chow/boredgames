<script lang="ts">
  import { toasts } from '../../../client/lib/toast.svelte';
  import { activeSets, decodeMarket, encodeMarket, selectable, selectableProjects, type DeckGame } from '../../../engine/deckbuilder';
  import Icon from '../../../hub/Icon.svelte';
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

  <ul class="piles">
    {#each pool as c (c.key)}
      {@const picked = market.includes(c.key)}
      {@const banned = !manual && bans.includes(c.key)}
      <li>
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
          <span class="cost num">{c.cost}</span>
          <span class="txt">
            <span class="nm">{c.name}{#if banned}<span class="tag"> · banned</span>{/if}</span>
            <span class="ds"><ResText text={c.text} labels={rules.labels} /></span>
          </span>
          {#if picked}<Icon name="check" size={16} />{/if}
        </button>
      </li>
    {/each}
  </ul>

  {#if need}
    <h3 class="h sub">
      {projectWord}
      <span class="num muted">{projects.length ? `${projects.length}/${need}` : `${need} at random`}</span>
    </h3>
    <p class="note">Leave these unchosen to draw {need} when the game starts, or choose exactly {need}.</p>
    <ul class="piles works">
      {#each projectPool as p (p.key)}
        {@const picked = projects.includes(p.key)}
        <li>
          <button type="button" class="pile" class:picked data-work={p.key} aria-pressed={picked} disabled={!canEdit || conn.busy} onclick={() => toggleProject(p.key)}>
            <span class="cost num">{p.coins}</span>
            <span class="txt">
              <span class="nm">{p.name} · <ResText text="{p.vp} {rules.labels?.points ?? 'points'}" labels={rules.labels} /></span>
              <span class="ds"><ResText text="{Object.entries(p.tokens).map(([t, n]) => `${n} ${rules.labels?.tokens[t] ?? t}`).join(', ')}. {p.text}" labels={rules.labels} /></span>
            </span>
            {#if picked}<Icon name="check" size={16} />{/if}
          </button>
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
  .pile :global(svg) {
    color: var(--sprout);
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
</style>
