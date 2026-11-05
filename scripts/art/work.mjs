/** Market cards, first third: trades, clerks and the court (docs/ART_BIBLE.md). Activity scenes carry large figures. */
import {  } from './scene.mjs';

const tools = (x, y) => rect(x, y, 170, 58, C.wood, LINE.form) + line(`M${x + 20} ${y + 8}V${y + 44}M${x + 52} ${y + 8}V${y + 40}M${x + 86} ${y + 8}V${y + 46}M${x + 124} ${y + 8}V${y + 36}`, 3.4, C.woodDark) + rect(x + 10, y + 6, 20, 8, C.slateLight, LINE.fine) + rect(x + 46, y + 38, 12, 12, C.slateLight, LINE.fine) + poly([[x + 80, y + 46], [x + 92, y + 46], [x + 86, y + 54]], C.slateLight, LINE.fine) + path(`M${x + 112} ${y + 36}h26v8h-26Z`, C.slateLight, LINE.fine);

/** Guild Apprentice: a master guides a young hand at the bench. */
function gearwright() {
  return room(C.parchment, C.woodLight, 268, 11) + window3(96, 150, 62, 100) + tools(390, 56) + rect(216, 40, 120, 80, C.parchmentDark, LINE.form) + line(`M226 60H326M226 76H300M226 92H318`, LINE.fine, C.stoneDark) +
    fig(208, 338, 1.42, 'smith', { pose: 'both', hat: 'beret', tone: 1 }) + fig(446, 338, 1.1, 'page', { dir: -1, pose: 'both', apron: C.parchmentDark }) +
    table(324, 348, 310, C.wood, 80) + rect(276, 240, 90, 22, C.woodLight, LINE.form) + line(`M286 240V262M304 240V262M322 240V262`, LINE.fine, C.woodDark) + path(`M352 208L344 240M340 204l24 8l-4 10l-24 -8Z`, C.slateLight, LINE.form);
}

/** Morning Bell: pale dawn over the roofs, workers streaming out under a ringing belfry. */
function shift_bell() {
  const belfry = rect(452, 34, 118, 326, C.stone, LINE.heavy) + masonry(456, 150, 110, 200, 9, { rows: 12 }) + arch(511, 138, 74, 100, C.slateDeep, LINE.form) + line(`M478 50H544`, 6, C.woodDark) + bell(511, 112, 1.2) + poly([[440, 34], [511, -30], [582, 34]], C.terraDark, LINE.heavy) + line(`M490 92q-10 8 -18 8M534 92q10 8 18 8M478 76q-14 6 -22 6M544 76q14 6 22 6`, LINE.form, C.goldLight);
  return rect(0, 0, W, 360, C.goldLight, 0) + rect(0, 0, W, 90, C.sky, 0) + ell(160, 188, 66, 66, C.ivory, LINE.fine) + roofline(214, 8, { to: 452, h: 60 }) + paving(268, C.stone, 5) + rect(0, 214, 452, 56, C.stoneLight, LINE.form) + belfry +
    fig(90, 330, 1.0, 'worker', { legs: 'walk', pose: 'stand', tone: 1, behind: line(`M-8 -100L-36 -46`, 4, C.woodDark) }) + fig(200, 344, 1.14, 'smith', { legs: 'walk', hat: 'cap', tone: 2, inFront: rect(14, -66, 24, 16, C.wood, LINE.form) }) + fig(312, 330, 0.98, 'wife', { legs: null, pose: 'head', inFront: sack(0, -130, 0.66, C.parchment) }) + fig(406, 346, 1.06, 'farmer', { legs: 'walk', tone: 1, behind: line(`M-8 -98L-30 -160`, 3.4, C.woodDark) });
}

/** Tally Clerk: close on the clerk, quill and columns, at a heavy desk by a slit of daylight. */
function tally_clerk() {
  return room(C.stoneLight, C.woodDark, 300, 7) + window3(520, 150, 54, 110) + shelves(30, 300, 110, 240, 4, 5, 'books') +
    stool(306, 342, 62, 44) + fig(286, 300, 1.72, 'clerk', { pose: 'write', legs: 'sit', inFront: line(`M42 -80L58 -106`, 2) + path(`M58 -106C70 -116 70 -128 66 -134C58 -128 54 -116 58 -106Z`, C.ivory, LINE.fine) }) + table(386, 356, 310, C.wood, 96) + book(388, 248, 156, 16) + line(`M330 240H374M402 240H448M332 248H372M404 248H446`, LINE.fine, C.stoneDark) + coins(506, 252, 15, 4) + candle(256, 252, false);
}

