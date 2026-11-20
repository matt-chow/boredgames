/** Ports & Provinces: quays, river traffic, warehouses and the country behind them (docs/ART_BIBLE.md). */
import { C, LINE, W, arch, bale, barrel, battlement, book, chest, cloud, coins, cypress, door, ell, fig, ground, group, hills, house, lantern, line, masonry, oars, path, paving, pennon, pike, poly, purse, rect, roofline, sack, scroll, sheaf, sheet, shelves, ship, sky, stall, ticks, tower, tree, wall, water, window3 } from './scene.mjs';

const quay = (y, seed) => rect(0, y, W, 360 - y, C.stone, LINE.heavy) + masonry(2, y + 6, W - 4, 360 - y - 8, seed, { rows: 4 });
const boat = (x, y, s = 1, fill = C.wood) => group(`translate(${x} ${y}) scale(${s})`, path(`M-70 -20C-50 6 50 6 70 -20Z`, fill, LINE.form / s), line(`M-60 -14C-30 -4 30 -4 60 -14`, LINE.fine / s, C.woodDark));

/** Harbour Pilot: a little boat ahead of the big ship, the pilot standing to wave her through the channel. */
function harbour_pilot() {
  return sky() + cloud(500, 40) + hills(170, C.slateLight, 24, 351) + tower(80, 220, 60, 150, { roof: C.terra }) + lantern(80, 60, 12) + water(210, C.slateLight, 352) + ship(420, 250, 1.2) + boat(220, 300, 1.2) + fig(230, 284, 1.02, 'worker', { pose: 'point', legs: 'brace', tone: 1 }) + fig(190, 290, 0.86, 'farmer', { legs: 'sit', pose: 'pull', hat: 'cap' }) + line(`M150 296L120 330M260 296L300 330`, 3, C.woodDark);
}

/** Dockhand: down the gangplank under a sack, the next one already shouldered behind him. */
function dockhand() {
  const plank = poly([[200, 300], [420, 196], [440, 206], [220, 312]], C.woodLight, LINE.form) + ticks([0, 1, 2, 3, 4, 5].map((i) => [230 + i * 34, 290 - i * 16, 238 + i * 34, 300 - i * 16]), 2, C.woodDark);
  return sky() + water(220, C.slateLight, 361) + ship(500, 250, 1.5, { furled: true }) + quay(300, 362) + plank + fig(300, 270, 1.3, 'worker', { legs: 'walk', pose: 'head', tone: 2, inFront: sack(0, -128, 0.8) }) + fig(410, 214, 1.1, 'farmer', { legs: 'walk', pose: 'head', inFront: sack(0, -128, 0.76) }) + sack(90, 312, 1.1) + sack(130, 312, 1) + barrel(60, 340, 1.2) + fig(150, 356, 1.3, 'clerk', { dir: -1, pose: 'write', inFront: book(34, -76, 40, 6) });
}

/** Barter Post: at the river post, a bale handed one way and a cask the other, no coin in sight. */
function barter_post() {
  const post = rect(312, 120, 16, 220, C.wood, LINE.heavy) + rect(290, 120, 60, 14, C.woodDark, LINE.form) + pennon(330, 134, 30, 40, C.terra, C.goldLight);
  return sky() + cloud(100, 40) + hills(170, C.sageLight, 30, 371) + water(220, C.slateLight, 372) + path(`M0 290C200 270 440 290 640 280V360H0Z`, C.parchmentDark, LINE.form) + post + boat(540, 260, 1.1) + fig(220, 346, 1.6, 'farmer', { tone: 2, armR: [[13, -102], [36, -96], [64, -94]], armL: [[-13, -102], [10, -90], [40, -86]], inFront: bale(60, -66, 56, 32, C.burgundyLight) }) + fig(430, 346, 1.6, 'merchant', { dir: -1, top: C.terra, sleeve: C.terraDark, skirt: C.terraDark, armR: [[13, -102], [36, -96], [64, -94]], armL: [[-13, -102], [10, -90], [40, -86]], inFront: barrel(56, -56, 0.8) });
}

