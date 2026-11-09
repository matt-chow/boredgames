<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { beginDrag, consumeDragClick } from '../../../client/lib/drag';
  import { finishAll, play as flip, release, snapshot, type Snapshot } from '../../../client/lib/motion';
  import { settings } from '../../../client/lib/settings.svelte';
  import { sfx } from '../../../client/lib/sound';
  import { toasts } from '../../../client/lib/toast.svelte';
  import Dialog from '../../../hub/Dialog.svelte';
  import Guide from '../../../hub/Guide.svelte';
  import type { GuideDoc } from '../../../hub/guide';
  import Icon from '../../../hub/Icon.svelte';
  import QuitGame from '../../../hub/QuitGame.svelte';
  import SettingsMenu from '../../../hub/SettingsMenu.svelte';
  import type { GameUiProps } from '../../ui';
  import { inArea } from '../rules/board';
  import { ACTION, ROLE, TUNNEL, artOf, type ActionKind, type Tool } from '../rules/cards';
  import type { Card, LogEntry, MAction, MView, Rot, Spot } from '../rules/types';
  import { ambience, prefs, sounds, stopAmbience } from './audio.svelte';
  import Board from './Board.svelte';
  import Encyclopedia from './Encyclopedia.svelte';
  import { newEvents, nextUp } from './events';
  import { burst, busy, collapse, flipOut, later, move, pace, skipAll, token } from './fx';
  import Results from './Results.svelte';
  import Seats from './Seats.svelte';
  import Side from './Side.svelte';
  import { GOAL_NAMES, MODE_NAMES, TOOL_NAMES, goalWord, logText, nameOf, payText, textOf, tileArt } from './text';
  import Tutorial from './Tutorial.svelte';

  let { conn, room }: GameUiProps = $props();

  const view = $derived(room.game as MView);
  const me = $derived(view.me);
  const seat = $derived(me?.seat ?? -1);
  const who = (s: number) => (s === seat ? 'You' : (room.seats[s]?.name ?? `Seat ${s + 1}`));
  const myTurn = $derived(view.phase === 'play' && view.current === seat);
  const mine = $derived(seat >= 0 ? view.players[seat] : null);
  const canDig = $derived(!!mine && !mine.trap && !mine.broken.length);
  /** Whether the server let your tunnels out of the starting area (none fit inside it), or null when none fit at all (MS-GEO7). */
  const beyond = $derived.by(() => {
    const all = Object.values(view.me?.spots ?? {}).flat();
    return all.length ? all.some((p) => !inArea(p.x, p.y)) : null;
  });
  const upNext = $derived(nextUp(view));

  /** Refusals become a toast; the screen only ever changes when the server's view does. */
  async function act(a: MAction) {
    const r = await conn.act(a);
    if (!r.ok) {
      sfx.error();
      toasts.push(r.error ?? 'Not allowed.', 'error');
    }
    return r;
  }

  // ---- Choosing cards (this device only) ------------------------------------------------------------------------------
  let sel = $state<number[]>([]);
  let rot = $state<Rot>(0);
  let seenTurn = -1;
  $effect(() => {
    if (view.turn === seenTurn) return;
    seenTurn = view.turn;
    sel = sel.filter((id) => me?.hand.some((c) => c.id === id));
  });
  const one = $derived(sel.length === 1 ? (me?.hand.find((c) => c.id === sel[0]) ?? null) : null);
  const tunnel = $derived(one && TUNNEL[one.kind] ? one : null);
  const action = $derived(one && !TUNNEL[one.kind] ? ACTION[one.kind as ActionKind] : null);
  const maxDiscard = $derived(view.config.mode === 'expanded' ? 3 : 1);

  function toggle(id: number) {
    if (sel.includes(id)) sel = sel.filter((x) => x !== id);
    else sel = view.config.mode === 'expanded' && sel.length && sel.length < 3 ? [...sel, id] : [id];
  }
  const turnRound = () => ((rot = rot ? 0 : 1), sounds.rotate());
  const done = () => ((sel = []), (rot = 0));
  async function place(s: Spot) {
    if (!tunnel) return;
    const r = await act({ type: 'path', turn: view.turn, card: tunnel.id, x: s.x, y: s.y, rot: s.rot });
    if (r.ok) done();
    return r;
  }
  async function play(extra: { on?: number; tool?: Tool; goal?: number; x?: number; y?: number }) {
    if (!one) return;
    const r = await act({ type: 'act', turn: view.turn, card: one.id, ...extra });
    if (r.ok) done();
    return r;
  }
  async function discard() {
    const r = await act({ type: 'pass', turn: view.turn, cards: sel });
    if (r.ok) done();
    return r;
  }
  async function clear(what: Tool | 'theft' | 'trap') {
    const r = await act({ type: 'clear', turn: view.turn, cards: sel, clear: what });
    if (r.ok) done();
  }

  /** Who a card may sensibly go to. The server checks again; this only keeps the buttons honest. */
  function targetsFor(kind: ActionKind): { on: number; tool?: Tool; label: string }[] {
    if (!mine) return [];
    const a = ACTION[kind];
    const others = view.players.filter((p) => p.seat !== seat);
    if (kind.startsWith('break')) return others.filter((p) => !p.broken.includes(a.tools![0])).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (kind.startsWith('fix')) return view.players.flatMap((p) => a.tools!.filter((t) => p.broken.includes(t)).map((t) => ({ on: p.seat, tool: t, label: a.tools!.length > 1 ? `${who(p.seat)}: ${TOOL_NAMES[t]}` : who(p.seat) })));
    if (kind === 'guard') return view.players.filter((p) => p.theft).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (kind === 'free') return view.players.filter((p) => p.trap).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (kind === 'trap') return others.filter((p) => !p.trap).map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (kind === 'swapRole') return view.players.map((p) => ({ on: p.seat, label: who(p.seat) }));
    if (kind === 'swapHands' || kind === 'inspect') return others.map((p) => ({ on: p.seat, label: who(p.seat) }));
    return [];
  }
  const targets = $derived(action ? targetsFor(action.kind) : []);
  /** Cards with somewhere to go this turn get the lamp edge (legal, your move). */
  function playable(c: Card): boolean {
    if (!myTurn || !mine) return false;
    if (TUNNEL[c.kind]) return canDig && !!me?.spots[c.id]?.length;
    const a = ACTION[c.kind as ActionKind];
    if (!a) return false;
    if (a.target === 'self') return !mine.theft;
    if (a.target === 'goal') return view.goals.some((g) => !g.revealed);
    if (a.target === 'tunnel') return view.cells.some((x) => !!TUNNEL[x.kind]);
    return targetsFor(a.kind).length > 0;
  }
  const clearable = $derived(mine ? ([...mine.broken, ...(mine.trap ? ['trap' as const] : []), ...(mine.theft ? ['theft' as const] : [])] as (Tool | 'theft' | 'trap')[]) : []);
  const clearName = (c: Tool | 'theft' | 'trap') => (c === 'trap' ? 'the lock' : c === 'theft' ? 'your Pickpocket' : `your ${TOOL_NAMES[c]}`);
  const canDiscard = $derived(myTurn && sel.length > 0 && sel.length <= maxDiscard);
  /** Seats a selected card can be dropped on. */
  const drops = $derived(myTurn && action ? (action.target === 'self' ? (mine?.theft ? [] : [seat]) : [...new Set(targets.map((t) => t.on))]) : []);

  // ---- Drag a card onto the board, a player or the discard pile (clicks and keys still do everything) ------------------
  function grab(e: PointerEvent, c: Card) {
    if (!myTurn) return;
    const el = e.currentTarget as HTMLElement;
    beginDrag(e, el, {
      onStart: () => {
        if (!sel.includes(c.id)) sel = [c.id];
      },
      onDrop: (t) => drop(t?.dataset.drop),
    });
  }
  function drop(d: string | undefined): boolean {
    if (!d) return false;
    const [kind, arg = ''] = d.split(':');
    const n = arg.split(',').map(Number);
    let p: Promise<{ ok: boolean } | undefined> | undefined;
    if (kind === 'spot' && tunnel) p = place({ x: n[0], y: n[1], rot: n[2] as Rot });
    else if (kind === 'cell' && action?.target === 'tunnel') p = play({ x: n[0], y: n[1] });
    else if (kind === 'goal' && action?.target === 'goal') p = play({ goal: n[0] });
    else if (kind === 'seat' && action) {
      const ts = targets.filter((t) => t.on === n[0]);
      if (action.target === 'self' && n[0] === seat) p = play({});
      else if (ts.length === 1) p = play({ on: ts[0].on, tool: ts[0].tool });
    } else if (kind === 'discard' && canDiscard) p = discard();
    if (!p) return false;
    p.then((r) => r?.ok || release());
    return true;
  }
  function handKeys(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const li = (e.currentTarget as HTMLElement).closest('li');
    const to = e.key === 'ArrowLeft' ? li?.previousElementSibling : li?.nextElementSibling;
    to?.querySelector<HTMLButtonElement>('button')?.focus();
    e.preventDefault();
  }

  function keys(e: KeyboardEvent) {
    if ((e.key === 'r' || e.key === 'R') && tunnel && !(e.target instanceof HTMLInputElement)) turnRound();
    if (e.key === 'Escape') {
      sel = [];
      skipAll();
      finishAll();
    }
  }

  // ---- The turn timer ---------------------------------------------------------------------------------------------------
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });
  const waiting = $derived(view.phase === 'play' || view.phase === 'draft' || view.phase === 'theft');
  const left = $derived(view.config.timer && waiting ? Math.max(0, Math.ceil((view.since + view.config.timer * 1000 - now) / 1000)) : null);
  let calledAt = 0;
  let calledTurn = -1;
  $effect(() => {
    // Anyone at the table may call time; the server makes the single non-strategic move and refuses doubles.
    if (left !== 0 || !me) return;
    if (calledTurn === view.turn && now - calledAt < 3000) return;
    calledTurn = view.turn;
    calledAt = now;
    conn.act({ type: 'timeout', turn: view.turn });
  });

  // ---- Your turn: a banner and a chime whenever the turn becomes yours, including on arrival or reconnecting --------
  let banner = $state(false);
  let wasMine = false;
  let bannerTimer = 0;
  $effect(() => {
    const m = myTurn;
    if (m && !wasMine) {
      if (prefs.turn) banner = true;
      sounds.turn();
      clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => (banner = false), 1800 * pace(prefs.fast));
    }
    if (!m) banner = false;
    wasMine = m;
  });

  // ---- On-board notes: short, public, near where it happened -----------------------------------------------------------
  type Note = { id: number; text: string; x: number; y: number };
  let notes = $state<Note[]>([]);
  let noteId = 0;
  function note(text: string, anchor: string) {
    const r = document.querySelector(`[data-anchor="${anchor}"]`)?.getBoundingClientRect();
    const x = Math.min(innerWidth - 110, Math.max(110, r ? r.left + r.width / 2 : innerWidth / 2));
    let y = Math.max(60, r ? r.top : innerHeight / 3);
    // Notes near each other stack upwards instead of covering one another.
    while (notes.some((n) => Math.abs(n.x - x) < 160 && Math.abs(n.y - y) < 28)) y -= 30;
    const id = ++noteId;
    notes = [...notes.slice(-2), { id, text, x, y }];
    setTimeout(() => (notes = notes.filter((n) => n.id !== id)), 2800 * pace(prefs.fast));
  }

  // ---- The confirmed-event presentation ------------------------------------------------------------------------------
  // Before each new view renders, measure where things are; after it renders, animate what its new public lines say.
  let before: Snapshot | null = null;
  let batch: { events: LogEntry[]; prev: MView; gone: number[]; swapWith: number | null } | null = null;
  onMount(() =>
    conn.onRoom((next, prev) => {
      finishAll();
      skipAll();
      const nv = next.game as MView | null;
      const pv = prev?.game as MView | null;
      if (!nv || !pv || prev!.version === next.version) return;
      const events = newEvents(pv, nv);
      const ids = new Set(nv.me?.hand.map((c) => c.id));
      const gone = (pv.me?.hand ?? []).filter((c) => !ids.has(c.id)).map((c) => c.id);
      const sw = events.find((e) => e.t === 'act' && e.kind === 'swapHands' && (e.seat === seat || e.on === seat));
      const swapWith = sw && sw.t === 'act' ? (sw.seat === seat ? sw.on! : sw.seat) : null;
      if (nv.chat.some((c) => c.id > (pv.chat.at(-1)?.id ?? 0) && c.seat !== seat)) sounds.chat();
      before = snapshot(document);
      batch = { events, prev: pv, gone, swapWith };
    }),
  );
  onDestroy(() => {
    finishAll();
    skipAll();
    stopAmbience();
  });
  $effect(() => {
    void room.version;
    const b = before;
    const p = batch;
    if (!b || !p) return;
    before = null;
    batch = null;
    tick().then(() => {
      const mineEv = p.events.find((e) => 'seat' in e && e.seat === seat && e.t !== 'draw');
      flip(b, {
        // My new cards come from the deck (or from the other satchel in a swap); discards go to the pile. Played cards
        // travel as tokens below, so the hand only closes the gap.
        originOf: (id) => (id.startsWith('h') ? (p.swapWith !== null ? `seat-${p.swapWith}` : 'deck') : null),
        exitOf: (id) => (!id.startsWith('h') ? null : p.swapWith !== null ? `seat-${p.swapWith}` : mineEv?.t === 'pass' || mineEv?.t === 'clear' ? 'discard' : null),
      });
      present(p.events, p.prev, b, p.gone);
    });
  });

  const rectOf = (a: string) => document.querySelector(`[data-anchor="${a}"]`)?.getBoundingClientRect() ?? null;
  const elOf = (a: string) => document.querySelector(`[data-anchor="${a}"]`);
  const shake = [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }];
  const swell = [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }];

  /** Animate, sound and announce new public lines. Every effect is cosmetic: the board already shows the result. */
  function present(events: LogEntry[], prev: MView, b: Snapshot, gone: number[]) {
    if (!events.length) return;
    const P = pace(prefs.fast);
    // A long backlog (a reconnect, a tab left in the background) is not replayed: just the latest notes.
    if (events.length > 8) {
      for (const e of events.filter((x) => x.t !== 'draw').slice(-2)) note(logText(e, who), 'deck');
      return;
    }
    const back = artOf('cardBack');
    const was = (a: string) => b.anchors.get(a) ?? null;
    let t = 0;
    for (const e of events) {
      const actor = 'seat' in e ? e.seat : -1;
      const mineE = actor === seat;
      const from = mineE ? (gone.length ? was(`h${gone[0]}`) : null) : (was(`fan-${actor}`) ?? was(`seat-${actor}`));
      const say = (anchor: string, at: number) => !mineE && later(at, () => note(logText(e, who), anchor));
      switch (e.t) {
        case 'path': {
          const a = `cell-${e.x},${e.y}`;
          const cell = elOf(a);
          const to = cell?.getBoundingClientRect();
          const dur = 460 * P;
          if (cell && to && from) {
            const face = tileArt(e.kind, deep);
            token(mineE ? face : back, from, to, { face: mineE ? undefined : face, delay: t, duration: dur, turn: e.rot ? 180 : 0 });
            move(cell, [{ opacity: 0 }, { opacity: 0 }], t + dur);
          }
          move(cell?.querySelector('img') ?? null, [{ transform: `scale(1.1) rotate(${e.rot ? 180 : 0}deg)` }, { transform: `scale(1) rotate(${e.rot ? 180 : 0}deg)` }], 260 * P, t + dur);
          later(t + dur, () => {
            sounds.dig();
            if (to) {
              burst('dust', to);
              burst('rocks', to, { scale: 0.8 });
            }
          });
          say(a, t + dur);
          t += dur * 0.7;
          break;
        }
        case 'act': {
          const dest = e.on !== undefined ? `seat-${e.on}` : e.goal !== undefined ? `goal-${e.goal}` : e.x !== undefined ? `cell-${e.x},${e.y}` : `seat-${actor}`;
          const to = e.kind === 'caveIn' ? was(dest) : (rectOf(dest) ?? was(dest));
          const dur = 480 * P;
          const face = artOf(e.kind);
          if (from && to) token(mineE ? face : back, from, to, { face: mineE ? undefined : face, delay: t, duration: dur });
          const land = t + dur;
          const target = elOf(dest);
          if (e.kind.startsWith('break')) {
            later(land, () => (sounds.breakTool(), to && burst('crack', to)));
            move(target, shake, 320 * P, land);
          } else if (e.kind.startsWith('fix') || e.kind === 'free' || e.kind === 'guard') {
            later(land, () => (sounds.repair(), to && burst('glow', to)));
            move(target, swell, 360 * P, land);
          } else if (e.kind === 'caveIn') {
            const c = prev.cells.find((x) => x.x === e.x && x.y === e.y);
            later(land, () => {
              if (c && to) collapse(tileArt(c.kind, deep), to, !!c.rot, 800 * P);
              sounds.caveIn();
              if (to) {
                burst('rocks', to, { delay: 200 * P });
                burst('dust', to, { delay: 280 * P, scale: 1.4 });
              }
            });
            const mineEl = document.querySelector('.boardwrap');
            move(mineEl, shake, 500 * P, land + 120 * P);
          } else if (e.kind === 'survey') {
            later(land, () => sounds.reveal());
            move(target, swell, 420 * P, land);
          } else {
            later(land, () => sounds.play());
            move(target, swell, 360 * P, land);
          }
          say(e.on !== undefined ? `seat-${e.on}` : e.x !== undefined ? 'deck' : dest, land);
          t += dur * 0.7;
          break;
        }
        case 'pass':
        case 'clear': {
          const to = rectOf('discard');
          const n = e.t === 'pass' ? e.n : 2;
          if (!mineE && from && to) for (let i = 0; i < n; i++) token(back, from, to, { delay: t + i * 90 * P, duration: 380 * P });
          later(t, () => sounds.play());
          say(`seat-${actor}`, t + 380 * P);
          t += 380 * P * 0.7;
          break;
        }
        case 'draw': {
          if (!e.n) break;
          const deck = was('deck') ?? rectOf('deck');
          const to = rectOf(`fan-${actor}`);
          for (let i = 0; i < e.n; i++) {
            if (!mineE && deck && to) token(back, deck, to, { delay: t + i * 110 * P, duration: 380 * P });
            later(t + i * 110 * P, () => sounds.draw());
          }
          t += 200 * P;
          break;
        }
        case 'reveal': {
          const g = prev.goals[e.goal] ?? view.goals[e.goal];
          const a = `cell-${g.x},${g.y}`;
          const cell = elOf(a);
          const at = cell?.getBoundingClientRect() ?? was(`goal-${e.goal}`);
          const half = 380 * P;
          const turned = view.cells.find((c) => c.x === g.x && c.y === g.y)?.rot ? ' rotate(180deg)' : '';
          const start = t + 120 * P;
          if (at) flipOut(tileArt('goalBack', deep), at, half, start);
          move(cell, [{ opacity: 0 }, { opacity: 0 }], start + half);
          move(cell?.querySelector('img') ?? null, [{ transform: `perspective(400px) rotateY(-90deg)${turned}` }, { transform: `perspective(400px) rotateY(0deg)${turned}` }], half, start + half);
          later(start + half, () => {
            sounds.reveal();
            if (e.kind === 'gold') sounds.gold(0.1);
            else sounds.coal(0.1);
            if (at) burst(e.kind === 'gold' ? 'gold' : 'coal', at);
            note(e.kind === 'gold' ? `Gold! The ${GOAL_NAMES[e.goal]} destination.` : `The ${GOAL_NAMES[e.goal]} destination is ${goalWord(e.kind)}.`, a);
          });
          t = start + half * 2;
          break;
        }
        case 'round':
          later(t, () => note(logText(e, who), 'deck'));
          break;
        case 'pick':
        case 'steal':
          say(`seat-${actor}`, t);
          break;
      }
    }
  }

  // ---- Sounds and the round summary ------------------------------------------------------------------------------------
  let heardRounds = -1;
  let summary = $state(false);
  $effect(() => {
    const n = view.rounds.length;
    if (heardRounds >= 0 && n > heardRounds) {
      summary = view.phase !== 'over';
      sounds.roundEnd();
    }
    heardRounds = n;
  });
  const lastRound = $derived(view.rounds.at(-1));
  $effect(() => ambience(prefs.ambience && !settings.muted && prefs.ambVol >= 0));

  // ---- Views and menus ------------------------------------------------------------------------------------------------
  const VIEW_KEY = 'mines.view';
  let deep = $state(false);
  try {
    deep = localStorage.getItem(VIEW_KEY) === 'deep';
  } catch {
    // Storage can be blocked; the tabletop view is the default.
  }
  function setDeep(on: boolean) {
    deep = on;
    try {
      localStorage.setItem(VIEW_KEY, on ? 'deep' : 'table');
    } catch {
      // Keep the choice for this visit only.
    }
  }

  const wide = new MediaQuery('(min-width: 980px)');
  let tab = $state<'mine' | 'side'>('mine');
  let unread = $state(0);
  let guideOpen = $state(false);
  let guideDoc = $state<GuideDoc | null>(null);
  function help() {
    guideOpen = true;
    import('./guide').then((m) => (guideDoc = m.guide));
  }
  let quitOpen = $state(false);
  let cardsOpen = $state(false);
  let tutorialOpen = $state(false);

  // The draft and theft choices open by themselves; closing one leaves a button to bring it back.
  const picking = $derived(view.phase === 'draft' && view.draft?.picker === seat && !!me?.draft);
  const stealing = $derived(view.phase === 'theft' && view.thief === seat);
  let pickOpen = $state(false);
  let stealOpen = $state(false);
  $effect(() => {
    pickOpen = picking;
  });
  $effect(() => {
    stealOpen = stealing;
  });

  const status = $derived.by(() => {
    if (view.phase === 'draft' && view.draft) return view.draft.picker === seat ? 'Choose your gold card.' : `${who(view.draft.picker)} is choosing gold (${view.draft.left} left).`;
    if (view.phase === 'theft' && view.thief !== null) return view.thief === seat ? 'Choose who to steal from.' : `${who(view.thief)} is choosing who to rob.`;
    if (view.phase !== 'play') return '';
    const s = room.seats[view.current];
    const away = s && !s.connected && !s.bot ? (view.config.away === 'pause' ? ' They are away; the table waits for them.' : ' They are away; their turn will be passed.') : '';
    const soon = upNext === seat && seat >= 0 ? " You're next." : '';
    return myTurn ? (canDig ? 'Your turn: lay a tunnel, play an action, or discard.' : 'Your turn. You cannot dig right now: play an action or discard.') : `${who(view.current)} is up.${away}${soon}`;
  });

  // The hand as a fan: each card turned a little about a point below the hand, the outer ones dropped along the arc.
  const fan = $derived.by(() => {
    const n = me?.hand.length ?? 0;
    const step = Math.min(6, 30 / Math.max(1, n));
    const m = (n - 1) / 2;
    // The middle rises rather than the ends sagging, so the fan never dips below the hand area.
    const k = Math.min(1.8, 16 / Math.max(1, m * m));
    return (i: number) => {
      const off = i - (n - 1) / 2;
      return { r: off * step, y: (off * off - m * m) * k };
    };
  });
  const deckLayers = $derived(view.deck ? Math.min(6, Math.ceil(view.deck / 10)) : 0);
