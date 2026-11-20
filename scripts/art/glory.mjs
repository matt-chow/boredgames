/** Glory of the Realm: the land, the honours and the ceremonies of the crown (docs/ART_BIBLE.md). */
import { C, LINE, W, arch, banner, candle, cloud, column, cypress, dais, ell, fig, flame, floorTiles, ground, group, hills, horse, house, line, masonry, night, path, paving, pennon, pike, poly, rect, rider, roofline, room, sheet, sky, sword, throne, ticks, tower, tree, vaultedRoof, wall, window3 } from './scene.mjs';

const manor = (x, y, s = 1) => group(`translate(${x} ${y}) scale(${s})`, rect(-60, -60, 120, 60, C.parchment, LINE.form / s) + poly([[-70, -60], [0, -100], [70, -60]], C.terra, LINE.form / s) + rect(40, -110, 20, 50, C.parchment, LINE.form / s) + rect(-10, -30, 20, 30, C.woodDark, LINE.fine / s));
const furrows = (y0) => ticks([0, 1, 2, 3, 4, 5].map((i) => [0, y0 + i * 18, W, y0 + i * 18 - 20]), 2, C.woodDark);

/** Tenant Farmer: behind the plough and the horse, the furrows running back towards the manor. */
function tenant_farmer() {
  const plough = line(`M60 -20L-30 -80M60 -20L130 -6`, 5) + line(`M60 -20L-30 -80M60 -20L130 -6`, 2.6, C.woodLight) + path(`M50 -24L76 -2L40 0Z`, C.stoneDark, LINE.form);
  return sky() + cloud(120, 40) + hills(170, C.sageLight, 30, 501) + manor(520, 180, 0.8) + ground(200, C.goldLight) + furrows(220) + horse(420, 330, 1.3) + group('translate(240 340)', plough) + fig(220, 350, 1.56, 'farmer', { legs: 'walk', lean: 8, armR: [[13, -102], [30, -88], [44, -82]] }) + fig(560, 330, 0.9, 'page', { dir: -1, tone: 1, pose: 'raise' });
}

/** Manor Court: the lord in his chair under the great tree, a villager speaking, the steward writing. */
function manor_court() {
  return sky() + hills(180, C.sageLight, 30, 511) + manor(560, 200, 0.7) + ground(210, C.sage) + tree(230, 300, 1.8) + throne(250, 330, 0.9) + fig(250, 330, 1.3, 'noble', { legs: 'sit', pose: 'hip' }) + fig(130, 334, 1.12, 'clerk', { legs: 'sit', pose: 'write', inFront: sheet(30, -76, 30, 24, false) }) + fig(420, 352, 1.56, 'farmer', { dir: -1, pose: 'give', tone: 2 }) + fig(510, 344, 1.3, 'goodwife', { dir: -1, pose: 'both' }) + fig(590, 340, 1.2, 'farmer', { dir: -1, hat: 'bare', pose: 'low', tone: 1 });
}

/** Votive Offering: a candle set at the wayside shrine, the traveller on one knee before it. */
function votive_offering() {
  const shrine = rect(370, 120, 100, 220, C.stoneLight, LINE.heavy) + arch(420, 240, 60, 90, C.slateDark, LINE.form) + poly([[360, 120], [420, 80], [480, 120]], C.terra, LINE.form) + ell(420, 200, 14, 14, C.goldLight, LINE.fine) + [396, 420, 444].map((x) => candle(x, 300)).join('') + rect(380, 300, 80, 10, C.stone, LINE.fine);
  return sky(C.goldLight, C.parchment) + hills(200, C.slateLight, 20, 521) + ground(230, C.sageLight) + path(`M0 360C160 300 320 280 640 270`, 'none', 26, C.parchmentDark) + cypress(560, 300, 1.2) + cypress(80, 280, 0.9) + shrine + fig(300, 350, 1.62, 'hooded', { legs: 'kneel', armR: [[13, -102], [34, -100], [60, -110]] });
}

/** Banner Bearer: out in front of the column, the standard held high and stepping out. */
function banner_bearer() {
  const marchers = [440, 500, 560, 620].map((x, i) => fig(x, 300, 0.92, 'guard', { legs: 'walk', tone: i % 3, behind: pike(20, -2, 150) })).join('');
  return sky() + cloud(140, 50) + hills(200, C.sageLight, 30, 531) + ground(240, C.parchmentDark) + marchers + banner(306, 300, 270, C.burgundy, C.gold, 2.2) + fig(250, 352, 1.76, 'guard', { legs: 'walk', armR: [[13, -102], [26, -130], [32, -170]], armL: [[-13, -102], [10, -120], [32, -130]] });
}

