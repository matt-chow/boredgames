/** Treasury cards and Crown Projects (docs/ART_BIBLE.md): objects and architecture. People are small here, or absent. */
import { C, H, LINE, W, arch, bale, banner, barrel, bell, cart, cloud, coin, column, cypress, door, ell, fig, flame, foliage, ground, hills, horse, house, lantern, line, masonry, night, path, paving, pennon, pike, poly, purse, rect, roofline, room, sack, sheaf, shelves, ship, sky, stall, table, ticks, tower, tree, vaultedRoof, wall, water, wheel, window3 } from './scene.mjs';

/** Bronze: a palm's worth of worn pennies spilling from a small purse. */
function scrap() {
  const cloth = rect(0, 0, W, 360, C.woodLight, 0) + line(`M0 60H640M0 130H640M0 200H640M0 270H640`, 1, C.wood) + path(`M0 310C160 290 340 330 640 300V360H0Z`, C.wood, 0);
  const bag = path(`M104 280C50 230 72 150 150 118L136 74L222 66L226 110C308 140 322 240 270 284Z`, C.wood, LINE.heavy) + path(`M226 110C308 140 322 240 270 284L234 284C276 230 264 150 208 118Z`, C.woodDark, 0) + path(`M138 112Q184 130 228 106`, 'none', LINE.heavy, C.parchment) + line(`M136 74L154 112M170 70L176 118M200 68L198 118`, LINE.fine);
  const penny = (x, y, r, rot = 0) => ell(x, y + 5, r, r * 0.8, C.terraDark, LINE.form, C.ink, rot) + ell(x, y, r, r * 0.8, C.terra, LINE.form, C.ink, rot) + ell(x, y, r * 0.72, r * 0.56, C.terraLight, LINE.fine, C.ink, rot) + line(`M${x - r * 0.3} ${y}H${x + r * 0.3}M${x} ${y - r * 0.26}V${y + r * 0.26}`, LINE.form, C.terraDark);
  return [cloth, bag, penny(350, 300, 46, -8), penny(444, 264, 50, 10), penny(532, 306, 44, -14), penny(372, 214, 40, 14), penny(290, 322, 34, 5), penny(552, 212, 30, 8)].join('');
}

/** Silver: an open strongbox of silver plate and coin, seen close. */
function cog() {
  const back = rect(0, 0, W, 360, C.slate, 0) + line(`M0 70H640M0 150H640M0 230H640`, 1, C.slateDark) + rect(0, 288, W, 72, C.woodDark, LINE.form);
  const silver = (x, y, r) => ell(x, y + 4, r, r * 0.34, C.stoneDark, LINE.fine) + ell(x, y, r, r * 0.34, C.stoneLight, LINE.form) + ell(x, y, r * 0.66, r * 0.22, 'none', LINE.fine, C.stoneDeep);
  let heap = path(`M170 190C210 138 430 138 470 190V220H170Z`, C.stone, LINE.form);
  [[230, 180, 34], [320, 164, 38], [410, 182, 34], [272, 200, 30], [368, 202, 32], [186, 204, 22], [454, 206, 22]].forEach(([x, y, r]) => (heap += silver(x, y, r)));
  const box = path(`M150 180C160 56 480 56 490 180Z`, C.woodDark, LINE.heavy) + path(`M170 172C182 82 458 82 470 172Z`, C.burgundyDark, LINE.form) + heap + rect(150, 200, 340, 118, C.wood, LINE.heavy) + rect(180, 200, 22, 118, C.slateLight, LINE.form) + rect(438, 200, 22, 118, C.slateLight, LINE.form) + rect(146, 196, 348, 12, C.slateLight, LINE.form) + rect(296, 208, 48, 58, C.slateLight, LINE.form) + ell(320, 228, 8, 8, C.slateDeep, 0) + rect(316, 232, 8, 20, C.slateDeep, 0);
  const loose = silver(84, 306, 36) + silver(560, 320, 40) + silver(530, 296, 26);
  return back + box + loose;
}

