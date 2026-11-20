/** Houses of Influence: court politics, favours, offices and family (docs/ART_BIBLE.md). */
import { C, LINE, W, arcade, arch, banner, book, candle, chest, cloud, coins, column, cypress, dais, door, ell, fig, floorTiles, hills, house, lantern, line, masonry, night, paving, path, pennon, pike, poly, purse, rect, room, scroll, sheet, shield, sky, stool, table, tapestry, throne, tree, vaultedRoof, wall, window3 } from './scene.mjs';

/** Household Guard: a guard plants his halberd across the great door, a lantern above. */
function household_guard() {
  const halberd = line(`M60 4V-200`, 5) + line(`M60 4V-200`, 2.6, C.woodLight) + path(`M60 -196C80 -190 88 -170 82 -156L60 -164Z`, C.stoneLight, LINE.form) + poly([[60, -200], [54, -222], [66, -222]], C.stoneLight, LINE.fine);
  return rect(0, 0, W, 360, C.stone, 0) + masonry(0, 0, W, 300, 121, { rows: 10 }) + door(320, 300, 170, 240) + rect(0, 300, W, 60, C.stoneDark, LINE.form) + lantern(320, 40, 16) + fig(320, 352, 1.86, 'guard', { legs: 'brace', armR: [[13, -102], [34, -96], [56, -98]], armL: [[-13, -102], [-22, -82], [-16, -66]], behind: halberd }) + fig(110, 320, 1.0, 'page', { pose: 'hip' }) + fig(540, 318, 0.96, 'hooded', { dir: -1, pose: 'whisper' });
}

/** Antechamber: petitioners waiting on the long bench, the page at the closed door. */
function antechamber() {
  const bench = rect(40, 286, 400, 14, C.wood, LINE.form) + rect(50, 300, 10, 40, C.woodDark, LINE.fine) + rect(420, 300, 10, 40, C.woodDark, LINE.fine) + rect(40, 230, 400, 10, C.woodDark, LINE.form);
  return room(C.parchment, C.parchmentDark, 300, 131) + floorTiles(300) + tapestry(60, 30, 140, 170, C.sageDark, C.gold) + door(540, 300, 110, 210) + bench + fig(96, 346, 1.3, 'merchant', { legs: 'sit', pose: 'low' }) + fig(196, 346, 1.28, 'goodwife', { legs: 'sit', pose: 'both', tone: 1 }) + fig(296, 346, 1.32, 'burgher', { legs: 'sit', tilt: 8, pose: 'whisper', tone: 2 }) + fig(380, 346, 1.24, 'scholar', { legs: 'sit', inFront: book(30, -70, 40, 6) }) + fig(470, 346, 1.36, 'page', { dir: -1, pose: 'raise' });
}

/** Bribed Magistrate: on the bench he hears the case, and under it a purse finds his hand. */
function bribed_magistrate() {
  return room(C.stoneLight, C.wood, 280, 141) + tapestry(240, 0, 160, 140, C.burgundy, C.gold) + window3(90, 190, 60, 120) + window3(550, 190, 60, 120) + fig(320, 260, 1.36, 'clerk', { hat: 'black-cap', top: C.burgundyDark, gown: { fill: C.burgundyDark, fold: true, trim: C.gold }, collar: C.gold, armR: [[13, -102], [20, -80], [34, -40]], armL: [[-13, -102], [-30, -84], [-44, -96]] }) + rect(150, 214, 340, 146, C.woodDark, LINE.heavy) + rect(140, 206, 360, 12, C.wood, LINE.form) + rect(300, 280, 60, 80, C.slateDeep, LINE.form) + purse(354, 312, 0.9, C.gold) + fig(470, 360, 1.5, 'hooded', { dir: -1, tilt: 10, armR: [[13, -102], [40, -70], [96, -42]] }) + fig(110, 356, 1.4, 'poor', { pose: 'both', tone: 2 }) + book(240, 206, 60, 10);
}

