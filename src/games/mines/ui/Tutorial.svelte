<script lang="ts">
  import Dialog from '../../../hub/Dialog.svelte';
  import { GOAL_SPOTS, key, revealReached, spots } from '../rules/board';
  import { artOf, type GoalKind } from '../rules/cards';
  import type { Cell, Goal, MView, Spot } from '../rules/types';
  import Board from './Board.svelte';
  import { tileArt } from './text';

  /**
   * Ten short lessons on a scripted mine. It runs the same pure board rules as the server on a fixed layout, so every
   * run is identical; nothing here is sent anywhere or counted in anyone's results.
   */
  let { open = $bindable(false) }: { open: boolean } = $props();

  type Task = 'place' | 'goal' | 'tunnel' | null;
  interface Lesson {
    title: string;
    text: string[];
    /** Tunnels already laid, left to right along row 0 from the entrance. */
    row?: number;
    hand?: string;
    task: Task;
    done?: string;
    /** Pictures for lessons with nothing to do on the board. */
    show?: string[];
  }

  const LESSONS: Lesson[] = [
    { title: 'The mine', text: ['Everyone starts from the entrance on the left. Three face-down destinations wait on the right: one is gold, two are coal.', 'Nobody knows which is which until a tunnel reaches it.'], row: 0, task: null },
    { title: 'Lay a tunnel', text: ['On your turn you may lay one tunnel card. It must touch the mine, every edge must match its neighbours, and it must join a path back to the entrance.', 'The glowing squares are the only legal places. Tap one.'], row: 0, hand: 'straightH', task: 'place', done: 'Laid. The server checks every move the same way; the glow only shows what it will accept.' },
    { title: 'Turning a card round', text: ['A card can go in either way up. Use “Turn round” (or the R key) to flip the one you are holding.', 'Dotted squares fit only the other way round; laying there turns it for you. Lay this bend.'], row: 1, hand: 'bendL', task: 'place', done: 'Good. The card on the board shows exactly how it was laid.' },
    { title: 'Dead ends', text: ['Rubble cards have openings that end at once. They still have to match their neighbours, but they join nothing.', 'Saboteurs love them: one well-placed rubble card can cut a route to the gold.'], task: null, show: ['deadH', 'deadCross', 'deadN'] },
    { title: 'Reaching a destination', text: ['When a joined tunnel opens onto a face-down destination, it is turned face up for everyone.', 'Lay the last card of this gallery to reach the middle destination.'], row: 6, hand: 'straightH', task: 'place', done: 'Gold! When the gold is reached the round ends and the winners are paid.' },
    { title: 'Survey Map', text: ['A Survey Map lets you look at one destination in secret. Only you see what it is, and you can say what you like about it.', 'Choose a destination to look at.'], row: 3, task: 'goal', done: 'You saw it, and nobody else did. Your notes keep it, marked with the round.' },
    { title: 'Broken tools', text: ['A Snapped Pickaxe, Doused Lantern or Cracked Cart stops a player laying tunnels until it is mended.', 'Mend cards fix one tool; a Tinker card fixes one of two. You may mend anyone, including yourself.'], task: null, show: ['breakPick', 'fixPick', 'fixPickLamp', 'toolLampBroken'] },
    { title: 'Cave-in', text: ['A Cave-in brings down any tunnel card except the entrance and the destinations.', 'Choose a tunnel to bring down.'], row: 4, task: 'tunnel', done: 'Gone. Anything beyond the gap is cut off until the mine is joined up again.' },
    { title: 'Roles and pay', text: ['Classic: miners share secret gold cards if the gold is reached; saboteurs are paid if it is not.', 'Expanded: green and blue crews race through coloured gates; there are a foreman, an opportunist and crystal seekers too.', 'Prospector Duel: no roles. Reach the gold for 3, your rival gets 1; nobody earns if the cards run out.'], task: null, show: ['miner', 'saboteur', 'green', 'blue'] },
    { title: 'Your turn, in short', text: ['Lay a tunnel, play an action, or discard: one card (up to three in Expanded). You then draw back up while the deck lasts.', 'If the table uses a timer, anyone may end a turn that runs out with a single discard. Chat and reactions work at any time.', 'That is everything. Open the Cards list for every card, or the guide for the full rules.'], task: null, show: ['cardBack', 'roleBack', 'reward3'] },
  ];

  let step = $state(0);
  let cells = $state<Record<string, Cell>>({});
  let goals = $state<Goal[]>([]);
  let solved = $state(false);
  let saw = $state<string | null>(null);
  let rot = $state<0 | 1>(0);

  /** Lay out the mine for a lesson. Always the same: the middle destination is the gold. */
  function load(i: number) {
    const l = LESSONS[i];
    const c: Record<string, Cell> = { [key(0, 0)]: { kind: 'entrance', rot: 0 } };
    for (let x = 1; x <= (l.row ?? 0); x++) c[key(x, 0)] = { kind: 'straightH', rot: 0 };
    cells = c;
    goals = GOAL_SPOTS.map((p, j) => ({ ...p, kind: (['coalL', 'gold', 'coalR'] as GoalKind[])[j], revealed: false }));
    solved = false;
    saw = null;
    rot = 0;
  }
  $effect(() => {
    if (open) load(step);
  });

  const lesson = $derived(LESSONS[step]);
  const cardId = 1;
  const view = $derived<MView>({
    config: { mode: 'classic', rounds: 1, target: 0, timer: 0, away: 'pause' },
    n: 3,
    round: 1,
    phase: 'play',
    turn: 0,
    current: 0,
    since: 0,
    deck: 0,
    discards: 0,
    cells: Object.entries(cells).map(([k, c]) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, kind: c.kind, rot: c.rot };
    }),
    goals: goals.map((g) => ({ x: g.x, y: g.y, revealed: g.revealed, kind: g.revealed ? g.kind : undefined })),
    players: [],
    draft: null,
    thief: null,
    log: [],
    rounds: [],
    chat: [],
    me: {
      seat: 0,
      hand: [],
      role: null,
      gold: 0,
      rewards: [],
      seen: saw ? [{ t: 'survey', round: 1, goal: goals.findIndex((g) => g.kind === saw), kind: saw as GoalKind }] : [],
      spots: lesson.hand && !solved ? { [cardId]: spots($state.snapshot(cells), $state.snapshot(goals), lesson.hand) } : {},
    },
    final: null,
  });

  function place(s: Spot) {
    const c = $state.snapshot(cells);
    const g = $state.snapshot(goals);
    c[key(s.x, s.y)] = { kind: lesson.hand!, rot: s.rot };
    revealReached(c, g);
    cells = c;
    goals = g;
    solved = true;
  }
  function survey(i: number) {
    saw = goals[i].kind;
    solved = true;
  }
  function caveIn(x: number, y: number) {
    const c = $state.snapshot(cells);
    delete c[key(x, y)];
    cells = c;
    solved = true;
  }
  const go = (i: number) => {
    step = i;
    load(i);
  };