/** Homestead: a small farmhouse behind a tilled strip, smoke rising. */
function notebook() {
  let furrows = '';
  for (let i = 0; i < 12; i++) furrows += `M${250 + i * 34} 240L${60 + i * 66} 360`;
  return sky() + cloud(70, 60, 100) + hills(170, C.sageLight, 44, 5) +
    ground(214) + path(`M240 240H640V360H0Z`, C.terraLight, LINE.form) + line(furrows, 2, C.terraDark) +
    path(`M260 30C248 50 286 56 272 80C264 90 274 100 270 110`, 'none', 5, C.stoneLight) +
    tree(486, 234, 1.05) +
    house(150, 234, 150, 66, { wall: C.parchment, roof: C.woodLight, peak: 0.42, frame: true, windows: 1, side: 44 }) + rect(254, 110, 16, 40, C.stone, LINE.form) +
    fig(404, 326, 0.62, 'farmer', { pose: 'low', legs: 'brace', tone: 1, inFront: line(`M38 -56L60 -4`, 3) + poly([[54, -6], [68, -8], [66, 2], [56, 3]], C.slateLight, LINE.fine) }) +
    sheaf(116, 300, 0.9) + sheaf(70, 322, 1.1);
}

/** Noble Estate: a stone manor with a courtyard wall, an owner on the step. */
function blueprint() {
  const manor = rect(170, 94, 300, 136, C.stoneLight, LINE.heavy) + masonry(172, 100, 296, 126, 12, { rows: 9 }) + poly([[160, 94], [206, 44], [434, 44], [480, 94]], C.terraDark, LINE.heavy) +
    ticks(Array.from({ length: 14 }, (_, i) => [214 + i * 16, 46, 186 + i * 20, 92]), LINE.fine, C.terra) + rect(222, 20, 18, 34, C.stone, LINE.form) + rect(396, 20, 18, 34, C.stone, LINE.form) +
    [212, 268, 372, 428].map((x) => window3(x, 138, 22, 32) + window3(x, 208, 22, 40)).join('') +
    poly([[282, 142], [320, 112], [358, 142]], C.ivory, LINE.form) + door(320, 230, 44, 76);
  const steps = rect(280, 230, 80, 7, C.ivory, LINE.fine) + rect(268, 237, 104, 7, C.stoneLight, LINE.fine);
  return sky() + cloud(40, 50) + cloud(510, 72, 100) + hills(150, C.slateLight, 30, 8) + ground(186) +
    cypress(120, 232, 130) + cypress(150, 232, 104) + cypress(520, 232, 130) + cypress(490, 232, 104) + manor + steps +
    path(`M268 244L60 360H580L372 244Z`, C.parchmentDark, LINE.form) +
    rect(0, 248, 200, 44, C.stone, LINE.heavy) + rect(440, 248, 200, 44, C.stone, LINE.heavy) + masonry(4, 252, 190, 38, 2, { rows: 3 }) + masonry(444, 252, 190, 38, 3, { rows: 3 }) +
    fig(320, 236, 0.5, 'noble', { pose: 'hip', tone: 0 }) + fig(262, 320, 0.62, 'goodwife', { pose: 'stand', dir: 1, tone: 1 });
}

/** Royal Debt: the note itself, chained to a heavy iron lock and a nearly empty purse. */
function rust() {
  const board = rect(0, 0, W, 360, C.woodDark, 0) + line(`M0 90H640M0 180H640M0 270H640M210 0V90M430 90V180M120 180V270M520 270V360`, 1.2, C.ink);
  const note = `<g transform="rotate(-5 320 180)">` + rect(180, 48, 280, 264, C.parchment, LINE.heavy) + rect(200, 66, 240, 228, 'none', LINE.fine, C.goldDark) + line(`M226 100H414M226 124H414M226 148H400M226 172H414M226 196H360`, LINE.form, C.stoneDark) + path(`M300 232C318 214 360 222 352 244C344 262 306 262 300 232Z`, C.burgundy, LINE.form) + `</g>`;
  let chain = '';
  for (let i = 0; i < 10; i++) chain += ell(40 + i * 40, 280 + Math.sin(i * 0.9) * 12, 19, 11, 'none', 8, C.ink) + ell(40 + i * 40, 280 + Math.sin(i * 0.9) * 12, 19, 11, 'none', 4, C.slateLight);
  const lock = path(`M470 216C470 156 560 156 560 216`, 'none', 18, C.ink) + path(`M470 216C470 156 560 156 560 216`, 'none', 11, C.slateLight) + rect(446, 212, 138, 106, C.slate, LINE.heavy) + ell(515, 256, 14, 14, C.slateDeep, 0) + rect(509, 262, 12, 28, C.slateDeep, 0);
  return board + note + chain + lock + purse(96, 264, 1.5, C.wood) + coin(150, 262, 10, C.terra);
}

