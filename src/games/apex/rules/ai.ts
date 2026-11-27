/**
 * The one computer driver (AX-AI). It plans from `AiView`, which holds only what that car's driver could know: its own
 * hand, engine and deck contents (not order), and the public table. Same view in, same plan out.
 */
import { cardFx, committable, isValued, STRAIN, STRESS, valueOf, type Card } from './cards';
import {
  canDrive, checkpoints, circuitOf, GEAR_COOL, shiftCost, spaceOf,
  type AiSpec, type Car, type Plan, type Race, type Track,
} from './race';

export interface AiView extends Track {
  round: number;
  me: Pick<Car, 'id' | 'hand' | 'engine' | 'gear' | 'pos' | 'fit'> & { ai: AiSpec; pool: Card[] };
  cars: { id: number; pos: number; done: boolean }[];
}

export const DEFAULT_AI: AiSpec = { risk: 'balanced', level: 'club' };

export function aiView(r: Race, id: number, ai: AiSpec = r.cars[id].ai ?? DEFAULT_AI): AiView {
  const c = r.cars[id];
  return {
    circuit: r.circuit, laps: r.laps, n: r.n, modules: r.modules, weather: r.weather, sectors: r.sectors,
    cornerDelta: r.cornerDelta, round: r.round,
    me: {
      id, hand: [...c.hand], engine: c.engine, gear: c.gear, pos: c.pos, fit: c.fit, ai,
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
  if (!canDrive(me)) return { gear: 1, cards: [], discard: [], boost: false };
  const valued = me.pool.filter(isValued).map(valueOf);
  const avg = valued.length ? valued.reduce((s, x) => s + x, 0) / valued.length : 0;
  const lo = valued.length ? Math.min(...valued) : 0;
  const hi = valued.length ? Math.max(...valued) : 0;
  const flipEst = me.ai.risk === 'cautious' ? (avg + hi) / 2 : me.ai.risk === 'bold' ? (avg + lo) / 2 : avg;
  const strainInHand = me.hand.filter((x) => x === STRAIN).length;
  const tunnel = v.modules.mountains && circuitOf(v).tunnel[spaceOf(v, me.pos)] && !me.fit.tunnelBoost;
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
      for (const boost of me.ai.level === 'works' && !tunnel ? [false, true] : [false]) {
        if (boost && me.engine - cost < (me.ai.risk === 'bold' ? 1 : 3)) continue;
        const nf = flips + (boost ? 1 + (me.fit.boostFlips ?? 0) : 0);
        const speed = fx.reduce((s, x) => s + (x ? x.speed ?? x.value : 0), 0) + nf * flipEst;
        const dist = fx.reduce((s, x) => s + (x?.value ?? 0), 0) + nf * flipEst + catchup;
        const cps = checkpoints(v, me, me.pos, Math.round(me.pos + dist), Math.round(speed), grip);
        const corner = cps.reduce((s, x) => s + x.cost, 0);
        const pay = cost + corner + (boost ? 1 : 0);
        const cool = Math.min(strainInHand, GEAR_COOL[g - 1] + (fx.reduce((s, x) => s + (x?.cool ?? 0), 0)));
        let score = dist - weight * pay + 0.8 * cool;
        if (pay > me.engine) score -= 12 * RISK[me.ai.risk] + dist; // a spin
        if (me.ai.level === 'novice') score += jitter(v, g * 16 + cards.length) * 2;
        if (!best || score > best.score) best = { plan: { gear: g, cards, discard: [], boost }, score };
      }
    }
  }
  return best?.plan ?? { gear: 1, cards: [], discard: [], boost: false };
}

/** AX-DRF-2: take a draft that would overspeed? Only if the engine can pay and the risk setting allows. */
export function aiDraft(v: AiView, hazard: number): boolean {
  const room = v.me.engine - hazard;
  if (room < 0) return false;
  if (v.me.ai.risk === 'cautious') return false;
  if (v.me.ai.risk === 'balanced') return hazard <= 1 && room >= 2;
  return hazard <= 2 && room >= 1;
}

