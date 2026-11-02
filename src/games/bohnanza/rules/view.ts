import type { PlayerResult } from '../../../engine/types';
import type { Bean } from './cards';
import type { BohnanzaConfig } from './config';
import {
  activeDrawCount,
  allPendingPlanted,
  canClaimCoin,
  coinThreshold,
  fieldsValue,
  harvestProtected,
  modal,
  plantTargets,
  stealableVictims,
} from './engine';
import type { BState, BeanCounts, Fx, LogEntry, OfferStatus, Phase } from './state';

/**
 * The only shape that ever leaves the server. Built field-by-field from state
 * so nothing hidden (deck order, other hands, card→bean map) can leak by accident.
 */
export interface CardV {
  id: string;
  t: Bean;
}

export interface PlayerV {
  handCount: number;
  /** Present only for the viewer's own seat. Index 0 = front card. */
  hand?: CardV[];
  fields: CardV[][];
  coins: number;
  /** Ids of coin cards (bean side hidden) so clients can animate them. */
  coinIds: string[];
  pending: CardV[];
  fieldsValue: number;
}

export interface OfferV {
  id: number;
  from: number;
  to: number;
  give: CardV[];
  wantCards: CardV[];
  wantTypes: BeanCounts;
  replyTo: number | null;
  status: OfferStatus;
}

export interface Hints {
  /** Fields the front hand card may be planted in (phase 1). */
  plantFront: number[];
  frontIsMagpie: boolean;
  canFlip: boolean;
  canEndTrading: boolean;
  canEndTurn: boolean;
  canClaimCoin: boolean;
  harvestable: number[];
  /** Per pending card: legal fields. */
  pendingTargets: Record<string, number[]>;
  coinPlantTargets: number[];
  stealVictims: number[];
  /** Fields stolen cards could go into, per victim field bean. */
  stealTargets: Partial<Record<Bean, number[]>>;
  drawCount: number;
}

export interface BView {
  game: 'bohnanza';
  config: BohnanzaConfig;
  n: number;
  you: number | null;
  active: number;
  start: number;
  turn: number;
  phase: Phase;
  planted: number;
  deckCount: number;
  discardCount: number;
  discardTop: CardV | null;
  exhaustions: number;
  exhaustLimit: number;
  drawMode: 'three' | 'each';
  finalTurn: boolean;
  faceUp: CardV[];
  players: PlayerV[];
  offers: OfferV[];
  magpie: { stealsLeft: number; victims: number[] } | null;
  coin: {
    owner: number;
    blocked: boolean;
    claim: boolean;
    mustPlant: CardV | null;
    lastReveal: { card: CardV; blocked: boolean } | null;
    threshold: number;
  } | null;
  modal: ReturnType<typeof modal>;
  log: LogEntry[];
  fx: Fx[];
  seq: number;
  result: PlayerResult[] | null;
  hints: Hints | null;
}

