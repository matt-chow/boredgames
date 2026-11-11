import type { Kind } from '../../src/games/sealed/rules/cards';
import { apply, setup } from '../../src/games/sealed/rules/engine';
import type { SAction, SConfig, SState } from '../../src/games/sealed/rules/types';

export const CLOCK = 1_000_000;
let nextId = 5000;
const card = (kind: Kind) => ({ id: nextId++, kind });

/**
 * A round at a chosen point, driven through the real `apply`. `hands` is each seat's card before the turn;
 * `deck` runs top first, and the first player has already drawn its top card.
 */
export class Table {
  s: SState;
  now = CLOCK;

  constructor(opts: { n?: number; ruleset?: SConfig['ruleset']; target?: number; hands?: Kind[]; deck?: Kind[]; first?: number; reserve?: Kind; seed?: string } = {}) {
    const n = opts.n ?? opts.hands?.length ?? 3;
    this.s = setup(n, opts.seed ?? 'fixed', { ruleset: opts.ruleset ?? 'classic', target: opts.target ?? 0, timer: 0 }, this.now);
    if (opts.hands) {
      const first = opts.first ?? 0;
      this.s.seats.forEach((x, i) => (x.hand = [card(opts.hands![i])]));
      this.s.deck = (opts.deck ?? ['censor', 'censor', 'censor']).map(card);
      this.s.reserve = card(opts.reserve ?? 'scribe');
      this.s.faceUp = [];
      this.s.current = first;
      this.s.seats[first].hand.push(this.s.deck.shift()!);
    }
  }

  id(seat: number, kind: Kind) {
    const c = this.s.seats[seat].hand.find((x) => x.kind === kind);
    if (!c) throw new Error(`seat ${seat} holds no ${kind}`);
    return c.id;
  }

  try(seat: number, action: Record<string, unknown>) {
    return apply(this.s, seat, { turn: this.s.turn, ...action } as SAction, this.now);
  }

  do(seat: number, action: Record<string, unknown>) {
    const r = this.try(seat, action);
    if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
    this.s = r.state;
    return this;
  }

  code(seat: number, action: Record<string, unknown>) {
    const r = this.try(seat, action);
    return r.ok ? 'ok' : r.code;
  }

  /** The current player plays a card of this kind. */
  play(kind: Kind, target?: number, guess?: Kind) {
    const seat = this.s.current;
    return this.do(seat, { type: 'play', card: this.id(seat, kind), ...(target !== undefined ? { target } : {}), ...(guess ? { guess } : {}) });
  }

  kinds(seat: number) {
    return this.s.seats[seat].hand.map((c) => c.kind);
  }
}
