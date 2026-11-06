<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import { sfx } from '../../../client/lib/sound';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Dialog from '../../../hub/Dialog.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import { INTERCEPTIONS_TO_WIN } from '../rules/engine';
  import type { DAction, DView, Loc, OrderKind, StatementV } from '../rules/types';
  import Board from './Board.svelte';
  import Briefing from './Briefing.svelte';
  import Intel from './Intel.svelte';
  import MissionCard from './MissionCard.svelte';
  import Orders from './Orders.svelte';
  import Report from './Report.svelte';
  import Results from './Results.svelte';
  import Talk from './Talk.svelte';
  import { claimText, iconOf, missionNote } from './text';

  let { conn, room }: GameUiProps = $props();

  const view = $derived(room.game as DView);
  const me = $derived(view.you ?? 0);
  const opp = $derived(1 - me);
  const names = $derived(room.seats.map((s) => s.name));
  const oppSeat = $derived(room.seats[opp]);

  const STEPS = [
    ['briefing', 'Briefing'],
    ['orders', 'Orders'],
    ['report', 'Report'],
  ] as const;

  /** Refusals become a toast; the screen only ever changes when the server's view does. */
  async function act(a: DAction) {
    const r = await conn.act(a);
    if (!r.ok) {
      sfx.error();
      toasts.push(r.error ?? 'Not allowed.', 'error');
    }
    return r;
  }

  // The order being drafted lives here because the board and the panel both edit it. It stays on this device.
  let action = $state<OrderKind | null>(null);
  let target = $state<Loc | null>(null);
  let useCover = $state(false);
  let broadcast = $state<Loc | null>(null);
  let draftRound = 0;
  $effect(() => {
    if (view.round === draftRound) return;
    draftRound = view.round;
    action = target = broadcast = null;
    useCover = false;
  });

  const choosing = $derived(view.phase === 'orders' && !view.mine?.order);
  function pick(l: Loc) {
    target = l;
    if (broadcast === l) broadcast = null;
  }
  const pickable = $derived(choosing ? (l: Loc) => action !== 'deliver' || !!view.mine?.missions.includes(l) : null);

  const wide = new MediaQuery('(min-width: 900px)');
  let tab = $state<'play' | 'talk' | 'intel'>('play');
  const talkShown = $derived(tab === 'talk' || (wide.current && tab === 'play'));

  // Unread marks for the talk tab, which isn't always on screen.
  let seenId = $state(0);
  const lastTalk = $derived(Math.max(0, ...view.chat.filter((c) => c.seat !== me).map((c) => c.id), ...view.statements.filter((s) => s.seat !== me).map((s) => s.id)));
  $effect(() => {
    if (talkShown) seenId = lastTalk;
  });
  const unread = $derived(!talkShown && lastTalk > seenId);

  let playPane = $state<HTMLElement>();
  let heardTalk = 0;
  let heardPhase = '';
  let heardCaps = -1;
  $effect(() => {
    if (lastTalk > heardTalk && heardTalk) sfx.offer();
    heardTalk = lastTalk;
    const caps = view.interceptions[0] + view.interceptions[1];
    if (heardCaps >= 0 && caps > heardCaps) sfx.reject();
    heardCaps = caps;
    if (heardPhase && heardPhase !== view.phase) {
      (view.phase === 'over' ? sfx.end : sfx.turn)();
      playPane?.scrollTo(0, 0);
    }
    heardPhase = view.phase;
  });

  let guideOpen = $state(false);
  let guideDoc = $state<GuideDoc | null>(null);
  function help() {
    guideOpen = true;
    import('./guide').then((m) => (guideDoc = m.guide));
  }
  let quitOpen = $state(false);

  let toChallenge = $state<StatementV | null>(null);
  let challengeOpen = $state(false);
  function askChallenge(st: StatementV) {
    toChallenge = st;
    challengeOpen = true;
  }
  async function challenge() {
    if (!toChallenge) return;
    await act({ type: 'challenge', round: view.round, statement: toChallenge.id });
    challengeOpen = false;
  }
  const sealedKind = $derived(toChallenge?.claim.kind === 'delivered' || toChallenge?.claim.kind === 'notDelivered');
</script>

