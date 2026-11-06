import { apply, setup } from '../../src/games/deaddrop/rules/engine';
import type { Claim, DAction, DState, Loc, Order } from '../../src/games/deaddrop/rules/types';

export const CLOCK = 1_000_000;

/** A match at a chosen point, with chosen missions, driven through the real `apply`. */
export class Match {
  s: DState;
  now = CLOCK;

  constructor(missions: Loc[][] = [['embassy', 'station'], ['hotel', 'harbour']], seed = 'fixed') {
    this.s = setup(seed, this.now);
    this.s.seats[0].missions = missions[0];
    this.s.seats[1].missions = missions[1];
  }

  try(seat: number, action: DAction) {
    return apply(this.s, seat, action, this.now);
  }

  do(seat: number, action: DAction) {
    const r = this.try(seat, action);
    if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
    this.s = r.state;
    return this;
  }

  code(seat: number, action: DAction) {
    const r = this.try(seat, action);
    return r.ok ? 'ok' : r.code;
  }

  order(seat: number, order: Order) {
    return this.do(seat, { type: 'order', round: this.s.round, order });
  }

  claim(seat: number, claim: Claim) {
    return this.do(seat, { type: 'claim', round: this.s.round, claim });
  }

  ack(seat: number) {
    const count = this.s.statements.filter((x) => x.seat === 1 - seat && x.round === this.s.round).length;
    return this.do(seat, { type: 'ack', round: this.s.round, count });
  }

  /** Both file a statement and acknowledge, so the match reaches Secret Orders. */
  brief(a: Claim = { kind: 'none' }, b: Claim = { kind: 'none' }) {
    this.claim(0, a).claim(1, b);
    return this.ack(0).ack(1);
  }

  /** Both orders, then both close the report if the match goes on. */
  round(a: Order, b: Order, claims: [Claim?, Claim?] = []) {
    this.brief(claims[0], claims[1]);
    this.order(0, a).order(1, b);
    return this.closeReport();
  }

  closeReport() {
    if (this.s.phase === 'report') this.do(0, { type: 'continue', round: this.s.round }).do(1, { type: 'continue', round: this.s.round });
    return this;
  }

  /** Orders only, leaving the match in its report. */
  resolve(a: Order, b: Order) {
    this.brief();
    return this.order(0, a).order(1, b);
  }
}

export const deliver = (target: Loc, cover?: Loc): Order => (cover ? { action: 'deliver', target, cover } : { action: 'deliver', target });
export const investigate = (target: Loc): Order => ({ action: 'investigate', target });
export const intercept = (target: Loc): Order => ({ action: 'intercept', target });
export const decoy = (target: Loc): Order => ({ action: 'decoy', target });
