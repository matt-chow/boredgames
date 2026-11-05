/** Market selection: random generation, validation, and versioned share codes. */
import { shuffle, type RngState } from '../rng';
import type { CardDef, Cond, DeckConfig, Effect, Num, ProjectDef, Ruleset } from './types';

const CODE_VERSION = 'M1';

/** Cards that may be selected: finished, not basic, not banned, and in a switched-on set when `sets` is given. */
export const selectable = (rules: Ruleset, bans: string[] = [], sets?: string[]): CardDef[] =>
  rules.cards.filter((c) => c.status === 'ready' && !c.basic && !bans.includes(c.key) && inSets(c.set, sets));

const inSets = (set: string | undefined, sets: string[] | undefined) => !sets || set === undefined || sets.includes(set);

/** The sets a config has switched on; a ruleset without sets has no such limit. */
export const activeSets = (rules: Ruleset, config: Pick<DeckConfig, 'sets'>): string[] | undefined =>
  rules.sets ? (config.sets?.length ? config.sets : (rules.defaultSets ?? rules.sets.map((x) => x.key))) : undefined;

export const selectableProjects = (rules: Ruleset, sets?: string[]): ProjectDef[] => (rules.projects ?? []).filter((p) => inSets(p.set, sets));

/** Returns a reason when these keys cannot be the game's projects, otherwise null. */
export function validateProjects(rules: Ruleset, keys: string[]): string | null {
  const need = rules.projectCount ?? 0;
  if (keys.length !== need) return `Choose exactly ${need} projects.`;
  if (new Set(keys).size !== keys.length) return 'A project can only be chosen once.';
  const allowed = new Set((rules.projects ?? []).map((p) => p.key));
  for (const k of keys) if (!allowed.has(k)) return `“${k}” is not available.`;
  return null;
}

export function randomProjects(rules: Ruleset, rng: RngState, sets?: string[]): string[] {
  const need = rules.projectCount ?? 0;
  if (!need) return [];
  const pool = selectableProjects(rules, sets).map((p) => p.key);
  if (pool.length < need) throw new Error('deckbuilder: not enough projects');
  return shuffle(rng, pool).slice(0, need);
}

/** Returns a reason when these keys cannot be a market, otherwise null. */
export function validateMarket(rules: Ruleset, keys: string[], bans: string[] = []): string | null {
  if (keys.length !== rules.marketSize) return `Choose exactly ${rules.marketSize} piles.`;
  if (new Set(keys).size !== keys.length) return 'A pile can only be chosen once.';
  const allowed = new Set(selectable(rules, bans).map((c) => c.key));
  for (const k of keys) if (!allowed.has(k)) return `“${k}” is not available.`;
  return null;
}

/** Returns a reason when a random market cannot be generated with these bans, otherwise null. */
export function validateBans(rules: Ruleset, bans: string[], sets?: string[]): string | null {
  return selectable(rules, bans, sets).length < rules.marketSize ? `Too many bans: a market needs ${rules.marketSize} piles to choose from.` : null;
}

/**
 * Clean a market selection from an untrusted message. Only the fields present are returned. A partial market is
 * allowed here so a host can build one pile at a time; `validateConfig` stops it starting until it is complete.
 */
export function sanitizeMarketConfig(rules: Ruleset, raw: Record<string, unknown>): { config: Partial<DeckConfig> } | { error: string } {
  const allowed = new Set(selectable(rules).map((c) => c.key));
  const list = (v: unknown, max: number): string[] | null =>
    Array.isArray(v) && v.length <= max && v.every((k) => typeof k === 'string' && allowed.has(k)) && new Set(v).size === v.length ? (v as string[]) : null;
  const config: Partial<DeckConfig> = {};
  if (raw.market !== undefined) {
    const market = list(raw.market, rules.marketSize);
    if (!market) return { error: `Choose up to ${rules.marketSize} different piles from this game.` };
    config.market = market;
  }
  if (raw.bans !== undefined) {
    const bans = list(raw.bans, allowed.size);
    if (!bans) return { error: 'Only piles from this game can be banned.' };
    config.bans = bans;
  }
  if (raw.projects !== undefined) {
    const known = new Set((rules.projects ?? []).map((p) => p.key));
    const need = rules.projectCount ?? 0;
    const v = raw.projects;
    if (!Array.isArray(v) || v.length > need || !v.every((k) => typeof k === 'string' && known.has(k)) || new Set(v).size !== v.length) return { error: `Choose up to ${need} different projects from this game.` };
    config.projects = v as string[];
  }
  if (raw.sets !== undefined) {
    const known = new Set((rules.sets ?? []).map((x) => x.key));
    const v = raw.sets;
    if (!Array.isArray(v) || !v.length || !v.every((k) => typeof k === 'string' && known.has(k)) || new Set(v).size !== v.length) return { error: 'Keep at least one set switched on.' };
    config.sets = v as string[];
  }
  return { config };
}

export function randomMarket(rules: Ruleset, rng: RngState, bans: string[] = [], sets?: string[]): string[] {
  const pool = selectable(rules, bans, sets).map((c) => c.key);
  if (pool.length < rules.marketSize) throw new Error('deckbuilder: not enough selectable cards');
  return shuffle(rng, pool).slice(0, rules.marketSize);
}

