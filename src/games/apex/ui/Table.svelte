<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { settings } from '../../../client/lib/settings.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import type { AAction, AView } from '../rules/engine';
  import { MAX_UPGRADES } from '../rules/season';
  import Art from './Art.svelte';
  import { livery, paint } from './assets';
  import { prefs, sounds } from './audio.svelte';
  import Board, { type Preview } from './Board.svelte';
  import Coach from './Coach.svelte';
  import Dashboard from './Dashboard.svelte';
  import Replay from './Replay.svelte';
  import Spot from './Spot.svelte';
  import { circuitName, eventInfo, fitText, MODE_NAMES, ordinal, pressInfo, rivalInfo, sectorInfo, sponsorInfo, upgradeName, weatherInfo, cardText, isPartCard, turnText } from './text';
  import './theme.css';

  let { conn, room }: GameUiProps = $props();

  const view = $derived(room.game as AView);
  const seat = $derived(view.seat);
  const race = $derived(view.race);
  const me = $derived(view.me);
  const wide = new MediaQuery('min-width: 1040px');

  async function act(a: AAction) {
    const r = await conn.act(a);
    // A stale action raced a table that already moved on; the fresh view is on its way, so there is nothing to report.
    if (!r.ok && r.code !== 'stale') toasts.push(r.error ?? 'Not allowed.', 'error');
    return r;
  }

  const nameOf = (c: { seat: number | null; name: string }) => (c.seat != null ? (c.seat === seat ? 'You' : (room.seats[c.seat]?.name ?? c.name)) : c.name);
  const driverName = (i: number) => {
    const d = view.season.drivers[i];
    return d.seat != null ? (d.seat === seat ? 'You' : (room.seats[d.seat]?.name ?? d.name)) : d.name;
  };
  const order = $derived(
    race
      ? [...race.cars].sort((a, b) => (a.done || b.done ? (a.done?.place ?? 99) - (b.done?.place ?? 99) : b.pos - a.pos || a.lane - b.lane))
      : [],
  );
  const lapOf = (pos: number) => (race ? Math.min(race.laps, Math.floor(Math.max(0, pos) / race.n) + 1) : 1);
  const leaderLap = $derived(order[0] ? (order[0].done ? race!.laps : lapOf(order[0].pos)) : 1);

  // ---- Who are we waiting for? --------------------------------------------------------------------------------------
  const people = $derived(race ? race.cars.filter((c) => c.seat != null && !c.done) : []);
  const waiting = $derived(race?.phase === 'plan' ? people.filter((c) => !c.planned && !view.autopilot.includes(c.seat!)) : []);
  const away = $derived(room.seats.filter((s) => !s.connected && !s.bot && !view.autopilot.includes(s.seat)));
  const mayHandOver = $derived(seat === 0 || (seat != null && !room.seats[0]?.connected));
  const onAutopilot = $derived(seat != null && view.autopilot.includes(seat));
  const myTurn = $derived(race?.phase === 'turn' && !!me && race.turn?.car === me.car);

  let now = $state(Date.now());
  const clock = setInterval(() => (now = Date.now()), 250);
  onDestroy(() => clearInterval(clock));
  // shortcut: compares the server's deadline with this device's clock; a badly set clock shows a skewed countdown.
  const secs = $derived(view.deadline ? Math.max(0, Math.ceil((view.deadline - now) / 1000)) : null);

  const status = $derived.by(() => {
    if (view.phase === 'over') return view.season.champ ? 'The season is over.' : 'The race is over.';
    if (view.phase === 'podium') return 'The race is over. Check the results, then carry on.';
    if (view.phase === 'draft') {
      const d = view.season.draft;
      return d && d.order[0] === seat ? 'Your pick in the upgrade draft.' : `Upgrade draft: ${d ? driverName(d.order[0]) : ''} picks.`;
    }
    if (!race) return '';
    if (race.phase === 'turn') {
      const t = race.turn!;
      if (!myTurn) return `${nameOf(race.cars[t.car])} is driving.`;
      return t.stage === 'react' ? 'Your move: cool, boost or take catch-up, then Continue.' : t.stage === 'draft' ? 'Slipstream on offer: take it or decline.' : 'Throw away any cards you like, then Finish turn.';
    }
    if (me && !me.plan) return onAutopilot ? 'The computer is driving your car.' : 'Your move: choose a gear and commit cards.';
    if (waiting.length) return `Waiting for ${waiting.map(nameOf).join(', ')}.`;
    return 'Revealing…';
  });
  const myMove = $derived((me && !me.plan && race?.phase === 'plan') || myTurn || (view.phase === 'draft' && view.season.draft?.order[0] === seat));

  let preview = $state<Preview | null>(null);

  // ---- Confirmed-state cues. --------------------------------------------------------------------------------------
  onMount(() =>
    conn.onRoom((next, prev) => {
      const nv = next.game as AView | null, pv = prev?.game as AView | null;
      if (!nv || !pv || next.version === prev!.version) return;
      if (nv.race && pv.race && nv.race.round !== pv.race.round) {
        sounds.reveal();
        if (nv.race.last.some((r) => r.spun)) sounds.spin();
      }
      if (nv.race?.finished.length && nv.race.finished.length !== pv.race?.finished.length) sounds.flag();
      const mineNow = nv.me && !nv.me.plan && nv.race?.phase === 'plan';
      if (mineNow && nv.race!.round !== pv.race?.round) sounds.turn();
    }),
  );

  // ---- Help, quitting, replays. -------------------------------------------------------------------------------------
  let guideOpen = $state(false);
  let guideAt = $state<string | null>(null);
  let guideDoc = $state<GuideDoc | null>(null);
  function rules(at: string | null = null) {
    guideAt = at;
    guideOpen = true;
    import('./guide').then((m) => (guideDoc = m.guide));
  }
  let quitOpen = $state(false);
  let replayAt = $state<number | null>(null);
  let introDone = $state(false);
  const showIntro = $derived(!introDone && !prefs.skipIntro && !settings.instant && race?.round === 1 && view.phase === 'race' && !race.last.length);

  // ---- Draft between races. ---------------------------------------------------------------------------------------
  let take = $state<string | null>(null);
  let give = $state<string | null>(null);
  const myDriver = $derived(seat != null ? view.season.drivers[seat] : null);
  const full = $derived(!!myDriver && myDriver.upgrades.length >= MAX_UPGRADES);
  async function pick(pass = false) {
    await act({ type: 'pick', step: view.step, take: pass ? null : take, give: pass || !full ? null : give });
    take = give = null;
  }

  const lastResult = $derived(view.season.results.at(-1) ?? null);
  const resultArt = $derived(paint(view.season.champ && view.phase === 'over' ? 'misc.trophy' : `poster.${lastResult?.circuit}`));
  const rows = $derived(lastResult ? lastResult.rows.map((r, i) => ({ ...r, i })).filter((r) => r.place).sort((a, b) => a.place - b.place) : []);
  const earnedName = (id: string) => pressInfo(id)?.name ?? sponsorInfo(id)?.name ?? id;
  const weather = $derived(race ? weatherInfo(race.weather) : null);
  const event = $derived(race ? eventInfo(race.event) : null);
  async function rematch() {
    const r = await conn.send({ t: 'rematch' });
    if (!r.ok) toasts.push(r.error ?? 'Could not start a rematch.', 'error');
  }