</script>

<Dialog bind:open title="Tutorial: {step + 1} of {LESSONS.length}, {lesson.title}" wide>
  <div class="lesson">
    {#each lesson.text as t, i (i)}<p>{t}</p>{/each}
    {#if lesson.show}
      <div class="show">{#each lesson.show as k (k)}<img src={artOf(k)} alt="" width="60" height="90" />{/each}</div>
    {:else}
      <div class="mini">
        <Board {view} card={lesson.task === 'place' && !solved ? { id: cardId, kind: lesson.hand! } : null} {rot} target={solved ? null : lesson.task === 'goal' ? 'goal' : lesson.task === 'tunnel' ? 'tunnel' : null} onplace={place} ongoal={survey} ontunnel={caveIn} />
      </div>
      {#if lesson.hand && !solved}
        <div class="hold">
          <img src={tileArt(lesson.hand, false)} alt="The card you hold" width="48" height="72" class:rot={rot === 1} />
          <button class="btn small" onclick={() => (rot = rot ? 0 : 1)}>Turn round</button>
        </div>
      {/if}
      {#if solved && lesson.done}<p class="done" role="status">{lesson.done}{#if saw} It is {saw === 'gold' ? 'the gold' : 'coal'}.{/if}</p>{/if}
    {/if}
  </div>
  <div class="nav">
    <button class="btn" disabled={step === 0} onclick={() => go(step - 1)}>Back</button>
    <span class="dots" aria-hidden="true">{#each LESSONS as _, i (i)}<span class:on={i === step}></span>{/each}</span>
    {#if step < LESSONS.length - 1}
      <button class="btn ghost" onclick={() => (open = false)}>Skip tutorial</button>
      <button class="btn primary" onclick={() => go(step + 1)}>{lesson.task && !solved ? 'Skip this step' : 'Next'}</button>
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
  .mini {
    height: 300px;
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .show {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .show img {
    border-radius: 5px;
  }
  .hold {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }
  .hold img.rot {
    transform: rotate(180deg);
  }
  .done {
    margin-top: 8px !important;
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