/** Treadwheel Crane: the great wooden crane, a man walking inside the wheel, a block in the air. */
function supply_crane() {
  const [cx, cy] = [186, 262];
  const treadwheel = fig(cx + 2, cy + 56, 0.66, 'worker', { legs: 'walk', pose: 'reach', tone: 1 }) + ell(cx, cy, 72, 72, 'none', 8, C.ink) + ell(cx, cy, 72, 72, 'none', 4.6, C.woodLight) + ticks(Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return [cx, cy, cx + Math.cos(a) * 72, cy + Math.sin(a) * 72]; }), 2.4, C.woodDark);
  const jib = line(`M156 330L200 30L470 66`, 10) + line(`M156 330L200 30L470 66`, 6, C.woodLight) + line(`M236 330L200 30`, 10) + line(`M236 330L200 30`, 6, C.woodLight) + line(`M196 90L330 50`, 5) + line(`M470 66V170M200 40L470 62`, LINE.fine);
  const block = rect(424, 176, 92, 58, C.stoneLight, LINE.heavy) + masonry(428, 180, 84, 50, 3, { rows: 3 }) + line(`M470 170L432 178M470 170L508 178`, LINE.fine);
  return sky() + cloud(300, 90, 100) + hills(180, C.slateLight, 26, 9) + water(222) + path(`M0 310L640 276V360H0Z`, C.stone, LINE.heavy) + masonry(0, 300, W, 56, 6, { rows: 3, gaps: 0.4 }) + roofline(226, 7, { from: 500, to: 650, h: 40 }) + jib + block + treadwheel + fig(548, 322, 1.1, 'smith', { dir: -1, pose: 'raise', legs: 'brace', hat: 'cap', tone: 2 });
}

/** Coin Striker: one man, one hammer, one die. The blow is about to land. */
function copper_press() {
  return room(C.stoneDark, C.stone, 306, 15) + path(`M430 0H640V306H430Z`, C.slateDeep, LINE.heavy) + flame(530, 300, 2.6) + rect(452, 296, 170, 12, C.stoneDeep, LINE.form) +
    fig(216, 334, 1.46, 'smith', { pose: 'hammer', legs: 'brace', tone: 1, armR: [[13, -102], [34, -122], [52, -134]], armL: [[-13, -102], [14, -122], [40, -128]], inFront: line(`M40 -126L84 -176`, 5) + rect(74, -196, 38, 24, C.slate, LINE.form) }) +
    rect(326, 252, 62, 96, C.woodDark, LINE.heavy) + ell(357, 252, 31, 10, C.wood, LINE.form) + rect(342, 216, 28, 34, C.slateLight, LINE.form) + ell(356, 214, 16, 6, C.terra, LINE.form) + coins(90, 340, 26, 3, C.terraLight) + coins(434, 346, 15, 3, C.terraLight);
}

/** Royal Architect: plans unrolled for the mason, a hall rising in scaffolding behind them. */
function foreman() {
  const hall = rect(300, 90, 300, 190, C.stoneLight, LINE.heavy) + masonry(304, 96, 292, 180, 25, { rows: 12 }) + [352, 450, 548].map((x) => arch(x, 240, 50, 112, C.slateDark, LINE.form)).join('') + line(`M286 280V38M416 280V38M512 280V38M612 280V38M286 96H612M286 176H612`, 5, C.ink) + line(`M286 280V38M416 280V38M512 280V38M612 280V38M286 96H612M286 176H612`, 2.6, C.woodLight);
  return sky() + cloud(90, 56) + hills(180, C.sageLight, 30, 4) + hall + ground(280, C.parchmentDark) + rect(40, 320, 100, 34, C.stoneLight, LINE.form) + rect(64, 290, 80, 30, C.stone, LINE.form) +
    fig(188, 344, 1.42, 'burgher', { pose: 'both', hat: 'beret', top: C.burgundy, sleeve: C.burgundyDark, gown: { fill: C.burgundy, fold: true, trim: C.gold }, inFront: `<g transform="rotate(-6)">${rect(30, -92, 70, 34, C.ivory, LINE.form)}</g>` + line(`M36 -82H90M36 -70H78M58 -90V-66`, LINE.fine, C.slateDark) }) +
    fig(388, 344, 1.28, 'smith', { dir: -1, pose: 'point', hat: 'cap', tone: 2, armR: [[13, -102], [24, -86], [32, -78]], inFront: '' });
}

