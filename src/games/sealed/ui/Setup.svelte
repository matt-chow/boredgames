<script lang="ts">
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { GameUiProps } from '../../ui';
  import { DEFAULT_TARGET, RULESET_NAMES, RULESET_PLAYERS, deckKinds, type Ruleset } from '../rules/cards';
  import { TARGET_MAX, TIMER_CHOICES, type SConfig } from '../rules/types';
  import Card from './Card.svelte';

  let { conn, room }: GameUiProps = $props();

  const c = $derived(room.config as unknown as SConfig);
  const n = $derived(room.seats.length);
  const can = $derived(room.canConfigure && !conn.busy);
  const RULESETS: { id: Ruleset; art: 'heir' | 'archivist'; text: string }[] = [
    { id: 'classic', art: 'heir', text: 'The original court of eight characters. Short, sharp rounds.' },
    { id: 'expanded', art: 'archivist', text: 'Adds the Archivist and the Informant and one more Censor, for larger tables.' },
  ];
  const fits = (r: Ruleset) => n >= RULESET_PLAYERS[r][0] && n <= RULESET_PLAYERS[r][1];
  // SC-SET6: a fifth player in a Classic lobby is told, never switched silently.
  const needsSwitch = $derived(c.ruleset === 'classic' && n > RULESET_PLAYERS.classic[1]);

  async function send(config: Partial<SConfig>) {
    const r = await conn.send({ t: 'config', config });
    if (!r.ok) toasts.push(r.error ?? 'That can’t be chosen.', 'error');
  }
</script>

<section class="setup" aria-labelledby="sc-setup-h">
  <h2 id="sc-setup-h" class="label">Ruleset</h2>
  {#if !room.canConfigure}<p class="muted">{room.seats.find((s) => s.host)?.name ?? 'The host'} chooses the settings. They are fixed once the game starts.</p>{/if}
  {#if needsSwitch}
    <div class="switch" role="alert">
      <p>Classic is for 2 to 4 players and there are {n} here.{room.canConfigure ? ' Switch to Expanded to start, or wait for someone to leave.' : ' The host can switch to Expanded.'}</p>
      {#if room.canConfigure}<button class="btn primary small" disabled={!can} onclick={() => send({ ruleset: 'expanded' })}>Switch to Expanded</button>{/if}
    </div>
  {/if}
  <div class="modes" role="radiogroup" aria-label="Ruleset">
    {#each RULESETS as m (m.id)}
      <button role="radio" class="mode" class:on={c.ruleset === m.id} class:off={!fits(m.id)} aria-checked={c.ruleset === m.id} disabled={!can} onclick={() => send({ ruleset: m.id })}>
        <Card kind={m.art} />
        <span class="mtext">
          <span class="mname">{RULESET_NAMES[m.id]}</span>
          <span class="mplayers">{deckKinds(m.id).length} cards · {RULESET_PLAYERS[m.id][0]}–{RULESET_PLAYERS[m.id][1]} players{fits(m.id) ? '' : ` · not for ${n}`}</span>
          <span class="mdesc">{m.text}</span>
        </span>
      </button>
    {/each}
  </div>

  <div class="opts">
    <label>Favors to win
      <select value={c.target} disabled={!can} onchange={(e) => send({ target: Number(e.currentTarget.value) })}>
        <option value={0}>Recommended{DEFAULT_TARGET[n] ? ` (${DEFAULT_TARGET[n]})` : ''}</option>
        {#each { length: TARGET_MAX } as _, i (i)}<option value={i + 1}>{i + 1}</option>{/each}
      </select>
    </label>
    <label>Turn timer
      <select value={c.timer} disabled={!can} onchange={(e) => send({ timer: Number(e.currentTarget.value) })}>
        {#each TIMER_CHOICES as v (v)}<option value={v}>{v ? `${v} seconds` : 'Off'}</option>{/each}
      </select>
    </label>
  </div>
  <p class="muted">The timer only shows when a turn runs long; it never plays for anyone. There are no computer players: if someone drops out, the table waits for them.</p>
</section>

<style>
  .setup h2 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  .muted {
    margin: 4px 0 8px;
    color: var(--ink-3);
    font-size: 14px;
  }
  .switch {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin: 0 0 10px;
    padding: 10px 12px;
    border: 1px solid var(--sc-wine-hi);
    border-radius: var(--r-md);
    background: rgb(124 34 51 / 0.22);
  }
  .switch p {
    flex: 1 1 240px;
    margin: 0;
  }
  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 8px;
  }
  .mode {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    text-align: left;
    padding: 10px;
    font: inherit;
    color: var(--ink);
    background: var(--ground-2);
    border: 2px solid var(--rim);
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .mode.on {
    border-color: var(--sprout);
    background: var(--sprout-dim);
  }
  .mode.off {
    opacity: 0.6;
  }
  .mode:disabled {
    cursor: default;
  }
  .mtext {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .mname {
    font-weight: 700;
  }
  .mplayers {
    font-size: 13px;
    color: var(--ink-3);
  }
  .mdesc {
    font-size: 13px;
    color: var(--ink-2);
  }
  .opts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
    margin-top: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
  }
  select {
    font: inherit;
    font-weight: 400;
    min-height: 40px;
    padding: 4px 8px;
    color: var(--ink);
    background: var(--ground-0);
    border: 1px solid var(--rim);
    border-radius: var(--r-sm, 4px);
  }
</style>
