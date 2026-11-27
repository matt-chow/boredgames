/**
 * The 64 upgrades (APEX_CONTENT.md §2). A card upgrade is shuffled into the race deck; a fitting changes the car.
 * Fittings, rivals, events and weather all speak the same `Fit` modifiers, which the engine sums per car.
 */
export type ModuleId = 'storm' | 'mountains' | 'dust' | 'rivals';
export type Pool = 'basic' | 'advanced' | 'environmental';

/** Additive car modifiers. Absent means 0 / false. */
export interface Fit {
  engine: number;
  hand: number;
  /** Extra cooling in gear 1, 2, 3, and every round regardless of gear. */
  cool1: number;
  cool2: number;
  cool3: number;
  coolAll: number;
  draft: number;
  /** +limit at every corner; +limit at corners of limit 3 or less. */
  grip: number;
  gripTight: number;
  /** Change to the Strain cost of a two-gear shift (base 1); `shift3` makes three-gear shifts legal at that cost. */
  shift2: number;
  shift3: number;
  freeBoostPerLap: boolean;
  boostFlips: number;
  catchDist: number;
  catchCool: number;
  /** Stress cards taken out of the starting deck. */
  removeStress: number;
  /** Strain fewer put in hand by a spin. */
  spinRelief: number;
  /** Strain cards that may be thrown away from hand each round. */
  dumpStrain: number;
  /** Extra distance in the first round. */
  launch: number;
  /** The first overspeed each lap costs this much less. */
  overspeedRelief: number;
  // Module fittings.
  rainGrip: boolean;
  rainDraft: boolean;
  rainCool: number;
  noFlood: boolean;
  tunnelDraft: boolean;
  tunnelBoost: boolean;
  passCap: number;
  passRelief: number;
  noGravel: boolean;
  gravelCorners: boolean;
  noDustStress: boolean;
}

export interface CardFx {
  value: number;
  /** Speed for corner checks when it differs from the value (distance always uses the value). */
  speed?: number;
  cool?: number;
  cost?: number;
  grip?: number;
  draft?: number;
  flips?: number;
}

export interface Upgrade {
  id: string;
  name: string;
  pool: Pool;
  module?: ModuleId;
  card?: CardFx;
  fit?: Partial<Fit>;
}

const b = (id: string, name: string, x: CardFx | Partial<Fit>, card = 'value' in x): Upgrade =>
  card ? { id, name, pool: 'basic', card: x as CardFx } : { id, name, pool: 'basic', fit: x as Partial<Fit> };
const a = (id: string, name: string, x: CardFx | Partial<Fit>): Upgrade => ({ ...b(id, name, x), pool: 'advanced' });
const e = (id: string, name: string, module: ModuleId, x: CardFx | Partial<Fit>): Upgrade => ({
  ...b(id, name, x),
  pool: 'environmental',
  module,
});

