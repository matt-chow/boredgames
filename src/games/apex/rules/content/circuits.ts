/**
 * The eight circuits (APEX_CONTENT.md §1). Geometry is control points on a 1600×1000 board; everything the rules read
 * (corners, overlays) refers to control points and is resolved to space indices by `resolveCircuit`.
 */
import { buildTrack, spaceAtCp, type Pt, type TrackGeo } from '../geometry';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type PropKind = 'stand' | 'tree' | 'pine' | 'palm' | 'cactus' | 'house' | 'hangar' | 'tower' | 'windmill' | 'rock' | 'barn' | 'tent' | 'lighthouse' | 'boat' | 'shrine' | 'dune' | 'pits' | 'bridge';

export interface CircuitDef {
  id: string;
  name: string;
  level: Level;
  laps: number;
  length: number;
  /** Tagline for the setup screen. */
  blurb: string;
  points: Pt[];
  /** Restricted corners: the control point the line sits at, and the speed limit. */
  corners: { cp: number; limit: number; name: string }[];
  /** Control points where sectors 2 and 3 begin (sector 1 starts at the line). */
  sectors: [number, number];
  /** Module overlays as control-point ranges [from, to], inclusive, in travel order. */
  tunnels: [number, number][];
  passes: { from: number; to: number; cap: number }[];
  gravel: [number, number][];
  /** Scenery: kind, place along the lap (0–1), side (+1 right of travel, −1 left), distance from the centreline. */
  scenery: [PropKind, number, 1 | -1, number][];
  /** Ground colour and accent for the board. */
  ground: string;
  accent: string;
}

export interface Circuit extends Omit<CircuitDef, 'corners' | 'sectors' | 'tunnels' | 'passes' | 'gravel'> {
  geo: TrackGeo;
  corners: { at: number; limit: number; name: string }[];
  /** Sector index (0–2) of every space. */
  sector: number[];
  /** Lanes per space (1 or 2) with every module off; tunnels narrow to 1 only under Through the Mountains. */
  tunnel: boolean[];
  pass: (number | null)[];
  gravel: boolean[];
}

