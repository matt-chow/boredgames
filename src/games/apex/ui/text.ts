/** Names and short texts the Apex table shows. Rules content keeps its own names; this only formats. */
import { cardFx, cardName, STRAIN, STRESS } from '../rules/cards';
import { CIRCUITS } from '../rules/content/circuits';
import { EVENTS, PRESS, RIVALS, SECTOR_MODS, SPONSORS, WEATHER } from '../rules/content/paddock';
import { UPGRADE_BY_ID, type Fit } from '../rules/content/upgrades';
import type { Mode } from '../rules/engine';

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
  shift2: (v) => `Two-gear shifts cost ${1 + v} Strain`,
  shift3: (v) => `Three-gear shifts allowed for ${v} Strain`,
  freeBoostPerLap: () => 'One free boost each lap',
  boostFlips: (v) => `Boost turns ${1 + v} cards`,
  catchDist: (v) => `Catch-up gives ${sg(v)} more distance`,
  catchCool: (v) => `Catch-up cools ${v}`,
  removeStress: (v) => `${v} Stress out of your deck`,
  spinRelief: (v) => `A spin costs ${v} Strain less`,
  dumpStrain: (v) => `Throw away ${v} Strain a round`,
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
  noGravel: () => 'Gravel never strains you',
  gravelCorners: () => 'Gravel corners cost no extra',
  noDustStress: () => 'No extra Stress from dust',
};

/** One line describing a card, an upgrade or a rival's ability. */
export function fitText(fit: Partial<Fit>): string {
  return Object.entries(fit).map(([k, v]) => FIT_TEXT[k as keyof Fit](Number(v))).join('; ') + '.';
}

export function cardText(c: string): string {
  if (c === STRAIN) return 'Clogs your hand. Cooling sends it back to the engine.';
  if (c === STRESS) return 'Committed, it turns cards from your deck until one with a value appears, and counts that value.';
  const fx = cardFx(c);
  if (fx) {
    const bits = [`Value ${fx.value}`];
    if (fx.speed != null && fx.speed !== fx.value) bits.push(`counts ${fx.speed} at corners`);
    if (fx.cool) bits.push(`cools ${fx.cool}`);
    if (fx.grip) bits.push(`limits +${fx.grip}`);
    if (fx.draft) bits.push(`draft +${fx.draft}`);
    if (fx.flips) bits.push(`turns ${fx.flips} card${fx.flips > 1 ? 's' : ''}`);
    if (fx.cost) bits.push(`costs ${fx.cost} Strain`);
    return bits.join(', ') + '.';
  }
  const u = UPGRADE_BY_ID[c];
  return u?.fit ? fitText(u.fit) : cardName(c);
}

export const upgradeName = (id: string) => UPGRADE_BY_ID[id]?.name ?? id;
export const upgradePool = (id: string) => UPGRADE_BY_ID[id]?.pool ?? 'basic';
export const isPartCard = (id: string) => !!UPGRADE_BY_ID[id]?.card;
export { cardName };