/* ---------- Crown Projects: the building is the subject. ---------- */

/** River Quay: a long stone wharf with moored boats and a crane. */
function canal_lights() {
  const quay = poly([[0, 196], [380, 196], [640, 360], [0, 360]], C.stone, LINE.heavy) + masonry(4, 230, 420, 120, 4, { rows: 8, gaps: 0.2 }) + poly([[0, 196], [380, 196], [392, 206], [0, 206]], C.stoneLight, LINE.form);
  const shore = roofline(196, 12, { from: 0, to: 390, h: 66 });
  const crane = line(`M90 196V90L170 56`, 7) + line(`M90 196V90L170 56`, 4, C.woodLight) + line(`M170 56V124`, LINE.fine) + sack(170, 150, 0.5);
  return sky() + cloud(420, 70, 120) + hills(150, C.slateLight, 24, 6) + water(180) + shore + quay + crane +
    ship(506, 262, 0.7, { furled: true }) + ship(600, 208, 0.34) + barrel(210, 262, 1.1) + barrel(250, 268, 1.1) + barrel(228, 232, 0.9) + sack(120, 300, 1) + sack(164, 322, 1, C.parchment) +
    fig(310, 270, 0.56, 'worker', { pose: 'head', tone: 2, inFront: sack(0, -128, 0.8) }) + fig(70, 342, 0.7, 'merchant', { pose: 'give' });
}

/** Bell Tower: one tall tower above a tight huddle of roofs, seen from below. */
function public_clock() {
  const t = rect(250, 70, 140, 290, C.stoneLight, LINE.heavy) + masonry(254, 90, 132, 240, 21, { rows: 16 }) + rect(240, 136, 160, 10, C.ivory, LINE.form) + rect(240, 56, 160, 12, C.ivory, LINE.form);
  const belfry = arch(286, 134, 44, 66, C.slateDeep, LINE.form) + arch(354, 134, 44, 66, C.slateDeep, LINE.form) + line(`M266 78H306M334 78H374`, LINE.form, C.woodDark) + bell(286, 116, 0.8) + bell(354, 116, 0.8);
  const spire = poly([[238, 56], [320, -46], [402, 56]], C.slateDark, LINE.heavy) + line(`M272 54L320 -20M368 54L320 -20`, LINE.fine, C.slate) + poly([[246, 56], [262, 22], [278, 56]], C.slate, LINE.form) + poly([[362, 56], [378, 22], [394, 56]], C.slate, LINE.form);
  return sky(C.skyLow, C.sky, 140) + cloud(60, 70, 110) + cloud(490, 110, 110) + roofline(260, 3, { h: 70 }) + t + belfry + spire + window3(320, 220, 26, 44) + door(320, 360, 50, 66) + roofline(360, 9, { from: 0, to: 230, h: 56, sw: LINE.heavy }) + roofline(360, 10, { from: 410, to: 650, h: 56, sw: LINE.heavy });
}

/** Charter Fair: a field of striped tents with pennants, seen from a rise. */
function makers_fair() {
  const tent = (x, y, w, h, a, b) => {
    let s = '';
    const n = 6;
    for (let i = 0; i < n; i++) s += poly([[x, y - h], [x - w / 2 + (i * w) / n, y - h * 0.38], [x - w / 2 + ((i + 1) * w) / n, y - h * 0.38]], i % 2 ? b : a, LINE.fine);
    s += rect(x - w / 2, y - h * 0.38, w, h * 0.38, b, LINE.form) + poly([[x - 12, y], [x, y - h * 0.34], [x + 12, y]], C.slateDeep, LINE.fine) + line(`M${x} ${y - h}V${y - h - 22}`, LINE.form) + path(`M${x} ${y - h - 22}l18 5l-18 6Z`, a, LINE.fine);
    return s;
  };
  return sky() + cloud(60, 54) + cloud(480, 48, 110) + hills(150, C.slateLight, 34, 3) + ground(142, C.sageLight) +
    tree(40, 170, 0.6) + tent(120, 188, 96, 80, C.terra, C.ivory) + tent(320, 176, 108, 92, C.burgundy, C.goldLight) + tent(510, 186, 100, 82, C.slate, C.ivory) + tree(602, 180, 0.7) +
    tent(218, 262, 136, 120, C.sageDark, C.parchment) + tent(428, 270, 146, 126, C.burgundyLight, C.ivory) +
    fig(90, 300, 0.48, 'wife', { tone: 1 }) + fig(320, 300, 0.5, 'merchant', { dir: -1, pose: 'give' }) + fig(290, 306, 0.48, 'goodwife', { pose: 'give', tone: 2 }) + fig(560, 330, 0.6, 'herald', { dir: -1, pose: 'raise', inFront: line(`M24 -148L28 -180`, 3) }) + stall(30, 356, 120, 70, C.gold, C.ivory, 5) + sack(170, 350, 0.7);
}

