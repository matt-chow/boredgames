import { randInt, seedRng, shuffle } from '../../../engine/rng';
import type { ApplyResult, PlayerResult, SetupContext } from '../../../engine/types';
import { BEANS, coinsFor, isPlantable, type Bean } from './cards';
import { setupSpec, validateConfig, type BohnanzaConfig } from './config';
import {
  STATE_VERSION,
  type BAction,
  type BState,
  type BeanCounts,
  type Offer,
  type PlayerState,
} from './state';

/** Thrown inside the reducer for illegal actions; converted to an ApplyResult. */
export class RuleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const fail = (code: string, msg: string): never => {
  throw new RuleError(code, msg);
};

const HAND_SIZE = 5;
const MAX_OPEN_OFFERS_PER_SEAT = 12;
const KEEP_CLOSED_OFFERS = 24;
const KEEP_LOG = 80;

// ───────────────────────────── setup ─────────────────────────────

export function setup(ctx: SetupContext<BohnanzaConfig>): BState {
  const { playerCount: n, config } = ctx;
  const err = validateConfig(config, n);
  if (err) throw new RuleError('config', err);
  const spec = setupSpec(config, n);
  const rng = seedRng(ctx.seed);

  // Build the deck, then assign ids through an independent permutation so a
  // card's id carries no information about its bean type or deck position.
  const beans: Bean[] = [];
  for (const [bean, count] of Object.entries(spec.composition) as [Bean, number][]) {
    for (let i = 0; i < count; i++) beans.push(bean);
  }
  const ids = shuffle(
    rng,
    beans.map((_, i) => i),
  );
  const cards: Record<string, Bean> = {};
  const deck: string[] = [];
  beans.forEach((bean, i) => {
    const id = 'c' + ids[i].toString(36);
    cards[id] = bean;
    deck.push(id);
  });
  shuffle(rng, deck);

  const players: PlayerState[] = [];
  for (let p = 0; p < n; p++) {
    players.push({
      hand: [],
      fields: Array.from({ length: spec.fields }, () => []),
      coins: [],
      pending: [],
    });
  }
  // Deal five cards to each player, one at a time; each goes behind the last.
  for (let r = 0; r < HAND_SIZE; r++) for (const pl of players) pl.hand.push(deck.shift()!);

  const start = randInt(rng, n);
  const s: BState = {
    v: STATE_VERSION,
    config: { ...config },
    n,
    rng,
    cards,
    deck,
    discard: [],
    exhaustions: 0,
    exhaustLimit: spec.exhaustLimit,
    drawMode: spec.drawMode,
    deckOver: false,
    finalTurn: false,
    players,
    start,
    active: start,
    turn: 1,
    phase: 'plant',
    planted: 0,
    faceUp: [],
    offers: [],
    nextOfferId: 1,
    magpie: null,
    coin: config.beanCoin
      ? // The coin starts with the player to the right of the starting player.
        { owner: (start + n - 1) % n, blocked: false, claim: false, mustPlant: null, lastReveal: null }
      : null,
    log: [],
    fx: [],
    seq: 0,
    result: null,
  };
  log(s, null, `Game started. @${start} goes first.`);
  return s;
}

// ───────────────────────────── queries ─────────────────────────────

export function fieldBean(s: BState, field: string[]): Bean | null {
  return field.length ? s.cards[field[0]] : null;
}

export function canPlantIn(s: BState, seat: number, field: number, bean: Bean): boolean {
  const f = s.players[seat]?.fields[field];
  if (!f || !isPlantable(bean)) return false;
  return f.length === 0 || s.cards[f[0]] === bean;
}

/** Fields where `bean` may be planted right now. */
export function plantTargets(s: BState, seat: number, bean: Bean): number[] {
  const out: number[] = [];
  s.players[seat].fields.forEach((_, i) => canPlantIn(s, seat, i, bean) && out.push(i));
  return out;
}

