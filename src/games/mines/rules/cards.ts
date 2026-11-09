/**
 * Miners & Saboteurs: every component, as data. Rule IDs and sources are in docs/MINES.md.
 * Self-contained (no imports) so scripts/art/mines.mjs can draw every card straight from this file.
 */

/** Tile edges, clockwise from the top. */
export type Edge = 'N' | 'E' | 'S' | 'W';
export const EDGES: Edge[] = ['N', 'E', 'S', 'W'];
export const OPPOSITE: Record<Edge, Edge> = { N: 'S', E: 'W', S: 'N', W: 'E' };

export type Ruleset = 'classic' | 'expanded' | 'duel';
export const MODE_NAMES: Record<Ruleset, string> = { classic: 'Classic Mining', expanded: 'Expanded Mining', duel: 'Prospector Duel' };
export type Tool = 'pick' | 'lamp' | 'cart';
export const TOOLS: Tool[] = ['pick', 'lamp', 'cart'];
export type DoorColour = 'green' | 'blue';

export interface TunnelDef {
  kind: string;
  name: string;
  /**
   * Edges that are joined inside the card. An edge on its own is a dead end: a tunnel touches that side, so a
   * neighbour must match it, but it leads nowhere. Connectivity comes only from here, never from the art (MS-GEO1).
   */
  links: Edge[][];
  door?: DoorColour;
  ladder?: boolean;
  crystals?: number;
  text: string;
}

const g = (s: string) => [...s] as Edge[];
const tunnel = (kind: string, name: string, links: string[], text: string, extra: Partial<TunnelDef> = {}): TunnelDef => ({ kind, name, links: links.map(g), text, ...extra });

export const TUNNELS: TunnelDef[] = [
  tunnel('cross', 'Crossroads', ['NESW'], 'Open on all four sides, all joined.'),
  tunnel('teeV', 'Side Junction', ['NES'], 'A through-shaft with a branch to one side.'),
  tunnel('teeH', 'Low Junction', ['EWS'], 'A cross-shaft with a branch downward.'),
  tunnel('straightV', 'Long Shaft', ['NS'], 'Straight through, end to end.'),
  tunnel('straightH', 'Gallery', ['EW'], 'Straight through, side to side.'),
  tunnel('bendL', 'Left Bend', ['WS'], 'Turns a corner.'),
  tunnel('bendR', 'Right Bend', ['ES'], 'Turns the other corner.'),
  tunnel('deadCross', 'Rubble Crossroads', ['N', 'E', 'S', 'W'], 'Four openings that all end in rubble. Joins nothing.'),
  tunnel('deadTeeV', 'Rubble Junction', ['N', 'E', 'S'], 'Three openings, blocked in the middle.'),
  tunnel('deadTeeH', 'Rubble Fork', ['E', 'W', 'S'], 'Three openings, blocked in the middle.'),
  tunnel('deadV', 'Blocked Shaft', ['N', 'S'], 'Two openings, blocked in the middle.'),
  tunnel('deadH', 'Blocked Gallery', ['E', 'W'], 'Two openings, blocked in the middle.'),
  tunnel('deadL', 'Blocked Left Bend', ['W', 'S'], 'Two openings, blocked at the corner.'),
  tunnel('deadR', 'Blocked Right Bend', ['E', 'S'], 'Two openings, blocked at the corner.'),
  tunnel('deadN', 'Short Stub', ['N'], 'One opening that ends at once.'),
  tunnel('deadW', 'Side Stub', ['W'], 'One opening that ends at once.'),
  // Expanded tunnels.
  tunnel('gateGreenH', 'Green Gate Gallery', ['EW'], 'Only the green crew may pass this gate.', { door: 'green' }),
  tunnel('gateGreenR', 'Green Gate Bend', ['ES'], 'Only the green crew may pass this gate.', { door: 'green' }),
  tunnel('gateGreenV', 'Green Gate Shaft', ['NS'], 'Only the green crew may pass this gate.', { door: 'green' }),
  tunnel('gateBlueH', 'Blue Gate Gallery', ['EW'], 'Only the blue crew may pass this gate.', { door: 'blue' }),
  tunnel('gateBlueL', 'Blue Gate Bend', ['WS'], 'Only the blue crew may pass this gate.', { door: 'blue' }),
  tunnel('gateBlueV', 'Blue Gate Shaft', ['NS'], 'Only the blue crew may pass this gate.', { door: 'blue' }),
  tunnel('ladderH', 'Ladder Gallery', ['EW'], 'A ladder up to the entrance: always joined to it and to every other ladder.', { ladder: true }),
  tunnel('ladderL', 'Ladder Left Bend', ['WS'], 'A ladder up to the entrance: always joined to it and to every other ladder.', { ladder: true }),
  tunnel('ladderR', 'Ladder Right Bend', ['ES'], 'A ladder up to the entrance: always joined to it and to every other ladder.', { ladder: true }),
  tunnel('ladderV', 'Ladder Shaft', ['NS'], 'A ladder up to the entrance: always joined to it and to every other ladder.', { ladder: true }),
  tunnel('overpass', 'Overpass', ['NS', 'EW'], 'Two shafts that cross without meeting. You cannot turn here.'),
  tunnel('twinA', 'Twin Bends', ['WS', 'NE'], 'Two separate bends that never meet.'),
  tunnel('twinB', 'Twin Bends, mirrored', ['WN', 'ES'], 'Two separate bends that never meet.'),
  tunnel('crystalCross', 'Crystal Crossroads', ['NESW'], 'A crossroads with a crystal in the wall.', { crystals: 1 }),
  tunnel('crystalTeeH', 'Crystal Fork', ['EWS'], 'A junction with a crystal in the wall.', { crystals: 1 }),
  tunnel('crystalH', 'Crystal Gallery', ['EW'], 'A gallery with a crystal in the wall.', { crystals: 1 }),
  tunnel('crystalTeeV', 'Crystal Junction', ['NES'], 'A junction with a crystal in the wall.', { crystals: 1 }),
  tunnel('crystalW', 'Crystal Pocket', ['W'], 'A dead end holding a crystal.', { crystals: 1 }),
  tunnel('crystalN', 'Crystal Hollow', ['N'], 'A dead end holding a crystal.', { crystals: 1 }),
];
export const TUNNEL: Record<string, TunnelDef> = Object.fromEntries(TUNNELS.map((t) => [t.kind, t]));

