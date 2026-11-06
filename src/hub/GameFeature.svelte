<script lang="ts">
  import type { CatalogEntry } from './catalog';
  import CardFan from './CardFan.svelte';
  import Icon from './Icon.svelte';

  let { game, onopen }: { game: CatalogEntry; onopen?: () => void } = $props();
  const soon = $derived(game.status === 'soon');
</script>

<article class="feature" class:soon aria-labelledby="game-{game.id}" style="--accent:{game.accent};--title:{game.titleFont ?? 'var(--font-label)'}">
  <div class="info">
    <h2 class="title" class:plain={!!game.titleFont} id="game-{game.id}">{game.name}</h2>
    <p class="pitch">{game.pitch}</p>
    {#if soon}
      <p class="pill">Coming soon</p>
    {:else}
      <ul class="facts">
        <li><Icon name="users" size={16} /><span class="num">{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}</span> players</li>
        <li><Icon name="clock" size={16} /><span class="num">{game.minutes}</span> min</li>
      </ul>
      <button class="btn primary open" aria-haspopup="dialog" aria-label="Open Table: {game.name}" onclick={onopen}>Open Table <Icon name="arrowRight" /></button>
    {/if}
  </div>
  <div class="spread">
    {#if game.fan}
      {#await game.fan() then fan}
        <fan.default />
      {:catch}
        {@render blanks()}
      {/await}
    {:else}
      {@render blanks()}
    {/if}
  </div>
</article>

{#snippet blanks()}
  <CardFan items={[0, 1, 2]} cardWidth={100}>
    {#snippet card()}<span class="blank"></span>{/snippet}
  </CardFan>
{/snippet}

<style>
  .feature {
    container-type: inline-size;
    position: relative;
    overflow: clip;
    border-radius: var(--r-lg);
    background: color-mix(in srgb, var(--accent) 24%, #1f1a17);
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.07),
      var(--shadow-1);
  }
  .info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding: clamp(20px, 4cqw, 40px);
  }
  .spread {
    padding: 0 clamp(12px, 4cqw, 24px) 16px;
  }
  /* Side by side only when the card itself has the room, wherever it is placed. */
  @container (min-width: 640px) {
    .info {
      position: absolute;
      inset: 0 auto 0 0;
      width: 46%;
      justify-content: center;
    }
    .spread {
      margin-left: 46%;
      padding: 12px 20px 12px 0;
    }
  }
  .title {
    margin: 0;
    max-width: 100%;
    font-family: var(--title);
    font-weight: 800;
    font-size: clamp(30px, 6cqw, 46px);
    line-height: 1;
    letter-spacing: 0.015em;
    text-transform: uppercase;
    overflow-wrap: anywhere;
    color: var(--ink);
  }
  .title.plain {
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    text-wrap: balance;
  }
  .pitch {
    margin: 0;
    max-width: 44ch;
    color: var(--ink-2);
    text-wrap: pretty;
  }
  .facts {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    margin: 0;
    padding: 0;
    font-size: 14px;
    color: var(--ink-2);
  }
  .facts li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .open {
    min-height: 48px;
    padding-inline: 22px;
    transition: transform var(--dur-1) var(--ease-out);
  }
  .open:active {
    transform: scale(0.97);
  }
  @container (max-width: 639px) {
    .open {
      width: 100%;
    }
  }
  .pill {
    margin: 0;
    padding: 2px 10px;
    border-radius: 99px;
    border: 1px solid var(--rim-hi);
    font-size: 13px;
    color: var(--ink-2);
  }
  .soon {
    background: transparent;
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  .blank {
    flex: none;
    display: block;
    width: 100px;
    aspect-ratio: 5 / 7;
    border-radius: 8px;
    background: var(--accent);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
  }
  .soon .blank {
    background: var(--ground-2);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
</style>