export const CIRCUITS: CircuitDef[] = [
  {
    id: 'ashford',
    name: 'Ashford Aerodrome',
    level: 'beginner',
    laps: 3,
    length: 60,
    blurb: 'Runways and perimeter roads of an old airfield. Two long straights and one tight hairpin by the tower.',
    points: [
      [260, 790], [560, 815], [860, 820], [1160, 805], [1380, 760], [1490, 640], [1470, 500], [1360, 430],
      [1180, 440], [1060, 360], [1100, 240], [990, 170], [860, 230], [820, 360], [640, 420], [420, 380],
      [250, 300], [140, 400], [150, 600],
    ],
    corners: [
      { cp: 5, limit: 5, name: 'Runway End' },
      { cp: 11, limit: 3, name: 'Tower Hairpin' },
      { cp: 14, limit: 4, name: 'Hangar Kink' },
      { cp: 17, limit: 6, name: 'Windsock' },
    ],
    sectors: [7, 14],
    tunnels: [],
    passes: [],
    gravel: [[10, 12]],
    scenery: [
      ['hangar', 0.2, -1, 95], ['hangar', 0.27, -1, 100], ['tower', 0.56, 1, 70], ['stand', 0.05, 1, 70],
      ['stand', 0.95, 1, 70], ['pits', 0.02, -1, 55], ['tree', 0.4, 1, 80], ['tree', 0.42, 1, 120], ['tent', 0.72, -1, 75],
      ['tree', 0.82, 1, 90], ['tree', 0.84, 1, 70], ['barn', 0.66, 1, 90],
    ],
    ground: '#6f8a4f',
    accent: '#c4472b',
  },
  {
    id: 'bellavista',
    name: 'Autodromo Bellavista',
    level: 'intermediate',
    laps: 2,
    length: 64,
    blurb: 'Royal parkland. A flat-out pine sweeper, a slow hairpin by the villa and the long Curva dei Cipressi before the line.',
    points: [
      [300, 840], [620, 860], [940, 850], [1200, 800], [1330, 690], [1300, 560], [1400, 470], [1500, 360],
      [1440, 220], [1290, 200], [1200, 300], [1060, 360], [900, 300], [760, 200], [600, 180], [520, 300],
      [600, 420], [520, 540], [330, 540], [180, 600], [150, 740],
    ],
    corners: [
      { cp: 4, limit: 6, name: 'Curva del Lago' },
      { cp: 5, limit: 4, name: 'Variante Est' },
      { cp: 9, limit: 2, name: 'Tornante della Villa' },
      { cp: 11, limit: 5, name: 'Fontana' },
      { cp: 15, limit: 3, name: 'Le Serre' },
      { cp: 17, limit: 4, name: 'Alto dei Cervi' },
      { cp: 19, limit: 7, name: 'Curva dei Cipressi' },
    ],
    sectors: [7, 15],
    tunnels: [],
    passes: [],
    gravel: [[8, 10]],
    scenery: [
      ['stand', 0.06, 1, 72], ['stand', 0.14, 1, 72], ['pits', 0.04, -1, 55], ['pine', 0.3, -1, 80], ['pine', 0.32, -1, 110],
      ['pine', 0.34, -1, 80], ['house', 0.5, -1, 90], ['tree', 0.58, 1, 75], ['tree', 0.62, -1, 85], ['pine', 0.7, 1, 70],
      ['pine', 0.72, 1, 100], ['tree', 0.86, -1, 80], ['stand', 0.95, -1, 72],
    ],
    ground: '#5f7f45',
    accent: '#b8322a',
  },
  {
    id: 'bellerive',
    name: 'Belle-Rive',
    level: 'advanced',
    laps: 2,
    length: 72,
    blurb: 'Riverside town streets: chicanes, a quay hairpin, an S down the hill, a tunnel under the bridge and the harbour front.',
    points: [
      [1350, 860], [1100, 870], [840, 860], [700, 800], [600, 860], [420, 870], [220, 820], [140, 700],
      [220, 600], [140, 500], [120, 360], [220, 260], [360, 300], [460, 200], [620, 160], [740, 260],
      [700, 400], [800, 500], [960, 460], [1040, 330], [1180, 240], [1330, 290], [1300, 430], [1400, 540],
      [1460, 700],
    ],
    corners: [
      { cp: 3, limit: 3, name: 'Chicane du Marché' },
      { cp: 4, limit: 4, name: 'Sortie du Marché' },
      { cp: 7, limit: 2, name: 'Épingle du Quai' },
      { cp: 8, limit: 5, name: 'Pont-Neuf' },
      { cp: 11, limit: 3, name: 'Église' },
      { cp: 12, limit: 4, name: 'Rue Haute' },
      { cp: 14, limit: 2, name: 'Belvédère' },
      { cp: 16, limit: 3, name: 'Descente' },
      { cp: 18, limit: 5, name: 'Lavoir' },
      { cp: 20, limit: 4, name: 'Les Tanneurs' },
      { cp: 22, limit: 3, name: 'Gare' },
      { cp: 23, limit: 6, name: 'Port' },
    ],
    sectors: [9, 17],
    tunnels: [[8, 9]],
    passes: [],
    gravel: [],
    scenery: [
      ['house', 0.05, -1, 70], ['house', 0.1, -1, 70], ['house', 0.18, 1, 70], ['stand', 0.02, -1, 72], ['pits', 0.06, 1, 55],
      ['bridge', 0.31, 1, 0], ['house', 0.4, -1, 72], ['house', 0.46, 1, 75], ['shrine', 0.52, -1, 80], ['house', 0.62, -1, 70],
      ['tree', 0.7, 1, 70], ['house', 0.78, -1, 70], ['boat', 0.94, 1, 85], ['boat', 0.9, 1, 120],
    ],
    ground: '#7d7a6a',
    accent: '#2f5d8a',
  },
  {
    id: 'redwood',
    name: 'Redwood Raceway',
    level: 'intermediate',
    laps: 2,
    length: 66,
    blurb: 'A forest road with long uphill esses, a double-apex left and a tunnel cut through the cliff.',
    points: [
      [280, 830], [600, 850], [900, 830], [1140, 760], [1260, 640], [1200, 520], [1320, 420], [1470, 380],
      [1480, 230], [1340, 160], [1160, 180], [1020, 260], [880, 220], [720, 160], [560, 200], [520, 330],
      [400, 420], [260, 400], [150, 500], [170, 660],
    ],
    corners: [
      { cp: 4, limit: 5, name: 'Sawmill' },
      { cp: 5, limit: 3, name: 'Creek Bend' },
      { cp: 7, limit: 6, name: 'Ridge' },
      { cp: 9, limit: 4, name: 'Lookout' },
      { cp: 11, limit: 2, name: 'Bear Trap' },
      { cp: 14, limit: 5, name: 'Double Apex' },
      { cp: 16, limit: 4, name: 'Logger’s Esses' },
      { cp: 18, limit: 6, name: 'Ranger Station' },
    ],
    sectors: [7, 14],
    tunnels: [[12, 13]],
    passes: [{ from: 6, to: 8, cap: 9 }],
    gravel: [[10, 11]],
    scenery: [
      ['pine', 0.1, 1, 75], ['pine', 0.14, 1, 105], ['pine', 0.2, -1, 80], ['stand', 0.04, 1, 72], ['pits', 0.02, -1, 55],
      ['pine', 0.32, 1, 80], ['rock', 0.4, -1, 75], ['pine', 0.48, 1, 85], ['rock', 0.64, -1, 70], ['pine', 0.66, 1, 90],
      ['pine', 0.76, -1, 85], ['barn', 0.84, 1, 90], ['pine', 0.9, -1, 75], ['pine', 0.92, -1, 110],
    ],
    ground: '#4f6b3c',
    accent: '#a3462a',
  },
  {
    id: 'mizukawa',
    name: 'Mizukawa',
    level: 'advanced',
    laps: 2,
    length: 70,
    blurb: 'A hillside course by the lake: a double-apex spoon, flowing esses and a hairpin under the shrine steps.',
    points: [
      [300, 150], [620, 130], [920, 150], [1160, 200], [1300, 300], [1440, 360], [1500, 500], [1400, 620],
      [1260, 580], [1140, 660], [1200, 790], [1060, 850], [900, 800], [820, 680], [700, 600], [560, 660],
      [480, 800], [320, 820], [220, 700], [300, 560], [220, 420], [160, 280],
    ],
    corners: [
      { cp: 3, limit: 4, name: 'Ichi' },
      { cp: 5, limit: 6, name: 'Lakeside' },
      { cp: 7, limit: 3, name: 'Spoon Entry' },
      { cp: 8, limit: 5, name: 'Spoon Exit' },
      { cp: 10, limit: 2, name: 'Shrine Hairpin' },
      { cp: 12, limit: 4, name: 'Torii' },
      { cp: 14, limit: 3, name: 'Esses' },
      { cp: 16, limit: 5, name: 'Pagoda' },
      { cp: 18, limit: 6, name: 'Cedar' },
      { cp: 19, limit: 3, name: 'Kink' },
      { cp: 20, limit: 4, name: 'Final' },
    ],
    sectors: [8, 15],
    tunnels: [[16, 17]],
    passes: [{ from: 9, to: 11, cap: 8 }],
    gravel: [[7, 8]],
    scenery: [
      ['stand', 0.05, -1, 72], ['stand', 0.12, -1, 72], ['pits', 0.03, 1, 55], ['boat', 0.2, -1, 110], ['tree', 0.28, 1, 70],
      ['shrine', 0.47, 1, 80], ['pine', 0.5, -1, 75], ['tree', 0.58, -1, 70], ['pine', 0.66, 1, 70], ['rock', 0.73, -1, 70],
      ['pine', 0.8, 1, 80], ['house', 0.88, -1, 70],
    ],
    ground: '#567a4a',
    accent: '#c23a2e',
  },
  {
    id: 'puerto',
    name: 'Puerto del Sol',
    level: 'advanced',
    laps: 2,
    length: 74,
    blurb: 'Harbour and old town: a stadium section of tight corners, the seafront straight and a hairpin at the lighthouse.',
    points: [
      [1340, 130], [1040, 120], [740, 130], [480, 160], [280, 220], [140, 320], [220, 440], [120, 550],
      [170, 700], [300, 800], [440, 740], [420, 600], [560, 530], [700, 600], [680, 740], [820, 820],
      [960, 750], [940, 600], [1060, 500], [1200, 580], [1220, 730], [1360, 780], [1460, 640], [1370, 500],
      [1430, 360],
    ],
    corners: [
      { cp: 4, limit: 4, name: 'Aduana' },
      { cp: 6, limit: 3, name: 'Mercado' },
      { cp: 7, limit: 5, name: 'Rambla' },
      { cp: 9, limit: 2, name: 'Faro' },
      { cp: 11, limit: 4, name: 'Muralla' },
      { cp: 12, limit: 3, name: 'Catedral' },
      { cp: 13, limit: 6, name: 'Plaza Mayor' },
      { cp: 15, limit: 3, name: 'Estadio' },
      { cp: 17, limit: 2, name: 'Tribuna' },
      { cp: 18, limit: 4, name: 'Toril' },
      { cp: 20, limit: 5, name: 'Alcázar' },
      { cp: 22, limit: 3, name: 'Puerta' },
      { cp: 24, limit: 4, name: 'Malecón' },
    ],
    sectors: [9, 17],
    tunnels: [[13, 14]],
    passes: [],
    gravel: [[8, 9], [21, 22]],
    scenery: [
      ['palm', 0.04, 1, 70], ['palm', 0.1, 1, 70], ['palm', 0.16, 1, 70], ['boat', 0.12, 1, 120], ['pits', 0.03, -1, 55],
      ['stand', 0.07, -1, 72], ['lighthouse', 0.36, 1, 80], ['house', 0.44, -1, 70], ['house', 0.52, 1, 70], ['stand', 0.62, -1, 75],
      ['stand', 0.66, 1, 75], ['house', 0.78, -1, 70], ['palm', 0.88, 1, 70], ['palm', 0.94, -1, 70],
    ],
    ground: '#b49a6a',
    accent: '#d0612a',
  },
  {
    id: 'noordzee',
    name: 'Noordzee Ring',
    level: 'intermediate',
    laps: 2,
    length: 66,
    blurb: 'Dunes and polders: a banked hairpin, wind-blown sweepers and long straights past the windmills.',
    points: [
      [300, 160], [620, 140], [960, 190], [1220, 180], [1400, 300], [1360, 440], [1220, 480], [1180, 600],
      [1300, 700], [1440, 770], [1360, 870], [1160, 850], [980, 770], [800, 800], [640, 740], [600, 600],
      [460, 530], [300, 600], [180, 520], [160, 320],
    ],
    corners: [
      { cp: 4, limit: 5, name: 'Strand' },
      { cp: 6, limit: 3, name: 'Duinbocht' },
      { cp: 7, limit: 4, name: 'Polder' },
      { cp: 9, limit: 6, name: 'Molen' },
      { cp: 10, limit: 3, name: 'Kerk' },
      { cp: 12, limit: 5, name: 'Dijk' },
      { cp: 15, limit: 2, name: 'Hairpin' },
      { cp: 17, limit: 4, name: 'Vuurtoren' },
      { cp: 18, limit: 6, name: 'Zeeweg' },
    ],
    sectors: [7, 13],
    tunnels: [],
    passes: [],
    gravel: [[5, 6], [15, 16]],
    scenery: [
      ['stand', 0.05, -1, 72], ['pits', 0.03, 1, 55], ['windmill', 0.2, -1, 95], ['windmill', 0.26, -1, 140], ['dune', 0.34, 1, 80],
      ['barn', 0.44, -1, 80], ['windmill', 0.52, 1, 85], ['dune', 0.62, -1, 75], ['house', 0.7, 1, 75], ['dune', 0.78, -1, 80],
      ['lighthouse', 0.86, 1, 90], ['stand', 0.95, -1, 72],
    ],
    ground: '#8aa060',
    accent: '#e07a1f',
  },
  {
    id: 'kalahari',
    name: 'Kalahari',
    level: 'advanced',
    laps: 2,
    length: 70,
    blurb: 'A desert plateau: wide fast sweepers, gravel run-offs, a rocky pass and a sudden hairpin at the waterhole.',
    points: [
      [1320, 850], [1000, 870], [680, 860], [420, 800], [300, 680], [140, 620], [100, 460], [220, 360],
      [160, 220], [300, 150], [460, 220], [600, 320], [760, 260], [900, 170], [1060, 220], [1040, 360],
      [1160, 460], [1310, 420], [1430, 520], [1420, 700],
    ],
    corners: [
      { cp: 4, limit: 4, name: 'Pan' },
      { cp: 5, limit: 6, name: 'Springbok' },
      { cp: 7, limit: 3, name: 'Kopje' },
      { cp: 8, limit: 5, name: 'Baobab' },
      { cp: 10, limit: 2, name: 'Waterhole' },
      { cp: 11, limit: 4, name: 'Dry River' },
      { cp: 13, limit: 6, name: 'Long Sweep' },
      { cp: 15, limit: 3, name: 'Thornveld' },
      { cp: 17, limit: 5, name: 'Camelthorn' },
      { cp: 18, limit: 4, name: 'Homestead' },
    ],
    sectors: [7, 14],
    tunnels: [],
    passes: [{ from: 6, to: 8, cap: 8 }],
    gravel: [[3, 5], [9, 11], [15, 16]],
    scenery: [
      ['stand', 0.05, -1, 72], ['pits', 0.03, 1, 55], ['cactus', 0.16, -1, 75], ['rock', 0.25, 1, 75], ['rock', 0.34, -1, 70],
      ['rock', 0.39, -1, 80], ['tree', 0.48, 1, 80], ['tent', 0.52, -1, 85], ['cactus', 0.6, 1, 70], ['rock', 0.7, -1, 75],
      ['tree', 0.8, 1, 80], ['barn', 0.88, -1, 85],
    ],
    ground: '#c19a5b',
    accent: '#8a3a1f',
  },
];