/** The fixed cards: the entrance and the three destinations. Never in the deck. */
export const ENTRANCE: TunnelDef = tunnel('entrance', 'Mine Entrance', ['NESW'], 'Where every tunnel starts. Counts as a ladder top.', { ladder: true });
export type GoalKind = 'gold' | 'coalL' | 'coalR';
export const GOALS: Record<GoalKind, TunnelDef> = {
  gold: tunnel('gold', 'Gold Seam', ['NESW'], 'The treasure. Reach it and the round ends.'),
  coalL: tunnel('coalL', 'Coal Seam', ['WS'], 'Only coal. The tunnel goes on from here.'),
  coalR: tunnel('coalR', 'Coal Seam', ['ES'], 'Only coal. The tunnel goes on from here.'),
};

export type ActionKind =
  | 'breakPick' | 'breakLamp' | 'breakCart'
  | 'fixPick' | 'fixLamp' | 'fixCart' | 'fixPickLamp' | 'fixPickCart' | 'fixLampCart'
  | 'survey' | 'caveIn'
  | 'theft' | 'guard' | 'swapHands' | 'inspect' | 'swapRole' | 'trap' | 'free';

/** Who or what an action card is played on. */
export type Target = 'otherPlayer' | 'anyPlayer' | 'goal' | 'tunnel' | 'self';

export interface ActionDef {
  kind: ActionKind;
  name: string;
  target: Target;
  /** The tools a break damages or a repair may mend. */
  tools?: Tool[];
  text: string;
  /** Restrictions in plain words, for the encyclopedia. */
  limits: string;
}

