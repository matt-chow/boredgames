/** The Merchant Republics: banks, bills, warehouses and coin (docs/ART_BIBLE.md). */
import { C, LINE, W, arcade, arch, bale, balance, barrel, book, candle, cart, chest, cloud, coin, coins, column, cypress, desk, ell, fig, floorTiles, hills, house, line, masonry, path, paving, poly, purse, rect, room, roofline, sack, scroll, sheet, shelves, ship, sky, table, tapestry, ticks, water, window3 } from './scene.mjs';

/** Coin Clipper: by one candle, shears biting the rim of a coin, the shavings gathered in a dish. */
function coin_clipper() {
  const shears = `<g transform="translate(350 214) rotate(-18) scale(1.6)">` + line(`M0 0L64 -6M0 0L62 10`, 4.4) + line(`M0 0L64 -6M0 0L62 10`, 2.2, C.stoneLight) + ell(-12, -8, 9, 6, 'none', 3) + ell(-12, 8, 9, 6, 'none', 3) + '</g>';
  return rect(0, 0, W, 360, C.woodDark, 0) + shelves(430, 196, 170, 140, 31, 4, 'books') + fig(250, 356, 1.9, 'merchant', { hat: 'black-cap', top: C.slateDark, sleeve: C.slateDark, tilt: 12, armR: [[13, -102], [34, -70], [58, -56]], armL: [[-13, -102], [12, -72], [40, -60]] }) + rect(0, 250, W, 110, C.wood, LINE.heavy) + rect(0, 242, W, 12, C.woodLight, LINE.form) + candle(126, 244) + shears + coin(452, 214, 18, C.goldDark) + ell(486, 238, 40, 9, C.stone, LINE.form) + ticks([[468, 234, 474, 236], [484, 232, 490, 235], [496, 236, 502, 233]], 2, C.goldDark) + coins(196, 242, 13, 4, C.goldDark) + coins(560, 242, 12, 2, C.goldDark);
}

/** Promissory Note: across a table in the loggia, a sealed note passes from one hand to another. */
function promissory_note() {
  return sky() + hills(210, C.slateLight, 24, 4) + arcade(0, 268, 4, 160, 200, C.stoneLight, C.sky) + rect(0, 268, W, 92, C.parchmentDark, LINE.form) + floorTiles(268) + fig(196, 344, 1.62, 'merchant', { top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark, armR: [[13, -102], [36, -96], [62, -94]], inFront: sheet(78, -84, 30, 38, true, -4) }) + fig(450, 344, 1.6, 'burgher', { dir: -1, hat: 'beret', armR: [[13, -102], [36, -96], [58, -92]], armL: [[-13, -102], [-22, -84], [-14, -66]] }) + table(320, 352, 200, C.woodLight, 66, C.slate) + book(280, 282, 50, 8) + coins(370, 284, 11, 3);
}

/** Florin Table: the banker's bench in the open square, cloth spread, coin counted out on it. */
function florin_table() {
  return sky() + cloud(470, 40) + roofline(170, 22, { h: 70 }) + paving(240, C.stone, 33) + rect(0, 170, W, 70, C.parchment, LINE.form) + arcade(80, 240, 3, 160, 60, C.stoneLight, C.slateDark) + fig(320, 300, 1.32, 'clerk', { hat: 'black-cap', armR: [[13, -102], [30, -82], [48, -78]], armL: [[-13, -102], [-30, -82], [-46, -78]] }) + table(320, 352, 360, C.wood, 70, C.sageDark) + coins(240, 280, 13, 5) + coins(282, 280, 13, 3) + coins(400, 280, 13, 4) + balance(352, 282, 0.7, 4) + fig(104, 350, 1.5, 'wife', { armR: [[13, -102], [34, -96], [56, -86]], tone: 1, inFront: coin(58, -86, 6) }) + fig(560, 350, 1.44, 'farmer', { dir: -1, pose: 'hip', tone: 2, inFront: purse(-26, -50, 0.7) });
}

