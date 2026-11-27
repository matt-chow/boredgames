<!--
  The driver's dashboard: an engine gauge (Strain left), a gated gear lever and the hand fanned below. Choices stay on
  this device until "Lock in" sends them; nothing moves on the board until the server reveals every plan.
-->
<script lang="ts">
  import { settings } from '../../../client/lib/settings.svelte';
  import { committable, STRAIN } from '../rules/cards';
  import type { AAction, AView } from '../rules/engine';
  import { canDrive, ENGINE, shiftCost } from '../rules/race';
  import Card from './Card.svelte';
  import { estimate } from './plan';
  import { cardName } from './text';
  import { sounds } from './audio.svelte';

  let {
    view,
    act,
    busy = false,
    onpreview,
  }: { view: AView; act: (a: AAction) => Promise<unknown>; busy?: boolean; onpreview?: (p: { from: number; to: number; checks: { m: number; limit: number; cost: number }[] } | null) => void } = $props();

  const me = $derived(view.me!);
  const ai = $derived(me.ai);
  const car = $derived(view.race!.cars[me.car]);
  const locked = $derived(me.plan);
  const planning = $derived(view.race!.phase === 'plan' && !locked);
  const maxEngine = $derived(Math.max(ENGINE + (ai.me.fit.engine ?? 0), car.engine, 1));

  let gear = $state(1);
  let cards = $state<number[]>([]);
  let discard = $state<number[]>([]);
  let boost = $state(false);
  let mode = $state<'commit' | 'discard'>('commit');
  let lastStep = -1;
  $effect(() => {
    if (view.step === lastStep) return;
    lastStep = view.step;
    gear = locked ? locked.gear : Math.min(4, Math.max(1, car.gear));
    cards = locked ? [...locked.cards] : [];
    discard = locked ? [...locked.discard] : [];
    boost = locked?.boost ?? false;
    mode = 'commit';
  });

  const drive = $derived(canDrive(ai.me));
  const plan = $derived({ gear, cards: drive ? cards : [], discard, boost: drive && boost });
  const est = $derived(estimate(ai, plan));
  const engineAfter = $derived(Math.max(0, car.engine - est.pay));
  const ready = $derived(!est.error && planning);
  $effect(() => onpreview?.(planning || locked ? { from: car.pos, to: car.pos + est.dist, checks: est.checks } : null));

  function setGear(g: number) {
    if (!planning) return;
    gear = g;
    if (cards.length > g) cards = cards.slice(cards.length - g);
    sounds.shift();
  }
  function toggle(i: number) {
    if (!planning) return;
    const c = me.hand[i];
    if (mode === 'discard') {
      if (discard.includes(i)) discard = discard.filter((x) => x !== i);
      else if (c !== STRAIN || (ai.me.fit.dumpStrain ?? 0) > discard.filter((x) => me.hand[x] === STRAIN).length) {
        discard = [...discard, i];
        cards = cards.filter((x) => x !== i);
      }
    } else if (cards.includes(i)) cards = cards.filter((x) => x !== i);
    else if (committable(c)) {
      // A full gear swaps out the earliest card, so a driver can change their mind in one tap.
      cards = [...(cards.length >= gear ? cards.slice(1) : cards), i];
      discard = discard.filter((x) => x !== i);
    }
    sounds.card();
  }
  async function lock() {
    if (!ready) return;
    sounds.lock();
    await act({ type: 'plan', step: view.step, ...plan });
  }
  const retract = () => act({ type: 'retract', step: view.step });

  // Fanned hand: a gentle arc, chosen cards lifted. Transform only.
  const fan = (i: number, n: number) => {
    const mid = (n - 1) / 2;
    const d = i - mid;
    const lift = cards.includes(i) ? -26 : discard.includes(i) ? 10 : 0;
    return `translateY(${(Math.abs(d) ** 1.6 * 2.2 + lift).toFixed(1)}px) rotate(${(d * 3.2).toFixed(1)}deg)`;
  };
  const dial = (v: number) => {
    const a = Math.PI * (1 - v / maxEngine);
    return { x: 60 + Math.cos(a) * 44, y: 62 - Math.sin(a) * 44, deg: -90 + (180 * v) / maxEngine };
  };
  const knob = $derived([[22, 14], [22, 66], [78, 14], [78, 66]][(drive ? gear : 1) - 1]);
  const strainInHand = $derived(me.hand.filter((c) => c === STRAIN).length);