export const ACTIONS: ActionDef[] = [
  { kind: 'breakPick', name: 'Snapped Pickaxe', target: 'otherPlayer', tools: ['pick'], text: 'Break another player’s pickaxe. They cannot lay tunnels until it is mended.', limits: 'Another player whose pickaxe is not already broken.' },
  { kind: 'breakLamp', name: 'Doused Lantern', target: 'otherPlayer', tools: ['lamp'], text: 'Put out another player’s lantern. They cannot lay tunnels until it is mended.', limits: 'Another player whose lantern is not already out.' },
  { kind: 'breakCart', name: 'Cracked Cart', target: 'otherPlayer', tools: ['cart'], text: 'Crack another player’s cart. They cannot lay tunnels until it is mended.', limits: 'Another player whose cart is not already cracked.' },
  { kind: 'fixPick', name: 'New Haft', target: 'anyPlayer', tools: ['pick'], text: 'Mend a broken pickaxe.', limits: 'Any player, yourself included, whose pickaxe is broken.' },
  { kind: 'fixLamp', name: 'Fresh Wick', target: 'anyPlayer', tools: ['lamp'], text: 'Relight a lantern.', limits: 'Any player, yourself included, whose lantern is out.' },
  { kind: 'fixCart', name: 'New Wheel', target: 'anyPlayer', tools: ['cart'], text: 'Mend a cracked cart.', limits: 'Any player, yourself included, whose cart is cracked.' },
  { kind: 'fixPickLamp', name: 'Tinker: Pick or Lantern', target: 'anyPlayer', tools: ['pick', 'lamp'], text: 'Mend a pickaxe or relight a lantern: one of the two.', limits: 'Any player with either tool broken. You choose which.' },
  { kind: 'fixPickCart', name: 'Tinker: Pick or Cart', target: 'anyPlayer', tools: ['pick', 'cart'], text: 'Mend a pickaxe or a cart: one of the two.', limits: 'Any player with either tool broken. You choose which.' },
  { kind: 'fixLampCart', name: 'Tinker: Lantern or Cart', target: 'anyPlayer', tools: ['lamp', 'cart'], text: 'Relight a lantern or mend a cart: one of the two.', limits: 'Any player with either tool broken. You choose which.' },
  { kind: 'survey', name: 'Survey Map', target: 'goal', text: 'Look at one hidden destination in secret.', limits: 'A destination that is still face down. Only you see it.' },
  { kind: 'caveIn', name: 'Cave-in', target: 'tunnel', text: 'Bring down one tunnel card. It goes to the discard pile.', limits: 'Any tunnel card on the board. Never the entrance or a destination.' },
  { kind: 'theft', name: 'Pickpocket', target: 'self', text: 'Lay it before you. When the round is paid out, steal 1 gold from any player who has some.', limits: 'Only one in front of you at a time. Does nothing if you are locked in when the round ends.' },
  { kind: 'guard', name: 'Strongbox', target: 'anyPlayer', text: 'Remove a Pickpocket from in front of any player.', limits: 'A player who has a Pickpocket in front of them.' },
  { kind: 'swapHands', name: 'Trade Satchels', target: 'otherPlayer', text: 'Swap your whole hand with another player’s. They then draw one card; you do not.', limits: 'Another player.' },
  { kind: 'inspect', name: 'Lantern Glance', target: 'otherPlayer', text: 'Look at another player’s role in secret.', limits: 'Another player. What you see stays true only until their role changes.' },
  { kind: 'swapRole', name: 'New Badge', target: 'anyPlayer', text: 'A player discards their role unseen and takes a new one from the roles nobody was dealt.', limits: 'Any player, yourself included, while unused roles remain.' },
  { kind: 'trap', name: 'Locked In', target: 'otherPlayer', text: 'Lock another player in. They cannot lay tunnels and are paid nothing while locked in.', limits: 'Another player who is not already locked in.' },
  { kind: 'free', name: 'Rescue Rope', target: 'anyPlayer', text: 'Free a player who is locked in.', limits: 'Any player, yourself included, who is locked in.' },
];
export const ACTION: Record<ActionKind, ActionDef> = Object.fromEntries(ACTIONS.map((a) => [a.kind, a])) as Record<ActionKind, ActionDef>;

/** One copy per entry; the count is how many go in the deck. */
export const CLASSIC_DECK: [string, number][] = [
  ['cross', 5], ['teeV', 5], ['teeH', 5], ['straightV', 4], ['straightH', 3], ['bendL', 5], ['bendR', 4],
  ['deadCross', 1], ['deadTeeV', 1], ['deadTeeH', 1], ['deadV', 1], ['deadH', 1], ['deadL', 1], ['deadR', 1], ['deadN', 1], ['deadW', 1],
  ['breakPick', 3], ['breakLamp', 3], ['breakCart', 3],
  ['fixPick', 2], ['fixLamp', 2], ['fixCart', 2], ['fixPickLamp', 1], ['fixPickCart', 1], ['fixLampCart', 1],
  ['survey', 6], ['caveIn', 3],
];

/** Added to the classic deck in the expanded ruleset (MS-X-INV1). Plain tunnels reuse the classic shapes. */
export const EXPANSION_DECK: [string, number][] = [
  ['gateGreenH', 1], ['gateGreenR', 1], ['gateGreenV', 1], ['gateBlueH', 1], ['gateBlueL', 1], ['gateBlueV', 1],
  ['ladderH', 1], ['ladderL', 1], ['ladderR', 1], ['ladderV', 1],
  ['overpass', 2], ['twinA', 1], ['twinB', 1],
  ['crystalCross', 1], ['crystalTeeH', 4], ['crystalH', 1], ['crystalTeeV', 2], ['crystalW', 1], ['crystalN', 1],
  ['straightH', 1], ['bendL', 1], ['bendR', 2], ['straightV', 2],
  ['caveIn', 1], ['theft', 4], ['guard', 3], ['swapHands', 2], ['inspect', 2], ['swapRole', 2], ['trap', 3], ['free', 4],
];