/** Quayside Sale: the stall right on the quay, fish and baskets set out, the ships moored behind. */
function quayside_sale() {
  const fish = [[230, 250], [262, 256], [296, 248], [330, 254]].map(([x, y]) => path(`M${x - 16} ${y}C${x - 6} ${y - 8} ${x + 8} ${y - 8} ${x + 14} ${y}C${x + 8} ${y + 8} ${x - 6} ${y + 8} ${x - 16} ${y}L${x - 24} ${y - 6}V${y + 6}Z`, C.slateLight, LINE.fine)).join('');
  return sky() + water(170, C.slateLight, 381) + ship(120, 200, 0.8, { furled: true }) + ship(520, 196, 0.7) + quay(220, 382) + stall(170, 300, 260, 140, C.slate, C.ivory, 7) + fish + barrel(470, 300, 1) + fig(290, 300, 1.1, 'wife', { tone: 1, pose: 'both' }) + fig(90, 352, 1.5, 'goodwife', { pose: 'point', inFront: ell(-30, -60, 18, 12, C.goldDark, LINE.form) }) + fig(560, 352, 1.46, 'smith', { dir: -1, pose: 'hip', tone: 2 });
}

/** Ferry Landing: the flat ferry hauled across along its rope, a horse and three passengers aboard. */
function ferry_landing() {
  const raft = rect(180, 262, 280, 22, C.wood, LINE.heavy) + line(`M190 274H450`, LINE.fine, C.woodDark);
  return sky() + cloud(500, 50) + hills(160, C.slateLight, 30, 391) + path(`M0 200C160 190 300 200 640 190V220H0Z`, C.sage, LINE.form) + water(220, C.slateLight, 392) + line(`M0 230L640 220`, 2.4, C.woodDark) + raft + fig(220, 266, 1.0, 'worker', { legs: 'brace', armR: [[13, -102], [34, -110], [56, -112]], armL: [[-13, -102], [14, -106], [40, -110]] }) + group('translate(330 266) scale(0.7)', '') + fig(300, 264, 0.96, 'goodwife', { tone: 1 }) + fig(420, 264, 0.98, 'merchant', { dir: -1, pose: 'hip' }) + path(`M0 300C180 296 360 320 640 300V360H0Z`, C.parchmentDark, LINE.form) + rect(520, 270, 120, 30, C.woodLight, LINE.form) + fig(580, 344, 1.3, 'farmer', { dir: -1, pose: 'pull', tone: 2 });
}

/** Chandler: the ship's shop, rope coiled to the ceiling, lanterns hung, a sailor reckoning what he needs. */
function chandler() {
  const coils = [[80, 120], [150, 120], [80, 190], [150, 190]].map(([x, y]) => ell(x, y, 30, 24, C.goldLight, LINE.form) + ell(x, y, 18, 14, 'none', LINE.fine, C.goldDark) + ell(x, y, 8, 6, C.woodDark, LINE.fine)).join('');
  return rect(0, 0, W, 360, C.woodLight, 0) + rect(0, 0, W, 20, C.woodDark, LINE.form) + coils + [280, 340, 400].map((x) => lantern(x, 60, 12)).join('') + shelves(450, 230, 170, 160, 401, 4, 'rolls') + rect(0, 260, W, 100, C.wood, LINE.heavy) + rect(0, 252, W, 12, C.woodDark, LINE.form) + fig(330, 254, 1.16, 'merchant', { hat: 'black-cap', pose: 'write' }) + barrel(560, 360, 1.4) + fig(170, 360, 1.66, 'worker', { top: C.slate, sleeve: C.slateDark, hat: 'cap', armR: [[13, -102], [32, -112], [44, -134]], tone: 2 }) + ell(260, 248, 30, 8, C.goldLight, LINE.form);
}

/** Bonded Store: the warehouse door under the customs seal, its key on the officer's belt. */
function bonded_store() {
  const store = rect(110, 20, 420, 300, C.stone, LINE.heavy) + masonry(114, 26, 412, 290, 411, { rows: 14 }) + arch(320, 320, 180, 220, C.woodDark, LINE.heavy) + line(`M240 140H400M240 200H400M240 260H400M290 100V320M350 100V320`, 5, C.ink) + line(`M240 140H400M240 200H400M240 260H400M290 100V320M350 100V320`, 2.4, C.stoneDark) + ell(320, 230, 18, 18, C.burgundy, LINE.form) + line(`M320 248V270`, 2, C.burgundy) + rect(150, 50, 50, 40, C.slateDeep, LINE.form) + rect(440, 50, 50, 40, C.slateDeep, LINE.form);
  return sky() + store + paving(320, C.stone, 412) + barrel(70, 340, 1.3) + bale(590, 340, 70, 40, C.slate) + fig(470, 352, 1.5, 'guard', { dir: -1, pose: 'hip', inFront: ell(-4, -56, 8, 8, 'none', 2.4, C.goldDark) + line(`M-4 -48V-30M-8 -34H-4`, 2, C.goldDark) }) + fig(170, 352, 1.4, 'merchant', { pose: 'point' });
}

