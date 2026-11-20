/** Masters & Apprentices: workshops, teaching and the work itself (docs/ART_BIBLE.md). */
import { C, LINE, W, arch, banner, book, candle, chest, cloud, column, cypress, desk, door, ell, fig, floorTiles, group, hills, house, line, masonry, path, paving, pennon, poly, purse, rect, room, roofline, scroll, sheet, shelves, sky, stool, table, tapestry, ticks, tree, vaultedRoof, window3 } from './scene.mjs';

/** A panel painting on the wall or an easel: a simple landscape, so no figure inside it needs drawing. */
const panel = (x, y, w, h, frame = C.goldDark) => rect(x, y, w, h, frame, LINE.form) + rect(x + 6, y + 6, w - 12, h - 12, C.sky, LINE.fine) + path(`M${x + 6} ${y + h * 0.62}C${x + w * 0.3} ${y + h * 0.5} ${x + w * 0.6} ${y + h * 0.7} ${x + w - 6} ${y + h * 0.56}V${y + h - 6}H${x + 6}Z`, C.sage, LINE.fine);
const easel = (x, y, h = 200) => line(`M${x - 40} ${y}L${x} ${y - h}L${x + 40} ${y}M${x} ${y - h}V${y}M${x - 34} ${y - h * 0.32}H${x + 34}`, 5) + line(`M${x - 40} ${y}L${x} ${y - h}L${x + 40} ${y}M${x} ${y - h}V${y}M${x - 34} ${y - h * 0.32}H${x + 34}`, 2.6, C.woodLight);
const shavings = (x, y, seed = 0) => line([0, 1, 2, 3, 4, 5].map((i) => `M${x + i * 14 + (seed * i) % 9} ${y - (i % 2) * 5}q6 -8 12 0`).join(''), 2, C.woodLight);

/** Sweeper: the apprentice's broom drives shavings across the workshop floor before the day starts. */
function sweeper() {
  const broom = line(`M40 -120L84 0`, 5) + line(`M40 -120L84 0`, 2.6, C.woodLight) + path(`M70 -8L98 -12L108 8L74 10Z`, C.goldDark, LINE.form) + line(`M80 -6L82 8M90 -8L94 8M100 -8L102 8`, LINE.fine);
  return room(C.parchment, C.woodLight, 290, 221) + shelves(400, 200, 200, 140, 222, 3, 'books') + window3(150, 200, 70, 130) + table(500, 290, 200, C.wood, 50) + shavings(420, 330, 3) + shavings(500, 312, 5) + fig(300, 350, 1.62, 'page', { legs: 'brace', lean: 6, armR: [[13, -102], [28, -96], [40, -110]], armL: [[-13, -102], [10, -84], [52, -42]], inFront: broom }) + ell(560, 344, 26, 8, C.goldLight, LINE.fine) + fig(80, 330, 1.12, 'smith', { pose: 'hip', tone: 1 });
}

/** Sketchbook: on a step in the square, an apprentice draws the column in front of him. */
function sketchbook() {
  return sky() + cloud(120, 46) + roofline(170, 223, { h: 70 }) + paving(240, C.stone, 224) + rect(0, 170, W, 70, C.parchment, LINE.form) + column(440, 300, 250, 50, C.ivory) + rect(400, 300, 80, 16, C.stoneLight, LINE.form) + rect(80, 300, 220, 16, C.stoneLight, LINE.form) + fig(200, 340, 1.66, 'page', { legs: 'sit', tilt: 10, armR: [[13, -102], [32, -86], [52, -96]], armL: [[-13, -102], [8, -86], [36, -92]], inFront: rect(30, -116, 46, 34, C.ivory, LINE.form) + line(`M44 -104C50 -110 56 -96 62 -104`, LINE.fine) + line(`M52 -96L60 -128`, 2) }) + fig(560, 300, 0.9, 'goodwife', { dir: -1 });
}