/** Bean protection rule: a 1-card field can't be harvested while another field holds 2+ cards. */
export function harvestProtected(s: BState, seat: number, field: number): boolean {
  const fields = s.players[seat].fields;
  if (fields[field].length !== 1) return false;
  return fields.some((f, i) => i !== field && f.length > 1);
}

export function harvestValue(s: BState, field: string[]): number {
  const bean = fieldBean(s, field);
  return bean ? coinsFor(bean, field.length) : 0;
}

/** Sum of what all of a player's fields would pay if harvested now. */
export function fieldsValue(s: BState, seat: number): number {
  return s.players[seat].fields.reduce((sum, f) => sum + harvestValue(s, f), 0);
}

export function coinThreshold(n: number): number {
  return n === 3 ? 6 : 5;
}

export function tradeable(s: BState, seat: number): string[] {
  const hand = s.players[seat].hand;
  return seat === s.active ? [...s.faceUp, ...hand] : [...hand];
}

/** A pending interrupt that only certain actions may proceed through. */
export function modal(s: BState): 'magpie' | 'coinClaim' | 'coinPlant' | null {
  if (s.magpie) return 'magpie';
  if (s.coin?.claim) return 'coinClaim';
  if (s.coin?.mustPlant) return 'coinPlant';
  return null;
}

export function allPendingPlanted(s: BState): boolean {
  return s.players.every((p) => p.pending.length === 0);
}

/** Phase-4 draw count for the active player under 'three' draw mode. */
export function activeDrawCount(s: BState): number {
  if (s.coin) {
    if (s.coin.owner === s.active) return 4;
    if (fieldsValue(s, s.active) < 1) return 2;
  }
  return 3;
}

export function canClaimCoin(s: BState, seat: number): boolean {
  const c = s.coin;
  return (
    !!c &&
    s.phase !== 'over' &&
    seat === s.active &&
    c.owner !== seat &&
    !c.blocked &&
    !modal(s) &&
    fieldsValue(s, seat) >= coinThreshold(s.n)
  );
}

export function actors(s: BState): number[] {
  if (s.phase === 'over') return [];
  const m = modal(s);
  if (m === 'coinClaim') return [s.coin!.owner];
  if (m) return [s.active];
  if (s.phase === 'trade') {
    const set = new Set([s.active]);
    for (const o of s.offers) if (o.status === 'open') set.add(o.to);
    return [...set];
  }
  if (s.phase === 'resolve') {
    const waiting = s.players.map((p, i) => (p.pending.length ? i : -1)).filter((i) => i >= 0);
    return waiting.length ? waiting : [s.active];
  }
  return [s.active];
}

// ───────────────────────────── helpers ─────────────────────────────

function log(s: BState, seat: number | null, text: string) {
  s.log.push({ seq: s.seq, seat, text });
  if (s.log.length > KEEP_LOG) s.log.splice(0, s.log.length - KEEP_LOG);
}

const beanName = (s: BState, id: string) => BEANS[s.cards[id]].name;

function removeFrom(list: string[], id: string): boolean {
  const i = list.indexOf(id);
  if (i < 0) return false;
  list.splice(i, 1); // preserves the order of the remaining cards
  return true;
}

/**
 * Called whenever the draw pile becomes empty. Returns false when this was the
 * final exhaustion (the deck is closed); otherwise reshuffles the discard pile.
 */
function exhaust(s: BState): boolean {
  s.exhaustions++;
  if (s.exhaustions >= s.exhaustLimit) {
    s.deckOver = true;
    log(s, null, `The draw pile ran out for the ${ordinal(s.exhaustions)} time.`);
    return false;
  }
  s.deck = shuffle(s.rng, s.discard.splice(0));
  s.fx.push({ k: 'reshuffle' });
  log(s, null, `The draw pile ran out (${ordinal(s.exhaustions)} time); the discard pile was reshuffled.`);
  return true;
}

