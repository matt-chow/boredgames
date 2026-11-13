/** Palazzo's five roles and eight actions (PZ-ROLE*, PZ-ACT*). Shared by the rules and the table. */
export type Role = 'chancellor' | 'magistrate' | 'bravo' | 'envoy' | 'sentinel';
export type Kind = 'income' | 'levy' | 'depose' | 'collect' | 'seize' | 'strike' | 'parley' | 'inspect';

export const ROLE_ORDER: Role[] = ['chancellor', 'magistrate', 'bravo', 'envoy', 'sentinel'];
export const COPIES = 3;

export const ROLES: Record<Role, { name: string; action: Kind; blocks: Kind | null }> = {
  chancellor: { name: 'Chancellor', action: 'collect', blocks: 'seize' },
  magistrate: { name: 'Magistrate', action: 'seize', blocks: 'levy' },
  bravo: { name: 'Bravo', action: 'strike', blocks: null },
  envoy: { name: 'Envoy', action: 'parley', blocks: null },
  sentinel: { name: 'Sentinel', action: 'inspect', blocks: 'strike' },
};

export interface KindInfo {
  name: string;
  /** The role it claims, for a role action. */
  role: Role | null;
  cost: number;
  target: boolean;
  /** Who may block it: any opponent, only the target, or nobody. */
  blockBy: 'any' | 'target' | null;
  /** The role a block claims. */
  blockRole: Role | null;
  text: string;
}

export const KINDS: Record<Kind, KindInfo> = {
  income: { name: 'Income', role: null, cost: 0, target: false, blockBy: null, blockRole: null, text: 'Take 1 coin. Cannot be challenged or blocked.' },
  levy: { name: 'Levy', role: null, cost: 0, target: false, blockBy: 'any', blockRole: 'magistrate', text: 'Take 2 coins. Any opponent may block by claiming the Magistrate.' },
  depose: { name: 'Depose', role: null, cost: 7, target: true, blockBy: null, blockRole: null, text: 'Pay 7: the target loses an influence. Cannot be challenged or blocked.' },
  collect: { name: 'Collect', role: 'chancellor', cost: 0, target: false, blockBy: null, blockRole: null, text: 'Chancellor: take 3 coins.' },
  seize: { name: 'Seize', role: 'magistrate', cost: 0, target: true, blockBy: 'target', blockRole: 'chancellor', text: 'Magistrate: take up to 2 coins from the target. The target may block by claiming the Chancellor.' },
  strike: { name: 'Strike', role: 'bravo', cost: 3, target: true, blockBy: 'target', blockRole: 'sentinel', text: 'Bravo: pay 3, the target loses an influence. The target may block by claiming the Sentinel.' },
  parley: { name: 'Parley', role: 'envoy', cost: 0, target: false, blockBy: null, blockRole: null, text: 'Envoy: take 1 coin, draw a card, then return one of your hidden cards or the drawn one to the deck.' },
  inspect: { name: 'Inspect', role: 'sentinel', cost: 0, target: true, blockBy: null, blockRole: null, text: 'Sentinel: privately see one of the target’s two hidden cards, picked at random.' },
};

export const KIND_ORDER: Kind[] = ['income', 'levy', 'depose', 'collect', 'seize', 'strike', 'parley', 'inspect'];

/** Coins at the start of a turn that force a Depose (PZ-ACT3). */
export const MUST_DEPOSE = 10;

/** What a player can see of a seat to judge an action: coins and hidden cards. */
export interface SeatFacts {
  coins: number;
  hidden: number;
}

/**
 * Why `seat` may not declare `kind` (at `target`) now, or null if it may. Pure and public, so the server enforces the
 * same reasons the table explains.
 */
export function whyNot(seats: SeatFacts[], seat: number, kind: Kind, target?: number): string | null {
  const k = KINDS[kind];
  const me = seats[seat];
  if (me.coins >= MUST_DEPOSE && kind !== 'depose') return `With ${MUST_DEPOSE} or more coins you must Depose.`;
  if (me.coins < k.cost) return `${k.name} costs ${k.cost} coins.`;
  if (!k.target) return target === undefined ? null : `${k.name} has no target.`;
  if (target === undefined) return 'Choose a player.';
  if (!Number.isInteger(target) || target === seat || !seats[target] || seats[target].hidden === 0) return 'Choose a player still in the game.';
  if (kind === 'inspect' && seats[target].hidden < 2) return 'Inspect needs a target with two hidden cards.';
  return null;
}