/** King's Road: dead straight in strong perspective, between milestones, toward a far castle. */
function tram_extension() {
  let poplars = '';
  for (const [d, h] of [[160, 40], [110, 56], [70, 80], [26, 112]]) poplars += cypress(320 - d * 2.1, 172 + 250 / (d * 0.08 + 1) * 0.3, h, h * 0.24) + cypress(320 + d * 2.1, 172 + 250 / (d * 0.08 + 1) * 0.3, h, h * 0.24);
  const castle = tower(296, 150, 16, 44, { sw: LINE.form, cone: true }) + tower(344, 150, 16, 44, { sw: LINE.form, cone: true }) + rect(300, 118, 40, 32, C.stone, LINE.form) + tower(320, 130, 16, 40, { sw: LINE.form, cone: true, roof: C.burgundy });
  const road = poly([[306, 152], [334, 152], [560, 360], [80, 360]], C.parchmentDark, LINE.heavy) + line(`M320 158V190M320 210V246M320 272V320`, 3, C.stoneDark) + line(`M302 170L238 240M338 170L402 240`, LINE.fine, C.stoneDeep);
  const stone = (x, y, s) => rect(x - 9 * s, y - 34 * s, 18 * s, 34 * s, C.stoneLight, LINE.form) + ell(x, y - 34 * s, 9 * s, 7 * s, C.stoneLight, LINE.form);
  return sky() + cloud(70, 60, 110) + cloud(450, 50, 120) + hills(160, C.slateLight, 40, 11) + castle + ground(150, C.sage) + road + poplars + stone(150, 300, 1.3) + stone(494, 300, 1.3) + stone(248, 204, 0.6) + stone(392, 204, 0.6) +
    cart(420, 262, 60, '', C.woodLight) + fig(258, 330, 0.62, 'worker', { pose: 'low', legs: 'brace', tone: 1, inFront: line(`M40 -56L60 -2`, 3) });
}

/** Stone Bridge: a three-arched bridge, low viewpoint, travellers on top. */
function skybridge() {
  const deck = path(`M0 164C180 146 460 146 640 164V246H0Z`, C.stoneLight, LINE.heavy);
  const arches = [[120, 90], [320, 110], [520, 90]].map(([x, w]) => path(`M${x - w} 360V270C${x - w} 196 ${x + w} 196 ${x + w} 270V360Z`, C.slateDark, LINE.heavy) + path(`M${x - w} 300C${x - w / 2} 286 ${x + w / 2} 286 ${x + w} 300V360H${x - w}Z`, C.slate, 0)).join('');
  const body = rect(0, 164, W, 196, C.stone, 0) + masonry(0, 170, W, 186, 31, { rows: 12, gaps: 0.2 });
  const cuts = [220, 420].map((x) => poly([[x - 22, 360], [x - 22, 248], [x, 212], [x + 22, 248], [x + 22, 360]], C.stoneLight, LINE.heavy)).join('');
  return sky() + cloud(80, 56) + cloud(470, 70, 100) + hills(150, C.sageLight, 30, 2) + roofline(150, 4, { from: 470, to: 640, h: 40 }) + body + arches + cuts + water(322, C.slateLight, 8) + deck.replace(/C[^V]+V246H0Z/, 'C180 146 460 146 640 164V176C460 158 180 158 0 176Z') +
    fig(150, 158, 0.42, 'merchant', { pose: 'stand' }) + horse(258, 154, 0.5, { fill: C.stoneDark }) + fig(214, 154, 0.42, 'farmer', { legs: 'walk', pose: 'pull' }) + fig(442, 152, 0.42, 'wife', { dir: -1, inFront: '' }) + fig(500, 156, 0.42, 'worker', { dir: -1, pose: 'head', inFront: sack(0, -128, 0.7) });
}