/** The code holds the market only: game randomness comes from a separate seed. Sorted, so equal markets share a code. */
export function encodeMarket(rules: Ruleset, keys: string[], projects: string[] = []): string {
  const parts = [CODE_VERSION, rules.id, [...keys].sort().join('+')];
  if (projects.length) parts.push([...projects].sort().join('+'));
  return parts.join('.');
}

export function decodeMarket(rules: Ruleset, code: string): { keys: string[]; projects?: string[] } | { error: string } {
  const parts = String(code).trim().split('.');
  if (parts.length < 3 || parts.length > 4 || parts[0] !== CODE_VERSION) return { error: 'That code is not one this version can read.' };
  if (parts[1] !== rules.id) return { error: 'That code is for a different game.' };
  const keys = parts[2].split('+');
  const problem = validateMarket(rules, keys);
  if (problem) return { error: problem };
  if (parts.length === 3) return { keys };
  const projects = parts[3].split('+');
  const wrong = validateProjects(rules, projects);
  return wrong ? { error: wrong } : { keys, projects };
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
    if ('any' in q) q.any.forEach((x) => cond(where, x));
    if ('all' in q) q.all.forEach((x) => cond(where, x));
  };
  const player = (where: string, who: unknown) => {
    if (who !== undefined && who !== 'parent' && who !== 'left' && !(typeof who === 'object' && who !== null && typeof (who as { var?: unknown }).var === 'string')) problems.push(`${where}: unknown player ${String(who)}`);
  };
  const walk = (where: string, list: Effect[]) => {
    for (const fx of list) {
      switch (fx.op) {
        case 'token':
          player(where, fx.player);
          num(where, fx.n);
          break;
        case 'draw':
        case 'actions':
        case 'buys':
        case 'coins':
        case 'vp':
          num(where, fx.n);
          break;
        case 'choose-number':
          num(where, fx.min);
          num(where, fx.max);
          break;
        case 'on-player':
          player(where, fx.player);
          walk(where, fx.effects);
          break;
        case 'project-discount':
        case 'project-surcharge':
        case 'choose-project':
          if (!rules.projects?.length) problems.push(`${where}: ${fx.op} needs projects`);
          break;
        case 'choose-player':
        case 'set':
          break;
        case 'choose-cards':
          num(where, fx.min);
          num(where, fx.max);
          player(where, fx.by);
          break;
        case 'choose':
          if (!fx.options.length) problems.push(`${where}: choice without options`);
          if (fx.pick !== undefined && (!Number.isInteger(fx.pick) || fx.pick < 1 || fx.pick > fx.options.length)) problems.push(`${where}: cannot pick ${fx.pick} of ${fx.options.length}`);
          player(where, fx.by);
          for (const o of fx.options) walk(where, o.then);
          break;
        case 'may':
          player(where, fx.by);
          walk(where, fx.then);
          walk(where, fx.else ?? []);
          break;
        case 'gain':
          if (typeof fx.pile === 'string') ref(where, fx.pile);
          player(where, fx.player);
          break;
        case 'gain-card':
        case 'move':
          player(where, fx.player);
          break;
        case 'choose-pile':
          player(where, fx.by);
          break;
        case 'until':
          cond(where, fx.cond);
          if (fx.max !== undefined && (!Number.isInteger(fx.max) || fx.max < 0)) problems.push(`${where}: bad round limit`);
          walk(where, fx.effects);
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
        case 'look':
        case 'reveal':
        case 'reveal-cards':
        case 'select':
        case 'pass-up':
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
    if (typeof c.vp === 'object' && 'per' in c.vp) {
      if (!(c.vp.per > 0)) problems.push(`${c.key}: points need a positive count per card`);
      if (c.vp.of?.key) ref(c.key, c.vp.of.key);
    }
  }
  for (const p of rules.projects ?? []) {
    if (keys.has(p.key)) problems.push(`project ${p.key} shares a key with a card`);
    walk(p.key, p.effects);
    if (p.coins < 0 || Object.values(p.tokens).some((n) => n < 0)) problems.push(`${p.key}: negative price`);
  }
  if (new Set((rules.projects ?? []).map((p) => p.key)).size !== (rules.projects ?? []).length) problems.push('duplicate project');
  if ((rules.projectCount ?? 0) > (rules.projects ?? []).length) problems.push('more projects wanted than exist');
  if (rules.convert && rules.convert.maxPerTurn < 0) problems.push('negative conversion limit');
  if (rules.staged) {
    for (const p of rules.projects ?? []) if ((rules.staged.names[p.key] ?? []).length < 3) problems.push(`${p.key}: needs 3 stage names`);
    for (let n = rules.minPlayers; n <= rules.maxPlayers; n++) {
      const sum = rules.staged.counts(n).reduce((a, b) => a + b, 0);
      if (sum !== rules.projectCount) problems.push(`${n} players: ${sum} staged projects, not ${rules.projectCount}`);
    }
  }
  for (const c of rules.cards) if (c.set && rules.sets && !rules.sets.some((x) => x.key === c.set)) problems.push(`${c.key}: unknown set ${c.set}`);
  for (const s of rules.startingDeck) ref('startingDeck', s.key);
  for (const k of rules.endPiles) ref('endPiles', k);
  for (const n of [rules.minPlayers, rules.maxPlayers]) for (const k of Object.keys(rules.basicPiles(n))) ref('basicPiles', k);
  return problems;
}
