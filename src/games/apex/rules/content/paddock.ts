/**
 * Sponsors, press objectives, pre-race events (APEX_CONTENT.md §3), weather and sector modifiers (§4) and the rival
 * drivers (§5). Conditions are evaluated by id in the season and race code; this file is data only.
 */
import type { Fit, ModuleId } from './upgrades';

export interface Named {
  id: string;
  name: string;
  text: string;
}

export const SPONSORS: Named[] = [
  { id: 'velox', name: 'Velox Motor Oil', text: 'Finish without spinning.' },
  { id: 'marlowe', name: 'Marlowe Tyre Co.', text: 'Make 5 overtakes in the race.' },
  { id: 'aurora', name: 'Aurora Chronometers', text: 'Lead at the end of any lap.' },
  { id: 'castellan', name: 'Castellan Petroleum', text: 'Finish with at least 4 Strain in the engine.' },
  { id: 'kestrel', name: 'Kestrel Spark Plugs', text: 'Spend 4 rounds in gear 4.' },
  { id: 'halden', name: 'Halden Assurance', text: 'Never pay more than 1 Strain at one corner.' },
];

export const PRESS: Named[] = [
  { id: 'holeshot', name: 'Hole Shot', text: 'Lead after round 1.' },
  { id: 'charge', name: 'Charge of the Day', text: 'Overtake 3 cars in one round.' },
  { id: 'cool', name: 'Cool Customer', text: 'Cool 6 Strain in the race.' },
  { id: 'limit', name: 'On the Limit', text: 'Cross 3 corners at exactly their limit.' },
  { id: 'slip', name: 'Slipstream Artist', text: 'Draft 3 times.' },
  { id: 'flat', name: 'Flat Out', text: 'Reach speed 14 in one move.' },
  { id: 'comeback', name: 'Comeback Drive', text: 'Finish 3 or more places above your grid slot.' },
  { id: 'fastest', name: 'Fastest Round', text: 'Cover the longest distance in one round (ties share).' },
  { id: 'nerve', name: 'Nerves of Steel', text: 'Boost 3 times.' },
  { id: 'clean', name: 'Gentleman Driver', text: 'Finish without paying Strain at a corner.' },
];

export type Need = 'championship' | 'press' | 'sponsors' | 'notLast' | ModuleId;
export type EventSpecial = 'oil' | 'resurfaced' | 'fever' | 'shuffle' | 'press3' | 'gala' | 'practice' | 'parts' | 'dust5';

export interface RaceEvent extends Named {
  needs: Need[];
  fit?: Partial<Fit>;
  special?: EventSpecial;
}

export const EVENTS: RaceEvent[] = [
  { id: 'rubber', name: 'Fresh Rubber', text: 'Hand size 8.', needs: [], fit: { hand: 1 } },
  { id: 'ration', name: 'Fuel Rationing', text: 'Engine −1.', needs: [], fit: { engine: -1 } },
  { id: 'morning', name: 'Cool Morning', text: 'Gear 2 cools 2.', needs: [], fit: { cool2: 1 } },
  { id: 'oil', name: 'Oil on the Line', text: 'One corner, drawn now, is 1 slower (min 1).', needs: [], special: 'oil' },
  { id: 'resurfaced', name: 'Resurfaced', text: 'One corner, drawn now, is 1 faster.', needs: [], special: 'resurfaced' },
  { id: 'fever', name: 'Grandstand Fever', text: 'One more car gets catch-up help.', needs: [], special: 'fever' },
  { id: 'shuffle', name: 'Shuffled Grid', text: 'The grid is drawn at random.', needs: ['championship'], special: 'shuffle' },
  { id: 'pressday', name: 'Press Day', text: 'Three press objectives this race.', needs: ['press'], special: 'press3' },
  { id: 'gala', name: 'Sponsor Gala', text: 'Sponsors pay 2 points.', needs: ['sponsors', 'championship'], special: 'gala' },
  { id: 'paddock', name: 'Tight Paddock', text: 'Two-gear shifts cost 2 Strain.', needs: [], fit: { shift2: 1 } },
  { id: 'tailwind', name: 'Tailwind', text: 'Draft +1.', needs: [], fit: { draft: 1 } },
  { id: 'marshals', name: 'Alert Marshals', text: 'Spins put 1 Strain fewer in hand.', needs: [], fit: { spinRelief: 1 } },
  { id: 'haze', name: 'Heat Haze', text: 'Gear 1 cools 2.', needs: [], fit: { cool1: -1 } },
  { id: 'practice', name: 'Practice Laps', text: 'Everyone starts in gear 2.', needs: [], special: 'practice' },
  { id: 'parts', name: 'Parts Lorry', text: 'The next draft reveals 2 more upgrades.', needs: ['championship', 'notLast'], special: 'parts' },
  { id: 'duststorm', name: 'Dust Storm', text: 'Gravel costs Strain from speed 5.', needs: ['dust'], special: 'dust5' },
];

