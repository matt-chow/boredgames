/**
 * What the dashboard can say about a plan before it is locked: legality (the rules' own `planError`), the known part
 * of the speed, the corners it reaches and what they would cost. Uses only the driver's own view (AiView).
 */
import type { AiView } from '../rules/ai';
import { cardFx, STRESS } from '../rules/cards';
import { checkpoints, GEAR_COOL, planError, shiftCost, weatherOf, type Plan, type Race } from '../rules/race';

export interface Estimate {
  error: string | null;
  /** Strain the plan pays up front: the shift and any card costs, plus 1 for a paid boost. */
  pay: number;
  /** Known speed and distance; `unknown` counts the turned cards (Stress, boosts) still to add. */
  speed: number;
  dist: number;
  unknown: number;
  catchup: boolean;
  cool: number;
  /** Corners and passes between here and the known distance, with the overspeed each would cost. */
  checks: { m: number; corner: number; limit: number; cost: number }[];
  limp: boolean;
}

export function estimate(ai: AiView, p: Plan, freeBoost = false): Estimate {
  const me = ai.me;
  // planError reads only this car and the track, so the driver's own view is enough.
  const error = planError({ ...ai, cars: { [me.id]: { ...me, done: null } } } as unknown as Race, me.id, p);
  const limp = p.cards.length === 0;
  let speed = 0, value = 0, cool = 0, grip = 0, unknown = 0, pay = limp ? 0 : (shiftCost(me, p.gear) ?? 0);
  if (limp) speed = value = 1;
  for (const i of p.cards) {
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
  if (p.boost && !limp) {
    unknown += 1 + (me.fit.boostFlips ?? 0);
    if (!freeBoost) pay += 1;
  }
  // shortcut: ties on progress are broken by lane and arrival, which this view lacks; a tie may differ by one place.
  const live = ai.cars.filter((c) => !c.done).sort((a, b) => b.pos - a.pos || a.id - b.id).map((c) => c.id);
  const k = live.length >= 2 ? Math.min(live.length - 1, live.length >= 5 ? 2 : 1) : 0;
  const catchup = live.slice(live.length - k).includes(me.id);
  const dist = value + (catchup ? 1 + (me.fit.catchDist ?? 0) : 0) + (ai.round === 1 ? (me.fit.launch ?? 0) : 0);
  const g = limp ? 1 : p.gear;
  cool += GEAR_COOL[g - 1] + ((g === 1 ? me.fit.cool1 : g === 2 ? me.fit.cool2 : g === 3 ? me.fit.cool3 : 0) ?? 0) + (me.fit.coolAll ?? 0);
  if ((weatherOf(ai).limit ?? 0) < 0) cool += me.fit.rainCool ?? 0;
  if (catchup) cool += 1 + (me.fit.catchCool ?? 0);
  const checks = checkpoints(ai, me, me.pos, me.pos + dist, speed, grip);
  return { error, pay, speed, dist, unknown, catchup, cool, checks, limp };
}
