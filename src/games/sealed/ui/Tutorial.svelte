<script lang="ts">
  import Dialog from '../../../hub/Dialog.svelte';
  import { KINDS, type Kind } from '../rules/cards';
  import { playable } from '../rules/engine';
  import Card from './Card.svelte';

  /**
   * Short lessons on a scripted hand. The questions are checked with the same pure rules the server uses; nothing here
   * is sent anywhere or counted in anyone's results.
   */
  let { open = $bindable(false) }: { open: boolean } = $props();

  interface Lesson {
    title: string;
    text: string[];
    /** Cards shown; with `answer`, the player taps the right one. */
    show: Kind[];
    answer?: (k: Kind, i: number) => boolean;
    done?: string;
    wrong?: string;
  }

  const hand = (...k: Kind[]) => k.map((kind, id) => ({ id, kind }));
  const forced = (k: Kind[]) => (k2: Kind, i: number) => playable(hand(...k)).includes(i);

  const LESSONS: Lesson[] = [
    { title: 'One letter each', text: ['Every round you hold a single sealed letter: a member of the court, numbered 0 to 9.', 'Stay in the round to the end, or be the last one left, to win a favor. Enough favors win the game.'], show: ['heir', 'scribe', 'censor'] },
    { title: 'Your turn', text: ['You draw, so you hold two cards. Play one face up and its ability happens at once; keep the other hidden.', 'Here you hold a Scribe and a Duelist. Play the Scribe: it lets you look at someone’s card.'], show: ['scribe', 'duelist'], answer: (k) => k === 'scribe', done: 'Only you see what the Scribe showed you. It appears under “What only you know”.', wrong: 'That is the Duelist. Tap the Scribe.' },
    { title: 'The Censor', text: ['The Censor names a character other than the Censor. If the chosen player holds it, they are out.', 'You just saw that your rival holds the Heir. Which name puts them out?'], show: ['censor', 'heir', 'confessor'], answer: (k) => k === 'heir', done: 'Right. Knowing a card and then naming it is the heart of the game.', wrong: 'Name the card you saw: the Heir.' },
    { title: 'The Dowager', text: ['If you hold the Dowager with the Ambassador or the Magistrate, you must play the Dowager. You may also play her any time, so nobody knows whether you had to.', 'You hold a Dowager and a Magistrate. Which card can you play?'], show: ['dowager', 'magistrate'], answer: forced(['dowager', 'magistrate']), done: 'Yes: the Dowager. The table only sees that you played her.', wrong: 'With the Magistrate in hand, the Dowager must be played.' },
    { title: 'Protection', text: ['The Confessor protects you until your next turn: nobody can choose you.', 'If everyone else is protected or out, a card that chooses another player does nothing. The Magistrate must then choose you.'], show: ['confessor', 'magistrate'] },
    { title: 'Never let go of the Heir', text: ['Playing or discarding the Heir puts you out, even when another card made you discard it.', 'Hold on to the Heir, and watch for anyone who might know you have it.'], show: ['heir'] },
    { title: 'End of a round', text: ['The round ends when one player is left, or when a turn ends with the deck empty. Then everyone still in shows their card: the highest wins a favor, and ties all win.', 'Open the Rules from the menu at any time for every card in this game’s ruleset.'], show: ['ambassador', 'duelist', 'censor'] },
  ];

  let step = $state(0);
  let picked = $state<number | null>(null);
  const lesson = $derived(LESSONS[step]);
  const right = $derived(picked !== null && !!lesson.answer?.(lesson.show[picked], picked));
  const go = (i: number) => {
    step = i;
    picked = null;
  };
</script>

<Dialog bind:open title="Tutorial: {step + 1} of {LESSONS.length}, {lesson.title}" wide>
  <div class="lesson" data-game-theme="sealed">
    {#each lesson.text as t, i (i)}<p>{t}</p>{/each}
    <div class="show" role={lesson.answer ? 'group' : undefined} aria-label={lesson.answer ? 'Choose a card' : undefined}>
      {#each lesson.show as k, i (i)}
        {#if lesson.answer}
          <button class="pick" class:on={picked === i} aria-pressed={picked === i} aria-label="{KINDS[k].value} {KINDS[k].name}" disabled={right} onclick={() => (picked = i)}><Card kind={k} size="md" /></button>
        {:else}
          <Card kind={k} size="md" />
        {/if}
      {/each}
    </div>
    {#if picked !== null}<p class="done" role="status">{right ? lesson.done : lesson.wrong}</p>{/if}
  </div>
  <div class="nav">
    <button class="btn" disabled={step === 0} onclick={() => go(step - 1)}>Back</button>
    <span class="dots" aria-hidden="true">{#each LESSONS as _, i (i)}<span class:on={i === step}></span>{/each}</span>
    {#if step < LESSONS.length - 1}
      <button class="btn ghost" onclick={() => (open = false)}>Skip tutorial</button>
      <button class="btn primary" onclick={() => go(step + 1)}>{lesson.answer && !right ? 'Skip this step' : 'Next'}</button>
    {:else}
      <button class="btn primary" onclick={() => ((open = false), go(0))}>Finish</button>
    {/if}
  </div>
</Dialog>

<style>
  .lesson p {
    margin: 0 0 8px;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .show {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 8px 0;
  }
  .pick {
    padding: 0;
    border: 0;
    background: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform var(--dur-2) var(--ease-out);
  }
  .pick.on {
    transform: translateY(-8px);
  }
  .pick.on :global(.sc-card) {
    outline: 3px solid var(--sprout);
  }
  .pick:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 3px;
  }
  .done {
    color: var(--ink) !important;
    font-weight: 600;
  }
  .nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
  .dots {
    flex: 1;
    display: flex;
    gap: 4px;
    justify-content: center;
  }
  .dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--rim-hi);
  }
  .dots span.on {
    background: var(--sprout);
  }
</style>