/** Hall of Records: a tall bay of shelves receding from a lantern. */
function library_lanterns() {
  return room(C.stoneLight, C.parchmentDark, 300, 3) + vaultedRoof(C.stone) + shelves(24, 300, 170, 230, 5) + shelves(446, 300, 170, 230, 6) + shelves(228, 288, 184, 176, 7, 4, 'books') + lantern(320, 92, 18) + line(`M320 54V70`, LINE.form) + column(214, 300, 240, 20) + column(426, 300, 240, 20) + table(320, 346, 190, C.woodLight, 34) + `<g>` + rect(268, 302, 104, 8, C.ivory, LINE.fine) + `</g>`;
}

/** River Mill: the wheel fills the frame, water spilling off it. */
function waterwheel() {
  let wheelArt = '';
  const [cx, cy, r] = [230, 214, 116];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    wheelArt += line(`M${cx} ${cy}L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`, 6, C.ink) + line(`M${cx} ${cy}L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`, 3.6, C.woodLight);
    wheelArt += `<g transform="rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r})">` + rect(cx + Math.cos(a) * r - 12, cy + Math.sin(a) * r - 7, 28, 14, C.wood, LINE.form) + `</g>`;
  }
  wheelArt = ell(cx, cy, r, r, 'none', 9, C.ink) + ell(cx, cy, r, r, 'none', 5.5, C.woodLight) + wheelArt + ell(cx, cy, 20, 20, C.woodDark, LINE.form);
  const mill = rect(330, 86, 310, 210, C.stoneLight, LINE.heavy) + masonry(334, 96, 300, 190, 41, { rows: 12 }) + poly([[316, 86], [430, 14], [660, 14], [660, 86]], C.terra, LINE.heavy) + window3(436, 176, 32, 46) + window3(540, 176, 32, 46) + door(492, 296, 52, 86);
  const race = path(`M0 64H210V82H0Z`, C.wood, LINE.form) + line(`M40 82V210M150 82V100`, LINE.form + 3, C.woodDark) + path(`M186 66H226C258 70 268 96 276 126L258 130C250 104 236 84 212 82H186Z`, C.slateLight, LINE.form);
  return sky(C.sageLight) + foliage([[60, 60, 40], [130, 40, 42], [24, 20, 30]], C.sageDark, LINE.form, C.sageDeep) + mill + race + wheelArt + water(296, C.slateLight, 12) + path(`M126 296C166 310 296 312 340 296`, 'none', 5, C.ivory) + fig(584, 300, 0.6, 'smith', { dir: -1, pose: 'low', inFront: sack(34, -22, 0.6) });
}

/** City Walls: great curtain walls and round towers, the town rising behind. */
function city_illumination() {
  const towers = [70, 320, 570].map((x, i) => tower(x, 300, 96, 202, { cone: i === 1 ? false : true, roof: C.slateDark, seed: 50 + i })).join('');
  return sky() + cloud(160, 44, 100) + cloud(430, 60, 110) + roofline(150, 21, { h: 54 }) + tower(200, 150, 40, 70, { sw: LINE.form, roof: C.terraDark }) + tower(460, 150, 30, 60, { sw: LINE.form, roof: C.terra }) + wall(100, 300, 180, 134) + wall(360, 300, 180, 134) + towers + arch(320, 300, 56, 78, C.slateDeep, LINE.heavy) + line(`M300 240V300M320 226V300M340 240V300M294 262H346`, LINE.form, C.woodDark) + ground(300, C.sage) + path(`M290 300L190 360H450L350 300Z`, C.parchmentDark, LINE.form) + pennon(304, 118, 32, 46) + fig(220, 340, 0.5, 'guard', { pose: 'stand', behind: '' }) + banner(70, 96, 40, C.burgundy, C.gold, 0.7, 1);
}

