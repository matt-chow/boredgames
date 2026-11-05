/** Market cards, second third: the town and its people (docs/ART_BIBLE.md). */
import {  } from './scene.mjs';

/** Alms House: loaves handed from the door to a queue of the poor. */
function mutual_aid() {
  return sky() + cloud(420, 40, 110) + roofline(190, 19, { from: 360, h: 84 }) + rect(0, 40, 330, 244, C.stoneLight, LINE.heavy) + masonry(4, 46, 322, 232, 13, { rows: 15 }) + poly([[-10, 40], [160, -24], [346, 40]], C.terraDark, LINE.heavy) + door(180, 284, 104, 164, true) + window3(58, 180, 40, 70) + window3(292, 180, 40, 70) + pennon(166, 62, 28, 34, C.sageDark) + paving(284, C.stone, 9) +
    fig(170, 322, 1.32, 'monk', { pose: 'give', inFront: ell(54, -82, 13, 9, C.woodLight, LINE.form) }) + fig(296, 342, 1.28, 'poor', { dir: -1, pose: 'give', tone: 1 }) + fig(404, 344, 1.14, 'goodwife', { dir: -1, tone: 2, top: C.stoneDark, gown: { fill: C.stone, fold: true }, hat: 'kerchief' }) + fig(470, 322, 0.76, 'page', { dir: -1, top: C.stoneDark, sleeve: C.stoneDark, hose: C.stoneDeep, collar: null, pose: 'whisper' }) + fig(558, 344, 1.14, 'poor', { dir: -1, tone: 2, pose: 'hip', hat: 'cap' }) + rect(40, 290, 70, 40, C.woodLight, LINE.form) + ell(60, 288, 15, 9, C.woodLight, LINE.form) + ell(90, 288, 15, 9, C.woodLight, LINE.form);
}

/** Licensing Hall: a sealed licence passes through a counter's grille. */
function permit_office() {
  let grille = '';
  for (let x = 130; x < 510; x += 40) grille += `M${x} 54V212`;
  return rect(0, 0, W, 360, C.parchmentDark, 0) + shelves(150, 212, 340, 178, 8, 4, 'books') + fig(238, 300, 1.46, 'clerk', { pose: 'give', armR: [[13, -102], [34, -96], [66, -92]] }) + rect(0, 0, W, 34, C.woodDark, LINE.heavy) + line(grille, 4.6, C.ink) + line(grille, 2.2, C.goldDark) + rect(0, 212, W, 148, C.wood, LINE.heavy) + rect(0, 204, W, 12, C.woodLight, LINE.form) + line(`M0 256H640M0 300H640M120 216V360M520 216V360`, LINE.fine, C.woodDark) + sheet(334, 184, 66, 38, true) + rect(136, 190, 14, 14, C.burgundyDark, LINE.fine) + coins(180, 204, 11, 2) + fig(482, 360, 1.82, 'merchant', { dir: -1, pose: 'give', armR: [[13, -102], [36, -96], [56, -92]], hat: 'beret', top: C.sageDark, sleeve: C.sageDeep, skirt: C.sageDark });
}

/** Toll Gate: a striped bar drops across the road, cart waiting, keeper's hand out. */
function maintenance_cart() {
  const hut = rect(40, 124, 120, 150, C.parchment, LINE.heavy) + poly([[28, 124], [100, 66], [172, 124]], C.terra, LINE.heavy) + rect(76, 158, 48, 44, C.slateDeep, LINE.fine) + door(100, 274, 42, 64);
  let bar = line(`M144 224L640 160`, 12) + line(`M144 224L640 160`, 8, C.ivory);
  for (let i = 0; i < 6; i++) { const x = 170 + i * 82; bar += line(`M${x} ${224 - (x - 144) * 0.129}L${x + 36} ${224 - (x + 36 - 144) * 0.129}`, 8, C.burgundy); }
  return sky() + cloud(240, 40, 110) + hills(190, C.slateLight, 36, 18) + ground(220) + cypress(208, 240, 130) + poly([[190, 250], [440, 250], [640, 330], [640, 360], [20, 360]], C.parchmentDark, LINE.heavy) + hut + rect(128, 200, 30, 88, C.woodDark, LINE.form) + ell(150, 224, 16, 16, C.stoneDark, LINE.form) + bar + fig(242, 346, 1.36, 'merchant', { pose: 'give', top: C.slateDark, skirt: C.slateDark, hat: 'black-cap', armR: [[13, -102], [30, -86], [52, -90]] }) + `<g transform="translate(1040 0) scale(-1 1)">` + cart(560, 346, 170, sack(520, 300, 0.8) + bale(578, 298, 64, 34, C.sage) + barrel(630, 300, 0.8)) + `</g>` + fig(396, 344, 1.26, 'farmer', { dir: -1, pose: 'give', tone: 1, inFront: coin(50, -82, 7) });
}

/** Scriptorium: monks in a row at sloped desks, repeating away under long windows. */
function lamplighter() {
  const scribe = (x, y, s) => stool(x - 12 * s, y, 30 * s, 30 * s) + fig(x - 12 * s, y - 2, s, 'monk', { legs: 'sit', pose: 'write', armR: [[13, -102], [30, -92], [46, -80]], armL: [[-13, -102], [10, -88], [34, -78]], lean: 3, tilt: 8, inFront: line(`M46 -82L38 -104`, 1.6) }) + `<g transform="translate(${x} ${y}) scale(${s})">` + poly([[28, -74], [86, -94], [88, -86], [30, -66]], C.woodLight, 2.4) + poly([[32, -76], [74, -90], [78, -84], [34, -70]], C.ivory, 1.2) + rect(48, -68, 7, 68, C.woodDark, 2.2) + rect(74, -80, 7, 80, C.woodDark, 2.2) + `</g>`;
  return room(C.stoneLight, C.parchmentDark, 246, 21) + vaultedRoof(C.stone).replace('M0 0H640', 'M0 0H640') + window3(96, 196, 60, 120) + window3(240, 196, 60, 120) + window3(384, 196, 60, 120) + window3(528, 196, 60, 120) + floorTiles(246) + scribe(452, 272, 0.76) + scribe(290, 300, 1.02) + scribe(92, 344, 1.42);
}

