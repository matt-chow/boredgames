<script lang="ts">
  import { getContext } from 'svelte';
  import type { DeckView, ProjectDef } from '../../../engine/deckbuilder';
  import Dialog from '../../../hub/Dialog.svelte';
  import Icon from '../../../hub/Icon.svelte';
  import ResText from './ResText.svelte';

  let {
    g,
    works,
    title,
    points,
    tokenName,
    busy,
    name,
    trial = '',
    onhelp,
    onclaim,
  }: {
    g: DeckView;
    works: ProjectDef[];
    title: string;
    points: string;
    tokenName: (token: string) => string;
    busy: boolean;
    name: (seat: number) => string;
    /** A trial edition's name; the live game shows nothing extra. */
    trial?: string;
    onhelp?: () => void;
    onclaim: (key: string) => void;
  } = $props();

  const artOf = getContext<((key: string) => string | null) | undefined>('deck-art');
  const def = (key: string) => works.find((w) => w.key === key);

  type View = DeckView['projects'][number];
  const funded = (p: View) => p.stages?.filter((s) => s.by !== null).length ?? 0;
  const nextStage = (p: View) => p.stages?.find((s) => s.by === null);
  const multi = (p: View) => (p.stages?.length ?? 1) > 1;
  /** Everyone who funded it, first funder first. */
  const builders = (p: View) => {
    const seats = p.stages ? p.stages.flatMap((s) => (s.by === null ? [] : [s.by])) : p.by === null ? [] : [p.by];
    return [...new Set(seats)].map(name).join(', ');
  };
  const coinText = (coins: number) => `${coins} ${coins === 1 ? 'Coin' : 'Coins'}`;
  /** A stage can cost no Coins or no tokens, and that part isn't worth printing. */
  const paidTokens = (tokens: Record<string, number>) => Object.entries(tokens).filter(([, n]) => n > 0);
  const costText = (coins: number, tokens: Record<string, number>) => [...(coins > 0 || !paidTokens(tokens).length ? [coinText(coins)] : []), ...paidTokens(tokens).map(([t, n]) => `${n} ${tokenName(t)}`)].join(' + ');

  let looking = $state<string | null>(null);
  let lookOpen = $state(false);
  const seen = $derived(g.projects.find((p) => p.key === looking));
  function look(key: string) {
    looking = key;
    lookOpen = true;
  }
</script>

