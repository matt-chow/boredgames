/** Market selection: random generation, validation, and versioned share codes. */
import { shuffle, type RngState } from '../rng';
import type { CardDef, Cond, Effect, Num, Ruleset } from './types';

const CODE_VERSION = 'M1';

/** Cards that may be selected: finished, not basic, not banned. */
export const selectable = (rules: Ruleset, bans: string[] = []): CardDef[] =>
  rules.cards.filter((c) => c.status === 'ready' && !c.basic && !bans.includes(c.key));

/** Returns a reason when these keys cannot be a market, otherwise null. */
export function validateMarket(rules: Ruleset, keys: string[], bans: string[] = []): string | null {
  if (keys.length !== rules.marketSize) return `Choose exactly ${rules.marketSize} piles.`;
  if (new Set(keys).size !== keys.length) return 'A pile can only be chosen once.';
  const allowed = new Set(selectable(rules, bans).map((c) => c.key));
  for (const k of keys) if (!allowed.has(k)) return `“${k}” is not available.`;
  return null;
}

export function randomMarket(rules: Ruleset, rng: RngState, bans: string[] = []): string[] {
  const pool = selectable(rules, bans).map((c) => c.key);
  if (pool.length < rules.marketSize) throw new Error('deckbuilder: not enough selectable cards');
  return shuffle(rng, pool).slice(0, rules.marketSize);
}

/** The code holds the market only: game randomness comes from a separate seed. Sorted, so equal markets share a code. */
export function encodeMarket(rules: Ruleset, keys: string[]): string {
  return [CODE_VERSION, rules.id, [...keys].sort().join('+')].join('.');
}

export function decodeMarket(rules: Ruleset, code: string): { keys: string[] } | { error: string } {
  const parts = String(code).trim().split('.');
  if (parts.length !== 3 || parts[0] !== CODE_VERSION) return { error: 'That code is not one this version can read.' };
  if (parts[1] !== rules.id) return { error: 'That code is for a different game.' };
  const keys = parts[2].split('+');
  const problem = validateMarket(rules, keys);
  return problem ? { error: problem } : { keys };
}

/** Check a ruleset's references before any game starts. Returns every problem found. */
export function validateRuleset(rules: Ruleset): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const c of rules.cards) {
    if (keys.has(c.key)) problems.push(`duplicate card ${c.key}`);
    keys.add(c.key);
    if (!c.types.length) problems.push(`${c.key}: no types`);
    if (c.cost < 0) problems.push(`${c.key}: negative cost`);
  }
  const ref = (where: string, key: string) => {
    if (!keys.has(key)) problems.push(`${where}: unknown card ${key}`);
  };
  const num = (where: string, n: Num) => {
    if (typeof n === 'number' ? !Number.isFinite(n) : typeof n !== 'object') problems.push(`${where}: bad number`);
  };
  const cond = (where: string, q: Cond) => {
    if ('pileEmpty' in q) ref(where, q.pileEmpty);
    if ('not' in q) cond(where, q.not);
    if ('inHand' in q && q.inHand.key) ref(where, q.inHand.key);
  };
  const walk = (where: string, list: Effect[]) => {
    for (const fx of list) {
      switch (fx.op) {
        case 'draw':
        case 'actions':
        case 'buys':
        case 'coins':
        case 'vp':
        case 'token':
          num(where, fx.n);
          break;
        case 'choose-cards':
          num(where, fx.min);
          num(where, fx.max);
          break;
        case 'choose':
          if (!fx.options.length) problems.push(`${where}: choice without options`);
          for (const o of fx.options) walk(where, o.then);
          break;
        case 'may':
          walk(where, fx.then);
          walk(where, fx.else ?? []);
          break;
        case 'gain':
          if (typeof fx.pile === 'string') ref(where, fx.pile);
          break;
        case 'attack':
        case 'each-other':
        case 'delay':
        case 'on':
          walk(where, fx.effects);
          break;
        case 'repeat':
          num(where, fx.n);
          walk(where, fx.effects);
          break;
        case 'if':
          cond(where, fx.cond);
          walk(where, fx.then);
          walk(where, fx.else ?? []);
          break;
        case 'play-card':
          num(where, fx.times);
          break;
        case 'cost-mod':
          num(where, fx.delta);
          break;
        case 'custom':
          if (!rules.handlers?.[fx.handler]) problems.push(`${where}: unknown handler ${fx.handler}`);
          break;
        case 'choose-pile':
        case 'move':
        case 'look':
        case 'reveal':
        case 'reveal-cards':
        case 'shuffle':
        case 'immune':
        case 'extra-turn':
          break;
        default:
          problems.push(`${where}: unknown effect ${(fx as { op: unknown }).op}`);
      }
    }
  };
  for (const c of rules.cards) {
    walk(c.key, c.effects ?? []);
    walk(c.key, c.reaction?.effects ?? []);
    for (const t of c.triggers ?? []) walk(c.key, t.effects);
    if (c.reaction && !c.types.includes('reaction')) problems.push(`${c.key}: has a reaction but is not typed as one`);
  }
  for (const s of rules.startingDeck) ref('startingDeck', s.key);
  for (const k of rules.endPiles) ref('endPiles', k);
  for (const n of [rules.minPlayers, rules.maxPlayers]) for (const k of Object.keys(rules.basicPiles(n))) ref('basicPiles', k);
  return problems;
}