/** Spaces covered by control points `from`..`to` (inclusive), in travel order. */
function cpRange(g: TrackGeo, from: number, to: number): number[] {
  const n = g.spaces.length;
  const a = spaceAtCp(g, from), b = spaceAtCp(g, to);
  const out: number[] = [];
  for (let i = a; ; i = (i + 1) % n) {
    out.push(i);
    if (i === b) break;
  }
  return out;
}

const cache = new Map<string, Circuit>();

export function resolveCircuit(id: string): Circuit {
  const hit = cache.get(id);
  if (hit) return hit;
  const d = CIRCUITS.find((c) => c.id === id);
  if (!d) throw new Error(`unknown circuit ${id}`);
  const geo = buildTrack(d.points, d.length);
  const n = d.length;
  const s1 = spaceAtCp(geo, d.sectors[0]), s2 = spaceAtCp(geo, d.sectors[1]);
  const flag = (ranges: [number, number][]) => {
    const out = Array<boolean>(n).fill(false);
    for (const [a, b] of ranges) for (const i of cpRange(geo, a, b)) out[i] = true;
    return out;
  };
  const pass = Array<number | null>(n).fill(null);
  for (const p of d.passes) for (const i of cpRange(geo, p.from, p.to)) pass[i] = p.cap;
  const c: Circuit = {
    ...d,
    geo,
    corners: d.corners.map((k) => ({ at: spaceAtCp(geo, k.cp), limit: k.limit, name: k.name })),
    sector: Array.from({ length: n }, (_, i) => (i >= s2 ? 2 : i >= s1 ? 1 : 0)),
    tunnel: flag(d.tunnels),
    pass,
    gravel: flag(d.gravel),
  };
  cache.set(id, c);
  return c;
}

export const CIRCUIT_IDS = CIRCUITS.map((c) => c.id);
