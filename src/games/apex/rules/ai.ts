/**
 * The one computer driver (AX-AI). It plans from `AiView`, which holds only what that car's driver could know: its own
 * hand, engine and deck contents (not order), and the public table. Same view in, same plan out.
 */
import { cardFx, committable, isValued, HEAT, STRESS, valueOf, type Card } from './cards';
import {
  canDrive, checkpoints, cornerBill, GEAR_COOL, shiftCost,
  type AiSpec, type Car, type Plan, type Race, type Track, type Turn, type TurnAct, type TurnOptions,
} from './race';

export interface AiView extends Track {
  round: number;
  me: Pick<Car, 'id' | 'hand' | 'engine' | 'gear' | 'pos' | 'fit' | 'reliefLap' | 'freeBoostLap'> & { ai: AiSpec; pool: Card[] };
  cars: { id: number; pos: number; done: boolean }[];
}

export const DEFAULT_AI: AiSpec = { risk: 'balanced', level: 'club' };

export function aiView(r: Race, id: number, ai: AiSpec = r.cars[id].ai ?? DEFAULT_AI): AiView {
  const c = r.cars[id];
  return {
    circuit: r.circuit, laps: r.laps, n: r.n, modules: r.modules, weather: r.weather, sectors: r.sectors,
    cornerDelta: r.cornerDelta, round: r.round,
    me: {
      id, hand: [...c.hand], engine: c.engine, gear: c.gear, pos: c.pos, fit: c.fit, reliefLap: c.reliefLap, freeBoostLap: c.freeBoostLap, ai,
      // Contents only: sorted, so deck order cannot leak.
      pool: [...c.deck, ...c.discard].sort(),
    },
    cars: r.cars.map((o) => ({ id: o.id, pos: o.pos, done: !!o.done })),
  };
}

const RISK = { cautious: 1.5, balanced: 1, bold: 0.65 };

function combos(idx: number[], k: number): number[][] {
  if (k === 0) return [[]];
  const out: number[][] = [];
  for (let i = 0; i <= idx.length - k; i++) for (const rest of combos(idx.slice(i + 1), k - 1)) out.push([idx[i], ...rest]);
  return out;
}

/** A small deterministic jitter so novice drivers are not all identical. */
function jitter(v: AiView, k: number): number {
  let h = (v.round * 7919 + v.me.id * 104729 + k * 31) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return (h % 1000) / 1000;
}

export function aiPlan(v: AiView): Plan {
  const me = v.me;
  if (!canDrive(me)) return { gear: 1, cards: [] };
  const valued = me.pool.filter(isValued).map(valueOf);
  const avg = valued.length ? valued.reduce((s, x) => s + x, 0) / valued.length : 0;
  const lo = valued.length ? Math.min(...valued) : 0;
  const hi = valued.length ? Math.max(...valued) : 0;
  const flipEst = me.ai.risk === 'cautious' ? (avg + hi) / 2 : me.ai.risk === 'bold' ? (avg + lo) / 2 : avg;
  const heatInHand = me.hand.filter((x) => x === HEAT).length;
  const ok = me.hand.map((_, i) => i).filter((i) => committable(me.hand[i]));
  const weight = RISK[me.ai.risk] * (1 + 3 / (me.engine + 1));
  const behind = v.cars.filter((o) => !o.done && o.id !== me.id && o.pos < me.pos).length;
  const catchup = behind === 0 && v.cars.filter((o) => !o.done).length >= 2 ? 1 + (me.fit.catchDist ?? 0) : 0;

  let best: { plan: Plan; score: number } | null = null;
  for (let g = 1; g <= 4; g++) {
    const sc = shiftCost(me, g);
    if (sc == null || ok.length < g) continue;
    // Novices only look at the obvious hand: their highest cards for each gear (AX-AI-2).
    const sets =
      me.ai.level === 'novice'
        ? [[...ok].sort((a, b) => valueOf(me.hand[b]) - valueOf(me.hand[a])).slice(0, g)]
        : combos(ok, g);
    for (const cards of sets) {
      const fx = cards.map((i) => cardFx(me.hand[i]));
      const cost = sc + fx.reduce((s, x) => s + (x?.cost ?? 0), 0);
      if (cost > me.engine) continue;
      const flips = cards.reduce((s, i) => s + (me.hand[i] === STRESS ? 1 : cardFx(me.hand[i])?.flips ?? 0), 0);
      const grip = fx.reduce((s, x) => s + (x?.grip ?? 0), 0);
      {
        const nf = flips;
        const speed = fx.reduce((s, x) => s + (x ? x.speed ?? x.value : 0), 0) + nf * flipEst;
        const dist = fx.reduce((s, x) => s + (x?.value ?? 0), 0) + nf * flipEst + catchup;
        const cps = checkpoints(v, me, me.pos, Math.round(me.pos + dist), Math.round(speed), grip);
        const corner = cps.reduce((s, x) => s + x.cost, 0);
        const pay = cost + corner;
        const cool = Math.min(heatInHand, GEAR_COOL[g - 1] + (fx.reduce((s, x) => s + (x?.cool ?? 0), 0)));
        let score = dist - weight * pay + 0.8 * cool;
        if (pay > me.engine) score -= 12 * RISK[me.ai.risk] + dist; // a spin
        if (me.ai.level === 'novice') score += jitter(v, g * 16 + cards.length) * 2;
        if (!best || score > best.score) best = { plan: { gear: g, cards }, score };
      }
    }
  }
  return best?.plan ?? { gear: 1, cards: [] };
}