/** Harbour Light: a beacon on rocks over a dusky sea, one ship coming in. */
function harbor_beacon() {
  const rays = [[-180, 50], [-120, 10], [-60, -4], [90, -2], [170, 30], [250, 70]].map(([dx, dy]) => poly([[410, 78], [410 + dx * 1.4, 78 + dy - 16], [410 + dx * 1.4, 78 + dy + 16]], C.slate, 0)).join('');
  const rocks = path(`M250 360C262 300 296 262 340 256C360 228 460 226 490 256C540 268 590 312 610 360Z`, C.stoneDark, LINE.heavy) + line(`M320 290L350 310M420 268L460 300M520 300L540 330`, LINE.form, C.stoneDeep);
  const t = poly([[372, 256], [386, 96], [434, 96], [448, 256]], C.stoneLight, LINE.heavy) + masonry(380, 110, 60, 140, 5, { rows: 9 }) + rect(376, 88, 68, 10, C.ivory, LINE.form) + rect(388, 54, 44, 34, C.goldLight, LINE.form) + line(`M410 54V88M388 72H432`, LINE.fine) + flame(410, 86, 0.6) + poly([[380, 54], [410, 28], [440, 54]], C.slateDeep, LINE.form) + arch(410, 256, 22, 40, C.woodDark, LINE.form);
  return night() + rays + ell(90, 66, 24, 24, C.ivory, LINE.fine) + water(220, C.slateDark, 7).replace(C.slate, C.slateDeep) + ship(150, 292, 0.86, { sail: C.parchment }) + rocks + t;
}

/** Castle Gate: gatehouse straight on, portcullis half raised over a drawbridge. */
function foundry_gate() {
  const gate = wall(0, 280, 640, 172, C.stone, 18);
  let bars = '';
  for (let x = 262; x <= 378; x += 19) bars += `M${x} 134V208`;
  for (let y = 150; y <= 200; y += 20) bars += `M250 ${y}H390`;
  const portcullis = arch(320, 280, 148, 180, C.slateDeep, LINE.heavy) + line(bars, 5, C.ink) + line(bars, 2.6, C.woodLight);
  const towers = [150, 490].map((x, i) => tower(x, 280, 112, 216, { cone: false, seed: 60 + i }) + rect(x - 10, 110, 20, 40, C.slateDeep, LINE.fine) + rect(x - 10, 180, 20, 40, C.slateDeep, LINE.fine)).join('');
  const bridge = poly([[246, 280], [394, 280], [470, 360], [170, 360]], C.woodLight, LINE.heavy) + line(`M232 300H408M212 322H428M192 344H448`, LINE.fine, C.woodDark);
  return sky() + cloud(10, 50, 110) + cloud(540, 40, 90) + gate + towers + portcullis + pennon(120, 64, 60, 62) + pennon(460, 64, 60, 62) + rect(0, 280, W, 80, C.slate, LINE.form) + line(`M20 310q20 -5 40 0M110 340q20 -5 40 0M500 320q20 -5 40 0`, LINE.fine, C.slateDark) + bridge + fig(232, 330, 0.76, 'guard', { pose: 'stand', behind: pike(26, -6, 180) }) + fig(408, 330, 0.76, 'guard', { dir: -1, behind: pike(26, -6, 180) });
}
const pike = (x, y, h) => line(`M${x} ${y}V${y - h}`, 4.5) + line(`M${x} ${y}V${y - h}`, 2.2, C.woodLight) + poly([[x - 6, y - h], [x, y - h - 20], [x + 6, y - h]], C.slateLight, LINE.fine);

/** Exchange Hall: an open loggia seen from the square, deals inside the arches. */
function power_exchange() {
  const hall = rect(40, 88, 560, 212, C.stoneLight, LINE.heavy) + masonry(44, 92, 552, 60, 72, { rows: 4 }) + poly([[20, 88], [100, 24], [540, 24], [620, 88]], C.terra, LINE.heavy) + rect(30, 80, 580, 12, C.ivory, LINE.form);
  const bays = [116, 218, 320, 422, 524];
  const arcade = bays.map((x) => arch(x, 300, 84, 136, C.slateDark, LINE.form)).join('') + [65, 167, 269, 371, 473, 575].map((x) => column(x, 300, 134, 14, C.ivory)).join('');
  const oculi = bays.map((x) => ell(x, 116, 15, 15, C.slateDark, LINE.form)).join('');
  const inside = fig(100, 298, 0.56, 'merchant', { pose: 'give' }) + fig(142, 298, 0.56, 'burgher', { dir: -1, pose: 'give' }) + fig(320, 296, 0.56, 'clerk', { pose: 'write' }) + table(362, 298, 50, C.woodLight, 30) + fig(410, 298, 0.56, 'lady', { dir: 1, pose: 'point' }) + fig(444, 298, 0.56, 'merchant', { dir: -1, pose: 'hip', top: C.terra, sleeve: C.terraDark, skirt: C.terra }) + fig(218, 298, 0.56, 'noble', { dir: 1 });
  return sky() + cloud(240, 20, 100) + hall + oculi + arcade + inside + paving(300, C.stone, 6) + fig(84, 350, 0.72, 'merchant', { pose: 'point', top: C.burgundyDark, skirt: C.burgundyDark, sleeve: C.burgundy }) + fig(560, 350, 0.72, 'worker', { dir: -1, pose: 'low', inFront: bale(36, -6, 44, 26) });
}
const bale = (x, y, w, h) => rect(x - w / 2, y - h, w, h, C.burgundyLight, LINE.form) + line(`M${x - w / 4} ${y - h}V${y}M${x + w / 4} ${y - h}V${y}`, LINE.fine, C.woodDark);

