/**
 * Tunnel geometry: edge matching, connection to the entrance and team reach through gates (MS-GEO*).
 * A node is one link group of one card; two nodes join when their open edges face each other.
 */
import { EDGES, ENTRANCE, GOALS, OPPOSITE, TUNNEL, type DoorColour, type Edge, type TunnelDef } from './cards';
import type { Cell, Goal, Rot, Spot } from './types';

export const START = { x: 0, y: 0 };
export const GOAL_SPOTS = [{ x: 8, y: -2 }, { x: 8, y: 0 }, { x: 8, y: 2 }];
/** shortcut: a fixed board edge, roomy for every card in the deck; widen if a long game ever presses against it. */
export const BOUNDS = { minX: -9, maxX: 17, minY: -9, maxY: 9 };

const STEP: Record<Edge, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
export const key = (x: number, y: number) => `${x},${y}`;
export const parse = (k: string) => k.split(',').map(Number) as [number, number];

export const defOf = (kind: string): TunnelDef => TUNNEL[kind] ?? GOALS[kind as keyof typeof GOALS] ?? ENTRANCE;

/** Turning a card half way round swaps each edge for its opposite (MS-GEO2). */
const turn = (e: Edge, rot: Rot) => (rot ? OPPOSITE[e] : e);
export const linksOf = (kind: string, rot: Rot): Edge[][] => defOf(kind).links.map((g) => g.map((e) => turn(e, rot)));
export const opens = (kind: string, rot: Rot, e: Edge) => linksOf(kind, rot).some((g) => g.includes(e));

const groupOf = (kind: string, rot: Rot, e: Edge) => linksOf(kind, rot).findIndex((g) => g.includes(e));

/**
 * Every node joined to the entrance. Ladders count as joined to it (MS-X-LAD1). With `bar`, gates of that colour are
 * walls: that is how far the other crew can get (MS-X-DOOR1).
 */
export function reach(cells: Record<string, Cell>, bar?: DoorColour): Set<string> {
  const seen = new Set<string>();
  const todo: [number, number, number][] = [];
  for (const [k, c] of Object.entries(cells)) {
    const d = defOf(c.kind);
    if (!d.ladder || (bar && d.door === bar)) continue;
    const [x, y] = parse(k);
    linksOf(c.kind, c.rot).forEach((_, g) => todo.push([x, y, g]));
  }
  while (todo.length) {
    const [x, y, g] = todo.pop()!;
    const id = `${x},${y},${g}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const c = cells[key(x, y)];
    for (const e of linksOf(c.kind, c.rot)[g]) {
      const nx = x + STEP[e][0], ny = y + STEP[e][1];
      const o = cells[key(nx, ny)];
      if (!o || (bar && defOf(o.kind).door === bar)) continue;
      const og = groupOf(o.kind, o.rot, OPPOSITE[e]);
      if (og >= 0) todo.push([nx, ny, og]);
    }
  }
  return seen;
}

const goalAt = (goals: Goal[], x: number, y: number) => goals.findIndex((g) => g.x === x && g.y === y);

/** Can this tunnel card go here? Returns a reason when it can't. `joined` is `reach(cells)`, passed in to share it. */
export function misfit(cells: Record<string, Cell>, goals: Goal[], joined: Set<string>, kind: string, x: number, y: number, rot: Rot): string | null {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || y < BOUNDS.minY || y > BOUNDS.maxY) return 'That is past the edge of the mine.';
  if (cells[key(x, y)] || goalAt(goals, x, y) >= 0) return 'Something is already there.';
  const d = defOf(kind);
  let touches = false;
  let joins = false;
  let nearGoal = false;
  for (const e of EDGES) {
    const nx = x + STEP[e][0], ny = y + STEP[e][1];
    const gi = goalAt(goals, nx, ny);
    if (gi >= 0) nearGoal = true;
    const o = cells[key(nx, ny)];
    // A face-down destination is not a tunnel yet: nothing has to match it (MS-GEO4).
    if (!o) continue;
    touches = true;
    const mine = opens(kind, rot, e);
    if (mine !== opens(o.kind, o.rot, OPPOSITE[e])) return 'The tunnels must line up on every side.';
    if (mine && joined.has(`${nx},${ny},${groupOf(o.kind, o.rot, OPPOSITE[e])}`)) joins = true;
  }
  if (!touches) return 'A tunnel must touch the mine.';
  if (d.ladder) return nearGoal ? 'A ladder can’t go next to a destination.' : null;
  return joins ? null : 'This tunnel would not join up with the entrance.';
}

/** Every legal place and turn for a tunnel card. */
export function spots(cells: Record<string, Cell>, goals: Goal[], kind: string, joined = reach(cells)): Spot[] {
  const out: Spot[] = [];
  const near = new Set<string>();
  for (const k of Object.keys(cells)) {
    const [x, y] = parse(k);
    for (const e of EDGES) near.add(key(x + STEP[e][0], y + STEP[e][1]));
  }
  const symmetric = sameTurned(kind);
  for (const k of [...near].sort()) {
    const [x, y] = parse(k);
    for (const rot of symmetric ? [0 as Rot] : [0 as Rot, 1 as Rot]) if (!misfit(cells, goals, joined, kind, x, y, rot)) out.push({ x, y, rot });
  }
  return out;
}

/** A card that looks and joins the same both ways round needs only one entry. */
function sameTurned(kind: string) {
  const norm = (rot: Rot) => linksOf(kind, rot).map((g) => [...g].sort().join('')).sort().join('|');
  return norm(0) === norm(1);
}

/**
 * Turn face up every hidden destination a joined tunnel now opens onto, rotated to meet it where it can (MS-GEO5).
 * Mutates `cells` and `goals`; returns the indexes turned.
 */
export function revealReached(cells: Record<string, Cell>, goals: Goal[]): number[] {
  const out: number[] = [];
  for (let again = true; again; ) {
    again = false;
    const joined = reach(cells);
    goals.forEach((g, i) => {
      if (g.revealed) return;
      for (const e of EDGES) {
        const nx = g.x + STEP[e][0], ny = g.y + STEP[e][1];
        const o = cells[key(nx, ny)];
        if (!o || !opens(o.kind, o.rot, OPPOSITE[e]) || !joined.has(`${nx},${ny},${groupOf(o.kind, o.rot, OPPOSITE[e])}`)) continue;
        g.revealed = true;
        cells[key(g.x, g.y)] = { kind: g.kind, rot: opens(g.kind, 0, e) ? 0 : 1 };
        out.push(i);
        again = true;
        return;
      }
    });
  }
  return out;
}

/** Whether the gold is joined to the entrance, with gates of `bar`'s colour as walls. */
export function goldJoined(cells: Record<string, Cell>, goals: Goal[], bar?: DoorColour): boolean {
  const g = goals.find((x) => x.kind === 'gold');
  if (!g?.revealed) return false;
  const joined = reach(cells, bar);
  return linksOf('gold', 0).some((_, i) => joined.has(`${g.x},${g.y},${i}`));
}

export const crystalsShowing = (cells: Record<string, Cell>) => Object.values(cells).reduce((a, c) => a + (defOf(c.kind).crystals ?? 0), 0);
