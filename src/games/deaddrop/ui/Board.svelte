<script lang="ts">
  import { LOCATIONS, LOCATION_NAMES, type DView, type Loc } from '../rules/types';
  import { sceneOf } from './text';

  let {
    view,
    names,
    selected = null,
    falseSignal = null,
    pickable = null,
    onpick,
  }: {
    view: DView;
    names: string[];
    selected?: Loc | null;
    falseSignal?: Loc | null;
    /** Null: the board is for reading, not choosing. */
    pickable?: ((l: Loc) => boolean) | null;
    onpick?: (l: Loc) => void;
  } = $props();

  const me = $derived(view.you ?? 0);
  const last = $derived(view.rounds.at(-1) ?? null);
  const label = (seat: number) => (seat === me ? 'You' : names[seat]);
</script>

<ul class="board" aria-label="The four locations">
  {#each LOCATIONS as l (l)}
    {@const mission = view.mine?.missions.includes(l) ?? false}
    {@const count = view.mine?.deliveries[l] ?? 0}
    {@const signals = [0, 1].filter((seat) => last?.signals[seat] === l)}
    {@const capture = last?.captures.find((c) => c.loc === l)}
    <li>
      <button class="tile" class:selected={selected === l} class:mission disabled={!pickable?.(l)} class:choose={!!pickable} aria-pressed={pickable ? selected === l : undefined} onclick={() => onpick?.(l)}>
        <img src={sceneOf(l)} alt="" width="640" height="400" />
        <span class="name label">{LOCATION_NAMES[l]}</span>
        {#if mission}
          <span class="stamp">Your mission{count ? ` · ${count} delivered` : ''}</span>
        {/if}
        {#if falseSignal === l}<span class="chips"><span class="chip false">False signal</span></span>{/if}
        {#if signals.length || capture}
          <span class="chips" aria-label="Round {last?.round} activity">
            {#each signals as seat (seat)}<span class="chip" title="Round {last?.round} signal: {label(seat)}">Signal: {label(seat)}</span>{/each}
            {#if capture}<span class="chip caught">{label(capture.seat)} intercepted</span>{/if}
          </span>
        {/if}
      </button>
    </li>
  {/each}
</ul>

<style>
  .board {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .tile {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border: 2px solid var(--rim);
    border-radius: var(--r-sm);
    background: var(--ground-0);
    color: var(--ink);
    font: inherit;
    text-align: left;
  }
  .tile img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tile.mission {
    border-color: var(--dd-paper-rim);
  }
  .tile.choose:disabled img {
    opacity: 0.35;
  }
  .tile.choose:not(:disabled) {
    cursor: pointer;
    transition: transform var(--dur-1) var(--ease-out);
  }
  @media (hover: hover) {
    .tile.choose:not(:disabled):hover {
      transform: translateY(-2px);
    }
  }
  .tile:focus-visible {
    outline: 3px solid var(--sprout);
    outline-offset: 2px;
  }
  .tile.selected {
    border-color: var(--sprout);
    box-shadow: 0 0 0 2px var(--sprout);
  }
  /* A row of four, so the whole board is in sight while choosing. */
  @media (min-width: 900px) {
    .board {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .tile {
      aspect-ratio: 16 / 11;
    }
  }
  .name {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: 2px 10px 2px 8px;
    font-size: clamp(14px, 2vw, 18px);
    line-height: 1.25;
    background: var(--ground-0);
    border-top-right-radius: var(--r-sm);
  }
  .stamp {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 1px 6px;
    font: 700 11px/1.5 var(--dd-type);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--dd-wine);
    background: var(--dd-paper);
    border: 2px solid var(--dd-wine);
    transform: rotate(-2deg);
  }
  .chips {
    position: absolute;
    right: 4px;
    bottom: 4px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    max-width: 60%;
  }
  .chip {
    padding: 0 6px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
    border-radius: 3px;
    color: var(--ink);
    background: var(--ground-0);
    border: 1px dashed var(--ink-3);
  }
  .chip.false {
    color: var(--sprout-ink);
    background: var(--sprout);
    border-color: var(--sprout-ink);
  }
  .chip.caught {
    color: var(--dd-paper);
    background: var(--dd-wine);
    border: 1px solid var(--dd-paper);
  }
</style>
