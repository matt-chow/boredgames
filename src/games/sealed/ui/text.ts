import { KINDS, type Kind } from '../rules/cards';
import type { LogEntry, RoundRecord, Secret } from '../rules/types';

export const artOf = (k: Kind | 'back' | 'seal') => `/art/sealed/${k}.webp`;

export const REACTION_TEXT: Record<string, string> = { nice: 'Well played', oops: 'Oops', hmm: 'Hmm…', gg: 'Good game', bluff: 'A bluff?', thanks: 'Thank you' };

const nm = (k: Kind) => KINDS[k].name;

/** A public log line in words. `who(seat)` names a seat ("you" for the viewer). */
export function logText(e: LogEntry, who: (seat: number) => string): string {
  switch (e.t) {
    case 'round':
      return `Round ${e.round} begins. ${cap(who(e.start))} ${who(e.start) === 'you' ? 'open' : 'opens'}.`;
    case 'play': {
      const base = `${cap(who(e.seat))} played the ${nm(e.kind)}`;
      if (e.idle) return `${base}: nobody could be chosen, so it did nothing.`;
      if (e.kind === 'censor' && e.on !== undefined) return `${base} on ${who(e.on)}, naming the ${nm(e.guess!)}: ${e.hit ? 'correct' : 'wrong'}.`;
      if (e.kind === 'magistrate' && e.on !== undefined) return `${base}${e.on === e.seat ? ' on themselves' : ` on ${who(e.on)}`}.`;
      return e.on !== undefined ? `${base} on ${who(e.on)}.` : `${base}.`;
    }
    case 'duel':
      return e.loser === null ? `${cap(who(e.seat))} and ${who(e.on)} compared cards: a tie.` : `${cap(who(e.seat))} and ${who(e.on)} compared cards: ${who(e.loser)} had the lower.`;
    case 'discard':
      return `${cap(who(e.seat))} discarded the ${nm(e.kind)}.`;
    case 'out':
      return `${cap(who(e.seat))} ${who(e.seat) === 'you' ? 'are' : 'is'} out of the round.`;
    case 'file':
      return `${cap(who(e.seat))} kept one card and filed ${e.n} under the deck.`;
  }
}

export function secretText(s: Secret, who: (seat: number) => string): string {
  if (s.t === 'read') return `${cap(who(s.seat))} holds the ${nm(s.kind)}.`;
  if (s.t === 'duel') return `You compared: your ${nm(s.mine)} against ${who(s.seat)}’s ${nm(s.theirs)}.`;
  return `You traded with ${who(s.seat)}: gave the ${nm(s.gave)}, got the ${nm(s.got)}.`;
}

export function roundText(r: RoundRecord, who: (seat: number) => string): string {
  const w = r.winners.map(who);
  const list = w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w.at(-1)}` : w[0];
  const how = r.end === 'last' ? `${cap(list)} ${w.length === 1 && list !== 'you' ? 'is' : 'are'} the last left in the correspondence` : `The deck ran out. ${cap(list)} held the highest card`;
  return `${how} and ${w.length > 1 ? 'each win' : list === 'you' ? 'win' : 'wins'} a favor.${r.informant !== null ? ` ${cap(who(r.informant))} kept the only Informant and ${who(r.informant) === 'you' ? 'gain' : 'gains'} a favor too.` : ''}`;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
