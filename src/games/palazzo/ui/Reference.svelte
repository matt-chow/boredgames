<script lang="ts">
  import { KIND_ORDER, KINDS, MUST_DEPOSE, ROLES } from '../rules/roles';
  import { cap } from './text';

  /** The quick reference (PZ-UI3): every action on one card. Opening it never pauses the table. */
  let { pinned = false, canPin = false, onpin, onclose, onrules }: { pinned?: boolean; canPin?: boolean; onpin?: () => void; onclose?: () => void; onrules: () => void } = $props();
  const blockText = (k: (typeof KIND_ORDER)[number]) => {
    const x = KINDS[k];
    if (!x.blockBy) return '—';
    return `${ROLES[x.blockRole!].name} (${x.blockBy === 'any' ? 'anyone' : 'target'})`;
  };
</script>

<section class="ref" aria-labelledby="pz-ref-h">
  <header>
    <h2 id="pz-ref-h">Reference</h2>
    {#if canPin}<button class="btn small ghost" aria-pressed={pinned} onclick={onpin}>{pinned ? 'Unpin' : 'Pin'}</button>{/if}
    {#if onclose}<button class="btn small ghost" onclick={onclose}>Close</button>{/if}
  </header>
  <table>
    <thead><tr><th scope="col">Action</th><th scope="col">Claim</th><th scope="col">Effect</th><th scope="col">Blocked by</th></tr></thead>
    <tbody>
      {#each KIND_ORDER as k (k)}
        {@const x = KINDS[k]}
        <tr>
          <th scope="row">{x.name}</th>
          <td>{x.role ? ROLES[x.role].name : '—'}</td>
          <td>{cap(x.text.replace(/^[^:]+: /, ''))}</td>
          <td>{blockText(k)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <ul class="notes">
    <li>Anyone may claim any role, held or not. Any claim, block included, can be challenged by everyone else.</li>
    <li>True claim: the challenger loses an influence, and the claimant swaps the proven card for a new one. Bluff: the claimant loses one and the action fails.</li>
    <li>With {MUST_DEPOSE}+ coins you must Depose. A bluffed Strike that is caught gives its 3 coins back. A blocked one doesn’t.</li>
  </ul>
  <button class="btn small" onclick={onrules}>Full rules</button>
</section>

<style>
  .ref {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    font-size: 13px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h2 {
    flex: 1;
    margin: 0;
    font: 700 17px/1.2 var(--pz-serif);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 4px 4px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--rim);
  }
  thead th {
    font-size: 12px;
    color: var(--ink-3);
    font-weight: 600;
  }
  tbody th {
    font-weight: 700;
    white-space: nowrap;
  }
  td {
    color: var(--ink-2);
  }
  .notes {
    margin: 0;
    padding-left: 18px;
    color: var(--ink-2);
  }
  .btn.small {
    align-self: flex-start;
  }
</style>
