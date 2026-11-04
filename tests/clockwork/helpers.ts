/** A small table driver for Clockwork Commons tests. Every step goes through JSON, as a saved game would. */
import type { DeckAction, DeckState, DeckView } from '../../src/engine/deckbuilder';
import { clockwork } from '../../src/games/clockwork';

export const game = clockwork;
export const ALL_SETS = ['core', 'foundry', 'night', 'town'];
export const MARKET = ['supply_crane', 'corrosion_crew', 'gearwright', 'foreman', 'hand_crank', 'glow_mason', 'tally_clerk', 'paper_fan', 'conveyor', 'flywheel'];
export const WORKS = ['canal_lights', 'public_clock', 'makers_fair', 'tram_extension', 'skybridge'];

export interface Options {
  players?: number;
  /** Top of the deck, first listed drawn first. */
  deck?: string[];
  /** Hands of the seats after this one, in turn order. Seats left out keep the hands they were dealt. */
  others?: string[][];
  spark?: number;
  market?: string[];
  works?: string[];
  seed?: string;
}

export class Table {
  s: DeckState;
  me: number;

  constructor(hand: string[], o: Options = {}) {
    const players = o.players ?? 2;
    this.s = game.setup({
      playerCount: players,
      seed: o.seed ?? 'clockwork',
      config: { market: o.market ?? MARKET, bans: [], sets: ALL_SETS, projects: o.works ?? WORKS },
    });
    this.me = this.s.turn.seat;
    const zone = this.s.players[this.me];
    zone.discard.push(...zone.hand.splice(0));
    hand.forEach((k) => this.mint(this.me, k));
    (o.others ?? []).forEach((list, i) => {
      const seat = (this.me + 1 + i) % players;
      const z = this.s.players[seat];
      z.discard.push(...z.hand.splice(0));
      list.forEach((k) => this.mint(seat, k));
    });
    if (o.deck) this.stack(this.me, o.deck);
    if (o.spark !== undefined) zone.tokens.spark = o.spark;
  }

  private newId(key: string) {
    const id = Math.max(...Object.keys(this.s.cards).map(Number)) + 1;
    this.s.cards[id] = key;
    return id;
  }
  mint(seat: number, key: string) {
    const id = this.newId(key);
    this.s.players[seat].hand.push(id);
    return id;
  }
  /** Lay cards on a deck; the first listed is drawn first. */
  stack(seat: number, keys: string[]) {
    for (const key of [...keys].reverse()) this.s.players[seat].deck.push(this.newId(key));
  }
  /** Replace a deck entirely, for tests about running out. */
  deckIs(seat: number, keys: string[]) {
    this.s.players[seat].deck = [];
    this.stack(seat, keys);
  }

  apply(seat: number, a: DeckAction) {
    const r = game.apply(JSON.parse(JSON.stringify(this.s)), seat, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
    this.s = r.state;
    return this;
  }
  refused(seat: number, a: DeckAction) {
    const r = game.apply(JSON.parse(JSON.stringify(this.s)), seat, a);
    return r.ok ? null : r.code;
  }
  view(seat = this.me): DeckView {
    return game.project(this.s, seat) as DeckView;
  }

  get q() {
    const p = this.s.pending;
    if (!p) throw new Error('nothing is being asked');
    return this.view(p.seat).pending!;
  }
  get asking() {
    return this.s.pending?.seat ?? null;
  }

  private byKey(seat: number, key: string) {
    const c = this.view(seat).hand.find((x) => x.key === key);
    if (!c) throw new Error(`no ${key} in seat ${seat}'s hand`);
    return c.id;
  }
  play(key: string, seat = this.s.turn.seat) {
    return this.apply(seat, { type: 'play', card: this.byKey(seat, key) });
  }
  /** Answer a card question, naming cards by key. */
  cards(...keys: string[]) {
    const q = this.q;
    const left = [...(q.cards ?? [])];
    const ids = keys.map((k) => {
      const at = left.findIndex((c) => c.key === k);
      if (at < 0) throw new Error(`${k} is not offered: ${left.map((c) => c.key).join(', ')}`);
      return left.splice(at, 1)[0].id;
    });
    return this.apply(q.seat, { type: 'decide', id: q.id, cards: ids });
  }
  opt(label: string | number) {
    const q = this.q;
    const i = typeof label === 'number' ? label : (q.options ?? []).findIndex((o) => o.includes(label));
    if (i < 0) throw new Error(`no option ${label}: ${q.options}`);
    return this.apply(q.seat, { type: 'decide', id: q.id, option: i });
  }
  yes() {
    return this.opt('Yes');
  }
  no() {
    return this.opt('No');
  }
  pile(key: string) {
    const q = this.q;
    return this.apply(q.seat, { type: 'decide', id: q.id, pile: key });
  }
  player(seat: number) {
    const q = this.q;
    return this.apply(q.seat, { type: 'decide', id: q.id, seat });
  }
  toMarket() {
    return this.apply(this.s.turn.seat, { type: 'end-phase' });
  }
  /** Finish the current player's turn from wherever it is. */
  end() {
    const seat = this.s.turn.seat;
    if (this.s.turn.phase === 'action') this.apply(seat, { type: 'end-phase' });
    return this.apply(seat, { type: 'end-phase' });
  }
  /** Pass every other player's turn until it is this seat's again. */
  round(seat = this.me) {
    this.end();
    while (this.s.turn.seat !== seat && !this.s.over) this.end();
    return this;
  }

  spark(seat = this.me) {
    return this.s.players[seat].tokens.spark ?? 0;
  }
  setSpark(n: number, seat = this.me) {
    this.s.players[seat].tokens.spark = n;
    return this;
  }
  hand(seat = this.me) {
    return this.s.players[seat].hand.map((id) => this.s.cards[id]);
  }
  deck(seat = this.me) {
    return this.s.players[seat].deck.map((id) => this.s.cards[id]);
  }
  discard(seat = this.me) {
    return this.s.players[seat].discard.map((id) => this.s.cards[id]);
  }
  inPlay(seat = this.me) {
    return this.s.players[seat].play.map((id) => this.s.cards[id]);
  }
  trash() {
    return this.s.trash.map((id) => this.s.cards[id]);
  }
  get coins() {
    return this.s.turn.coins;
  }
  get buys() {
    return this.s.turn.buys;
  }
  get actions() {
    return this.s.turn.actions;
  }
}

export function assertConserved(s: DeckState) {
  const all: number[] = [...s.trash, ...s.limbo.map((l) => l.id), ...Object.values(s.supply).flat()];
  for (const p of s.players) all.push(...p.deck, ...p.hand, ...p.discard, ...p.play, ...Object.values(p.mats).flat());
  const total = Object.keys(s.cards).length;
  if (all.length !== total || new Set(all).size !== total) throw new Error(`cards not conserved: ${all.length} placed, ${new Set(all).size} distinct, ${total} exist`);
}
