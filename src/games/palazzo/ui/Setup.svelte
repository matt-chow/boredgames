<script lang="ts">
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { GameUiProps } from '../../ui';
  import { TIMER_CHOICES, type PConfig } from '../rules/types';

  let { conn, room }: GameUiProps = $props();

  const c = $derived(room.config as unknown as PConfig);
  const n = $derived(room.seats.length);
  const can = $derived(room.canConfigure && !conn.busy);

  async function send(config: Partial<PConfig>) {
    const r = await conn.send({ t: 'config', config });
    if (!r.ok) toasts.push(r.error ?? 'That can’t be chosen.', 'error');
  }
</script>

<section class="setup" aria-labelledby="pz-setup-h">
  <h2 id="pz-setup-h" class="label">Table rules</h2>
  {#if !room.canConfigure}<p class="muted">{room.seats.find((s) => s.host)?.name ?? 'The host'} chooses the settings. They are fixed once the game starts.</p>{/if}
  <div class="opts">
    <label>Time to answer a claim
      <select value={c.timer} disabled={!can} onchange={(e) => send({ timer: Number(e.currentTarget.value) as PConfig['timer'] })}>
        {#each TIMER_CHOICES as v (v)}<option value={v}>{v} seconds{v === 15 ? ' (recommended)' : ''}</option>{/each}
      </select>
    </label>
    <label>If someone disconnects
      <select value={c.disconnect} disabled={!can} onchange={(e) => send({ disconnect: e.currentTarget.value as PConfig['disconnect'] })}>
        <option value="pause">Pause the table until they return</option>
        <option value="continue">Carry on; wait only for their own decisions</option>
      </select>
    </label>
  </div>
  <label class="check" class:off={n !== 2}>
    <input type="checkbox" checked={c.draft} disabled={!can} onchange={(e) => send({ draft: e.currentTarget.checked })} />
    <span>Two-player draft: deal three, keep two{n !== 2 ? ' (only with exactly two players)' : ''}</span>
  </label>
  <p class="muted">The timer limits only challenges and blocks; when it runs out, everyone who hasn’t answered lets the claim stand. Turns, lost cards and Parley choices have no timer, and nothing is ever chosen for anyone. There are no computer players.</p>
</section>

<style>
  .setup h2 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  .muted {
    margin: 8px 0 0;
    color: var(--ink-3);
    font-size: 14px;
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
  .check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    min-height: 40px;
    font-weight: 400;
  }
  .check.off {
    color: var(--ink-3);
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