/** Trade Agreement: two captains shake hands on the pier between their ships, their clerks writing it down. */
function trade_agreement() {
  return sky() + cloud(300, 40) + water(200, C.slateLight, 421) + ship(110, 240, 1.0, { flag: C.slate }) + ship(530, 240, 1.0, { flag: C.burgundy }) + rect(180, 280, 280, 80, C.woodLight, LINE.heavy) + ticks([0, 1, 2, 3, 4, 5, 6].map((i) => [200 + i * 40, 280, 200 + i * 40, 360]), LINE.fine, C.woodDark) + fig(270, 346, 1.6, 'merchant', { top: C.slate, sleeve: C.slateDark, skirt: C.slateDark, hat: 'cap', armR: [[13, -102], [36, -86], [56, -84]] }) + fig(370, 346, 1.6, 'merchant', { dir: -1, top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark, hat: 'feather', tone: 2, armR: [[13, -102], [36, -86], [56, -84]] }) + fig(200, 320, 1.0, 'clerk', { pose: 'write', inFront: book(30, -76, 36, 6) }) + fig(450, 320, 1.0, 'page', { dir: -1, tone: 1, inFront: scroll(30, -80, 28) });
}

/** Cargo Manifest: crates swung ashore and called out, the clerk ticking each down a long sheet. */
function cargo_manifest() {
  const crane = line(`M520 300V40L380 70`, 6) + line(`M520 300V40L380 70`, 3, C.woodLight) + line(`M390 68V140`, LINE.form) + rect(360, 140, 60, 44, C.wood, LINE.form) + line(`M360 162H420M390 140V184`, LINE.fine, C.woodDark);
  const longSheet = rect(-30, -92, 24, 64, C.ivory, LINE.form) + line(`M-26 -84H-10M-26 -76H-10M-26 -68H-12M-26 -60H-10M-26 -52H-14`, LINE.fine, C.stoneDark);
  return sky() + water(180, C.slateLight, 431) + ship(200, 220, 1.0, { furled: true }) + quay(250, 432) + crane + rect(440, 250, 70, 50, C.wood, LINE.form) + rect(470, 230, 60, 40, C.woodLight, LINE.form) + fig(220, 352, 1.66, 'clerk', { armR: [[13, -102], [10, -84], [-4, -76]], armL: [[-13, -102], [-20, -84], [-14, -70]], inFront: longSheet }) + fig(400, 352, 1.4, 'worker', { dir: -1, pose: 'point', tone: 2 }) + fig(80, 340, 1.1, 'farmer', { pose: 'head', inFront: rect(-22, -158, 44, 30, C.wood, LINE.form) });
}

/** Grain Hoy: a low river barge riding deep with sacks, one square sail, the mill on the bank. */
function grain_hoy() {
  const hull = path(`M140 270C160 310 470 310 500 270L520 250H120Z`, C.wood, LINE.heavy) + line(`M150 272H500`, LINE.fine, C.woodDark);
  const load = [180, 230, 280, 360, 410, 460].map((x, i) => sack(x, 252 - (i % 2) * 6, 0.9)).join('');
  const sail = line(`M320 250V60`, 5) + path(`M250 74H390L400 220H240Z`, C.ivory, LINE.heavy) + line(`M320 74V220`, LINE.fine);
  const mill = rect(40, 120, 90, 90, C.parchment, LINE.heavy) + poly([[30, 120], [85, 80], [140, 120]], C.terra, LINE.form) + ticks([[85, 140, 40, 70], [85, 140, 150, 80], [85, 140, 130, 200], [85, 140, 30, 190]], 4, C.woodDark);
  return sky() + cloud(480, 50) + hills(170, C.sageLight, 30, 441) + ground(200, C.goldLight) + sheaf(200, 210, 0.6) + sheaf(560, 206, 0.6) + mill + water(230, C.slateLight, 442) + sail + hull + load + fig(500, 260, 1.0, 'farmer', { dir: -1, pose: 'pull', inFront: line(`M40 -70L80 20`, 4, C.woodDark) });
}

