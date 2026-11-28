/** Names and short texts the Apex table shows. Rules content keeps its own names; this only formats. */
import { cardFx, cardName, HEAT, STRESS } from '../rules/cards';
import { CIRCUITS } from '../rules/content/circuits';
import { EVENTS, PRESS, RIVALS, SECTOR_MODS, SPONSORS, WEATHER } from '../rules/content/paddock';
import { UPGRADE_BY_ID, type Fit } from '../rules/content/upgrades';
import type { Mode } from '../rules/engine';
import type { Resolved } from '../rules/race';

export const MODE_NAMES: Record<Mode, string> = { quick: 'Quick Race', solo: 'Solo', championship: 'Championship', school: 'Driving School' };
export const circuitName = (id: string) => CIRCUITS.find((c) => c.id === id)?.name ?? id;
const named = <T extends { id: string }>(list: T[]) => (id: string | null | undefined) => list.find((x) => x.id === id) ?? null;
export const weatherInfo = named(WEATHER);
export const sectorInfo = named(SECTOR_MODS);
export const eventInfo = named(EVENTS);
export const sponsorInfo = named(SPONSORS);
export const pressInfo = named(PRESS);
export const rivalInfo = named(RIVALS);
export const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;

const sg = (v: number) => (v > 0 ? '+' : '') + v;
const FIT_TEXT: Record<keyof Fit, (v: number) => string> = {
  engine: (v) => `Engine ${sg(v)}`,
  hand: (v) => `Hand ${sg(v)}`,
  cool1: (v) => `Gear 1 cools ${sg(v)}`,
  cool2: (v) => `Gear 2 cools ${sg(v)}`,
  cool3: (v) => `Gear 3 cools ${sg(v)}`,
  coolAll: (v) => `${sg(v)} cooling every round`,
  draft: (v) => `Draft ${sg(v)}`,
  grip: (v) => `Every corner limit ${sg(v)}`,
  gripTight: (v) => `Limits of 3 or less ${sg(v)}`,
  shift2: (v) => `Two-gear shifts cost ${1 + v} Heat`,
  shift3: (v) => `Three-gear shifts allowed for ${v} Heat`,
  freeBoostPerLap: () => 'One free boost each lap',
  boostFlips: (v) => `Boost turns ${1 + v} cards`,
  catchDist: (v) => `Catch-up gives ${sg(v)} more distance`,
  catchCool: (v) => `Catch-up cools ${v}`,
  removeStress: (v) => `${v} Stress out of your deck`,
  spinRelief: (v) => `A spin puts ${v} Stress fewer in your hand`,
  dumpStrain: (v) => `Throw away ${v} Heat a round`,
  launch: (v) => `+${v} distance in round one`,
  overspeedRelief: (v) => `First overspeed each lap costs ${v} less`,
  rainGrip: () => 'Rain does not lower your limits',
  rainDraft: () => 'You may draft in the wet',
  rainCool: (v) => `${sg(v)} cooling in rain`,
  noFlood: () => 'Floods cost you nothing',
  tunnelDraft: () => 'You may draft into tunnels',
  tunnelBoost: () => 'You may boost in tunnels',
  passCap: (v) => `Pass limits ${sg(v)}`,
  passRelief: (v) => `Pass overspeed costs ${v} less`,
  noGravel: () => 'Gravel never costs you Heat',
  gravelCorners: () => 'Gravel corners cost no extra',
  noDustStress: () => 'No extra Stress from dust',
};

/** One line describing a card, an upgrade or a rival's ability. */
export function fitText(fit: Partial<Fit>): string {
  return Object.entries(fit).map(([k, v]) => FIT_TEXT[k as keyof Fit](Number(v))).join('; ') + '.';
}

export function cardText(c: string): string {
  if (c === HEAT) return 'Clogs your hand. Cooling sends it back to the engine.';
  if (c === STRESS) return 'Committed, it turns cards from your deck until one with a value appears, and counts that value.';
  const fx = cardFx(c);
  if (fx) {
    const bits = [`Value ${fx.value}`];
    if (fx.speed != null && fx.speed !== fx.value) bits.push(`counts ${fx.speed} at corners`);
    if (fx.cool) bits.push(`cools ${fx.cool}`);
    if (fx.grip) bits.push(`limits +${fx.grip}`);
    if (fx.draft) bits.push(`draft +${fx.draft}`);
    if (fx.flips) bits.push(`turns ${fx.flips} card${fx.flips > 1 ? 's' : ''}`);
    if (fx.cost) bits.push(`costs ${fx.cost} Heat`);
    return bits.join(', ') + '.';
  }
  const u = UPGRADE_BY_ID[c];
  return u?.fit ? fitText(u.fit) : cardName(c);
}

export const upgradeName = (id: string) => UPGRADE_BY_ID[id]?.name ?? id;
export const upgradePool = (id: string) => UPGRADE_BY_ID[id]?.pool ?? 'basic';
export const isPartCard = (id: string) => !!UPGRADE_BY_ID[id]?.card;
export { cardName };

/** One car's turn in a line, from its public record and in the order it happened. */
export function turnText(r: Resolved): string {
  const out: string[] = [r.limp ? 'limped 1' : `gear ${r.gear}, speed ${r.speed}`];
  for (const e of r.events) {
    if (e.k === 'pay' && e.n) out.push(`paid ${e.n} Heat`);
    else if (e.k === 'flip') out.push(`turned ${cardName(e.card)}`);
    else if (e.k === 'boost') out.push('boosted');
    else if (e.k === 'catchup') out.push('caught up 1');
    else if (e.k === 'draft') out.push('slipstreamed');
    else if (e.k === 'cool') out.push(`cooled ${e.n}`);
    else if (e.k === 'corner' && e.paid) out.push(`overspeed at limit ${e.limit}: ${e.paid} Heat`);
    else if (e.k === 'spin') out.push(`spun, ${e.stress} Stress`);
    else if (e.k === 'heat') out.push(`took 1 Heat (${e.why})`);
    else if (e.k === 'discard') out.push(`threw away ${e.n}`);
    else if (e.k === 'finish') out.push(`finished, ${e.over} past the line`);
  }
  return `${out.join(', ')}. Moved ${r.to - r.from}.`;
}
