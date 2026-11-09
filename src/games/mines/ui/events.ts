import type { LogEntry, MView } from '../rules/types';

/**
 * The mine's presentation events are its public log lines, each with a stable id from the server. A view that arrives
 * twice presents nothing twice, and a player who joins mid-game sees no replay. Pure, so it is tested without a DOM.
 */

/** Public lines in `next` that `prev` had not seen, oldest first. Nothing on a first view. */
export function newEvents(prev: Pick<MView, 'log'> | null, next: Pick<MView, 'log'>): LogEntry[] {
  if (!prev) return [];
  const seen = prev.log.reduce((m, e) => Math.max(m, e.id), 0);
  return next.log.filter((e) => e.id > seen);
}

/** Whose turn follows the current one, from public counts only: once the deck is gone, empty hands are skipped. */
export function nextUp(view: Pick<MView, 'phase' | 'current' | 'deck'> & { players: { seat: number; hand: number }[] }): number | null {
  if (view.phase !== 'play') return null;
  const n = view.players.length;
  for (let i = 1; i <= n; i++) {
    const p = view.players[(view.current + i) % n];
    // The current player draws after moving, so a non-empty deck means everyone still has a turn coming.
    if (view.deck > 0 || p.hand > 0) return p.seat === view.current ? null : p.seat;
  }
  return null;
}
