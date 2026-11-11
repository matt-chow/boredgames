/** Sealed Correspondence's court. Rule IDs (SC-*) are defined in docs/SEALED.md. */

export type Kind = 'informant' | 'censor' | 'scribe' | 'duelist' | 'confessor' | 'magistrate' | 'archivist' | 'ambassador' | 'dowager' | 'heir';
export type Ruleset = 'classic' | 'expanded';

export interface KindInfo {
  value: number;
  name: string;
  /** The ability in a line, as printed on the card. */
  text: string;
  /** Copies in each ruleset (SC-DECK1, SC-DECK2). */
  count: Record<Ruleset, number>;
  /** Needs another player chosen (the Magistrate may also choose its owner). */
  targets: 'other' | 'any' | null;
}

export const KINDS: Record<Kind, KindInfo> = {
  heir: { value: 9, name: 'Heir', text: 'If you play or discard the Heir, for any reason, you are out of the round.', count: { classic: 1, expanded: 1 }, targets: null },
  dowager: { value: 8, name: 'Dowager', text: 'Must be played if your other card is the Ambassador or the Magistrate. Otherwise, no effect.', count: { classic: 1, expanded: 1 }, targets: null },
  ambassador: { value: 7, name: 'Ambassador', text: 'Trade the card you keep for another player’s card.', count: { classic: 1, expanded: 1 }, targets: 'other' },
  archivist: { value: 6, name: 'Archivist', text: 'Draw two cards. Keep one of your cards and file the rest under the deck in any order.', count: { classic: 0, expanded: 2 }, targets: null },
  magistrate: { value: 5, name: 'Magistrate', text: 'Choose any player, yourself included. They discard their card and draw a new one.', count: { classic: 2, expanded: 2 }, targets: 'any' },
  confessor: { value: 4, name: 'Confessor', text: 'Until your next turn, other players’ cards cannot choose you.', count: { classic: 2, expanded: 2 }, targets: null },
  duelist: { value: 3, name: 'Duelist', text: 'You and another player secretly compare cards. The lower card is out of the round.', count: { classic: 2, expanded: 2 }, targets: 'other' },
  scribe: { value: 2, name: 'Scribe', text: 'Secretly read another player’s card.', count: { classic: 2, expanded: 2 }, targets: 'other' },
  censor: { value: 1, name: 'Censor', text: 'Name a character other than the Censor. If another player holds it, they are out of the round.', count: { classic: 5, expanded: 6 }, targets: 'other' },
  informant: { value: 0, name: 'Informant', text: 'At the round’s end, if you are the only player still in who played or discarded an Informant, gain a favor.', count: { classic: 0, expanded: 2 }, targets: null },
};

/** Highest value first, the order the court is listed in. */
export const ORDER = (Object.keys(KINDS) as Kind[]).sort((a, b) => KINDS[b].value - KINDS[a].value);

/** Characters the Censor may name (SC-CEN1). */
export const NAMEABLE: readonly Kind[] = ORDER.filter((k) => k !== 'censor');

export const deckKinds = (r: Ruleset): Kind[] => ORDER.flatMap((k) => Array<Kind>(KINDS[k].count[r]).fill(k));

export const RULESET_NAMES: Record<Ruleset, string> = { classic: 'Classic', expanded: 'Expanded' };
export const RULESET_PLAYERS: Record<Ruleset, [number, number]> = { classic: [2, 4], expanded: [2, 6] };

/** Favors needed to win by player count, unless the host sets another target (SC-WIN1). */
export const DEFAULT_TARGET: Record<number, number> = { 2: 6, 3: 5, 4: 4, 5: 3, 6: 3 };

export const value = (k: Kind) => KINDS[k].value;
export const isKind = (k: unknown): k is Kind => typeof k === 'string' && k in KINDS;
