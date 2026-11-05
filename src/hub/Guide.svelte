<script lang="ts">
  import { untrack } from 'svelte';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';
  import { searchGuide, type GuideBlock, type GuideDoc, type GuideLevel, type GuideSection } from './guide';

  let {
    open = $bindable(false),
    doc,
    at = null,
    note = '',
  }: {
    open: boolean;
    doc: GuideDoc | null;
    /** A section id to open at, for contextual help. */
    at?: string | null;
    note?: string;
  } = $props();

  let levelId = $state<GuideLevel['id']>('quick');
  let query = $state('');
  let opened = $state<string[]>([]);

  const level = $derived(doc?.levels.find((l) => l.id === levelId) ?? doc?.levels[0]);
  const hits = $derived(doc ? searchGuide(doc, query) : []);
  const searching = $derived(query.trim().length > 0);

  function show(id: string) {
    const owner = doc?.levels.find((l) => l.sections.some((s) => s.id === id));
    if (!owner) return;
    levelId = owner.id;
    query = '';
    opened = [...new Set([...opened, id])];
    // After the level has rendered.
    queueMicrotask(() => requestAnimationFrame(() => document.getElementById(`guide-${id}`)?.scrollIntoView({ block: 'start' })));
  }

  $effect(() => {
    if (open && at) {
      const id = at;
      untrack(() => show(id));
    }
  });

  const parts = (text: string) => text.split('**');
  function toggled(id: string, e: Event) {
    const on = (e.currentTarget as HTMLDetailsElement).open;
    opened = on ? [...new Set([...opened, id])] : opened.filter((x) => x !== id);
  }
</script>

{#snippet rich(text: string)}
  {#each parts(text) as part, i (i)}{#if i % 2}<b>{part}</b>{:else}{part}{/if}{/each}
{/snippet}

{#snippet block(b: GuideBlock)}
  {#if typeof b === 'string'}
    <p>{@render rich(b)}</p>
  {:else if 'ul' in b}
    <ul>{#each b.ul as line (line)}<li>{@render rich(line)}</li>{/each}</ul>
  {:else if 'ol' in b}
    <ol>{#each b.ol as line (line)}<li>{@render rich(line)}</li>{/each}</ol>
  {:else if 'symbols' in b}
    <dl class="symbols">
      {#each b.symbols as s (s.name)}<div><dt><Icon name={s.icon} size={16} /> {s.name}</dt><dd>{s.text}</dd></div>{/each}
    </dl>
  {:else}
    <div class="example">
      <h4>{b.example}</h4>
      <ol>{#each b.steps as line (line)}<li>{@render rich(line)}</li>{/each}</ol>
    </div>
  {/if}
{/snippet}

{#snippet section(s: GuideSection)}
  <details id="guide-{s.id}" open={opened.includes(s.id)} ontoggle={(e) => toggled(s.id, e)}>
    <summary>{s.title}</summary>
    <div class="sec">{#each s.body as b, i (i)}{@render block(b)}{/each}</div>
  </details>
{/snippet}

<Dialog bind:open title={doc?.title ?? 'How to play'} wide>
  {#if doc && level}
    <div class="guide">
      {#if note}<p class="note">{note}</p>{/if}
      <input class="find" type="search" placeholder="Search this guide" aria-label="Search this guide" bind:value={query} />
      {#if searching}
        <p class="count" role="status">{hits.length ? `${hits.length} ${hits.length === 1 ? 'section' : 'sections'} found` : 'Nothing found. Try one simpler word.'}</p>
        <ul class="hits">
          {#each hits as h (h.section.id)}
            <li><button type="button" class="link" onclick={() => show(h.section.id)}>{h.section.title}</button> <span>{h.level.title}</span></li>
          {/each}
        </ul>
      {:else}
        <div class="tabs" role="group" aria-label="How much detail">
          {#each doc.levels as l (l.id)}
            <button type="button" class="btn small" class:primary={l.id === level.id} aria-pressed={l.id === level.id} onclick={() => (levelId = l.id)}>{l.title}</button>
          {/each}
        </div>
        <nav aria-label="Contents">
          <ul class="toc">
            {#each level.sections as s (s.id)}
              <li><button type="button" class="link" onclick={() => show(s.id)}>{s.title}</button></li>
            {/each}
          </ul>
        </nav>
        {#each level.sections as s (s.id)}{@render section(s)}{/each}
      {/if}
    </div>
  {:else}
    <p>Loading the guide…</p>
  {/if}
</Dialog>

<style>
  .guide {
    color: var(--ink-2);
    font-size: 15px;
    line-height: 1.55;
  }
  .note {
    margin: 0 0 12px;
    padding: 8px 10px;
    border-radius: var(--r-sm);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
  .find {
    width: 100%;
    margin-bottom: 10px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--r-sm);
    font: inherit;
    color: var(--ink);
    background: var(--ground-1);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .toc,
  .hits {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }
  .hits {
    flex-direction: column;
  }
  .hits span,
  .count {
    color: var(--ink-3);
  }
  .count {
    margin: 0 0 6px;
    font-size: 13px;
  }
  .link {
    padding: 2px 0;
    border: 0;
    font: inherit;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
    background: none;
  }
  details {
    border-top: 1px solid var(--rim);
    scroll-margin-top: 8px;
  }
  summary {
    padding: 9px 0;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
  }
  .sec {
    max-width: 68ch;
    padding-bottom: 12px;
  }
  .sec p {
    margin: 0 0 8px;
  }
  .sec ul,
  .sec ol {
    margin: 0 0 8px;
    padding-left: 22px;
  }
  .sec li {
    margin: 3px 0;
  }
  .sec :global(b) {
    color: var(--ink);
  }
  .symbols {
    margin: 0;
  }
  .symbols div {
    display: grid;
    grid-template-columns: 7.5em minmax(0, 1fr);
    gap: 8px;
    padding: 3px 0;
  }
  .symbols dt {
    font-weight: 600;
  }
  .symbols dt :global(svg) {
    vertical-align: -3px;
  }
  .symbols dd {
    margin: 0;
  }
  .example {
    margin: 8px 0;
    padding: 8px 12px;
    border-radius: var(--r-sm);
    box-shadow: inset 0 0 0 1px var(--rim);
  }
  h4 {
    margin: 0 0 4px;
    font-size: 14px;
    color: var(--ink);
  }
</style>