/** Bottega: the master at the big panel, one apprentice grinding colour, another priming a board. */
function bottega() {
  const slab = rect(80, 268, 120, 14, C.stone, LINE.form) + ell(140, 262, 18, 8, C.burgundy, LINE.fine) + path(`M126 262C130 240 150 240 154 262`, C.stoneLight, LINE.fine);
  return room(C.parchmentDark, C.woodLight, 300, 231) + panel(30, 40, 90, 70) + panel(130, 50, 70, 54) + window3(560, 200, 60, 120) + easel(380, 300, 250) + panel(320, 90, 130, 110) + fig(500, 350, 1.68, 'scholar', { dir: -1, hat: 'beret', armR: [[13, -102], [40, -120], [84, -140]], inFront: line(`M84 -140L104 -150`, 3) }) + table(140, 340, 160, C.wood, 56) + slab + fig(140, 340, 1.2, 'page', { tone: 1, armR: [[13, -102], [8, -84], [0, -76]], armL: [[-13, -102], [-6, -84], [0, -76]] }) + fig(250, 350, 1.3, 'worker', { legs: 'kneel', tone: 2, pose: 'low', inFront: rect(30, -40, 70, 40, C.ivory, LINE.form) });
}

/** Guild Diploma: on one knee under the guild's banner, the new member takes his sealed letter. */
function guild_diploma() {
  return room(C.stoneLight, C.parchmentDark, 290, 241) + floorTiles(290) + pennon(270, 0, 100, 150, C.sageDark, C.gold) + window3(90, 200, 60, 120) + window3(550, 200, 60, 120) + fig(390, 346, 1.7, 'burgher', { dir: -1, hat: 'black-cap', collar: C.gold, gown: { fill: C.burgundy, fold: true, trim: C.gold }, top: C.burgundy, armR: [[13, -102], [40, -96], [70, -90]], inFront: sheet(78, -80, 34, 42, true) }) + fig(250, 350, 1.58, 'smith', { legs: 'kneel', armR: [[13, -102], [34, -96], [56, -98]], hat: 'bare' }) + fig(130, 336, 1.18, 'merchant', { pose: 'both', tone: 2 }) + fig(530, 336, 1.14, 'clerk', { dir: -1, pose: 'write', inFront: book(30, -76, 40, 6) });
}

/** Woodcarver: the figure half free of the block, chisel and mallet at work, shavings at his feet. */
function woodcarver() {
  const block = rect(360, 150, 90, 160, C.woodLight, LINE.heavy) + path(`M380 150C380 120 430 120 430 150C440 190 438 240 430 300H380C372 240 370 190 380 150Z`, C.goldLight, LINE.form) + ell(405, 132, 16, 18, C.goldLight, LINE.form) + line(`M392 176C400 186 412 186 420 176M396 220V290M414 220V290`, LINE.fine, C.woodDark);
  return room(C.parchment, C.woodLight, 300, 251) + line(`M60 60V140M90 60V130M120 60V150M150 60V136`, 4, C.woodDark) + rect(40, 54, 140, 8, C.wood, LINE.form) + table(405, 340, 170, C.wood, 40) + block + fig(250, 350, 1.66, 'smith', { lean: 4, armR: [[13, -102], [40, -114], [80, -140]], armL: [[-13, -102], [20, -110], [64, -144]], inFront: line(`M80 -140L104 -154`, 4, C.stoneDark) + rect(52, -164, 26, 18, C.wood, LINE.form) }) + shavings(470, 344, 7) + shavings(180, 340, 2) + window3(570, 220, 50, 100);
}

/** Promotion: the master sets the journeyman's new cap on his head, the workshop applauding. */
function promotion() {
  return room(C.parchmentDark, C.wood, 296, 261) + tapestry(240, 10, 160, 130, C.slate, C.gold) + window3(90, 196, 56, 110) + window3(550, 196, 56, 110) + fig(370, 346, 1.72, 'scholar', { dir: -1, hat: 'black-cap', top: C.burgundyDark, gown: { fill: C.burgundyDark, fold: true, trim: C.gold }, armR: [[13, -102], [34, -126], [58, -154]], inFront: ell(66, -160, 22, 8, C.burgundy, LINE.form) }) + fig(268, 346, 1.6, 'worker', { hat: 'bare', tilt: 8, pose: 'low' }) + fig(130, 330, 1.2, 'page', { pose: 'cheer', tone: 1 }) + fig(510, 330, 1.18, 'smith', { dir: -1, pose: 'cheer', tone: 2 }) + fig(586, 324, 1.04, 'wife', { dir: -1, pose: 'both' });
}

