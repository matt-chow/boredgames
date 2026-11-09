<script lang="ts">
  import Dialog from '../../../hub/Dialog.svelte';
  import { ACTIONS, CLASSIC_DECK, ENTRANCE, EXPANSION_DECK, GOALS, ROLES, TUNNELS, artOf, type Ruleset } from '../rules/cards';

  /** Every card, from the same registry the rules use, so counts and wording cannot drift from the game. */
  let { open = $bindable(false), mode }: { open: boolean; mode: Ruleset } = $props();

  const classic = new Map(CLASSIC_DECK);
  const extra = new Map(EXPANSION_DECK);
  const count = (kind: string) => `${classic.get(kind) ?? 0} in the classic deck${extra.get(kind) ? `, ${extra.get(kind)} more in Expanded` : ''}`;

  const GROUPS = {
    tunnels: 'Tunnels',
    actions: 'Actions',
    roles: 'Roles',
    board: 'Board and gold',
  } as const;
  let group = $state<keyof typeof GROUPS>('tunnels');
  let onlyThis = $state(true);

  const entries = $derived.by(() => {
    const has = (kind: string) => !onlyThis || classic.has(kind) || (mode === 'expanded' && extra.has(kind));
    if (group === 'tunnels') return TUNNELS.filter((t) => has(t.kind)).map((t) => ({ kind: t.kind, name: t.name, text: t.text, note: count(t.kind) }));
    if (group === 'actions') return ACTIONS.filter((a) => has(a.kind)).map((a) => ({ kind: a.kind, name: a.name, text: a.text, note: `${a.limits} ${count(a.kind)}.` }));
    if (group === 'roles') return ROLES.filter((r) => !onlyThis || (mode !== 'duel' && r.rulesets.includes(mode))).map((r) => ({ kind: r.role, name: r.name, text: r.text, note: '' }));
    return [
      { kind: 'entrance', name: ENTRANCE.name, text: ENTRANCE.text, note: 'Always on the board.' },
      ...Object.values(GOALS).map((g) => ({ kind: g.kind, name: g.name, text: g.text, note: g.kind === 'gold' ? 'One of the three destinations.' : 'Two of the three destinations; they turn either way.' })),
      { kind: 'reward3', name: 'Gold cards', text: 'Classic: 16 worth 1, 8 worth 2, 4 worth 3. Miners draft them when the gold is reached.', note: '' },
      { kind: 'crystal', name: 'Crystal', text: 'Expanded: a Crystal Seeker is paid for crystals showing in the mine when the round ends.', note: '' },
    ];
  });
</script>

<Dialog bind:open title="Card encyclopedia" wide>
  <div class="bar">
    <div class="tabs" role="tablist">
      {#each Object.entries(GROUPS) as [id, name] (id)}
        <button role="tab" aria-selected={group === id} class:on={group === id} onclick={() => (group = id as keyof typeof GROUPS)}>{name}</button>
      {/each}
    </div>
    <label><input type="checkbox" bind:checked={onlyThis} /> Only this mode</label>
  </div>
  <ul class="grid">
    {#each entries as e (e.kind)}
      <li>
        <img src={artOf(e.kind)} alt="" width="60" height="90" loading="lazy" />
        <div>
          <p class="name">{e.name}</p>
          <p class="text">{e.text}</p>
          {#if e.note}<p class="note">{e.note}</p>{/if}
        </div>
      </li>
    {/each}
  </ul>
</Dialog>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 14px;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .tabs button {
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 4px 10px;
    min-height: 32px;
    border: 1px solid var(--rim);
    border-radius: 4px;
    background: none;
    color: var(--ink-2);
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--sprout);
    color: var(--sprout-ink);
    border-color: var(--sprout);
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .grid li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .grid img {
    flex: none;
    border-radius: 5px;
  }
  .name {
    margin: 0;
    font-weight: 700;
  }
  .text,
  .note {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--ink-2);
  }
  .note {
    color: var(--ink-3);
  }
</style>