/** Winnowing Fan: chaff flying from a wide basket in the barn door's light. */
function paper_fan() {
  const chaff = [[340, 90], [374, 66], [410, 100], [442, 72], [480, 110], [516, 84], [386, 136], [462, 150], [546, 132], [356, 44], [434, 36], [500, 42], [570, 76]].map(([x, y]) => `M${x} ${y}l10 -4`).join('');
  const basket = path(`M196 170C214 226 356 226 384 158L368 150C340 184 234 188 212 160Z`, C.woodLight, LINE.heavy) + line(`M222 186L232 204M256 196L262 214M290 198L294 216M326 192L330 210M354 176L362 194`, LINE.fine, C.woodDark);
  return rect(0, 0, W, 360, C.goldLight, 0) + rect(0, 0, 150, 360, C.wood, LINE.heavy) + rect(590, 0, 50, 360, C.wood, LINE.heavy) + line(`M36 0V360M76 0V360M114 0V360M616 0V360`, LINE.fine, C.woodDark) + hills(250, C.sageLight, 30, 2) + ground(272, C.parchmentDark) + fig(248, 344, 1.56, 'wife', { pose: 'both', legs: null, armL: [[-13, -102], [8, -84], [-22, -76]], armR: [[13, -102], [50, -84], [84, -72]], tone: 1 }) + `<g transform="translate(0 66)">${basket}</g>` + line(chaff, 3, C.goldDark) + sack(84, 344, 1.3) + sack(556, 346, 1.1) + sheaf(600, 332, 1.2) + path(`M180 340C240 330 420 330 480 340V360H180Z`, C.gold, LINE.form);
}

/** Customs House: waterfront arcade with the Crown's arms, cargo stacked, a pikeman at the door. */
function conveyor() {
  const hall = rect(70, 70, 340, 200, C.parchment, LINE.heavy) + poly([[54, 70], [240, -6], [426, 70]], C.slateDark, LINE.heavy) + [130, 240, 350].map((x) => arch(x, 270, 70, 104, C.slateDeep, LINE.form) + window3(x, 150, 34, 50)).join('') + pennon(226, 12, 28, 40);
  return sky() + cloud(460, 54, 110) + water(246) + hall + rect(0, 270, 540, 90, C.stone, LINE.heavy) + masonry(4, 288, 530, 66, 7, { rows: 4 }) + ship(590, 288, 0.74, { furled: true, flag: C.gold }) + barrel(100, 300, 1.2) + barrel(146, 304, 1.2) + bale(218, 304, 72, 42, C.burgundyLight) + bale(218, 262, 58, 34, C.sage) + bale(286, 308, 60, 38, C.slate) + fig(390, 344, 1.3, 'guard', { dir: -1, behind: pike(24, -2, 180) }) + sack(450, 350, 1.14);
}

/** Assayer: a coin in the balance, seen close across the counter. */
function sorting_glasses() {
  return rect(0, 0, W, 360, C.slateDark, 0) + shelves(430, 240, 190, 220, 7, 4, 'books') + rect(0, 240, W, 120, C.wood, LINE.heavy) + line(`M0 280H640M0 320H640`, LINE.fine, C.woodDark) +
    fig(184, 280, 1.9, 'scholar', { pose: 'give', hat: 'black-cap', armR: [[13, -102], [34, -84], [60, -68]], armL: [[-13, -102], [-24, -84], [22, -66]], inFront: coin(62, -60, 5) }) + rect(0, 262, W, 98, C.wood, LINE.form) + balance(380, 276, 2.3, 8) + coin(297, 212, 13) + coin(462, 234, 9, C.stoneLight) + coin(476, 234, 9, C.stoneLight) + coins(556, 330, 22, 4) + coins(92, 330, 18, 2, C.stoneLight) + rect(150, 288, 110, 44, C.ivory, LINE.form) + line(`M160 300H250M160 312H232`, LINE.fine, C.stoneDark);
}