/** Master's Hand: over the stone, the master's hand closes on the apprentice's and guides the chisel. */
function masters_hand() {
  const stone = rect(300, 250, 300, 110, C.stoneLight, LINE.heavy) + masonry(304, 256, 292, 100, 271, { rows: 4 }) + path(`M360 250C380 220 430 210 470 230C500 210 540 222 560 250`, C.ivory, LINE.form);
  return room(C.stone, C.stoneDark, 300, 272) + window3(130, 180, 80, 130) + stone + fig(260, 352, 1.86, 'scholar', { hat: 'beret', armR: [[13, -102], [44, -96], [92, -98]], armL: [[-13, -102], [16, -94], [70, -90]] }) + fig(352, 310, 1.36, 'page', { armR: [[13, -102], [28, -88], [56, -76]], tone: 1 }) + line(`M410 260L424 230`, 5, C.stoneDark) + rect(400, 264, 22, 12, C.wood, LINE.fine);
}

/** Open Studio: the shutters thrown open onto the street, panels on show, passers-by stopping to look. */
function open_studio() {
  const front = rect(120, 20, 400, 290, C.parchment, LINE.heavy) + rect(160, 100, 320, 170, C.slateDeep, LINE.heavy) + panel(180, 120, 110, 90) + panel(350, 130, 110, 80) + rect(130, 270, 380, 16, C.wood, LINE.form) + poly([[160, 100], [100, 120], [100, 260], [160, 270]], C.wood, LINE.form) + poly([[480, 100], [540, 120], [540, 260], [480, 270]], C.wood, LINE.form) + poly([[100, 20], [320, -20], [540, 20]], C.terra, LINE.heavy);
  return sky() + roofline(120, 281, { h: 50 }) + front + paving(310, C.stone, 282) + fig(320, 300, 1.08, 'scholar', { hat: 'beret', pose: 'raise' }) + fig(90, 356, 1.5, 'lady', { pose: 'point', tone: 1 }) + fig(190, 356, 1.42, 'merchant', { dir: -1, pose: 'hip' }) + fig(540, 356, 1.46, 'goodwife', { dir: -1, pose: 'both', tone: 2 });
}

/** Study Hall: a long table of students heads down in their books, shelves to the ceiling behind. */
function study_hall() {
  return rect(0, 0, W, 360, C.woodLight, 0) + shelves(20, 230, 600, 210, 291, 5, 'books') + fig(140, 300, 1.12, 'scholar', { pose: 'write', tilt: 14 }) + fig(260, 300, 1.12, 'page', { pose: 'write', tilt: 18, tone: 1 }) + fig(380, 300, 1.12, 'monk', { pose: 'write', tilt: 12 }) + fig(500, 300, 1.12, 'scholar', { dir: -1, pose: 'write', tilt: 16, hat: 'bare', tone: 2 }) + table(320, 360, 560, C.wood, 80, C.sageDark) + [140, 260, 380, 500].map((x) => book(x + 20, 278, 54, 10)).join('') + candle(200, 278) + candle(440, 278);
}

/** Patternmaker: paper patterns pinned to the cloth, shears in hand, a finished sleeve on the stand. */
function patternmaker() {
  const cloth = path(`M120 270L560 270L540 330L100 330Z`, C.burgundy, LINE.heavy) + poly([[180, 280], [260, 276], [270, 316], [170, 320]], C.ivory, LINE.form) + poly([[320, 284], [400, 278], [430, 318], [300, 322]], C.ivory, LINE.form) + ticks([[190, 290, 196, 296], [250, 288, 256, 294], [340, 292, 346, 298], [410, 300, 416, 306]], 2, C.goldDark);
  const stand = line(`M580 300V160`, 5) + path(`M556 160C556 120 604 120 604 160L612 240H548Z`, C.slate, LINE.form);
  return room(C.parchment, C.woodLight, 290, 301) + window3(320, 180, 90, 130) + stand + fig(330, 274, 1.3, 'merchant', { hat: 'bare', tilt: 14, armR: [[13, -102], [34, -80], [56, -70]], armL: [[-13, -102], [-30, -80], [-50, -72]], inFront: line(`M56 -70L80 -60M56 -70L78 -76`, 3, C.stoneDark) }) + rect(90, 270, 480, 90, C.wood, LINE.heavy) + cloth + fig(80, 352, 1.4, 'wife', { pose: 'both', tone: 1, inFront: ell(38, -80, 14, 10, C.slateLight, LINE.form) });
}

