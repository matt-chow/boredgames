/** Market cards, last third: law, money and the Crown (docs/ART_BIBLE.md). */
import {  } from './scene.mjs';

const armsOut = { armR: [[13, -102], [34, -92], [52, -92]], armL: [[-13, -102], [-20, -82], [-14, -66]] };

/** Court Informer: a dark colonnade, a hooded figure slips a note to a courtier's waiting hand. */
function whistleblower() {
  return rect(0, 0, W, 360, C.slateDeep, 0) + rect(420, 0, 220, 300, C.slate, 0) + [470, 560].map((x) => window3(x, 190, 56, 120, C.slateDark)).join('') + floorTiles(300).replaceAll(C.parchmentDark, C.slateDark) + fig(530, 306, 0.62, 'guard', { dir: -1, behind: pike(24, -2, 170) }) + column(390, 300, 300, 48, C.stone) + fig(174, 346, 1.82, 'hooded', { tilt: 6, armR: [[13, -102], [34, -88], [62, -82]], armL: [[-13, -102], [-20, -80], [-8, -68]], inFront: sheet(70, -74, 22, 14, false, -6) }) + fig(326, 346, 1.72, 'noble', { dir: -1, armR: [[13, -102], [30, -86], [46, -84]], armL: [[-13, -102], [-18, -84], [-10, -68]], tone: 0 }) + rect(0, 300, 80, 60, C.slateDeep, 0);
}

/** Sanctuary Writ: on the church step, the fugitive holds up the writ; pursuers halt at the gate. */
function ground_wire() {
  const church = rect(40, 54, 340, 256, C.stoneLight, LINE.heavy) + masonry(44, 60, 332, 244, 8, { rows: 16 }) + poly([[26, 54], [210, -30], [394, 54]], C.slateDark, LINE.heavy) + arch(210, 310, 150, 204, C.stone, LINE.heavy) + arch(210, 310, 124, 180, C.wood, LINE.form) + line(`M210 310V132M148 200H272M148 260H272`, LINE.form, C.woodDark) + ell(210, 86, 22, 22, C.slate, LINE.form) + rect(90, 120, 26, 56, C.slateDark, LINE.form) + rect(304, 120, 26, 56, C.slateDark, LINE.form);
  return sky(C.parchment) + cloud(450, 42, 110) + roofline(240, 3, { from: 380, h: 74 }) + church + rect(100, 310, 220, 12, C.ivory, LINE.form) + rect(86, 322, 248, 14, C.stoneLight, LINE.form) + paving(336, C.stone, 3) + rect(380, 240, 260, 96, C.parchmentDark, LINE.form) + fig(224, 316, 1.46, 'poor', { armR: [[13, -102], [30, -116], [40, -136]], armL: [[-13, -102], [-20, -82], [-14, -66]], tone: 1, inFront: sheet(46, -138, 28, 36, true, 6) }) + fig(482, 336, 1.14, 'guard', { dir: -1, armL: [[-13, -102], [-24, -92], [-40, -104]], behind: pike(24, -2, 180), lean: -5 }) + fig(572, 336, 1.1, 'guard', { dir: -1, top: C.burgundy, sleeve: C.burgundy, behind: pike(24, -2, 180) });
}

/** Usurer: one candle, a dark counter, pledges on the shelf behind and coin pushed forward. */
function redline_boiler() {
  const pledges = rect(60, 60, 520, 8, C.wood, LINE.form) + rect(60, 146, 520, 8, C.wood, LINE.form) + path(`M120 60V24C120 8 148 8 148 24V60Z`, C.gold, LINE.form) + rect(200, 30, 70, 30, C.burgundy, LINE.form) + ell(440, 40, 22, 20, C.stoneLight, LINE.form) + rect(510, 20, 18, 40, C.goldDark, LINE.form) + rect(96, 106, 90, 40, C.slateDark, LINE.form) + poly([[452, 146], [476, 92], [500, 146]], C.stoneLight, LINE.form) + rect(300, 100, 48, 46, C.sage, LINE.form);
  return rect(0, 0, W, 360, C.slateDeep, 0) + pledges + arch(310, 256, 300, 216, C.slateDark, LINE.form) + fig(310, 296, 1.76, 'hooded', { hat: 'black-cap', top: C.burgundyDark, sleeve: C.burgundyDark, gown: { fill: C.burgundyDark, fold: true }, tilt: 5, armR: [[13, -102], [32, -74], [42, -48]], armL: [[-13, -102], [-30, -74], [-30, -48]], collar: C.parchmentDark }) + rect(0, 256, W, 104, C.woodDark, LINE.heavy) + rect(0, 248, W, 14, C.wood, LINE.form) + candle(180, 250) + coins(360, 252, 18, 5) + coins(420, 252, 18, 3) + coins(476, 252, 16, 2) + book(270, 248, 76, 10) + rect(80, 214, 44, 34, C.woodLight, LINE.form);
}

/** Royal Audit: long table, open books, the chest unlocked and everybody counting. */
function pressure_test() {
  return room(C.stoneLight, C.stone, 256, 5) + pennon(298, 0, 44, 80) + window3(100, 176, 60, 110) + window3(540, 176, 60, 110) + fig(158, 296, 1.34, 'clerk', { pose: 'write', tilt: 9, armR: [[13, -102], [28, -82], [44, -78]] }) + fig(320, 296, 1.34, 'burgher', { pose: 'stand', gown: { fill: C.burgundyDark, trim: C.gold, fold: true }, tilt: 9, armR: [[13, -102], [22, -84], [12, -70]], armL: [[-13, -102], [-22, -84], [-12, -70]] }) + fig(482, 296, 1.34, 'clerk', { dir: -1, pose: 'write', tilt: 9, hat: 'beret', armR: [[13, -102], [28, -82], [44, -78]] }) + table(320, 340, 560, C.wood, 96, C.sageDark) + book(160, 232, 110, 14) + book(486, 232, 110, 14) + book(324, 232, 86, 12) + [[250, 236, 11, 4], [400, 236, 12, 3]].map(([x, y, r, n]) => coins(x, y, r, n)).join('') + chest(574, 356, 116, 70, true);
}

/** Royal Progress: the Crown on the road at the head of a column, banners and riders dwindling back. */
function overload_relay() {
  return sky() + cloud(390, 40, 110) + hills(160, C.slateLight, 40, 5) + path(`M0 188C200 160 440 190 640 170V360H0Z`, C.sage, LINE.form) + path(`M640 188C430 192 240 220 0 342V360H470C510 300 580 230 640 216Z`, C.parchmentDark, LINE.form) + [[596, 198, 0.34], [536, 214, 0.42], [468, 232, 0.54]].map(([x, y, s]) => rider(x, y, s, 'guard', { fig: { dir: 1, top: C.slate }, horse: { fill: C.stoneDark } }) + banner(x + 5, y - 22 * s, 196 * s, C.burgundy, C.gold, s)).join('') + rider(280, 342, 1.46, 'monarch', { horse: { fill: C.ivory, mane: C.stoneDark, cloth: C.burgundy }, fig: { gown: null, skirt: C.burgundy, hose: C.burgundyDark, armR: [[13, -102], [30, -96], [44, -88]], armL: [[-13, -102], [-20, -86], [14, -76]] } }) + fig(70, 348, 1.1, 'herald', { legs: 'walk', pose: 'raise', behind: banner(36, 0, 216, C.gold, C.burgundy, 1.1, 1) });
}

