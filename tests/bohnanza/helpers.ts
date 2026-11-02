import { expect } from 'vitest';
import { seedRng } from '../../src/engine/rng';
import type { Bean } from '../../src/games/bohnanza/rules/cards';
import { DEFAULT_CONFIG, setupSpec, type BohnanzaConfig } from '../../src/games/bohnanza/rules/config';
import { apply } from '../../src/games/bohnanza/rules/engine';
import type { BAction, BState } from '../../src/games/bohnanza/rules/state';

export interface Layout {
  n?: number;
  config?: Partial<BohnanzaConfig>;
  hands?: Bean[][];
  fields?: Bean[][][];
  deck?: Bean[];
  discard?: Bean[];
  faceUp?: Bean[];
  active?: number;
  start?: number;
  phase?: BState['phase'];
  planted?: number;
  exhaustions?: number;
  coinOwner?: number;
}

/**
 * Build an exact game state for a rule test. Card ids are `<bean>-<k>` here for
 * readability; production ids are opaque (see R1.5).
 */
export function make(l: Layout = {}): BState {
  const n = l.n ?? 4;
  const config = { ...DEFAULT_CONFIG, ...l.config };
  const spec = setupSpec(config, n);
  const cards: Record<string, Bean> = {};
  let k = 0;
  const mk = (b: Bean) => {
    const id = `${b}-${k++}`;
    cards[id] = b;
    return id;
  };
  const players = Array.from({ length: n }, (_, p) => ({
    hand: (l.hands?.[p] ?? []).map(mk),
    fields: (l.fields?.[p] ?? Array.from({ length: spec.fields }, () => [])).map((f) => f.map(mk)),
    coins: [] as string[],
    pending: [] as string[],
  }));
  const start = l.start ?? 0;
  return {
    v: 1,
    config,
    n,
    rng: seedRng('test'),
    cards,
    deck: (l.deck ?? Array(30).fill('blue')).map(mk),
    discard: (l.discard ?? []).map(mk),
    exhaustions: l.exhaustions ?? 0,
    exhaustLimit: spec.exhaustLimit,
    drawMode: spec.drawMode,
    deckOver: false,
    finalTurn: false,
    players,
    start,
    active: l.active ?? start,
    turn: 1,
    phase: l.phase ?? 'plant',
    planted: l.planted ?? 0,
    faceUp: (l.faceUp ?? []).map(mk),
    offers: [],
    nextOfferId: 1,
    magpie: null,
    coin: config.beanCoin
      ? { owner: l.coinOwner ?? (start + n - 1) % n, blocked: false, claim: false, mustPlant: null, lastReveal: null }
      : null,
    log: [],
    fx: [],
    seq: 0,
    result: null,
  };
}

export function ok(s: BState, seat: number, a: BAction): BState {
  const r = apply(s, seat, a);
  if (!r.ok) throw new Error(`expected ${a.type} by ${seat} to succeed: [${r.code}] ${r.error}`);
  return r.state;
}

export function bad(s: BState, seat: number, a: BAction, code?: string) {
  const r = apply(s, seat, a);
  expect(r.ok, `expected ${a.type} by ${seat} to fail`).toBe(false);
  if (!r.ok && code) expect(r.code).toBe(code);
  return r;
}

export const beans = (s: BState, ids: string[]) => ids.map((id) => s.cards[id]);
export const fieldBeans = (s: BState, seat: number) => s.players[seat].fields.map((f) => beans(s, f));
export const handBeans = (s: BState, seat: number) => beans(s, s.players[seat].hand);

/** Every card id appears in exactly one zone. */
export function assertConservation(s: BState) {
  const seen = new Map<string, string>();
  const put = (id: string, where: string) => {
    if (seen.has(id)) throw new Error(`card ${id} in both ${seen.get(id)} and ${where}`);
    seen.set(id, where);
  };
  s.deck.forEach((id) => put(id, 'deck'));
  s.discard.forEach((id) => put(id, 'discard'));
  s.faceUp.forEach((id) => put(id, 'faceUp'));
  if (s.coin?.mustPlant) put(s.coin.mustPlant, 'mustPlant');
  s.players.forEach((p, i) => {
    p.hand.forEach((id) => put(id, `hand${i}`));
    p.pending.forEach((id) => put(id, `pending${i}`));
    p.coins.forEach((id) => put(id, `coins${i}`));
    p.fields.forEach((f, j) => f.forEach((id) => put(id, `field${i}.${j}`)));
  });
  expect(seen.size).toBe(Object.keys(s.cards).length);
}
