/**
 * Computer players for Kingdom & Commerce. A profile only decides what to favour, so simulations can pit playstyles
 * against each other. Bots read the same `DeckView` a player sees and nothing else.
 */
import type { BotMove } from '../../../engine/types';
import type { CardDef, CardRefView, DeckAction, DeckView, Effect, PendingView } from '../../../engine/deckbuilder';
import { BASICS, CORE, SPARK } from './cards';
import { CROWN } from './crown';
import { FOUNDRY, NIGHT, TOWN } from './expansions';

export type Style = 'economy' | 'cycling' | 'combo' | 'spark' | 'works' | 'devices' | 'interaction' | 'defence' | 'scoring' | 'risk';

/** The playstyles each market card leans towards. Part of the catalogue, and used by bots and the balance report. */
export const STYLES: Record<string, Style[]> = {
  gearwright: ['cycling'],
  shift_bell: ['combo'],
  tally_clerk: ['combo', 'economy'],
  supply_crane: ['economy'],
  copper_press: ['economy', 'risk'],
  foreman: ['cycling', 'spark'],
  paper_fan: ['cycling'],
  conveyor: ['cycling', 'combo'],
  sorting_glasses: ['cycling', 'devices'],
  springboard: ['combo', 'spark'],
  clockwork_archive: ['cycling', 'spark'],
  whistle_stop: ['combo', 'economy'],
  hand_crank: ['spark'],
  charge_meter: ['spark', 'combo'],
  capacitor_bank: ['spark', 'devices', 'works'],
  steam_diverter: ['spark', 'economy'],
  glow_mason: ['spark', 'economy', 'works'],
  overcharge_lab: ['spark', 'risk'],
  signal_tower: ['interaction'],
  city_messenger: ['defence', 'economy'],
  inspection_team: ['interaction', 'economy'],
  mutual_aid: ['interaction', 'spark'],
  permit_office: ['interaction', 'economy'],
  night_watch: ['defence', 'economy'],
  maintenance_cart: ['devices', 'spark'],
  lamplighter: ['devices', 'cycling'],
  clock_garden: ['works', 'spark'],
  gear_lease: ['devices', 'economy'],
  city_blueprint: ['cycling', 'spark'],
  grand_engine: ['devices', 'economy'],
  civic_scholar: ['scoring', 'spark'],
  museum_curator: ['scoring', 'cycling'],
  patron_circle: ['scoring', 'economy'],
  silver_statue: ['scoring', 'spark'],
  civic_embassy: ['scoring', 'interaction'],
  inventors_medal: ['scoring', 'works'],
  spark_coil: ['spark', 'economy'],
  brass_bond: ['economy', 'spark'],
  relay_junction: ['combo'],
  chain_drive: ['combo', 'spark'],
  flywheel: ['devices', 'economy'],
  timer_switch: ['devices', 'combo'],
  belt_sorter: ['cycling'],
  salvage_hook: ['cycling', 'spark'],
  millrace: ['cycling', 'risk'],
  slag_furnace: ['cycling'],
  spark_exchange: ['spark', 'economy'],
  picket_line: ['interaction'],
  corrosion_crew: ['interaction'],
  noise_complaint: ['interaction', 'combo'],
  whistleblower: ['defence', 'interaction'],
  ground_wire: ['defence', 'spark'],
  redline_boiler: ['risk', 'economy'],
  pressure_test: ['risk'],
  overload_relay: ['risk', 'spark'],
  scrapyard_broker: ['risk', 'economy'],
  surveyor: ['works', 'economy'],
  zoning_board: ['works', 'interaction'],
  ribbon_cutter: ['works', 'spark'],
  town_crier: ['works', 'defence'],
  civic_bond: ['scoring', 'works'],
  city_charter: ['works', 'scoring'],
  patent_ledger: ['scoring', 'devices'],
  plaque_foundry: ['scoring', 'spark'],
  royal_confessor: ['cycling', 'spark'],
  mintmaster: ['economy', 'cycling'],
  estate_surveyor: ['scoring', 'cycling'],
  purification_house: ['cycling'],
  salvage_office: ['cycling', 'economy'],
  reclamation_guild: ['cycling', 'combo'],
  royal_tax_collector: ['economy', 'spark'],
  royal_scrivener: ['cycling', 'combo'],
  noble_resettlement: ['cycling', 'combo'],
  burden_relief: ['cycling', 'risk'],
  treasury_auditor: ['economy', 'combo'],
  spice_exchange: ['economy', 'spark'],
  trade_bonds: ['economy'],
  royal_mint: ['economy', 'spark'],
  port_tariffs: ['devices', 'economy'],
  guild_auction: ['economy', 'spark'],
  kingdom_courier: ['cycling', 'combo'],
  hall_of_archives: ['cycling', 'combo'],
  great_council: ['combo', 'economy'],
  edict_of_inspection: ['interaction'],
  tax_arrears: ['interaction', 'economy'],
  royal_advocate: ['defence', 'economy'],
  court_saboteur: ['interaction', 'economy'],
  noble_council: ['scoring'],
};