/** Atelier: the great marble on its scaffold under the roof light, the sculptor up the ladder. */
function atelier() {
  const statue = path(`M300 300C292 240 296 170 312 120C318 100 342 100 348 120C364 170 368 240 360 300Z`, C.ivory, LINE.heavy) + ell(330, 92, 20, 24, C.ivory, LINE.heavy) + line(`M318 160C326 170 340 170 346 160M322 210V290M340 210V290`, LINE.fine, C.stoneDark) + rect(280, 300, 100, 30, C.stone, LINE.form);
  const scaffold = line(`M240 330V60M420 330V60M240 120H420M240 220H420M240 330L420 120`, 5) + line(`M240 330V60M420 330V60M240 120H420M240 220H420`, 2.6, C.woodLight);
  const ladder = line(`M470 330L440 120M500 330L470 120`, 4) + ticks([0, 1, 2, 3, 4, 5, 6].map((i) => [466 - i * 4.3, 300 - i * 28, 496 - i * 4.3, 300 - i * 28]), 3, C.woodDark);
  return rect(0, 0, W, 360, C.stoneLight, 0) + poly([[260, 0], [400, 0], [470, 330], [190, 330]], C.ivory, 0).replace('<path', '<path opacity="0.35"') + rect(250, 0, 160, 14, C.sky, LINE.form) + statue + scaffold + ladder + fig(486, 200, 1.1, 'smith', { dir: -1, armR: [[13, -102], [40, -110], [64, -118]] }) + rect(0, 330, W, 30, C.stone, LINE.form) + ell(140, 334, 40, 10, C.stoneLight, LINE.fine) + fig(120, 352, 1.4, 'page', { pose: 'head', tone: 1, inFront: rect(-24, -170, 48, 22, C.stoneLight, LINE.form) });
}

/** Schoolroom: children on benches with their slates, the master's pointer at the board. */
function schoolroom() {
  const board = rect(380, 60, 220, 120, C.slateDark, LINE.heavy) + line(`M400 90H560M400 120H520M400 150H570`, 2, C.stoneLight);
  const child = (x, i) => fig(x, 350, 0.9, ['page', 'wife', 'farmer', 'goodwife', 'page'][i], { legs: 'sit', tone: i % 3, hat: i % 2 ? 'coif' : 'bare', armR: [[13, -102], [24, -80], [36, -76]], inFront: rect(24, -88, 30, 22, C.slate, LINE.fine) });
  return room(C.parchment, C.woodLight, 280, 311) + board + window3(110, 180, 56, 110) + fig(560, 340, 1.5, 'monk', { dir: -1, armR: [[13, -102], [34, -126], [50, -144]], inFront: line(`M50 -144L80 -190`, 3) }) + [70, 160, 250, 340, 430].map(child).join('') + rect(40, 316, 450, 10, C.wood, LINE.form);
}

