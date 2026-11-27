<script lang="ts">
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { GameUiProps } from '../../ui';
  import { CIRCUITS } from '../rules/content/circuits';
  import { MAX_CARS, SEASON_LENGTHS, TIMERS, type AConfig } from '../rules/engine';
  import { MODE_NAMES } from './text';

  let { conn, room }: GameUiProps = $props();

  const c = $derived(room.config as unknown as AConfig);
  const n = $derived(room.seats.length);
  const can = $derived(room.canConfigure && !conn.busy);
  const circuit = $derived(CIRCUITS.find((x) => x.id === c.circuit)!);
  const school = $derived(c.mode === 'school');

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

<section class="setup" aria-labelledby="ax-setup-h">
  <h2 id="ax-setup-h" class="label">Race settings</h2>
  {#if !room.canConfigure}<p class="muted">{room.seats.find((s) => s.host)?.name ?? 'The host'} chooses the settings. They are fixed once the race starts.</p>{/if}
  <div class="opts">
    <label>Mode
      <select value={c.mode} disabled={!can} onchange={(e) => send({ mode: e.currentTarget.value as AConfig['mode'] })}>
        {#each Object.entries(MODE_NAMES) as [id, name] (id)}<option value={id} disabled={(id === 'solo' || id === 'school') && n > 1}>{name}</option>{/each}
      </select>
      <span class="hint">{MODE_TEXT[c.mode]}</span>
    </label>
    {#if !school && !(c.mode === 'championship')}
      <label>Circuit
        <select value={c.circuit} disabled={!can} onchange={(e) => send({ circuit: e.currentTarget.value })}>
          {#each CIRCUITS as x (x.id)}<option value={x.id}>{x.name} ({x.level}, {x.corners.length} corners)</option>{/each}
        </select>
        <span class="hint">{circuit.blurb}</span>
      </label>
    {/if}
    {#if !school}
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
    {/if}
    {#if c.mode === 'championship'}
      <label>Season
        <select value={c.length} disabled={!can} onchange={(e) => send({ length: Number(e.currentTarget.value) })}>
          {#each SEASON_LENGTHS as l (l)}<option value={l}>{l} races</option>{/each}
          <option value={0}>Custom</option>
        </select>
      </label>
    {/if}
  </div>
  {#if c.mode === 'championship' && c.length === 0}
    <div class="custom">
      <p class="label2">Custom calendar ({c.races.length} of 12)</p>
      <ol>
        {#each c.races as r, i (i)}
          <li>{CIRCUITS.find((x) => x.id === r)?.name}<button class="btn small ghost" disabled={!can} aria-label="Remove race {i + 1}" onclick={() => send({ races: c.races.filter((_, k) => k !== i) })}>Remove</button></li>
        {/each}
      </ol>
      <label class="row">Add a race
        <select value="" disabled={!can || c.races.length >= 12} onchange={(e) => addRace(e.currentTarget.value)}>
          <option value="">Choose a circuit…</option>
          {#each CIRCUITS as x (x.id)}<option value={x.id}>{x.name}</option>{/each}
        </select>
      </label>
    </div>
  {/if}
  <p class="muted">
    {#if school}Driving School fixes everything else: two careful computer cars, one lap, no modules or timer.{:else}The modules, upgrade pools and paddock switches below are all on by default. Every circuit plays with any of them off. Weather is drawn before the race and never changes during it.{/if}
  </p>
</section>

<style>
  .setup h2 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  .muted,
  .hint {
    margin: 8px 0 0;
    color: var(--ink-3);
    font-size: 14px;
    font-weight: 400;
  }
  .hint {
    margin: 0;
    font-size: 13px;
  }
  .opts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
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
    border-radius: var(--r-sm, 6px);
  }
  .custom {
    margin-top: 10px;
  }
  .label2 {
    margin: 0 0 4px;
    font-weight: 600;
  }
  .custom ol {
    margin: 0 0 8px;
    padding-left: 20px;
  }
  .custom li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .row {
    max-width: 320px;
  }
</style>
