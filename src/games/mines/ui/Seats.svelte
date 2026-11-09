<script lang="ts">
  import type { RoomView } from '../../../shared/protocol';
  import { artOf } from '../rules/cards';
  import type { MView } from '../rules/types';
  import { TOOL_ART, TOOL_NAMES } from './text';

  /**
   * Everyone at the table, in seat order starting with you: an avatar, whose turn it is (in words as well as the lamp
   * ring), and each opponent's hand as a face-down fan with its exact count. Only public counts are shown.
   */
  let {
    view,
    room,
    who,
    next,
    left,
    drops = [],
  }: { view: MView; room: RoomView; who: (seat: number) => string; next: number | null; left: number | null; drops?: number[] } = $props();

  const me = $derived(view.me?.seat ?? -1);
  const order = $derived.by(() => {
    const n = view.players.length;
    const start = me >= 0 ? me : 0;
    return Array.from({ length: n }, (_, i) => view.players[(start + i) % n]);
  });
  const initial = (s: number) => (room.seats[s]?.name ?? '?').trim().charAt(0).toUpperCase() || '?';
  /** A few backs stand for the hand; the number gives the count. */
  const backs = (n: number) => Math.min(n, 5);
</script>

<ul class="seats" aria-label="Players">
  {#each order as p (p.seat)}
    {@const s = room.seats[p.seat]}
    {@const up = view.phase === 'play' && view.current === p.seat}
    {@const k = backs(p.hand)}
    <li class="seat" class:up class:you={p.seat === me} class:drop={drops.includes(p.seat)} data-drop={drops.includes(p.seat) ? `seat:${p.seat}` : undefined}>
      <span class="av" data-anchor="seat-{p.seat}" aria-hidden="true">{initial(p.seat)}<span class="dot" class:on={s?.connected || s?.bot}></span></span>
      <span class="info">
        <span class="nm">{who(p.seat)}{#if s?.standIn}<span class="tag"> (stand-in)</span>{/if}</span>
        <span class="state">
          {#if up}<strong>Playing</strong>{#if left !== null} · {left}s{/if}{:else if next === p.seat}{p.seat === me ? "You're next" : 'Next'}{:else if !(s?.connected || s?.bot)}Away{/if}
        </span>
      </span>
      {#if p.seat !== me}
        <span class="fan" data-anchor="fan-{p.seat}" role="img" aria-label="{p.hand} {p.hand === 1 ? 'card' : 'cards'} in hand">
          {#each { length: k } as _, i (i)}
            <img src={artOf('cardBack')} alt="" style:--a="{(i - (k - 1) / 2) * 11}deg" draggable="false" />
          {/each}
          <span class="n">{p.hand}</span>
        </span>
      {/if}
      {#if p.broken.length || p.theft || p.trap || p.hasGold}
        <span class="marks">
          {#each p.broken as t (t)}<img src={artOf(`${TOOL_ART[t]}Broken`)} alt="Broken {TOOL_NAMES[t]}" title="Broken {TOOL_NAMES[t]}" width="20" height="20" />{/each}
          {#if p.theft}<img src={artOf('theft')} alt="Pickpocket laid" title="Pickpocket laid" width="14" height="21" />{/if}
          {#if p.trap}<img src={artOf('trap')} alt="Locked in" title="Locked in" width="14" height="21" />{/if}
          {#if p.hasGold}<img src={artOf('nugget')} alt="Has gold" title="Has gold" width="18" height="18" />{/if}
        </span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .seats {
    list-style: none;
    margin: 0;
    padding: 6px 8px;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: thin;
    background: var(--ground-1);
    border-bottom: 1px solid var(--rim);
  }
  .seat {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px 4px 4px;
    border: 1px solid var(--rim);
    border-radius: 24px;
    background: var(--ground-2);
    font-size: 13px;
  }
  .seat.up {
    border-color: var(--sprout);
    background: var(--sprout-dim);
  }
  .seat.drop {
    border-style: dashed;
    border-color: var(--sprout);
  }
  .seat:global(.drop-over) {
    background: var(--sprout-dim);
  }
  .av {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    font-weight: 700;
    background: var(--ground-3);
    color: var(--ink);
    box-shadow: 0 0 0 2px var(--rim-hi);
  }
  .up .av {
    box-shadow:
      0 0 0 2px var(--sprout),
      0 0 12px 2px var(--sprout-dim);
  }
  .dot {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid var(--ground-2);
    background: var(--rim-hi);
  }
  .dot.on {
    background: var(--ms-lamp);
  }
  .info {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
    min-width: 0;
  }
  .nm {
    font-weight: 600;
    max-width: 9em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .you .nm {
    color: var(--ms-lamp);
  }
  .tag,
  .state {
    font-size: 11px;
    color: var(--ink-3);
    font-weight: 400;
  }
  .up .state {
    color: var(--ink);
  }
  .fan {
    position: relative;
    flex: none;
    width: 46px;
    height: 34px;
  }
  .fan img {
    position: absolute;
    left: 13px;
    bottom: 0;
    width: 20px;
    height: 30px;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
    transform-origin: 50% 120%;
    transform: rotate(var(--a));
  }
  .n {
    position: absolute;
    right: -4px;
    bottom: -4px;
    min-width: 16px;
    padding: 0 3px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    background: var(--ground-0);
    color: var(--ink);
    border: 1px solid var(--rim-hi);
  }
  .marks {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  @media (max-width: 600px) {
    .seat {
      gap: 4px;
      padding-right: 6px;
    }
    .nm {
      max-width: 5.5em;
    }
    .fan {
      width: 30px;
    }
    .fan img {
      left: 5px;
    }
  }
</style>