/** Fondaco: the foreign merchants' courtyard, bales swung up on a hoist to the gallery. */
function fondaco() {
  const hoist = line(`M320 20V44M320 44L320 150`, LINE.form) + ell(320, 34, 10, 10, C.woodLight, LINE.form) + bale(320, 186, 64, 36, C.burgundyLight) + line(`M296 150L320 140L344 150`, LINE.fine);
  return rect(0, 0, W, 360, C.parchment, 0) + rect(0, 0, W, 24, C.terra, LINE.form) + arcade(0, 132, 5, 128, 90, C.parchment, C.slateDark) + rect(0, 132, W, 14, C.stoneLight, LINE.form) + arcade(0, 300, 5, 128, 130, C.parchmentDark, C.slateDeep) + hoist + paving(300, C.stone, 41) + fig(196, 348, 1.48, 'worker', { legs: 'brace', armR: [[13, -102], [28, -126], [30, -150]], armL: [[-13, -102], [8, -126], [16, -150]], inFront: line(`M24 -152L80 -240`, LINE.form) }) + sack(420, 346, 1.2) + bale(500, 346, 76, 44, C.slate) + barrel(570, 346, 1.2) + fig(90, 344, 1.3, 'merchant', { pose: 'write', inFront: book(36, -78, 44, 6) });
}

/** Underwriter: at the counting-house window, the clerk's pen stops while a ship comes in below. */
function underwriter() {
  const view = rect(300, 40, 300, 210, C.sky, LINE.heavy) + rect(302, 170, 296, 78, C.slateLight, 0) + line(`M320 200q14 -4 28 0M380 226q14 -4 28 0M540 214q14 -4 28 0M500 236q14 -4 28 0`, LINE.fine, C.slate) + ship(470, 196, 0.62) + cloud(330, 80, 70);
  return rect(0, 0, W, 360, C.woodLight, 0) + masonry(0, 0, W, 300, 51, { rows: 9, ink: C.wood }) + view + line(`M450 40V250M300 145H600`, 5, C.woodDark) + rect(290, 248, 320, 14, C.wood, LINE.form) + fig(150, 352, 1.7, 'clerk', { dir: 1, tilt: -8, armR: [[13, -102], [30, -84], [52, -80]], armL: [[-13, -102], [8, -84], [30, -80]], inFront: line(`M52 -80L66 -100`, 2.4) }) + table(170, 362, 300, C.wood, 70) + book(186, 290, 110, 14) + scroll(110, 300, 50, 10) + candle(282, 264, false);
}

/** Lending House: pledges on the shelves, a silver cup set on the counter, the lender weighing it. */
function lending_house() {
  const cup = path(`M370 236C364 220 366 204 372 196H404C410 204 412 220 406 236Z`, C.stoneLight, LINE.form) + rect(380, 236, 16, 14, C.stoneLight, LINE.fine) + ell(388, 252, 18, 5, C.stoneLight, LINE.fine);
  return rect(0, 0, W, 360, C.stone, 0) + shelves(20, 200, 600, 180, 61, 3, 'rolls') + fig(180, 300, 1.5, 'merchant', { hat: 'black-cap', top: C.burgundyDark, sleeve: C.burgundyDark, armR: [[13, -102], [32, -80], [60, -72]] }) + rect(0, 252, W, 108, C.wood, LINE.heavy) + rect(0, 244, W, 12, C.woodLight, LINE.form) + balance(250, 246, 0.8, 6) + cup + fig(500, 360, 1.66, 'lady', { dir: -1, tone: 1, armR: [[13, -102], [40, -96], [70, -104]] }) + coins(120, 244, 12, 3);
}

/** Wholesaler: casks rolled out of the warehouse to a cart, the dealer notching his tally stick. */
function wholesaler() {
  const store = rect(20, 30, 380, 280, C.parchmentDark, LINE.heavy) + poly([[0, 30], [210, -20], [420, 30]], C.terraDark, LINE.heavy) + arch(210, 310, 190, 210, C.slateDeep, LINE.heavy) + rect(70, 60, 50, 40, C.slateDark, LINE.form) + rect(300, 60, 50, 40, C.slateDark, LINE.form) + barrel(170, 304, 1) + barrel(214, 304, 1) + barrel(192, 260, 1);
  const load = barrel(450, 290, 0.9) + barrel(492, 290, 0.9) + barrel(534, 290, 0.9) + barrel(472, 250, 0.9);
  return sky() + cloud(470, 60) + store + paving(310, C.stone, 5) + cart(494, 344, 170, load) + fig(330, 350, 1.6, 'merchant', { dir: -1, armR: [[13, -102], [30, -94], [44, -100]], armL: [[-13, -102], [-24, -96], [-36, -106]], inFront: line(`M38 -96L-30 -112`, 5, C.woodLight) + ticks([[20, -104, 22, -96], [8, -106, 10, -98], [-4, -108, -2, -100]], 1.6) }) + barrel(110, 352, 1.3) + fig(30, 346, 1.2, 'worker', { pose: 'low', tone: 2 });
}

