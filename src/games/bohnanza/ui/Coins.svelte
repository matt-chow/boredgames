<script lang="ts">
  let { count, ids, anchor, big = false }: { count: number; ids: string[]; anchor: string; big?: boolean } = $props();
  // Each coin carries its card id so a harvest can fly the bean from the crate into the purse.
  const shown = $derived(ids.slice(-10));
</script>

<div class="purse" class:big data-anchor={anchor} aria-label="{count} coin{count === 1 ? '' : 's'}" role="img">
  <span class="stack" style="--n:{Math.max(shown.length, 1)}">
    {#each shown as id, i (id)}
      <i class="coin" data-card={id} style="--i:{i}"></i>
    {/each}
    {#if !count}<i class="coin none"></i>{/if}
  </span>
  <span class="num n">{count}</span>
</div>

<style>
  .purse {
    --d: 18px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--coin);
    font-weight: 700;
    font-size: 15px;
  }
  .big {
    --d: 24px;
    font-size: 20px;
  }
  .stack {
    position: relative;
    width: var(--d);
    height: calc(var(--d) + (var(--n) - 1) * 3px);
  }
  .coin {
    position: absolute;
    left: 0;
    bottom: calc(var(--i, 0) * 3px);
    width: var(--d);
    height: var(--d);
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #f7d987, var(--coin) 55%, #a87a1e);
    box-shadow:
      inset 0 0 0 1.5px rgb(90 60 10 / 0.6),
      0 1px 2px rgb(0 0 0 / 0.5);
  }
  .coin.none {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--rim-hi);
  }
  .n {
    min-width: 1.5ch;
  }
  .purse:has(.none) {
    color: var(--ink-3);
  }
</style>