/** Post Rider: horse at full gallop, the road's dust behind. */
function springboard() {
  return sky() + cloud(100, 70, 110) + cloud(450, 40, 100) + hills(190, C.slateLight, 44, 3) + hills(250, C.sageLight, 40, 6) + poly([[0, 258], [640, 240], [640, 360], [0, 360]], C.parchmentDark, LINE.heavy) + line(`M40 300H150M210 330H330M420 290H520`, LINE.form, C.stoneDark) + cypress(590, 250, 120) +
    rider(340, 324, 1.5, 'herald', { horse: { gait: 'gallop', fill: C.woodLight, cloth: C.burgundy }, pose: 'give', fig: { lean: 8, hat: 'cap', armR: [[13, -102], [34, -96], [52, -92]], armL: [[-13, -102], [-30, -116], [-46, -128]], inFront: scroll(-54, -132, 26, 40) } }) + path(`M78 286C40 276 26 300 8 292C26 322 60 330 112 316C106 306 94 296 78 286Z`, C.parchment, LINE.fine);
}

/** Keeper of the Rolls: high shelves, a roll lifted free, the rest of the wall full of ends. */
function clockwork_archive() {
  return rect(0, 0, W, H0, C.woodDark, 0) + shelves(0, 310, 640, 310, 16, 6) + rect(0, 310, W, 50, C.stone, LINE.form) +
    fig(310, 346, 1.92, 'scholar', { pose: 'raise', top: C.sageDark, sleeve: C.sageDeep, gown: { fill: C.sageDark, fold: true }, hat: 'beret', armR: [[13, -102], [34, -112], [60, -114]], armL: [[-13, -102], [8, -86], [28, -100]], inFront: scroll(46, -112, 62, -6) + line(`M34 -110C36 -92 28 -78 40 -60`, 3, C.burgundy) + ell(40, -56, 7, 7, C.burgundy, LINE.fine) }) +
    `<g transform="translate(486 346)">` + line(`M-30 0V-150M30 0V-150M-30 -30H30M-30 -60H30M-30 -90H30M-30 -120H30`, 6, C.ink) + line(`M-30 0V-150M30 0V-150M-30 -30H30M-30 -60H30M-30 -90H30M-30 -120H30`, 3, C.woodLight) + `</g>`;
}
const H0 = 360;

/** Trading Port: evening, two great ships at anchor, the town's windows lit. */
function whistle_stop() {
  const glow = (x, y) => rect(x, y, 8, 11, C.goldLight, LINE.fine);
  return rect(0, 0, W, 360, C.terraLight, 0) + rect(0, 0, W, 86, C.slate, 0) + rect(0, 86, W, 62, C.terra, 0) + ell(410, 164, 58, 58, C.goldLight, LINE.fine) + hills(190, C.slateDark, 30, 3) + water(190, C.slate, 11) + line(`M380 212H440M360 240H460M390 262H430`, LINE.form, C.goldLight) +
    roofline(238, 13, { from: 0, to: 196, h: 70, walls: [C.stoneDark, C.woodLight, C.stone], roof: C.terraDark }) + [20, 68, 112, 150].map((x, i) => glow(x, 198 + (i % 2) * 14)).join('') + rect(0, 238, 240, 16, C.stoneDark, LINE.form) +
    ship(374, 292, 1.26, { sail: C.parchment, flag: C.burgundy }) + ship(566, 236, 0.64, { sail: C.parchmentDark, flag: C.gold, furled: true }) + path(`M0 290C80 276 150 300 216 360H0Z`, C.stoneDeep, LINE.heavy) + fig(62, 300, 0.9, 'merchant', { pose: 'point' });
}

/** Petitioner: a line of waiting people, the one at the front kneels with a paper up. */
function hand_crank() {
  return room(C.parchmentDark, C.parchment, 280, 8) + floorTiles(280) + column(66, 280, 240, 34) + window3(190, 150, 60, 104) + window3(320, 150, 60, 104) + door(556, 280, 92, 190) + rect(490, 80, 130, 10, C.woodDark, LINE.fine) +
    fig(556, 330, 1.3, 'clerk', { dir: -1, pose: 'hip', armR: [[13, -102], [20, -86], [8, -72]] }) + fig(404, 340, 1.34, 'poor', { legs: 'kneel', pose: 'raise', armR: [[13, -102], [32, -112], [48, -128]], tone: 1, inFront: sheet(56, -128, 24, 32, false, 12) }) +
    fig(274, 330, 1.18, 'goodwife', { pose: 'stand', tone: 2 }) + fig(190, 320, 1.1, 'farmer', { pose: 'hip', behind: '', hat: 'bare', inFront: '' }) + fig(112, 320, 1.0, 'worker', { pose: 'stand', tone: 1 });
}