/** Cloister Garden: arcade round a walled green, a well, monks at their walking. */
function clock_garden() {
  const arcade = (y, n, w, h) => {
    let s = rect(0, y - h - 20, W, h + 20, C.stoneLight, LINE.heavy) + poly([[0, y - h - 20], [0, y - h - 40], [640, y - h - 40], [640, y - h - 20]], C.terra, LINE.form);
    const step = 640 / n;
    for (let i = 0; i < n; i++) s += arch(step * (i + 0.5), y, step * 0.72, h, C.slateDark, LINE.form);
    return s;
  };
  return sky() + roofline(68, 2, { h: 16, walls: [C.stoneLight], roof: C.terraDark, sw: LINE.fine }) + tower(320, 66, 36, 40, { sw: LINE.form, roof: C.slateDark }) + arcade(164, 11, 0, 70) + rect(0, 164, W, 196, C.sageLight, LINE.form) + path(`M320 164V360M0 262H640`, 'none', 14, C.parchmentDark) + line(`M0 262H640`, 14, C.parchmentDark) + line(`M320 164V360`, 18, C.parchmentDark) + [[120, 212], [510, 212], [120, 322], [510, 322]].map(([x, y]) => cypress(x, y, 48 + (y - 180) * 0.34, 15)).join('') + ell(320, 264, 56, 22, C.stone, LINE.heavy) + ell(320, 258, 44, 16, C.slateDark, LINE.form) + line(`M280 258V196H360V258M272 196H368`, LINE.form + 2, C.woodDark) + line(`M320 196V246`, LINE.fine) + fig(182, 338, 1.2, 'monk', { pose: 'write', armR: [[13, -102], [22, -84], [34, -78]], inFront: book(40, -78, 26, 4) }) + fig(448, 310, 0.96, 'monk', { dir: -1, armR: [[13, -102], [20, -82], [10, -66]], armL: [[-13, -102], [-20, -82], [-10, -66]] }) + fig(232, 214, 0.6, 'monk', { dir: 1 });
}

/** Market Stall: right up against the counter, awning overhead, the keeper offering a basket. */
function gear_lease() {
  let awn = '';
  for (let i = 0; i < 9; i++) awn += path(`M${i * 72 - 4} 0h72l-6 104q-30 16 -62 0Z`, i % 2 ? C.ivory : C.terra, LINE.form);
  const apples = (x, y, fill) => [[-22, 0], [0, 0], [22, 0], [-11, -14], [11, -14], [0, -26]].map(([a, b]) => ell(x + a, y + b, 12, 12, fill, LINE.fine)).join('');
  return sky(C.parchment) + roofline(170, 11, { h: 60 }) + rect(0, 170, W, 80, C.stone, LINE.form) + fig(320, 300, 1.74, 'goodwife', { pose: 'both', top: C.sageDark, sleeve: C.parchment, gown: { fill: C.sageDark, fold: true }, apron: C.ivory, hat: 'coif', tone: 1, armR: [[13, -102], [30, -86], [50, -78]], armL: [[-13, -102], [6, -84], [28, -78]] }) + awn + rect(0, 248, W, 112, C.wood, LINE.heavy) + rect(0, 240, W, 14, C.woodLight, LINE.form) + line(`M0 290H640M0 330H640M212 254V360M428 254V360`, LINE.fine, C.woodDark) + path(`M360 226C372 256 438 256 450 226Z`, C.woodLight, LINE.form) + apples(404, 220, C.burgundyLight) + apples(114, 236, C.terraLight) + apples(556, 236, C.sage) + sack(244, 248, 0.7, C.parchment);
}

/** Town Plans: the walled town drawn large on the table, leaders round it. */
function city_blueprint() {
  const plan = `<g transform="translate(320 276) scale(1 .42)">` + rect(-210, -180, 420, 340, C.ivory, 3) + ell(0, -10, 150, 150, C.parchment, 5) + ell(0, -10, 150, 150, 'none', 2, C.slateDark) + line(`M-150 -10H150M0 -160V140M-100 -110L100 90M100 -110L-100 90`, 3, C.slate) + [[0, -160], [150, -10], [0, 140], [-150, -10], [106, -116], [-106, -116], [106, 96], [-106, 96]].map(([x, y]) => rect(x - 14, y - 14, 28, 28, C.terraLight, 3)).join('') + rect(-34, -44, 68, 68, C.burgundyLight, 3) + `</g>`;
  return room(C.slate, C.woodDark, 220, 4).replace(new RegExp(C.stoneDark, 'g'), C.slateDark) + tapestry(240, 12, 160, 82, C.burgundyDark, C.goldDark) + lantern(120, 70, 13) + lantern(520, 70, 13) + fig(118, 276, 1.38, 'noble', { pose: 'point', armR: [[13, -102], [40, -90], [68, -70]], lean: 4 }) + fig(320, 216, 1.14, 'burgher', { pose: 'hip', gown: { fill: C.sageDark, fold: true, trim: C.gold }, hat: 'beret', armR: [[13, -102], [18, -80], [8, -66]] }) + fig(528, 276, 1.38, 'merchant', { dir: -1, pose: 'write', hat: 'black-cap', gown: { fill: C.slateDeep, fold: true }, lean: 5, tilt: 7, armR: [[13, -102], [34, -88], [50, -70]] }) + plan + scroll(112, 326, 54, 14);
}