</script>

<svelte:window onkeydown={keys} onpointerdown={() => busy() && skipAll()} />

{#if view.phase === 'over' && view.final}
  <Results {view} {room} {conn} {who} />
{:else}
  <div class="table" class:still={settings.instant} class:fast={prefs.fast}>
    <header class="top">
      <p class="round label">Round {view.round}<span class="of">of {view.config.rounds}</span></p>
      <p class="meta"><span class="mode">{MODE_NAMES[view.config.mode]}</span> · Deck {view.deck}{#if left !== null} · <span class="clock" class:low={left <= 10}><Icon name="clock" size={14} /> {left}s</span>{/if}</p>
      <div class="views" role="radiogroup" aria-label="Board view">
        <button role="radio" aria-checked={!deep} class:on={!deep} onclick={() => setDeep(false)}>Tabletop</button>
        <button role="radio" aria-checked={deep} class:on={deep} onclick={() => setDeep(true)}>Deep mine</button>
      </div>
      <button class="btn small ghost" onclick={() => (cardsOpen = true)}>Cards</button>
      <button class="btn small ghost" onclick={() => (tutorialOpen = true)}>Tutorial</button>
      <SettingsMenu onhelp={help} onquit={() => (quitOpen = true)}>
        <div class="msset" role="group" aria-label="Mine sound and motion">
          <p class="sub">In the mine</p>
          <label class="range">Master volume <input type="range" min="0" max="1" step="0.05" bind:value={settings.volume} /></label>
          <label><input type="checkbox" bind:checked={prefs.sfx} /> Mine sounds</label>
          <label class="range">Effects volume <input type="range" min="0" max="1" step="0.05" bind:value={prefs.sfxVol} disabled={!prefs.sfx} /></label>
          <label><input type="checkbox" bind:checked={prefs.ambience} /> Cave ambience</label>
          <label class="range">Ambience volume <input type="range" min="0" max="1" step="0.05" bind:value={prefs.ambVol} disabled={!prefs.ambience} /></label>
          <label><input type="checkbox" bind:checked={prefs.turn} /> Your-turn alert</label>
          <label><input type="checkbox" bind:checked={prefs.chat} /> Chat sound</label>
          <label><input type="checkbox" bind:checked={prefs.fast} /> Fast animations</label>
        </div>
      </SettingsMenu>
    </header>

    <p class="status" class:mine={myTurn || picking || stealing} role="status">
      {status}
      {#if picking && !pickOpen}<button class="btn small primary" onclick={() => (pickOpen = true)}>Choose</button>{/if}
      {#if stealing && !stealOpen}<button class="btn small primary" onclick={() => (stealOpen = true)}>Choose</button>{/if}
    </p>

    <div class="main" class:wide={wide.current}>
      <div class="pane play" class:hide={!wide.current && tab !== 'mine'}>
        <Seats {view} {room} {who} next={upNext} {left} {drops} />
        <div class="boardwrap">
          <Board {view} {deep} {who} card={myTurn && canDig ? tunnel : null} {rot} target={myTurn && action?.target === 'tunnel' ? 'tunnel' : myTurn && action?.target === 'goal' ? 'goal' : null} onplace={place} ontunnel={(x, y) => play({ x, y })} ongoal={(goal) => play({ goal })} />
          <div class="piles">
            <div class="pile">
              <div class="deck" class:empty={!view.deck} data-anchor="deck" aria-hidden="true">
                {#each { length: deckLayers } as _, i (i)}<img src={artOf('cardBack')} alt="" style:--i={i} draggable="false" />{/each}
              </div>
              <p class="count">{view.deck ? `${view.deck} ${view.deck === 1 ? 'card' : 'cards'} remaining` : 'Deck empty'}</p>
            </div>
            <div class="pile">
              <div class="deck discard" class:empty={!view.discards} class:drop={canDiscard} data-anchor="discard" data-drop={canDiscard ? 'discard' : undefined} aria-hidden="true">
                {#if view.discards}<img src={artOf('cardBack')} alt="" draggable="false" />{/if}
              </div>
              <p class="count">Discards {view.discards}</p>
            </div>
          </div>
          {#if banner}<p class="banner" aria-hidden="true">Your turn!</p>{/if}
        </div>

        {#if me}
          <section class="hand" class:up={myTurn} aria-label="Your hand" data-anchor="hand">
            <ul class="cards" class:crowd={me.hand.length > 6}>
              {#each me.hand as c, i (c.id)}
                {@const on = sel.includes(c.id)}
                {@const f = fan(i)}
                <li data-card="h{c.id}" data-anchor="h{c.id}" style:--r="{f.r}deg" style:--y="{f.y}px" onpointerdown={(e) => grab(e, c)}>
                  <button class="card" class:on class:ok={playable(c)} aria-pressed={on} title="{nameOf(c.kind)}: {textOf(c.kind)}" onclick={() => consumeDragClick() || toggle(c.id)} onkeydown={handKeys}>
                    <img src={artOf(c.kind)} alt={nameOf(c.kind)} class:rot={on && tunnel?.id === c.id && rot === 1} draggable="false" />
                  </button>
                </li>
              {/each}
            </ul>
            {#if myTurn}
              <div class="bar">
                {#if one}<p class="what"><strong>{nameOf(one.kind)}</strong> {textOf(one.kind)}</p>{/if}
                <div class="acts">
                  {#if tunnel}
                    <button class="btn small" onclick={turnRound}><Icon name="reset" size={16} /> Turn round (R)</button>
                    {#if !canDig}<span class="note">You cannot dig while {mine?.trap ? 'locked in' : 'a tool is broken'}.</span>{:else if !me.spots[tunnel.id]?.length}<span class="note">{beyond === false ? 'It fits nowhere in the starting area right now.' : 'It fits nowhere right now.'}</span>{:else if beyond}<span class="note">None of your tunnels fit in the starting area, so you may build beyond it.</span>{:else}<span class="note">Choose or drag to a glowing square.</span>{/if}
                  {:else if action}
                    {#if action.target === 'self'}
                      <button class="btn small primary" disabled={conn.busy} onclick={() => play({})}>Lay it before you</button>
                    {:else if action.target === 'goal'}
                      <span class="note">Choose a face-down destination.</span>
                    {:else if action.target === 'tunnel'}
                      <span class="note">Choose a tunnel on the board.</span>
                    {:else if targets.length}
                      {#each targets as t (`${t.on}-${t.tool}`)}
                        <button class="btn small primary" disabled={conn.busy} onclick={() => play({ on: t.on, tool: t.tool })}>{t.label}</button>
                      {/each}
                    {:else}
                      <span class="note">Nobody it could go to right now.</span>
                    {/if}
                  {/if}
                  {#if sel.length && sel.length <= maxDiscard}
                    <button class="btn small" disabled={conn.busy} onclick={discard}>Discard {sel.length === 1 ? 'it' : `these ${sel.length}`}</button>
                  {/if}
                  {#if view.config.mode === 'expanded' && sel.length === 2}
                    {#each clearable as c (c)}
                      <button class="btn small" disabled={conn.busy} onclick={() => clear(c)}>Discard both to clear {clearName(c)}</button>
                    {/each}
                  {/if}
                  {#if !sel.length}<span class="note">Choose a card.{view.config.mode === 'expanded' ? ' Choose up to three to discard together.' : ''}</span>{/if}
                </div>
              </div>
            {/if}
          </section>
        {/if}
      </div>
      <div class="pane side" class:hide={!wide.current && tab !== 'side'}>
        <Side {view} {act} {who} busy={conn.busy} shown={wide.current || tab === 'side'} bind:unread />
      </div>
    </div>

    {#if !wide.current}
      <nav class="tabs" aria-label="Views">
        <button class:on={tab === 'mine'} aria-current={tab === 'mine' ? 'page' : undefined} onclick={() => (tab = 'mine')}>Mine</button>
        <button class:on={tab === 'side'} aria-current={tab === 'side' ? 'page' : undefined} onclick={() => (tab = 'side')}>
          Role &amp; activity{#if unread}<span class="badge" aria-label="{unread} unread">{unread}</span>{/if}
        </button>
      </nav>
    {/if}
  </div>
  <div class="notes" aria-hidden="true">
    {#each notes as n (n.id)}<p class="bubble" style:left="{n.x}px" style:top="{n.y}px">{n.text}</p>{/each}
  </div>
{/if}

<Dialog bind:open={pickOpen} title="Choose your gold">
  <p class="body">The gold is found. Take one card; the rest go on to the next miner.</p>
  <div class="choices">
    {#each me?.draft ?? [] as v, i (i)}
      <button class="reward" disabled={conn.busy} onclick={() => act({ type: 'pick', turn: view.turn, index: i })}>
        <img src={artOf(`reward${v}`)} alt="" width="80" height="120" /><span>{v} gold</span>
      </button>
    {/each}
  </div>
</Dialog>

<Dialog bind:open={stealOpen} title="Your Pickpocket">
  <p class="body">Steal 1 gold from a player who has some.</p>
  <div class="row">
    {#each view.players.filter((p) => p.seat !== seat && p.hasGold) as p (p.seat)}
      <button class="btn primary" disabled={conn.busy} onclick={() => act({ type: 'steal', turn: view.turn, from: p.seat })}>{who(p.seat)}</button>
    {/each}
    <button class="btn" disabled={conn.busy} onclick={() => act({ type: 'steal', turn: view.turn, from: null })}>Nobody</button>
  </div>
</Dialog>

<Dialog bind:open={summary} title="Round {lastRound?.round ?? ''} is over">
  {#if lastRound}
    <p class="body">
      {lastRound.end === 'gold' ? `${who(lastRound.finder!)} reached the gold.` : 'The cards ran out before anyone reached the gold.'}
      {lastRound.winners.length ? `Winners: ${lastRound.winners.map(who).join(', ')}.` : 'Nobody won this round.'}
    </p>
    <ul class="roles">
      {#each lastRound.roles as r, s (s)}
        <li><span>{who(s)}</span><strong>{r ? ROLE[r].name : '—'}</strong></li>
      {/each}
    </ul>
    {#if lastRound.payouts.length}
      <ul class="pay">{#each lastRound.payouts as p, i (i)}<li>{payText(p, who)}</li>{/each}</ul>
    {:else if lastRound.end === 'gold' && view.config.mode === 'classic'}
      <p class="body">The miners shared the gold cards in secret.</p>
    {/if}
    {#each lastRound.steals as st, i (i)}<p class="body">{st.from === null ? `${who(st.seat)} stole nothing.` : `${who(st.seat)} stole 1 gold from ${who(st.from)}.`}</p>{/each}
    <div class="row"><button class="btn primary" onclick={() => (summary = false)}>Next round</button></div>
  {/if}
</Dialog>

<Guide bind:open={guideOpen} doc={guideDoc} />
<Encyclopedia bind:open={cardsOpen} mode={view.config.mode} />
<Tutorial bind:open={tutorialOpen} />
<QuitGame {conn} {room} bind:open={quitOpen} />

<style>
  .table {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
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
  .meta {
    margin: 0;
    flex: 1 1 12em;
    font-size: 14px;
    color: var(--ink-2);
  }
  .clock {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .clock.low {
    color: var(--warn);
    font-weight: 700;
  }
  .views {
    display: flex;
    border: 1px solid var(--rim);
    border-radius: var(--r-sm, 4px);
    overflow: hidden;
  }
  .views button {
    font: inherit;
    font-size: 13px;
    padding: 4px 10px;
    min-height: 32px;
    background: none;
    color: var(--ink-2);
    border: 0;
    cursor: pointer;
  }
  .views button.on {
    background: var(--sprout);
    color: var(--sprout-ink);
    font-weight: 700;
  }
  .status {
    margin: 0;
    padding: 6px 14px;
    font-size: 14px;
    background: var(--ground-1);
    border-bottom: 1px solid var(--rim);
  }
  .status.mine {
    background: var(--sprout-dim);
    font-weight: 600;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .main.wide {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  .hide {
    display: none !important;
  }
  .pane {
    min-height: 0;
  }
  .play {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .boardwrap {
    flex: 1;
    min-height: 0;
  }
  .side {
    border-left: 1px solid var(--rim);
    overflow-y: auto;
  }
  .bar {
    margin-top: 6px;
  }
  .what {
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .note {
    font-size: 13px;
    color: var(--ink-3);
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
  .body {
    margin: 0 0 8px;
    color: var(--ink-2);
    line-height: 1.45;
  }
  .row,
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .reward {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px;
    font: inherit;
    color: var(--ink);
    background: var(--ground-2);
    border: 1px solid var(--rim);
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .reward:hover,
  .reward:focus-visible {
    border-color: var(--sprout);
  }
  .roles,
  .pay {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    font-size: 14px;
  }
  .roles li {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    border-bottom: 1px solid var(--rim);
  }
  /* ---- The hand: a fan of cards that rise as you point at them ---- */
  .hand {
    position: relative;
    border-top: 1px solid var(--rim);
    background: var(--ground-1);
    padding: 24px 10px env(safe-area-inset-bottom);
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0 10px 12px;
    display: flex;
    justify-content: center;
    transition: transform 180ms var(--ease-out, ease-out);
  }
  .hand.up .cards {
    transform: translateY(-8px);
  }
  .cards li {
    position: relative;
    flex: none;
    transform-origin: 50% 160%;
    transform: translateY(var(--y)) rotate(var(--r));
    touch-action: none;
  }
  .cards li + li {
    margin-left: -12px;
  }
  .cards.crowd li + li {
    margin-left: -30px;
  }
  .cards li:hover,
  .cards li:focus-within {
    z-index: 3;
  }
  .cards li:has(.on) {
    z-index: 4;
  }
  .card {
    display: block;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    transition: transform 140ms var(--ease-out, ease-out);
    box-shadow: 0 4px 10px rgb(0 0 0 / 0.45);
  }
  .card img {
    width: 72px;
    height: 108px;
    display: block;
    border-radius: 6px;
    pointer-events: none;
    transition: transform 160ms var(--ease-out, ease-out);
  }
  .card img.rot {
    transform: rotate(180deg);
  }
  .card.ok {
    border-color: var(--sprout-dim);
  }
  .card:hover,
  .card:focus-visible {
    transform: translateY(-16px) scale(1.12);
  }
  .card.on {
    border-color: var(--sprout);
    transform: translateY(-28px) scale(1.14);
  }
  .card:focus-visible {
    outline: 2px solid var(--sprout);
    outline-offset: 2px;
  }
  :global(body.dragging) .card {
    transition: none;
  }
  /* ---- Deck and discards, by the board ---- */
  .boardwrap {
    position: relative;
  }
  .piles {
    position: absolute;
    left: 8px;
    top: 8px;
    display: flex;
    gap: 10px;
    pointer-events: none;
  }
  .pile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .deck {
    position: relative;
    width: 40px;
    height: 60px;
    border-radius: 4px;
  }
  .deck img {
    position: absolute;
    inset: 0;
    width: 40px;
    height: 60px;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
    transform: translate(calc(var(--i, 0) * -1px), calc(var(--i, 0) * -2px));
  }
  .deck.empty {
    border: 1px dashed var(--rim-hi);
  }
  .deck.drop {
    pointer-events: auto;
    outline: 2px dashed var(--sprout);
    outline-offset: 2px;
  }
  .deck:global(.drop-over) {
    outline-style: solid;
  }
  .count {
    margin: 0;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 11px;
    white-space: nowrap;
    color: var(--ink);
    background: rgb(0 0 0 / 0.55);
  }
  .banner {
    position: absolute;
    left: 50%;
    top: 38%;
    margin: 0;
    padding: 10px 26px;
    border-radius: 999px;
    font-family: var(--font-display, inherit);
    font-size: 28px;
    font-weight: 700;
    color: var(--sprout-ink);
    background: var(--sprout);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.5);
    pointer-events: none;
    transform: translate(-50%, -50%);
    animation: banner 1.8s var(--ease-out, ease-out) both;
  }
  .fast .banner {
    animation-duration: 1s;
  }
  @keyframes banner {
    0% {
      opacity: 0;
      transform: translate(-50%, -30%) scale(0.9);
    }
    15%,
    75% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -60%) scale(1);
    }
  }
  /* ---- Notes beside what happened ---- */
  .notes {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 86;
  }
  .bubble {
    position: absolute;
    max-width: 220px;
    margin: 0;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.3;
    text-align: center;
    color: var(--ink);
    background: var(--ground-3);
    border: 1px solid var(--rim-hi);
    box-shadow: 0 6px 16px rgb(0 0 0 / 0.45);
    transform: translate(-50%, -110%);
    animation: bubble 2.8s ease-out both;
  }
  .fast + .notes .bubble {
    animation-duration: 2s;
  }
  @keyframes bubble {
    0% {
      opacity: 0;
      transform: translate(-50%, -90%);
    }
    10%,
    80% {
      opacity: 1;
      transform: translate(-50%, -110%);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -125%);
    }
  }
  .badge {
    margin-left: 6px;
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    font-size: 12px;
    background: var(--sprout);
    color: var(--sprout-ink);
  }
  /* ---- The mine's own settings, inside the shared menu ---- */
  .msset {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--rim);
  }
  .msset .sub {
    margin: 0 0 2px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .msset label {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 32px;
    font-size: 14px;
    cursor: pointer;
  }
  .msset .range {
    justify-content: space-between;
    font-size: 13px;
    color: var(--ink-2);
  }
  .msset input[type='checkbox'] {
    accent-color: var(--sprout);
    width: 16px;
    height: 16px;
  }
  .msset input[type='range'] {
    width: 100px;
    accent-color: var(--sprout);
  }
  .still .card,
  .still .card img,
  .still .cards {
    transition: none;
  }
  .still .banner,
  .still + .notes .bubble {
    animation: none;
  }
  @media (max-width: 600px) {
    .card img {
      width: 58px;
      height: 87px;
    }
    .cards.crowd li + li {
      margin-left: -26px;
    }
    .piles {
      gap: 6px;
    }
    .deck,
    .deck img {
      width: 30px;
      height: 45px;
    }
  }
</style>
