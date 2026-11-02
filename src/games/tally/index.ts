import type { GameModule } from '../../engine/types';

/**
 * Architecture smoke test, not a playable game: players take turns adding
 * 1–3 to a shared total; whoever reaches the target wins. Exists to prove the
 * hub can register and run another ruleset without touching Bohnanza code.
 */
export interface TallyConfig { target: number }
export interface TallyState { n: number; target: number; total: number; turn: number; winner: number | null }
export type TallyAction = { type: 'add'; amount: number };

export const tally: GameModule<TallyConfig, TallyState, TallyAction, TallyState> = {
  meta: { id: 'tally', name: 'Tally (test)', minPlayers: 2, maxPlayers: 6, stateVersion: 1 },
  options: [],
  defaultConfig: () => ({ target: 21 }),
  validateConfig: (c, n) => (n < 2 || n > 6 ? 'Tally needs 2–6 players.' : c.target > 0 ? null : 'Bad target.'),
  setup: ({ playerCount, config }) => ({ n: playerCount, target: config.target, total: 0, turn: 0, winner: null }),
  apply(s, seat, a) {
    if (s.winner !== null) return { ok: false, code: 'game-over', error: 'Game over.' };
    if (seat !== s.turn % s.n) return { ok: false, code: 'not-your-turn', error: 'Not your turn.' };
    if (a?.type !== 'add' || ![1, 2, 3].includes(a.amount)) return { ok: false, code: 'bad-request', error: 'Add 1–3.' };
    const total = Math.min(s.target, s.total + a.amount);
    return { ok: true, undoable: false, state: { ...s, total, turn: s.turn + 1, winner: total >= s.target ? seat : null } };
  },
  actors: (s) => (s.winner === null ? [s.turn % s.n] : []),
  project: (s) => ({ ...s }),
  isOver: (s) => s.winner !== null,
  results: (s) =>
    s.winner === null
      ? null
      : Array.from({ length: s.n }, (_, seat) => ({ seat, score: seat === s.winner ? 1 : 0, rank: seat === s.winner ? 1 : 2, winner: seat === s.winner })),
};
