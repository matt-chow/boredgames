/**
 * Settings, props and dressed figures for the card catalogue, on top of kit.mjs (docs/ART_BIBLE.md).
 * Figures are authored facing right; `dir: -1` mirrors them. Nothing here may draw on a face.
 */
import { arch, C, cypress, ell, foliage, group, H, line, LINE, masonry, path, person, poly, rect, rng, ticks, W } from './kit.mjs';

export const POSES = {
  stand: {},
  reach: { armR: [[13, -102], [30, -94], [46, -90]] },
  give: { armR: [[13, -102], [28, -86], [44, -82]], armL: [[-13, -102], [-17, -82], [-12, -62]] },
  both: { armR: [[13, -102], [28, -86], [44, -80]], armL: [[-13, -102], [12, -84], [38, -76]] },
  point: { armR: [[13, -102], [34, -108], [54, -116]] },
  raise: { armR: [[13, -102], [24, -122], [28, -148]] },
  cheer: { armR: [[13, -102], [24, -122], [28, -146]], armL: [[-13, -102], [-24, -122], [-28, -146]] },
  head: { armR: [[13, -102], [20, -120], [8, -138]], armL: [[-13, -102], [-20, -120], [-8, -138]] },
  hammer: { armR: [[13, -102], [2, -124], [16, -142]], armL: [[-13, -102], [8, -84], [26, -78]] },
  write: { armR: [[13, -102], [24, -84], [40, -78]], armL: [[-13, -102], [6, -86], [24, -80]] },
  hip: { armL: [[-13, -102], [-27, -84], [-12, -70]] },
  low: { armR: [[13, -102], [26, -76], [40, -56]], armL: [[-13, -102], [8, -76], [30, -52]] },
  pull: { armR: [[13, -102], [32, -84], [52, -86]], armL: [[-13, -102], [18, -80], [46, -80]] },
  whisper: { armR: [[13, -102], [20, -106], [14, -122]] },
};
export const LEGS = {
  walk: { legL: [[-6, -56], [-14, -28], [-22, -3]], legR: [[6, -56], [14, -30], [24, -3]] },
  run: { legL: [[-6, -56], [-22, -36], [-40, -24]], legR: [[6, -56], [28, -38], [32, -6]], lean: 8, armR: [[13, -102], [30, -88], [38, -104]], armL: [[-13, -102], [-30, -92], [-40, -74]] },
  // These two lower the figure: the ground line is at -24 and -20, and fig() shifts them down to it.
  kneel: { legL: [[-6, -56], [-8, -28], [-28, -27]], legR: [[6, -56], [24, -44], [22, -26]], drop: 24 },
  sit: { legL: [[-4, -56], [16, -52], [14, -22]], legR: [[6, -56], [26, -52], [24, -22]], drop: 20 },
  brace: { legL: [[-6, -56], [-18, -30], [-30, -3]], legR: [[6, -56], [16, -32], [14, -3]], lean: 7 },
};
export const DRESS = {
  noble: { top: C.burgundy, sleeve: C.burgundyLight, gown: { fill: C.burgundy, trim: C.gold, fold: true }, hat: 'feather', collar: C.ivory },
  monarch: { top: C.burgundy, sleeve: C.burgundyDark, gown: { fill: C.burgundy, w: 29, trim: C.gold, panel: C.goldLight, fold: true }, hat: 'crown', collar: C.gold, belt: C.gold },
  merchant: { top: C.slate, sleeve: C.slateDark, hose: C.woodDark, skirt: C.slate, hat: 'beret', collar: C.ivory, belt: C.woodDark },
  burgher: { top: C.sageDark, sleeve: C.sageDeep, gown: { fill: C.sageDark, fold: true, trim: C.woodDark }, hat: 'black-cap' },
  clerk: { top: C.slateDark, sleeve: C.slateDark, gown: { fill: C.slateDark, fold: true }, hat: 'black-cap', collar: C.ivory },
  scholar: { top: C.wood, sleeve: C.woodDark, gown: { fill: C.wood, fold: true }, hat: 'beret' },
  monk: { top: C.woodDark, sleeve: C.woodDark, gown: { fill: C.woodDark, fold: true }, hat: 'cowl', collar: null, belt: C.parchment },
  guard: { top: C.slateLight, sleeve: C.slate, hose: C.slateDark, skirt: C.burgundy, hat: 'kettle', collar: null, belt: C.woodDark },
  worker: { top: C.terra, sleeve: C.terraDark, hose: C.wood, hat: 'cap', collar: null },
  smith: { top: C.parchmentDark, sleeve: C.parchmentDark, hose: C.woodDark, apron: C.woodDark, hat: 'bare', collar: null },
  farmer: { top: C.sage, sleeve: C.sageDark, hose: C.woodLight, skirt: C.sage, hat: 'cap', collar: null },
  wife: { top: C.terra, sleeve: C.parchment, gown: { fill: C.terra, fold: true }, apron: C.ivory, hat: 'coif', collar: null },
  goodwife: { top: C.slate, sleeve: C.slateLight, gown: { fill: C.slate, fold: true }, hat: 'kerchief', collar: null },
  lady: { top: C.sageDark, sleeve: C.sageLight, gown: { fill: C.sageDark, w: 28, panel: C.goldLight, trim: C.gold, fold: true }, hat: 'veil', collar: C.ivory, belt: C.gold },
  herald: { top: C.gold, sleeve: C.burgundy, hose: C.burgundyDark, skirt: C.burgundy, hat: 'beret', collar: C.ivory },
  hooded: { top: C.slateDeep, sleeve: C.slateDeep, gown: { fill: C.slateDeep, fold: true }, hat: 'hood', collar: null },
  page: { top: C.burgundyLight, sleeve: C.parchment, hose: C.slateDark, hat: 'bare', collar: C.ivory },
  poor: { top: C.stoneDark, sleeve: C.stone, hose: C.stoneDeep, skirt: C.stoneDark, hat: 'bare', collar: null },
};