/** Cloth Hall: bolts stacked to the roof beams, merchants testing a cloth between them. */
function grand_engine() {
  const r = rng(6);
  let stacks = '';
  for (const x of [40, 470]) for (let row = 0; row < 7; row++) for (let i = 0; i < 3; i++) stacks += rect(x + i * 44 + (row % 2) * 8, 280 - (row + 1) * 28, 44, 28, [C.burgundy, C.slate, C.sage, C.terra, C.parchmentDark, C.gold][Math.floor(r() * 6)], LINE.form);
  const beams = line(`M0 40H640M0 84H640M100 0V84M320 0V84M540 0V84`, 8, C.ink) + line(`M0 40H640M0 84H640M100 0V84M320 0V84M540 0V84`, 5, C.wood);
  return rect(0, 0, W, 360, C.parchmentDark, 0) + window3(320, 220, 110, 120) + stacks + beams + floorTiles(280) + path(`M220 196C260 216 370 216 420 196L436 318C390 330 256 330 204 318Z`, C.burgundyLight, LINE.form) + line(`M250 212L238 320M320 218V326M390 212L404 320`, LINE.fine, C.burgundyDark) + fig(178, 346, 1.56, 'merchant', { pose: 'both', top: C.slateDark, skirt: C.slateDark, hat: 'beret', armR: [[13, -102], [28, -96], [44, -96]], armL: [[-13, -102], [14, -90], [36, -96]] }) + fig(458, 346, 1.56, 'burgher', { dir: -1, pose: 'both', armR: [[13, -102], [28, -96], [44, -96]], armL: [[-13, -102], [14, -90], [36, -96]], gown: { fill: C.sageDark, fold: true, trim: C.gold } });
}

/** Court Scholar: alone at the desk, globe and books, a tall window's light. */
function civic_scholar() {
  const globe = rect(504, 244, 10, 20, C.goldDark, LINE.fine) + rect(486, 262, 46, 6, C.goldDark, LINE.fine) + ell(509, 212, 36, 36, C.slateLight, LINE.form) + path(`M484 196C498 192 502 208 494 218C486 226 480 214 484 196ZM512 184C526 192 538 206 530 226C520 230 508 216 512 184Z`, C.sage, LINE.fine) + ell(509, 212, 44, 44, 'none', LINE.form, C.goldDark);
  return room(C.parchment, C.woodDark, 300, 6) + window3(146, 200, 120, 170) + rect(390, 44, 190, 82, C.slate, LINE.form) + path(`M402 54H568V116H402Z`, C.parchment, LINE.fine) + line(`M420 70H552M420 88H524M420 104H546`, LINE.fine, C.stoneDark) + stool(270, 346, 52, 42) + fig(258, 310, 1.64, 'scholar', { legs: 'sit', pose: 'write', hat: 'beret', tilt: 9, lean: 5, armR: [[13, -102], [28, -86], [46, -72]], armL: [[-13, -102], [10, -84], [36, -74]] }) + table(404, 350, 340, C.wood, 80) + book(370, 266, 128, 16) + rect(482, 248, 62, 15, C.burgundy, LINE.form) + rect(492, 234, 50, 14, C.slate, LINE.form) + globe + candle(286, 270);
}

/** Royal Chronicler: writing the realm's history on a great lectern, the book taller than the scribe's arm. */
function museum_curator() {
  return rect(0, 0, W, 360, C.burgundyDark, 0) + tapestry(40, 24, 170, 210, C.slate, C.goldLight) + tapestry(440, 24, 170, 210, C.sageDark, C.goldLight) + rect(0, 264, W, 96, C.stone, LINE.heavy) + floorTiles(264) +
    fig(240, 340, 1.82, 'clerk', { pose: 'write', top: C.slateDeep, gown: { fill: C.slateDeep, fold: true, trim: C.gold }, hat: 'beret', armR: [[13, -102], [34, -96], [58, -94]], armL: [[-13, -102], [8, -90], [30, -92]], inFront: line(`M58 -96L72 -124`, 2) + path(`M72 -124C82 -134 82 -146 78 -152C70 -146 66 -134 72 -124Z`, C.ivory, LINE.fine) }) +
    poly([[316, 170], [474, 136], [486, 172], [326, 208]], C.woodLight, LINE.heavy) + poly([[322, 172], [398, 156], [404, 178], [330, 196]], C.ivory, LINE.form) + poly([[398, 156], [470, 140], [478, 162], [404, 178]], C.ivory, LINE.form) + line(`M336 180L392 168M338 188L396 174M410 164L464 152M412 170L470 158`, LINE.fine, C.stoneDark) + rect(388, 200, 22, 142, C.woodDark, LINE.form) + rect(356, 338, 88, 10, C.woodDark, LINE.form) + candle(528, 300) + rect(520, 300, 16, 44, C.goldDark, LINE.form);
}

