import { apply, project, setup } from '../../src/games/mines/rules/engine';
import { botMove } from '../../src/games/mines/rules/bot';
import { mines } from '../../src/games/mines';
import { isTunnel } from '../../src/games/mines/rules/cards';
import type { Card, MAction, MConfig, MState } from '../../src/games/mines/rules/types';

export const CLOCK = 1_000_000;
export const config = (c: Partial<MConfig> = {}): MConfig => ({ ...mines.defaultConfig(3), ...c });

/** A game driven through the real `apply`, with helpers to stage a board or a hand. */
export class Game {
  s: MState;
  now = CLOCK;

  constructor(n = 4, c: Partial<MConfig> = {}, seed = 'fixed') {
    this.s = setup(n, seed, config(c), this.now);
  }

  try(seat: number, a: MAction) {
    return apply(this.s, seat, a, this.now);
  }

  do(seat: number, a: MAction) {
    const r = this.try(seat, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
    this.s = r.state;
    return this;
  }

  code(seat: number, a: MAction) {
    const r = this.try(seat, a);
    return r.ok ? 'ok' : r.code;
  }

  /** Put these cards in a seat's hand, ids 900+, keeping the rest of the hand. */
  give(seat: number, ...kinds: string[]): Card[] {
    const cards = kinds.map((kind, i) => ({ id: 900 + seat * 20 + i, kind }));
    this.s.seats[seat].hand = [...cards, ...this.s.seats[seat].hand.slice(cards.length)];
    return cards;
  }

  place(kind: string, x: number, y: number, rot: 0 | 1 = 0) {
    this.s.cells[`${x},${y}`] = { kind, rot };
    return this;
  }

  get turn() {
    return this.s.turn;
  }

  view(seat: number | null) {
    return project(this.s, seat);
  }
}

/** Every card is somewhere: deck, set aside, hands, board, discards or lying in front of a player (MS-INV1). */
export function cardCount(s: MState) {
  const board = Object.values(s.cells).filter((c) => isTunnel(c.kind)).length;
  const front = s.seats.reduce((a, x) => a + x.broken.length + (x.theft ? 1 : 0) + (x.trap ? 1 : 0), 0);
  return s.deck.length + s.removed.length + s.seats.reduce((a, x) => a + x.hand.length, 0) + board + s.discards + front;
}

/** Play a whole game with practice bots in every seat; `each` sees every state. */
export function autoplay(n: number, c: Partial<MConfig>, seed: string, each?: (s: MState, a: MAction, seat: number) => void, pick = botMove) {
  let s = setup(n, seed, config(c), CLOCK);
  let now = CLOCK;
  for (let steps = 0; s.phase !== 'over'; steps++) {
    if (steps > 5000) throw new Error('game did not end');
    const seat = mines.actors(s)[0];
    const move = pick(project(s, seat));
    if (!move) throw new Error(`no move for seat ${seat} in ${s.phase}`);
    let done = false;
    for (const a of move.actions) {
      const r = apply(s, seat, a, (now += 1000));
      if (r.ok) {
        each?.(r.state, a, seat);
        s = r.state;
        done = true;
        break;
      }
    }
    if (!done) throw new Error(`no legal candidate for seat ${seat}: ${JSON.stringify(move.actions[0])}`);
  }
  return s;
}