/** Debt Collector: his chest set down on the threshold, the debtor empty-handed in the doorway. */
function scrapyard_broker() {
  return sky() + house(330, 342, 310, 214, { wall: C.parchmentDark, roof: C.woodDark, door: false, windows: 2, peak: 0.34, frame: true }) + poly([[0, 170], [200, 180], [200, 342], [0, 342]], C.stone, LINE.heavy) + masonry(4, 182, 192, 156, 19, { rows: 10 }) + rect(0, 342, W, 18, C.stone, LINE.form) + arch(486, 342, 110, 146, C.slateDeep, LINE.heavy) + poly([[541, 342], [580, 330], [580, 216], [541, 196]], C.wood, LINE.heavy) + fig(482, 348, 1.42, 'farmer', { dir: -1, hat: 'bare', tone: 1, armR: [[13, -102], [30, -92], [48, -100]], armL: [[-13, -102], [-30, -92], [-48, -100]] }) + fig(170, 350, 1.62, 'merchant', { top: C.slateDeep, sleeve: C.slateDeep, skirt: C.slateDeep, hat: 'black-cap', armR: [[13, -102], [34, -92], [52, -88]], armL: [[-13, -102], [8, -86], [30, -86]], inFront: sheet(42, -70, 34, 42, true) }) + chest(318, 352, 104, 58, true, C.woodDark) + fig(56, 346, 1.24, 'guard', { behind: pike(26, -2, 170) });
}

/** Surveyor: open country and a straight line of stakes, the rod held out, a long cord pegged. */
function surveyor() {
  const stakes = [[238, 258, 0.5], [320, 236, 0.4], [394, 218, 0.32], [456, 204, 0.26], [510, 192, 0.2]].map(([x, y, s]) => line(`M${x} ${y}V${y - 60 * s}`, 3.4, C.ink) + line(`M${x} ${y}V${y - 60 * s}`, 1.6, C.woodLight) + path(`M${x} ${y - 60 * s}l${16 * s} 5l${-16 * s} 6Z`, C.terra, LINE.fine)).join('');
  return sky() + cloud(70, 56, 110) + cloud(490, 42, 90) + hills(160, C.slateLight, 30, 21) + hills(190, C.sageLight, 28, 4) + ground(190, C.sage) + tree(574, 214, 0.7) + line(`M130 288L510 192`, LINE.fine, C.ivory) + stakes + fig(148, 344, 1.72, 'scholar', { legs: 'walk', hat: 'beret', top: C.slate, sleeve: C.slateDark, gown: null, skirt: C.slateDark, hose: C.woodDark, armR: [[13, -102], [38, -90], [58, -88]], armL: [[-13, -102], [-22, -82], [-30, -60]], inFront: line(`M58 -180V2`, 5.4) + line(`M58 -180V2`, 3, C.woodLight) + line(`M56 -150h6M56 -120h6M56 -90h6M56 -60h6M56 -30h6`, 2, C.woodDark) + scroll(-34, -54, 34, 80) }) + fig(442, 326, 1.08, 'farmer', { dir: -1, pose: 'reach', tone: 1 });
}

/** Borough Reeve: a town-hall stair, a rule read from the top step, a stick for pointing at it. */
function zoning_board() {
  const hall = rect(90, 30, 460, 240, C.parchment, LINE.heavy) + poly([[70, 30], [320, -30], [570, 30]], C.terra, LINE.heavy) + rect(90, 110, 460, 8, C.woodDark, LINE.fine) + [150, 250, 390, 490].map((x) => window3(x, 96, 40, 52)).join('') + door(320, 270, 90, 136) + rect(462, 160, 66, 88, C.ivory, LINE.form) + line(`M472 176H518M472 192H518M472 208H506M472 224H518`, LINE.fine, C.stoneDark);
  return sky() + hall + rect(216, 262, 208, 10, C.stoneLight, LINE.form) + rect(198, 272, 244, 12, C.stoneLight, LINE.form) + rect(178, 284, 284, 12, C.stoneLight, LINE.form) + paving(296, C.stone, 16) + fig(320, 264, 1.1, 'burgher', { top: C.burgundy, gown: { fill: C.burgundy, fold: true, trim: C.gold }, belt: C.gold, hat: 'black-cap', armR: [[13, -102], [30, -114], [48, -128]], armL: [[-13, -102], [8, -88], [24, -92]], inFront: scroll(30, -90, 24, 80) }) + fig(92, 346, 1.24, 'wife', { tone: 1, pose: 'hip' }) + fig(196, 350, 1.3, 'smith', { dir: -1, hat: 'cap', tone: 2 }) + fig(442, 352, 1.26, 'merchant', { dir: -1, pose: 'whisper' }) + fig(558, 346, 1.2, 'farmer', { dir: -1, pose: 'hip', tone: 1 });
}

/** Royal Dedication: a new gate hung with garlands, the monarch's cord pulled, a cheering crowd. */
function ribbon_cutter() {
  const gate = rect(200, 40, 240, 244, C.ivory, LINE.heavy) + masonry(204, 46, 232, 234, 5, { rows: 16 }) + arch(320, 284, 118, 170, C.sky, LINE.heavy) + rect(190, 30, 260, 14, C.stoneLight, LINE.form) + poly([[220, 30], [320, -14], [420, 30]], C.goldLight, LINE.form);
  const garland = path(`M200 96C240 146 280 150 320 110C360 150 400 146 440 96`, 'none', 9, C.sageDark) + path(`M200 96C240 146 280 150 320 110C360 150 400 146 440 96`, 'none', 4, C.sage) + [[240, 124], [278, 130], [362, 130], [400, 124]].map(([x, y]) => ell(x, y, 5, 5, C.burgundyLight, LINE.fine)).join('');
  const cord = path(`M262 228C300 246 340 246 378 228`, 'none', 7, C.ink) + path(`M262 228C300 246 340 246 378 228`, 'none', 4, C.burgundy);
  return sky() + cloud(30, 50, 110) + cloud(500, 56, 100) + wall(0, 284, 200, 134, C.stone, 3) + wall(440, 284, 200, 134, C.stone, 6) + gate + garland + paving(284, C.stone, 11) + cord + fig(248, 346, 1.46, 'monarch', { armR: [[13, -102], [14, -80], [10, -86]], armL: [[-13, -102], [-20, -82], [-14, -68]], inFront: poly([[6, -92], [14, -82], [10, -60], [4, -70]], C.slateLight, LINE.fine) }) + fig(84, 334, 1.14, 'herald', { pose: 'raise', behind: banner(26, 0, 196, C.burgundy, C.gold, 1) }) + fig(166, 322, 0.92, 'lady', {}) + fig(420, 330, 1.04, 'goodwife', { dir: -1, pose: 'cheer', tone: 1 }) + fig(500, 340, 1.12, 'smith', { dir: -1, pose: 'cheer', hat: 'cap', tone: 2 }) + fig(586, 330, 1.02, 'farmer', { dir: -1, pose: 'cheer' });
}

