import type { Bean } from '../rules/cards';
import type { BeanCounts } from '../rules/state';
import type { BView, CardV, OfferV } from '../rules/view';

/** An offer being composed locally. Nothing is sent until the player presses Send. */
export interface Draft {
  to: number;
  /** Card ids from your hand (or the turned-over cards when you are active). */
  give: string[];
  /** Turned-over cards requested from the active player. */
  wantCards: string[];
  wantTypes: BeanCounts;
  replyTo: number | null;
}

/** Choosing which hand cards fulfil an offer's requested bean types. */
export interface Choosing {
  offer: number;
  cards: string[];
}

export const countOf = (c: BeanCounts) => Object.values(c).reduce((a, b) => a + (b ?? 0), 0);

export function countTypes(cards: CardV[]): BeanCounts {
  const out: BeanCounts = {};
  for (const c of cards) out[c.t] = (out[c.t] ?? 0) + 1;
  return out;
}

export function sameCounts(a: BeanCounts, b: BeanCounts) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Bean>;
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

/** Whether `hand` holds enough cards of each requested type. */
export function canFill(hand: CardV[], want: BeanCounts) {
  const have = countTypes(hand);
  return (Object.keys(want) as Bean[]).every((k) => (have[k] ?? 0) >= (want[k] ?? 0));
}

/** If there is exactly one way to fill the request, return it. */
export function forcedChoice(hand: CardV[], want: BeanCounts): string[] | null {
  const have = countTypes(hand);
  const keys = Object.keys(want) as Bean[];
  if (!keys.every((k) => (have[k] ?? 0) === want[k])) return null;
  return hand.filter((c) => keys.includes(c.t)).map((c) => c.id);
}

/** Every player you may currently send an offer to. */
export function offerTargets(g: BView): number[] {
  if (g.you === null || g.phase !== 'trade' || g.modal) return [];
  if (g.you === g.active) return Array.from({ length: g.n }, (_, i) => i).filter((i) => i !== g.you);
  return [g.active];
}

export const isLive = (o: OfferV) => o.status === 'open';