/**
 * A dressed figure. Feet at (x, y), `pose` for arms and `legs` for the lower body. Anything else overrides the person() options,
 * and `face` lets a head look back: the figure keeps its facing, only the hair and hat turn. Blank by rule.
 */
export function fig(x, y, s, who, o = {}) {
  const { dir = 1, pose = 'stand', legs = null, tone = 0, ...rest } = o;
  const l = legs ? { ...LEGS[legs] } : {};
  const drop = l.drop ?? 0;
  delete l.drop;
  return person({ x, y: y + drop * s, s, flip: dir < 0, dir: 1, skin: C.skin[tone], hair: C.hair[(tone + Math.round(x)) % 4], line: Math.max(2.6, 1.7 / s), ...DRESS[who], ...POSES[pose], ...l, ...rest });
}

/* ---------- Settings ---------- */
export const sky = (low = C.skyLow, top = C.sky, band = 110) => rect(0, 0, W, H, top, 0) + rect(0, band, W, H - band, low, 0);
export const night = () => rect(0, 0, W, H, C.slateDeep, 0) + rect(0, 110, W, 250, C.slateDark, 0);
export const ground = (y, fill = C.sage, sw = LINE.form) => path(`M0 ${y}C160 ${y - 7} 340 ${y + 6} 640 ${y - 3}V360H0Z`, fill, sw);
export const paving = (y, fill = C.stone, seed = 1) => {
  const r = rng(seed);
  let d = '';
  for (let row = 0; row < 5; row++) {
    const yy = y + 10 + row * row * 3 + row * 8;
    for (let i = 0; i < 6; i++) { const x = r() * 620; d += `M${x.toFixed(0)} ${yy}h${(18 + row * 7 + r() * 16).toFixed(0)}`; }
  }
  return rect(0, y, W, H - y, fill, LINE.form) + line(d, LINE.fine, C.stoneDeep);
};
export const hills = (y, fill = C.slateLight, h = 40, seed = 1) => {
  const r = rng(seed);
  const a = () => (y - h * (0.4 + r() * 0.6)).toFixed(0);
  return path(`M0 ${a()}C100 ${a()} 180 ${a()} 280 ${a()}S470 ${a()} 640 ${a()}V${y + 60}H0Z`, fill, LINE.form);
};
export const cloud = (x, y, w = 90) => path(`M${x} ${y}c${w * 0.08} ${-w * 0.16} ${w * 0.34} ${-w * 0.16} ${w * 0.44} ${-w * 0.05}c${w * 0.14} ${-w * 0.09} ${w * 0.44} ${-w * 0.04} ${w * 0.5} ${w * 0.1}H${x - w * 0.1}c${w * 0.01} ${-w * 0.03} ${w * 0.05} ${-w * 0.05} ${w * 0.1} ${-w * 0.05}Z`, C.ivory, LINE.fine);
export const water = (y, fill = C.slateLight, seed = 3) => {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < 16; i++) { const yy = y + 8 + r() * (H - y - 12); const x = r() * 600; d += `M${x.toFixed(0)} ${yy.toFixed(0)}q${(10 + r() * 14).toFixed(0)} -4 ${(26 + r() * 20).toFixed(0)} 0`; }
  return rect(0, y, W, H - y, fill, LINE.form) + line(d, LINE.fine, C.slate);
};
/** An inside wall with a floor line. */
export const room = (wall = C.stoneLight, floor = C.woodLight, y = 280, seed = 2) => rect(0, 0, W, H, wall, 0) + masonry(0, 0, W, y, seed, { rows: 10, gaps: 0.5, ink: C.stoneDark }) + rect(0, y, W, H - y, floor, LINE.form);
export const floorTiles = (y, a = C.parchmentDark, b = C.stone) => {
  let s = rect(0, y, W, H - y, a, LINE.form);
  let d = '';
  for (let i = -10; i < 24; i++) d += `M${320 + (i - 7) * 44} ${y}L${320 + (i - 7) * 96} 360`;
  for (const k of [12, 30, 54]) d += `M0 ${y + k}H640`;
  s += line(d, LINE.fine, C.stoneDeep);
  return s + (b ? '' : '');
};
/** A wide stone arch framing a scene. Draws the wall in front with the opening cut out. */
export const frameArch = (x, w, top, fill = C.stone, y = 360) => path(`M0 0H640V360H${x + w / 2}V${top + w / 2}A${w / 2} ${w / 2} 0 0 0 ${x - w / 2} ${top + w / 2}V${y}H0Z`, fill, LINE.heavy);
export const vaultedRoof = (fill = C.stone) => path(`M0 0H640V36C560 96 410 110 320 54C230 110 80 96 0 36Z`, fill, LINE.form) + line(`M320 54V0`, LINE.form) + ell(320, 54, 7, 7, C.gold, LINE.fine);
export const column = (x, y, h, w = 22, fill = C.stoneLight) => rect(x - w / 2, y - h, w, h, fill, LINE.form) + rect(x - w / 2 - 5, y - h - 8, w + 10, 9, fill, LINE.form) + rect(x - w / 2 - 5, y - 8, w + 10, 8, fill, LINE.form) + line(`M${x - 4} ${y - h + 6}V${y - 10}M${x + 4} ${y - h + 6}V${y - 10}`, LINE.fine, C.stoneDeep);
export const window3 = (x, y, w, h, glass = C.sky) => arch(x, y, w + 8, h + 6, C.stone, LINE.form) + arch(x, y, w, h, glass, LINE.form) + line(`M${x} ${y}V${y - h}M${x - w / 2} ${y - h * 0.45}H${x + w / 2}M${x - w / 2} ${y - h * 0.22}H${x + w / 2}`, LINE.fine);
export const tapestry = (x, y, w, h, fill = C.burgundy, device = C.gold) => rect(x - 3, y - 3, w + 6, 5, C.woodDark, LINE.fine) + path(`M${x} ${y}H${x + w}V${y + h}L${x + w / 2} ${y + h - 16}L${x} ${y + h}Z`, fill, LINE.form) + ell(x + w / 2, y + h * 0.4, w * 0.2, w * 0.2, device, LINE.fine) + line(`M${x + 6} ${y + 8}H${x + w - 6}`, LINE.fine, device);