/** Counter-Intrigue: the intercepted letter held to a candle, its seal still whole. */
function counter_intrigue() {
  return rect(0, 0, W, 360, C.slateDeep, 0) + window3(480, 220, 130, 180, C.slateDark) + ell(520, 80, 22, 22, C.ivory, LINE.form) + rect(0, 260, W, 100, C.woodDark, LINE.heavy) + rect(0, 252, W, 12, C.wood, LINE.form) + fig(250, 300, 1.66, 'lady', { top: C.burgundy, sleeve: C.burgundyLight, gown: { fill: C.burgundy, w: 28, trim: C.gold, fold: true }, armR: [[13, -102], [34, -110], [62, -118]], armL: [[-13, -102], [6, -104], [40, -116]], inFront: sheet(76, -112, 30, 36, true, 12) }) + candle(380, 252) + path(`M380 230C392 214 388 202 380 192`, 'none', LINE.form) + sheet(150, 254, 40, 14, false, -4) + fig(560, 300, 1.1, 'page', { dir: -1, pose: 'low', tone: 1 });
}

/** Whispered Promise: two courtiers in the clipped garden, one bent to the other's ear. */
function whispered_promise() {
  const hedge = rect(0, 220, W, 70, C.sageDark, LINE.heavy) + line(`M0 240H640`, LINE.fine, C.sageDeep);
  return sky() + cloud(80, 40) + hills(180, C.slateLight, 20, 141) + cypress(90, 230, 160) + cypress(560, 230, 170) + cypress(470, 230, 120) + hedge + rect(0, 290, W, 70, C.parchmentDark, LINE.form) + fig(278, 348, 1.68, 'noble', { tilt: 14, lean: 4, armR: [[13, -102], [30, -112], [44, -132]] }) + fig(380, 348, 1.66, 'lady', { dir: -1, pose: 'hip', tone: 1, armR: [[13, -102], [20, -82], [14, -66]] }) + fig(150, 300, 0.9, 'guard', { behind: pike(24, -2, 170) });
}

/** Signoria: the council seated in a row beneath the hangings, a petitioner standing before them. */
function signoria() {
  const seats = [130, 230, 330, 430, 530].map((x, i) => fig(x, 220, 1.02, ['burgher', 'merchant', 'noble', 'clerk', 'burgher'][i], { legs: 'sit', pose: i === 2 ? 'point' : i % 2 ? 'write' : 'stand', dir: x > 330 ? -1 : 1, tone: i % 3 })).join('');
  return room(C.parchment, C.parchmentDark, 230, 151) + [70, 230, 410].map((x, i) => tapestry(x, 10, 160, 120, i === 1 ? C.burgundy : C.slate, C.gold)).join('') + dais(330, 230, 520, 14, C.stoneLight) + seats + rect(70, 200, 520, 30, C.burgundy, LINE.form) + floorTiles(244) + fig(320, 356, 1.5, 'merchant', { dir: 1, armR: [[13, -102], [30, -112], [42, -132]], inFront: scroll(-30, -60, 36, 60) });
}

/** Hollow Title: a proud new lord holds up his deed before the house it grants him, half fallen in. */
function hollow_title() {
  const ruin = poly([[330, 280], [330, 130], [400, 90], [470, 130], [470, 160], [520, 150], [530, 280]], C.stoneLight, LINE.heavy) + masonry(334, 140, 190, 136, 161, { rows: 8 }) + rect(360, 170, 30, 40, C.slateDeep, LINE.form) + rect(440, 190, 30, 40, C.slateDeep, LINE.form) + path(`M330 130L360 100L380 120`, 'none', LINE.form, ) + line(`M470 160L500 110M480 150L520 120`, 3, C.woodDark);
  return sky(C.skyLow, C.sky) + cloud(150, 50) + hills(220, C.sageLight, 20, 162) + rect(0, 260, W, 100, C.sage, LINE.form) + ruin + ell(500, 300, 90, 16, C.slateLight, LINE.form) + tree(600, 280, 0.6, C.sageDark) + fig(190, 350, 1.72, 'noble', { legs: 'brace', armR: [[13, -102], [32, -122], [46, -148]], inFront: sheet(48, -150, 30, 40, true) }) + fig(68, 340, 1.1, 'farmer', { pose: 'hip', tone: 2 });
}

