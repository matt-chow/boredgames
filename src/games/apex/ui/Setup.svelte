<script lang="ts">
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { GameUiProps } from '../../ui';
  import { CIRCUITS } from '../rules/content/circuits';
  import { MAX_CARS, SEASON_LENGTHS, TIMERS, type AConfig } from '../rules/engine';
  import { paint } from './assets';
  import { MODE_NAMES } from './text';

  let { conn, room }: GameUiProps = $props();

  const c = $derived(room.config as unknown as AConfig);
  const n = $derived(room.seats.length);
  const can = $derived(room.canConfigure && !conn.busy);
  const circuit = $derived(CIRCUITS.find((x) => x.id === c.circuit)!);
  const school = $derived(c.mode === 'school');
  const custom = $derived(c.mode === 'championship' && c.length === 0);

  async function send(config: Partial<AConfig>) {
    const r = await conn.send({ t: 'config', config });
    if (!r.ok) toasts.push(r.error ?? 'That can’t be chosen.', 'error');
  }
  const MODE_TEXT: Record<AConfig['mode'], string> = {
    quick: 'One race. Computer cars fill the grid.',
    solo: 'One driver against the computer cars.',
    championship: 'A season of races with points, upgrade drafts, sponsors and press.',
    school: 'One short lesson race at Ashford with a coach. No modules.',
  };
  function addRace(id: string) {
    if (id) send({ races: [...c.races, id].slice(0, 12) });
  }
</script>