/** Benefactors: finely dressed givers drop purses in a chest for a half-built church. */
function patron_circle() {
  const church = rect(330, 100, 300, 180, C.stoneLight, LINE.heavy) + masonry(334, 110, 292, 168, 3, { rows: 10 }) + arch(480, 280, 90, 150, C.slateDark, LINE.form) + line(`M330 100L360 80L392 104L430 70L470 98L520 62L560 96L600 76L630 100`, LINE.form) + line(`M340 276V50M620 276V50M340 150H620`, 5, C.ink) + line(`M340 276V50M620 276V50M340 150H620`, 2.6, C.woodLight);
  return sky() + cloud(60, 50, 120) + church + paving(278, C.stone, 18) + fig(108, 344, 1.42, 'noble', { pose: 'give', inFront: purse(52, -62, 0.6, C.gold) }) + fig(494, 344, 1.42, 'lady', { dir: -1, pose: 'give', inFront: purse(50, -62, 0.56, C.burgundyLight) }) + fig(390, 340, 1.34, 'merchant', { dir: -1, pose: 'give', top: C.terra, sleeve: C.terraDark, skirt: C.terraDark }) + chest(248, 344, 122, 66, true, C.woodDark) + coins(202, 340, 13, 3) + fig(584, 306, 0.8, 'smith', { dir: -1, pose: 'cheer', hat: 'cap' });
}

/** Silver Reliquary: a silver shrine on its altar, candles, the kneeling come to it. */
function silver_statue() {
  const shrine = rect(248, 142, 144, 74, C.stoneLight, LINE.heavy) + poly([[238, 142], [320, 78], [402, 142]], C.stone, LINE.heavy) + [272, 320, 368].map((x) => arch(x, 208, 30, 52, C.slateLight, LINE.form)).join('') + ell(320, 106, 11, 11, C.gold, LINE.form) + rect(226, 216, 188, 12, C.gold, LINE.form) + rect(236, 228, 168, 66, C.burgundy, LINE.heavy) + poly([[320, 238], [342, 262], [320, 286], [298, 262]], C.gold, LINE.form);
  return rect(0, 0, W, 360, C.slateDark, 0) + arch(320, 294, 480, 290, C.slate, LINE.heavy) + line(`M90 294V150C90 84 200 28 320 14C440 28 550 84 550 150V294`, LINE.fine, C.slateLight) + floorTiles(294) + shrine + [190, 450].map((x) => rect(x - 3, 228, 6, 66, C.goldDark, LINE.fine) + candle(x, 228)).join('') + fig(150, 344, 1.26, 'goodwife', { gown: null, skirt: C.slate, hose: C.slateDark, legs: 'kneel', pose: 'head', armR: [[13, -102], [24, -94], [30, -112]], armL: [[-13, -102], [14, -96], [30, -112]], tone: 2 }) + fig(504, 344, 1.26, 'worker', { dir: -1, legs: 'kneel', armR: [[13, -102], [24, -94], [30, -112]], armL: [[-13, -102], [14, -96], [30, -112]], hat: 'bare' }) + fig(62, 318, 1, 'noble', { pose: 'stand', hat: 'bare' }) + fig(582, 318, 1, 'lady', { dir: -1 });
}

/** Foreign Envoy: strange banner, tall horse, the castle above on its rise. */
function civic_embassy() {
  const castle = tower(428, 148, 54, 74, { cone: true, sw: LINE.form }) + rect(462, 92, 120, 60, C.stone, LINE.form) + tower(530, 148, 44, 90, { cone: true, roof: C.burgundy, sw: LINE.form }) + tower(598, 148, 52, 66, { cone: false, sw: LINE.form });
  return sky(C.parchment) + cloud(180, 44, 110) + hills(170, C.sageLight, 44, 4) + castle + path(`M0 240C180 180 400 150 640 148V360H0Z`, C.sage, LINE.form) + path(`M0 340C200 280 400 240 508 150L534 152C470 260 420 320 380 360H0Z`, C.parchmentDark, LINE.form) +
    rider(236, 340, 1.34, 'merchant', { horse: { fill: C.stoneLight, mane: C.stoneDark, cloth: C.gold }, fig: { top: C.slateDeep, sleeve: C.gold, hat: 'hood', skirt: C.gold, hose: C.slateDeep, armR: [[13, -102], [32, -92], [46, -92]], armL: [[-13, -102], [-28, -112], [-32, -142]], behind: line(`M-34 -10V-180`, 4.6) + line(`M-34 -10V-180`, 2.4, C.woodLight) + path(`M-34 -176h-66l10 18l-10 18h66Z`, C.slateDeep, 2.2) + path(`M-52 -166l8 8l-8 8l-8 -8Z`, C.gold, 1.4) } }) + fig(92, 346, 1.1, 'page', { legs: 'walk', top: C.gold, sleeve: C.slateDeep, hose: C.slateDeep, hat: 'cap', tone: 2, pose: 'head', inFront: chest(0, -130, 44, 20, false) }) + fig(460, 330, 1, 'guard', { dir: -1, behind: pike(24, -2, 170), pose: 'raise', armR: [[13, -102], [20, -116], [28, -130]] });
}

/** Builder's Honour: the medal lowered over a kneeling master, trowel at his side, tower behind. */
function inventors_medal() {
  return sky() + cloud(50, 60) + tower(504, 268, 160, 230, { cone: false, seed: 44 }) + line(`M408 268V24M600 268V24M408 110H600M408 190H600`, 5, C.ink) + line(`M408 268V24M600 268V24M408 110H600M408 190H600`, 2.6, C.woodLight) + ground(268, C.parchmentDark) +
    fig(190, 346, 1.62, 'monarch', { pose: 'both', armR: [[13, -102], [32, -112], [54, -116]], armL: [[-13, -102], [12, -110], [40, -116]], inFront: path(`M54 -114C52 -92 44 -88 44 -86M40 -114C40 -96 42 -90 44 -86`, 'none', 2, C.goldDark) + ell(44, -80, 7, 7, C.gold, 1.6) }) + fig(326, 346, 1.42, 'smith', { dir: -1, legs: 'kneel', hat: 'bare', tilt: 12, lean: 5, armR: [[13, -102], [20, -82], [24, -60]], armL: [[-13, -102], [-16, -84], [-6, -70]], tone: 1 }) + poly([[394, 340], [424, 338], [416, 356], [396, 354]], C.slateLight, LINE.form) + fig(60, 330, 1.04, 'noble', { pose: 'hip' }) + fig(568, 340, 1.1, 'smith', { dir: -1, hat: 'cap', pose: 'cheer', tone: 2 });
}

