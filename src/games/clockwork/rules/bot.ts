/**
 * Computer players for Kingdom & Commerce. A profile only decides what to favour, so simulations can pit playstyles
 * against each other. Bots read the same `DeckView` a player sees and nothing else.
 */
import type { BotMove } from '../../../engine/types';
import type { CardDef, CardRefView, DeckAction, DeckView, Effect, PendingView } from '../../../engine/deckbuilder';
import { BASICS, CORE, SPARK } from './cards';
import { CROWN } from './crown';
import { FOUNDRY, NIGHT, TOWN } from './expansions';

export type Style = 'economy' | 'cycling' | 'combo' | 'spark' | 'works' | 'devices' | 'interaction' | 'defence' | 'scoring' | 'risk' | 'thinning';

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
  /** How much a Crown Project's Renown counts against a Grand Duchy's. */
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
  { name: 'Thinning', likes: { thinning: 4, cycling: 1 }, works: 0.8, engine: 6, hoard: false, greening: 10 },
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

const MONEY_FLOOR = 6;
const moneyOwned = (v: DeckView) => Object.entries(v.owned).reduce((a, [k, n]) => a + (DEFS[k]?.coins ?? 0) * n, 0);

function chooseCards(q: PendingView, v: DeckView): number[] {
  const offered = q.cards ?? [];
  const keep = q.hint === 'keep';
  // A Renown card is the first thing to discard but the last to trash. Older editions keep the bots they started with.
  const trashing = !keep && (v.rulesVersion ?? 0) >= 3 && /trash/i.test(q.prompt);
  const score = (key: string) => (trashing && types(key).includes('victory') ? 9 : keepScore(key));
  const sorted = [...offered].sort((a: CardRefView, b: CardRefView) => (keep ? score(b.key) - score(a.key) : score(a.key) - score(b.key)) || a.id - b.id);
  // Trashing all its money strands a bot, and an empty deck can never end the game (CC-BOT-9).
  if (trashing && plans(v)) {
    let money = moneyOwned(v);
    const spare = sorted.filter((c) => {
      const coins = DEFS[c.key]?.coins ?? 0;
      if (coins && money - coins < MONEY_FLOOR) return false;
      money -= coins;
      return true;
    });
    const wanted = spare.filter((c) => score(c.key) <= 1).length;
    const n = q.kind === 'react' ? 1 : Math.max(q.min, Math.min(q.max, wanted));
    return [...spare.slice(0, wanted), ...sorted.filter((c) => !spare.slice(0, wanted).includes(c))].slice(0, n).map((c) => c.id);
  }
  let n = q.min;
  if (q.kind !== 'react' && q.max > q.min) {
    const wanted = sorted.filter((c) => (keep ? score(c.key) > 0 : score(c.key) <= 1)).length;
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

/** Trial editions compare a Project with the best buy. Earlier ones keep the bots their rooms started with. */
const trial = (v: DeckView) => (v.rulesVersion ?? 0) >= 100;
const stagesLeft = (p: DeckView['projects'][number]) => (p.stages ? p.stages.filter((x) => x.by === null).length : p.by === null ? 1 : 0);

/** The fewest investments that would end the game through Crown Projects. */
function investmentsToEnd(v: DeckView): number {
  const done = v.projects.filter((p) => p.by !== null).length;
  const open = v.projects.filter((p) => p.by === null).map(stagesLeft).sort((a, b) => a - b);
  return open.slice(0, Math.max(0, (v.projectsEnd ?? 5) - done)).reduce((a, b) => a + b, 0);
}

/** Edition 4 plans from what the table can see. Earlier editions and trials keep the bots their rooms started with (CC-BOT-OLD). */
const plans = (v: DeckView) => (v.rulesVersion ?? 0) >= 4 && !trial(v);
const pileOf = (v: DeckView, key: string) => v.supply.find((p) => p.key === key)?.count ?? 99;
const emptiedToEnd = (v: DeckView) => (v.players.length >= 5 ? 4 : 3);
const openStages = (v: DeckView) => v.projects.reduce((a, p) => a + stagesLeft(p), 0);

/** Roughly how many more rounds, by the nearest end condition, from public counts and the pace so far (CC-BOT-1). */
export function roundsLeft(v: DeckView): number {
  if (v.finalRound) return 0;
  const n = v.players.length;
  const played = Math.max(1, (v.turn.number + 1) / n);
  const stages = v.projects.flatMap((p) => p.stages ?? []);
  const funded = stages.filter((x) => x.by !== null).length;
  const projects = openStages(v) / Math.max(n * 0.25, funded / played);
  const duchies = pileOf(v, 'monument') / (n * 0.3);
  const counts = v.market.map((k) => pileOf(v, k)).sort((a, b) => a - b);
  const piles = counts.slice(0, emptiedToEnd(v)).reduce((a, c) => a + c, 0) / (n * 0.6);
  return Math.min(projects, duchies, piles);
}

const cardRenown = (key: string): number => {
  const vp = DEFS[key]?.vp;
  if (typeof vp === 'number') return vp;
  if (vp && 'base' in vp) return vp.base;
  return vp && 'each' in vp ? vp.each * 2 : 0;
};

/**
 * Each player's Renown as the table can see it: the starting Homesteads, funded stages, and cards shown as gained. Hidden gains don't appear (CC-BOT-2).
 * shortcut: the view's log holds the last 300 entries, so a card gained long ago can drop out; to do better, count it on the server and make it public.
 */
export function publicRenown(v: DeckView): number[] {
  const scores = v.players.map(() => 3);
  for (const p of v.projects) for (const x of p.stages ?? []) if (x.by !== null) scores[x.by] += x.vp;
  for (const e of v.log) {
    if (e.to !== undefined || e.kind !== 'gain') continue;
    for (const key of e.keys ?? []) scores[e.seat] += DEFS[key]?.types.includes('penalty') ? -1 : cardRenown(key);
  }
  if (v.you !== null && v.score) scores[v.you] = v.score.total;
  return scores;
}

/** Would this buy or stage trigger the ending at the end of this turn? */
function triggers(v: DeckView, action: DeckAction): boolean {
  if (v.finalRound) return false;
  if (action.type === 'claim') return openStages(v) === 1;
  if (action.type !== 'buy') return false;
  if (action.pile === 'monument') return pileOf(v, 'monument') === 1;
  return v.market.includes(action.pile) && pileOf(v, action.pile) === 1 && v.market.filter((k) => pileOf(v, k) === 0).length === emptiedToEnd(v) - 1;
}

/** Renown a player can expect from their last turn. Used only to compare endings, never to read a hidden hand. */
const LAST_TURN = 5;
/** Clearly behind means by more than an estimate of this size can be trusted: about one Noble Estate. */
const CLEARLY = 3;

/** How far ahead you'd be once everyone still owed a turn has had it, after a move worth `gain` Renown. */
function leadAfter(v: DeckView, gain: number): number {
  const scores = publicRenown(v);
  const n = v.players.length;
  const owed = n - 1 - ((v.turn.number % n) + n) % n;
  const later = new Set(Array.from({ length: owed }, (_, i) => (v.you! + 1 + i) % n));
  const others = scores.map((s, seat) => (seat === v.you ? -Infinity : s + (later.has(seat) ? LAST_TURN : 0)));
  return scores[v.you!] + gain - Math.max(...others);
}

/** Take an ending you'd win, refuse one you'd clearly lose, and otherwise judge the move as usual (CC-BOT-3). */
function endingCall(v: DeckView, action: DeckAction, gain: number): 'take' | 'refuse' | null {
  if (!triggers(v, action)) return null;
  const lead = leadAfter(v, gain);
  return lead > 0 ? 'take' : lead < -CLEARLY ? 'refuse' : null;
}

/** A stage in buyScore's units: its Renown, more as the game runs out, plus the reward, less the Influence it uses (CC-BOT-4). */
function stageScore(v: DeckView, key: string, profile: Profile): number {
  const p = v.projects.find((x) => x.key === key)!;
  const r = roundsLeft(v);
  if (v.finalRound) return p.vp * 10;
  const rate = r <= 3 ? 5 : r <= 8 ? 3.5 : 2.5;
  const influence = p.tokens[SPARK] ?? 0;
  // The last two stages decide when the game ends, so the leader hurries them and anyone far behind holds back.
  const lead = openStages(v) <= 2 ? leadAfter(v, p.vp) : 0;
  const pressure = lead > CLEARLY ? 1.5 : lead < -CLEARLY ? 0.6 : 1;
  return (p.vp + (stagesLeft(p) === 1 ? 1.5 : 0)) * rate * Math.max(0.6, profile.works) * pressure - influence * 0.5;
}

/** A card in the same units, from how many rounds it has left to pay for itself (CC-BOT-5). */
function plannedBasic(key: string, v: DeckView, r: number): number {
  if (key === 'monument') return r <= 5 || v.turn.coins >= 8 ? 30 : 4;
  if (key === 'blueprint') return r <= 3 ? 14 : r <= 6 ? 8 : 1;
  if (key === 'notebook') return r <= 1 ? 6 : r <= 2 ? 3 : -1;
  const pays = Math.min(1, r / 3);
  if (key === 'dynamo') return 7 * pays;
  if (key === 'cog') return 3.5 * pays;
  // A free Bronze is how a deck with no money starts earning again (CC-BOT-9).
  return moneyOwned(v) < MONEY_FLOOR ? 1 : -1;
}

/** Late in the game, once any end condition is near. Based only on public counts. */
function isLate(v: DeckView, profile: Profile): boolean {
  const monuments = v.supply.find((p) => p.key === 'monument')?.count ?? 99;
  const open = trial(v) ? (investmentsToEnd(v) <= (v.projects.some((p) => p.stages) ? 2 : 1) ? 0 : 99) : v.projects.filter((p) => p.by === null).length;
  const emptied = v.market.filter((k) => v.supply.find((p) => p.key === k)?.count === 0).length;
  const turn = v.you === null ? 0 : (v.turn.number + 1) / Math.max(1, v.players.length);
  return monuments <= 3 || open <= 2 || emptied >= 2 || turn >= profile.greening;
}

function buyScore(key: string, v: DeckView, profile: Profile, mine: string[], late: boolean): number {
  const d = DEFS[key];
  const cost = v.supply.find((p) => p.key === key)?.cost ?? d.cost;
  const planned = plans(v);
  if (planned) {
    // On your last turn, only Renown you can take now counts.
    if (v.finalRound) return cardRenown(key) > 0 && d.types.includes('victory') ? cardRenown(key) * 10 : -1;
    if (d.basic) return plannedBasic(key, v, roundsLeft(v));
    if (roundsLeft(v) <= 2 && !d.types.includes('victory')) return -1;
  }
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
  const trashes = JSON.stringify(d.effects).includes('"to":"trash"');
  const likes = (STYLES[key] ?? []).reduce((a, s) => a + (profile.likes[s] ?? 0), 0) + (trashes ? (profile.likes.thinning ?? 0) : 0);
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
    if (q.kind === 'cards') return [{ type: 'decide', id: q.id, cards: chooseCards(q, v) }];
    if (q.kind === 'react') return [{ type: 'decide', id: q.id, cards: chooseCards(q, v) }, { type: 'decide', id: q.id, cards: [] }];
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
  const mine = owned(v);
  const late = plans(v) ? roundsLeft(v) <= 3 : isLate(v, profile);
  const score = (k: string) => buyScore(k, v, profile, mine, late);
  if (plans(v)) return plannedMarket(v, profile, score);
  const worth = (key: string) => (trial(v) ? trialWorth(v, key) : workValue(v, key));
  const work = [...v.legal.claim].sort((a, b) => worth(b) - worth(a))[0];
  if (work && profile.works > 0) {
    // The bonus and the Renown still to come make up for a small stage. 3 and 5 per Renown is what buyScore pays for Renown cards.
    const best = trial(v) ? Math.max(-1, ...v.legal.buy.map(score)) : -Infinity;
    if (worth(work) * (late ? 5 : 3) * profile.works >= best) return [{ type: 'claim', project: work }, { type: 'end-phase' }];
  }
  // Turn Influence into Coins when that reaches something better, unless saving it for a Project that is nearly affordable.
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

/** Edition 4's Market phase: the best of every stage and buy, with the ending in mind. */
function plannedMarket(v: DeckView, profile: Profile, score: (key: string) => number): DeckAction[] {
  const you = v.players[v.you!];
  const bestAt = (coins: number) => {
    let best = -1;
    for (const p of v.supply) if (p.buyable && p.count > 0 && p.cost <= coins && endingCall(v, { type: 'buy', pile: p.key }, cardRenown(p.key)) !== 'refuse') best = Math.max(best, score(p.key));
    return best;
  };
  const claims = v.legal.claim.map((key) => ({ key, gain: v.projects.find((p) => p.key === key)!.vp }));
  const buys = v.legal.buy.map((pile) => ({ pile, gain: cardRenown(pile) }));
  // An ending you'd win comes first, Renown from a stage before the same from a card.
  const claimEnd = claims.find((c) => endingCall(v, { type: 'claim', project: c.key }, c.gain) === 'take');
  if (claimEnd) return [{ type: 'claim', project: claimEnd.key }, { type: 'end-phase' }];
  const buyEnd = buys.find((c) => endingCall(v, { type: 'buy', pile: c.pile }, c.gain) === 'take');
  if (buyEnd) return [{ type: 'buy', pile: buyEnd.pile }, { type: 'end-phase' }];

  const open = claims.filter((c) => endingCall(v, { type: 'claim', project: c.key }, c.gain) !== 'refuse').map((c) => {
    const p = v.projects.find((x) => x.key === c.key)!;
    // With another Buy, the Coins it leaves can still buy something.
    return { key: c.key, value: stageScore(v, c.key, profile) + (v.turn.buys > 1 ? Math.max(0, bestAt(v.turn.coins - p.coins)) : 0) };
  }).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  const best = bestAt(v.turn.coins);
  if (open[0] && open[0].value >= best) return [{ type: 'claim', project: open[0].key }, { type: 'end-phase' }];

  // Influence becomes Coins for a better buy, unless saved for a stage: near the cap and at the very end there's no reason to save.
  const influence = you.tokens[SPARK] ?? 0;
  const saving = profile.hoard && !v.finalRound && influence < 7;
  if (v.legal.convert && !saving && bestAt(v.turn.coins + 1) > best) return [{ type: 'convert' }, { type: 'end-phase' }];
  const buy = v.legal.buy.filter((k) => endingCall(v, { type: 'buy', pile: k }, cardRenown(k)) !== 'refuse').sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0];
  if (buy && score(buy) >= 0) return [{ type: 'buy', pile: buy }, { type: 'end-phase' }];
  return [{ type: 'end-phase' }];
}

const workValue = (v: DeckView, key: string) => v.projects.find((p) => p.key === key)?.vp ?? 0;
/** The next investment's Renown, plus a point for the reward that comes with the last stage. */
const trialWorth = (v: DeckView, key: string) => {
  const p = v.projects.find((x) => x.key === key)!;
  return p.vp + (stagesLeft(p) === 1 ? 1 : 0);
};

export function botMove(v: DeckView, profile: Profile, delayMs = 500): BotMove<DeckAction> | null {
  if (v.over || v.you === null) return null;
  const actions = moves(v, profile);
  return actions.length ? { actions, delayMs } : null;
}

export const clockworkBot = (v: DeckView) => botMove(v, BALANCED);