/** Purchased Office: the chain of office laid on the buyer's shoulders, the price stacked on the table. */
function purchased_office() {
  const chain = path(`M-22 -110C-14 -86 14 -86 22 -110`, 'none', 5) + path(`M-22 -110C-14 -86 14 -86 22 -110`, 'none', 2.6, C.gold) + ell(0, -84, 7, 7, C.gold, LINE.fine);
  return room(C.stoneLight, C.wood, 290, 171) + window3(320, 180, 80, 140) + pennon(60, 0, 80, 140, C.slate, C.gold) + pennon(500, 0, 80, 140, C.slate, C.gold) + table(320, 352, 280, C.woodLight, 56, C.burgundy) + coins(250, 296, 14, 6) + coins(290, 296, 14, 4) + chest(380, 296, 70, 30, true) + fig(200, 346, 1.62, 'merchant', { tilt: 6, armR: [[13, -102], [20, -82], [14, -66]], inFront: chain }) + fig(450, 346, 1.62, 'clerk', { dir: -1, armR: [[13, -102], [40, -112], [70, -118]], hat: 'black-cap', collar: C.gold });
}

/** Court Purge: a courtier marched out between guards, the others suddenly busy looking away. */
function court_purge() {
  return room(C.parchment, C.stone, 290, 181) + arch(320, 290, 220, 260, C.slateDeep, LINE.heavy) + line(`M210 290V120M430 290V120`, LINE.form) + floorTiles(290) + fig(320, 330, 1.42, 'noble', { dir: 1, tilt: -6, armR: [[13, -102], [20, -82], [24, -70]], armL: [[-13, -102], [-20, -82], [-24, -70]], hat: 'bare' }) + fig(250, 336, 1.48, 'guard', { armR: [[13, -102], [40, -96], [64, -96]], behind: pike(-24, -2, 180) }) + fig(392, 336, 1.48, 'guard', { dir: -1, top: C.burgundy, armR: [[13, -102], [40, -96], [64, -96]], behind: pike(-24, -2, 180) }) + fig(80, 352, 1.5, 'lady', { dir: -1, pose: 'whisper', tone: 1 }) + fig(568, 352, 1.5, 'burgher', { pose: 'hip', tone: 2 });
}

/** Family Crest: the house's arms carved over its door, garlands and helm, a page looking up. */
function family_crest() {
  const front = rect(110, 0, 420, 300, C.parchment, LINE.heavy) + masonry(114, 6, 412, 290, 191, { rows: 14 }) + arch(320, 300, 130, 170, C.woodDark, LINE.heavy) + rect(248, 108, 144, 14, C.stoneLight, LINE.form);
  const helm = path(`M296 30C296 6 344 6 344 30V44H296Z`, C.stoneLight, LINE.form) + line(`M300 30H340`, LINE.form) + path(`M320 6C336 -12 360 -6 372 4C350 2 336 6 320 10Z`, C.burgundy, LINE.fine);
  return sky() + cloud(560, 60) + front + helm + shield(320, 108, 1.2, C.burgundy, C.gold) + path(`M250 60C270 90 290 96 296 96M390 60C370 90 350 96 344 96`, 'none', 6) + path(`M250 60C270 90 290 96 296 96M390 60C370 90 350 96 344 96`, 'none', 3.6, C.sage) + window3(170, 200, 40, 70) + window3(470, 200, 40, 70) + paving(300, C.stone, 192) + fig(470, 352, 1.36, 'page', { dir: -1, pose: 'point', tone: 1 }) + fig(140, 348, 1.2, 'goodwife', { pose: 'hip' });
}