export interface Profile {
  name: string;
  /** Added to a market card's appeal for each of its styles that matches. */
  likes: Partial<Record<Style, number>>;
  /** How much a Crown Project's Renown counts against a Great Abbey's. */
  works: number;
  /** Most market cards to own before it only buys Currency and Renown. */
  engine: number;
  /** Keep Influence for Crown Projects instead of turning it into Coins. */
  hoard: boolean;
  /** Start buying Renown cards from this turn of its own. */
  greening: number;
  /** A card to buy whenever it can, up to 3 copies. Balance runs use this to measure one card's strength. */
  favour?: string;
}

export const PROFILES: Profile[] = [
  { name: 'Money', likes: {}, works: 0, engine: 0, hoard: false, greening: 9 },
  { name: 'Balanced', likes: { economy: 1, spark: 1, cycling: 1 }, works: 1, engine: 5, hoard: false, greening: 10 },
  { name: 'Economy', likes: { economy: 3 }, works: 0.7, engine: 6, hoard: false, greening: 9 },
  { name: 'Cycling', likes: { cycling: 3 }, works: 0.8, engine: 7, hoard: false, greening: 10 },
  { name: 'Combo', likes: { combo: 3, cycling: 1 }, works: 0.8, engine: 9, hoard: false, greening: 11 },
  { name: 'Spark', likes: { spark: 3 }, works: 1, engine: 7, hoard: false, greening: 10 },
  { name: 'Works', likes: { works: 3, spark: 2 }, works: 1.5, engine: 7, hoard: true, greening: 13 },
  { name: 'Devices', likes: { devices: 3 }, works: 0.8, engine: 7, hoard: false, greening: 10 },
  { name: 'Interaction', likes: { interaction: 3 }, works: 0.8, engine: 5, hoard: false, greening: 10 },
  { name: 'Defence', likes: { defence: 3, economy: 1 }, works: 0.8, engine: 5, hoard: false, greening: 10 },
  { name: 'Scoring', likes: { scoring: 3, economy: 1 }, works: 1, engine: 6, hoard: false, greening: 9 },
  { name: 'Risk', likes: { risk: 3 }, works: 0.8, engine: 6, hoard: false, greening: 9 },
];

export const BALANCED: Profile = PROFILES[1];

const DEFS: Record<string, CardDef> = Object.fromEntries([...BASICS, ...CORE, ...FOUNDRY, ...NIGHT, ...TOWN, ...CROWN].map((c) => [c.key, c]));
const types = (key: string) => DEFS[key]?.types ?? [];

const grantsActions = (effects: Effect[] | undefined): boolean => (effects ?? []).some((e) => e.op === 'actions' && typeof e.n === 'number' && e.n > 0);

/** What a card is worth keeping in hand, roughly in Coins. Bad cards score below zero. */
function keepScore(key: string): number {
  const d = DEFS[key];
  if (!d) return 0;
  if (d.types.includes('penalty')) return -5;
  if (d.types.includes('victory') && !d.types.includes('action')) return -2;
  if (d.types.includes('treasure')) return d.coins ?? 0;
  return d.cost / 2 + 1;
}