/** Laurel Wreath: the wreath alone on its cushion, set on the stone in the empty hall. */
function laurel_wreath() {
  const leaves = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const x = 320 + Math.cos(a) * 60, y = 168 + Math.sin(a) * 34;
    return ell(x, y, 12, 6, i % 2 ? C.sage : C.sageDark, LINE.fine).replace('<ellipse', `<ellipse transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})"`);
  }).join('');
  return room(C.stoneLight, C.stone, 300, 541) + floorTiles(300) + window3(110, 200, 70, 130) + window3(530, 200, 70, 130) + rect(250, 230, 140, 110, C.stone, LINE.heavy) + rect(236, 220, 168, 16, C.stoneLight, LINE.form) + path(`M230 220C230 180 410 180 410 220Z`, C.burgundy, LINE.heavy) + leaves + ell(380, 178, 10, 6, C.burgundyLight, LINE.fine);
}

/** Land Grant: on the dais the monarch hands down the charter to the kneeling knight. */
function land_grant() {
  return room(C.stoneLight, C.parchmentDark, 290, 551) + floorTiles(290) + banner(110, 150, 130, C.burgundy, C.gold, 1.6) + banner(530, 150, 130, C.slate, C.gold, 1.6, -1) + dais(380, 300, 230) + throne(430, 280, 1.1) + fig(400, 286, 1.5, 'monarch', { dir: -1, armR: [[13, -102], [40, -96], [70, -90]], inFront: sheet(68, -100, 40, 30, true) }) + fig(230, 352, 1.66, 'guard', { legs: 'kneel', hat: 'bare', armR: [[13, -102], [40, -110], [64, -118]], behind: sword(-20, -2, 100, 10) });
}

/** Grand Muster: rank on rank of pikes in the field, the captain riding the line. */
function grand_muster() {
  const rank = (y, s, n, seed) => Array.from({ length: n }, (_, i) => fig(40 + i * (600 / (n - 1)), y, s, 'guard', { tone: (i + seed) % 3, behind: pike(18, -2, 150) })).join('');
  return sky() + cloud(500, 40) + hills(170, C.slateLight, 30, 561) + ground(200, C.sageLight) + pennon(600, 80, 30, 40, C.burgundy, C.gold) + line(`M600 80V200`, 3) + rank(240, 0.66, 11, 0) + rank(290, 0.82, 9, 1) + rider(220, 356, 1.4, 'noble', { pose: 'point' });
}

/** Memorial Statue: the bronze horseman on his plinth in the middle of the square, a child pointing up. */
function memorial_statue() {
  const plinth = rect(250, 230, 140, 90, C.stoneLight, LINE.heavy) + rect(236, 220, 168, 14, C.stone, LINE.form) + rect(236, 316, 168, 14, C.stone, LINE.form) + ell(320, 276, 18, 18, C.stone, LINE.fine);
  return sky() + roofline(190, 571, { h: 90 }) + paving(240, C.stone, 572) + plinth + rider(320, 222, 1.1, 'noble', { pose: 'point', horse: { fill: C.goldDark, mane: C.woodDark }, fig: { top: C.goldDark, sleeve: C.goldDark, hose: C.goldDark, hat: 'bare' } }) + fig(140, 352, 1.44, 'goodwife', { pose: 'both', tone: 1 }) + fig(190, 356, 1.0, 'page', { pose: 'point', tone: 2, dir: 1 }) + fig(520, 352, 1.4, 'scholar', { dir: -1, pose: 'hip' });
}

/** Point of Honour: in the grey of morning, two duellists face off, a second on each side. */
function point_of_honour() {
  return sky(C.stoneLight, C.parchment) + hills(200, C.slateLight, 24, 581) + ground(230, C.sageLight) + tree(70, 260, 1.3) + cypress(580, 260, 1.0) + fig(200, 352, 1.66, 'noble', { legs: 'brace', lean: 6, armR: [[13, -102], [30, -108], [44, -112]] }) + fig(440, 352, 1.66, 'noble', { dir: -1, legs: 'brace', lean: 6, top: C.slate, sleeve: C.slateDark, gown: { fill: C.slate, fold: true }, armR: [[13, -102], [30, -108], [44, -112]], tone: 2 }) + line(`M273 166L336 136M367 166L304 136`, 3.6, C.stoneDark) + fig(120, 330, 1.14, 'merchant', { pose: 'both', tone: 1 }) + fig(540, 330, 1.14, 'clerk', { dir: -1, pose: 'hip' });
}