/** Bellman: mid-stride through a lane, handbell swung high, notice in the other hand. */
function town_crier() {
  return sky(C.skyLow) + roofline(150, 14, { h: 66 }) + house(0, 268, 160, 150, { frame: true, windows: 2, door: false, wall: C.parchment, sw: LINE.heavy }) + house(480, 268, 170, 150, { frame: true, windows: 2, door: true, wall: C.stoneLight, sw: LINE.heavy }) + rect(160, 150, 320, 118, C.parchmentDark, LINE.form) + arch(320, 268, 100, 90, C.woodDark, LINE.form) + paving(268, C.stone, 24) + fig(304, 348, 1.92, 'herald', { legs: 'walk', hat: 'feather', armR: [[13, -102], [32, -116], [52, -136]], armL: [[-13, -102], [-30, -88], [-40, -74]], inFront: `<g transform="rotate(26 56 -148)">${line(`M56 -158V-140`, 5, C.woodDark)}${bell(56, -116, 0.68)}</g>` + scroll(-42, -66, 34, 60) }) + line(`M430 92q14 8 16 22M452 74q20 12 22 34M410 76q2 -14 12 -22`, LINE.form + 0.6, C.goldDark) + fig(82, 330, 0.9, 'wife', { pose: 'whisper', tone: 1 }) + fig(556, 334, 0.94, 'smith', { dir: -1, hat: 'cap', pose: 'hip', tone: 2 });
}

/** Civic Tribute: a line of townsfolk bringing sacks and coin to a chest beneath the belfry. */
function civic_bond() {
  const belfry = rect(450, 0, 150, 280, C.stoneLight, LINE.heavy) + masonry(454, 106, 142, 170, 15, { rows: 11 }) + arch(525, 94, 90, 90, C.slateDeep, LINE.form) + bell(525, 74, 1) + arch(525, 280, 90, 130, C.slateDark, LINE.form);
  return sky() + roofline(190, 3, { to: 450, h: 74 }) + belfry + paving(258, C.stone, 12) + rect(0, 190, 450, 68, C.parchment, LINE.form) + chest(446, 330, 150, 80, true, C.wood) + coins(402, 330, 13, 3) + coins(492, 330, 13, 2) + fig(586, 340, 1.28, 'clerk', { dir: -1, pose: 'write', inFront: book(34, -76, 42, 6) }) + fig(310, 344, 1.5, 'farmer', { armR: [[13, -102], [34, -86], [58, -76]], armL: [[-13, -102], [18, -80], [46, -72]], tone: 1, inFront: sack(48, -46, 0.68) }) + fig(186, 340, 1.26, 'goodwife', { tone: 2, armR: [[13, -102], [30, -90], [46, -88]], inFront: purse(50, -70, 0.5, C.wood) }) + fig(92, 322, 1.04, 'worker', { pose: 'head', inFront: sack(0, -130, 0.66) }) + fig(28, 306, 0.86, 'wife', { pose: 'give' });
}

/** Civic Charter: the great sheet with its seal held between Crown and town, chains of office below. */
function city_charter() {
  return room(C.parchment, C.burgundy, 262, 9) + rect(0, 262, W, 98, C.burgundy, LINE.form) + tapestry(40, 16, 120, 186, C.sageDark, C.gold) + tapestry(480, 16, 120, 186, C.sageDark, C.gold) + window3(320, 170, 80, 140) + fig(148, 346, 1.56, 'monarch', { armR: [[13, -102], [40, -100], [68, -96]], armL: [[-13, -102], [-20, -84], [-12, -68]] }) + `<g transform="rotate(-2 320 224)">` + rect(254, 148, 132, 96, C.ivory, LINE.heavy) + line(`M268 164H372M268 178H372M268 192H372M268 206H372M268 220H340`, LINE.form, C.stoneDark) + `</g>` + line(`M320 244V264`, 2, C.burgundyDark) + ell(320, 276, 15, 15, C.burgundyLight, LINE.form) + fig(490, 346, 1.5, 'burgher', { dir: -1, belt: C.gold, armR: [[13, -102], [40, -102], [72, -102]], armL: [[-13, -102], [-20, -84], [-12, -68]], top: C.slateDark, gown: { fill: C.slateDark, fold: true, trim: C.gold }, collar: C.gold }) + fig(586, 330, 1.12, 'burgher', { dir: -1, hat: 'beret', collar: C.gold });
}

/** Guild Register: the great book itself, fills the desk, names in columns, the warden's hand on it. */
function patent_ledger() {
  const leaf = path(`M76 300C160 262 260 268 318 300V120C260 96 160 90 76 128Z`, C.ivory, LINE.heavy) + path(`M564 300C480 262 380 268 322 300V120C380 96 480 90 564 128Z`, C.ivory, LINE.heavy);
  let writing = '';
  for (let i = 0; i < 8; i++) writing += `M${104} ${138 + i * 18}Q200 ${118 + i * 18} 290 ${132 + i * 18}M${350} ${132 + i * 18}Q440 ${118 + i * 18} ${536 - (i === 7 ? 90 : 0)} ${138 + i * 18}`;
  return rect(0, 0, W, 360, C.woodDark, 0) + line(`M0 60H640M0 180H640M0 300H640`, 1.2, C.ink) + fig(320, 216, 1.26, 'burgher', { top: C.burgundy, gown: { fill: C.burgundy, trim: C.gold }, hat: 'black-cap', collar: C.gold }) + rect(52, 118, 536, 200, C.burgundy, LINE.heavy) + leaf + line(writing, LINE.form, C.slateDark) + path(`M452 318V360H476V318Z`, C.burgundyLight, LINE.form) + ell(578, 66, 26, 26, C.gold, LINE.heavy) + poly([[578, 48], [594, 66], [578, 84], [562, 66]], C.burgundy, LINE.form) + line(`M498 196L536 106`, 2.6) + path(`M536 106C552 92 554 70 548 60C534 70 528 90 536 106Z`, C.ivory, LINE.fine) + rect(36, 22, 60, 64, C.slate, LINE.form) + ell(66, 22, 30, 8, C.slateDark, LINE.form) + line(`M60 22L96 -30`, 3);
}

/** Heraldic Painter: a great shield on the easel, brush up, pots of colour at the foot. */
function plaque_foundry() {
  const pots = [[52, C.burgundy], [100, C.gold], [148, C.slate], [196, C.sage]].map(([x, c]) => rect(x - 18, 318, 36, 30, C.woodLight, LINE.form) + ell(x, 318, 18, 6, c, LINE.form)).join('');
  return room(C.parchment, C.woodLight, 296, 7) + window3(80, 186, 72, 130) + line(`M360 346L424 44M566 346L500 44M398 300H528`, 7, C.ink) + line(`M360 346L424 44M566 346L500 44M398 300H528`, 4, C.wood) + shield(464, 290, 3.2) + fig(250, 346, 1.82, 'scholar', { top: C.sageDark, sleeve: C.sageDeep, gown: null, skirt: C.sageDark, hose: C.woodDark, hat: 'beret', legs: 'brace', armR: [[13, -102], [40, -100], [66, -118]], armL: [[-13, -102], [-26, -84], [-32, -70]], inFront: line(`M66 -118L88 -130`, 3) + path(`M88 -130l6 -3l3 5l-5 3Z`, C.burgundy, LINE.fine) + ell(-38, -66, 18, 11, C.woodLight, LINE.form) + ell(-44, -68, 3, 3, C.burgundy, 1) + ell(-36, -71, 3, 3, C.gold, 1) + ell(-30, -66, 3, 3, C.slate, 1) }) + pots;
}