function drawOne(s: BState): string | null {
  if (s.deckOver) return null;
  // Only possible if a reshuffle found an empty discard pile: that counts as running out again.
  while (s.deck.length === 0) if (!exhaust(s)) return null;
  const id = s.deck.shift()!;
  if (s.deck.length === 0) exhaust(s);
  return id;
}

function ordinal(k: number) {
  return k === 1 ? 'first' : k === 2 ? 'second' : k === 3 ? 'third' : `${k}th`;
}

function harvestInto(s: BState, seat: number, field: number) {
  const p = s.players[seat];
  const cards = p.fields[field];
  const bean = s.cards[cards[0]];
  let coins = coinsFor(bean, cards.length);
  let fieldBonus = false;
  if (bean === 'field' && cards.length === 2) {
    coins = 0;
    if (p.fields.length < 3 && s.phase !== 'over') {
      p.fields.push([]);
      fieldBonus = true;
    }
  }
  const coinCards = cards.slice(cards.length - coins);
  const rest = cards.slice(0, cards.length - coins);
  p.coins.push(...coinCards);
  s.discard.push(...rest);
  p.fields[field] = [];
  s.fx.push({ k: 'harvest', seat, coins, cards: cards.length, fieldBonus: fieldBonus || undefined });
  return { bean, coins, count: cards.length, fieldBonus };
}

function voidOffersTouching(s: BState, ids: Iterable<string>) {
  const gone = new Set(ids);
  for (const o of s.offers) {
    if (o.status !== 'open') continue;
    if (o.give.some((c) => gone.has(c)) || o.wantCards.some((c) => gone.has(c))) o.status = 'void';
  }
}

function pruneOffers(s: BState) {
  const closed = s.offers.filter((o) => o.status !== 'open');
  if (closed.length > KEEP_CLOSED_OFFERS) {
    const drop = new Set(closed.slice(0, closed.length - KEEP_CLOSED_OFFERS).map((o) => o.id));
    s.offers = s.offers.filter((o) => !drop.has(o.id));
  }
}

function countTypes(s: BState, ids: string[]): BeanCounts {
  const out: BeanCounts = {};
  for (const id of ids) out[s.cards[id]] = (out[s.cards[id]] ?? 0) + 1;
  return out;
}

function sameCounts(a: BeanCounts, b: BeanCounts) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Bean>;
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

function cleanCounts(raw: BeanCounts): BeanCounts {
  const out: BeanCounts = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (!(k in BEANS)) fail('bad-request', `Unknown bean type "${k}".`);
    if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 40) fail('bad-request', 'Invalid bean count.');
    if (v) out[k as Bean] = v;
  }
  return out;
}

function assertDistinct(ids: string[]) {
  if (new Set(ids).size !== ids.length) fail('bad-request', 'A card was listed twice.');
}

function requireSeat(s: BState, seat: number) {
  if (!Number.isInteger(seat) || seat < 0 || seat >= s.n) fail('bad-request', 'Unknown player.');
}

function requireActive(s: BState, seat: number, what: string) {
  if (seat !== s.active) fail('not-your-turn', `Only the active player can ${what}.`);
}

function requireNoModal(s: BState) {
  const m = modal(s);
  if (m === 'magpie') fail('magpie-pending', 'Finish the Magpie steal first.');
  if (m === 'coinClaim') fail('coin-pending', 'Waiting for the Bean Coin holder to respond.');
  if (m === 'coinPlant') fail('coin-plant', 'The bean revealed for the Bean Coin must be planted first.');
}

function requireFieldIndex(p: PlayerState, field: number) {
  if (!Number.isInteger(field) || field < 0 || field >= p.fields.length) fail('bad-field', 'That field does not exist.');
}