/** Honour Guard: two lines of guards cross their pikes and the honoured guest walks through. */
function honour_guard() {
  const pair = (x, y, s, w) => fig(x - w, y, s, 'guard', { armR: [[13, -102], [26, -120], [36, -130]], inFront: line(`M36 -130L${w * 2 / s * 0.55} -230`, 3.4, C.woodDark) }) + fig(x + w, y, s, 'guard', { dir: -1, tone: 1, armR: [[13, -102], [26, -120], [36, -130]], inFront: line(`M36 -130L${w * 2 / s * 0.55} -230`, 3.4, C.woodDark) });
  return room(C.stoneLight, C.stone, 300, 591) + vaultedRoof(C.stone) + floorTiles(300) + path(`M260 360L300 300H340L380 360Z`, C.burgundy, LINE.form) + pair(320, 300, 0.9, 70) + pair(320, 356, 1.3, 140) + fig(320, 330, 1.2, 'lady', { gown: { fill: C.slate, fold: true, trim: C.gold } });
}

/** Victory Parade: through the triumphal arch, the returning captain on horseback, the crowd cheering. */
function victory_parade() {
  const gate = rect(180, 40, 280, 260, C.stoneLight, LINE.heavy) + masonry(184, 46, 272, 250, 601, { rows: 10 }) + arch(320, 300, 130, 190, C.sky, LINE.heavy) + rect(170, 30, 300, 20, C.stone, LINE.form) + column(200, 300, 210, 18, C.ivory) + column(440, 300, 210, 18, C.ivory);
  const crowd = [40, 100, 540, 600].map((x, i) => fig(x, 356, 1.3, ['goodwife', 'farmer', 'smith', 'wife'][i], { dir: x > 320 ? -1 : 1, pose: 'cheer', tone: i % 3 })).join('');
  return sky() + cloud(560, 40) + gate + paving(300, C.stone, 602) + pennon(250, 0, 30, 40, C.burgundy, C.gold) + pennon(390, 0, 30, 40, C.slate, C.gold) + rider(320, 350, 1.2, 'noble', { pose: 'raise' }) + crowd;
}

/** Chivalric Order: knights kneeling in a row in the chapel, swords laid point-down before them. */
function chivalric_order() {
  const knight = (x, i) => fig(x, 340, 1.18, 'guard', { legs: 'kneel', hat: 'bare', tone: i % 3, pose: 'both', inFront: sword(40, -2, 80, 0) });
  return room(C.stoneLight, C.stone, 300, 611) + vaultedRoof(C.stone) + window3(320, 180, 70, 150) + floorTiles(300) + banner(130, 140, 110, C.burgundy, C.gold, 1.4) + banner(510, 140, 110, C.slate, C.gold, 1.4, -1) + candle(230, 250) + candle(410, 250) + rect(250, 230, 140, 40, C.stone, LINE.form) + [120, 260, 400, 540].map(knight).join('');
}

/** Royal Jubilee: the bonfire on the green, pennants strung, the dancers turning hand in hand. */
function royal_jubilee() {
  const bunting = path(`M0 80C200 130 440 130 640 80`, 'none', 2, C.ink) + Array.from({ length: 11 }, (_, i) => { const x = 30 + i * 58, y = 80 + Math.sin((x / 640) * Math.PI) * 38; return poly([[x - 12, y], [x + 12, y], [x, y + 24]], [C.burgundy, C.gold, C.slate][i % 3], LINE.fine); }).join('');
  const fire = line(`M280 330L360 290M360 330L280 290M300 336L340 286`, 6, C.woodDark) + flame(320, 300, 1.8);
  return night() + bunting + ground(260, C.sageDark) + fire + fig(170, 346, 1.4, 'goodwife', { legs: 'run', armR: [[13, -102], [34, -120], [50, -130]], tone: 1 }) + fig(110, 340, 1.3, 'farmer', { dir: -1, legs: 'run', pose: 'raise' }) + fig(480, 346, 1.4, 'wife', { dir: -1, legs: 'run', armR: [[13, -102], [34, -120], [50, -130]] }) + fig(560, 340, 1.3, 'smith', { legs: 'run', pose: 'cheer', tone: 2 });
}

export const GLORY = {
  tenant_farmer: ['Tenant Farmer', tenant_farmer], manor_court: ['Manor Court', manor_court], votive_offering: ['Votive Offering', votive_offering], banner_bearer: ['Banner Bearer', banner_bearer], laurel_wreath: ['Laurel Wreath', laurel_wreath],
  land_grant: ['Land Grant', land_grant], grand_muster: ['Grand Muster', grand_muster], memorial_statue: ['Memorial Statue', memorial_statue], point_of_honour: ['Point of Honour', point_of_honour], honour_guard: ['Honour Guard', honour_guard],
  victory_parade: ['Victory Parade', victory_parade], chivalric_order: ['Chivalric Order', chivalric_order], royal_jubilee: ['Royal Jubilee', royal_jubilee],
};