/** Mintmaster: hammer falling above the hearth's glow, a worker with sacks of blanks behind. */
function mintmaster() {
  const hood = poly([[396, 0], [640, 0], [640, 110], [430, 110]], C.stone, LINE.heavy) + rect(420, 106, 220, 150, C.slateDeep, LINE.heavy) + rect(400, 256, 240, 44, C.stoneDark, LINE.heavy) + flame(470, 254, 1.6) + flame(560, 254, 1.9) + flame(516, 254, 1);
  return room(C.stoneDark, C.stone, 300, 8) + hood + fig(190, 350, 1.74, 'smith', { hat: 'black-cap', top: C.burgundy, sleeve: C.burgundy, collar: C.gold, legs: 'brace', armR: [[13, -102], [30, -124], [42, -150]], armL: [[-13, -102], [18, -84], [48, -78]], inFront: rect(30, -174, 52, 20, C.slate, LINE.form) + line(`M42 -152L52 -174`, 5, C.woodDark) }) + rect(250, 280, 70, 68, C.woodDark, LINE.heavy) + rect(264, 246, 40, 34, C.slateLight, LINE.form) + coins(366, 348, 18, 4) + fig(70, 344, 1.18, 'worker', { pose: 'head', hat: 'cap', tone: 1, inFront: sack(0, -130, 0.8) });
}

/** Estate Surveyor: plans on a boundary stone at the field's edge, the manor up on its rise. */
function estate_surveyor() {
  const manor = rect(350, 68, 200, 82, C.stoneLight, LINE.heavy) + poly([[338, 68], [388, 26], [512, 26], [562, 68]], C.terraDark, LINE.heavy) + [388, 450, 512].map((x) => rect(x - 8, 88, 16, 32, C.slateDark, LINE.fine)).join('') + arch(450, 150, 28, 36, C.woodDark, LINE.fine);
  return sky() + cloud(60, 50) + hills(120, C.slateLight, 30, 11) + path(`M0 180C200 170 280 130 440 140C520 146 590 150 640 150V360H0Z`, C.sageLight, LINE.form) + manor + cypress(322, 150, 80) + cypress(586, 150, 80) + poly([[0, 240], [640, 214], [640, 360], [0, 360]], C.goldLight, LINE.form) + line(`M60 240L0 360M180 236L140 360M300 232L280 360M420 226L430 360M530 222L570 360`, 1.8, C.goldDark) + line(`M0 230L640 204`, 3.4, C.woodDark) + [60, 180, 300, 420, 540].map((x) => rect(x - 4, 200 - x * 0.04, 8, 44, C.woodLight, LINE.form)).join('') + rect(280, 296, 90, 56, C.stone, LINE.heavy) + sheet(324, 296, 88, 16, false) + fig(190, 348, 1.56, 'burgher', { hat: 'beret', armR: [[13, -102], [40, -96], [66, -84]], armL: [[-13, -102], [-20, -82], [-14, -68]] }) + fig(462, 350, 1.42, 'farmer', { dir: -1, armR: [[13, -102], [36, -106], [68, -128]], armL: [[-13, -102], [-20, -82], [-16, -66]], tone: 1 });
}

/** Purification House: bundles carried across a yard to a whitewashed almshouse, smoke from behind. */
function purification_house() {
  const house2 = rect(280, 80, 360, 210, C.ivory, LINE.heavy) + poly([[262, 80], [460, 8], [660, 80]], C.terra, LINE.heavy) + [340, 580].map((x) => window3(x, 170, 40, 58)).join('') + arch(460, 290, 84, 120, C.woodDark, LINE.form) + line(`M280 240H640`, LINE.fine, C.stoneLight);
  const fire = rect(90, 300, 128, 14, C.stoneDark, LINE.form) + flame(120, 300, 1.2) + flame(158, 300, 1.8) + flame(198, 300, 1.2) + path(`M150 200C126 160 172 142 148 100C136 76 160 50 146 24`, 'none', 7, C.stoneDark);
  return sky(C.parchment) + cloud(10, 50) + house2 + paving(290, C.stone, 4) + fire + fig(330, 344, 1.56, 'wife', { dir: -1, hat: 'coif', armR: [[13, -102], [28, -80], [44, -74]], armL: [[-13, -102], [18, -80], [38, -74]], tone: 1, inFront: rect(20, -92, 56, 28, C.terraDark, LINE.form) + line(`M36 -92V-64M58 -92V-64`, 2, C.woodDark) }) + fig(500, 348, 1.42, 'monk', { dir: -1, pose: 'head', top: C.parchmentDark, gown: { fill: C.parchmentDark, fold: true }, inFront: bale(0, -120, 58, 30, C.stoneDark) }) + fig(590, 346, 1.1, 'poor', { dir: -1, tone: 2 }) + bale(46, 340, 72, 36, C.burgundyLight);
}

/** Salvage Office: an old chest on the big weighing beam, a receipt slid over the counter. */
function salvage_office() {
  return rect(0, 0, W, 360, C.woodLight, 0) + line(`M0 66H640M0 132H640M0 198H640`, 1.2, C.wood) + rect(0, 0, W, 22, C.woodDark, LINE.form) + line(`M210 22V60`, 6) + line(`M86 60L334 76`, 8) + line(`M86 60L334 76`, 4, C.woodLight) + line(`M86 60V130M334 76V110`, LINE.form) + chest(86, 192, 104, 62, false, C.stone, C.stoneDeep) + rect(30, 192, 112, 9, C.woodDark, LINE.form) + coins(334, 150, 15, 4, C.stoneLight) + rect(308, 150, 52, 8, C.woodDark, LINE.form) + line(`M334 110L316 150M334 110L352 150`, LINE.fine) + fig(490, 280, 1.56, 'clerk', { dir: -1, armR: [[13, -102], [34, -76], [52, -66]], armL: [[-13, -102], [-20, -84], [10, -74]], hat: 'beret' }) + rect(0, 214, W, 146, C.wood, LINE.heavy) + rect(0, 206, W, 12, C.woodDark, LINE.form) + sheet(372, 204, 52, 22, true) + book(508, 204, 76, 10) + fig(116, 372, 1.6, 'farmer', { hat: 'bare', tone: 1, armR: [[13, -102], [38, -96], [58, -102]] }) + coins(214, 204, 13, 3);
}

/** Reclamation Guild: broken goods loaded on a cart from a yard behind a tall house. */
function reclamation_guild() {
  const brokenLoad = path(`M140 298L176 262L226 268L262 300Z`, C.stoneDark, LINE.form) + line(`M180 258L188 220M210 266L222 234M240 278L270 256`, 5, C.woodDark) + wheel(204, 244, 22) + rect(140, 276, 60, 22, C.woodLight, LINE.form);
  return sky() + rect(330, 0, 310, 300, C.parchmentDark, LINE.heavy) + line(`M330 80H640M330 180H640M420 0V300M540 0V300`, LINE.form, C.woodDark) + rect(450, 40, 60, 60, C.slateDark, LINE.form) + rect(450, 118, 60, 56, C.slateDark, LINE.form) + arch(480, 300, 60, 98, C.woodDark, LINE.form) + rect(0, 200, 330, 96, C.stone, LINE.heavy) + masonry(4, 208, 322, 86, 21, { rows: 6 }) + paving(296, C.stone, 3) + cart(200, 346, 170, brokenLoad, C.woodDark) + fig(412, 346, 1.62, 'worker', { dir: -1, legs: 'brace', tone: 1, armR: [[13, -102], [36, -86], [66, -82]], armL: [[-13, -102], [8, -84], [40, -74]], inFront: `<g transform="translate(70 -90) rotate(14)">${rect(-34, -28, 68, 40, C.wood, LINE.form)}${line(`M-34 -8H34M-12 -28L-4 12`, LINE.fine, C.woodDark)}</g>` }) + fig(560, 342, 1.2, 'merchant', { dir: -1, pose: 'write', inFront: book(36, -76, 42, 6), hat: 'black-cap' }) + fig(58, 342, 1.2, 'smith', { hat: 'cap', tone: 2, pose: 'pull' });
}