/** Lecture Hall: the lecturer high in his chair, benches of listeners, one asleep against the wall. */
function lecture_hall() {
  const chair = rect(250, 120, 140, 130, C.woodDark, LINE.heavy) + poly([[240, 120], [320, 70], [400, 120]], C.wood, LINE.heavy) + rect(260, 170, 120, 14, C.wood, LINE.form) + book(320, 168, 70, 10);
  const row = (y, s, xs, seed) => xs.map((x, i) => fig(x, y, s, ['scholar', 'monk', 'page', 'clerk', 'scholar', 'merchant'][(i + seed) % 6], { tone: (i + seed) % 3, dir: x > 320 ? -1 : 1, pose: (i + seed) % 3 === 0 ? 'write' : 'stand', hat: (i + seed) % 2 ? 'beret' : undefined })).join('');
  return room(C.stoneLight, C.wood, 260, 321) + vaultedRoof(C.stone) + window3(90, 200, 54, 120) + window3(550, 200, 54, 120) + chair + fig(320, 176, 0.86, 'scholar', { hat: 'black-cap', pose: 'point', top: C.burgundyDark, gown: { fill: C.burgundyDark, fold: true } }) + row(290, 0.9, [130, 210, 430, 510], 1) + rect(0, 290, W, 12, C.woodDark, LINE.form) + row(356, 1.24, [80, 190, 450, 560], 3) + fig(620, 356, 1.2, 'page', { dir: -1, tilt: 20, pose: 'low' });
}

/** Master's Fee: at the workshop door, a father counts the fee into the master's palm, the boy behind with his bundle. */
function masters_fee() {
  const shop = rect(330, 20, 310, 300, C.parchmentDark, LINE.heavy) + door(470, 300, 110, 180, true) + rect(360, 50, 60, 50, C.slateDark, LINE.form) + rect(540, 50, 60, 50, C.slateDark, LINE.form) + path(`M440 80l30 -20l30 20l-30 20Z`, C.gold, LINE.form);
  return sky() + cloud(80, 40) + roofline(160, 331, { to: 330, h: 64 }) + shop + paving(300, C.stone, 332) + fig(470, 348, 1.6, 'smith', { dir: -1, armR: [[13, -102], [40, -94], [62, -88]] }) + fig(320, 350, 1.62, 'farmer', { armR: [[13, -102], [34, -96], [56, -92]], tone: 1, inFront: purse(34, -60, 0.6) + ell(58, -98, 6, 6, C.gold, LINE.fine) }) + fig(190, 346, 1.14, 'page', { tone: 1, inFront: rect(-30, -70, 30, 24, C.parchment, LINE.form) });
}

/** Maestro: the finished altarpiece unveiled, the cloth pulled away, the patron's hand to his chest. */
function maestro() {
  const altar = rect(210, 30, 220, 240, C.gold, LINE.heavy) + arch(320, 260, 180, 220, C.sky, LINE.form) + path(`M230 200C280 170 360 210 410 180V260H230Z`, C.sage, LINE.form) + poly([[210, 30], [320, -10], [430, 30]], C.goldDark, LINE.heavy) + rect(234, 260, 172, 10, C.goldDark, LINE.fine) + ell(320, 110, 30, 30, C.goldLight, LINE.fine);
  const cloth = path(`M430 30C470 80 480 200 500 290L460 300C450 220 440 120 420 50Z`, C.burgundy, LINE.form);
  return room(C.stone, C.parchmentDark, 300, 341) + floorTiles(300) + altar + cloth + fig(530, 350, 1.62, 'scholar', { dir: -1, hat: 'beret', armR: [[13, -102], [40, -118], [70, -140]] }) + fig(130, 348, 1.66, 'noble', { armR: [[13, -102], [6, -90], [-2, -98]] }) + fig(50, 330, 1.2, 'lady', { tone: 1, pose: 'both' });
}

export const MASTERS = {
  sweeper: ['Sweeper', sweeper], sketchbook: ['Sketchbook', sketchbook], bottega: ['Bottega', bottega], guild_diploma: ['Guild Diploma', guild_diploma], woodcarver: ['Woodcarver', woodcarver],
  promotion: ['Promotion', promotion], masters_hand: ['Master’s Hand', masters_hand], open_studio: ['Open Studio', open_studio], study_hall: ['Study Hall', study_hall], patternmaker: ['Patternmaker', patternmaker],
  atelier: ['Atelier', atelier], schoolroom: ['Schoolroom', schoolroom], lecture_hall: ['Lecture Hall', lecture_hall], masters_fee: ['Master’s Fee', masters_fee], maestro: ['Maestro', maestro],
};