export function project(s: BState, viewer: number | null): BView {
  const cv = (id: string): CardV => ({ id, t: s.cards[id] });
  const you = viewer !== null && viewer >= 0 && viewer < s.n ? viewer : null;
  // Every fx entry is public: any card it names is now face up.
  const fx = s.fx.map((f) => ({ ...f }));
  // Offers may name cards still in someone's hand. Their bean type was shown to
  // the table, but the id is masked so it can't be used to track the card.
  const hidden = new Set<string>(s.players.flatMap((p, seat) => (seat === you ? [] : p.hand)));
  const offerCard = (o: number, i: number, id: string): CardV =>
    hidden.has(id) ? { id: `o${o}.${i}`, t: s.cards[id] } : cv(id);
  return {
    game: 'bohnanza',
    config: { ...s.config },
    n: s.n,
    you,
    active: s.active,
    start: s.start,
    turn: s.turn,
    phase: s.phase,
    planted: s.planted,
    deckCount: s.deck.length,
    discardCount: s.discard.length,
    discardTop: s.discard.length ? cv(s.discard[s.discard.length - 1]) : null,
    exhaustions: s.exhaustions,
    exhaustLimit: s.exhaustLimit,
    drawMode: s.drawMode,
    finalTurn: s.finalTurn,
    faceUp: s.faceUp.map(cv),
    players: s.players.map((p, seat) => ({
      handCount: p.hand.length,
      hand: seat === you ? p.hand.map(cv) : undefined,
      fields: p.fields.map((f) => f.map(cv)),
      coins: p.coins.length,
      coinIds: [...p.coins],
      pending: p.pending.map(cv),
      fieldsValue: fieldsValue(s, seat),
    })),
    offers: s.offers.map((o) => ({
      id: o.id,
      from: o.from,
      to: o.to,
      give: o.give.map((id, i) => offerCard(o.id, i, id)),
      wantCards: o.wantCards.map((id, i) => offerCard(o.id, 100 + i, id)),
      wantTypes: { ...o.wantTypes },
      replyTo: o.replyTo,
      status: o.status,
    })),
    magpie: s.magpie ? { stealsLeft: s.magpie.stealsLeft, victims: [...s.magpie.victims] } : null,
    coin: s.coin
      ? {
          owner: s.coin.owner,
          blocked: s.coin.blocked,
          claim: s.coin.claim,
          mustPlant: s.coin.mustPlant ? cv(s.coin.mustPlant) : null,
          lastReveal: s.coin.lastReveal ? { card: cv(s.coin.lastReveal.card), blocked: s.coin.lastReveal.blocked } : null,
          threshold: coinThreshold(s.n),
        }
      : null,
    modal: modal(s),
    log: s.log.map((l) => ({ ...l })),
    fx,
    seq: s.seq,
    result: s.result ? s.result.map((r) => ({ ...r })) : null,
    hints: you === null ? null : hints(s, you),
  };
}

function hints(s: BState, seat: number): Hints {
  const p = s.players[seat];
  const isActive = seat === s.active;
  const m = modal(s);
  const over = s.phase === 'over';
  const front = p.hand[0];
  const frontBean = front ? s.cards[front] : null;
  const phase1 = !over && isActive && !m && s.phase === 'plant' && s.planted < 2 && !!front;
  const pendingTargets: Record<string, number[]> = {};
  if (s.phase === 'resolve' && !(isActive && m)) for (const id of p.pending) pendingTargets[id] = plantTargets(s, seat, s.cards[id]);
  const harvestable =
    over || (s.magpie && !isActive)
      ? []
      : p.fields.map((f, i) => (f.length && !harvestProtected(s, seat, i) ? i : -1)).filter((i) => i >= 0);
  const stealTargets: Partial<Record<Bean, number[]>> = {};
  const stealVictims = isActive && s.magpie ? stealableVictims(s) : [];
  for (const v of stealVictims)
    for (const f of s.players[v].fields)
      if (f.length) stealTargets[s.cards[f[0]]] = plantTargets(s, seat, s.cards[f[0]]);
  return {
    plantFront: phase1 && frontBean !== 'magpie' ? plantTargets(s, seat, frontBean!) : [],
    frontIsMagpie: phase1 && frontBean === 'magpie',
    canFlip: !over && isActive && !m && s.phase === 'plant' && (s.planted > 0 || p.hand.length === 0),
    canEndTrading: !over && isActive && !m && s.phase === 'trade',
    canEndTurn: !over && isActive && !m && s.phase === 'resolve' && allPendingPlanted(s),
    canClaimCoin: canClaimCoin(s, seat),
    harvestable,
    pendingTargets,
    coinPlantTargets: isActive && s.coin?.mustPlant ? plantTargets(s, seat, s.cards[s.coin.mustPlant]) : [],
    stealVictims,
    stealTargets,
    drawCount: s.drawMode === 'each' ? 1 : activeDrawCount(s),
  };
}