/** Royal Tax Collector: a table set at the roadside, sack emptied, a crowned badge on the chest. */
function royal_tax_collector() {
  return sky() + hills(150, C.slateLight, 30, 13) + ground(190, C.sage) + path(`M0 250C220 214 430 220 640 200V360H0Z`, C.parchmentDark, LINE.form) + tree(70, 232, 1.14) + banner(556, 300, 190, C.burgundy, C.gold, 1.3, -1) + fig(320, 268, 1.28, 'noble', { hat: 'crown', top: C.burgundy, gown: { fill: C.burgundy, fold: true, trim: C.gold }, armR: [[13, -102], [30, -78], [40, -66]], armL: [[-13, -102], [-30, -78], [-40, -66]] }) + table(320, 332, 300, C.woodLight, 66, C.burgundyDark) + coins(290, 258, 16, 3) + coins(344, 258, 16, 4) + coins(400, 258, 14, 2) + book(234, 256, 58, 8) + sack(462, 342, 1.3) + fig(108, 346, 1.3, 'farmer', { armR: [[13, -102], [34, -88], [52, -86]], tone: 1, inFront: sack(60, -40, 0.62) }) + fig(574, 342, 1.2, 'guard', { dir: -1, behind: pike(24, -2, 180) });
}

/** Royal Scrivener: striking the line through a debt, one flame in the dark, crown on the wall. */
function royal_scrivener() {
  const glow = arch(300, 250, 360, 240, C.slateDark, LINE.form);
  return rect(0, 0, W, 360, C.slateDeep, 0) + glow + pennon(290, 0, 60, 86, C.burgundyDark, C.goldDark) + fig(286, 300, 1.74, 'clerk', { hat: 'black-cap', top: C.slate, sleeve: C.slateDark, gown: { fill: C.slate, fold: true }, tilt: 10, lean: 6, armR: [[13, -102], [32, -76], [60, -58]], armL: [[-13, -102], [12, -82], [36, -68]], inFront: line(`M60 -58L78 -82`, 2) + path(`M78 -82C88 -92 88 -106 84 -112C76 -106 72 -92 78 -82Z`, C.ivory, LINE.fine) }) + rect(0, 250, W, 110, C.woodDark, LINE.heavy) + rect(0, 242, W, 12, C.wood, LINE.form) + book(372, 240, 180, 18) + line(`M300 228H366`, 2.2, C.burgundyLight) + line(`M394 228H450`, 1.2, C.stoneDark) + line(`M394 234H446`, 1.2, C.stoneDark) + candle(196, 244) + rect(530, 214, 62, 30, C.burgundy, LINE.form) + rect(516, 194, 70, 20, C.slate, LINE.form);
}

/** Noble Resettlement: a family and their cart on the near bank, the new hall across the water. */
function noble_resettlement() {
  const hall = rect(420, 62, 160, 76, C.stoneLight, LINE.heavy) + poly([[410, 62], [500, 18], [590, 62]], C.terra, LINE.heavy) + [456, 500, 544].map((x) => rect(x - 7, 80, 14, 28, C.slateDark, LINE.fine)).join('');
  return sky() + cloud(60, 54, 100) + hills(130, C.slateLight, 30, 4) + path(`M0 150C200 146 430 138 640 138V170H0Z`, C.sageLight, LINE.form) + hall + cypress(396, 138, 60) + cypress(604, 138, 60) + rect(0, 160, W, 90, C.slateLight, LINE.form) + line(`M60 192q20 -5 40 0M200 214q20 -5 40 0M420 190q20 -5 40 0M540 222q20 -5 40 0`, LINE.fine, C.slate) + path(`M0 256C200 232 420 240 640 256V360H0Z`, C.sage, LINE.heavy) + cart(148, 342, 180, chest(150, 300, 86, 44) + barrel(94, 296, 0.7) + bale(214, 296, 46, 30, C.burgundyLight)) + fig(346, 346, 1.46, 'noble', { pose: 'point', legs: null, armR: [[13, -102], [36, -116], [60, -136]] }) + fig(456, 346, 1.4, 'lady', { dir: 1, armR: [[13, -102], [20, -82], [18, -70]] }) + fig(540, 334, 0.92, 'page', { hat: 'bare', tone: 0 });
}

/** Burden Relief: a neighbour lifts the great bundle from a bowed back in the lane. */
function burden_relief() {
  return sky(C.skyLow) + house(-20, 266, 220, 170, { frame: true, windows: 2, door: true, wall: C.parchment, sw: LINE.heavy }) + house(440, 266, 220, 170, { frame: true, windows: 2, door: true, wall: C.parchmentDark, roof: C.woodDark, sw: LINE.heavy }) + tree(320, 240, 0.96) + rect(200, 240, 240, 26, C.stone, LINE.form) + paving(266, C.stone, 22) + fig(236, 346, 1.62, 'poor', { dir: -1, hat: 'bare', tilt: 16, lean: 22, legs: 'brace', armR: [[13, -102], [30, -78], [40, -46]], armL: [[-13, -102], [14, -76], [20, -46]], tone: 1 }) + `<g transform="translate(84 6) rotate(10 240 150)">` + path(`M144 180C130 110 200 84 262 92C330 104 340 170 300 200C250 216 170 210 144 180Z`, C.terraDark, LINE.heavy) + line(`M170 110C200 150 240 184 290 196M220 94C250 130 290 150 322 162M150 150C190 164 240 170 276 96`, LINE.form, C.woodDark) + `</g>` + fig(508, 346, 1.62, 'farmer', { dir: -1, legs: 'brace', hat: 'cap', tone: 2, armR: [[13, -102], [40, -118], [64, -128]], armL: [[-13, -102], [14, -120], [50, -132]], lean: 6 });
}

/** Treasury Auditor: stacked columns of coin in a low vault, each one checked against the ledger. */
function treasury_auditor() {
  let stacks = '';
  [[372, 8], [420, 11], [468, 6], [516, 13], [564, 9], [396, 4], [444, 5], [492, 8], [540, 4]].forEach(([x, n], i) => (stacks += coins(x, i < 5 ? 256 : 304, 22, n)));
  return rect(0, 0, W, 360, C.stoneDark, 0) + path(`M0 0H640V30C560 110 430 110 320 40C210 110 80 110 0 30Z`, C.stone, LINE.heavy) + arch(476, 260, 230, 160, C.slateDeep, LINE.form) + arch(160, 260, 200, 150, C.slateDark, LINE.form) + rect(0, 318, W, 42, C.stone, LINE.form) + stacks + fig(180, 346, 1.82, 'clerk', { hat: 'beret', armR: [[13, -102], [34, -96], [52, -112]], armL: [[-13, -102], [12, -84], [34, -78]], inFront: book(36, -78, 58, 10) + line(`M52 -112L60 -130`, 2) });
}

