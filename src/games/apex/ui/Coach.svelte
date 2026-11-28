<!--
  Driving School's coach: one lesson at a time, chosen from what is on the driver's own dashboard right now. Lessons
  read only the driver's view, so the coach knows nothing the driver does not.
-->
<script lang="ts">
  import { HEAT, STRESS } from '../rules/cards';
  import type { AView } from '../rules/engine';
  import Spot from './Spot.svelte';

  let { view, onrules }: { view: AView; onrules: (at: string) => void } = $props();

  interface Lesson { id: string; title: string; text: string; at: string; when: (v: AView) => boolean }
  const LESSONS: Lesson[] = [
    { id: 'gear', title: 'Gears', at: 'gears', when: (v) => v.race!.round === 1,
      text: 'Your gear is how many cards you commit this round. Gear 1 commits one card, gear 4 commits four. Going up or down one gear is free; jumping two costs 1 Heat. Gear 1 cools 3 Heat and gear 2 cools 1, so slow rounds rest the engine.' },
    { id: 'cards', title: 'Speed is the cards', at: 'gears', when: (v) => v.race!.round === 1,
      text: 'Add up the committed cards: that is your speed and how far you move. Tap cards to commit them, then press Lock in. The other drivers plan at the same time, and nobody sees anything until everyone has locked in.' },
    { id: 'corner', title: 'Corners', at: 'corners', when: (v) => !!v.me && v.race!.last.length > 0,
      text: 'Only the round roundels are corners. Each shows a speed limit. Cross one faster than its limit and you pay the difference in Heat. Bends without a roundel are free, whatever they look like. The dashed line on the board shows your move and what each corner would cost.' },
    { id: 'heat', title: 'Heat', at: 'heat', when: (v) => !!v.me?.hand.includes(HEAT),
      text: 'Paying Heat moves a card from your engine into your discard. It comes back into your hand later and clogs it, because Heat cannot be committed. Cooling (gear 1 cools 3, gear 2 cools 1, Coast adds 1) sends Heat from your hand back to the engine.' },
    { id: 'spin', title: 'Spins', at: 'corners', when: (v) => v.race!.cars.some((c) => c.spun),
      text: 'A car that owes more Heat than its engine holds spins. It stops before that corner, takes 1 or 2 Stress straight into its hand and starts again from gear 1. Keep some Heat in the engine before a fast corner.' },
    { id: 'stress', title: 'Stress cards', at: 'cards', when: (v) => !!v.me?.hand.includes(STRESS),
      text: 'A Stress card is a gamble: when it is revealed, cards are turned from the top of your deck until one with a pace value appears, and that value counts. Every turned card, Heat included, goes to your discard.' },
    { id: 'draft', title: 'Slipstream', at: 'draft', when: (v) => v.race!.last.some((r) => r.drafted),
      text: 'Ending a move level with another car, or right behind it, lets you draft 2 more spaces. It is taken for you unless it would carry you too fast through a corner; then the game asks.' },
    { id: 'catch', title: 'Catch-up', at: 'catchup', when: (v) => v.race!.last.some((r) => r.catchup),
      text: 'The last car each round (the last two with 5 or more cars) may take catch-up on its turn: one more space and one more cooling, so nobody is left behind for long.' },
  ];

  let seen = $state<string[]>([]);
  const lesson = $derived(view.race ? LESSONS.find((l) => !seen.includes(l.id) && l.when(view)) ?? null : null);
  const done = $derived(LESSONS.filter((l) => seen.includes(l.id)).length);
</script>

<section class="coach" aria-labelledby="ax-coach-h" aria-live="polite">
  <h3 id="ax-coach-h"><span class="who"><Spot id="misc.school" size={28} round />Coach</span> <small>{done} of {LESSONS.length} lessons</small></h3>
  {#if lesson}
    <p class="t">{lesson.title}</p>
    <p>{lesson.text}</p>
    <div class="row">
      <button class="btn small primary" onclick={() => (seen = [...seen, lesson.id])}>Got it</button>
      <button class="btn small ghost" onclick={() => onrules(lesson.at)}>Read more</button>
    </div>
  {:else}
    <p>Drive on. The coach speaks up when something new happens.</p>
  {/if}
</section>

<style>
  .coach {
    padding: 12px 14px;
    border-radius: 4px;
    color: var(--ax-paper-ink);
    background:
      linear-gradient(180deg, var(--ax-mustard) 0 6px, transparent 6px),
      var(--ax-paper);
    font-size: 14px;
  }
  h3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 4px 0 6px;
    font: 700 14px/1 var(--ax-serif);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .who {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  small {
    font: 400 12px/1 inherit;
    letter-spacing: 0;
    text-transform: none;
    color: var(--ax-paper-ink-2);
  }
  .t {
    margin: 0;
    font-weight: 700;
  }
  p {
    margin: 0 0 8px;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .row :global(.btn.ghost) {
    color: var(--ax-paper-ink);
  }
</style>
