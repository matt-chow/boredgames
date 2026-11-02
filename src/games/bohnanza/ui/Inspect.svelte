<script lang="ts">
  import Dialog from '../../../hub/Dialog.svelte';
  import { BEANS, type Bean } from '../rules/cards';
  import Card from './Card.svelte';

  let { bean = $bindable(null) }: { bean: Bean | null } = $props();
  let open = $state(false);
  let shown = $state<Bean | null>(null);

  $effect(() => {
    if (bean) {
      shown = bean;
      open = true;
    }
  });
  $effect(() => {
    if (!open) bean = null;
  });

  const info = $derived(shown ? BEANS[shown] : null);
  const rows = $derived(info ? info.meter.map((need, i) => ({ need, coins: i + 1 })).filter((m) => m.need !== null) : []);
</script>

<Dialog bind:open title={info?.name ?? 'Card'}>
  {#if shown && info}
    <div class="ins">
      <Card bean={shown} size="xl" />
      <div class="facts">
        {#if shown === 'magpie'}
          <p>Never planted. At the front of your hand it can be played in step 1 to steal the top bean of a field from up to two players.</p>
        {:else if shown === 'field'}
          <p>Harvest two Field Beans to gain an extra bean field. Three pay 3 coins.</p>
        {:else}
          <table>
            <thead><tr><th>Harvest</th><th>Coins</th></tr></thead>
            <tbody>
              {#each rows as r (r.coins)}
                <tr><td class="num">{r.need}+ beans</td><td class="num">{r.coins}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
        <p class="copies"><span class="num">{info.count}</span> copies in a full deck.</p>
      </div>
    </div>
  {/if}
</Dialog>

<style>
  .ins {
    display: flex;
    gap: 22px;
    align-items: flex-start;
    flex-wrap: wrap;
    justify-content: center;
  }
  .facts {
    flex: 1;
    min-width: 180px;
    color: var(--ink-2);
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 6px 0;
    border-bottom: 1px solid var(--rim);
  }
  th {
    font-size: 13px;
    color: var(--ink-3);
    font-weight: 600;
  }
  td:last-child,
  th:last-child {
    text-align: right;
    color: var(--coin);
  }
  .copies {
    font-size: 14px;
    color: var(--ink-3);
  }
</style>