</script>

<section class="dash" aria-label="Your dashboard" class:still={settings.instant}>
  <div class="lay">
  <div class="instruments">
    <figure class="gauge" aria-label="Engine: {car.engine} of {maxEngine} Strain left">
      <svg viewBox="0 0 120 76" aria-hidden="true">
        <path d="M14 62 A46 46 0 0 1 106 62" fill="none" stroke="#1d1a14" stroke-width="12" />
        <path d="M16 62 A44 44 0 0 1 104 62" fill="none" stroke="var(--ax-dial)" stroke-width="8" />
        <path d="M16 62 A44 44 0 0 1 {dial(Math.min(1.2, maxEngine)).x} {dial(Math.min(1.2, maxEngine)).y}" fill="none" stroke="var(--ax-red)" stroke-width="8" />
        {#each Array.from({ length: maxEngine + 1 }, (_, i) => i) as t (t)}
          {@const p = dial(t)}
          <path d="M{60 + (p.x - 60) * 0.78} {62 + (p.y - 62) * 0.78} L{p.x} {p.y}" stroke="#1d1a14" stroke-width="1.6" />
          <text x={60 + (p.x - 60) * 0.62} y={62 + (p.y - 62) * 0.62 + 3} class="tick">{t}</text>
        {/each}
        {#if planning && est.pay}<g style="transform: translate(60px, 62px) rotate({dial(engineAfter).deg}deg)" opacity="0.4"><path d="M-1.5 0 L0 -40 L1.5 0 Z" fill="#1d1a14" /></g>{/if}
        <g class="needle" style="transform: translate(60px, 62px) rotate({dial(car.engine).deg}deg)">
          <path d="M-2.4 4 L0 -42 L2.4 4 Z" fill="var(--ax-red)" />
        </g>
        <circle cx="60" cy="62" r="6" fill="#2a2a27" stroke="var(--ax-chrome)" stroke-width="1.5" />
      </svg>
      <figcaption><b>Engine {car.engine}</b>{#if planning && est.pay}<span> → {engineAfter}</span>{/if}<span class="sub">Strain in hand {strainInHand} · deck {car.deck} · discard {car.discard}</span></figcaption>
    </figure>

    <fieldset class="gate" disabled={!planning || !drive}>
      <legend>Gear</legend>
      <svg viewBox="0 0 100 80" aria-hidden="true" class="h">
        <path d="M22 14 V66 M78 14 V66 M22 40 H78" stroke="#0d0d0c" stroke-width="10" stroke-linecap="round" fill="none" />
        <path d="M22 14 V66 M78 14 V66 M22 40 H78" stroke="#3a3a37" stroke-width="6" stroke-linecap="round" fill="none" />
        {#each [[22, 14], [22, 66], [78, 14], [78, 66]] as [x, y], i (i)}<text x={x + (x < 50 ? -12 : 12)} y={y + 4} class="gl">{i + 1}</text>{/each}
        <g class="knob" style="transform: translate({knob[0]}px, {knob[1]}px)">
          <circle r="9" fill="#1d1a14" /><circle r="7" fill="var(--ax-chrome)" /><circle cx="-2" cy="-2" r="2.5" fill="#fff" opacity="0.7" />
        </g>
      </svg>
      <div class="gears" role="radiogroup" aria-label="Gear">
        {#each [1, 2, 3, 4] as g (g)}
          {@const cost = shiftCost(ai.me, g)}
          <label class="g" class:on={gear === g} class:off={cost == null}>
            <input type="radio" name="ax-gear" value={g} checked={gear === g} disabled={cost == null} onchange={() => setGear(g)} />
            <span class="gn">{g}</span><span class="gc">{cost == null ? 'out of reach' : cost ? `${cost} Strain` : g === car.gear ? 'now' : 'free'}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <div class="readout" aria-live="polite">
      {#if !drive && !locked}
        <p class="big">Clogged</p>
        <p>No card you can commit: you limp 1 space at speed 1 in gear 1.</p>
      {:else}
        <div class="stats">
          <p class="row"><span>Speed</span><b>{est.speed}{est.unknown ? ` + ${est.unknown}?` : ''}</b></p>
          <p class="row"><span>Distance</span><b>{est.dist}{est.unknown ? ` + ${est.unknown}?` : ''}</b></p>
          <p class="row"><span>Cools</span><b>{est.cool}</b></p>
        </div>
        {#if est.catchup}<p class="note">Catch-up: +1 distance, +1 cooling.</p>{/if}
        {#each est.checks.filter((c) => c.cost) as c (c.m)}
          <p class="warn">{c.corner >= 0 ? 'Corner' : 'Pass'} limit {c.limit}: costs {c.cost} Strain{c.cost > engineAfter ? ', you would spin' : ''}</p>
        {/each}
      {/if}
      <label class="boost" class:on={boost}>
          <input type="checkbox" bind:checked={boost} disabled={!planning || !drive} />
          <span>Boost: 1 Strain, turn a card for its value</span>
        </label>
    </div>
  </div>

  <div class="handarea">
  <div class="handbar">
    <div class="modes" role="group" aria-label="What a tap on a card does">
      <button class="btn small" class:primary={mode === 'commit'} aria-pressed={mode === 'commit'} disabled={!planning} onclick={() => (mode = 'commit')}>Commit</button>
      <button class="btn small" class:primary={mode === 'discard'} aria-pressed={mode === 'discard'} disabled={!planning} onclick={() => (mode = 'discard')}>Throw away</button>
      <span class="count">{cards.length}/{drive ? gear : 0} committed{discard.length ? ` · ${discard.length} thrown away` : ''}</span>
    </div>
    {#if locked}
      <div class="lock">
        <span>Plan locked. Waiting for the reveal.</span>
        <button class="btn small" disabled={busy || view.race!.phase !== 'plan'} onclick={retract}>Take back</button>
      </div>
    {:else}
      <div class="lock">
        {#if est.error && planning && (cards.length || !drive)}<span class="err">{est.error}</span>{/if}
        <button class="btn primary" disabled={!ready || busy} onclick={lock}>Lock in {drive ? `gear ${gear}` : 'limp'}</button>
      </div>
    {/if}
  </div>

  <ul class="hand" aria-label="Your hand, {me.hand.length} cards" style="--n: {me.hand.length}">
    {#each me.hand as c, i (i)}
      <li style="transform: {fan(i, me.hand.length)}; z-index: {i}">
        <button
          class="cardbtn"
          class:chosen={cards.includes(i)}
          class:thrown={discard.includes(i)}
          aria-pressed={cards.includes(i) || discard.includes(i)}
          aria-label="{cardName(c)}{cards.includes(i) ? ', committed' : discard.includes(i) ? ', thrown away' : ''}"
          disabled={!planning}
          onclick={() => toggle(i)}
        >
          <Card card={c} />
        </button>
      </li>
    {/each}
  </ul>
  </div>
  </div>
</section>

<style>
  .dash {
    display: grid;
    gap: 8px;
    padding: 10px 12px 14px;
    border-radius: var(--r-md, 8px);
    background:
      linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent 40%),
      #1a2420;
    border: 1px solid var(--rim);
  }
  .dash {
    container-type: inline-size;
  }
  .lay,
  .handarea {
    display: grid;
    gap: 8px;
    min-width: 0;
    align-content: start;
  }
  .handarea {
    container-type: inline-size;
  }
  .instruments {
    display: grid;
    grid-template-columns: 170px minmax(200px, 250px) minmax(170px, 1fr);
    gap: 12px;
    align-items: start;
  }
  /* Wide dashboards put the hand beside the instruments, so the whole table fits one screen. */
  @container (min-width: 860px) {
    .lay {
      grid-template-columns: auto minmax(0, 1fr);
      gap: 16px;
    }
    .instruments {
      grid-template-columns: 150px 220px;
      gap: 8px;
    }
    .readout {
      grid-column: 1 / -1;
    }
  }
  .gauge {
    margin: 0;
    padding: 6px 8px;
    border-radius: 10px;
    background: radial-gradient(circle at 50% 80%, #2a302c, #151b18);
    border: 2px solid var(--ax-chrome);
    box-shadow: 0 0 0 3px #0c100e inset;
  }
  .gauge svg {
    display: block;
    width: 100%;
    max-width: 150px;
    margin: 0 auto;
  }
  .tick {
    font: 700 8px/1 var(--ax-serif);
    fill: #1d1a14;
    text-anchor: middle;
  }
  .needle,
  .knob {
    transition: transform 380ms cubic-bezier(0.3, 1.4, 0.5, 1);
  }
  .still .needle,
  .still .knob,
  .still .hand li {
    transition: none;
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 6px;
    justify-content: center;
    font-size: 13px;
  }
  figcaption .sub {
    flex-basis: 100%;
    text-align: center;
    color: var(--ink-3);
    font-size: 12px;
  }
  .gate {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 8px;
    margin: 0;
    padding: 6px 8px;
    border: 1px solid var(--rim);
    border-radius: 10px;
    background: #121916;
  }
  .gate legend {
    padding: 0 4px;
    font: 700 12px/1 var(--ax-serif);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .h {
    width: 90px;
  }
  .gl {
    font: 700 11px/1 'Big Shoulders Stencil', var(--ax-serif);
    fill: var(--ink-2);
    text-anchor: middle;
  }
  .gears {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .g {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 44px;
    padding: 2px 8px;
    border: 1px solid var(--rim);
    border-radius: 6px;
    cursor: pointer;
  }
  .g input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: inherit;
  }
  .g:has(input:focus-visible) {
    outline: 2px solid var(--sprout);
    outline-offset: 1px;
  }
  .g.on {
    border-color: var(--sprout);
    background: color-mix(in srgb, var(--sprout) 16%, transparent);
  }
  .g.off {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .gn {
    font: 700 20px/1 'Big Shoulders Stencil', var(--ax-serif);
  }
  .gc {
    font-size: 11px;
    color: var(--ink-3);
  }
  .readout {
    display: grid;
    gap: 2px;
    font-size: 13px;
  }
  .readout p {
    margin: 0;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .readout .row {
    display: flex;
    flex-direction: column;
    padding: 2px 0;
    border-bottom: 1px dotted var(--rim);
  }
  .readout b,
  .readout .big {
    font: 700 18px/1 'Big Shoulders Stencil', var(--ax-serif);
  }
  .note {
    color: var(--ink-2);
  }
  .warn,
  .err {
    color: #f0a08f;
  }
  .boost {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
  }
  .handbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .modes,
  .lock {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  .count {
    color: var(--ink-3);
  }
  .hand {
    display: flex;
    justify-content: center;
    margin: 0;
    padding: 26px 0 18px;
    list-style: none;
  }
  .hand li {
    margin: 0 -8px;
    transform-origin: 50% 120%;
    transition: transform 220ms cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  /* The fan, overlapping 16px per card, is sized to fit the row; 48px spare covers the tilt of the end cards. */
  .hand li :global(.card) {
    --w: clamp(48px, calc((100cqi - 48px + (var(--n) - 1) * 16px) / var(--n)), 108px);
  }
  .cardbtn {
    display: block;
    padding: 0;
    border: 0;
    background: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .cardbtn:disabled {
    cursor: default;
  }
  .cardbtn:focus-visible {
    outline: 3px solid var(--sprout);
    outline-offset: 2px;
  }
  .cardbtn.chosen :global(.card) {
    box-shadow:
      0 0 0 3px var(--sprout),
      0 14px 22px -8px rgb(0 0 0 / 0.7);
  }
  .cardbtn.thrown :global(.card) {
    opacity: 0.5;
  }
  @media (max-width: 760px) {
    .instruments {
      grid-template-columns: 1fr 1fr;
    }
    .readout {
      grid-column: 1 / -1;
    }
    .gate {
      grid-template-columns: 1fr;
    }
    .h {
      display: none;
    }
  }
</style>