/** Spice Exchange: bright awning, open sacks in reds and golds, a harbour mast behind. */
function spice_exchange() {
  const open = (x, y, s, fill) => sack(x, y, s, C.parchment).replace(/<path[^>]*?\/>$/, '') + ell(x, y - 52 * s, 16 * s, 6 * s, fill, LINE.fine);
  return sky() + water(170) + ship(530, 216, 0.82, { furled: true }) + rect(0, 216, W, 144, C.stone, LINE.heavy) + stall(28, 286, 584, 248, C.gold, C.terra, 12) + path(`M46 262C70 232 100 232 124 262Z`, C.terra, LINE.form) + fig(320, 280, 1.38, 'merchant', { top: C.terra, sleeve: C.gold, skirt: C.gold, hat: 'kerchief', armR: [[13, -102], [38, -92], [58, -96]], armL: [[-13, -102], [-30, -90], [-34, -76]], inFront: ell(60, -94, 13, 6, C.gold, LINE.fine) }) + rect(28, 244, 584, 42, C.wood, LINE.form) + rect(25, 240, 590, 7, C.woodLight, LINE.form) + [[104, 346, 1.46, C.burgundyLight], [188, 352, 1.36, C.gold], [270, 346, 1.46, C.terra], [376, 352, 1.46, C.sage], [460, 346, 1.46, C.goldDark], [546, 352, 1.46, C.burgundy]].map(([x, y, s, c]) => sack(x, y, s, C.parchment) + ell(x, y - 42 * s, 15 * s, 6 * s, c, LINE.form)).join('');
}

/** Trade Bonds: paper and coin on a table, seen from high up, two pairs of sleeves crossing. */
function trade_bonds() {
  const arm = (d, fill, cuff) => path(d, fill, LINE.heavy) + cuff;
  return rect(0, 0, W, 360, C.wood, 0) + line(`M0 90H640M0 180H640M0 270H640`, 2, C.woodDark) + line(`M100 0V90M380 90V180M210 180V270M500 270V360`, 1.2, C.woodDark) + `<g transform="rotate(-6 320 180)">` + rect(190, 56, 260, 240, C.ivory, LINE.heavy) + rect(204, 70, 232, 212, 'none', LINE.fine, C.goldDark) + line(`M226 100H414M226 124H414M226 148H414M226 172H380M226 196H414`, LINE.form, C.stoneDark) + line(`M226 244H302M340 244H414`, LINE.form, C.slateDark) + `</g>` + ell(322, 306, 18, 14, C.burgundy, LINE.form) + arm(`M0 90L164 148L172 188L0 164Z`, C.burgundy, ell(174, 170, 14, 16, C.skin[0], LINE.form)) + arm(`M640 196L482 240L474 280L640 268Z`, C.slateDark, ell(470, 262, 14, 16, C.skin[1], LINE.form)) + line(`M484 256L396 232`, 2.6, C.ink) + path(`M396 232C384 226 372 212 372 204C382 208 396 220 396 232Z`, C.ivory, LINE.fine) + coins(112, 270, 30, 5) + coins(54, 320, 26, 3) + coins(560, 110, 28, 4) + coin(170, 306, 12);
}

/** Royal Mint: rows of coiners at their blocks under the royal banner, hammers in rhythm. */
function royal_mint() {
  const coiner = (x, y, s, up, who) => rect(x + 38 * s, y - 52 * s, 34 * s, 52 * s, C.woodDark, LINE.form) + fig(x, y, s, who, { hat: 'cap', armR: up ? [[13, -102], [28, -122], [36, -142]] : [[13, -102], [34, -82], [50, -66]], armL: [[-13, -102], [12, -84], [40, -66]], inFront: up ? line(`M36 -142L48 -160`, 4) + rect(40, -172, 26, 14, C.slate, 1.6) : rect(46, -82, 26, 14, C.slate, 1.6) });
  return room(C.stoneLight, C.stone, 216, 9) + [[92], [548]].map(([x]) => window3(x, 150, 60, 110)).join('') + pennon(214, 0, 212, 120) + poly([[278, 92], [268, 46], [298, 66], [320, 34], [342, 66], [372, 46], [362, 92]], C.gold, LINE.form) + floorTiles(216) + coiner(120, 246, 0.72, true, 'smith') + coiner(270, 246, 0.72, false, 'worker') + coiner(420, 246, 0.72, true, 'smith') + coiner(40, 296, 1.04, false, 'worker') + coiner(250, 296, 1.04, true, 'smith') + coiner(460, 296, 1.04, false, 'worker') + coins(116, 350, 22, 4) + coins(324, 354, 26, 3) + coins(560, 350, 22, 5);
}

/** Port Tariffs: barrels swung ashore, a customs officer's tally board in hand. */
function port_tariffs() {
  return sky() + water(170) + ship(520, 256, 1.06, { furled: true, flag: C.gold }) + line(`M430 104V210`, LINE.form) + barrel(430, 256, 0.92) + path(`M0 256L640 288V360H0Z`, C.stone, LINE.heavy) + masonry(4, 276, 630, 80, 8, { rows: 5, gaps: 0.35 }) + barrel(306, 306, 1.18) + barrel(352, 318, 1.18) + barrel(330, 262, 1) + barrel(258, 318, 1) + fig(150, 346, 1.82, 'guard', { hat: 'black-cap', top: C.slateDark, sleeve: C.slateDark, skirt: C.slateDark, armR: [[13, -102], [34, -90], [50, -86]], armL: [[-13, -102], [12, -86], [38, -72]], inFront: rect(30, -102, 34, 40, C.woodLight, LINE.form) + line(`M36 -92H58M36 -82H58M36 -72H52`, 1.4, C.woodDark) }) + fig(470, 350, 1.2, 'worker', { dir: -1, legs: 'brace', tone: 2, armR: [[13, -102], [36, -86], [56, -86]], armL: [[-13, -102], [14, -80], [44, -78]] }) + fig(566, 330, 1.02, 'merchant', { dir: -1, pose: 'whisper' });
}

/** Guild Auction: gavel up on a raised block, hands in the air across the square. */
function guild_auction() {
  const crowd = [[60, 354, 1.34, 'merchant', 0], [146, 346, 1.2, 'wife', 1], [238, 356, 1.3, 'burgher', 2], [404, 356, 1.3, 'merchant', 1], [494, 346, 1.22, 'noble', 0], [584, 354, 1.34, 'smith', 2]];
  return sky() + roofline(180, 22, { h: 96, sw: LINE.heavy }) + paving(240, C.stone, 3) + rect(238, 216, 164, 38, C.woodLight, LINE.heavy) + rect(216, 254, 208, 26, C.wood, LINE.heavy) + pennon(244, 40, 40, 58, C.sageDark) + pennon(356, 40, 40, 58) + line(`M244 40H396`, 4, C.woodDark) + bale(312, 216, 56, 26, C.burgundyLight) + fig(358, 216, 1.14, 'herald', { dir: -1, armR: [[13, -102], [34, -116], [40, -142]], armL: [[-13, -102], [-20, -84], [-12, -68]], inFront: line(`M40 -142L52 -166`, 3.6, C.woodDark) + rect(40, -176, 28, 15, C.woodLight, 1.8) }) + crowd.map(([x, y, s, w, t], i) => fig(x, y, s, w, { dir: x < 320 ? 1 : -1, tone: t, pose: i % 3 === 2 ? 'stand' : 'raise', hat: w === 'merchant' && i ? 'beret' : undefined })).join('');
}