/** Hiring Day: in the square at dawn, men lined up with their tools, the foreman pointing at the next. */
function hiring_day() {
  const line_ = [180, 260, 340, 420, 500].map((x, i) => fig(x, 316, 1.12, ['worker', 'smith', 'farmer', 'worker', 'smith'][i], { tone: i % 3, hat: ['cap', 'bare', 'cap', 'bare', 'cap'][i], pose: ['stand', 'hip', 'low', 'stand', 'hip'][i], dir: -1, inFront: i % 2 ? line(`M18 -120V0`, 3, C.woodDark) : '' })).join('');
  return sky(C.parchment, C.goldLight) + roofline(170, 451, { h: 64 }) + rect(0, 170, W, 60, C.parchment, LINE.form) + paving(230, C.stone, 452) + line_ + fig(90, 352, 1.66, 'merchant', { top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark, pose: 'point', inFront: purse(-20, -56, 0.6) }) + fig(590, 352, 1.4, 'clerk', { dir: -1, pose: 'write', inFront: book(30, -76, 40, 6) });
}

/** Customs Cutter: the low fast boat alongside the merchantman, oars up, the officer climbing aboard. */
function customs_cutter() {
  const cutter = path(`M60 280C80 320 300 320 340 280L360 260H50Z`, C.slate, LINE.heavy) + oars(110, 284, 8, 26, 50, 0.4) + pennon(330, 200, 24, 30, C.burgundy, C.gold) + line(`M330 260V200`, 3);
  return sky() + cloud(140, 40) + water(220, C.slateLight, 461) + ship(470, 300, 1.6, { flag: C.slate }) + cutter + fig(150, 272, 0.98, 'guard', { pose: 'point' }) + fig(230, 272, 0.98, 'guard', { top: C.burgundy, behind: pike(20, -2, 150) }) + fig(370, 232, 1.0, 'guard', { armR: [[13, -102], [24, -122], [30, -140]], armL: [[-13, -102], [-6, -122], [0, -140]] }) + line(`M380 90L392 230M392 90L404 230`, LINE.fine);
}

/** Landing Rights: under the harbour castle, the herald reads the grant aloud as the captain steps ashore. */
function landing_rights() {
  return sky() + cloud(500, 40) + tower(560, 220, 80, 200, { roof: C.slateDark }) + wall(380, 220, 150, 120, C.stone, 471) + pennon(540, 0, 40, 50, C.burgundy, C.gold) + water(220, C.slateLight, 472) + ship(160, 260, 1.1, { furled: true }) + quay(280, 473) + fig(420, 344, 1.6, 'herald', { dir: -1, armR: [[13, -102], [32, -114], [50, -126]], armL: [[-13, -102], [6, -114], [30, -130]], inFront: sheet(50, -126, 40, 50, true) }) + fig(290, 350, 1.56, 'merchant', { legs: 'walk', top: C.slate, sleeve: C.slateDark, skirt: C.slateDark, hat: 'feather', pose: 'both' }) + fig(560, 346, 1.2, 'guard', { dir: -1, behind: pike(24, -2, 170) });
}

/** Galleass: the big oared ship heavy in the sea, sails set and both banks of oars pulling. */
function galleass() {
  const hull = path(`M40 220C70 290 530 290 600 220L620 196H20Z`, C.woodDark, LINE.heavy) + rect(120, 196, 400, 18, C.burgundy, LINE.form) + rect(60, 170, 80, 28, C.wood, LINE.form) + rect(500, 170, 90, 28, C.wood, LINE.form);
  const masts = [220, 360, 480].map((x, i) => line(`M${x} 196V${40 + i * 20}`, 5) + path(`M${x - 50} ${60 + i * 20}H${x + 50}L${x + 60} ${160}H${x - 60}Z`, C.ivory, LINE.form) + path(`M${x} ${40 + i * 20}l24 6l-24 6Z`, C.burgundy, LINE.fine)).join('');
  return sky() + cloud(70, 60) + cloud(540, 40) + water(230, C.slateLight, 481) + masts + hull + oars(150, 240, 15, 26, 70, 0.45) + pennon(560, 120, 24, 36, C.gold, C.burgundy) + line(`M572 120V170`, 3);
}

export const PORTS = {
  harbour_pilot: ['Harbour Pilot', harbour_pilot], dockhand: ['Dockhand', dockhand], barter_post: ['Barter Post', barter_post], quayside_sale: ['Quayside Sale', quayside_sale], ferry_landing: ['Ferry Landing', ferry_landing],
  chandler: ['Chandler', chandler], bonded_store: ['Bonded Store', bonded_store], trade_agreement: ['Trade Agreement', trade_agreement], cargo_manifest: ['Cargo Manifest', cargo_manifest], grain_hoy: ['Grain Hoy', grain_hoy],
  hiring_day: ['Hiring Day', hiring_day], customs_cutter: ['Customs Cutter', customs_cutter], landing_rights: ['Landing Rights', landing_rights], galleass: ['Galleass', galleass],
};