/** A skyline of gabled houses across the back. */
export function roofline(y, seed = 4, { from = 0, to = 640, h = 46, walls = [C.stoneLight, C.parchment, C.parchmentDark], roof = C.terra, sw = LINE.form } = {}) {
  const r = rng(seed);
  let s = '';
  for (let x = from - 10; x < to;) {
    const w = 34 + r() * 44;
    const hh = h * (0.7 + r() * 0.6);
    const peak = 14 + r() * 16;
    s += rect(x, y - hh, w, hh + 3, walls[Math.floor(r() * walls.length)], sw) + poly([[x - 3, y - hh], [x + w / 2, y - hh - peak], [x + w + 3, y - hh]], r() < 0.2 ? C.terraDark : roof, sw);
    if (w > 46) s += rect(x + w / 2 - 5, y - hh + 8, 10, 13, C.slateDark, LINE.fine);
    x += w - 2;
  }
  return s;
}

/* ---------- Buildings ---------- */
export const tree = (x, y, s = 1, fill = C.sage, shade = C.sageDark) => rect(x - 5 * s, y - 42 * s, 10 * s, 42 * s, C.wood, LINE.form) + foliage([[x, y - 74 * s, 30 * s], [x - 24 * s, y - 54 * s, 22 * s], [x + 24 * s, y - 56 * s, 23 * s]], fill, LINE.form, shade);
/** A gabled house, front on. `door` sets a door, and half-timber lines when `frame`. */
export function house(x, y, w, h, { wall = C.parchment, roof = C.terra, peak = 0.55, door = true, frame = false, windows = 2, sw = LINE.heavy, side = 0 } = {}) {
  let s = '';
  if (side) s += poly([[x + w, y], [x + w + side, y - 8], [x + w + side, y - h - 8], [x + w, y - h]], C.stone, sw) + poly([[x + w / 2, y - h - w * peak], [x + w / 2 + side, y - h - w * peak - 8], [x + w + side + 3, y - h - 8], [x + w + 3, y - h]], roof, sw);
  s += rect(x, y - h, w, h, wall, sw) + poly([[x - 5, y - h], [x + w / 2, y - h - w * peak], [x + w + 5, y - h]], roof, sw);
  if (frame) s += line(`M${x} ${y - h * 0.5}H${x + w}M${x + w * 0.25} ${y - h}V${y}M${x + w * 0.75} ${y - h}V${y}M${x} ${y - h}L${x + w * 0.25} ${y - h * 0.5}M${x + w} ${y - h}L${x + w * 0.75} ${y - h * 0.5}M${x + w / 2} ${y - h - w * peak}V${y - h}`, LINE.form, C.woodDark);
  for (let i = 0; i < windows; i++) s += rect(x + w * ((i + 0.5) / windows) - 7, y - h + 10, 14, 17, C.slateDark, LINE.fine);
  if (door) s += arch(x + w / 2, y, w * 0.22, h * 0.5, C.woodDark, LINE.form);
  return s;
}
export const tower = (x, y, w, h, { fill = C.stone, roof = C.slateDark, cone = true, seed = 7, sw = LINE.heavy } = {}) => rect(x - w / 2, y - h, w, h, fill, sw) + masonry(x - w / 2 + 2, y - h + 8, w - 4, h - 12, seed, { rows: Math.round(h / 16) }) + (cone ? poly([[x - w / 2 - 6, y - h], [x, y - h - w * 1.1], [x + w / 2 + 6, y - h]], roof, sw) : battlement(x - w / 2 - 4, y - h, w + 8, fill));
export function battlement(x, y, w, fill = C.stone, tooth = 12, sw = LINE.form) {
  let d = `M${x} ${y}`;
  const count = Math.max(2, Math.floor(w / (tooth * 2)));
  const step = w / (count * 2 - 1);
  for (let i = 0; i < count * 2 - 1; i++) d += i % 2 === 0 ? `v${-tooth}h${step}v${tooth}` : `h${step}`;
  return path(`${d}V${y + 10}H${x}Z`, fill, sw);
}
export const wall = (x, y, w, h, fill = C.stone, seed = 9) => rect(x, y - h, w, h, fill, LINE.heavy) + masonry(x + 2, y - h + 6, w - 4, h - 8, seed, { rows: Math.round(h / 14) }) + battlement(x - 3, y - h, w + 6, fill);
/** Wooden door with iron straps in a stone arch. */
export const door = (x, y, w, h, open = false) => arch(x, y, w + 14, h + 8, C.stoneLight, LINE.form) + arch(x, y, w, h, open ? C.slateDeep : C.wood, LINE.form) + (open ? '' : line(`M${x} ${y}V${y - h}M${x - w / 2} ${y - h * 0.3}H${x + w / 2}M${x - w / 2} ${y - h * 0.65}H${x + w / 2}`, LINE.form, C.woodDark));