</script>

<Art />
<div class="apex" class:wide={wide.current} class:still={settings.instant}>
  <header class="top">
    <p class="title">
      <span class="label">Apex ’66</span>
      <span class="sub">{MODE_NAMES[view.mode]}{race ? ` · ${circuitName(race.circuit)} · lap ${leaderLap} of ${race.laps} · round ${race.round}` : ''}{view.season.champ ? ` · race ${view.season.index + 1} of ${view.season.races.length}` : ''}</span>
    </p>
    <button class="btn small ghost" onclick={() => rules()}>Rules</button>
    <SettingsMenu onhelp={() => rules()} onquit={() => (quitOpen = true)}>
      <div class="axset" role="group" aria-label="Apex sound and pace">
        <p class="subhead">Apex ’66</p>
        <label><input type="checkbox" bind:checked={prefs.sfx} /> Sound effects</label>
        <label class="range">Effects volume <input type="range" min="0" max="1" step="0.05" bind:value={prefs.sfxVol} disabled={!prefs.sfx} /></label>
        <label><input type="checkbox" bind:checked={prefs.skipIntro} /> Skip the grid introduction and podium</label>
        <label><input type="checkbox" bind:checked={prefs.skipAnim} /> Skip car animations</label>
        <label class="range">Animation speed <input type="range" min="0.5" max="2" step="0.25" bind:value={prefs.pace} disabled={prefs.skipAnim || settings.instant} /></label>
      </div>
    </SettingsMenu>
  </header>

  <p class="status" class:mine={myMove} role="status">
    <span>{status}</span>
    {#if secs !== null}<span class="timer" class:late={secs <= 10}>{secs}s</span>{/if}
  </p>

  {#if away.length && view.phase !== 'over'}
    <div class="banner" role="alert">
      <span>{away.map((s) => s.name).join(' and ')} lost connection. {view.config.timer ? 'The timer is stopped. ' : ''}Their car waits for them.</span>
      {#if mayHandOver}
        {#each away as s (s.seat)}<button class="btn small" disabled={conn.busy} onclick={() => act({ type: 'autopilot', step: view.step, seat: s.seat, on: true })}>Let the computer drive for {s.name}</button>{/each}
      {/if}
    </div>
  {/if}
  {#if onAutopilot}
    <div class="banner" role="status">
      <span>The computer drove your car while you were away.</span>
      <button class="btn small primary" disabled={conn.busy} onclick={() => act({ type: 'autopilot', step: view.step, seat: seat!, on: false })}>Drive again</button>
    </div>
  {/if}
  {#if view.timedOut.includes(seat ?? -1) && me && !me.plan}
    <p class="note">The timer ran out last round, so a careful plan was locked for you.</p>
  {/if}

  <div class="main">
    {#if race}
      <section class="boardwrap" aria-label="Circuit">
        <Board {race} mine={race.cars.find((c) => c.seat === seat && seat != null)?.id ?? null} fit={me?.ai.me.fit ?? {}} preview={myMove || me?.plan ? preview : null} label="{circuitName(race.circuit)}, lap {leaderLap} of {race.laps}" />
        {#if showIntro}
          <div class="sheet" role="dialog" aria-modal="true" aria-label="Grid introduction">
            <div class="poster">
              {#if paint(`poster.${race.circuit}`)}<img class="band-art" src={paint(`poster.${race.circuit}`)} alt="" decoding="async" />{/if}
              <p class="kicker">Round {view.season.index + 1}{view.season.champ ? ` of ${view.season.races.length}` : ''}</p>
              <h2>{circuitName(race.circuit)}</h2>
              <p>{race.laps} {race.laps === 1 ? 'lap' : 'laps'} · {race.cars.length} cars · {weather?.name}</p>
              {#if event}<p>{event.name}: {event.text}</p>{/if}
              <button class="btn primary" onclick={() => (introDone = true)}>To the grid</button>
            </div>
          </div>
        {/if}
      </section>
    {/if}

    {#if me && race && view.phase === 'race'}
      <div class="dashwrap">
        <Dashboard {view} {act} busy={conn.busy} onpreview={(p) => (preview = p)} />
      </div>
    {/if}

    <aside class="side" aria-label="Race information">
      {#if race}
        <section class="panel">
          <h3>Running order</h3>
          <ol class="order">
            {#each order as c (c.id)}
              {@const l = livery(c.livery)}
              <li class:me={c.id === me?.car}>
                <span class="chip" style="background: {l.body}; color: {l.stripe}">{c.number}</span>
                <span class="who">
                  <b>{nameOf(c)}</b>
                  <small>
                    {#if c.done}Finished {ordinal(c.done.place)}{:else}Lap {lapOf(c.pos)} · gear {c.gear} · engine {c.engine} · {c.hand} cards{/if}
                    {#if c.spun} · spun{/if}
                    {#if c.rival} · <Spot id="rival.{c.rival}" size={18} round /> {rivalInfo(c.rival)?.name}{/if}
                  </small>
                </span>
                {#if race.phase === 'plan' && !c.done}<span class="ok" class:on={c.planned} title={c.planned ? 'Plan locked' : 'Still planning'}>{c.planned ? '✓' : '…'}</span>{/if}
              </li>
            {/each}
          </ol>
        </section>
        {#if race.last.length}
          <details class="panel history" open={wide.current}>
            <summary><h3>Round {race.round}</h3></summary>
            <ol class="plain">
              {#each race.last as r (r.car)}<li><b>{nameOf(race.cars[r.car])}</b>: {turnText(r)}</li>{/each}
            </ol>
          </details>
        {/if}
        <section class="panel">
          <h3>Conditions</h3>
          <p class="lined"><Spot id="weather.{race.weather}" /><span><b>{weather?.name}</b>: {weather?.text}</span></p>
          {#if race.sectors.some((s) => s !== 'none')}
            <ul class="plain">{#each race.sectors as s, i (i)}{#if s !== 'none'}<li>Sector {i + 1}: <b>{sectorInfo(s)?.name}</b>, {sectorInfo(s)?.text}</li>{/if}{/each}</ul>
          {/if}
          {#if event}<p class="lined"><Spot id="event.{race.event}" /><span><b>{event.name}</b>: {event.text}</span></p>{/if}
          {#if view.press.length}
            <p class="h4">Press objectives</p>
            <ul class="plain lined">{#each view.press as p (p)}<li><Spot id="press.{p}" size={32} /><span><b>{pressInfo(p)?.name}</b>: {pressInfo(p)?.text}</span></li>{/each}</ul>
          {/if}
          {#if myDriver?.sponsor}<p class="lined"><Spot id="sponsor.{myDriver.sponsor}" /><span><b>Sponsor {sponsorInfo(myDriver.sponsor)?.name}</b>: {sponsorInfo(myDriver.sponsor)?.text}</span></p>{/if}
          {#if me && myDriver?.upgrades.length}
            <p class="h4">Your upgrades</p>
            <ul class="plain lined">{#each myDriver.upgrades as u (u)}<li><Spot id="part.{u}" size={32} /><span><b>{upgradeName(u)}</b>: {isPartCard(u) ? `a card in your deck. ${cardText(u)}` : cardText(u)}</span></li>{/each}</ul>
          {/if}
          <button class="btn small ghost" onclick={() => rules('corners')}>How corners work</button>
        </section>
      {/if}
      {#if view.season.champ}
        <section class="panel">
          <h3>Championship</h3>
          <ol class="order">
            {#each view.season.standings as d (d)}
              <li><span class="chip" style="background: {livery(view.season.drivers[d].livery).body}">{view.season.drivers[d].number}</span><span class="who"><b>{driverName(d)}</b></span><b>{view.season.drivers[d].points}</b></li>
            {/each}
          </ol>
        </section>
      {/if}
      {#if view.mode === 'school'}<Coach {view} onrules={rules} />{/if}
    </aside>

  </div>

  {#if view.phase === 'podium' || view.phase === 'over'}
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ax-podium-h">
      <div class="poster results">
        {#if resultArt}<img class="band-art" src={resultArt} alt="" decoding="async" />{/if}
        <p class="kicker">{lastResult ? circuitName(lastResult.circuit) : ''}</p>
        <h2 id="ax-podium-h">{view.phase === 'over' && view.season.champ ? 'Final standings' : 'Results'}</h2>
        {#if !prefs.skipIntro && !settings.instant && rows.length >= 3}
          <div class="steps" aria-hidden="true">
            {#each [1, 0, 2] as k (k)}<div class="step s{k + 1}"><span class="chip" style="background: {livery(view.season.drivers[rows[k].i].livery).body}">{view.season.drivers[rows[k].i].number}</span><b>{driverName(rows[k].i)}</b><span class="pl">{k + 1}</span></div>{/each}
          </div>
        {/if}
        <table>
          <thead><tr><th>Place</th><th>Driver</th><th>Points</th><th>Bonus</th></tr></thead>
          <tbody>
            {#each rows as r (r.i)}
              <tr class:me={view.season.drivers[r.i].seat === seat && seat != null}>
                <td>{ordinal(r.place)}</td><td>{driverName(r.i)}{#if r.earned.length}<small> · {r.earned.map(earnedName).join(', ')}</small>{/if}</td><td>{r.points}</td><td>{r.bonus || ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if view.season.champ}
          <h3>Championship</h3>
          <ol class="plain standings">{#each view.season.standings as d, k (d)}<li>{ordinal(k + 1)} {driverName(d)}: <b>{view.season.drivers[d].points}</b> points</li>{/each}</ol>
        {/if}
        <div class="actions">
          {#if view.phase === 'podium'}
            {#if seat != null && !view.ready.includes(seat)}<button class="btn primary" disabled={conn.busy} onclick={() => act({ type: 'ready', step: view.step })}>{view.season.champ ? 'On to the draft' : 'Continue'}</button>{:else}<span>Waiting for the others…</span>{/if}
            {#if view.season.champ && !view.shelved}<button class="btn" disabled={conn.busy} onclick={() => act({ type: 'shelve', step: view.step })} title="Keep the season for 90 days instead of 30">Save the season for later</button>{/if}
            {#if view.shelved}<span class="muted">Season saved: kept for 90 days.</span>{/if}
          {:else}
            <button class="btn primary" disabled={conn.busy} onclick={rematch}>Race again</button>
          {/if}
          {#if view.replays.length}<button class="btn ghost" onclick={() => (replayAt = view.replays.length - 1)}>Watch the replay</button>{/if}
        </div>
      </div>
    </div>
  {/if}

  {#if view.phase === 'draft' && view.season.draft}
    {@const d = view.season.draft}
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ax-draft-h">
      <div class="poster draft">
        <p class="kicker">Next: {circuitName(view.season.races[view.season.index + 1] ?? view.season.races[view.season.index])}</p>
        <h2 id="ax-draft-h">Upgrade draft</h2>
        <p>Picks go from the back of the championship forward: {d.order.map(driverName).join(', ')}.</p>
        <ul class="offer">
          {#each d.offer as u (u)}
            <li>
              <button class="part" class:on={take === u} aria-pressed={take === u} disabled={d.order[0] !== seat} onclick={() => (take = take === u ? null : u)}>
                <Spot id="part.{u}" size={56} /><b>{upgradeName(u)}</b><span>{isPartCard(u) ? `Card: ${cardText(u)}` : cardText(u)}</span>
              </button>
            </li>
          {/each}
        </ul>
        {#if d.order[0] === seat}
          {#if full && take}
            <p>You carry {MAX_UPGRADES} upgrades. Hand one back:</p>
            <div class="gives">{#each myDriver!.upgrades as u (u)}<button class="btn small" class:primary={give === u} aria-pressed={give === u} onclick={() => (give = u)}>{upgradeName(u)}</button>{/each}</div>
          {/if}
          <div class="actions">
            <button class="btn primary" disabled={!take || (full && !give) || conn.busy} onclick={() => pick()}>Fit it</button>
            <button class="btn" disabled={conn.busy} onclick={() => pick(true)}>Pass</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if replayAt !== null}<Replay replays={view.replays} at={replayAt} names={(c) => nameOf(c)} onclose={() => (replayAt = null)} />{/if}
<Guide bind:open={guideOpen} doc={guideDoc} at={guideAt} />
<QuitGame {conn} {room} bind:open={quitOpen} />

<style>
  .apex {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    overflow-y: auto;
    padding: 8px 12px 16px;
    color: var(--ink);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .title {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    margin: 0;
  }
  .title .label {
    font: 700 26px/1 'Big Shoulders Stencil', var(--ax-serif);
    letter-spacing: 0.04em;
    color: var(--ax-paper);
  }
  .title .sub {
    font-size: 13px;
    color: var(--ink-3);
  }
  .axset {
    display: grid;
    gap: 6px;
  }
  .status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin: 0;
    min-height: 40px;
    padding: 6px 12px;
    border-radius: var(--r-md, 8px);
    background: var(--ground-2);
    border: 1px solid var(--rim);
    font-weight: 600;
  }
  .status.mine {
    border-color: var(--sprout);
    box-shadow: 0 0 0 1px var(--sprout) inset;
  }
  .timer {
    font: 700 20px/1 'Big Shoulders Stencil', var(--ax-serif);
  }
  .timer.late {
    color: #f0a08f;
  }
  .banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--r-md, 8px);
    background: #3a2a1a;
    border: 1px solid var(--ax-mustard);
  }
  .note,
  .muted {
    margin: 0;
    color: var(--ink-3);
    font-size: 13px;
  }
  .main {
    display: grid;
    gap: 10px;
  }
  /* On a desk the table fits one screen: the board takes what the dashboard leaves, the side panel scrolls. */
  .wide .main {
    flex: 1 0 auto;
    grid-template-columns: minmax(0, 1fr) 320px;
    grid-template-rows: minmax(260px, 1fr) auto;
    grid-template-areas: 'board side' 'dash side';
  }
  .boardwrap {
    position: relative;
    aspect-ratio: 16 / 10;
    max-height: 55dvh;
    min-width: 0;
  }
  .wide .boardwrap {
    grid-area: board;
    aspect-ratio: auto;
    max-height: none;
    contain: size;
  }
  /* Size containment keeps a long side panel from stretching the rows; it scrolls instead. A short window scrolls the page. */
  .wide .side {
    grid-area: side;
    contain: size;
    overflow-y: auto;
  }
  .wide .dashwrap {
    grid-area: dash;
  }
  .side {
    display: grid;
    gap: 10px;
    align-content: start;
  }
  .dashwrap {
    display: grid;
    gap: 8px;
  }
  .panel {
    padding: 10px 12px;
    border-radius: var(--r-md, 8px);
    background: var(--ground-1);
    border: 1px solid var(--rim);
    font-size: 13px;
  }
  .panel h3,
  .poster h3 {
    margin: 0 0 6px;
    font: 700 14px/1 var(--ax-serif);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .panel p {
    margin: 0 0 6px;
  }
  .h4 {
    font-weight: 700;
    color: var(--ink-2);
  }
  .plain {
    margin: 0 0 6px;
    padding-left: 16px;
  }
  /* A painted spot beside its line; without the painting the text sits as before. */
  .lined,
  .lined li {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  ul.lined {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  .band-art {
    display: block;
    width: calc(100% + 48px);
    height: clamp(120px, 26vh, 220px);
    margin: -12px -24px 10px;
    object-fit: cover;
    object-position: 50% 62%;
  }
  .order {
    display: grid;
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .order li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 4px;
    border-radius: 6px;
  }
  .order li.me {
    background: color-mix(in srgb, var(--sprout) 14%, transparent);
  }
  .chip {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font: 700 14px/1 'Big Shoulders Stencil', var(--ax-serif);
    color: var(--ax-paper);
    border: 2px solid var(--ax-paper);
  }
  .who {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .who small {
    color: var(--ink-3);
  }
  .ok {
    color: var(--ink-3);
  }
  .ok.on {
    color: var(--sprout);
  }
  .sheet {
    display: grid;
    place-items: center;
    padding: 16px;
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgb(11 19 16 / 0.8);
    overflow: auto;
  }
  .poster {
    max-width: 640px;
    width: 100%;
    padding: 22px 24px;
    border-radius: 4px;
    color: var(--ax-paper-ink);
    background:
      linear-gradient(180deg, var(--ax-red) 0 10px, transparent 10px),
      var(--ax-paper);
    box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.8);
    animation: rise 320ms cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  .still .poster {
    animation: none;
  }
  @keyframes rise {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
  }
  .poster h2 {
    margin: 2px 0 8px;
    font: 700 44px/0.95 'Big Shoulders Stencil', var(--ax-serif);
    letter-spacing: 0.01em;
  }
  .poster .kicker {
    margin: 6px 0 0;
    font: 700 13px/1 var(--ax-serif);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ax-red);
  }
  .poster h3 {
    margin-top: 14px;
    color: var(--ax-paper-ink-2);
  }
  .poster table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .poster th {
    text-align: left;
    font: 700 11px/1 var(--ax-serif);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border-bottom: 2px solid var(--ax-paper-ink);
    padding: 4px;
  }
  .poster td {
    padding: 5px 4px;
    border-bottom: 1px solid #cdbf9c;
  }
  .poster tr.me td {
    font-weight: 700;
  }
  .poster small {
    color: var(--ax-paper-ink-2);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: end;
    gap: 6px;
    margin: 8px 0 12px;
  }
  .step {
    display: grid;
    justify-items: center;
    gap: 4px;
    padding-bottom: 6px;
    font-size: 13px;
    text-align: center;
  }
  .step .pl {
    width: 100%;
    display: grid;
    place-items: center;
    font: 700 28px/1 'Big Shoulders Stencil', var(--ax-serif);
    background: var(--ax-paper-ink);
    color: var(--ax-paper);
  }
  .s1 .pl {
    height: 74px;
    background: var(--ax-red);
  }
  .s2 .pl {
    height: 52px;
  }
  .s3 .pl {
    height: 38px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
  }
  .poster :global(.btn:not(.primary)) {
    color: var(--ax-paper-ink);
    border-color: var(--ax-paper-ink-2);
    background: transparent;
  }
  .offer {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 8px;
    margin: 10px 0;
    padding: 0;
    list-style: none;
  }
  .part {
    display: grid;
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 10px;
    text-align: left;
    font: inherit;
    font-size: 13px;
    color: var(--ax-paper-ink);
    background: #fffaf0;
    border: 2px solid #cdbf9c;
    border-radius: 6px;
    cursor: pointer;
  }
  .part:disabled {
    cursor: default;
  }
  .part.on {
    border-color: var(--sprout);
    box-shadow: 0 0 0 2px var(--sprout);
  }
  .part:focus-visible {
    outline: 3px solid var(--sprout);
  }
  .gives {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .standings {
    padding-left: 0;
    list-style: none;
  }
</style>