/** Royal Granary: a great raised storehouse on staddle stones, ladder and loading door. */
function rail_terminus() {
  const barn = rect(110, 104, 420, 150, C.woodLight, LINE.heavy) + poly([[86, 104], [190, 16], [450, 16], [554, 104]], C.terraDark, LINE.heavy) + ticks(Array.from({ length: 18 }, (_, i) => [196 + i * 15, 18, 118 + i * 24, 102]), LINE.fine, C.terra) + line(Array.from({ length: 18 }, (_, i) => `M${134 + i * 22} 104V254`).join(''), LINE.fine, C.wood);
  const staddles = [130, 230, 320, 410, 510].map((x) => rect(x - 7, 254, 14, 24, C.stone, LINE.form) + ell(x, 254, 22, 7, C.stoneLight, LINE.form)).join('');
  const hatch = rect(290, 128, 60, 66, C.slateDeep, LINE.form) + line(`M320 44V128`, LINE.form + 2, C.woodDark) + poly([[320, 58], [370, 58], [370, 66], [320, 66]], C.woodDark, LINE.fine) + line(`M366 66V110`, LINE.fine) + sack(366, 148, 0.72);
  const crest = pennon(180, 136, 38, 54) + pennon(420, 136, 38, 54);
  return sky() + cloud(20, 50) + cloud(530, 40, 90) + hills(170, C.sageLight, 28, 6) + ground(278, C.parchmentDark) + barn + staddles + hatch + crest + line(`M238 280L290 188M264 280L316 188M246 262L272 262M256 244L282 244M266 226L292 226M276 208L302 208`, LINE.form + 1, C.woodDark) + fig(278, 256, 0.5, 'worker', { pose: 'head', inFront: sack(0, -128, 0.76) }) + sack(120, 320, 1.2) + sack(176, 340, 1.1, C.parchment) + sack(70, 348, 1) + fig(490, 342, 0.74, 'clerk', { dir: -1, pose: 'write', inFront: rect(30, -94, 22, 28, C.ivory, LINE.fine) });
}

/** Great Conduit: long tiered arches striding across a valley. */
function aqueduct() {
  let upper = '';
  let lower = '';
  for (let i = -1; i < 10; i++) upper += arch(40 + i * 74, 170, 50, 66, C.sky, LINE.form);
  for (let i = -1; i < 7; i++) lower += arch(58 + i * 111, 300, 80, 122, C.skyLow, LINE.form);
  const body = rect(0, 86, W, 214, C.stone, LINE.heavy) + masonry(0, 90, W, 208, 80, { rows: 15, gaps: 0.25 }) + rect(0, 170, W, 8, C.stoneLight, LINE.form) + rect(0, 76, W, 12, C.stoneLight, LINE.form);
  return sky() + cloud(60, 40, 100) + cloud(450, 34, 110) + hills(190, C.slateLight, 60, 7) + body + upper + lower + ground(298, C.sage) + path(`M0 340C160 310 340 350 640 318V360H0Z`, C.slateLight, LINE.form) + `<g>` + rect(280, 262, 52, 38, C.stoneLight, LINE.form) + `</g>` + line(`M270 300V190M342 300V190M270 240H342M270 200H342`, LINE.form + 1, C.woodDark) + fig(306, 240, 0.42, 'worker', { pose: 'hammer' }) + fig(250, 330, 0.62, 'smith', { pose: 'low', legs: 'brace', tone: 1 }) + fig(392, 322, 0.62, 'burgher', { dir: -1, pose: 'point' });
}