/* ---------- Furniture and props ---------- */
export const table = (x, y, w, top = C.woodLight, h = 44, cloth = null) => rect(x - w / 2 + 8, y - h, 8, h, C.woodDark, LINE.form) + rect(x + w / 2 - 16, y - h, 8, h, C.woodDark, LINE.form) + (cloth ? path(`M${x - w / 2} ${y - h - 6}H${x + w / 2}V${y - h + 20}Q${x} ${y - h + 30} ${x - w / 2} ${y - h + 20}Z`, cloth, LINE.form) : '') + rect(x - w / 2, y - h - 7, w, 8, top, LINE.form);
export const desk = (x, y, w = 80) => poly([[x - w / 2, y - 62], [x + w / 2, y - 72], [x + w / 2, y - 62], [x - w / 2, y - 54]], C.woodLight, LINE.form) + rect(x - w / 2 + 6, y - 56, 7, 56, C.woodDark, LINE.form) + rect(x + w / 2 - 12, y - 62, 7, 62, C.woodDark, LINE.form);
export const stool = (x, y, h = 24, w = 24) => rect(x - w / 2, y - h - 4, w, 5, C.wood, LINE.form) + ticks([[x - w / 2 + 3, y - h, x - w / 2 + 1, y], [x + w / 2 - 3, y - h, x + w / 2 - 1, y]], LINE.form);
export const chest = (x, y, w = 70, h = 36, open = false, fill = C.wood, band = C.goldDark) => (open ? path(`M${x - w / 2} ${y - h}C${x - w / 2 + 4} ${y - h - 30} ${x + w / 2 - 4} ${y - h - 30} ${x + w / 2} ${y - h}Z`, C.woodDark, LINE.form) + ell(x, y - h, w / 2 - 3, 7, C.gold, LINE.form) + ticks([[x - w / 5, y - h - 2, x - w / 8, y - h - 2], [x + 2, y - h + 1, x + w / 6, y - h + 1]], LINE.fine, C.goldDark) : path(`M${x - w / 2} ${y - h}C${x - w / 2} ${y - h - 22} ${x + w / 2} ${y - h - 22} ${x + w / 2} ${y - h}Z`, fill, LINE.form)) + rect(x - w / 2, y - h, w, h, fill, LINE.form) + rect(x - w / 2 + 6, y - h, 7, h, band, LINE.fine) + rect(x + w / 2 - 13, y - h, 7, h, band, LINE.fine) + rect(x - 6, y - h - 2, 12, 12, band, LINE.fine);
export const barrel = (x, y, s = 1) => path(`M${x - 16 * s} ${y}C${x - 22 * s} ${y - 14 * s} ${x - 22 * s} ${y - 32 * s} ${x - 16 * s} ${y - 46 * s}H${x + 16 * s}C${x + 22 * s} ${y - 32 * s} ${x + 22 * s} ${y - 14 * s} ${x + 16 * s} ${y}Z`, C.wood, LINE.form) + line(`M${x - 20 * s} ${y - 12 * s}H${x + 20 * s}M${x - 20 * s} ${y - 34 * s}H${x + 20 * s}`, LINE.form, C.woodDark) + line(`M${x - 7 * s} ${y - 46 * s}V${y}M${x + 7 * s} ${y - 46 * s}V${y}`, LINE.fine, C.woodDark);
export const sack = (x, y, s = 1, fill = C.parchmentDark) => path(`M${x - 20 * s} ${y}C${x - 28 * s} ${y - 26 * s} ${x - 16 * s} ${y - 40 * s} ${x - 6 * s} ${y - 44 * s}L${x - 9 * s} ${y - 54 * s}H${x + 9 * s}L${x + 6 * s} ${y - 44 * s}C${x + 16 * s} ${y - 40 * s} ${x + 28 * s} ${y - 26 * s} ${x + 20 * s} ${y}Z`, fill, LINE.form) + line(`M${x - 7 * s} ${y - 44 * s}H${x + 7 * s}`, LINE.form, C.woodDark);
export const bale = (x, y, w = 56, h = 32, fill = C.burgundyLight) => rect(x - w / 2, y - h, w, h, fill, LINE.form) + line(`M${x - w / 4} ${y - h}V${y}M${x + w / 4} ${y - h}V${y}M${x - w / 2} ${y - h / 2}H${x + w / 2}`, LINE.fine, C.woodDark);
export const sheaf = (x, y, s = 1) => path(`M${x - 8 * s} ${y}L${x - 3 * s} ${y - 20 * s}L${x - 14 * s} ${y - 46 * s}Q${x} ${y - 56 * s} ${x + 14 * s} ${y - 46 * s}L${x + 3 * s} ${y - 20 * s}L${x + 8 * s} ${y}Z`, C.gold, LINE.form) + rect(x - 5 * s, y - 24 * s, 10 * s, 5 * s, C.woodDark, LINE.fine) + line(`M${x - 6 * s} ${y - 44 * s}L${x - 1 * s} ${y - 26 * s}M${x + 6 * s} ${y - 44 * s}L${x + 1 * s} ${y - 26 * s}M${x} ${y - 48 * s}V${y - 26 * s}`, LINE.fine, C.goldDark);
export const coins = (x, y, r = 12, n = 3, fill = C.gold) => {
  let s = '';
  for (let i = 0; i < n; i++) s += path(`M${x - r} ${y - i * 5}v-3a${r} ${r * 0.35} 0 0 0 ${r * 2} 0v3a${r} ${r * 0.35} 0 0 1 ${-r * 2} 0Z`, C.goldDark, LINE.fine) + ell(x, y - i * 5 - 3, r, r * 0.35, fill, LINE.fine);
  return s;
};
export const coin = (x, y, r = 7, fill = C.gold) => ell(x, y, r, r, fill, LINE.fine) + ell(x, y, r * 0.6, r * 0.6, 'none', LINE.fine, C.goldDark);
export const purse = (x, y, s = 1, fill = C.wood) => path(`M${x - 14 * s} ${y}C${x - 22 * s} ${y - 16 * s} ${x - 12 * s} ${y - 28 * s} ${x - 5 * s} ${y - 30 * s}L${x - 8 * s} ${y - 38 * s}H${x + 8 * s}L${x + 5 * s} ${y - 30 * s}C${x + 12 * s} ${y - 28 * s} ${x + 22 * s} ${y - 16 * s} ${x + 14 * s} ${y}Z`, fill, LINE.form) + line(`M${x - 6 * s} ${y - 30 * s}H${x + 6 * s}`, LINE.form, C.gold);
export const book = (x, y, w = 60, h = 12, leaf = C.ivory) => path(`M${x - w / 2} ${y}Q${x - w / 4} ${y - h} ${x} ${y - 2}Q${x + w / 4} ${y - h} ${x + w / 2} ${y}V${y + 5}Q${x + w / 4} ${y - h + 5} ${x} ${y + 3}Q${x - w / 4} ${y - h + 5} ${x - w / 2} ${y + 5}Z`, leaf, LINE.fine) + line(`M${x - w * 0.38} ${y - 2}Q${x - w / 4} ${y - h + 2} ${x - 5} ${y - 2}M${x + 5} ${y - 2}Q${x + w / 4} ${y - h + 2} ${x + w * 0.38} ${y - 2}`, LINE.fine, C.stoneDark);
/** A sheet held out: `seal` adds the hanging wax. */
export const sheet = (x, y, w = 26, h = 34, seal = true, rot = 0) => `<g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''}">` + rect(-w / 2, -h, w, h, C.ivory, LINE.form) + line(`M${-w / 2 + 4} ${-h + 7}H${w / 2 - 4}M${-w / 2 + 4} ${-h + 13}H${w / 2 - 4}M${-w / 2 + 4} ${-h + 19}H${w / 2 - 6}`, LINE.fine, C.stoneDark) + (seal ? line(`M0 0v6`, LINE.fine, C.burgundy) + ell(0, 8, 4.5, 4.5, C.burgundy, LINE.fine) : '') + '</g>';
export const scroll = (x, y, l = 30, rot = 0, fill = C.parchment) => `<g transform="translate(${x} ${y}) rotate(${rot})">` + rect(-l / 2, -4, l, 8, fill, LINE.fine) + ell(-l / 2, 0, 2, 4, C.parchmentDark, LINE.fine) + ell(l / 2, 0, 2, 4, C.parchmentDark, LINE.fine) + '</g>';
export const candle = (x, y, lit = true) => rect(x - 3, y - 18, 6, 18, C.ivory, LINE.fine) + rect(x - 7, y - 2, 14, 3, C.goldDark, LINE.fine) + (lit ? path(`M${x} ${y - 30}C${x + 5} ${y - 24} ${x + 3} ${y - 19} ${x} ${y - 19}C${x - 3} ${y - 19} ${x - 5} ${y - 24} ${x} ${y - 30}Z`, C.goldLight, LINE.fine) : '');
export const lantern = (x, y, r = 11) => line(`M${x} ${y - r * 2.4}V${y - r}`, LINE.fine) + poly([[x - r, y - r], [x, y - r * 1.8], [x + r, y - r]], C.woodDark, LINE.fine) + rect(x - r * 0.8, y - r, r * 1.6, r * 1.6, C.goldLight, LINE.form) + line(`M${x} ${y - r}V${y + r * 0.6}`, LINE.fine) + rect(x - r, y + r * 0.6, r * 2, 3, C.woodDark, LINE.fine);
export const balance = (x, y, s = 1, tip = 0) => line(`M${x} ${y}V${y - 70 * s}M${x - 36 * s} ${y - 62 * s - tip}L${x + 36 * s} ${y - 62 * s + tip}`, LINE.form) + rect(x - 12 * s, y - 3, 24 * s, 4, C.woodDark, LINE.fine) + [[-1, -tip], [1, tip]].map(([d, t]) => line(`M${x + d * 36 * s} ${y - 62 * s + t}L${x + d * 26 * s} ${y - 36 * s + t}M${x + d * 36 * s} ${y - 62 * s + t}L${x + d * 46 * s} ${y - 36 * s + t}`, LINE.fine) + path(`M${x + d * 36 * s - 12 * s} ${y - 36 * s + t}a${12 * s} ${6 * s} 0 0 0 ${24 * s} 0Z`, C.goldDark, LINE.fine)).join('');
export const banner = (x, y, h, fill = C.burgundy, device = C.gold, s = 1, dir = 1) => line(`M${x} ${y}V${y - h}`, LINE.form + 0.6) + path(`M${x} ${y - h + 2}h${dir * 44 * s}l${dir * -9 * s} ${13 * s}l${dir * 9 * s} ${13 * s}h${dir * -44 * s}Z`, fill, LINE.form) + ell(x + dir * 17 * s, y - h + 15 * s, 5 * s, 5 * s, device, LINE.fine);
/** A hanging banner for a wall. */
export const pennon = (x, y, w, h, fill = C.burgundy, device = C.gold) => path(`M${x} ${y}H${x + w}V${y + h}L${x + w / 2} ${y + h + w * 0.3}L${x} ${y + h}Z`, fill, LINE.form) + poly([[x + w / 2, y + h * 0.25], [x + w * 0.75, y + h * 0.5], [x + w / 2, y + h * 0.78], [x + w * 0.25, y + h * 0.5]], device, LINE.fine);
export function stall(x, y, w, h, stripeA = C.burgundy, stripeB = C.ivory, n = 7) {
  let awn = '';
  const sw = w / n;
  for (let i = 0; i < n; i++) awn += path(`M${x + i * sw} ${y - h}h${sw}l${6 - (i + 1) * 12 / n} 22q${-sw / 2} 7 ${-sw} 0Z`, i % 2 ? stripeB : stripeA, LINE.fine);
  return rect(x + 2, y - h, 6, h, C.woodDark, LINE.form) + rect(x + w - 8, y - h, 6, h, C.woodDark, LINE.form) + rect(x, y - 38, w, 38, C.wood, LINE.form) + rect(x - 3, y - 42, w + 6, 6, C.woodLight, LINE.form) + awn;
}
export function shelves(x, y, w, h, seed = 3, rows = 5, kind = 'rolls') {
  const r = rng(seed);
  let s = rect(x, y - h, w, h, C.woodDark, LINE.form);
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const yy = y - h + i * rh;
    if (kind === 'rolls') {
      for (let k = 0; k < w / 16 - 1; k++) { const cx = x + 10 + k * 16; const cy = yy + rh - 8; s += ell(cx, cy, 6.5, 6.5, r() < 0.2 ? C.parchmentDark : C.parchment, LINE.fine) + (r() < 0.5 ? ell(cx + 1, cy - 12, 6, 6, C.ivory, LINE.fine) : ''); }
    } else {
      let cx = x + 5;
      while (cx < x + w - 12) { const bw = 7 + r() * 8; const bh = rh * (0.6 + r() * 0.3); s += rect(cx, yy + rh - bh - 2, bw, bh, [C.burgundy, C.slate, C.sageDark, C.terra, C.woodLight][Math.floor(r() * 5)], LINE.fine); cx += bw + 1; }
    }
    s += rect(x, yy + rh - 3, w, 4, C.wood, LINE.fine);
  }
  return s + rect(x - 3, y - h - 4, w + 6, 7, C.wood, LINE.form);
}
export const wheel = (x, y, r) => ell(x, y, r, r, 'none', 4, C.ink) + ell(x, y, r, r, 'none', 2.4, C.woodLight) + ticks([0, 1, 2, 3, 4, 5].map((i) => { const a = (i * Math.PI) / 3; return [x, y, x + Math.cos(a) * r, y + Math.sin(a) * r]; }), LINE.form, C.woodDark) + ell(x, y, 3.6, 3.6, C.woodDark, LINE.fine);
export const cart = (x, y, w = 110, load = '', fill = C.wood) => line(`M${x + w / 2} ${y - 28}L${x + w / 2 + 44} ${y - 14}`, LINE.form + 1, C.woodDark) + load + rect(x - w / 2, y - 48, w, 24, fill, LINE.form) + line(`M${x - w / 2} ${y - 36}H${x + w / 2}M${x - w / 4} ${y - 48}V${y - 24}M${x + w / 4} ${y - 48}V${y - 24}`, LINE.fine, C.woodDark) + wheel(x - w / 4, y - 15, 15) + wheel(x + w / 4, y - 15, 15);
/** A horse in profile facing right. `gait`: stand or gallop. */
export function horse(x, y, s = 1, { fill = C.woodLight, mane = C.woodDark, gait = 'stand', cloth = null } = {}) {
  const leg = (d) => line(d, 8, C.ink) + line(d, 5.2, fill);
  const legs = gait === 'gallop'
    ? [`M-34 -42L-54 -26L-66 -14`, `M-26 -42L-44 -22L-64 -4`, `M28 -42L48 -28L66 -26`, `M36 -42L58 -36L76 -38`]
    : [`M-34 -42L-37 -22L-36 -3`, `M-26 -42L-24 -22L-25 -3`, `M28 -42L26 -22L27 -3`, `M36 -42L38 -22L38 -3`];
  const body = path(`M-44 -58C-48 -76 -30 -82 -10 -80C10 -78 24 -80 36 -84C40 -96 50 -112 62 -118L64 -128L72 -118C84 -112 92 -102 94 -94C94 -90 90 -88 84 -90L72 -94C68 -82 58 -66 48 -54C40 -40 -28 -36 -40 -44C-44 -48 -44 -52 -44 -58Z`, fill, LINE.form / s);
  const hair = path(`M62 -118C52 -112 42 -96 36 -84L44 -82C50 -92 60 -102 68 -112Z`, mane, LINE.fine / s) + path(`M-44 -60C-58 -58 -62 -38 -58 -22C-52 -36 -48 -48 -40 -54Z`, mane, LINE.fine / s);
  const tack = line(`M72 -112L88 -96M44 -82L74 -102`, LINE.fine / s, C.ink);
  const blanket = cloth ? path(`M-18 -80C-6 -79 6 -79 18 -82L24 -48C10 -42 -8 -41 -22 -44Z`, cloth, LINE.fine / s) : '';
  return `<g transform="translate(${x} ${y}) scale(${s})">${legs.map(leg).join('')}${body}${hair}${tack}${blanket}</g>`;
}
/** A rider on a horse: the seated figure's legs hang over the horse's side. */
export const rider = (x, y, s, who, o = {}) => horse(x, y, s, o.horse ?? {}) + fig(x + 2 * s, y - 36 * s, s, who, { legL: [[-4, -56], [10, -36], [4, -12]], legR: [[6, -56], [18, -34], [12, -10]], pose: o.pose ?? 'give', ...o.fig });
export function ship(x, y, s = 1, { hull = C.wood, sail = C.ivory, flag = C.burgundy, furled = false } = {}) {
  const sw = LINE.form / s;
  const main = furled
    ? rect(-46, -116, 92, 7, sail, sw)
    : path(`M-46 -116C-30 -106 30 -106 46 -116C54 -90 54 -60 46 -38C24 -46 -24 -46 -46 -38C-54 -60 -54 -90 -46 -116Z`, sail, sw) + line(`M0 -110V-44M-44 -82Q0 -72 44 -82`, LINE.fine / s);
  return `<g transform="translate(${x} ${y}) scale(${s})">` + line(`M0 -30V-154`, 3 / s + 1) + line(`M56 -28V-92`, 2.6 / s + 1) + main + path(`M56 -92L78 -44L56 -44Z`, sail, sw) + path(`M0 -154L24 -148L0 -141Z`, flag, LINE.fine / s) +
    path(`M-92 -38L-78 -2C-40 6 50 6 80 -2L100 -44C70 -30 -30 -24 -66 -26L-68 -44L-94 -48Z`, hull, sw) + line(`M-80 -14C-40 -8 40 -8 88 -18`, LINE.fine / s, C.woodDark) + '</g>';
}
export function throne(x, y, s = 1) { return group(`translate(${x} ${y}) scale(${s})`, rect(-30, -150, 60, 110, C.burgundyDark, 2.2), poly([[-30, -150], [0, -176], [30, -150]], C.gold, 2.2), rect(-34, -62, 68, 12, C.gold, 2), rect(-34, -50, 8, 50, C.woodDark, 2), rect(26, -50, 8, 50, C.woodDark, 2), rect(-44, 0, 88, 8, C.stoneLight, 2)); }
export const dais = (x, y, w, h = 12, fill = C.stoneLight) => rect(x - w / 2, y - h, w, h, fill, LINE.form) + rect(x - w / 2 - 12, y, w + 24, 8, fill, LINE.form);
export const flame = (x, y, s = 1) => path(`M${x} ${y - 46 * s}C${x + 22 * s} ${y - 24 * s} ${x + 20 * s} ${y} ${x} ${y}C${x - 20 * s} ${y} ${x - 22 * s} ${y - 24 * s} ${x} ${y - 46 * s}Z`, C.terra, LINE.form) + path(`M${x} ${y - 28 * s}C${x + 11 * s} ${y - 14 * s} ${x + 9 * s} ${y} ${x} ${y}C${x - 9 * s} ${y} ${x - 11 * s} ${y - 14 * s} ${x} ${y - 28 * s}Z`, C.goldLight, LINE.fine);
export const bell = (x, y, s = 1, fill = C.gold) => path(`M${x - 22 * s} ${y}C${x - 12 * s} ${y - 10 * s} ${x - 14 * s} ${y - 40 * s} ${x} ${y - 42 * s}C${x + 14 * s} ${y - 40 * s} ${x + 12 * s} ${y - 10 * s} ${x + 22 * s} ${y}Z`, fill, LINE.form) + ell(x, y + 2, 4 * s, 4 * s, C.goldDark, LINE.fine);
export const shield = (x, y, s = 1, fill = C.burgundy, charge = C.gold) => path(`M${x - 28 * s} ${y - 62 * s}H${x + 28 * s}V${y - 26 * s}C${x + 28 * s} ${y - 10 * s} ${x + 12 * s} ${y - 2 * s} ${x} ${y}C${x - 12 * s} ${y - 2 * s} ${x - 28 * s} ${y - 10 * s} ${x - 28 * s} ${y - 26 * s}Z`, fill, LINE.heavy) + path(`M${x} ${y - 52 * s}L${x + 14 * s} ${y - 32 * s}L${x} ${y - 12 * s}L${x - 14 * s} ${y - 32 * s}Z`, charge, LINE.form);
export const pike = (x, y, h = 170) => line(`M${x} ${y}V${y - h}`, 3.4) + line(`M${x} ${y}V${y - h}`, 1.6, C.woodLight) + poly([[x - 5, y - h], [x, y - h - 20], [x + 5, y - h]], C.slateLight, LINE.fine);

export { arch, C, cypress, ell, foliage, group, H, line, LINE, masonry, path, person, poly, rect, rng, ticks, W };