/** Favour Purse: two seated at a small table, a heavy purse sliding over it. Close and quiet. */
function spark_coil() {
  return rect(0, 0, W, 360, C.sageDeep, 0) + line(`M0 60H640M0 130H640M0 200H640`, 1.2, C.sageDark) + window3(320, 150, 60, 110, C.slateDark) +
    fig(120, 364, 2.1, 'noble', { legs: 'sit', pose: 'give', armR: [[13, -102], [30, -74], [56, -66]], armL: [[-13, -102], [-20, -80], [10, -68]] }) + fig(520, 364, 2.1, 'merchant', { dir: -1, legs: 'sit', pose: 'give', top: C.slateDark, skirt: C.slateDark, hat: 'black-cap', armR: [[13, -102], [34, -76], [62, -68]], armL: [[-13, -102], [-20, -80], [10, -68]] }) +
    rect(150, 234, 340, 14, C.wood, LINE.heavy) + path(`M186 248H454L480 360H160Z`, C.woodDark, LINE.heavy) + purse(320, 234, 1.5, C.burgundy) + coin(394, 224, 9) + coin(240, 224, 9);
}

/** Merchant Bond: two hands clasped over the paper, a witness dripping the seal. */
function brass_bond() {
  return room(C.parchment, C.stone, 264, 13) + rect(214, 34, 212, 110, C.sageDark, LINE.form) + line(`M214 62H426M214 90H426M214 118H426`, LINE.fine, C.sageDeep) + fig(320, 280, 1.14, 'clerk', { pose: 'low', armR: [[13, -102], [28, -74], [22, -58]], armL: [[-13, -102], [-16, -84], [-6, -70]], inFront: candle(26, -46) }) + fig(205, 346, 1.62, 'merchant', { pose: 'give', armR: [[13, -102], [40, -100], [70, -104]], top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark }) + fig(435, 346, 1.62, 'merchant', { dir: -1, pose: 'give', armR: [[13, -102], [40, -100], [70, -104]], top: C.slate, sleeve: C.slateDark, hat: 'feather', tone: 1 }) + table(320, 356, 320, C.woodLight, 66) + sheet(320, 278, 80, 30, true);
}

/** Guild Procession: banners high, marching up a narrow street toward the viewer. */
function chain_drive() {
  const a = fig(110, 346, 1.46, 'herald', { legs: 'walk', pose: 'raise', armR: [[13, -102], [28, -112], [34, -130]], behind: line(`M36 0V-210`, 5) + line(`M36 0V-210`, 2.6, C.woodLight) + path(`M36 -210h60v60l-30 16l-30 -16Z`, C.burgundy, 2.2) + poly([[66, -196], [80, -178], [66, -158], [52, -178]], C.gold, 1.4) });
  const b = fig(290, 330, 1.26, 'burgher', { legs: null, pose: 'raise', armR: [[13, -102], [28, -112], [34, -130]], gown: { fill: C.slate, trim: C.gold, fold: true }, behind: line(`M36 0V-200`, 5) + line(`M36 0V-200`, 2.6, C.woodLight) + path(`M36 -200h50v50l-25 14l-25 -14Z`, C.sageDark, 2.2) + ell(61, -176, 11, 11, C.gold, 1.4) });
  const c = fig(434, 310, 1.04, 'merchant', { legs: 'walk', pose: 'raise', armR: [[13, -102], [28, -112], [34, -130]], top: C.terra, skirt: C.terraDark, behind: line(`M36 0V-190`, 5) + line(`M36 0V-190`, 2.6, C.woodLight) + path(`M36 -190h44v42l-22 12l-22 -12Z`, C.slateDark, 2.2) + ell(58, -168, 9, 9, C.goldLight, 1.4) });
  const d = fig(556, 288, 0.8, 'clerk', { legs: 'walk' });
  return sky() + roofline(180, 2, { h: 100, sw: LINE.heavy }) + paving(232, C.stone, 13) + `<g>${d}${c}${b}${a}</g>` + fig(226, 300, 0.98, 'wife', { dir: 1, legs: 'walk', tone: 1 }) + ell(0, 0, 0, 0, 'none', 0);
}

/** Tithe Barn: huge barn doors standing open, sheaves and sacks going in. */
function flywheel() {
  return sky() + cloud(60, 50, 90) + poly([[80, 150], [120, 40], [520, 40], [560, 150]], C.terra, LINE.heavy) + ticks(Array.from({ length: 19 }, (_, i) => [130 + i * 21, 42, 92 + i * 25, 148]), LINE.fine, C.terraDark) + rect(80, 150, 480, 136, C.stoneLight, LINE.heavy) + masonry(84, 154, 472, 128, 2, { rows: 9 }) + rect(246, 118, 148, 168, C.slateDeep, LINE.heavy) + poly([[246, 118], [186, 136], [186, 286], [246, 286]], C.wood, LINE.heavy) + poly([[394, 118], [454, 136], [454, 286], [394, 286]], C.wood, LINE.heavy) + line(`M206 134V286M226 126V286M414 126V286M434 134V286`, LINE.fine, C.woodDark) + ground(284, C.parchmentDark) + `<g transform="translate(640 0) scale(-1 1)">` + cart(150, 346, 150, [[108, 300], [136, 300], [164, 300], [192, 300], [122, 280], [150, 280], [178, 280]].map(([x, y]) => sheaf(x, y, 0.8)).join('')) + `</g>` + fig(320, 300, 1.12, 'farmer', { pose: 'head', armR: [[13, -102], [20, -120], [8, -134]], inFront: sack(0, -132, 0.72), tone: 1 }) + fig(102, 340, 1.1, 'monk', { pose: 'write', inFront: book(36, -78, 28, 4) }) + fig(192, 344, 1.08, 'wife', { pose: 'head', inFront: sheaf(0, -130, 0.7), tone: 2 });
}

