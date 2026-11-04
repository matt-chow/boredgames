<script lang="ts">
  import type { CatalogEntry } from './catalog';

  let { game, onopen }: { game: CatalogEntry; onopen?: () => void } = $props();
  let broken = $state(false);
  const soon = $derived(game.status === 'soon');
  const facts = $derived(soon ? 'Coming soon' : `${game.minPlayers}–${game.maxPlayers} players · ${game.minutes} min`);
</script>

<div class="slot">
  <button type="button" class="box" class:soon style="--accent:{game.accent}" aria-haspopup="dialog" aria-label="{game.name}, {facts}" onclick={onopen}>
    {#if game.cover && !broken}
      <img src={game.cover} alt="" width="300" height="420" loading="lazy" decoding="async" onerror={() => (broken = true)} />
    {:else}
      <span class="plain">{game.name}</span>
    {/if}
  </button>
  <div class="ledge" aria-hidden="true"></div>
  <p class="title">{game.name}</p>
  <p class="facts">{facts}</p>
</div>

<style>
  .slot {
    position: relative;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .box {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    aspect-ratio: 5 / 7;
    padding: 0;
    border: 0;
    border-radius: 3px 5px 5px 3px;
    background: var(--accent);
    /* The right side of the box and the shadow it casts on the plank and the wall behind. */
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.1),
      5px 0 0 -1px color-mix(in srgb, var(--accent) 55%, #000),
      9px 2px 14px rgb(0 0 0 / 0.5);
    transition: transform var(--dur-1) var(--ease-out);
  }
  .box::before {
    /* Light catching the spine. */
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 1;
    width: 5%;
    border-radius: 3px 0 0 3px;
    background: linear-gradient(90deg, rgb(255 255 255 / 0.2), rgb(255 255 255 / 0));
    pointer-events: none;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    object-fit: cover;
  }
  .plain {
    display: grid;
    place-items: center;
    height: 100%;
    padding: 12%;
    font-family: var(--font-label);
    font-weight: 800;
    font-size: clamp(18px, 2.2vw, 26px);
    line-height: 1;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    text-align: center;
    overflow-wrap: anywhere;
    color: rgb(255 255 255 / 0.82);
  }
  .soon {
    background: repeating-linear-gradient(135deg, var(--accent) 0 10px, color-mix(in srgb, var(--accent) 85%, #000) 10px 20px);
  }
  .soon .plain {
    color: rgb(255 255 255 / 0.55);
  }
  .box:active {
    transform: scale(0.98);
  }
  @media (hover: hover) and (pointer: fine) {
    .box:hover {
      transform: translateY(-6px);
    }
    .box:active {
      transform: translateY(-3px) scale(0.99);
    }
  }
  .box:focus-visible {
    outline-offset: 3px;
  }

  /* Reaches past the slot on both sides. The case clips it, so every row reads as one plank, however full. */
  .ledge {
    position: relative;
    height: 16px;
    margin-inline: -100vw;
    background:
      repeating-linear-gradient(91deg, rgb(0 0 0 / 0.16) 0 2px, transparent 2px 37px, rgb(255 255 255 / 0.025) 37px 41px, transparent 41px 97px),
      linear-gradient(180deg, #7a5233 0, #5e3d25 3px, #472c1a 100%);
    box-shadow:
      0 1px 0 #2b1a0f,
      0 12px 18px -4px rgb(0 0 0 / 0.6);
  }
  .title,
  .facts {
    position: relative;
    z-index: 1;
  }
  .title {
    margin: 12px 0 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .facts {
    margin: 2px 0 0;
    font-size: 12.5px;
    line-height: 1.3;
    color: var(--ink-3);
  }
</style>