/** Events whose needs are all met (AX-MOD filtering). */
export function eventPool(has: Record<Need, boolean>): RaceEvent[] {
  return EVENTS.filter((e) => e.needs.every((n) => has[n]));
}

export interface Weather extends Named {
  weight: number;
  fit?: Partial<Fit>;
  noDraft?: boolean;
  /** Every corner limit changes by this much (min 1). */
  limit?: number;
  flood?: boolean;
}

export const WEATHER: Weather[] = [
  { id: 'clear', name: 'Clear', text: 'No effect.', weight: 3 },
  { id: 'overcast', name: 'Overcast', text: 'Gear 1 cools 1 more.', weight: 2, fit: { cool1: 1 } },
  { id: 'heatwave', name: 'Heatwave', text: 'Engine −1.', weight: 2, fit: { engine: -1 } },
  { id: 'drizzle', name: 'Drizzle', text: 'No drafting.', weight: 2, noDraft: true },
  { id: 'rain', name: 'Rain', text: 'No drafting; every limit −1 (min 1).', weight: 2, noDraft: true, limit: -1 },
  { id: 'storm', name: 'Storm', text: 'As Rain, and sectors may flood.', weight: 1, noDraft: true, limit: -1, flood: true },
];

export interface SectorMod extends Named {
  weight: number;
  /** Only drawn under a weather with `flood`. */
  storm?: boolean;
}

export const SECTOR_MODS: SectorMod[] = [
  { id: 'none', name: 'Dry', text: 'No effect.', weight: 4 },
  { id: 'wet', name: 'Wet Patch', text: 'Limits in this sector −1 (min 1).', weight: 1 },
  { id: 'tail', name: 'Tailwind', text: 'Draft +1 when it starts in this sector.', weight: 1 },
  { id: 'flood', name: 'Flooded', text: 'End a move here at speed 8+ and take 1 Strain.', weight: 2, storm: true },
];

export interface Rival extends Named {
  driver: string;
  fit: Partial<Fit>;
}

export const RIVALS: Rival[] = [
  { id: 'ortega', name: 'Ortega', driver: 'Ines “La Flecha” Ortega', text: 'Draft +1.', fit: { draft: 1 } },
  { id: 'weiss', name: 'Weiss', driver: 'Baron Ottokar Weiss', text: 'First overspeed each lap costs 1 less.', fit: { overspeedRelief: 1 } },
  { id: 'whitlock', name: 'Whitlock', driver: 'Dot Whitlock', text: '+1 cooling every round.', fit: { coolAll: 1 } },
  { id: 'arashiro', name: 'Arashiro', driver: 'Kenji Arashiro', text: '+2 distance in the first round.', fit: { launch: 2 } },
  { id: 'delacroix', name: 'Delacroix', driver: 'Marguerite Delacroix', text: 'Engine +2.', fit: { engine: 2 } },
  { id: 'bellini', name: 'Bellini', driver: 'Sandro Bellini', text: 'Boost turns over two cards.', fit: { boostFlips: 1 } },
  { id: 'vanaalst', name: 'van Aalst', driver: 'Pieter van Aalst', text: 'Ignores the rain penalty.', fit: { rainGrip: true } },
  { id: 'mokoena', name: 'Mokoena', driver: 'Thandiwe Mokoena', text: 'No gravel Strain.', fit: { noGravel: true } },
];