/** Kingdom Courier: a lone rider between two hills, satchel flying, the road empty ahead. */
function kingdom_courier() {
  return rect(0, 0, W, 360, C.parchment, 0) + rect(0, 0, W, 86, C.sky, 0) + cloud(420, 40, 120) + path(`M0 210C70 80 200 60 300 230Z`, C.slateLight, LINE.form) + path(`M260 230C400 60 560 70 640 160V230Z`, C.sage, LINE.form) + path(`M0 240C220 216 420 216 640 240V360H0Z`, C.sageLight, LINE.form) + path(`M640 262C430 246 260 250 0 300V360H640Z`, C.parchmentDark, LINE.heavy) + cypress(110, 240, 86) + cypress(150, 244, 58) + rider(340, 332, 1.16, 'page', { horse: { fill: C.woodDark, mane: C.ink, gait: 'stand', cloth: C.slate }, fig: { top: C.slate, sleeve: C.slateDark, hose: C.woodDark, hat: 'feather', lean: 6, armR: [[13, -102], [30, -94], [48, -92]], armL: [[-13, -102], [-20, -84], [16, -80]], behind: path(`M-26 -96C-44 -74 -46 -54 -28 -48C-16 -50 -10 -72 -14 -94Z`, C.woodLight, 2.4) + line(`M-18 -100L10 -68`, 2.6, C.woodDark) } });
}

/** Hall of Archives: lantern-lit, the keeper up a ladder drawing one scroll from very tall shelves. */
function hall_of_archives() {
  return rect(0, 0, W, 360, C.slateDeep, 0) + shelves(40, 330, 180, 330, 2, 5) + shelves(236, 330, 170, 330, 3, 5) + shelves(422, 330, 180, 330, 11, 5) + rect(0, 330, W, 30, C.stoneDark, LINE.form) + lantern(320, 70, 16) + line(`M368 346L416 40M450 346L498 40`, 7) + line(`M368 346L416 40M450 346L498 40`, 3.8, C.woodLight) + [300, 256, 212, 168, 124, 80].map((y) => { const t = (346 - y) / 306 * 48; return line(`M${368 + t} ${y}H${450 + t}`, 6) + line(`M${368 + t} ${y}H${450 + t}`, 3, C.woodLight); }).join('') + fig(424, 256, 1.34, 'scholar', { top: C.burgundy, sleeve: C.burgundyDark, gown: null, hose: C.woodDark, skirt: C.burgundyDark, hat: 'black-cap', legL: [[-6, -56], [-8, -28], [-10, -3]], legR: [[6, -56], [18, -46], [20, -24]], armR: [[13, -102], [30, -116], [50, -126]], armL: [[-13, -102], [-18, -116], [-30, -136]], inFront: scroll(-34, -138, 32, 70) });
}

/** Great Council: down the long table to the throne, nobles lining it in rows. */
function great_council() {
  const left = [[176, 334, 1.46, 'noble'], [226, 268, 1.02, 'clerk'], [262, 224, 0.74, 'lady']];
  const right = [[464, 334, 1.46, 'burgher'], [414, 268, 1.02, 'noble'], [378, 224, 0.74, 'merchant']];
  const seats = (a, d) => a.slice().reverse().map(([x, y, s, w], i) => fig(x, y, s, w, { dir: d, tilt: 5, armR: [[13, -102], [28, -84], [44, -80]], tone: i % 3 })).join('');
  return rect(0, 0, W, 360, C.stone, 0) + vaultedRoof(C.stoneDark) + [90, 550].map((x) => window3(x, 182, 66, 130)).join('') + floorTiles(182) + tapestry(258, 52, 124, 90, C.burgundy, C.gold) + dais(320, 174, 110, 8) + rect(296, 86, 48, 88, C.burgundyDark, LINE.form) + poly([[296, 86], [320, 64], [344, 86]], C.gold, LINE.form) + fig(320, 172, 0.58, 'monarch', {}) + seats(left, 1) + seats(right, -1) + poly([[292, 184], [348, 184], [506, 360], [134, 360]], C.woodLight, LINE.heavy) + poly([[314, 184], [326, 184], [364, 360], [276, 360]], C.burgundy, LINE.form) + sheet(320, 330, 42, 44, true) + scroll(298, 236, 26, 12) + candle(250, 310) + candle(390, 310);
}

/** Edict of Inspection: a herald reads out the scroll while officers turn over a stall. */
function edict_of_inspection() {
  return sky() + roofline(170, 25, { h: 100 }) + paving(232, C.stone, 3) + stall(330, 324, 310, 216, C.sage, C.ivory, 8) + fig(470, 316, 1.22, 'guard', { dir: 1, top: C.burgundy, sleeve: C.burgundy, armR: [[13, -102], [30, -86], [48, -74]], armL: [[-13, -102], [8, -80], [34, -70]], tilt: 10, lean: 7 }) + rect(330, 286, 310, 38, C.wood, LINE.form) + rect(327, 282, 316, 6, C.woodLight, LINE.form) + sack(352, 336, 0.8) + `<g transform="rotate(66 584 330)">${barrel(584, 346, 1)}</g>` + sack(506, 352, 1, C.parchment) + fig(146, 346, 1.82, 'herald', { armR: [[13, -102], [30, -108], [46, -118]], armL: [[-13, -102], [14, -106], [34, -118]], hat: 'beret', inFront: rect(30, -160, 28, 48, C.ivory, LINE.form) + line(`M36 -148H52M36 -138H52M36 -128H50`, 1.4, C.stoneDark) + ell(44, -162, 15, 3, C.parchmentDark, 1.4) + ell(44, -110, 15, 3, C.parchmentDark, 1.4) }) + fig(286, 342, 1.2, 'wife', { dir: -1, tone: 1, pose: 'head', armR: [[13, -102], [28, -114], [14, -130]], armL: [[-13, -102], [-28, -114], [-14, -130]] });
}

/** Tax Arrears: halberds at a cottage door, a farmer braced between them and his family. */
function tax_arrears() {
  const cottage = rect(300, 110, 340, 186, C.parchment, LINE.heavy) + poly([[282, 110], [460, 30], [660, 110]], C.woodLight, LINE.heavy) + ticks(Array.from({ length: 16 }, (_, i) => [320 + i * 22, 60 + (i % 3) * 8, 306 + i * 22, 110]), LINE.fine, C.wood) + arch(470, 296, 88, 126, C.slateDeep, LINE.form) + poly([[514, 296], [552, 284], [552, 174], [514, 170]], C.wood, LINE.heavy) + rect(344, 170, 44, 36, C.slateDark, LINE.fine);
  return sky(C.parchmentDark) + cloud(60, 70, 110) + hills(170, C.slateLight, 24, 4) + ground(204) + tree(140, 240, 0.8) + cottage + path(`M0 296H640V360H0Z`, C.parchmentDark, LINE.form) + fig(470, 342, 1.04, 'wife', { dir: -1, pose: 'whisper', tone: 1 }) + fig(516, 330, 0.7, 'page', { dir: -1, hat: 'bare', top: C.stoneDark, sleeve: C.stoneDark, collar: null }) + fig(400, 348, 1.52, 'farmer', { dir: -1, hat: 'bare', tone: 1, armR: [[13, -102], [34, -96], [52, -100]], armL: [[-13, -102], [-30, -90], [-46, -84]] }) + fig(208, 348, 1.56, 'guard', { armR: [[13, -102], [36, -96], [50, -90]], armL: [[-13, -102], [14, -88], [36, -84]], legs: 'brace', inFront: line(`M-32 -46L102 -130`, 5.4) + line(`M-32 -46L102 -130`, 2.8, C.woodLight) + poly([[96, -144], [126, -142], [106, -116]], C.slateLight, LINE.form) }) + fig(80, 344, 1.3, 'clerk', { pose: 'write', inFront: book(36, -76, 42, 6) });
}