function plantInto(s: BState, seat: number, field: number, id: string) {
  const p = s.players[seat];
  requireFieldIndex(p, field);
  const bean = s.cards[id];
  if (!isPlantable(bean)) fail('not-plantable', 'Magpie Beans are never planted.');
  if (!canPlantIn(s, seat, field, bean)) {
    const other = BEANS[fieldBean(s, p.fields[field])!].name;
    fail(
      'field-mismatch',
      `That field holds ${other}s. Plant ${BEANS[bean].name}s in an empty or matching field — harvest a field to make room.`,
    );
  }
  p.fields[field].push(id);
  s.fx.push({ k: 'plant', seat, card: id });
}

// ───────────────────────────── end of game ─────────────────────────────

function endGame(s: BState) {
  s.phase = 'over';
  s.magpie = null;
  for (const o of s.offers) if (o.status === 'open') o.status = 'void';
  // Final harvest of all fields. Pending cards can't exist here (phase 3 completed).
  s.players.forEach((p, seat) => {
    p.fields.forEach((f, i) => {
      if (f.length) harvestInto(s, seat, i);
    });
  });
  s.result = computeResults(s);
  s.fx.push({ k: 'gameOver' });
  const w = s.result.find((r) => r.winner)!;
  log(s, null, `Game over. @${w.seat} wins with ${w.score} coins.`);
}

export function computeResults(s: BState): PlayerResult[] {
  const coinOwner = s.coin ? s.coin.owner : -1;
  // Coin cards only; the AMIGO Bean Coin itself is worth nothing.
  const rows = s.players.map((p, seat) => ({
    seat,
    score: p.coins.length,
    distance: (seat - s.start + s.n) % s.n,
  }));
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.seat === coinOwner) - Number(a.seat === coinOwner) ||
      b.distance - a.distance,
  );
  return rows.map((r, i) => {
    const tied = rows.filter((x) => x.score === r.score).length > 1;
    let detail: string | undefined;
    if (tied && i === rows.findIndex((x) => x.score === r.score)) {
      detail = r.seat === coinOwner ? 'Won the tie with the Bean Coin' : 'Won the tie: furthest from the starting player';
    }
    return { seat: r.seat, score: r.score, rank: i + 1, winner: i === 0, detail };
  });
}

// ───────────────────────────── turn flow ─────────────────────────────

function enterResolve(s: BState) {
  for (const o of s.offers) if (o.status === 'open') o.status = 'void';
  const active = s.players[s.active];
  active.pending.push(...s.faceUp);
  s.faceUp = [];
  s.phase = 'resolve';
  // Magpie Beans received in phase 2 go to the back of the hand instead of a field.
  s.players.forEach((p, seat) => {
    const mags = p.pending.filter((id) => s.cards[id] === 'magpie');
    if (!mags.length) return;
    p.pending = p.pending.filter((id) => s.cards[id] !== 'magpie');
    p.hand.push(...mags);
    log(s, seat, `@${seat} takes ${mags.length} Magpie Bean${mags.length > 1 ? 's' : ''} into hand.`);
  });
  maybeFinishResolve(s);
}

function maybeFinishResolve(s: BState) {
  if (s.phase === 'resolve' && s.finalTurn && allPendingPlanted(s) && !modal(s)) endGame(s);
}

function drawPhase(s: BState) {
  const order: number[] = [];
  if (s.drawMode === 'each') {
    for (let k = 0; k < s.n; k++) order.push((s.active + k) % s.n);
  } else {
    const count = activeDrawCount(s);
    for (let k = 0; k < count; k++) order.push(s.active);
  }
  const drawn = new Map<number, number>();
  for (const seat of order) {
    const id = drawOne(s);
    if (id === null) break;
    s.players[seat].hand.push(id);
    drawn.set(seat, (drawn.get(seat) ?? 0) + 1);
  }
  for (const [seat, count] of drawn) {
    s.fx.push({ k: 'draw', seat, count });
    log(s, seat, `@${seat} draws ${count} card${count > 1 ? 's' : ''}.`);
  }
  if (s.deckOver) return endGame(s);
  s.active = (s.active + 1) % s.n;
  s.turn++;
  s.phase = 'plant';
  s.planted = 0;
  s.faceUp = [];
  s.offers = [];
  if (s.coin) s.coin = { ...s.coin, blocked: false, lastReveal: null };
  s.fx.push({ k: 'turn', active: s.active });
}

