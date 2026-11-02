import { randInt, seedRng, shuffle, type RngState } from '../../src/engine/rng';
import { actors, apply, modal, plantTargets, setup, tradeable } from '../../src/games/bohnanza/rules/engine';
import type { BohnanzaConfig } from '../../src/games/bohnanza/rules/config';
import type { BAction, BState } from '../../src/games/bohnanza/rules/state';
import type { Bean } from '../../src/games/bohnanza/rules/cards';

export interface Step {
  seat: number;
  action: BAction;
}

const pick = <T>(rng: RngState, xs: T[]): T => xs[randInt(rng, xs.length)];

/**
 * A random but legal-minded player. It proposes candidate actions for every
 * seat that may act; the engine decides legality. Trading is bounded per turn
 * so games always progress.
 */
export function candidates(s: BState, rng: RngState, tradesThisTurn: number): Step[] {
  const out: Step[] = [];
  const m = modal(s);
  const a = s.active;
  const harvests = (seat: number) =>
    s.players[seat].fields.forEach((f, i) => f.length && out.push({ seat, action: { type: 'harvest', field: i } }));

  if (m === 'magpie') {
    for (let v = 0; v < s.n; v++)
      s.players[v].fields.forEach((f, vf) => {
        if (v === a || !f.length) return;
        for (const t of plantTargets(s, a, s.cards[f[f.length - 1]]))
          out.push({ seat: a, action: { type: 'steal', victim: v, victimField: vf, field: t } });
      });
    if (!out.length) harvests(a);
    out.push({ seat: a, action: { type: 'endSteal' } });
    return out;
  }
  if (m === 'coinClaim') {
    out.push({ seat: s.coin!.owner, action: { type: 'coinRespond', resist: randInt(rng, 2) === 0 } });
    return out;
  }
  if (m === 'coinPlant') {
    for (const t of plantTargets(s, a, s.cards[s.coin!.mustPlant!])) out.push({ seat: a, action: { type: 'plantCoinCard', field: t } });
    if (!out.length) harvests(a);
    return out;
  }

  if (s.coin && randInt(rng, 3) === 0) out.push({ seat: a, action: { type: 'claimCoin' } });

  switch (s.phase) {
    case 'plant': {
      const front = s.players[a].hand[0];
      if (front && s.planted < 2) {
        if (s.cards[front] === 'magpie') out.push({ seat: a, action: { type: 'playMagpie' } });
        else {
          const t = plantTargets(s, a, s.cards[front]);
          for (const f of t) out.push({ seat: a, action: { type: 'plant', field: f } });
          if (!t.length) harvests(a);
        }
      }
      if (s.planted > 0 || !front) out.push({ seat: a, action: { type: 'flip' } });
      break;
    }
    case 'trade': {
      const open = s.offers.filter((o) => o.status === 'open');
      for (const o of open) {
        const hand = s.players[o.to].hand;
        // Try to satisfy wanted types from the recipient's hand.
        const chosen: string[] = [];
        const need = { ...o.wantTypes };
        for (const id of hand) {
          const b = s.cards[id] as Bean;
          if ((need[b] ?? 0) > 0) {
            chosen.push(id);
            need[b]!--;
          }
        }
        out.push({ seat: o.to, action: { type: 'accept', offer: o.id, cards: chosen } });
        out.push({ seat: o.to, action: { type: 'reject', offer: o.id } });
        out.push({ seat: o.from, action: { type: 'cancel', offer: o.id } });
      }
      if (tradesThisTurn < 4) {
        const other = pick(rng, [...Array(s.n).keys()].filter((x) => x !== a));
        const [from, to] = randInt(rng, 2) ? [a, other] : [other, a];
        const mine = tradeable(s, from);
        const give = mine.filter(() => randInt(rng, 3) === 0).slice(0, 3);
        const theirsHand = s.players[to].hand;
        const wantTypes: Partial<Record<Bean, number>> = {};
        if (theirsHand.length && randInt(rng, 2)) {
          // Ask for a bean type the bot guesses (may be absent: then the offer can only be rejected).
          wantTypes[s.cards[pick(rng, theirsHand)]] = 1;
        }
        const wantCards = to === a && s.faceUp.length && randInt(rng, 2) ? [pick(rng, s.faceUp)] : [];
        const counter = open.find((o) => o.to === from && o.from === to);
        out.push({
          seat: from,
          action: { type: 'offer', to, give, wantCards, wantTypes, replyTo: counter && randInt(rng, 2) ? counter.id : null },
        });
      }
      out.push({ seat: a, action: { type: 'endTrading' } });
      break;
    }
    case 'resolve': {
      for (let seat = 0; seat < s.n; seat++)
        for (const id of s.players[seat].pending) {
          const t = plantTargets(s, seat, s.cards[id]);
          for (const f of t) out.push({ seat, action: { type: 'plantPending', card: id, field: f } });
          if (!t.length) harvests(seat);
        }
      out.push({ seat: a, action: { type: 'endTurn' } });
      break;
    }
  }
  // Occasional spontaneous harvest by anyone.
  if (randInt(rng, 8) === 0) harvests(randInt(rng, s.n));
  return out;
}

export interface SimResult {
  seed: string;
  steps: Step[];
  final: BState;
  rejected: number;
}

export function simulate(
  seed: string,
  n: number,
  config: BohnanzaConfig,
  onStep?: (prev: BState, next: BState, step: Step) => void,
  maxSteps = 20000,
): SimResult {
  let s = setup({ playerCount: n, seed, config });
  const rng = seedRng('bot:' + seed);
  const steps: Step[] = [];
  let rejected = 0;
  let turn = s.turn;
  let trades = 0;
  while (s.phase !== 'over') {
    if (steps.length >= maxSteps) throw new Error(`seed ${seed}: no termination after ${maxSteps} steps`);
    if (s.turn !== turn) {
      turn = s.turn;
      trades = 0;
    }
    const cands = candidates(s, rng, trades);
    if (!cands.length) throw new Error(`seed ${seed}: stuck in ${s.phase}, actors ${actors(s)}`);
    let progressed = false;
    // Try candidates in random order until one is legal.
    for (const step of shuffle(rng, cands)) {
      if (progressed) break;
      const r = apply(s, step.seat, step.action);
      if (!r.ok) {
        rejected++;
        continue;
      }
      onStep?.(s, r.state, step);
      if (step.action.type === 'offer') trades++;
      steps.push(step);
      s = r.state;
      progressed = true;
    }
    if (!progressed) throw new Error(`seed ${seed}: no legal candidate in ${s.phase} (modal ${modal(s)})`);
  }
  return { seed, steps, final: s, rejected };
}

export function replay(seed: string, n: number, config: BohnanzaConfig, steps: Step[]): BState {
  let s = setup({ playerCount: n, seed, config });
  for (const st of steps) {
    const r = apply(s, st.seat, st.action);
    if (!r.ok) throw new Error(`replay failed at ${st.action.type}: ${r.error}`);
    s = r.state;
  }
  return s;
}
