export { MODE_NAMES } from '../rules/cards';
import { ACTION, ENTRANCE, GOALS, ROLE, TUNNEL, artOf, deepArtOf, type ActionKind, type Role, type Tool } from '../rules/cards';
import type { LogEntry, Observation, Payout } from '../rules/types';

export const TOOL_NAMES: Record<Tool, string> = { pick: 'pickaxe', lamp: 'lantern', cart: 'cart' };
export const TOOL_ART: Record<Tool, string> = { pick: 'toolPick', lamp: 'toolLamp', cart: 'toolCart' };
export const REACTION_TEXT: Record<string, string> = { nice: 'Nice dig!', oops: 'Oops', hmm: 'Hmm…', gg: 'Good game', hurry: 'Your move!', thanks: 'Thanks' };
export const GOAL_NAMES = ['top', 'middle', 'bottom'];

export const nameOf = (kind: string) => TUNNEL[kind]?.name ?? ACTION[kind as ActionKind]?.name ?? GOALS[kind as keyof typeof GOALS]?.name ?? (kind === 'entrance' ? ENTRANCE.name : kind);
export const textOf = (kind: string) => TUNNEL[kind]?.text ?? ACTION[kind as ActionKind]?.text ?? '';
export const tileArt = (kind: string, deep: boolean) => (deep ? deepArtOf(kind) : artOf(kind));
export const goalWord = (kind?: string) => (kind === 'gold' ? 'gold' : kind ? 'coal' : 'unknown');

/** One public log line. `who` names a seat ("You" for the viewer). */
export function logText(e: LogEntry, who: (seat: number) => string): string {
  switch (e.t) {
    case 'round':
      return `Round ${e.round} begins. First to dig: ${who(e.start)}.`;
    case 'path':
      return `${who(e.seat)} laid ${nameOf(e.kind)}.`;
    case 'pass':
      return e.auto ? `Time ran out for ${who(e.seat)}: one card discarded.` : `${who(e.seat)} discarded ${e.n === 1 ? 'a card' : `${e.n} cards`}.`;
    case 'clear':
      return `${who(e.seat)} discarded two cards to clear ${e.card === 'theft' ? 'a Pickpocket' : e.card === 'trap' ? 'a lock' : `a broken ${TOOL_NAMES[e.card]}`}.`;
    case 'reveal':
      return `The ${GOAL_NAMES[e.goal]} destination is turned up: ${goalWord(e.kind)}.`;
    case 'pick':
      return e.auto ? `A gold card was picked for ${who(e.seat)}.` : `${who(e.seat)} took a gold card.`;
    case 'steal':
      return e.from === null ? `${who(e.seat)} stole nothing.` : `${who(e.seat)} stole 1 gold from ${who(e.from)}.`;
    case 'act': {
      const name = ACTION[e.kind].name;
      const on = e.on === undefined ? '' : ` on ${who(e.on)}`;
      if (e.kind === 'survey') return `${who(e.seat)} studied the ${GOAL_NAMES[e.goal ?? 0]} destination in secret.`;
      if (e.kind === 'caveIn') return `${who(e.seat)} brought down a tunnel.`;
      if (e.tool && e.kind.startsWith('fix')) return `${who(e.seat)} played ${name}${on}, mending the ${TOOL_NAMES[e.tool]}.`;
      return `${who(e.seat)} played ${name}${on}.`;
    }
  }
}

export function seenText(o: Observation, who: (seat: number) => string): string {
  return o.t === 'survey' ? `The ${GOAL_NAMES[o.goal]} destination is ${goalWord(o.kind)}.` : `${who(o.seat)} was a ${ROLE[o.role].name}.`;
}

export const payText = (p: Payout, who: (seat: number) => string) => `${who(p.seat)}: ${p.gold} gold (${ROLE[p.why as Role]?.name ?? p.why})`;