/** Royal Commission: in a war tent, a sealed commission to a kneeling officer. */
function timer_switch() {
  const tent = path(`M0 0H640V48L480 110V360H160V110L0 48Z`, C.burgundy, LINE.heavy) + line(`M60 24L160 110M200 0L230 110V360M440 0L410 110V360M580 24L480 110`, LINE.fine, C.burgundyDark);
  const view = rect(0, 0, W, 360, C.skyLow, 0) + hills(210, C.sageLight, 40, 6) + ground(210, C.sage) + poly([[60, 200], [100, 140], [140, 200]], C.ivory, LINE.form) + poly([[520, 194], [556, 140], [592, 194]], C.ivory, LINE.form) + line(`M100 140V124M556 140V124`, LINE.form);
  return view + rect(100, 0, 440, 360, C.parchmentDark, LINE.heavy) + path(`M100 0L300 100V360H100ZM540 0L340 100V360H540Z`, C.burgundyLight, LINE.heavy) + rect(0, 0, 100, 360, C.burgundy, LINE.heavy) + rect(540, 0, 100, 360, C.burgundy, LINE.heavy) + rect(0, 300, W, 60, C.woodLight, LINE.form) + (tent ? '' : '') + banner(66, 300, 240, C.gold, C.burgundy, 1.1) + banner(586, 300, 240, C.gold, C.burgundy, 1.1, -1) +
    fig(208, 346, 1.72, 'monarch', { armR: [[13, -102], [34, -94], [58, -94]], armL: [[-13, -102], [-20, -84], [-12, -68]], inFront: sheet(66, -90, 24, 32, true) }) + fig(420, 348, 1.56, 'guard', { dir: -1, legs: 'kneel', hat: 'bare', skirt: C.slate, armR: [[13, -102], [28, -96], [40, -102]], armL: [[-13, -102], [-16, -80], [-4, -66]], tilt: 8, lean: 4 });
}

/** Grain Sorter: a heap on the floor, sieve lifted, sacks filling along the wall. */
function belt_sorter() {
  const falling = [[276, 262], [292, 278], [268, 290], [304, 296], [286, 310], [316, 268], [258, 276]].map(([x, y]) => `M${x} ${y}v5`).join('');
  return rect(0, 0, W, 360, C.woodLight, 0) + line(`M0 0V360M70 0V360M140 0V360M210 0V360M280 0V360M350 0V360M420 0V360M490 0V360M560 0V360M630 0V360`, 1.4, C.wood) + rect(0, 0, W, 34, C.woodDark, LINE.form) + rect(0, 290, W, 70, C.parchmentDark, LINE.form) + sack(450, 310, 1.5, C.parchment) + sack(530, 330, 1.7, C.parchmentDark) + sack(388, 340, 1.2, C.ivory) + sack(600, 306, 1.4, C.parchment) + path(`M150 350C196 278 372 278 422 350Z`, C.gold, LINE.heavy) + line(`M210 330l6 -6M250 310l6 -4M300 332l6 -5M340 316l6 -4M280 300l5 -3`, LINE.form, C.goldDark) + fig(126, 346, 1.82, 'wife', { sleeve: C.terraDark, armR: [[13, -102], [50, -84], [78, -68]], armL: [[-13, -102], [18, -78], [46, -64]], tone: 1, hat: 'kerchief' }) + ell(280, 228, 72, 18, C.wood, LINE.heavy) + ell(280, 226, 58, 12, C.gold, LINE.form) + line(falling, 2.4, C.goldDark);
}

/** Ragpicker: a back-alley heap of cloth, a long hook, a basket half full. */
function salvage_hook() {
  const heap = path(`M340 358C348 268 430 214 498 226C556 208 640 252 640 300V358Z`, C.stoneDark, LINE.heavy) + path(`M360 318C390 262 446 262 470 308C440 322 400 330 360 318Z`, C.burgundyLight, LINE.form) + path(`M452 244C502 226 556 258 560 302C522 290 488 282 452 244Z`, C.slate, LINE.form) + path(`M530 326C556 288 616 292 640 318V358H556Z`, C.sage, LINE.form) + path(`M460 300C486 298 510 318 516 350L440 356C436 334 444 316 460 300Z`, C.parchmentDark, LINE.form);
  return rect(0, 0, 250, 360, C.parchmentDark, LINE.heavy) + masonry(4, 4, 240, 280, 3, { rows: 18 }) + rect(390, 0, 250, 360, C.stoneDark, LINE.heavy) + masonry(394, 4, 240, 280, 7, { rows: 18, ink: C.stoneDeep }) + rect(250, 0, 140, 170, C.skyLow, LINE.form) + poly([[250, 170], [390, 170], [390, 240], [250, 240]], C.stone, LINE.form) + paving(280, C.stone, 3) + heap + fig(238, 344, 1.72, 'poor', { pose: 'reach', lean: 8, legs: 'brace', hat: 'kerchief', tone: 1, armR: [[13, -102], [40, -96], [64, -92]], armL: [[-13, -102], [20, -92], [50, -86]], inFront: line(`M-10 -70L124 -112`, 4.6) + line(`M-10 -70L124 -112`, 2.4, C.woodLight) + path(`M124 -112C138 -116 136 -100 126 -98`, 'none', 3, C.slateDark) }) + path(`M60 346C50 290 54 276 58 272H148C152 276 156 290 146 346Z`, C.woodLight, LINE.heavy) + line(`M60 296H150M58 320H148M84 272V346M122 272V346`, LINE.fine, C.woodDark) + path(`M72 272C86 246 118 250 134 272Z`, C.terra, LINE.form);
}

