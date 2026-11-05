<script lang="ts">
  import Icon from '../../../hub/Icon.svelte';
  import type { PlayerV } from '../rules/view';
  import Card from './Card.svelte';
  import Coins from './Coins.svelte';
  import Field from './Field.svelte';

  let {
    p,
    seat,
    name,
    connected,
    bot = false,
    standIn = false,
    away = false,
    active,
    coinHolder = false,
    acting = false,
    stealFields = [],
    onsteal = undefined,
  }: {
    p: PlayerV;
    seat: number;
    name: string;
    connected: boolean;
    /** A computer player run by the server. */
    bot?: boolean;
    standIn?: boolean;
    away?: boolean;
    active: boolean;
    coinHolder?: boolean;
    /** The server is waiting on this player. */
    acting?: boolean;
    stealFields?: number[];
    onsteal?: (field: number) => void;
  } = $props();

  const backs = $derived(Math.min(p.handCount, 7));
</script>

<section class="seat" class:active aria-label="{name}{active ? ', active player' : ''}">
  <header>
    {#if bot}
      <span class="bot" title={standIn ? 'A bot plays this seat until they return' : 'Computer player'}><Icon name="bot" size={14} /></span>
    {:else}
      <span class="dot" class:on={connected} title={connected ? 'Online' : 'Offline'}></span>
    {/if}
    <span class="name">{name}</span>
    {#if coinHolder}<span class="beancoin" title="Holds the Bean Coin">Bean Coin</span>{/if}
    {#if acting && !active}<span class="acting">deciding…</span>{/if}
    {#if standIn}<span class="note">Bot playing</span>{:else if away}<span class="note">Away</span>{/if}
    {#if !connected}<Icon name="wifiOff" size={14} />{/if}
  </header>

  <div class="row">
    <div class="hand" data-anchor="seat-{seat}" aria-label="{p.handCount} cards in hand">
      <div class="backs">
        {#each Array(backs) as _, i (i)}
          <span class="b" style="--i:{i}; --k:{backs}"><Card size="xs" /></span>
        {/each}
      </div>
      <span class="hc num">{p.handCount}</span>
    </div>
    <Coins count={p.coins} ids={p.coinIds} anchor="coins-{seat}" />
  </div>

  <div class="fields">
    {#each p.fields as f, i (i)}
      <Field cards={f} index={i} stealable={stealFields.includes(i)} onsteal={() => onsteal?.(i)} />
    {/each}
  </div>

  {#if p.pending.length}
    <div class="pending" aria-label="Cards {name} must plant">
      <span class="plab">To plant</span>
      {#each p.pending as c (c.id)}
        <Card id={c.id} bean={c.t} size="xs" />
      {/each}
    </div>
  {/if}
</section>

<style>
  .seat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 12px 14px 14px;
    border-radius: 16px;
    border: 1px solid transparent;
    transition:
      border-color var(--dur-3) var(--ease-out),
      background-color var(--dur-3) var(--ease-out);
  }
  .seat.active {
    border-color: var(--rim-hi);
    background: rgb(255 240 220 / 0.035);
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-2);
    font-size: 15px;
    max-width: 100%;
  }
  .active header {
    color: var(--ink);
  }
  .bot {
    display: inline-flex;
    color: var(--ink-3);
  }
  .note {
    flex: none;
    font-size: 12px;
    color: var(--ink-3);
  }
  .name {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 14ch;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--rim-hi);
    flex: none;
  }
  .dot.on {
    background: var(--ink-3);
  }
  .active .dot.on {
    background: var(--sprout);
  }
  .beancoin {
    font-size: 11px;
    font-weight: 700;
    color: var(--coin-ink);
    background: var(--coin);
    padding: 2px 7px;
    border-radius: 999px;
  }
  .acting {
    font-size: 12px;
    color: var(--ink-3);
    font-style: italic;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .hand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .backs {
    position: relative;
    width: 60px;
    height: 44px;
  }
  .b {
    position: absolute;
    left: calc(var(--i) * 4px + 8px);
    top: 0;
    transform-origin: 50% 120%;
    transform: rotate(calc((var(--i) - (var(--k) - 1) / 2) * 7deg));
  }
  .hc {
    font-size: 14px;
    color: var(--ink-2);
    min-width: 2ch;
  }
  .fields {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .pending {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px dashed var(--rim-hi);
  }
  .plab {
    font-size: 12px;
    color: var(--ink-3);
    margin-right: 4px;
  }
</style>