/** Lady-in-Waiting: two ladies behind a pillar, the court unaware in the distance. */
function charge_meter() {
  const court = rect(0, 0, W, 360, C.stoneLight, 0) + tapestry(390, 26, 120, 156, C.sageDark, C.goldLight) + window3(574, 190, 50, 130) + floorTiles(246);
  return court + fig(476, 262, 0.62, 'monarch', { dir: 1 }) + fig(540, 266, 0.6, 'noble', { dir: -1, pose: 'give' }) + fig(428, 268, 0.6, 'guard', { behind: pike(24, -2, 180) }) +
    fig(180, 346, 1.82, 'lady', { pose: 'give', hat: 'veil', tilt: 6, tone: 0, armR: [[13, -102], [28, -94], [22, -80]], lean: 3 }) + fig(286, 346, 1.82, 'lady', { dir: -1, top: C.burgundy, sleeve: C.burgundyLight, gown: { fill: C.burgundy, w: 28, panel: C.parchment, trim: C.gold, fold: true }, hat: 'coif', tilt: 10, lean: 3, pose: 'whisper', armR: [[13, -102], [30, -116], [24, -136]], tone: 1 }) + column(40, 360, 340, 54);
}

/** Audience Hall: tall vault, dais, a visitor small before the throne. */
function capacitor_bank() {
  return rect(0, 0, W, 360, C.stone, 0) + vaultedRoof(C.stoneDark) + [110, 250, 390, 530].map((x) => window3(x, 214, 56, 150)).join('') + floorTiles(254) + path(`M274 254H366L460 360H180Z`, C.burgundy, LINE.form) + column(30, 254, 210, 34) + column(610, 254, 210, 34) + dais(320, 244, 180, 16) + tapestry(262, 64, 116, 100) + throne0(320, 228, 0.92) +
    fig(320, 232, 0.86, 'monarch', { legs: 'sit', armR: [[13, -102], [28, -78], [44, -82]], armL: [[-13, -102], [-24, -80], [-14, -70]], gown: { fill: C.burgundy, w: 26, trim: C.gold, fold: true } }) + fig(220, 330, 1.08, 'merchant', { pose: 'give', legs: 'kneel', top: C.slate }) + fig(428, 248, 0.72, 'guard', { dir: -1, behind: pike(24, -2, 180) }) + fig(516, 340, 1.0, 'noble', { dir: -1 }) + fig(116, 340, 1.0, 'lady', { dir: 1 });
}
const throne0 = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">` + rect(-34, -146, 68, 146, C.burgundyDark, 2.6) + poly([[-34, -146], [0, -180], [34, -146]], C.gold, 2.6) + `</g>`;

/** Crown Treasury: iron door open on chests and coin, a ring of keys in the guard's hand. */
function steam_diverter() {
  return rect(0, 0, W, 360, C.stoneDark, 0) + masonry(0, 0, W, 300, 6, { rows: 15, gaps: 0.5, ink: C.stoneDeep }) + arch(390, 304, 330, 276, C.slateDeep, LINE.heavy) + chest(280, 304, 100, 54, true) + chest(392, 304, 120, 66, true, C.burgundyDark) + chest(502, 304, 100, 54, false) + coins(344, 304, 16, 6) + coins(450, 304, 18, 5) + rect(0, 304, W, 56, C.stone, LINE.form) + lantern(390, 66, 18) +
    path(`M58 300V88C58 60 132 38 196 28V340Z`, C.slate, LINE.heavy) + line(`M60 136L196 104M60 214L196 196M60 280L196 276`, 7, C.slateDark) + ticks([[90, 120, 90, 124], [130, 112, 130, 116], [170, 104, 170, 108]], 5, C.slateLight) + fig(168, 346, 1.56, 'guard', { pose: 'give', armR: [[13, -102], [28, -88], [42, -82]], inFront: ell(50, -74, 12, 12, 'none', 3.6, C.goldDark) + line(`M50 -62l-4 18M56 -64l8 16M42 -66l-12 14`, 3, C.goldDark), behind: pike(-26, -2, 190) });
}