/** AX-DRF-2: take a draft that would overspeed? Only if the engine can pay and the risk setting allows. */
export function aiDraft(v: AiView, hazard: number): boolean {
  const room = v.me.engine - hazard;
  if (room < 0) return false;
  if (v.me.ai.risk === 'cautious') return false;
  if (v.me.ai.risk === 'balanced') return hazard <= 1 && room >= 2;
  return hazard <= 2 && room >= 1;
}


const ALLOW = { cautious: 0, balanced: 1, bold: 2 };
const RESERVE = { cautious: 2, balanced: 1, bold: 0 };

/** AX-AI-3: decisions during the car's own turn, from what its driver can see. */
export function aiTurn(v: AiView, t: Turn, o: TurnOptions): TurnAct {
  const me = v.me;
  const risk = me.ai.risk;
  const bill = (to: number, speed = t.speed) => cornerBill(v, me, t.start, to, speed, t.grip).reduce((s, x) => s + x.cost, 0);
  const affordable = (total: number) => total <= me.engine - RESERVE[risk];
  if (t.stage === 'react') {
    if (o.cool) return { do: 'cool', n: o.cool };
    if (o.catchup) {
      const extra = o.catchupCost;
      if (extra <= 0 || (extra <= ALLOW[risk] && affordable(o.cost + extra))) return { do: 'catchup' };
    }
    if (o.boost && me.ai.level !== 'novice') {
      const valued = me.pool.filter(isValued).map(valueOf);
      const est = Math.round((valued.length ? valued.reduce((s, x) => s + x, 0) / valued.length : 0) * (1 + (me.fit.boostFlips ?? 0)));
      const after = bill(me.pos + est, t.speed + est) + (o.freeBoost ? 0 : 1);
      const limit = me.ai.level === 'club' ? 1 : 1 + ALLOW[risk];
      if (est > 0 && after - o.cost <= limit && affordable(after)) return { do: 'boost' };
    }
    return { do: 'go' };
  }
  if (t.stage === 'draft') {
    const h = t.offer?.hazard ?? 0;
    return { do: 'draft', take: h === 0 ? o.cost <= me.engine : aiDraft({ ...v, me: { ...me, engine: me.engine - o.cost } }, h) };
  }
  // Throw away only the Heat the fittings allow, from the right.
  const out: number[] = [];
  for (let i = me.hand.length - 1; i >= 0 && out.length < (me.fit.dumpStrain ?? 0); i--) if (me.hand[i] === HEAT) out.push(i);
  return { do: 'finish', discard: out };
}
