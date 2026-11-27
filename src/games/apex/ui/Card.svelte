<!-- One race card, printed like a 1960s programme insert: a big stencil numeral and a plain line of what it does. -->
<script lang="ts">
  import { cardFx, COAST, STRAIN, STRESS } from '../rules/cards';
  import { cardName, cardText } from './text';

  let { card, size = 'md' }: { card: string; size?: 'sm' | 'md' } = $props();
  const fx = $derived(cardFx(card));
  const kind = $derived(card === STRAIN ? 'strain' : card === STRESS ? 'stress' : card === COAST ? 'coast' : /^P\d$/.test(card) ? 'pace' : 'part');
  const big = $derived(card === STRAIN ? '!' : card === STRESS ? '?' : String(fx?.value ?? ''));
</script>

<span class="card {kind} {size}" title="{cardName(card)}: {cardText(card)}">
  <span class="band" aria-hidden="true"></span>
  <span class="big" aria-hidden="true">{big}</span>
  <span class="nm">{cardName(card)}</span>
  {#if size === 'md' && kind !== 'pace'}<span class="fx">{cardText(card)}</span>{/if}
  {#if fx?.speed != null && fx.speed !== fx.value}<span class="spd" aria-hidden="true">{fx.speed}</span>{/if}
</span>

<style>
  .card {
    --w: 92px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: var(--w);
    aspect-ratio: 5 / 7;
    padding: 8px 6px 6px;
    border-radius: 7px;
    background: var(--ax-paper);
    color: var(--ax-paper-ink);
    border: 1px solid #b9ad8c;
    box-shadow:
      0 1px 0 rgb(255 255 255 / 0.6) inset,
      0 6px 14px -6px rgb(0 0 0 / 0.55);
    overflow: hidden;
    text-align: center;
    user-select: none;
  }
  .card.sm {
    --w: 58px;
    padding: 5px 3px 3px;
  }
  .band {
    position: absolute;
    inset: 0 0 auto;
    height: 9px;
    background: var(--ax-paper-ink);
  }
  .big {
    margin-top: 6px;
    font: 700 calc(var(--w) * 0.5) / 1 'Big Shoulders Stencil', var(--ax-serif);
    letter-spacing: -0.02em;
  }
  .nm {
    margin-top: auto;
    font: 700 11px/1.15 var(--ax-serif);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sm .nm {
    font-size: 9px;
    letter-spacing: 0.03em;
  }
  .fx {
    margin-top: 3px;
    font-size: 9.5px;
    line-height: 1.2;
    color: var(--ax-paper-ink-2);
  }
  .spd {
    position: absolute;
    top: 13px;
    right: 6px;
    min-width: 18px;
    padding: 1px 3px;
    border-radius: 9px;
    font: 700 11px/1.2 var(--ax-serif);
    background: var(--ax-blue);
    color: #fff;
  }
  .stress .band {
    background: var(--ax-mustard);
  }
  .stress .big {
    color: #8a6418;
  }
  .coast .band {
    background: var(--ax-blue);
  }
  .coast .big {
    color: var(--ax-blue);
  }
  .part {
    border-color: var(--ax-blue);
    box-shadow:
      0 0 0 2px var(--ax-blue) inset,
      0 6px 14px -6px rgb(0 0 0 / 0.55);
  }
  .part .band {
    background: repeating-linear-gradient(90deg, var(--ax-blue) 0 8px, var(--ax-paper) 8px 12px);
  }
  .strain {
    background: repeating-linear-gradient(-45deg, #e8d5c4 0 6px, #efe2d2 6px 12px);
  }
  .strain .band {
    background: var(--ax-red);
  }
  .strain .big {
    color: var(--ax-red);
  }
</style>
