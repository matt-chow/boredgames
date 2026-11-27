<!--
  Replay viewer (AX-REP-1/2): rebuilds a finished race round by round from its replay, using the same engine the
  server ran, and draws each frame on the board. Exported files can be loaded back here.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { settings } from '../../../client/lib/settings.svelte';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Dialog from '../../../hub/Dialog.svelte';
  import type { Replay } from '../rules/engine';
  import { exportReplay, importReplay, replayFrames } from '../rules/replay';
  import Board from './Board.svelte';
  import { circuitName, ordinal } from './text';

  let { replays, at, names, onclose }: { replays: Replay[]; at: number; names: (c: { seat: number | null; name: string }) => string; onclose: () => void } = $props();

  let open = $state(true);
  $effect(() => {
    if (!open) onclose();
  });
  let loaded = $state<Replay | null>(null);
  // svelte-ignore state_referenced_locally
  let index = $state(at);
  const rep = $derived(loaded ?? replays[index]);
  const frames = $derived.by(() => {
    try {
      return replayFrames(rep);
    } catch {
      return [];
    }
  });
  let frame = $state(0);
  $effect(() => {
    void rep;
    frame = 0;
  });
  const race = $derived(frames[Math.min(frame, frames.length - 1)]);

  let timer: ReturnType<typeof setInterval> | null = null;
  let playing = $state(false);
  function play() {
    if (playing) return stop();
    if (frame >= frames.length - 1) frame = 0;
    playing = true;
    timer = setInterval(() => (frame < frames.length - 1 ? frame++ : stop()), settings.instant ? 600 : 1400);
  }
  function stop() {
    playing = false;
    if (timer) clearInterval(timer);
    timer = null;
  }
  onDestroy(stop);

  function save() {
    const url = URL.createObjectURL(new Blob([exportReplay(rep)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex66-${rep.setup.circuit}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function load(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f) return;
    try {
      loaded = importReplay(await f.text());
    } catch {
      toasts.push('That file is not an Apex ’66 replay this version can play.', 'error');
    }
  }
  const finish = $derived(race ? [...race.cars].filter((c) => c.done).sort((a, b) => a.done!.place - b.done!.place) : []);
</script>

<Dialog bind:open title="Replay" wide>
  {#if race}
    <p class="meta">
      {circuitName(race.circuit)} · {race.laps} {race.laps === 1 ? 'lap' : 'laps'} ·
      {frame === 0 ? 'the grid' : `after round ${frame}`} of {frames.length - 1}
    </p>
    <div class="board"><Board {race} mine={null} fit={{}} preview={null} label="Replay of {circuitName(race.circuit)}, round {frame}" /></div>
    <div class="ctl">
      <button class="btn small" onclick={play} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>
      <label class="scrub">Round <input type="range" min="0" max={frames.length - 1} bind:value={frame} oninput={stop} /></label>
    </div>
    {#if finish.length}<p class="meta">{finish.map((c) => `${ordinal(c.done!.place)} ${names(c)}`).join(' · ')}</p>{/if}
  {:else}
    <p>This replay could not be rebuilt.</p>
  {/if}
  <div class="ctl">
    {#if !loaded && replays.length > 1}
      <label>Race
        <select bind:value={index}>{#each replays as r, i (i)}<option value={i}>{i + 1}. {circuitName(r.setup.circuit)}</option>{/each}</select>
      </label>
    {/if}
    {#if loaded}<button class="btn small ghost" onclick={() => (loaded = null)}>Back to this table’s races</button>{/if}
    <button class="btn small" onclick={save}>Export</button>
    <label class="btn small ghost file">Load a replay file<input type="file" accept="application/json,.json" onchange={load} /></label>
  </div>
</Dialog>

<style>
  .meta {
    margin: 0 0 8px;
    color: var(--ink-2);
    font-size: 14px;
  }
  .board {
    aspect-ratio: 16 / 10;
    margin-bottom: 8px;
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .scrub {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .scrub input {
    flex: 1;
  }
  .file {
    position: relative;
    overflow: hidden;
  }
  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .file:has(input:focus-visible) {
    outline: 2px solid var(--sprout);
  }
  select {
    font: inherit;
    min-height: 36px;
    color: var(--ink);
    background: var(--ground-0);
    border: 1px solid var(--rim);
    border-radius: var(--r-sm, 6px);
  }
</style>
