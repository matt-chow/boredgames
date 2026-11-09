/**
 * Computer players. A practice bot plays a plain heuristic from its own view; an absent player's stand-in either waits
 * (pause) or makes the single non-strategic move (auto-pass), so it never plays someone else's game for them (MS-AWAY1).
 */
import type { BotMove } from '../../../engine/types';
import { ACTION, TUNNEL, type Tool } from './cards';
import { autoAction } from './engine';
import type { MAction, MView } from './types';

const DELAY = 900;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const STEP = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] } as const;
/** A card whose every opening ends at once leads nowhere: a saboteur's card. */
const deadEnd = (kind: string) => TUNNEL[kind].links.every((g) => g.length < 2);

export function botMove(v: MView, standIn = false): BotMove<MAction> | null {
  const me = v.me;
  if (!me) return null;
  const up = v.phase === 'play' ? v.current === me.seat : v.phase === 'draft' ? v.draft?.picker === me.seat : v.phase === 'theft' ? v.thief === me.seat : false;
  if (!up) return null;
  if (standIn) {
    if (v.config.away === 'pause') return null;
    const a = autoAction(v, me.hand);
    return a ? { actions: [a], delayMs: 600 } : null;
  }
  if (v.phase === 'draft') return { actions: [{ type: 'pick', turn: v.turn, index: 0 }], delayMs: DELAY };
  if (v.phase === 'theft') {
    // The first player with gold after this one, so no seat is always the one robbed.
    const rich = v.players.map((_, i) => v.players[(me.seat + 1 + i) % v.n]).find((p) => p.seat !== me.seat && p.hasGold);
    return { actions: [{ type: 'steal', turn: v.turn, from: rich?.seat ?? null }], delayMs: DELAY };
  }
  return { actions: playMoves(v), delayMs: DELAY };
}

function playMoves(v: MView): MAction[] {
  const me = v.me!;
  const turn = v.turn;
  const saboteur = me.role === 'saboteur';
  const now = v.round;
  const seenCoal = new Set(me.seen.flatMap((o) => (o.t === 'survey' && o.round === now && o.kind !== 'gold' ? [o.goal] : [])));
  const seenGold = me.seen.find((o) => o.t === 'survey' && o.round === now && o.kind === 'gold');
  const open = v.goals.map((g, i) => ({ ...g, i })).filter((g) => (g.revealed ? g.kind === 'gold' : !seenCoal.has(g.i)));
  const targets = seenGold && seenGold.t === 'survey' ? [v.goals[seenGold.goal]] : open.length ? open : v.goals;
  const near = (p: { x: number; y: number }) => Math.min(...targets.map((g) => dist(p, g)));
  const enemies = new Set(
    me.seen.flatMap((o) => (o.t === 'inspect' && o.round === now && (saboteur ? o.role !== 'saboteur' : o.role === 'saboteur') ? [o.seat] : [])),
  );
  // In the duel the other player is the only rival; a saboteur treats everyone as one.
  const rivals = v.players.filter((p) => p.seat !== me.seat && (saboteur || v.config.mode === 'duel' || enemies.has(p.seat))).map((p) => p.seat);
  const mine = v.players[me.seat];
  const scored: [number, MAction][] = [];

  for (const c of me.hand) {
    if (TUNNEL[c.kind]) {
      const dead = deadEnd(c.kind);
      if (dead !== saboteur) continue;
      for (const s of me.spots[c.id] ?? []) {
        // How close the far side of this card's openings gets to the destinations.
        const rot = (e: keyof typeof STEP) => (s.rot ? ({ N: 'S', S: 'N', E: 'W', W: 'E' } as const)[e] : e);
        const ends = TUNNEL[c.kind].links.flat().map((e) => ({ x: s.x + STEP[rot(e)][0], y: s.y + STEP[rot(e)][1] }));
        const reachDist = Math.min(...ends.map(near));
        scored.push([saboteur ? 50 - 3 * near(s) : 60 - 4 * reachDist + ends.length * 0.1, { type: 'path', turn, card: c.id, ...s }]);
      }
      continue;
    }
    const def = ACTION[c.kind as keyof typeof ACTION];
    if (!def) continue;
    const act = (score: number, extra: Partial<Extract<MAction, { type: 'act' }>>) => scored.push([score, { type: 'act', turn, card: c.id, ...extra }]);
    if (def.kind.startsWith('fix')) {
      for (const p of [mine, ...v.players.filter((p) => p.seat !== me.seat && !rivals.includes(p.seat))]) {
        const tool = def.tools!.find((t) => p.broken.includes(t));
        if (tool) act(p.seat === me.seat ? 90 : 20, { on: p.seat, tool: tool as Tool });
      }
    } else if (def.kind.startsWith('break')) {
      for (const r of rivals) if (!v.players[r].broken.includes(def.tools![0])) act(45 - ((r - me.seat + v.n) % v.n), { on: r });
    } else if (def.kind === 'survey') {
      const hidden = v.goals.map((g, i) => ({ g, i })).filter(({ g, i }) => !g.revealed && !seenCoal.has(i));
      if (!seenGold && hidden.length > 1) act(40, { goal: hidden.sort((a, b) => Math.abs(a.g.y) - Math.abs(b.g.y))[0].i });
    } else if (def.kind === 'caveIn' && saboteur) {
      const cells = v.cells.filter((x) => TUNNEL[x.kind] && near(x) <= 4).sort((a, b) => near(a) - near(b));
      if (cells[0]) act(42, { x: cells[0].x, y: cells[0].y });
    } else if (def.kind === 'theft' && !mine.theft) act(30, {});
    else if (def.kind === 'free' && mine.trap) act(95, { on: me.seat });
    else if (def.kind === 'trap') {
      const r = rivals.find((s) => !v.players[s].trap);
      if (r !== undefined) act(38, { on: r });
    } else if (def.kind === 'guard') {
      const r = v.players.find((p) => p.seat !== me.seat && p.theft);
      if (r) act(12, { on: r.seat });
    } else if (def.kind === 'inspect') {
      const r = v.players.find((p) => p.seat !== me.seat && !me.seen.some((o) => o.t === 'inspect' && o.round === now && o.seat === p.seat));
      if (r) act(15, { on: r.seat });
    }
  }
  scored.sort((a, b) => b[0] - a[0]);
  const worst = [...me.hand].sort((a, b) => junk(b.kind, saboteur) - junk(a.kind, saboteur))[0];
  return [...scored.map((x) => x[1]), ...(worst ? [{ type: 'pass' as const, turn, cards: [worst.id] }] : [])];
}

/** How happily a bot throws this card away. */
function junk(kind: string, saboteur: boolean) {
  if (TUNNEL[kind]) return deadEnd(kind) === saboteur ? 0 : 2;
  return kind === 'swapRole' || kind === 'swapHands' ? 1.5 : 1;
}