/** Changing of the Guard: two files face each other under the castle gate, a drum between. */
function millrace() {
  const a = [[66, 346, 1.26], [152, 318, 1.0], [216, 296, 0.82]];
  const row = (pts, d, fill) => pts.map(([x, y, s]) => fig(x, y, s, 'guard', { dir: d, skirt: fill, top: fill, sleeve: fill, behind: pike(24, -2, 170) })).join('');
  return sky() + wall(0, 276, 640, 170, C.stone, 33) + arch(320, 276, 176, 190, C.slateDeep, LINE.heavy) + poly([[232, 276], [408, 276], [500, 360], [140, 360]], C.parchmentDark, LINE.form) + pennon(120, 96, 42, 60) + pennon(478, 96, 42, 60) + rect(0, 276, W, 84, C.stone, LINE.form) + paving(276, C.stone, 2) + poly([[232, 276], [408, 276], [470, 360], [170, 360]], C.parchmentDark, LINE.form) + row(a.slice().reverse(), 1, C.burgundy) + row([[574, 346, 1.26], [488, 318, 1.0], [424, 296, 0.82]].reverse(), -1, C.slate) + fig(320, 270, 0.76, 'herald', { pose: 'raise' }) + `<g transform="translate(320 342)">` + rect(-34, -46, 68, 46, C.terra, LINE.form) + ell(0, -46, 34, 9, C.ivory, LINE.form) + line(`M-34 -40L-14 -6M-14 -40L6 -6M6 -40L26 -6`, LINE.fine, C.gold) + ell(0, 0, 34, 7, C.terraDark, LINE.form) + `</g>`;
}

/** Lime Kiln: a squat round kiln with fire at its mouth, stone going up the ramp. */
function slag_furnace() {
  const kiln = path(`M210 300C208 200 240 100 280 84H420C460 100 494 200 490 300Z`, C.stone, LINE.heavy) + masonry(236, 100, 234, 190, 53, { rows: 12 }) + ell(350, 84, 72, 15, C.slateDeep, LINE.heavy) + arch(350, 300, 110, 92, C.slateDeep, LINE.heavy) + flame(350, 298, 1.6);
  const smoke = path(`M310 70C286 40 342 34 318 8M380 74C402 44 356 34 384 2`, 'none', 7, C.stoneDark);
  return rect(0, 0, W, 360, C.skyLow, 0) + rect(0, 0, W, 100, C.stoneLight, 0) + hills(180, C.sageLight, 40, 2) + smoke + path(`M0 180L238 130L252 300H0Z`, C.terraLight, LINE.heavy) + ground(292, C.parchmentDark) + kiln + fig(134, 192, 0.88, 'worker', { legs: 'walk', pose: 'head', inFront: rect(-18, -156, 36, 26, C.ivory, LINE.form), tone: 1 }) + fig(530, 344, 1.5, 'smith', { dir: -1, legs: 'brace', hat: 'cap', tone: 2, armR: [[13, -102], [40, -86], [66, -78]], armL: [[-13, -102], [14, -86], [40, -82]], inFront: line(`M-10 -78L136 -66`, 5) + line(`M-10 -78L136 -66`, 2.6, C.woodLight) }) + [[60, 340], [116, 340], [88, 312], [170, 346]].map(([x, y]) => rect(x - 26, y - 28, 52, 28, C.ivory, LINE.form)).join('');
}

/** Favour Broker: at the centre with a tilted balance, coin on one side and a sealed note on the other. */
function spark_exchange() {
  return rect(0, 0, W, 360, C.terraDark, 0) + line(`M0 44H640M0 88H640M0 132H640M0 176H640M0 220H640`, 1.2, C.terra) + rect(0, 268, W, 92, C.woodDark, LINE.heavy) + fig(320, 320, 1.3, 'burgher', { armR: [[13, -102], [24, -122], [6, -134]], armL: [[-13, -102], [-20, -84], [-12, -68]], gown: { fill: C.slateDeep, fold: true, trim: C.gold }, hat: 'beret' }) + line(`M196 148L444 120`, 5) + line(`M320 134V146`, 4) + line(`M196 148L170 212M196 148L222 212M444 120L418 186M444 120L470 186`, LINE.fine) + path(`M160 212a36 16 0 0 0 72 0Z`, C.goldDark, LINE.form) + path(`M408 186a36 16 0 0 0 72 0Z`, C.goldDark, LINE.form) + coins(196, 212, 18, 4) + sheet(444, 188, 40, 28, true) + fig(84, 354, 1.56, 'merchant', { pose: 'hip', top: C.sageDark, sleeve: C.sageDeep, skirt: C.sageDark, tone: 1 }) + fig(556, 354, 1.56, 'noble', { dir: -1, pose: 'hip', tone: 0 });
}

