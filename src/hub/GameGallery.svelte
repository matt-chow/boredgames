<script lang="ts">
  import type { CatalogEntry } from './catalog';
  import Icon from './Icon.svelte';

  /** Every game at once, as box art. Choosing one turns the wheel to it; nothing launches from here. */
  let { games, focus, onpick }: { games: CatalogEntry[]; focus: string; onpick: (id: string) => void } = $props();
  let broken = $state<Record<string, boolean>>({});
  const players = (g: CatalogEntry) => (g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`);
</script>

<ul class="gallery" aria-label="Games">
  {#each games as g (g.id)}
    <li>
      <button class="tile" class:soon={g.status === 'soon'} aria-current={g.id === focus ? 'true' : undefined} style="--accent:{g.accent}" onclick={() => onpick(g.id)}>
        <span class="box">
          {#if g.cover && !broken[g.id]}<img src={g.cover} alt="" loading="lazy" onerror={() => (broken[g.id] = true)} />{/if}
        </span>
        <span class="name" class:plain={!!g.titleFont} style="font-family:{g.titleFont ?? 'var(--font-label)'};view-transition-name:title-{g.id}">{g.name}</span>
        <span class="facts">
          {#if g.status === 'soon'}Coming soon{:else}<Icon name="users" size={14} /><span class="num">{players(g)}</span><Icon name="clock" size={14} /><span class="num">{g.minutes}</span>{/if}
        </span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .gallery {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
    gap: 14px;
  }
  .tile {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 8px 12px;
    border: 1px solid rgb(255 255 255 / 0.07);
    border-radius: var(--r-lg);
    background: color-mix(in srgb, var(--accent) 22%, #1f1a17);
    color: var(--ink);
    text-align: left;
    transition: transform var(--dur-1) var(--ease-out);
  }
  .tile:active {
    transform: scale(0.98);
  }
  .tile[aria-current='true'] {
    border-color: var(--rim-hi);
  }
  .soon {
    background: var(--ground-1);
  }
  .box {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: calc(var(--r-lg) - 4px);
    background: var(--accent);
    overflow: hidden;
  }
  .soon .box {
    background: var(--ground-2);
  }
  .box img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .name {
    padding-inline: 4px;
    max-width: 100%;
    font-weight: 800;
    font-size: 19px;
    line-height: 1.1;
    text-transform: uppercase;
    letter-spacing: 0.015em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name.plain {
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
  }
  .facts {
    padding-inline: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .facts :global(svg:not(:first-child)) {
    margin-left: 8px;
  }
  /* Phones keep two across, so the gallery stays a quick overview. */
  @media (max-width: 639px) {
    .gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .name {
      font-size: 16px;
    }
  }
</style>
