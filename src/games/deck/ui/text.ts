/** Display helpers shared by the deck table. Pure, so they can be tested without a browser. */
import type { CardDef, CardType, Labels, LogEntry, Ruleset } from '../../../engine/deckbuilder';

/** Muted card-type colours, which a game's theme can replace. Sprout is never one of them: on the table it only ever means "legal / your move". */
const TYPE_COLOR: Record<CardType, string> = {
  action: 'var(--type-action, #5f7690)',
  treasure: 'var(--type-treasure, #c99a35)',
  victory: 'var(--type-victory, #86689e)',
  penalty: 'var(--type-penalty, #6e4140)',
  attack: 'var(--type-attack, #a94f39)',
  reaction: 'var(--type-reaction, #4d8486)',
  duration: 'var(--type-duration, #b57d45)',
};

/** The card's edge: one band for each type, top to bottom. */
export function spine(types: CardType[]): string {
  const colors = types.map((t) => TYPE_COLOR[t]);
  if (colors.length === 1) return colors[0];
  const band = 100 / colors.length;
  return `linear-gradient(${colors.map((c, i) => `${c} ${i * band}% ${(i + 1) * band}%`).join(', ')})`;
}

export type ResIcon = 'action' | 'buy' | 'coin' | 'influence' | 'crown';

const COUNTED: Record<string, ResIcon> = { Action: 'action', Actions: 'action', Buy: 'buy', Buys: 'buy', Coin: 'coin', Coins: 'coin' };

/**
 * Splits text so each resource word can sit beside its symbol. The word always stays, so a screen reader gets the same sentence.
 * "Action" and the rest count only after a number: "+1 Action" is the resource, "an Action card" is not.
 */
export function resParts(text: string, labels?: Pick<Labels, 'points' | 'tokens'>): { text: string; icon?: ResIcon }[] {
  const named = new Map<string, ResIcon>(Object.values(labels?.tokens ?? {}).map((w) => [w, 'influence']));
  if (labels) named.set(labels.points, 'crown');
  const words = [...named.keys()].join('|');
  const found = new RegExp(`(\\d )(${Object.keys(COUNTED).join('|')})\\b${words ? `|\\b(${words})\\b` : ''}`, 'g');
  const out: { text: string; icon?: ResIcon }[] = [];
  let at = 0;
  for (const m of text.matchAll(found)) {
    const start = m.index + (m[1]?.length ?? 0);
    if (start > at) out.push({ text: text.slice(at, start) });
    out.push(m[2] ? { text: m[2], icon: COUNTED[m[2]] } : { text: m[3], icon: named.get(m[3]) });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

export const typeLabel = (types: CardType[]) => types.map((t) => t[0].toUpperCase() + t.slice(1)).join(' · ');

export const defsOf = (rules: Ruleset): Record<string, CardDef> => Object.fromEntries(rules.cards.map((c) => [c.key, c]));

const list = (keys: string[], cardName: (key: string) => string) => keys.map(cardName).join(', ');
const cards = (n: number) => (n === 1 ? 'a card' : `${n} cards`);

const PLACE: Record<string, string> = {
  trash: 'trashes',
  discard: 'discards',
  deck: 'puts on their deck',
  'deck-bottom': 'puts under their deck',
  hand: 'takes into hand',
  play: 'puts into play',
  supply: 'returns to the supply',
  mat: 'sets aside',
};

/** One line of the table log. Unknown kinds fall through to a plain line, so a new engine event can't break the UI. */
export function logLine(e: LogEntry, name: (seat: number) => string, cardName: (key: string) => string, tokenName: (token: string) => string = (t) => t): string {
  const who = name(e.seat);
  const named = e.keys ? list(e.keys, cardName) : '';
  if (e.kind.startsWith('move:')) return `${who} ${PLACE[e.kind.slice(5)] ?? 'moves'}: ${named || cards(e.count ?? 0)}`;
  switch (e.kind) {
    case 'turn':
      return `${who} starts a turn`;
    case 'play':
      return `${who} plays ${named}`;
    case 'buy':
      return `${who} buys ${named}`;
    case 'gain':
      return `${who} gains ${named}`;
    case 'draw':
      return `${who} draws ${cards(e.count ?? 0)}`;
    case 'shuffle':
      return `${who} shuffles ${cards(e.count ?? 0)} into a new deck`;
    case 'reveal':
      return `${who} reveals ${named}`;
    case 'look':
      return e.keys ? `${who} sees ${named}` : `${who} looks at ${cards(e.count ?? 0)}`;
    case 'vp':
      return `${who} takes ${e.count} point ${e.count === 1 ? 'token' : 'tokens'}`;
    case 'token':
      return `${who}: ${e.count} ${tokenName(e.token ?? '')}`;
    case 'claim':
      return `${who} completes ${e.project ? cardName(e.project) : 'a project'}`;
    case 'surcharge':
      return `${who} raises the price of ${e.project ? cardName(e.project) : 'a project'}`;
    case 'game-over':
      return 'The game is over';
    default:
      return `${who}: ${e.kind}`;
  }
}