/** Guild Banquet: long table in deep perspective, faces down the board, pie carried in. */
function glow_mason() {
  const left = [[138, 320, 1.26], [210, 268, 0.94], [262, 232, 0.72]];
  const right = [[506, 320, 1.26], [430, 268, 0.94], [378, 232, 0.72]];
  const who = ['merchant', 'burgher', 'lady', 'noble', 'merchant', 'goodwife'];
  const seat = (a, d, base) => a.map(([x, y, s], i) => fig(x, y, s, who[(i + base) % 6], { dir: d, pose: 'give', legs: null, hat: i === 2 ? 'beret' : undefined, tone: (i + base) % 3 })).join('');
  const board = poly([[294, 196], [346, 196], [520, 360], [120, 360]], C.ivory, LINE.heavy) + line(`M302 220L188 340M338 220L452 340`, LINE.fine, C.stoneDark);
  const plates = [[320, 214, 14], [320, 240, 20], [270, 296, 28], [370, 296, 28]].map(([x, y, r]) => ell(x, y, r, r * 0.34, C.stoneLight, LINE.form)).join('');
  return room(C.parchmentDark, C.woodLight, 190, 3) + [90, 208, 432, 550].map((x) => pennon(x - 22, 18, 44, 100, x % 3 ? C.burgundy : C.sageDark)).join('') + tapestry(270, 18, 100, 110, C.slate) + seat(left.slice().reverse(), 1, 0) + seat(right.slice().reverse(), -1, 3) + board + plates + ell(320, 288, 42, 14, C.terraLight, LINE.form) + path(`M286 288C290 264 350 264 354 288Z`, C.terra, LINE.form) + rect(444, 226, 10, 28, C.gold, LINE.fine) + rect(192, 226, 10, 28, C.gold, LINE.fine);
}

/** Privy Council: Three heads bent over a single paper in candlelight. */
function overcharge_lab() {
  return rect(0, 0, W, 360, C.slateDeep, 0) + tapestry(246, 10, 148, 124, C.burgundyDark, C.goldDark) + fig(176, 300, 1.54, 'noble', { pose: 'both', tilt: 12, lean: 6, tone: 0 }) + fig(462, 300, 1.54, 'clerk', { dir: -1, pose: 'point', tilt: 12, lean: 6, armR: [[13, -102], [32, -88], [52, -80]], tone: 1 }) + fig(320, 268, 1.28, 'monarch', { pose: 'both', tilt: 0, armR: [[13, -102], [20, -84], [10, -66]], armL: [[-13, -102], [-20, -84], [-10, -66]], gown: { fill: C.burgundy, w: 24, trim: C.gold } }) +
    table(320, 370, 480, C.woodLight, 110, C.sageDark) + sheet(322, 254, 94, 42, true) + candle(166, 254) + candle(474, 254) + path(`M0 360V300C70 290 90 314 110 360Z`, C.slateDeep, LINE.form) + path(`M640 360V300C570 290 550 314 530 360Z`, C.slateDeep, LINE.form);
}

/** Road Warden: halberd across the way, a traveller stops with his pack. */
function signal_tower() {
  return sky() + cloud(300, 44, 110) + hills(170, C.slateLight, 34, 15) + ground(218) + foliage([[30, 110, 54], [92, 76, 58], [14, 40, 44], [130, 140, 40]], C.sage, LINE.form, C.sageDark) + rect(52, 150, 26, 110, C.wood, LINE.form) + poly([[170, 224], [470, 224], [640, 360], [40, 360]], C.parchmentDark, LINE.heavy) + rect(538, 148, 18, 106, C.stoneLight, LINE.form) + ell(547, 148, 13, 9, C.stoneLight, LINE.form) +
    fig(226, 342, 1.56, 'guard', { pose: 'give', legs: 'brace', armR: [[13, -102], [34, -96], [50, -92]], armL: [[-13, -102], [12, -90], [34, -86]], inFront: line(`M-40 -60L108 -130`, 5.6) + line(`M-40 -60L108 -130`, 2.8, C.woodLight) + poly([[104, -142], [132, -146], [116, -118]], C.slateLight, LINE.form) }) + fig(434, 340, 1.4, 'merchant', { dir: -1, pose: 'head', legs: null, armR: [[13, -102], [28, -112], [34, -128]], armL: [[-13, -102], [-28, -112], [-34, -128]], top: C.terra, sleeve: C.terraDark, skirt: C.terra, hat: 'beret', behind: rect(-30, -106, 22, 52, C.wood, LINE.form) });
}