/** Bookkeeper: the counting cloth chequered for reckoning, counters pushed square by square, the ledger beside. */
function bookkeeper() {
  const board = rect(160, 254, 320, 70, C.sageDark, LINE.heavy) + line(`M160 277H480M160 300H480M240 254V324M320 254V324M400 254V324`, LINE.fine, C.sageDeep) + [[188, 270], [204, 270], [262, 292], [278, 292], [294, 292], [356, 314], [438, 270], [454, 292]].map(([x, y]) => ell(x, y, 7, 4, C.gold, LINE.fine)).join('');
  return room(C.parchment, C.wood, 250, 71) + window3(320, 150, 90, 120) + tapestry(40, 20, 90, 160, C.slate, C.gold) + tapestry(510, 20, 90, 160, C.slate, C.gold) + fig(320, 254, 1.2, 'clerk', { hat: 'black-cap', armR: [[13, -102], [30, -80], [48, -72]], armL: [[-13, -102], [-30, -80], [-48, -72]] }) + table(320, 352, 420, C.woodLight, 30) + board + book(560, 320, 90, 14) + fig(80, 352, 1.36, 'merchant', { pose: 'point', hat: 'beret' });
}

/** Partnership: one strongbox, two keys turned at once by two merchants who don't quite trust each other. */
function partnership() {
  return room(C.stoneLight, C.parchmentDark, 270, 81) + rect(0, 270, W, 90, C.parchmentDark, LINE.form) + floorTiles(270) + window3(140, 200, 70, 130) + window3(500, 200, 70, 130) + chest(320, 330, 170, 92, false, C.wood, C.goldDark) + ell(290, 290, 7, 7, C.goldDark, LINE.fine) + ell(350, 290, 7, 7, C.goldDark, LINE.fine) + fig(196, 344, 1.64, 'merchant', { top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark, armR: [[13, -102], [40, -82], [88, -66]], inFront: line(`M88 -66L96 -68`, 4, C.gold) }) + fig(444, 344, 1.64, 'merchant', { dir: -1, top: C.sageDark, sleeve: C.sageDeep, skirt: C.sageDark, hat: 'black-cap', tone: 2, armR: [[13, -102], [40, -82], [88, -66]], inFront: line(`M88 -66L96 -68`, 4, C.gold) });
}

/** Gilder: gold leaf laid on a carved frame, the book of leaf open, a cup waiting its turn. */
function gilder() {
  const frame = rect(360, 70, 220, 180, C.gold, LINE.heavy) + rect(386, 96, 168, 128, C.woodDark, LINE.form) + rect(386, 96, 84, 128, C.goldLight, 0) + line(`M470 96V224`, LINE.fine, C.goldDark) + path(`M360 70L340 50L380 60ZM580 70L600 50L560 60ZM360 250L340 270L380 260ZM580 250L600 270L560 260Z`, C.goldDark, LINE.fine);
  return room(C.parchmentDark, C.woodLight, 290, 91) + frame + line(`M350 290L380 250M590 290L560 250`, 6) + fig(220, 346, 1.62, 'scholar', { top: C.terraDark, sleeve: C.terra, gown: null, skirt: C.terraDark, hose: C.woodDark, armR: [[13, -102], [44, -112], [86, -120]], inFront: line(`M86 -120L118 -130`, 3, C.woodLight) + rect(116, -138, 12, 12, C.goldLight, LINE.fine) }) + table(120, 352, 170, C.wood, 52) + book(96, 296, 60, 10, C.goldLight) + path(`M150 300C146 288 148 276 152 270H176C180 276 182 288 178 300Z`, C.goldLight, LINE.form);
}