/** Royal Advocate: writ held up, the merchant behind, the court's bench looming. */
function royal_advocate() {
  const bench = rect(30, 96, 580, 114, C.woodDark, LINE.heavy) + rect(16, 86, 608, 16, C.wood, LINE.form) + line(`M120 110V198M240 110V198M400 110V198M520 110V198`, LINE.form, C.ink);
  return rect(0, 0, W, 360, C.stone, 0) + masonry(0, 0, W, 90, 9, { rows: 5 }) + pennon(286, 0, 68, 72) + fig(162, 200, 0.78, 'clerk', { hat: 'black-cap' }) + fig(322, 200, 0.82, 'burgher', { top: C.burgundy, gown: { fill: C.burgundy, trim: C.gold }, hat: 'black-cap' }) + fig(478, 200, 0.78, 'clerk', { hat: 'black-cap', dir: -1 }) + bench + floorTiles(210) + fig(504, 346, 1.26, 'merchant', { dir: -1, hat: 'bare', tilt: 8, armR: [[13, -102], [20, -116], [14, -130]], armL: [[-13, -102], [-20, -116], [-14, -130]], top: C.slateDark, skirt: C.slateDark, tone: 1 }) + fig(346, 348, 1.82, 'burgher', { dir: -1, top: C.slateDeep, sleeve: C.slateDark, gown: { fill: C.slateDeep, fold: true }, hat: 'beret', collar: C.ivory, armR: [[13, -102], [40, -118], [66, -136]], armL: [[-13, -102], [-30, -92], [-48, -84]], inFront: sheet(76, -138, 36, 44, true, -6) }) + fig(118, 346, 1.34, 'merchant', { top: C.burgundyDark, sleeve: C.burgundy, skirt: C.burgundyDark, armR: [[13, -102], [34, -96], [58, -104]], hat: 'feather' });
}

/** Court Saboteur: moonlight through a bedchamber window, a hooded hand in a noble's strongbox. */
function court_saboteur() {
  return rect(0, 0, W, 360, C.slateDeep, 0) + arch(180, 220, 130, 186, C.slateLight, LINE.heavy) + line(`M180 34V220M115 110H245M115 166H245`, LINE.form) + ell(208, 80, 18, 18, C.ivory, LINE.fine) + poly([[116, 220], [244, 220], [428, 360], [150, 360]], C.slateDark, 0) + rect(0, 284, W, 76, C.slateDark, LINE.form) + path(`M480 0H640V230H480Z`, C.burgundyDark, LINE.form) + line(`M520 0V230M560 0V230M600 0V230`, LINE.fine, C.ink) + rect(470, 230, 170, 70, C.slate, LINE.form) + fig(278, 348, 1.76, 'hooded', { lean: 10, tilt: 10, legs: null, armR: [[13, -102], [40, -86], [60, -70]], armL: [[-13, -102], [14, -78], [-10, -106]], inFront: sheet(0, -106, 24, 18, false, -14) }) + chest(428, 348, 138, 72, true, C.woodDark);
}

/** Noble Council: landholders in a green field round a noble on a stone, one banner, all listening. */
function noble_council() {
  return sky() + cloud(60, 60, 110) + cloud(450, 40, 100) + hills(150, C.slateLight, 30, 6) + roofline(170, 3, { from: 540, h: 26, sw: LINE.fine }) + ground(174, C.sage) + tree(116, 196, 1.2) + path(`M250 300C282 280 362 280 394 300L402 344H242Z`, C.stone, LINE.heavy) + banner(420, 288, 196, C.sageDark, C.gold, 1.4) + fig(320, 288, 1.42, 'noble', { armR: [[13, -102], [30, -116], [44, -134]], armL: [[-13, -102], [-20, -84], [-12, -68]], top: C.sageDark, sleeve: C.sageDeep, gown: { fill: C.sageDark, trim: C.gold, fold: true } }) + [[86, 348, 1.42, 'burgher', 1], [176, 342, 1.2, 'lady', 1], [484, 342, 1.2, 'merchant', -1], [570, 348, 1.42, 'noble', -1]].map(([x, y, s, w, d], i) => fig(x, y, s, w, { dir: d, tone: i % 3, armR: [[13, -102], [30, -84], [20, -68]] })).join('');
}

export const COURT = {
  whistleblower: ['Court Informer', whistleblower], ground_wire: ['Sanctuary Writ', ground_wire], redline_boiler: ['Usurer', redline_boiler], pressure_test: ['Royal Audit', pressure_test], overload_relay: ['Royal Progress', overload_relay], scrapyard_broker: ['Debt Collector', scrapyard_broker],
  surveyor: ['Surveyor', surveyor], zoning_board: ['Borough Reeve', zoning_board], ribbon_cutter: ['Royal Dedication', ribbon_cutter], town_crier: ['Bellman', town_crier], civic_bond: ['Civic Tribute', civic_bond], city_charter: ['Civic Charter', city_charter], patent_ledger: ['Guild Register', patent_ledger], plaque_foundry: ['Heraldic Painter', plaque_foundry],
  mintmaster: ['Mintmaster', mintmaster], estate_surveyor: ['Estate Surveyor', estate_surveyor], purification_house: ['Purification House', purification_house], salvage_office: ['Salvage Office', salvage_office], reclamation_guild: ['Reclamation Guild', reclamation_guild], royal_tax_collector: ['Royal Tax Collector', royal_tax_collector], royal_scrivener: ['Royal Scrivener', royal_scrivener],
  noble_resettlement: ['Noble Resettlement', noble_resettlement], burden_relief: ['Burden Relief', burden_relief], treasury_auditor: ['Treasury Auditor', treasury_auditor], spice_exchange: ['Spice Exchange', spice_exchange], trade_bonds: ['Trade Bonds', trade_bonds], royal_mint: ['Royal Mint', royal_mint], port_tariffs: ['Port Tariffs', port_tariffs], guild_auction: ['Guild Auction', guild_auction],
  kingdom_courier: ['Kingdom Courier', kingdom_courier], hall_of_archives: ['Hall of Archives', hall_of_archives], great_council: ['Great Council', great_council], edict_of_inspection: ['Edict of Inspection', edict_of_inspection], tax_arrears: ['Tax Arrears', tax_arrears], royal_advocate: ['Royal Advocate', royal_advocate], court_saboteur: ['Court Saboteur', court_saboteur], noble_council: ['Noble Council', noble_council],
};