/** Royal Runner: flat-out through a town gate, letter held high. */
function city_messenger() {
  return sky(C.parchment) + rect(0, 0, 124, 360, C.stoneLight, LINE.heavy) + masonry(4, 6, 116, 340, 3, { rows: 22 }) + roofline(240, 17, { from: 124, to: 650, h: 80 }) + poly([[124, 248], [640, 240], [640, 360], [40, 360]], C.stone, LINE.heavy) + paving(250, C.stone, 2) + rect(0, 0, 124, 360, C.stoneLight, LINE.heavy) + masonry(4, 6, 116, 340, 3, { rows: 22 }) +
    fig(330, 330, 1.72, 'page', { legs: 'run', top: C.burgundy, sleeve: C.burgundyLight, hose: C.slateDark, hat: 'cap', armR: [[13, -102], [38, -112], [58, -134]], armL: [[-13, -102], [-32, -90], [-44, -72]], inFront: sheet(68, -138, 28, 24, true, -12) }) + fig(530, 292, 0.72, 'goodwife', { dir: -1, pose: 'whisper' }) + fig(575, 292, 0.72, 'burgher', { dir: -1, hat: 'beret' }) + ell(200, 342, 36, 7, C.parchmentDark, LINE.fine) + ell(150, 324, 18, 5, C.parchmentDark, LINE.fine);
}

/** Tax Assessors: a stallholder's goods being totted up by two officials with a ledger. */
function inspection_team() {
  return sky() + roofline(190, 5, { h: 110, walls: [C.parchment, C.stoneLight, C.parchmentDark] }) + paving(250, C.stone, 3) + stall(378, 330, 262, 214, C.terra, C.ivory, 8) + sack(424, 288, 0.56) + sack(466, 288, 0.5, C.parchment) + coins(530, 286, 11, 3) + fig(506, 300, 1.22, 'wife', { dir: -1, pose: 'head', armR: [[13, -102], [32, -98], [40, -116]], armL: [[-13, -102], [-30, -96], [-38, -116]], tone: 2 }) + rect(378, 292, 262, 38, C.wood, LINE.form) + rect(375, 288, 268, 6, C.woodLight, LINE.form) + fig(168, 342, 1.54, 'clerk', { pose: 'write', inFront: book(40, -74, 52, 8) + line(`M18 -94L6 -112`, 2) }) + fig(296, 346, 1.56, 'burgher', { pose: 'point', top: C.burgundyDark, sleeve: C.burgundy, gown: { fill: C.burgundyDark, fold: true }, hat: 'black-cap', armR: [[13, -102], [36, -110], [62, -114]] });
}

export const WORK = {
  gearwright: ['Guild Apprentice', gearwright], shift_bell: ['Morning Bell', shift_bell], tally_clerk: ['Tally Clerk', tally_clerk], supply_crane: ['Treadwheel Crane', supply_crane], copper_press: ['Coin Striker', copper_press],
  foreman: ['Royal Architect', foreman], paper_fan: ['Winnowing Fan', paper_fan], conveyor: ['Customs House', conveyor], sorting_glasses: ['Assayer', sorting_glasses], springboard: ['Post Rider', springboard],
  clockwork_archive: ['Keeper of the Rolls', clockwork_archive], whistle_stop: ['Trading Port', whistle_stop], hand_crank: ['Petitioner', hand_crank], charge_meter: ['Lady-in-Waiting', charge_meter], capacitor_bank: ['Audience Hall', capacitor_bank],
  steam_diverter: ['Crown Treasury', steam_diverter], glow_mason: ['Guild Banquet', glow_mason], overcharge_lab: ['Privy Council', overcharge_lab], signal_tower: ['Road Warden', signal_tower], city_messenger: ['Royal Runner', city_messenger], inspection_team: ['Tax Assessors', inspection_team],
};
