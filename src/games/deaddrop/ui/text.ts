/** The words Dead Drop's screens use for its records. Pure, so they are tested with the rules. */
import { DELIVERIES_TO_WIN, INTERCEPTIONS_TO_WIN, MAX_ROUNDS } from '../rules/engine';
import { LOCATION_NAMES as L, type Claim, type EndMethod, type Loc, type MineV, type Order, type OrderKind, type PrivateRoundV, type StatementV } from '../rules/types';

export const ACTION_NAMES: Record<OrderKind, string> = { deliver: 'Deliver', investigate: 'Investigate', intercept: 'Intercept', decoy: 'Decoy' };

export const ACTION_HELP: Record<OrderKind, string> = {
  deliver: 'One of your mission locations. Scores unless intercepted there.',
  investigate: 'Learn in private whether it is a rival mission location.',
  intercept: 'Block a delivery there and score. A decoy there earns your rival Cover.',
  decoy: 'Send a signal that means nothing. Intercepted, it earns you Cover.',
};

export const sceneOf = (l: Loc) => `/art/deaddrop/${l}.svg`;
export const iconOf = (name: OrderKind | 'cover' | 'challenge') => `/art/deaddrop/icon-${name}.svg`;

export function claimText(c: Claim): string {
  switch (c.kind) {
    case 'none':
      return 'Nothing to report';
    case 'delivered':
      return `I delivered at ${L[c.loc]} last round`;
    case 'investigated':
      return `I investigated ${L[c.loc]} last round`;
    case 'decoy':
      return `I deployed a decoy at ${L[c.loc]} last round`;
    case 'notDelivered':
      return 'I did not deliver last round';
  }
}

export function orderText(o: Order | null): string {
  if (!o) return 'No order';
  const where = L[o.target];
  if (o.action === 'deliver') return o.cover ? `Deliver at ${where}, broadcasting ${L[o.cover]} under Cover` : `Deliver at ${where}`;
  if (o.action === 'investigate') return `Investigate ${where}`;
  if (o.action === 'intercept') return `Intercept at ${where}`;
  return `Decoy at ${where}`;
}

/** What a player's own round came to, in one line. Only ever built from their private report. */
export function outcomeText(r: PrivateRoundV): string {
  const o = r.order;
  if (!o) return 'You issued no order: time was called.';
  const where = L[o.target];
  switch (o.action) {
    case 'deliver':
      return r.delivered ? `Your package reached ${where}.` : `Your delivery at ${where} was intercepted. Nothing was delivered.`;
    case 'investigate':
      return r.found ? `Confirmed: ${where} is one of your rival’s mission locations.` : `Confirmed: ${where} is not one of your rival’s mission locations.`;
    case 'intercept':
      return r.captured ? `You caught a delivery at ${where}.` : `You caught no delivery at ${where}.`;
    case 'decoy':
      if (r.drew) return r.coverGained ? `Your rival intercepted your decoy at ${where}. You gain Cover.` : `Your rival intercepted your decoy at ${where}. You already hold Cover, so you gain none.`;
      return `Your decoy at ${where} drew nobody.`;
  }
}

export type Journal = 'mission' | 'not' | 'unknown';

/** What the viewer has verified about the rival's missions: their own investigations and the deliveries they caught. */
export function journalOf(mine: MineV | null): Record<Loc, Journal> {
  const out: Record<Loc, Journal> = { embassy: 'unknown', station: 'unknown', hotel: 'unknown', harbour: 'unknown' };
  for (const r of mine?.rounds ?? []) {
    if (!r.order) continue;
    if (r.found !== null) out[r.order.target] = r.found ? 'mission' : 'not';
    if (r.captured) out[r.order.target] = 'mission';
  }
  return out;
}

/** The mission still to do, in words. */
export function missionNote(mine: MineV): string {
  const total = Object.values(mine.deliveries).reduce((a, b) => a + (b ?? 0), 0);
  const missing = mine.missions.filter((m) => !mine.deliveries[m]);
  const left = Math.max(0, DELIVERIES_TO_WIN - total);
  if (!left && !missing.length) return 'Mission complete.';
  const where = missing.map((m) => L[m]).join(' and ');
  // Three at one location doesn't finish it: the other still needs one, however many that makes.
  const need = !left ? `Still needs one at ${where}` : missing.length ? `${left} more, with one at ${where}` : `${left} more, at either location`;
  return `${total} of ${DELIVERIES_TO_WIN} delivered. ${need}.`;
}

export const METHOD_TEXT: Record<EndMethod, string> = {
  mission: `completed the mission: ${DELIVERIES_TO_WIN} deliveries, covering both locations`,
  counterintelligence: `made ${INTERCEPTIONS_TO_WIN} interceptions`,
  simultaneous: 'Both agents reached victory in the same round, so the match is drawn.',
  deliveries: `After ${MAX_ROUNDS} rounds, more deliveries decided it.`,
  interceptions: `After ${MAX_ROUNDS} rounds deliveries were level, so interceptions decided it.`,
  challenges: `After ${MAX_ROUNDS} rounds deliveries and interceptions were level, so Challenge Points decided it.`,
  level: `After ${MAX_ROUNDS} rounds deliveries, interceptions and Challenge Points were all level, so the match is drawn.`,
};

export function challengeText(st: StatementV, name: (seat: number) => string): string | null {
  const c = st.challenge;
  if (!c) return null;
  if (c.correct === undefined) return `Challenged by ${name(c.by)}. Sealed: the finding opens when the match ends.`;
  return c.correct ? `Challenged by ${name(c.by)}: the statement was false. ${name(c.by)} earns a Challenge Point.` : `Challenged by ${name(c.by)}: the statement was true. ${name(st.seat)} earns a Challenge Point.`;
}

export const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
