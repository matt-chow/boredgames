<script lang="ts">
  import { toasts } from '../../../client/lib/toast.svelte';
  import type { GameUiProps } from '../../ui';
  import { ROUND_CHOICES, TARGET_CHOICES, TIMER_CHOICES, type MConfig } from '../rules/types';
  import { artOf } from '../rules/cards';
  import { MODE_NAMES } from './text';

  let { conn, room }: GameUiProps = $props();

  const c = $derived(room.config as unknown as MConfig);
  const n = $derived(room.seats.length);
  const can = $derived(room.canConfigure && !conn.busy);

  const MODES = [
    { id: 'classic', players: [3, 10], art: 'saboteur', text: 'Hidden miners and saboteurs. Reach the gold and the miners share a secret draft of gold cards; fail and the saboteurs are paid.' },
    { id: 'expanded', players: [2, 10], art: 'green', text: 'Rival green and blue crews, gates only one crew may pass, ladders, crystals, theft and traps. 15 roles; 118 cards.' },
    { id: 'duel', players: [2, 2], art: 'toolPick', text: 'Two prospectors, no roles. Reach the gold for 3 gold, your rival takes 1; if the cards run out, nobody earns.' },
  ] as const;
  const fits = (p: readonly [number, number]) => n >= p[0] && n <= p[1];

  async function send(config: Partial<MConfig>) {
    const r = await conn.send({ t: 'config', config });
    if (!r.ok) toasts.push(r.error ?? 'That can’t be chosen.', 'error');
  }
</script>

<section class="setup" aria-labelledby="ms-setup-h">
  <h2 id="ms-setup-h" class="label">Game mode</h2>
  {#if !room.canConfigure}<p class="muted">{room.seats.find((s) => s.host)?.name ?? 'The host'} chooses the settings. They are fixed once the game starts.</p>{/if}
  <div class="modes" role="radiogroup" aria-label="Game mode">
    {#each MODES as m (m.id)}
      <button role="radio" class="mode" class:on={c.mode === m.id} class:off={!fits(m.players)} aria-checked={c.mode === m.id} disabled={!can} onclick={() => send({ mode: m.id })}>
        <img src={artOf(m.art)} alt="" width="48" height={m.art.startsWith('tool') ? 48 : 72} />
        <span class="mtext">
          <span class="mname">{MODE_NAMES[m.id]}</span>
          <span class="mplayers">{m.players[0] === m.players[1] ? `${m.players[0]} players` : `${m.players[0]}–${m.players[1]} players`}{fits(m.players) ? '' : ` · not for ${n}`}</span>
          <span class="mdesc">{m.text}</span>
        </span>
      </button>
    {/each}
  </div>

  <div class="opts">
    <label>Rounds
      <select value={c.rounds} disabled={!can} onchange={(e) => send({ rounds: Number(e.currentTarget.value) })}>
        {#each ROUND_CHOICES as v (v)}<option value={v}>{v}</option>{/each}
      </select>
    </label>
    <label>Gold target
      <select value={c.target} disabled={!can} onchange={(e) => send({ target: Number(e.currentTarget.value) })}>
        {#each TARGET_CHOICES as v (v)}<option value={v}>{v ? `${v} gold` : 'None'}</option>{/each}
      </select>
    </label>
    <label>Turn timer
      <select value={c.timer} disabled={!can} onchange={(e) => send({ timer: Number(e.currentTarget.value) })}>
        {#each TIMER_CHOICES as v (v)}<option value={v}>{v ? `${v} seconds` : 'Unlimited'}</option>{/each}
      </select>
    </label>
    <label>If someone drops out
      <select value={c.away} disabled={!can} onchange={(e) => send({ away: e.currentTarget.value as MConfig['away'] })}>
        <option value="pause">Wait for them</option>
        <option value="autopass">Pass for them</option>
      </select>
    </label>
  </div>
  <p class="muted">A gold target ends the game after the round in which someone reaches it; otherwise the game runs all its rounds. After a minute away, a player’s seat waits or passes for them, as chosen here, until they return.</p>
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
  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
  }
  .mode {
    display: flex;
    gap: 10px;
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
  .mode img {
    flex: none;
    border-radius: 4px;
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
