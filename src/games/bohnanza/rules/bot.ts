import type { BotMove } from '../../../engine/types';
import { coinsFor } from './cards';
import type { BAction } from './state';
import type { BView, CardV, Hints, OfferV, PlayerV } from './view';

/** Pause after the last change before a bot acts, so people can follow along. */
const STEP_MS = 700;
/** A bot answering an offer takes a moment, like a person would. */
const REPLY_MS = 1500;
/** An active bot keeps trading open for a while so people can make it offers. */
const TRADE_MS = 6000;

/**
 * A deliberately simple computer player. It decides only from its own
 * projection, so it never knows more than a person in that seat would.
 * Returns candidate actions, best first; the host applies the first legal one.
 *
 * Policy: plant the front card (stacking a second card only onto a matching
 * field); give away turned-over cards that don't fit its fields, one player at
 * a time; accept offers that cost no more cards than they bring and fit its
 * fields; end trading after a pause; plant everything received into matching
 * fields; and harvest the most valuable field when it needs room.
 */
export function botMove(v: BView): BotMove<BAction> | null {
  const me = v.you;
  const h = v.hints;
  if (me === null || !h || v.phase === 'over') return null;
  const p = v.players[me];
  const active = v.active === me;
  const go = (actions: BAction[], delayMs = STEP_MS) => (actions.length ? { actions, delayMs } : null);
  const plantOrder = (fields: number[]) => [...fields].sort((a, b) => p.fields[b].length - p.fields[a].length);
  const harvests = harvestOrder(p, h).map((field): BAction => ({ type: 'harvest', field }));

  if (v.modal === 'coinClaim') return v.coin?.owner === me ? go([{ type: 'coinRespond', resist: true }]) : null;
  if (v.modal === 'magpie') return active ? go([...steals(v, h, p), { type: 'endSteal' }]) : null;
  if (v.modal === 'coinPlant')
    return active
      ? go([...plantOrder(h.coinPlantTargets).map((field): BAction => ({ type: 'plantCoinCard', field })), ...harvests])
      : null;
  if (active && h.canClaimCoin) return go([{ type: 'claimCoin' }]);

  switch (v.phase) {
    case 'plant': {
      if (!active) return null;
      const out: BAction[] = [];
      if (h.frontIsMagpie) out.push({ type: 'playMagpie' });
      const targets = plantOrder(h.plantFront);
      if (v.planted === 0) {
        out.push(...targets.map((field): BAction => ({ type: 'plant', field })));
        if (!targets.length && !h.frontIsMagpie) out.push(...harvests);
      } else {
        // A second card only if it grows an existing field.
        const grow = targets.filter((f) => p.fields[f].length > 0);
        out.push(...grow.map((field): BAction => ({ type: 'plant', field })));
      }
      if (h.canFlip) out.push({ type: 'flip' });
      return go(out);
    }
    case 'trade': {
      const mine = v.offers.filter((o) => o.status === 'open' && o.to === me);
      if (mine.length) return go(mine.map((o) => answer(v, p, o)), REPLY_MS);
      if (!active || !h.canEndTrading) return null;
      const gift = donation(v, p, me);
      return gift ? go([gift, { type: 'endTrading' }]) : go([{ type: 'endTrading' }], TRADE_MS);
    }
    case 'resolve': {
      const out: BAction[] = [];
      for (const c of p.pending)
        out.push(...plantOrder(h.pendingTargets[c.id] ?? []).map((field): BAction => ({ type: 'plantPending', card: c.id, field })));
      if (p.pending.length) out.push(...harvests);
      if (active && h.canEndTurn) out.push({ type: 'endTurn' });
      return go(out);
    }
  }
  return null;
}

/** Beans that would need a field of their own, beyond the ones already planted. */
function misfits(p: PlayerV, cards: CardV[]): CardV[] {
  const planted = new Set(p.fields.filter((f) => f.length).map((f) => f[0].t));
  let empty = p.fields.filter((f) => !f.length).length;
  const out: CardV[] = [];
  const claimed = new Set<string>();
  for (const c of cards) {
    if (planted.has(c.t) || claimed.has(c.t)) continue;
    if (empty > 0) {
      empty--;
      claimed.add(c.t);
    } else out.push(c);
  }
  return out;
}

/**
 * Offer a turned-over card that won't fit as a gift, to each other player in
 * turn order until someone takes it. Nothing once everyone has said no.
 */
function donation(v: BView, p: PlayerV, me: number): BAction | null {
  const asked = (card: string, to: number) => v.offers.some((o) => o.from === me && o.to === to && o.give.some((c) => c.id === card));
  const waiting = v.offers.some((o) => o.from === me && o.status === 'open');
  if (waiting) return null;
  for (const c of misfits(p, v.faceUp))
    for (let k = 1; k < v.n; k++) {
      const to = (me + k) % v.n;
      if (!asked(c.id, to)) return { type: 'offer', to, give: [c.id], wantCards: [], wantTypes: {} };
    }
  return null;
}

/** Most valuable field first; among worthless ones, the smallest, so little is lost. */
function harvestOrder(p: PlayerV, h: Hints): number[] {
  const value = (i: number) => (p.fields[i].length ? coinsFor(p.fields[i][0].t, p.fields[i].length) : 0);
  return [...h.harvestable].sort((a, b) => value(b) - value(a) || p.fields[a].length - p.fields[b].length);
}

/** Steal onto a matching field first, from the victim's biggest field. */
function steals(v: BView, h: Hints, p: PlayerV): BAction[] {
  const out: { a: BAction; score: number }[] = [];
  for (const victim of h.stealVictims)
    v.players[victim].fields.forEach((f, victimField) => {
      if (!f.length) return;
      for (const field of h.stealTargets[f[0].t] ?? [])
        out.push({ a: { type: 'steal', victim, victimField, field }, score: (p.fields[field].length ? 100 : 0) + f.length });
    });
  return out.sort((a, b) => b.score - a.score).map((x) => x.a);
}

/** Accept an offer that fits and costs no more cards than it brings; otherwise decline. */
function answer(v: BView, p: PlayerV, o: OfferV): BAction {
  const reject: BAction = { type: 'reject', offer: o.id };
  const hand = p.hand ?? [];
  // Give cards from the back of the hand: the front cards are what we plant next.
  const chosen: CardV[] = [];
  for (const [bean, n] of Object.entries(o.wantTypes)) {
    const pool = hand.filter((c) => c.t === bean && !chosen.includes(c)).reverse();
    if (pool.length < (n ?? 0)) return reject;
    chosen.push(...pool.slice(0, n));
  }
  const cost = chosen.length + o.wantCards.length;
  if (o.give.length < cost || !o.give.length) return reject;
  // Every received bean needs a matching field or its own empty one.
  if (misfits(p, [...p.pending, ...o.give]).length) return reject;
  return { type: 'accept', offer: o.id, cards: chosen.map((c) => c.id) };
}