/** Common Fields: strip fields under a big sky, stooks in rows, villagers sharing out. */
function common_fields() {
  let strips = '';
  const fills = [C.goldLight, C.gold, C.sageLight, C.goldLight, C.terraLight, C.sage];
  for (let i = 0; i < 6; i++) strips += poly([[60 + i * 86, 170], [146 + i * 86, 170], [-120 + (i + 1) * 148, 360], [-120 + i * 148, 360]], fills[i], LINE.form);
  return sky() + cloud(90, 60, 120) + cloud(420, 44, 90) + hills(160, C.slateLight, 26, 4) + roofline(170, 15, { from: 40, to: 200, h: 22, sw: LINE.fine }) + tree(590, 180, 0.7) + strips + [[160, 214, 0.5], [260, 220, 0.56], [430, 218, 0.52], [520, 230, 0.6]].map(([x, y, s]) => sheaf(x, y, s)).join('') + sheaf(96, 330, 1.5) + sheaf(570, 346, 1.6) + fig(232, 322, 0.76, 'farmer', { pose: 'give', tone: 1, inFront: sheaf(52, -74, 0.7) }) + fig(320, 326, 0.76, 'wife', { dir: -1, pose: 'both' }) + fig(404, 300, 0.56, 'goodwife', { dir: -1, pose: 'head', inFront: sheaf(0, -128, 0.7), tone: 2 });
}

/** Merchants' Guildhall: a great timbered hall on a pillared open ground floor. */
function merchants_guildhall() {
  const hall = rect(120, 60, 400, 120, C.parchment, LINE.heavy) + poly([[100, 60], [320, -26], [540, 60]], C.terraDark, LINE.heavy) + line(`M120 120H520M180 60V180M240 60V180M300 60V180M340 60V180M400 60V180M460 60V180M120 60L180 120M240 60L180 120M300 60L240 120M340 60L400 120M460 60L400 120M520 60L460 120`, LINE.form + 0.4, C.woodDark) + [210, 270, 370, 430].map((x) => rect(x - 14, 132, 28, 28, C.slateDark, LINE.fine)).join('');
  const loggia = rect(120, 180, 400, 90, C.slateDark, LINE.heavy) + [130, 210, 290, 350, 430, 510].map((x) => column(x, 270, 84, 14, C.stoneLight)).join('');
  return sky() + cloud(20, 40) + cloud(540, 50, 90) + roofline(270, 8, { from: 0, to: 120, h: 110 }) + roofline(270, 9, { from: 520, to: 660, h: 110 }) + hall + loggia + bannerHall() + paving(270, C.stone, 12) + stall(24, 338, 150, 92, C.burgundy, C.ivory, 6) + stall(470, 342, 150, 96, C.sageDark, C.goldLight, 6) + fig(248, 340, 0.72, 'merchant', { pose: 'give' }) + fig(294, 340, 0.72, 'burgher', { dir: -1, pose: 'both' }) + barrel(370, 346, 1) + fig(420, 330, 0.6, 'wife', { dir: -1, tone: 1 });
}
const bannerHall = () => pennon(304, 6, 32, 44);

export const TREASURY = { scrap: ['Bronze', scrap], cog: ['Silver', cog], notebook: ['Homestead', notebook], blueprint: ['Noble Estate', blueprint], rust: ['Royal Debt', rust] };
export const PROJECTS = {
  canal_lights: ['River Quay', canal_lights], public_clock: ['Bell Tower', public_clock], makers_fair: ['Charter Fair', makers_fair], tram_extension: ['King’s Road', tram_extension], skybridge: ['Stone Bridge', skybridge],
  library_lanterns: ['Hall of Records', library_lanterns], waterwheel: ['River Mill', waterwheel], city_illumination: ['City Walls', city_illumination], harbor_beacon: ['Harbour Light', harbor_beacon], foundry_gate: ['Castle Gate', foundry_gate],
  power_exchange: ['Exchange Hall', power_exchange], rail_terminus: ['Royal Granary', rail_terminus], aqueduct: ['Great Conduit', aqueduct], common_fields: ['Common Fields', common_fields], merchants_guildhall: ['Merchants’ Guildhall', merchants_guildhall],
};