export const UPGRADES: Upgrade[] = [
  b('b01', 'Twin-Choke Carburettor', { value: 5 }),
  b('b02', 'Sprint Gearing', { value: 6, cost: 1 }),
  b('b03', 'Disc Brakes', { value: 4, speed: 2 }),
  b('b04', 'Drum Brakes Mk II', { value: 3, speed: 1 }),
  b('b05', 'Oil Cooler', { cool2: 1 }),
  b('b06', 'Header Tank', { engine: 1 }),
  b('b07', 'Big Radiator', { engine: 2, cool1: -1 }),
  b('b08', 'Slipstream Fairing', { draft: 1 }),
  b('b09', 'Quick-Release Hubs', { value: 2, cool: 1 }),
  b('b10', 'Coasting Clutch', { value: 1, cool: 2 }),
  b('b11', 'Close-Ratio Box', { shift2: -1 }),
  b('b12', 'Bucket Seat', { hand: 1 }),
  b('b13', 'Braided Lines', { value: 3, grip: 1 }),
  b('b14', 'Lightened Flywheel', { value: 4 }),
  b('b15', 'Hairpin Tyres', { gripTight: 1 }),
  b('b16', 'Tuned Exhaust', { value: 4, draft: 1 }),
  b('b17', 'Spare Plugs', { value: 0, cool: 3 }),
  b('b18', 'Rev Counter', { freeBoostPerLap: true }),
  b('b19', 'Driver Coaching', { catchDist: 1 }),
  b('b20', 'Rear Wing', { value: 3, grip: 2 }),
  b('b21', 'Tall Gearing', { value: 7, cost: 2 }),
  b('b22', 'Kickdown Switch', { value: 2, flips: 1 }),
  b('b23', "Mechanic's Toolkit", { removeStress: 1 }),
  b('b24', 'Lucky Mascot', { spinRelief: 1 }),

  a('a01', 'Fuel Injection', { value: 6 }),
  a('a02', 'Overdrive', { value: 8, speed: 6, cost: 2 }),
  a('a03', 'Ventilated Discs', { value: 5, speed: 2 }),
  a('a04', 'Dry Sump', { engine: 2 }),
  a('a05', 'Twin Radiators', { cool1: 1, cool2: 1 }),
  a('a06', 'Limited-Slip Diff', { value: 4, grip: 2 }),
  a('a07', 'Ground-Effect Skirts', { grip: 1, engine: -1 }),
  a('a08', 'Supercharger', { boostFlips: 1 }),
  a('a09', 'Nitrous Bottle', { value: 0, flips: 2, cost: 1 }),
  a('a10', 'Sequential Linkage', { shift2: -1, shift3: 2 }),
  a('a11', 'Heat Exchanger', { value: 3, cool: 2 }),
  a('a12', 'Magnesium Wheels', { value: 5, cool: 1 }),
  a('a13', 'Telemetry Clipboard', { hand: 1 }),
  a('a14', 'Pit Board', { dumpStrain: 1 }),
  a('a15', 'Works Engine', { value: 7, cost: 1 }),
  a('a16', 'Endurance Pistons', { engine: 3, hand: -1 }),
  a('a17', 'Spaceframe Chassis', { value: 6, speed: 4 }),
  a('a18', 'Polished Ports', { value: 4, flips: 1 }),
  a('a19', 'Trailing Throttle', { value: 2, speed: 0, cool: 1 }),
  a('a20', 'Cold-Air Box', { cool3: 1 }),
  a('a21', 'Racing-Line Notes', { value: 3, grip: 3 }),
  a('a22', 'Factory Mechanic', { spinRelief: 9 }),
  a('a23', 'Second Wind', { catchDist: 1, catchCool: 1 }),
  a('a24', 'Rally Launch', { launch: 2 }),

  e('e01', 'Grooved Tyres', 'storm', { rainGrip: true }),
  e('e02', 'Wiper Motor', 'storm', { rainDraft: true }),
  e('e03', 'Storm Vents', 'storm', { rainCool: 1 }),
  e('e04', 'Aquaplane Guard', 'storm', { noFlood: true }),
  e('e05', 'Spray Line', 'storm', { value: 3, grip: 2 }),
  e('e06', 'Fog Lamps', 'storm', { catchDist: 1 }),
  e('e07', 'Tunnel Lamps', 'mountains', { tunnelDraft: true }),
  e('e08', 'High-Altitude Jets', 'mountains', { passCap: 2 }),
  e('e09', 'Short-Stroke Engine', 'mountains', { tunnelBoost: true }),
  e('e10', 'Hill-Climb Gearing', 'mountains', { value: 5, speed: 3 }),
  e('e11', 'Engine Brake', 'mountains', { passRelief: 1 }),
  e('e12', 'Skid Plate', 'dust', { noGravel: true }),
  e('e13', 'Rally Dampers', 'dust', { gravelCorners: true }),
  e('e14', 'Mud Flaps', 'dust', { noDustStress: true }),
  e('e15', 'Knobbly Tyres', 'dust', { value: 4, grip: 1 }),
  e('e16', 'Dust Filter', 'dust', { engine: 1 }),
];

export const UPGRADE_BY_ID: Record<string, Upgrade> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** Upgrades that may be revealed with these pools and modules on (APEX_CONTENT.md §3, filtering). */
export function upgradePool(pools: Record<Pool, boolean>, modules: Record<ModuleId, boolean>): Upgrade[] {
  return UPGRADES.filter((u) => pools[u.pool] && (!u.module || modules[u.module]));
}

/** Sum fittings (and any other modifier sources) into one Fit. Booleans OR together. */
export function sumFit(parts: (Partial<Fit> | undefined)[]): Partial<Fit> {
  const out: Record<string, number | boolean> = {};
  for (const p of parts)
    for (const [k, v] of Object.entries(p ?? {}))
      out[k] = typeof v === 'boolean' ? Boolean(out[k]) || v : ((out[k] as number) ?? 0) + (v as number);
  return out as Partial<Fit>;
}
