<script lang="ts">
  import Dialog from '../../../hub/Dialog.svelte';
  import { LOCATIONS, LOCATION_NAMES, type DAction, type DView, type Loc, type Order, type OrderKind } from '../rules/types';
  import CallTime from './CallTime.svelte';
  import { ACTION_HELP, ACTION_NAMES, iconOf, orderText } from './text';

  let {
    view,
    names,
    busy,
    act,
    action = $bindable(),
    target = $bindable(),
    useCover = $bindable(),
    broadcast = $bindable(),
  }: {
    view: DView;
    names: string[];
    busy: boolean;
    act: (a: DAction) => Promise<{ ok: boolean }>;
    action: OrderKind | null;
    target: Loc | null;
    useCover: boolean;
    broadcast: Loc | null;
  } = $props();

  const KINDS: OrderKind[] = ['deliver', 'investigate', 'intercept', 'decoy'];
  const me = $derived(view.you ?? 0);
  const opp = $derived(1 - me);
  const locked = $derived(view.mine?.order ?? null);
  const hasCover = $derived(view.cover[me] > 0);
  let reviewing = $state(false);

  function choose(k: OrderKind) {
    action = k;
    if (k !== 'deliver') useCover = false;
    if (k === 'deliver' && target && !view.mine?.missions.includes(target)) target = null;
    if (broadcast === target) broadcast = null;
  }

  function pickTarget(l: Loc) {
    target = l;
    if (broadcast === l) broadcast = null;
  }

  const order = $derived.by((): Order | null => {
    if (!action || !target) return null;
    if (useCover && action === 'deliver') return broadcast && broadcast !== target ? { action, target, cover: broadcast } : null;
    return { action, target };
  });

  async function lock() {
    if (!order) return;
    const r = await act({ type: 'order', round: view.round, order });
    if (r.ok) reviewing = false;
  }
</script>

<section class="panel" aria-labelledby="orders-h">
  <div class="head">
    <h2 id="orders-h" class="label">Secret orders</h2>
    <p class="state">{names[opp]}: {view.done[opp] ? 'orders locked' : 'still deciding'}</p>
  </div>

  {#if locked}
    <div class="locked">
      <span class="stamp">Locked</span>
      <p>{orderText(locked)}</p>
    </div>
    <CallTime {view} rival={names[opp]} {busy} {act} what="Time called: the round resolves with no order from them." />
  {:else}
    <div class="actions" role="radiogroup" aria-label="Choose an action">
      {#each KINDS as k (k)}
        <button class="act" role="radio" aria-checked={action === k} class:on={action === k} onclick={() => choose(k)}>
          <img src={iconOf(k)} alt="" width="40" height="40" />
          <span class="an">{ACTION_NAMES[k]}</span>
          <span class="ah">{ACTION_HELP[k]}</span>
        </button>
      {/each}
    </div>

    <!-- On a phone the board is a scroll away, so the same choice sits here too. -->
    <div class="chips near" role="radiogroup" aria-label="Choose a location">
      {#each LOCATIONS as l (l)}
        <button class="chip" role="radio" aria-checked={target === l} class:on={target === l} disabled={action === 'deliver' && !view.mine?.missions.includes(l)} onclick={() => pickTarget(l)}>{LOCATION_NAMES[l]}</button>
      {/each}
    </div>

    {#if action === 'deliver' && hasCover}
      <div class="cover">
        <label class="tog">
          <input type="checkbox" bind:checked={useCover} />
          <img src={iconOf('cover')} alt="" width="26" height="26" />
          <span>Spend Cover to broadcast a false location</span>
        </label>
        {#if useCover}
          <div class="chips" role="radiogroup" aria-label="False location to broadcast">
            {#each LOCATIONS as l (l)}
              <button class="chip" role="radio" aria-checked={broadcast === l} class:on={broadcast === l} disabled={l === target} onclick={() => (broadcast = l)}>{LOCATION_NAMES[l]}</button>
            {/each}
          </div>
          <p class="muted">Interception still checks where you really are. Your rival sees that you spent Cover, and only the false signal.</p>
        {/if}
      </div>
    {/if}

    <div class="go">
      <p class="sum" aria-live="polite">
        {#if !action}Choose an action.
        {:else if !target}{ACTION_NAMES[action]}: now choose {action === 'deliver' ? 'one of your mission locations' : 'a location'} on the board.
        {:else if useCover && action === 'deliver' && !order}Choose the false location to broadcast.
        {:else}{orderText(order)}{/if}
      </p>
      <button class="btn" class:primary={!!order} disabled={!order || busy} onclick={() => (reviewing = true)}>Review orders</button>
    </div>
  {/if}
</section>

<Dialog bind:open={reviewing} title="Lock these orders?">
  <p class="confirm">{orderText(order)}</p>
  <p class="muted">Your signal will read: <strong>{order ? LOCATION_NAMES[order.cover ?? order.target] : ''}</strong>. Locked orders can’t be changed.</p>
  <div class="row">
    <button class="btn" onclick={() => (reviewing = false)}>Change them</button>
    <button class="btn primary" disabled={busy || !order} onclick={lock}>Lock orders</button>
  </div>
</Dialog>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0 12px;
  }
  h2 {
    margin: 0;
    font-size: 22px;
  }
  .state {
    margin: 0;
    font-size: 14px;
    color: var(--ink-2);
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .act {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: 8px;
    align-items: center;
    padding: 8px;
    min-height: 44px;
    font: inherit;
    text-align: left;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .act img {
    grid-row: span 1;
  }
  .an {
    font-weight: 700;
    font-size: 15px;
    overflow-wrap: anywhere;
  }
  .ah {
    grid-column: 1 / -1;
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 1.3;
    color: var(--ink-2);
  }
  .act.on {
    background: var(--sprout-dim);
    border-color: var(--sprout);
    box-shadow: inset 0 0 0 1px var(--sprout);
  }
  .act:focus-visible,
  .chip:focus-visible,
  .tog input:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  .cover {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--rim);
    border-radius: var(--r-sm);
  }
  .tog {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    font-size: 14px;
    cursor: pointer;
  }
  .tog input {
    width: 18px;
    height: 18px;
    accent-color: var(--sprout);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    min-height: 40px;
    padding: 0 12px;
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim-hi);
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .chip:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .chip.on {
    color: var(--sprout-ink);
    background: var(--sprout);
    border-color: var(--sprout);
    font-weight: 600;
  }
  .muted {
    margin: 0;
    font-size: 13px;
    color: var(--ink-3);
  }
  .go {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
  }
  .sum {
    flex: 1 1 200px;
    margin: 0;
    font-size: 15px;
  }
  .locked {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    padding: 12px;
    background: var(--dd-paper);
    color: var(--dd-paper-ink);
    font-family: var(--dd-type);
    border-radius: 2px;
  }
  .locked p {
    margin: 0;
    font-weight: 700;
  }
  .stamp {
    padding: 0 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--dd-wine);
    border: 2px solid var(--dd-wine);
    transform: rotate(-3deg);
    animation: stamp var(--dur-2) var(--ease-out);
  }
  @keyframes stamp {
    from {
      opacity: 0;
      transform: rotate(-3deg) scale(1.5);
    }
  }
  .confirm {
    margin: 0 0 6px;
    font: 700 17px/1.35 var(--dd-type);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
  @media (max-width: 720px) {
    .actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 900px) {
    .near {
      display: none;
    }
  }
</style>