/** Marriage Pact: the two families meet at the chapel step, the couple's hands joined over the contract. */
function marriage_pact() {
  return room(C.ivory, C.stone, 280, 201) + vaultedRoof(C.stoneLight) + window3(320, 200, 70, 140, C.skyLow) + floorTiles(280) + table(320, 352, 140, C.woodLight, 50, C.ivory) + sheet(320, 300, 50, 18, true) + fig(270, 340, 1.6, 'noble', { armR: [[13, -102], [30, -96], [50, -98]] }) + fig(370, 340, 1.58, 'lady', { dir: -1, tone: 1, armR: [[13, -102], [30, -96], [50, -98]] }) + fig(130, 330, 1.3, 'burgher', { pose: 'hip', tone: 2 }) + fig(60, 324, 1.14, 'goodwife', {}) + fig(510, 330, 1.32, 'merchant', { dir: -1, pose: 'both', tone: 1 }) + fig(586, 324, 1.12, 'wife', { dir: -1 });
}

/** Majordomo: keys at his belt and staff raised, the steward sends the dishes out in order. */
function majordomo() {
  const keys = ell(14, -48, 8, 8, 'none', 2.4, C.goldDark) + line(`M14 -40V-24M10 -28H14M10 -24H14`, 2, C.goldDark);
  return room(C.parchment, C.woodLight, 290, 211) + tapestry(40, 20, 120, 170, C.burgundy, C.gold) + window3(560, 190, 54, 120) + fig(300, 348, 1.72, 'clerk', { top: C.burgundyDark, gown: { fill: C.burgundyDark, fold: true, trim: C.gold }, hat: 'black-cap', armR: [[13, -102], [30, -112], [46, -128]], inFront: line(`M46 -186V0`, 4) + line(`M46 -186V0`, 2, C.gold) + keys }) + fig(450, 340, 1.4, 'page', { dir: -1, pose: 'head', inFront: ell(0, -150, 30, 8, C.stoneLight, LINE.form) + path(`M-16 -152C-10 -170 10 -170 16 -152`, C.terra, LINE.fine) }) + fig(540, 336, 1.32, 'wife', { dir: -1, pose: 'both', tone: 1, inFront: ell(36, -78, 18, 14, C.goldLight, LINE.form) }) + fig(150, 340, 1.4, 'worker', { legs: 'walk', pose: 'head', tone: 2, inFront: rect(-26, -170, 52, 26, C.wood, LINE.form) });
}

/** Palace Intrigue: at night behind a column, two heads close together, while the watch walks by. */
function palace_intrigue() {
  return night() + window3(500, 200, 90, 150, C.slateDark) + ell(520, 120, 16, 16, C.ivory, LINE.form) + floorTiles(290, C.slateDark, C.slate) + column(150, 290, 290, 64, C.stone) + fig(230, 344, 1.66, 'hooded', { dir: -1, tilt: 12, armR: [[13, -102], [20, -110], [12, -122]] }) + fig(90, 344, 1.6, 'noble', { tilt: 10, top: C.slateDark, gown: { fill: C.slateDark, trim: C.gold, fold: true }, armR: [[13, -102], [28, -96], [36, -106]] }) + column(320, 290, 290, 36, C.stoneDark) + fig(450, 330, 1.2, 'guard', { dir: 1, legs: 'walk', inFront: lantern(40, -60, 10) });
}

export const HOUSES = {
  household_guard: ['Household Guard', household_guard], antechamber: ['Antechamber', antechamber], bribed_magistrate: ['Bribed Magistrate', bribed_magistrate], counter_intrigue: ['Counter-Intrigue', counter_intrigue],
  whispered_promise: ['Whispered Promise', whispered_promise], signoria: ['Signoria', signoria], hollow_title: ['Hollow Title', hollow_title], purchased_office: ['Purchased Office', purchased_office],
  court_purge: ['Court Purge', court_purge], family_crest: ['Family Crest', family_crest], marriage_pact: ['Marriage Pact', marriage_pact], majordomo: ['Majordomo', majordomo], palace_intrigue: ['Palace Intrigue', palace_intrigue],
};
