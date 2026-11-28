/**
 * What the dashboard can say about a plan before it is locked: legality (the rules' own `planError`), the speed it
 * gives (a range when cards are turned), where the car lands and what the corners on the way would cost. Uses only
 * the driver's own view (AiView). Boost, catch-up and slipstream are choices made later in the turn, so they are not
 * in the preview (AX-TURN-4).
 */
import type { AiView } from '../rules/ai';
import { cardFx, isValued, STRESS, valueOf } from '../rules/cards';
import {
  cornerBill, GEAR_COOL, lanesAt, planError, shiftCost, spaceOf, weatherOf, type Plan, type Race,
} from '../rules/race';

export type Risk = 'safe' | 'possible' | 'certain';

export interface Estimate {
  error: string | null;
  /** Heat the plan pays up front: the shift and any card costs. */
  pay: number;
  /** Speed and distance: [least, most]. They differ only when Stress or a card turns cards over. */
  speed: [number, number];
  dist: [number, number];
  /** Where the car would stop for the least and the most distance, after any car still to move blocks it. */
  to: [number, number];
  unknown: number;
  /** Catch-up is on offer this round (taken or declined in the turn). */
  catchup: boolean;
  cool: number;
  /** Corners and passes reached at the most distance, with the overspeed each would cost at the most speed. */
  checks: { m: number; corner: number; limit: number; cost: number }[];
  /** Corner Heat for the least and the most outcome. */
  cost: [number, number];
  risk: Risk;
  limp: boolean;
}

/** The value one turned card can add: the least and most valued card left in the deck and discard. */
function flipRange(pool: string[]): [number, number] {
  const v = pool.filter(isValued).map(valueOf);
  return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0];
}

export function estimate(ai: AiView, p: Plan): Estimate {
  const me = ai.me;
  // planError reads only this car and the track, so the driver's own view is enough.
  const error = planError({ ...ai, cars: { [me.id]: { ...me, done: null } } } as unknown as Race, me.id, p);
  const limp = p.cards.length === 0;
  let speed = 0, value = 0, cool = 0, grip = 0, unknown = 0, pay = limp ? 0 : (shiftCost(me, p.gear) ?? 0);
  if (limp) speed = value = 1;
  for (const i of limp ? [] : p.cards) {
    const c = me.hand[i];
    const fx = cardFx(c);
    if (fx) {
      speed += fx.speed ?? fx.value;
      value += fx.value;
      cool += fx.cool ?? 0;
      grip += fx.grip ?? 0;
      pay += fx.cost ?? 0;
    }
    unknown += c === STRESS ? 1 : (fx?.flips ?? 0);
  }
  const [lo, hi] = flipRange(me.pool);
  // shortcut: ties on progress are broken by lane and arrival, which this view lacks; a tie may differ by one place.
  const live = ai.cars.filter((c) => !c.done).sort((a, b) => b.pos - a.pos || a.id - b.id).map((c) => c.id);
  const k = live.length >= 2 ? Math.min(live.length - 1, live.length >= 5 ? 2 : 1) : 0;
  const catchup = live.slice(live.length - k).includes(me.id);
  const launch = ai.round === 1 ? (me.fit.launch ?? 0) : 0;
  const g = limp ? 1 : p.gear;
  cool += GEAR_COOL[g - 1] + ((g === 1 ? me.fit.cool1 : g === 2 ? me.fit.cool2 : g === 3 ? me.fit.cool3 : 0) ?? 0) + (me.fit.coolAll ?? 0);
  if ((weatherOf(ai).limit ?? 0) < 0) cool += me.fit.rainCool ?? 0;
  // Cars behind resolve after this one and are still where they are; cars ahead move first, out of the way.
  const behind = ai.cars.filter((c) => c.id !== me.id && !c.done && c.pos < me.pos);
  const land = (d: number) => {
    for (let q = me.pos + d; q > me.pos; q--)
      if (behind.filter((c) => spaceOf(ai, c.pos) === spaceOf(ai, q)).length < lanesAt(ai, spaceOf(ai, q))) return q;
    return me.pos;
  };
  const dist: [number, number] = [value + unknown * lo + launch, value + unknown * hi + launch];
  const to: [number, number] = [land(dist[0]), land(dist[1])];
  const spd: [number, number] = [speed + unknown * lo, speed + unknown * hi];
  const bill = (t: number, s: number) => cornerBill(ai, me, me.pos, t, s, grip);
  const checks = bill(to[1], spd[1]).map(({ m, corner, limit, cost }) => ({ m, corner, limit, cost }));
  const sum = (b: { cost: number }[]) => b.reduce((s, x) => s + x.cost, 0);
  const cost: [number, number] = [sum(bill(to[0], spd[0])), sum(checks)];
  const risk: Risk = cost[0] > 0 ? 'certain' : cost[1] > 0 ? 'possible' : 'safe';
  return { error, pay, speed: spd, dist, to, unknown, catchup, cool, checks, cost, risk, limp };
}
