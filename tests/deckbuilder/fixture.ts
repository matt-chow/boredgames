/**
 * Test helpers over the deck bench ruleset, whose cards are named for what they exercise. The ruleset lives in
 * src/games/deckbench so a bench dev server can host it for the browser tests.
 */
import type { CardId, DeckAction, DeckState } from '../../src/engine/deckbuilder';
import { deckbench } from '../../src/games/deckbench';
import { CARDS, RULES } from '../../src/games/deckbench/rules/cards';

export { CARDS, RULES };

export const SELECTABLE = CARDS.filter((c) => !c.basic && c.status === 'ready').map((c) => c.key);

export const game = deckbench;

export const DEFAULT_MARKET = ['draw2', 'resources', 'trash-up-to-2', 'upgrade', 'look2', 'option', 'hit-discard', 'shield', 'later', 'replay2'];

/** A persisted-and-reloaded state must behave identically, so every test step goes through JSON. */
export const roundTrip = (s: DeckState): DeckState => JSON.parse(JSON.stringify(s));

export function start(players = 2, market = DEFAULT_MARKET, seed = 'seed') {
  return game.setup({ playerCount: players, seed, config: { market, bans: [] } });
}

export function act(s: DeckState, seat: number, a: DeckAction): DeckState {
  const r = game.apply(roundTrip(s), seat, a);
  if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
  return r.state;
}

/** Add a new card of any kind to a seat's hand (test setup only). */
export function mint(s: DeckState, seat: number, key: string): CardId {
  const id = Math.max(...Object.keys(s.cards).map(Number)) + 1;
  s.cards[id] = key;
  s.players[seat].hand.push(id);
  return id;
}

export function deckOn(s: DeckState, seat: number, keys: string[]) {
  /** Lay these cards on top of the deck; the first listed is drawn first. */
  for (const key of [...keys].reverse()) {
    const id = Math.max(...Object.keys(s.cards).map(Number)) + 1;
    s.cards[id] = key;
    s.players[seat].deck.push(id);
  }
}

export const keysOf = (s: DeckState, ids: CardId[]) => ids.map((id) => s.cards[id]);

/** Every card must be in exactly one place. */
export function assertConserved(s: DeckState) {
  const all: CardId[] = [...s.trash, ...s.limbo.map((l) => l.id), ...Object.values(s.supply).flat()];
  for (const p of s.players) all.push(...p.deck, ...p.hand, ...p.discard, ...p.play, ...Object.values(p.mats).flat());
  const total = Object.keys(s.cards).length;
  if (all.length !== total || new Set(all).size !== total) throw new Error(`cards not conserved: ${all.length} placed, ${new Set(all).size} distinct, ${total} exist`);
}