function chooseCards(q: PendingView): number[] {
  const offered = q.cards ?? [];
  const keep = q.hint === 'keep';
  const sorted = [...offered].sort((a: CardRefView, b: CardRefView) => (keep ? keepScore(b.key) - keepScore(a.key) : keepScore(a.key) - keepScore(b.key)) || a.id - b.id);
  let n = q.min;
  if (q.kind !== 'react' && q.max > q.min) {
    const wanted = sorted.filter((c) => (keep ? keepScore(c.key) > 0 : keepScore(c.key) <= 1)).length;
    n = Math.max(q.min, Math.min(q.max, wanted));
  }
  if (q.kind === 'react') n = 1;
  return sorted.slice(0, n).map((c) => c.id);
}

function chooseOption(q: PendingView, v: DeckView, profile: Profile): number {
  const options = q.options ?? [];
  // Spending Influence: as much as it can.
  if (options.length && options.every((o) => /^\d+$/.test(o))) return options.length - 1;
  if (options[0] === 'Yes') {
    if (/Debt/.test(q.prompt) && /trash/i.test(q.prompt)) return 0;
    const sparkNow = v.you === null ? 0 : (v.players[v.you].tokens[SPARK] ?? 0);
    // A hoarder keeps its last Influence for a Crown Project, unless a Debt is the price of keeping it.
    if (profile.hoard && sparkNow <= 5 && /[Ss]pend/.test(q.prompt) && !/Debt/.test(q.prompt)) return 1;
    return 0;
  }
  const sparky = options.findIndex((o) => /Influence/.test(o) && !/^Spend|Lose/.test(o));
  if (profile.likes.spark && sparky >= 0) return sparky;
  if (v.you !== null && (v.players[v.you].tokens[SPARK] ?? 0) >= 2) {
    const spend = options.findIndex((o) => /^Spend 2 Influence/.test(o));
    if (spend >= 0) return spend;
  }
  return 0;
}

const owned = (v: DeckView): string[] => Object.entries(v.owned).flatMap(([key, n]) => Array<string>(n).fill(key));

/** Late in the game, once any end condition is near. Based only on public counts. */
function isLate(v: DeckView, profile: Profile): boolean {
  const monuments = v.supply.find((p) => p.key === 'monument')?.count ?? 99;
  const open = v.projects.filter((p) => p.by === null).length;
  const emptied = v.market.filter((k) => v.supply.find((p) => p.key === k)?.count === 0).length;
  const turn = v.you === null ? 0 : (v.turn.number + 1) / Math.max(1, v.players.length);
  return monuments <= 3 || open <= 2 || emptied >= 2 || turn >= profile.greening;
}

function buyScore(key: string, v: DeckView, profile: Profile, mine: string[], late: boolean): number {
  const d = DEFS[key];
  const cost = v.supply.find((p) => p.key === key)?.cost ?? d.cost;
  if (d.basic) {
    if (key === 'scrap') return -1;
    if (key === 'monument') return late || v.turn.coins >= 8 ? 30 : 4;
    if (key === 'blueprint') return late ? 14 : 1;
    if (key === 'notebook') return late ? 6 : -1;
    if (key === 'dynamo') return 7;
    if (key === 'cog') return 3.5;
    return -1;
  }
  // Favoured, but not in place of a much better buy: it would measure the waste rather than the card.
  if (key === profile.favour && !late && v.turn.coins <= cost + 2 && mine.filter((k) => k === key).length < 3) return 25;
  const marketOwned = mine.filter((k) => !DEFS[k]?.basic).length;
  const isScoring = d.types.includes('victory');
  if (isScoring && !d.types.includes('action')) return late ? cost * 2 : (profile.likes.scoring ?? 0) > 0 ? cost : -1;
  if (marketOwned >= profile.engine) return -1;
  const likes = (STYLES[key] ?? []).reduce((a, s) => a + (profile.likes[s] ?? 0), 0);
  const copies = mine.filter((k) => k === key).length;
  // Terminal cards stop being useful quickly; cards that give Actions don't.
  const terminal = d.types.includes('action') && !grantsActions(d.effects);
  const crowded = terminal ? mine.filter((k) => DEFS[k]?.types.includes('action') && !grantsActions(DEFS[k].effects)).length : 0;
  return cost + likes - copies * 2 - crowded * 1.5 - (late ? 4 : 0);
}

