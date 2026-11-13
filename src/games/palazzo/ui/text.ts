import { KINDS, ROLES, type Kind, type Role } from '../rules/roles';
import type { LogEntry, Reaction, Window } from '../rules/types';

export const artOf = (k: Role | 'back') => `/art/palazzo/${k}.webp`;

export const REACTION_TEXT: Record<Reaction, string> = { bluff: 'Bluff!', bold: 'Bold', wise: 'Wise', ouch: 'Ouch', gg: 'Good game', hmm: 'Hmm…' };

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const coins = (n: number) => `${n} ${n === 1 ? 'coin' : 'coins'}`;
const WHY = { challenge: 'the challenge', strike: 'a Strike', depose: 'a Depose' } as const;
const WINDOW = { challenge: 'challenge', block: 'block', counter: 'challenge to the block' } as const;

/** A declared action in a few words: "Strike on Ana, claiming the Bravo". */
export function claimText(kind: Kind, target: number | undefined, who: (seat: number) => string) {
  const k = KINDS[kind];
  return `${k.name}${target !== undefined ? ` on ${who(target)}` : ''}${k.role ? `, claiming the ${ROLES[k.role].name}` : ''}`;
}

/** A public log line in words. `who(seat)` names a seat ("you" for the viewer). Every entry is public (PZ-LOG1). */
export function logText(e: LogEntry, who: (seat: number) => string): string {
  const W = (seat: number) => cap(who(seat));
  const s = (seat: number, one: string, you: string) => (who(seat) === 'you' ? you : one);
  switch (e.t) {
    case 'start':
      return `The game begins${e.draft ? ' after a draft' : ''}. ${W(e.seat)} ${s(e.seat, 'goes', 'go')} first.`;
    case 'drafted':
      return 'Both players kept two cards. The draft is over.';
    case 'declare':
      return `${W(e.seat)} ${s(e.seat, 'declares', 'declare')} ${claimText(e.kind, e.target, who)}.`;
    case 'challenge':
      return `${W(e.seat)} ${s(e.seat, 'challenges', 'challenge')} ${who(e.of)}’s ${ROLES[e.role].name}: ${e.truthful ? 'it was true' : 'it was a bluff'}.`;
    case 'replace':
      return `${W(e.seat)} ${s(e.seat, 'shuffles', 'shuffle')} the proven card into the deck and ${s(e.seat, 'draws', 'draw')} a new one.`;
    case 'block':
      return `${W(e.seat)} ${s(e.seat, 'blocks', 'block')}, claiming the ${ROLES[e.role].name}.`;
    case 'allowed':
      return `${W(e.seat)}’s ${KINDS[e.kind].name} goes ahead.`;
    case 'blocked':
      return `${W(e.seat)}’s ${KINDS[e.kind].name} is blocked.`;
    case 'failed':
      return `${W(e.seat)}’s ${KINDS[e.kind].name} fails${e.refund ? ` and the ${coins(e.refund)} come back` : ''}.`;
    case 'coins':
      return `${W(e.seat)} ${s(e.seat, 'takes', 'take')} ${coins(e.n)}${e.from !== undefined ? ` from ${who(e.from)}` : ''}.`;
    case 'lose':
      return `${W(e.seat)} ${s(e.seat, 'reveals', 'reveal')} the ${ROLES[e.role].name}, losing an influence to ${WHY[e.why]}.`;
    case 'out':
      return `${W(e.seat)} ${s(e.seat, 'is', 'are')} out of the game.`;
    case 'fizzle':
      return `${W(e.seat)}’s ${KINDS[e.kind].name} does nothing: the target is already out.`;
    case 'parley':
      return `${W(e.seat)} ${s(e.seat, 'takes', 'take')} 1 coin, ${s(e.seat, 'draws', 'draw')} a card and ${s(e.seat, 'returns', 'return')} one to the deck.`;
    case 'inspect':
      return `${W(e.seat)} privately ${s(e.seat, 'sees', 'see')} one of ${who(e.target)}’s cards.`;
    case 'timeout':
      return `Time ran out on the ${WINDOW[e.window]}; nobody else answered.`;
    case 'pause':
      return `Paused: waiting for ${e.seats.map(who).join(' and ')} to reconnect.`;
    case 'resume':
      return 'Everyone is back. Play resumes.';
    case 'win':
      return `${W(e.seat)} ${s(e.seat, 'is', 'are')} the last one standing and ${s(e.seat, 'wins', 'win')} Palazzo.`;
  }
}

/** The question a response window asks. */
export function windowText(w: Window['kind'], kind: Kind, claimant: number, who: (seat: number) => string): string {
  const k = KINDS[kind];
  const claims = who(claimant) === 'you' ? 'claim' : 'claims';
  if (w === 'challenge') return `${cap(who(claimant))} ${claims} the ${ROLES[k.role!].name} to ${k.name}.`;
  if (w === 'block') return `${k.name} can be blocked by claiming the ${ROLES[k.blockRole!].name}.`;
  return `${cap(who(claimant))} ${claims} the ${ROLES[k.blockRole!].name} to block the ${k.name}.`;
}