/** Ledger Hall: the counting house's front, rusticated below and grand above, a clerk on the steps. */
function ledger_hall() {
  const hall = rect(70, 50, 500, 250, C.ivory, LINE.heavy) + rect(70, 200, 500, 100, C.stone, LINE.form) + masonry(72, 204, 496, 94, 101, { rows: 5, gaps: 0.1 }) + [140, 230, 410, 500].map((x) => window3(x, 168, 44, 80)).join('') + poly([[230, 50], [320, 10], [410, 50]], C.parchment, LINE.form) + rect(56, 42, 528, 12, C.stoneLight, LINE.form) + arch(320, 300, 100, 140, C.slateDeep, LINE.heavy) + poly([[40, 42], [600, 42], [570, 54], [70, 54]], C.terra, LINE.form);
  return sky() + cloud(560, 30, 90) + cypress(30, 300, 140) + cypress(610, 300, 140) + hall + rect(220, 300, 200, 12, C.stoneLight, LINE.form) + paving(312, C.stone, 102) + fig(328, 352, 1.12, 'clerk', { legs: 'walk', inFront: book(30, -76, 40, 6) }) + fig(140, 350, 0.96, 'merchant', { dir: -1, pose: 'whisper' });
}

/** Compound Interest: stacks of coin climbing step by step along a sill, the hourglass running beside them. */
function compound_interest() {
  const glass = path(`M520 120H580L556 180L580 240H520L544 180Z`, C.skyLow, LINE.heavy) + path(`M532 132H568L550 172ZM530 236L550 206L570 236Z`, C.goldLight, LINE.fine) + rect(512, 110, 76, 12, C.woodDark, LINE.form) + rect(512, 240, 76, 12, C.woodDark, LINE.form);
  return rect(0, 0, W, 360, C.slateDark, 0) + window3(320, 220, 260, 210, C.sky) + rect(0, 250, W, 110, C.wood, LINE.heavy) + rect(0, 242, W, 12, C.woodLight, LINE.form) + [1, 2, 3, 5, 8].map((n, i) => coins(110 + i * 76, 248, 20, n * 2)).join('') + glass + book(150, 320, 110, 14);
}

/** Bourse: an open court of merchants trading on their feet, notes waved, a messenger running in. */
function bourse() {
  return sky() + arcade(0, 220, 5, 128, 120, C.stoneLight, C.slateDark) + paving(220, C.stone, 111) + fig(110, 300, 1.08, 'merchant', { pose: 'raise', inFront: sheet(30, -150, 18, 22, false) }) + fig(210, 304, 1.1, 'burgher', { dir: -1, pose: 'whisper' }) + fig(430, 300, 1.04, 'clerk', { pose: 'write', inFront: book(36, -76, 40, 6) }) + fig(530, 304, 1.1, 'merchant', { dir: -1, pose: 'point', top: C.terra, sleeve: C.terraDark, skirt: C.terraDark }) + fig(330, 352, 1.66, 'merchant', { top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark, hat: 'black-cap', armR: [[13, -102], [30, -118], [42, -146]], armL: [[-13, -102], [-28, -110], [-42, -134]], inFront: sheet(42, -150, 26, 32, true) + sheet(-42, -138, 26, 32, false, -8) }) + fig(590, 350, 1.3, 'page', { dir: -1, legs: 'run', inFront: scroll(30, -100, 28) });
}

/** Gold Florin: one heavy coin on dark velvet, a rosette struck on its face. */
function gold_florin() {
  const rosette = Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return ell(320 + Math.cos(a) * 34, 176 + Math.sin(a) * 34, 22, 14, C.goldLight, LINE.form, C.goldDark, (i * 60)); }).join('');
  return rect(0, 0, W, 360, C.burgundyDark, 0) + path(`M0 250C140 230 240 300 400 280C500 268 580 230 640 240V360H0Z`, C.burgundy, LINE.form) + ell(330, 196, 128, 128, C.goldDark, LINE.heavy) + ell(320, 180, 128, 128, C.gold, LINE.heavy) + ell(320, 180, 108, 108, 'none', LINE.form, C.goldDark) + rosette + ell(320, 176, 16, 16, C.gold, LINE.form) + coin(130, 300, 22) + coin(520, 314, 18);
}

export const REPUBLICS = {
  coin_clipper: ['Coin Clipper', coin_clipper], promissory_note: ['Promissory Note', promissory_note], florin_table: ['Florin Table', florin_table], fondaco: ['Fondaco', fondaco],
  underwriter: ['Underwriter', underwriter], lending_house: ['Lending House', lending_house], wholesaler: ['Wholesaler', wholesaler], bookkeeper: ['Bookkeeper', bookkeeper],
  partnership: ['Partnership', partnership], gilder: ['Gilder', gilder], ledger_hall: ['Ledger Hall', ledger_hall], compound_interest: ['Compound Interest', compound_interest],
  bourse: ['Bourse', bourse], gold_florin: ['Gold Florin', gold_florin],
};
