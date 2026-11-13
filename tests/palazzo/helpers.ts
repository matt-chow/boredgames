import { apply, project, setup, tick } from '../../src/games/palazzo/rules/engine';
import { KIND_ORDER, KINDS, whyNot, type Kind, type Role } from '../../src/games/palazzo/rules/roles';
import type { PAction, PConfig, PState } from '../../src/games/palazzo/rules/types';

export const CLOCK = 1_000_000;
let nextId = 500;
const card = (role: Role) => ({ id: nextId++, role, up: false });

/**
 * A game at a chosen point, driven through the real `apply`. `hands` gives each seat's hidden cards in order; `deck`
 * runs top first. Seat `first` is up with `coins` each unless given.
 */
export class Game {
  s: PState;
  now = CLOCK;

  constructor(opts: { n?: number; hands?: Role[][]; deck?: Role[]; coins?: number[]; first?: number; config?: Partial<PConfig>; seed?: string } = {}) {
    const n = opts.n ?? opts.hands?.length ?? 3;
    this.s = setup(n, opts.seed ?? 'fixed', { timer: 15, disconnect: 'pause', draft: false, ...opts.config }, this.now);
    if (opts.hands) {
      this.s.seats.forEach((x, i) => (x.hand = opts.hands![i].map(card)));
      this.s.deck = (opts.deck ?? ['envoy', 'envoy', 'envoy', 'bravo', 'bravo']).map(card);
    }
    if (opts.coins) this.s.seats.forEach((x, i) => (x.coins = opts.coins![i]));
    if (opts.first !== undefined) this.s.current = opts.first;
  }

  get phase() {
    return this.s.phase;
  }

  id(seat: number, role: Role) {
    const c = this.s.seats[seat].hand.find((x) => x.role === role && !x.up);
    if (!c) throw new Error(`seat ${seat} holds no hidden ${role}`);
    return c.id;
  }

  try(seat: number, action: Record<string, unknown>) {
    return apply(this.s, seat, { step: this.s.step, ...action } as PAction, this.now);
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

  declare(kind: Kind, target?: number) {
    return this.do(this.s.current, { type: 'declare', kind, ...(target !== undefined ? { target } : {}) });
  }

  pass(...seats: number[]) {
    for (const seat of seats) this.do(seat, { type: 'respond', choice: 'pass' });
    return this;
  }

  /** Everyone still to answer the open window lets it stand. */
  allPass() {
    const w = this.s.window!;
    return this.pass(...w.open.filter((i) => !w.passed.includes(i)));
  }

  challenge(seat: number) {
    return this.do(seat, { type: 'respond', choice: 'challenge' });
  }

  block(seat: number) {
    return this.do(seat, { type: 'respond', choice: 'block' });
  }

  lose(seat: number, role: Role) {
    return this.do(seat, { type: 'reveal', card: this.id(seat, role) });
  }

  give(seat: number, role: Role) {
    return this.do(seat, { type: 'return', card: this.id(seat, role) });
  }

  tick(online: boolean[] = this.s.online, at = this.now) {
    this.now = at;
    const next = tick(this.s, at, online);
    if (next) this.s = next;
    return next !== null;
  }

  coins() {
    return this.s.seats.map((x) => x.coins);
  }

  hidden(seat: number) {
    return this.s.seats[seat].hand.filter((c) => !c.up).map((c) => c.role);
  }

  view(seat: number | null) {
    return project(this.s, seat);
  }

  /** Every card, wherever it is: hands, the deck and a Parley's drawn card. */
  allCards() {
    return [...this.s.seats.flatMap((x) => x.hand), ...this.s.deck, ...(this.s.pend?.drawn ? [this.s.pend.drawn] : [])];
  }
}

/** A legal move for someone who has a decision, picked with `rnd` (0 ≤ rnd() < 1). Null when nobody can act. */
export function randomMove(s: PState, rnd: () => number): { seat: number; action: PAction } | null {
  const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const step = s.step;
  const alive = (i: number) => s.seats[i].hand.some((c) => !c.up);
  if (s.phase === 'over') return null;
  if (s.phase === 'draft') {
    const seat = pick(s.drafting);
    return { seat, action: { type: 'return', step, card: pick(s.seats[seat].hand).id } };
  }
  if (s.phase === 'turn') {
    const seat = s.current;
    const facts = s.seats.map((x) => ({ coins: x.coins, hidden: x.hand.filter((c) => !c.up).length }));
    const options = KIND_ORDER.flatMap((kind) =>
      KINDS[kind].target
        ? s.seats.flatMap((_, t) => (alive(t) && !whyNot(facts, seat, kind, t) ? [{ kind, target: t }] : []))
        : whyNot(facts, seat, kind) ? [] : [{ kind }],
    );
    return { seat, action: { type: 'declare', step, ...pick(options) } };
  }
  if (s.phase === 'window') {
    const w = s.window!;
    const seat = pick(w.open.filter((i) => !w.passed.includes(i)));
    const r = rnd();
    const choice = w.kind === 'block' ? (r < 0.4 ? 'block' : 'pass') : r < 0.25 ? 'challenge' : 'pass';
    return { seat, action: { type: 'respond', step, choice } };
  }
  if (s.phase === 'lose') {
    const seat = s.losses[0].seat;
    return { seat, action: { type: 'reveal', step, card: pick(s.seats[seat].hand.filter((c) => !c.up)).id } };
  }
  const seat = s.pend!.actor;
  return { seat, action: { type: 'return', step, card: pick([...s.seats[seat].hand.filter((c) => !c.up), s.pend!.drawn!]).id } };
}

/** A small seeded generator for test playouts. */
export function prng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
