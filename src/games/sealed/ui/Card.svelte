<script lang="ts">
  import { KINDS, type Kind } from '../rules/cards';
  import { artOf } from './text';

  /** One card, face up (`kind`) or face down. `size`: lg in the hand, md in dialogs, sm on the table. */
  let { kind = null, size = 'sm', card = undefined }: { kind?: Kind | null; size?: 'lg' | 'md' | 'sm'; card?: string } = $props();
  const info = $derived(kind ? KINDS[kind] : null);
</script>

<div class="sc-card {size}" class:back={!info} data-card={card} role="img" aria-label={info ? `${info.name}, ${info.value}` : 'A face-down card'}>
  {#if info}
    <img src={artOf(kind!)} alt="" draggable="false" />
    <span class="val" aria-hidden="true">{info.value}</span>
    <span class="plate" aria-hidden="true">
      <span class="nm">{info.name}</span>
      {#if size !== 'sm'}<span class="tx">{info.text}</span>{/if}
    </span>
  {:else}
    <img src={artOf('back')} alt="" draggable="false" />
  {/if}
</div>

<style>
  .sc-card {
    --w: 54px;
    position: relative;
    flex: none;
    width: var(--w);
    aspect-ratio: 5 / 7;
    border-radius: calc(var(--w) * 0.06);
    overflow: hidden;
    background: var(--sc-ivory);
    box-shadow: var(--shadow-1);
    outline: 1px solid rgb(0 0 0 / 0.35);
    user-select: none;
  }
  .md {
    --w: 120px;
  }
  .lg {
    --w: clamp(132px, 34vw, 168px);
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .val {
    position: absolute;
    top: 5%;
    left: 6%;
    display: grid;
    place-items: center;
    width: calc(var(--w) * 0.24);
    height: calc(var(--w) * 0.24);
    border-radius: 50%;
    font: 700 calc(var(--w) * 0.15) / 1 var(--sc-serif);
    color: var(--sc-ivory);
    background: var(--sc-wine);
    border: 1.5px solid var(--sc-brass);
  }
  .plate {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4% 7% 6%;
    color: var(--sc-paper-ink);
    background: linear-gradient(to top, var(--sc-ivory) 75%, rgb(243 235 218 / 0.85));
    border-top: 1.5px solid var(--sc-brass);
  }
  .nm {
    font: 700 calc(var(--w) * 0.12) / 1.1 var(--sc-serif);
    text-align: center;
  }
  .sm .plate {
    padding: 2% 4% 4%;
  }
  .sm .nm {
    font-size: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tx {
    font-size: calc(var(--w) * 0.074);
    line-height: 1.25;
    color: var(--sc-paper-ink-2);
  }
</style>