/** Town Gossip: jettied upper floors nearly touching over the lane, heads together below and above. */
function picket_line() {
  const left = poly([[0, 0], [190, 0], [214, 110], [176, 124], [176, 266], [0, 300]], C.parchment, LINE.heavy) + line(`M0 110L214 110M0 124L176 124M60 0V110M120 0V110M60 124V280M120 124V272M0 40L60 110M120 40L60 110`, LINE.form, C.woodDark) + arch(120, 272, 56, 106, C.woodDark, LINE.form);
  const right = poly([[640, 0], [450, 0], [426, 110], [464, 124], [464, 266], [640, 300]], C.parchmentDark, LINE.heavy) + line(`M640 110L426 110M640 124L464 124M580 0V110M520 0V110M580 124V280M520 124V272M640 40L580 110M520 40L580 110`, LINE.form, C.woodDark) + rect(494, 158, 76, 56, C.slateDeep, LINE.form);
  return rect(0, 0, W, 360, C.sky, 0) + rect(190, 0, 260, 260, C.skyLow, 0) + tower(320, 250, 52, 130, { sw: LINE.form }) + poly([[176, 266], [464, 266], [640, 360], [0, 360]], C.stone, LINE.form) + left + right + fig(238, 346, 1.54, 'goodwife', { pose: 'whisper', tilt: 8, lean: 4, armR: [[13, -102], [28, -112], [22, -128]] }) + fig(344, 346, 1.5, 'wife', { dir: -1, tilt: 10, lean: 5, pose: 'give', armR: [[13, -102], [28, -86], [38, -82]], tone: 1, inFront: path(`M34 -66C36 -82 58 -84 60 -66Z`, C.woodLight, LINE.form) }) + fig(534, 260, 0.74, 'burgher', { dir: -1, armR: [[13, -102], [28, -86], [40, -92]], hat: 'bare', collar: C.ivory }) + rect(490, 214, 84, 12, C.woodDark, LINE.form) + rect(0, 0, 0, 0, 'none', 0);
}

/** Tax Farmer: he counts it into his own bag, an armed man at his back and a townsman turning out his purse. */
function corrosion_crew() {
  return sky() + roofline(170, 21, { h: 110, walls: [C.stoneLight, C.parchmentDark] }) + paving(240, C.stone, 8) + fig(70, 338, 1.34, 'guard', { behind: pike(26, -2, 190) }) + fig(214, 346, 1.72, 'merchant', { top: C.burgundyDark, sleeve: C.burgundy, skirt: C.burgundyDark, hat: 'black-cap', armR: [[13, -102], [36, -90], [58, -88]], armL: [[-13, -102], [14, -84], [36, -76]], belt: C.gold, inFront: purse(44, -48, 0.9, C.gold) }) + fig(430, 346, 1.56, 'farmer', { dir: -1, hat: 'bare', tilt: -5, armR: [[13, -102], [30, -96], [48, -102]], armL: [[-13, -102], [8, -96], [36, -102]], inFront: `<g transform="translate(46 -102) rotate(180)">${purse(0, 0, 0.64, C.woodLight)}</g>` }) + coin(322, 226, 7) + coin(316, 256, 7) + coin(320, 288, 7) + rect(530, 288, 70, 62, C.parchmentDark, LINE.form) + barrel(584, 350, 1);
}

/** Guild Dispute: two wardens square up under the guild's banner, members pulling them back. */
function noise_complaint() {
  return room(C.parchmentDark, C.woodLight, 280, 19) + pennon(248, 0, 144, 134) + poly([[320, 22], [362, 74], [320, 122], [278, 74]], C.goldLight, LINE.form) + window3(84, 180, 58, 110) + window3(556, 180, 58, 110) + fig(70, 322, 1.08, 'worker', { armR: [[13, -102], [34, -90], [58, -86]], tone: 1 }) + fig(570, 322, 1.08, 'smith', { dir: -1, armR: [[13, -102], [34, -90], [58, -86]], hat: 'cap', tone: 2 }) + fig(204, 346, 1.62, 'burgher', { lean: 8, legs: null, gown: { fill: C.sageDark, fold: true, trim: C.gold }, armR: [[13, -102], [30, -116], [58, -138]], armL: [[-13, -102], [-30, -90], [-40, -106]] }) + fig(436, 346, 1.62, 'merchant', { dir: -1, lean: 8, legs: 'brace', top: C.burgundy, sleeve: C.burgundyDark, skirt: C.burgundyDark, hat: 'beret', armR: [[13, -102], [30, -102], [52, -104]], armL: [[-13, -102], [-26, -116], [-34, -140]], inFront: rect(-48, -152, 22, 16, C.ivory, LINE.fine) });
}

export const TOWN = {
  mutual_aid: ['Alms House', mutual_aid], permit_office: ['Licensing Hall', permit_office], maintenance_cart: ['Toll Gate', maintenance_cart], lamplighter: ['Scriptorium', lamplighter], clock_garden: ['Cloister Garden', clock_garden], gear_lease: ['Market Stall', gear_lease],
  city_blueprint: ['Town Plans', city_blueprint], grand_engine: ['Cloth Hall', grand_engine], civic_scholar: ['Court Scholar', civic_scholar], museum_curator: ['Royal Chronicler', museum_curator], patron_circle: ['Benefactors', patron_circle], silver_statue: ['Silver Reliquary', silver_statue],
  civic_embassy: ['Foreign Envoy', civic_embassy], inventors_medal: ['Builder’s Honour', inventors_medal], spark_coil: ['Favour Purse', spark_coil], brass_bond: ['Merchant Bond', brass_bond], chain_drive: ['Guild Procession', chain_drive], flywheel: ['Tithe Barn', flywheel],
  timer_switch: ['Royal Commission', timer_switch], belt_sorter: ['Grain Sorter', belt_sorter], salvage_hook: ['Ragpicker', salvage_hook], millrace: ['Changing of the Guard', millrace], slag_furnace: ['Lime Kiln', slag_furnace], spark_exchange: ['Favour Broker', spark_exchange],
  picket_line: ['Town Gossip', picket_line], corrosion_crew: ['Tax Farmer', corrosion_crew], noise_complaint: ['Guild Dispute', noise_complaint],
};