<!-- Race settings come first and span the lobby: the mode and circuit are the choices people make most. -->
<section class="setup" aria-labelledby="ax-setup-h">
  <h2 id="ax-setup-h" class="label">Race settings</h2>
  {#if !room.canConfigure}<p class="muted">{room.seats.find((s) => s.host)?.name ?? 'The host'} chooses the settings. They are fixed once the race starts.</p>{/if}

  <fieldset class="modes">
    <legend>Mode</legend>
    {#each Object.entries(MODE_NAMES) as [id, name] (id)}
      {@const off = (id === 'solo' || id === 'school') && n > 1}
      <label class="tile" class:on={c.mode === id} class:off>
        <input type="radio" name="ax-mode" value={id} checked={c.mode === id} disabled={!can || off} onchange={() => send({ mode: id as AConfig['mode'] })} />
        <b>{name}</b>
        <span>{off ? 'One player only.' : MODE_TEXT[id as AConfig['mode']]}</span>
      </label>
    {/each}
  </fieldset>

  {#if !school && (c.mode !== 'championship' || custom)}
    <fieldset class="circuits">
      <legend>{custom ? `Custom calendar: tap a circuit to add it (${c.races.length} of 12)` : 'Circuit'}</legend>
      {#each CIRCUITS as x (x.id)}
        {@const art = paint(`poster.${x.id}`)}
        {#if custom}
          <button class="tile circ" disabled={!can || c.races.length >= 12} onclick={() => addRace(x.id)}>
            {#if art}<img src={art} alt="" loading="lazy" decoding="async" />{/if}
            <b>{x.name}</b><span>{x.level} · {x.corners.length} corners · {x.laps} laps</span>
          </button>
        {:else}
          <label class="tile circ" class:on={c.circuit === x.id}>
            <input type="radio" name="ax-circuit" value={x.id} checked={c.circuit === x.id} disabled={!can} onchange={() => send({ circuit: x.id })} />
            {#if art}<img src={art} alt="" loading="lazy" decoding="async" />{/if}
            <b>{x.name}</b><span>{x.level} · {x.corners.length} corners · {x.laps} laps</span>
          </label>
        {/if}
      {/each}
    </fieldset>
    {#if !custom}<p class="muted blurb"><b>{circuit.name}.</b> {circuit.blurb}</p>{/if}
  {/if}

  {#if custom}
    <ol class="calendar">
      {#each c.races as r, i (i)}
        <li>{i + 1}. {CIRCUITS.find((x) => x.id === r)?.name}<button class="btn small ghost" disabled={!can} aria-label="Remove race {i + 1}" onclick={() => send({ races: c.races.filter((_, k) => k !== i) })}>Remove</button></li>
      {:else}
        <li class="muted">No races yet.</li>
      {/each}
    </ol>
  {/if}

  {#if !school}
    <div class="opts">
      {#if c.mode === 'championship'}
        <label>Season
          <select value={c.length} disabled={!can} onchange={(e) => send({ length: Number(e.currentTarget.value) })}>
            {#each SEASON_LENGTHS as l (l)}<option value={l}>{l} races</option>{/each}
            <option value={0}>Custom</option>
          </select>
        </label>
      {/if}
      <label>Laps
        <select value={c.laps ?? ''} disabled={!can} onchange={(e) => send({ laps: e.currentTarget.value ? Number(e.currentTarget.value) : null })}>
          <option value="">Circuit default{c.mode === 'championship' ? 's' : ` (${circuit.laps})`}</option>
          {#each [1, 2, 3, 4, 5] as l (l)}<option value={l}>{l}</option>{/each}
        </select>
      </label>
      <label>Cars on the grid
        <select value={c.cars} disabled={!can} onchange={(e) => send({ cars: Number(e.currentTarget.value) })}>
          {#each Array.from({ length: MAX_CARS }, (_, i) => i + 1) as k (k)}<option value={k} disabled={k < n || (c.mode === 'solo' && k < 2)}>{k}{k > n ? ` (${k - n} computer)` : ''}</option>{/each}
        </select>
      </label>
      <label>Computer drivers
        <select value={c.aiLevel} disabled={!can} onchange={(e) => send({ aiLevel: e.currentTarget.value as AConfig['aiLevel'] })}>
          <option value="novice">Novice: plays its highest cards</option>
          <option value="club">Club: weighs every set of cards</option>
          <option value="works">Works: also weighs boosting</option>
        </select>
      </label>
      <label>Computer risk
        <select value={c.aiRisk} disabled={!can} onchange={(e) => send({ aiRisk: e.currentTarget.value as AConfig['aiRisk'] })}>
          <option value="cautious">Cautious</option>
          <option value="balanced">Balanced</option>
          <option value="bold">Bold</option>
        </select>
      </label>
      <label>Planning timer
        <select value={c.timer} disabled={!can} onchange={(e) => send({ timer: Number(e.currentTarget.value) })}>
          {#each TIMERS as t (t)}<option value={t}>{t ? `${t} seconds` : 'Off (recommended)'}</option>{/each}
        </select>
      </label>
    </div>
  {/if}
  <p class="muted">
    {#if school}Driving School fixes everything else: two careful computer cars, one lap, no modules or timer.{:else}The modules, upgrade pools and paddock switches under Variants are all on by default. Every circuit plays with any of them off. Weather is drawn before the race and never changes during it.{/if}
  </p>
</section>

<style>
  .setup {
    /* A child of the lobby's column grid: take the whole first row. */
    grid-column: 1 / -1;
    order: -1;
    display: grid;
    gap: 12px;
  }
  .setup h2 {
    margin: 0;
    font-size: 22px;
  }
  .muted {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  fieldset {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0 0 6px;
    font-size: 14px;
    font-weight: 600;
  }
  .modes {
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }
  .circuits {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    font: inherit;
    font-size: 13px;
    text-align: left;
    color: var(--ink-3);
    background: var(--ground-1);
    border: 1px solid var(--rim);
    border-radius: var(--r-md, 8px);
    cursor: pointer;
  }
  .tile b {
    font-size: 15px;
    color: var(--ink);
  }
  .tile input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  .tile:has(input:focus-visible),
  button.tile:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  .tile.on {
    border-color: var(--sprout);
    box-shadow: 0 0 0 1px var(--sprout) inset;
    background: color-mix(in srgb, var(--sprout) 10%, var(--ground-1));
  }
  .tile.off,
  .tile:has(input:disabled):not(.on),
  button.tile:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .circ {
    padding: 0 0 8px;
    overflow: hidden;
  }
  .circ img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    margin-bottom: 4px;
  }
  .circ b,
  .circ span {
    padding: 0 10px;
  }
  .calendar {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    max-width: 420px;
  }
  .calendar li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .opts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px 12px;
  }
  .opts label {
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
    border-radius: var(--r-sm, 6px);
  }
</style>