<section class="works" aria-label={title}>
  {#if trial}<p class="trial" data-trial>{trial}. <span class="num">{g.projects.filter((p) => p.by !== null).length}/{g.projectsEnd ?? g.projects.length}</span> complete to end the game.</p>{/if}
  {#each g.projects as p (p.key)}
    {@const on = g.legal.claim.includes(p.key) && !busy}
    {@const next = nextStage(p)}
    <div class="slot">
      <button type="button" class="work" class:on class:taken={p.by !== null} disabled={!on} data-project={p.key} onclick={() => onclaim(p.key)}>
        {#if artOf?.(p.key)}<span class="art" aria-hidden="true">{@html artOf(p.key)}</span>{/if}
        <span class="nm label">{def(p.key)?.name ?? p.key}</span>
        {#if multi(p)}
          <span class="prog" data-progress={`${funded(p)}/${p.stages!.length}`} role="img" aria-label="{funded(p)} of {p.stages!.length} stages funded">
            {#each p.stages! as s, i (i)}<i class="pip" class:full={s.by !== null}></i>{/each}
            <span class="num">{funded(p)}/{p.stages!.length}</span>
          </span>
          {#if next}<span class="stage">Next: {next.name}</span>{/if}
        {/if}
        {#if p.by === null || !p.stages}
          <span class="price num">{#if p.coins > 0 || !paidTokens(p.tokens).length}<Icon name="coin" size={12} /> {coinText(p.coins)}{/if}{#each paidTokens(p.tokens) as [t, n], i (t)}{i || p.coins > 0 ? ' + ' : ''}<Icon name="influence" size={12} /> {n} {tokenName(t)}{/each}</span>
        {/if}
        <span class="gets"><Icon name="crown" size={12} /> <b class="num">{p.vp}</b> {points}.{#if p.by === null && funded(p) + 1 < (p.stages?.length ?? 1)}{' '}Reward on completion.{:else if p.by === null || !p.stages}{' '}<ResText text={def(p.key)?.text ?? ''} />{/if}</span>
        {#if p.by !== null}<span class="by">{p.stages ? 'Complete: ' : 'Built by '}{builders(p)}</span>{/if}
      </button>
      <button type="button" class="look" data-look={p.key} aria-label="Details of {def(p.key)?.name ?? p.key}" onclick={() => look(p.key)}><Icon name="eye" size={14} /></button>
    </div>
  {/each}
  {#if onhelp}<button type="button" class="link" data-project-help onclick={onhelp}>How {title} work</button>{/if}
</section>

<Dialog bind:open={lookOpen} title={seen ? (def(seen.key)?.name ?? seen.key) : title}>
  {#if seen}
    <div class="detail">
      {#if artOf?.(seen.key)}<span class="big" aria-hidden="true">{@html artOf(seen.key)}</span>{/if}
      <p class="reward">
        {#if seen.stages && seen.stages.length > 1}
          <b>{seen.stages.length} stages.</b> Anyone may fund the next one, and each funder keeps that stage's {points}. Whoever funds the last stage takes the reward: <ResText text={def(seen.key)?.text ?? ''} />
        {:else}
          <ResText text={def(seen.key)?.text ?? ''} />
        {/if}
      </p>
      {#if seen.stages}
        <ol class="stages">
          {#each seen.stages as s, i (i)}
            <li class:done={s.by !== null} class:now={s === nextStage(seen)} data-stage={i}>
              <span class="stnm">{s.name}</span>
              <span class="num"><ResText text={costText(s.coins, s.tokens)} /></span>
              <span class="num"><Icon name="crown" size={12} /> {s.vp} {points}</span>
              <span class="who">{s.by !== null ? `Funded by ${name(s.by)}` : s === nextStage(seen) ? `Next, costs you ${costText(seen.coins, seen.tokens)} now` : 'Not yet open'}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="num"><ResText text={costText(seen.coins, seen.tokens)} />, for <b>{seen.vp}</b> {points}.</p>
      {/if}
      <p class="status">{seen.by !== null ? `Complete. Built by ${builders(seen)}.` : builders(seen) ? `In progress. So far: ${builders(seen)}.` : 'Nobody has started it.'}</p>
    </div>
  {/if}
</Dialog>

<style>
  .works {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 6px;
    min-width: 0;
    margin-top: 16px;
  }
  .link {
    grid-column: 1 / -1;
    justify-self: start;
    min-height: 32px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink-2);
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }
  .trial {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 12px;
    color: var(--ink-2);
  }
  .slot {
    position: relative;
    display: grid;
    min-width: 0;
  }
  .look {
    position: absolute;
    top: 2px;
    right: 2px;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    color: var(--ink);
    background: var(--ground-1);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
    cursor: pointer;
  }
  /* Keeps the circle small over the art while a thumb still has room to hit it. */
  .look::after {
    content: '';
    position: absolute;
    inset: -9px;
  }
  .prog {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .pip {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px var(--ink-3);
  }
  .pip.full {
    background: var(--coin);
    box-shadow: none;
  }
  .prog .num {
    margin-left: 3px;
    font-size: 12px;
    color: var(--ink-2);
  }
  .stage {
    font-size: 12px;
    color: var(--ink);
  }
  .detail {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .detail p {
    margin: 0;
  }
  .big {
    display: block;
    height: 120px;
    border-radius: var(--r-sm);
    overflow: hidden;
  }
  .big :global(svg),
  .big :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .stages {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stages li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 12px;
    padding: 8px 10px;
    border-radius: var(--r-sm);
    font-size: 14px;
    background: var(--ground-2);
  }
  .stages li.now {
    box-shadow: inset 0 0 0 1px var(--rim-hi);
  }
  .stages li.done {
    color: var(--ink-2);
  }
  .stnm {
    font-weight: 600;
  }
  .who {
    grid-column: 1 / -1;
    font-size: 13px;
    color: var(--ink-2);
  }
  .status {
    font-size: 14px;
    color: var(--ink-2);
  }
  .work {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 6px 8px;
    border: 0;
    border-radius: var(--r-sm);
    font: inherit;
    font-size: 12px;
    text-align: left;
    color: var(--ink-2);
    background: var(--ground-2);
    box-shadow: inset 0 0 0 1px var(--rim-hi);
    transition: transform var(--dur-1) var(--ease-out);
  }
  .work.on {
    cursor: pointer;
    box-shadow: inset 0 0 0 2px var(--sprout);
  }
  .work.on:active {
    transform: scale(0.97);
  }
  .work.taken {
    opacity: 0.6;
  }
  .art {
    display: block;
    height: 24px;
    border-radius: 3px;
    overflow: hidden;
  }
  .art :global(svg),
  .art :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  @media (hover: hover) and (pointer: fine) {
    .work.on:hover {
      transform: translateY(-2px);
    }
  }
  .nm {
    font-size: 13px;
    color: var(--ink);
  }
  .price {
    color: var(--coin);
  }
  .price :global(svg),
  .stages :global(svg),
  .gets > :global(svg) {
    vertical-align: -2px;
  }
</style>