// ───────────────────────────── reducer ─────────────────────────────

/** Actions that reveal nothing hidden and affect only the actor may be undone. */
const UNDOABLE = new Set<BAction['type']>(['plant', 'plantPending', 'harvest']);

export function apply(prev: BState, seat: number, action: BAction): ApplyResult<BState> {
  try {
    if (!action || typeof action !== 'object' || typeof action.type !== 'string')
      fail('bad-request', 'Malformed action.');
    requireSeat(prev, seat);
    if (prev.phase === 'over') fail('game-over', 'The game is over.');
    const s: BState = structuredClone(prev);
    s.fx = [];
    s.seq++;
    reduce(s, seat, action);
    maybeFinishResolve(s);
    pruneOffers(s);
    return { ok: true, state: s, undoable: UNDOABLE.has(action.type) };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, code: e.code, error: e.message };
    throw e;
  }
}

function reduce(s: BState, seat: number, a: BAction) {
  const me = s.players[seat];
  switch (a.type) {
    case 'plant': {
      requireActive(s, seat, 'plant from hand');
      requireNoModal(s);
      if (s.phase !== 'plant') fail('wrong-phase', 'Planting from your hand happens in phase 1.');
      if (s.planted >= 2) fail('plant-limit', 'You may plant at most two cards from your hand.');
      if (!me.hand.length) fail('empty-hand', 'Your hand is empty.');
      const id = me.hand[0];
      if (s.cards[id] === 'magpie') fail('magpie-front', 'Your front card is a Magpie Bean — play it to steal.');
      plantInto(s, seat, a.field, id);
      me.hand.shift();
      s.planted++;
      log(s, seat, `@${seat} plants a ${beanName(s, id)}.`);
      return;
    }
    case 'playMagpie': {
      requireActive(s, seat, 'play a Magpie Bean');
      requireNoModal(s);
      if (s.phase !== 'plant') fail('wrong-phase', 'Magpie Beans are played in phase 1.');
      if (s.planted >= 2) fail('plant-limit', 'You have already played two cards this phase.');
      const id = me.hand[0];
      if (!id || s.cards[id] !== 'magpie') fail('no-magpie', 'Your front card is not a Magpie Bean.');
      me.hand.shift();
      s.discard.push(id);
      s.planted++;
      s.magpie = { stealsLeft: 2, victims: [] };
      log(s, seat, `@${seat} plays a Magpie Bean and may steal from up to two players.`);
      if (!stealableVictims(s).length) s.magpie = null;
      return;
    }
    case 'steal': {
      requireActive(s, seat, 'steal');
      if (!s.magpie) fail('no-magpie', 'There is no Magpie steal in progress.');
      requireSeat(s, a.victim);
      if (a.victim === seat) fail('bad-target', 'You cannot steal from yourself.');
      if (s.magpie!.victims.includes(a.victim)) fail('bad-target', 'You already stole from that player.');
      const vf = s.players[a.victim].fields[a.victimField];
      if (!vf || !vf.length) fail('bad-target', 'That field is empty.');
      const id = vf[vf.length - 1];
      plantInto(s, seat, a.field, id);
      vf.pop();
      s.magpie!.stealsLeft--;
      s.magpie!.victims.push(a.victim);
      s.fx.push({ k: 'steal', seat, victim: a.victim });
      log(s, seat, `@${seat} steals a ${beanName(s, id)} from @${a.victim}.`);
      if (s.magpie!.stealsLeft === 0 || !stealableVictims(s).length) s.magpie = null;
      return;
    }
    case 'endSteal': {
      requireActive(s, seat, 'end the steal');
      if (!s.magpie) fail('no-magpie', 'There is no Magpie steal in progress.');
      s.magpie = null;
      return;
    }
    case 'flip': {
      requireActive(s, seat, 'turn over cards');
      requireNoModal(s);
      if (s.phase !== 'plant') fail('wrong-phase', 'Cards are turned over at the start of phase 2.');
      if (s.planted === 0 && me.hand.length > 0) fail('must-plant', 'You must plant the front card of your hand first.');
      for (let k = 0; k < 2; k++) {
        const id = drawOne(s);
        if (id === null) break;
        s.faceUp.push(id);
      }
      if (s.deckOver) s.finalTurn = true;
      s.phase = 'trade';
      s.fx.push({ k: 'flip', count: s.faceUp.length });
      log(s, seat, `@${seat} turns over ${s.faceUp.map((id) => beanName(s, id)).join(' and ') || 'nothing'}.`);
      return;
    }
    case 'offer': {
      requireNoModal(s);
      if (s.phase !== 'trade') fail('wrong-phase', 'Trading happens in phase 2.');
      requireSeat(s, a.to);
      if (a.to === seat) fail('bad-target', 'You cannot trade with yourself.');
      if (seat !== s.active && a.to !== s.active)
        fail('not-active-trade', 'Every trade must involve the active player.');
      const give = Array.isArray(a.give) ? a.give.map(String) : [];
      const wantCards = Array.isArray(a.wantCards) ? a.wantCards.map(String) : [];
      const wantTypes = cleanCounts(a.wantTypes);
      assertDistinct(give);
      assertDistinct(wantCards);
      const mine = new Set(tradeable(s, seat));
      for (const id of give)
        if (!mine.has(id)) fail('not-tradeable', 'You can only offer cards from your hand' + (seat === s.active ? ' or the turned-over cards.' : '.'));
      if (wantCards.length) {
        if (a.to !== s.active) fail('bad-request', 'Only turned-over cards can be requested by card.');
        for (const id of wantCards) if (!s.faceUp.includes(id)) fail('not-tradeable', 'That turned-over card is no longer available.');
      }
      const wantCount = Object.values(wantTypes).reduce((x, y) => x + (y ?? 0), 0);
      if (!give.length && !wantCards.length && !wantCount) fail('empty-offer', 'An offer needs at least one card.');
      const open = s.offers.filter((o) => o.status === 'open' && o.from === seat).length;
      if (open >= MAX_OPEN_OFFERS_PER_SEAT) fail('too-many-offers', 'Too many open offers — withdraw some first.');
      let replyTo: number | null = null;
      if (a.replyTo != null) {
        const orig = s.offers.find((o) => o.id === a.replyTo);
        if (!orig || orig.status !== 'open' || orig.to !== seat || orig.from !== a.to)
          fail('bad-offer', 'You can only counter an open offer made to you.');
        orig!.status = 'countered';
        replyTo = orig!.id;
      }
      const offer: Offer = { id: s.nextOfferId++, from: seat, to: a.to, give, wantCards, wantTypes, replyTo, status: 'open' };
      s.offers.push(offer);
      s.fx.push({ k: 'offer', from: seat, to: a.to });
      log(s, seat, `@${seat} ${replyTo ? 'counters' : 'offers'} @${a.to}: ${describeOffer(s, offer)}.`);
      return;
    }
    case 'accept': {
      requireNoModal(s);
      if (s.phase !== 'trade') fail('wrong-phase', 'Trading happens in phase 2.');
      const o = s.offers.find((x) => x.id === a.offer);
      if (!o || o.status !== 'open') fail('bad-offer', 'That offer is no longer open.');
      if (o!.to !== seat) fail('not-yours', 'Only the player the offer was made to can accept it.');
      const chosen = Array.isArray(a.cards) ? a.cards.map(String) : [];
      assertDistinct(chosen);
      const giver = s.players[o!.from];
      const fromTradeable = new Set(tradeable(s, o!.from));
      for (const id of o!.give) if (!fromTradeable.has(id)) fail('stale-offer', 'Some offered cards are no longer available.');
      for (const id of o!.wantCards) if (!s.faceUp.includes(id)) fail('stale-offer', 'A requested turned-over card is gone.');
      for (const id of chosen) if (!me.hand.includes(id)) fail('not-tradeable', 'You can only give cards from your hand.');
      if (!sameCounts(countTypes(s, chosen), o!.wantTypes))
        fail('wrong-cards', `Choose exactly the requested beans from your hand: ${describeCounts(o!.wantTypes)}.`);
      // Commit atomically: remove from both sides first, then hand over.
      for (const id of o!.give) removeFrom(s.faceUp, id) || removeFrom(giver.hand, id);
      for (const id of o!.wantCards) removeFrom(s.faceUp, id);
      for (const id of chosen) removeFrom(me.hand, id);
      me.pending.push(...o!.give);
      giver.pending.push(...o!.wantCards, ...chosen);
      o!.status = 'accepted';
      voidOffersTouching(s, [...o!.give, ...o!.wantCards, ...chosen]);
      const donation = !o!.give.length || (!o!.wantCards.length && !chosen.length);
      s.fx.push({ k: 'trade', from: o!.from, to: o!.to, donation });
      log(s, seat, `@${seat} accepts @${o!.from}'s ${donation ? 'donation' : 'trade'}.`);
      return;
    }
    case 'reject': {
      const o = s.offers.find((x) => x.id === a.offer);
      if (!o || o.status !== 'open') fail('bad-offer', 'That offer is no longer open.');
      if (o!.to !== seat) fail('not-yours', 'Only the recipient can decline an offer.');
      o!.status = 'rejected';
      s.fx.push({ k: 'reject', offer: o!.id });
      log(s, seat, `@${seat} declines @${o!.from}'s offer.`);
      return;
    }
    case 'cancel': {
      const o = s.offers.find((x) => x.id === a.offer);
      if (!o || o.status !== 'open') fail('bad-offer', 'That offer is no longer open.');
      if (o!.from !== seat) fail('not-yours', 'Only the proposer can withdraw an offer.');
      o!.status = 'cancelled';
      return;
    }
    case 'endTrading': {
      requireActive(s, seat, 'end trading');
      requireNoModal(s);
      if (s.phase !== 'trade') fail('wrong-phase', 'Trading is not in progress.');
      log(s, seat, `@${seat} ends trading.`);
      enterResolve(s);
      return;
    }
    case 'plantPending': {
      if (s.phase !== 'resolve') fail('wrong-phase', 'Traded and turned-over beans are planted in phase 3.');
      if (seat === s.active) requireNoModal(s);
      if (!me.pending.includes(a.card)) fail('not-pending', 'That card is not waiting to be planted.');
      plantInto(s, seat, a.field, a.card);
      removeFrom(me.pending, a.card);
      log(s, seat, `@${seat} plants a ${beanName(s, a.card)}.`);
      return;
    }
    case 'harvest': {
      requireFieldIndex(me, a.field);
      if (s.magpie && seat !== s.active)
        fail('magpie-pending', 'You cannot harvest while a Magpie steal is in progress.');
      const f = me.fields[a.field];
      if (!f.length) fail('empty-field', 'That field is empty.');
      if (harvestProtected(s, seat, a.field))
        fail('protected', 'Bean protection: a field with one bean can’t be harvested while another field has more than one.');
      const r = harvestInto(s, seat, a.field);
      log(
        s,
        seat,
        r.fieldBonus
          ? `@${seat} harvests 2 Field Beans and gains a third bean field.`
          : `@${seat} harvests ${r.count} ${BEANS[r.bean].name}${r.count > 1 ? 's' : ''} for ${r.coins} coin${r.coins === 1 ? '' : 's'}.`,
      );
      return;
    }
    case 'endTurn': {
      requireActive(s, seat, 'end the turn');
      requireNoModal(s);
      if (s.phase === 'plant' || s.phase === 'trade') fail('wrong-phase', 'Finish trading and planting first.');
      if (!allPendingPlanted(s)) fail('pending', 'All traded and turned-over beans must be planted first.');
      drawPhase(s);
      return;
    }
    case 'claimCoin': {
      if (!s.coin) fail('no-coin', 'The Bean Coin is not in this game.');
      requireActive(s, seat, 'claim the Bean Coin');
      requireNoModal(s);
      if (s.coin!.owner === seat) fail('already-owner', 'You already hold the Bean Coin.');
      if (s.coin!.blocked) fail('coin-blocked', 'Your claim was stopped this turn.');
      const need = coinThreshold(s.n);
      if (fieldsValue(s, seat) < need)
        fail('coin-value', `Your fields must be worth at least ${need} coins to claim the Bean Coin.`);
      s.fx.push({ k: 'coinClaim', seat });
      log(s, seat, `@${seat} claims the Bean Coin.`);
      if (!s.players[s.coin!.owner].hand.length) transferCoin(s, seat);
      else s.coin!.claim = true;
      return;
    }
    case 'coinRespond': {
      const c = s.coin;
      if (!c || !c.claim) fail('no-claim', 'No Bean Coin claim is waiting.');
      if (seat !== c!.owner) fail('not-yours', 'Only the Bean Coin holder can respond.');
      c!.claim = false;
      if (!a.resist) return transferCoin(s, s.active);
      const idx = randInt(s.rng, me.hand.length);
      const [id] = me.hand.splice(idx, 1);
      voidOffersTouching(s, [id]);
      const blocked = s.cards[id] === 'blue';
      c!.mustPlant = id;
      c!.lastReveal = { card: id, blocked };
      s.fx.push({ k: 'coinResist', holder: seat, card: id, blocked });
      log(s, seat, `@${seat} resists; @${s.active} draws a ${beanName(s, id)} from their hand.`);
      if (blocked) {
        c!.blocked = true;
        log(s, seat, `Blue Bean! @${seat} keeps the Bean Coin.`);
      } else transferCoin(s, s.active);
      return;
    }
    case 'plantCoinCard': {
      const c = s.coin;
      if (!c?.mustPlant) fail('no-card', 'There is no revealed card to plant.');
      requireActive(s, seat, 'plant the revealed card');
      plantInto(s, seat, a.field, c!.mustPlant!);
      c!.mustPlant = null;
      return;
    }
    default:
      fail('bad-request', 'Unknown action.');
  }
}

function transferCoin(s: BState, to: number) {
  s.coin!.owner = to;
  s.fx.push({ k: 'coinMove', to });
  log(s, to, `@${to} takes the Bean Coin.`);
}

function stealableVictims(s: BState): number[] {
  if (!s.magpie) return [];
  return s.players
    .map((_, i) => i)
    .filter((i) => i !== s.active && !s.magpie!.victims.includes(i) && s.players[i].fields.some((f) => f.length));
}

export { stealableVictims };

export function describeCounts(c: BeanCounts): string {
  const parts = Object.entries(c)
    .filter(([, v]) => v)
    .map(([k, v]) => `${v}× ${BEANS[k as Bean].name}`);
  return parts.join(', ') || 'nothing';
}

function describeOffer(s: BState, o: Offer): string {
  const give = describeCounts(countTypes(s, o.give));
  const want = { ...countTypes(s, o.wantCards) };
  for (const [k, v] of Object.entries(o.wantTypes)) want[k as Bean] = (want[k as Bean] ?? 0) + (v ?? 0);
  if (!o.give.length) return `asks for ${describeCounts(want)}`;
  if (!Object.keys(want).length) return `gives ${give}`;
  return `${give} for ${describeCounts(want)}`;
}