function playScore(c: CardRefView, v: DeckView): number {
  const d = DEFS[c.key];
  if (c.key === 'rust') return (v.you !== null && (v.players[v.you].tokens[SPARK] ?? 0) >= 1 ? 1 : -100);
  if (c.key === 'overload_relay' && v.you !== null && (v.players[v.you].tokens[SPARK] ?? 0) < 2) return -1;
  const cantrip = grantsActions(d.effects) ? 100 : 0;
  return cantrip + d.cost;
}

function moves(v: DeckView, profile: Profile): DeckAction[] {
  const q = v.pending;
  if (q) {
    if (q.seat !== v.you) return [];
    if (q.kind === 'cards') return [{ type: 'decide', id: q.id, cards: chooseCards(q) }];
    if (q.kind === 'react') return [{ type: 'decide', id: q.id, cards: chooseCards(q) }, { type: 'decide', id: q.id, cards: [] }];
    if (q.kind === 'pile') {
      const mine = owned(v);
      const best = [...(q.piles ?? [])].sort((a, b) => buyScore(b, v, profile, mine, isLate(v, profile)) - buyScore(a, v, profile, mine, isLate(v, profile)) || a.localeCompare(b))[0];
      return [{ type: 'decide', id: q.id, pile: best }];
    }
    if (q.kind === 'player') {
      // Help the player who is furthest behind in cards.
      const seats = [...(q.seats ?? [])].sort((a, b) => v.players[a].handCount - v.players[b].handCount || a - b);
      return [{ type: 'decide', id: q.id, seat: seats[0] }];
    }
    if (q.kind === 'order') return [{ type: 'decide', id: q.id, option: 0 }];
    return [{ type: 'decide', id: q.id, option: chooseOption(q, v, profile) }];
  }
  if (v.you === null || v.turn.seat !== v.you) return [];
  if (v.turn.phase === 'action') {
    const hand = new Map(v.hand.map((c) => [c.id, c]));
    const scored = v.legal.play
      .map((id) => hand.get(id)!)
      .map((c) => ({ c, score: playScore(c, v) }))
      .filter((x) => x.score > -50)
      .sort((a, b) => b.score - a.score || a.c.id - b.c.id);
    if (scored.length && scored[0].score >= 0) return [{ type: 'play', card: scored[0].c.id }, { type: 'end-phase' }];
    return [{ type: 'end-phase' }];
  }
  if (v.legal.play.length) return [{ type: 'play-treasures' }, { type: 'end-phase' }];
  if (v.turn.buys <= 0) return [{ type: 'end-phase' }];
  const work = [...v.legal.claim].sort((a, b) => workValue(v, b) - workValue(v, a))[0];
  if (work && profile.works > 0) return [{ type: 'claim', project: work }, { type: 'end-phase' }];
  // Turn Influence into Coins when that reaches something better, unless saving it for a Project that is nearly affordable.
  const mine = owned(v);
  const late = isLate(v, profile);
  const score = (k: string) => buyScore(k, v, profile, mine, late);
  const bestAt = (coins: number) => {
    let best = -1;
    for (const p of v.supply) if (p.buyable && p.count > 0 && p.cost <= coins) best = Math.max(best, score(p.key));
    return best;
  };
  if (v.legal.convert && !profile.hoard && bestAt(v.turn.coins + 1) > bestAt(v.turn.coins)) return [{ type: 'convert' }, { type: 'end-phase' }];
  const buy = [...v.legal.buy].sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0];
  if (buy && score(buy) >= 0) return [{ type: 'buy', pile: buy }, { type: 'end-phase' }];
  return [{ type: 'end-phase' }];
}

const workValue = (v: DeckView, key: string) => v.projects.find((p) => p.key === key)?.vp ?? 0;

export function botMove(v: DeckView, profile: Profile, delayMs = 500): BotMove<DeckAction> | null {
  if (v.over || v.you === null) return null;
  const actions = moves(v, profile);
  return actions.length ? { actions, delayMs } : null;
}

export const clockworkBot = (v: DeckView) => botMove(v, BALANCED);

export const typesOf = types;