export const isTunnel = (kind: string) => kind in TUNNEL;

export type Role = 'miner' | 'saboteur' | 'green' | 'blue' | 'foreman' | 'opportunist' | 'seeker';

export interface RoleDef {
  role: Role;
  name: string;
  text: string;
  rulesets: Ruleset[];
}

export const ROLES: RoleDef[] = [
  { role: 'miner', name: 'Miner', text: 'Dig to the gold. If anyone reaches it, the miners share the reward draft.', rulesets: ['classic'] },
  { role: 'saboteur', name: 'Saboteur', text: 'Stop the gold being reached. If the deck and hands run out first, the saboteurs are paid.', rulesets: ['classic', 'expanded'] },
  { role: 'green', name: 'Green Crew Miner', text: 'Reach the gold by a way no blue gate bars. Your crew races the blue crew.', rulesets: ['expanded'] },
  { role: 'blue', name: 'Blue Crew Miner', text: 'Reach the gold by a way no green gate bars. Your crew races the green crew.', rulesets: ['expanded'] },
  { role: 'foreman', name: 'Mine Foreman', text: 'Wins whenever either crew wins, but is paid 1 gold less than them.', rulesets: ['expanded'] },
  { role: 'opportunist', name: 'Opportunist', text: 'Wins with whoever wins, crews or saboteurs, but is paid 2 gold less.', rulesets: ['expanded'] },
  { role: 'seeker', name: 'Crystal Seeker', text: 'Ignores the gold. Paid 1 gold per crystal showing in the mine, shared if both seekers are dealt.', rulesets: ['expanded'] },
];
export const ROLE: Record<Role, RoleDef> = Object.fromEntries(ROLES.map((r) => [r.role, r])) as Record<Role, RoleDef>;

/** Classic role pools by player count: [miners, saboteurs]. One more role than players; one stays hidden (MS-C-ROLE1). */
export const CLASSIC_POOL: Record<number, [number, number]> = {
  3: [3, 1], 4: [4, 1], 5: [4, 2], 6: [5, 2], 7: [5, 3], 8: [6, 3], 9: [7, 3], 10: [7, 4],
};

/** The 15 expanded roles (MS-X-ROLE1). */
export const EXPANDED_ROLES: [Role, number][] = [['green', 4], ['blue', 4], ['saboteur', 3], ['foreman', 1], ['opportunist', 1], ['seeker', 2]];

/** Classic hand size by player count (MS-C-HAND1). */
export const classicHand = (n: number) => (n <= 5 ? 6 : n <= 7 ? 5 : 4);

/** Classic gold reward cards: value and count (MS-C-GOLD1). */
export const REWARD_CARDS: [number, number][] = [[1, 16], [2, 8], [3, 4]];

/** Classic saboteur pay by how many saboteurs were dealt (MS-C-PAY2). */
export const SABOTEUR_PAY: Record<number, number> = { 1: 4, 2: 3, 3: 3, 4: 2 };

/** Expanded pay per winner by number of winners (MS-X-PAY1). Five or more: 1 each. */
export const expandedPay = (winners: number) => (winners <= 0 ? 0 : [5, 4, 3, 2][winners - 1] ?? 1);

/** The 32 gold tokens of the expanded ruleset are value-1 pieces: gold is counted as a whole number (MS-X-GOLD1). */
export const EXPANDED_TOKENS = 32;

/** Card art lives here, one file per kind: classic tabletop and the immersive mine. */
export const artOf = (kind: string) => `/art/mines/${kind}.svg`;
export const deepArtOf = (kind: string) => `/art/mines/deep/${kind}.svg`;

/** Every kind with art, for the art script and the asset test. */
export const ART_KINDS: string[] = [
  ...TUNNELS.map((t) => t.kind),
  'entrance', 'gold', 'coalL', 'coalR', 'goalBack', 'cardBack',
  ...ACTIONS.map((a) => a.kind),
  ...ROLES.map((r) => r.role), 'roleBack',
  'reward1', 'reward2', 'reward3', 'nugget', 'crystal',
  'toolPick', 'toolLamp', 'toolCart', 'toolPickBroken', 'toolLampBroken', 'toolCartBroken',
];
/** Tunnel kinds also drawn for the immersive mine. */
export const DEEP_KINDS: string[] = [...TUNNELS.map((t) => t.kind), 'entrance', 'gold', 'coalL', 'coalR', 'goalBack'];