{#if view.phase === 'over' && view.final}
  <Results {view} {names} {conn} />
{:else}
  <div class="table">
    <header class="top">
      <p class="round label">Round {view.round}<span class="of">of {view.maxRounds}</span></p>
      <ol class="steps" aria-label="Phase">
        {#each STEPS as [id, text] (id)}
          <li class:now={view.phase === id} aria-current={view.phase === id ? 'step' : undefined}>{text}</li>
        {/each}
      </ol>
      <SettingsMenu onhelp={help} onquit={() => (quitOpen = true)} />
    </header>

    <div class="scores" aria-label="Public scores">
      {#each [me, opp] as seat (seat)}
        <div class="agent" class:rival={seat !== me}>
          <span class="who"><span class="dot" class:on={room.seats[seat].connected} title={room.seats[seat].connected ? 'Online' : 'Offline'}></span><span class="nm">{seat === me ? 'You' : names[seat]}</span></span>
          <span class="tally">
            <span class="stat" title="Interceptions"><img src={iconOf('intercept')} alt="Interceptions" width="20" height="20" /><span class="num">{view.interceptions[seat]}/{INTERCEPTIONS_TO_WIN}</span></span>
            <span class="stat" class:off={!view.cover[seat]} title={view.cover[seat] ? 'Holds Cover' : 'No Cover'}><img src={iconOf('cover')} alt="Cover" width="20" height="20" /><span class="num">{view.cover[seat]}</span></span>
            <span class="stat" class:off={!view.challengeToken[seat]} title={view.challengeToken[seat] ? 'Challenge token unused' : 'Challenge token used'}><img src={iconOf('challenge')} alt="Challenge token" width="20" height="20" /><span class="num">{view.challengePoints[seat]}</span><span class="visually-hidden"> Challenge Points, token {view.challengeToken[seat] ? 'unused' : 'used'}</span></span>
          </span>
        </div>
      {/each}
    </div>

    {#if !oppSeat.connected}
      <p class="away" role="status">{names[opp]} is offline. You can keep talking; when their time runs out you can call it and the match moves on.</p>
    {/if}

    <div class="main">
      <!-- All three stay mounted, so a half-written message or statement survives changing tab. -->
      <div class="pane play" bind:this={playPane} class:hide={!wide.current && tab !== 'play'}>
          {#if view.mine}
            <section class="mission" aria-label="Your secret mission">
              <div class="cards">
                {#each view.mine.missions as l (l)}<MissionCard loc={l} count={view.mine.deliveries[l] ?? 0} />{/each}
              </div>
              <p>{missionNote(view.mine)} <span class="muted">Or make {INTERCEPTIONS_TO_WIN} interceptions.</span></p>
            </section>
          {/if}

          <div class="phase">
            {#if view.phase === 'briefing'}
              <Briefing {view} {names} busy={conn.busy} {act} onchallenge={askChallenge} />
            {:else if view.phase === 'orders'}
              <Orders {view} {names} busy={conn.busy} {act} bind:action bind:target bind:useCover bind:broadcast />
            {:else if view.phase === 'report'}
              <Report {view} {names} busy={conn.busy} {act} />
            {/if}
          </div>

          <Board {view} {names} selected={choosing ? target : (view.mine?.order?.target ?? null)} falseSignal={choosing && useCover ? broadcast : (view.mine?.order?.cover ?? null)} {pickable} onpick={pick} />
      </div>
      <div class="pane side" class:hide={!talkShown}><Talk {view} {names} busy={conn.busy} {act} onchallenge={askChallenge} shown={talkShown} /></div>
      <div class="pane side" class:hide={tab !== 'intel'}><Intel {view} {names} /></div>
    </div>

    <nav class="tabs" aria-label="Views">
      {#if !wide.current}<button class:on={tab === 'play'} aria-current={tab === 'play' ? 'page' : undefined} onclick={() => (tab = 'play')}>Mission</button>{/if}
      <button class:on={talkShown} aria-current={talkShown ? 'page' : undefined} onclick={() => (tab = 'talk')}>Talk{#if unread}<span class="new" title="New messages"></span><span class="visually-hidden"> (new)</span>{/if}</button>
      <button class:on={tab === 'intel'} aria-current={tab === 'intel' ? 'page' : undefined} onclick={() => (tab = 'intel')}>Intelligence</button>
    </nav>
  </div>
{/if}

<Dialog bind:open={challengeOpen} title="Spend your one Challenge token?">
  {#if toChallenge}
    <p class="claim">“{claimText(toChallenge.claim)}”</p>
    <p class="body">You have one token for the whole match. Right: you earn a Challenge Point. Wrong: {names[toChallenge.seat]} earns it. Points only break a tie after round {view.maxRounds}, and never end the match.</p>
    {#if sealedKind}
      <p class="body">Whether someone delivered can’t be revealed yet, so this finding stays sealed until the match ends. Both of you will only see that a challenge was made.</p>
    {:else}
      <p class="body">The finding is announced to both of you at once.</p>
    {/if}
    <div class="row">
      <button class="btn" onclick={() => (challengeOpen = false)}>Keep the token</button>
      <button class="btn primary" disabled={conn.busy} onclick={challenge}>Challenge</button>
    </div>
  {/if}
</Dialog>

<Guide bind:open={guideOpen} doc={guideDoc} />
<QuitGame {conn} {room} bind:open={quitOpen} />

<style>
  .table {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-wrap: anywhere;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 10px 4px 14px;
    padding-top: max(4px, env(safe-area-inset-top));
    border-bottom: 1px solid var(--rim);
  }
  .round {
    margin: 0;
    font-size: 20px;
    white-space: nowrap;
  }
  .of {
    color: var(--ink-3);
    font-size: 15px;
    margin-left: 6px;
  }
  .steps {
    list-style: none;
    display: flex;
    flex: 1;
    gap: 4px;
    margin: 0;
    padding: 0;
    font-size: 13px;
    color: var(--ink-3);
    min-width: 0;
  }
  .steps li {
    padding: 2px 8px;
    border-radius: 3px;
  }
  .steps li.now {
    color: var(--sprout-ink);
    background: var(--sprout);
    font-weight: 700;
  }
  .scores {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--rim);
    border-bottom: 1px solid var(--rim);
  }
  .agent {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0 10px;
    padding: 4px 12px;
    background: var(--ground-1);
    min-width: 0;
  }
  .agent.rival {
    background: var(--ground-2);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-weight: 600;
  }
  .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--rim-hi);
  }
  .dot.on {
    background: var(--dd-teal-hi);
  }
  .tally {
    display: flex;
    gap: 10px;
    font-size: 14px;
  }
  .stat {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .stat.off img {
    opacity: 0.35;
    filter: grayscale(1);
  }
  .away {
    margin: 0;
    padding: 6px 14px;
    font-size: 14px;
    background: var(--ground-3);
  }
  .main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }
  .hide {
    display: none !important;
  }
  .pane {
    height: 100%;
    min-height: 0;
  }
  .play {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 12px 16px;
    overflow-y: auto;
  }
  .mission {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
  }
  .mission p {
    margin: 0;
  }
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .muted {
    color: var(--ink-3);
  }
  .phase {
    padding: 10px 12px;
    background: var(--ground-2);
    border: 1px solid var(--rim);
    border-radius: var(--r-md);
  }
  .tabs {
    display: flex;
    border-top: 1px solid var(--rim);
    background: var(--ground-0);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabs button {
    flex: 1;
    min-height: 48px;
    font: inherit;
    font-weight: 600;
    font-size: 14px;
    color: var(--ink-2);
    background: none;
    border: 0;
    border-top: 3px solid transparent;
    cursor: pointer;
  }
  .tabs button.on {
    color: var(--ink);
    border-top-color: var(--sprout);
  }
  .tabs button:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: -2px;
  }
  .new {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-left: 6px;
    border-radius: 50%;
    background: var(--sprout);
    vertical-align: middle;
  }
  .claim {
    margin: 0 0 8px;
    font: 700 16px/1.3 var(--dd-type);
  }
  .body {
    margin: 0 0 8px;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
  /* Desktop: the mission on the left, the record on the right under its own tabs. */
  @media (min-width: 900px) {
    .table {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      grid-template-rows: auto auto auto 48px minmax(0, 1fr);
    }
    .top,
    .scores,
    .away {
      grid-column: 1 / -1;
    }
    .main {
      display: contents;
    }
    .play {
      grid-column: 1;
      grid-row: 4 / 6;
    }
    .tabs {
      grid-column: 2;
      grid-row: 4;
      border-top: 0;
      border-left: 1px solid var(--rim);
    }
    .side {
      grid-column: 2;
      grid-row: 5;
      border-left: 1px solid var(--rim);
    }
  }
  @media (max-width: 520px) {
    .steps {
      font-size: 12px;
      gap: 2px;
    }
    .steps li {
      padding: 2px 5px;
    }
    .of {
      display: none;
    }
  }
</style>
