/** The five pilot illustrations (docs/ART_BIBLE.md), by stable card key. Run: node scripts/build-pilot-art.mjs */
import { arch, archD, C, cypress, ell, foliage, group, H, line, LINE, masonry, path, person, poly, rect, rng, ticks, W } from './kit.mjs';

const beadRing = (cx, cy, r, count, size, fill) => {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    s += ell(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, size, fill, 0);
  }
  return s;
};

/** One coin on its side in a stack, hammered and not quite round. */
const stackCoin = (x, y, r) =>
  path(`M${x - r} ${y}C${x - r} ${y + 11} ${x + r} ${y + 11} ${x + r} ${y}V${y + 11}C${x + r} ${y + 22} ${x - r} ${y + 22} ${x - r} ${y + 11}Z`, C.goldDark, LINE.form) +
  ell(x, y, r, r * 0.3, C.gold, LINE.form) +
  path(`M${x - r * 0.62} ${y}C${x - r * 0.4} ${y - r * 0.13} ${x + r * 0.35} ${y - r * 0.14} ${x + r * 0.6} ${y - 1}`, 'none', LINE.fine, C.goldLight);

function stack(x, base, r, count, seed) {
  const random = rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) s += stackCoin(x + (random() - 0.5) * 7, base - i * 13, r + (random() - 0.5) * 3);
  return s;
}

/** Gold: an object study. A struck coin on a counting cloth with the rest of the hoard behind it. */
export function dynamo() {
  const cx = 412;
  const cy = 180;
  const r = 128;
  const cloth = rect(0, 0, W, H, C.burgundy, 0);
  // A woven lozenge pattern, quiet enough to stay behind the coin.
  let weave = '';
  for (let i = -8; i < 20; i++) weave += `M${i * 54} 0L${i * 54 + 360} 360M${i * 54 + 360} 0L${i * 54} 360`;
  const pattern = line(weave, 1, C.burgundyDark);
  const fold = path(`M0 300C110 276 190 322 300 322S520 292 640 318V360H0Z`, C.burgundyDark, 0);
  const shadow = ell(cx + 10, cy + 12, r + 3, r + 3, C.burgundyDark, 0);
  const edge = path(`M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}L${cx + r - 2} ${cy - 7}A${r} ${r} 0 1 1 ${cx - r + 2} ${cy - 7}Z`, C.goldDark, 0);

  // The purse, slumped behind the stacks.
  const purse =
    path(`M64 232C24 206 28 122 92 96C84 84 84 72 92 62L146 58C156 70 154 84 146 92C208 112 226 202 182 236Z`, C.wood, LINE.heavy) +
    path(`M146 92C208 112 226 202 182 236L150 236C186 200 176 124 136 96Z`, C.woodDark, 0) +
    path(`M90 94Q118 106 148 90`, 'none', LINE.heavy, C.ivory) +
    line(`M92 62L104 90M110 58L114 94M128 58L126 96M146 60L136 92`, LINE.fine) +
    line(`M70 150C78 138 90 130 100 126M74 186C82 170 94 160 106 154`, LINE.fine) +
    path(`M92 96C80 102 74 118 80 128C86 122 92 112 96 102Z`, C.parchment, LINE.fine);

  const coin = [
    shadow,
    ell(cx, cy, r, r, C.gold, LINE.heavy),
    edge,
    ell(cx, cy, r, r, 'none', LINE.heavy),
    // Light strikes the upper left of the raised rim.
    path(`M${cx - 106} ${cy - 46}A116 116 0 0 1 ${cx - 28} ${cy - 113}`, 'none', 5, C.goldLight),
    ell(cx, cy, r - 21, r - 21, 'none', LINE.form),
    beadRing(cx, cy, r - 12, 46, 2.6, C.goldDark),
    ell(cx, cy, r - 21, r - 21, C.goldLight, LINE.form),
    // Flat shade on the field, never a gradient.
    path(`M${cx + 62} ${cy - 80}A${r - 21} ${r - 21} 0 0 1 ${cx - 78} ${cy + 66}C${cx - 8} ${cy + 88} ${cx + 82} ${cy + 16} ${cx + 62} ${cy - 80}Z`, C.gold, 0),
    ell(cx, cy, r - 21, r - 21, 'none', LINE.form),
    // The device: a crown over two laurel branches, ours and not a historical mint's.
    path(`M${cx - 56} ${cy + 6}L${cx - 66} ${cy - 56}L${cx - 34} ${cy - 22}L${cx - 22} ${cy - 66}L${cx} ${cy - 30}L${cx + 22} ${cy - 66}L${cx + 34} ${cy - 22}L${cx + 66} ${cy - 56}L${cx + 56} ${cy + 6}Q${cx} ${cy - 8} ${cx - 56} ${cy + 6}Z`, C.gold, LINE.heavy),
    path(`M${cx - 56} ${cy + 6}Q${cx} ${cy - 8} ${cx + 56} ${cy + 6}L${cx + 54} ${cy + 20}Q${cx} ${cy + 6} ${cx - 54} ${cy + 20}Z`, C.goldDark, LINE.form),
    ell(cx - 66, cy - 60, 6, 6, C.ivory, LINE.form),
    ell(cx - 22, cy - 72, 6, 6, C.ivory, LINE.form),
    ell(cx + 22, cy - 72, 6, 6, C.ivory, LINE.form),
    ell(cx + 66, cy - 60, 6, 6, C.ivory, LINE.form),
    ell(cx, cy - 2, 6, 6, C.burgundy, LINE.form),
    ell(cx - 30, cy + 6, 3.6, 3.6, C.burgundy, LINE.fine),
    ell(cx + 30, cy + 6, 3.6, 3.6, C.burgundy, LINE.fine),
  ];
  // Two laurel branches curling under the crown.
  for (const side of [-1, 1]) {
    coin.push(line(`M${cx + side * 6} ${cy + 86}C${cx + side * 40} ${cy + 80} ${cx + side * 72} ${cy + 58} ${cx + side * 84} ${cy + 24}`, LINE.form));
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const lx = cx + side * (16 + t * 66);
      const ly = cy + 84 - t * t * 56;
      coin.push(ell(lx, ly - 8, 4, 8.6, C.gold, LINE.fine, C.ink, side * (20 + t * 50)));
      coin.push(ell(lx - side * 4, ly + 8, 3.6, 7.6, C.gold, LINE.fine, C.ink, side * (80 + t * 40)));
    }
  }

  const loose =
    ell(208, 330, 44, 15, C.burgundyDark, 0) +
    path(`M170 318C170 332 246 336 246 320V328C246 342 170 340 170 326Z`, C.goldDark, LINE.form) +
    ell(208, 318, 38, 12, C.gold, LINE.form) +
    ell(208, 318, 27, 8, 'none', LINE.fine) +
    line(`M186 314C196 310 214 310 226 313`, LINE.fine, C.goldLight);

  return [cloth, pattern, fold, purse, stack(88, 288, 48, 7, 1), stack(216, 272, 42, 3, 2), stack(38, 322, 42, 3, 3), loose, ...coin].join('');
}

/** A clipped lawn bed in a formal garden, in plan laid over the slope. */
const bed = (x, y, w, h, skew) =>
  poly([[x + skew, y], [x + w - skew, y], [x + w, y + h], [x, y + h]], C.sageLight, LINE.fine) +
  line(`M${x + w / 2} ${y}V${y + h}M${x + skew / 2} ${y + h / 2}H${x + w - skew / 2}`, LINE.fine, C.sageDark) ;

function window2(x, y, w = 13, h = 26) {
  return rect(x - w / 2 - 3, y - h - 3, w + 6, h + 6, C.stoneLight, LINE.fine) + rect(x - w / 2, y - h, w, h, C.slateDark, LINE.fine) + line(`M${x} ${y - h}V${y}M${x - w / 2} ${y - h / 2}H${x + w / 2}`, LINE.fine, C.slateLight);
}

/** Grand Duchy: an estate seen from the avenue, with the land that pays for it around it. */
export function monument() {
  const sky = rect(0, 0, W, H, C.sky, 0) + rect(0, 96, W, 90, C.skyLow, 0);
  const clouds =
    path(`M62 52C70 38 98 38 106 48C118 40 142 44 146 56H52C52 54 56 52 62 52Z`, C.ivory, LINE.fine) +
    path(`M470 72C478 56 510 54 520 66C534 58 566 62 572 78H456C458 74 464 72 470 72Z`, C.ivory, LINE.fine) +
    path(`M270 30C276 22 298 22 304 30C312 26 328 28 332 36H258C260 32 264 30 270 30Z`, C.ivory, LINE.fine);
  const hillsFar =
    path(`M0 150C60 118 120 118 190 140S330 118 420 124S580 104 640 138V220H0Z`, C.slateLight, LINE.form) +
    // A hill town on the far ridge.
    rect(70, 112, 11, 22, C.stoneLight, LINE.fine) + poly([[70, 112], [75, 102], [81, 112]], C.terra, LINE.fine) + rect(86, 120, 22, 14, C.stoneLight, LINE.fine) + poly([[86, 120], [97, 112], [108, 120]], C.terra, LINE.fine) + rect(54, 122, 18, 12, C.stoneLight, LINE.fine) + poly([[54, 122], [63, 116], [72, 122]], C.terra, LINE.fine);
  const hillsNear = path(`M0 172C70 148 150 158 230 170H420C490 150 570 148 640 170V260H0Z`, C.sage, LINE.form);
  // Vines run down the flanks in rows, the estate's income.
  let vines = '';
  for (let i = 0; i < 9; i++) vines += `M${478 + i * 18} ${166 - (i > 4 ? 4 : 0)}L${450 + i * 25} 240`;
  let vineL = '';
  for (let i = 0; i < 7; i++) vineL += `M${20 + i * 20} ${164}L${i * 26 - 12} 240`;
  const rows = line(vines, 2.2, C.sageDeep) + line(vineL, 2.2, C.sageDeep);

  // The house, symmetric on x = 320.
  const m = 320;
  const wallTop = 104;
  const ground = 212;
  const towers = [m - 164, m + 164]
    .map((x, i) => {
      const w = 56;
      return (
        rect(x - w / 2, 66, w, ground - 66, C.stone, LINE.heavy) +
        masonry(x - w / 2 + 2, 76, w - 4, ground - 80, 30 + i, { rows: 12 }) +
        // Merlons on corbels: a house that used to be a fortress.
        rect(x - w / 2 - 5, 56, w + 10, 12, C.stoneLight, LINE.form) +
        ticks([0, 1, 2, 3, 4].map((k) => [x - w / 2 + 2 + k * 13, 56, x - w / 2 + 2 + k * 13, 68]), LINE.fine) +
        poly([[x - w / 2 - 7, 56], [x, 22], [x + w / 2 + 7, 56]], C.terra, LINE.heavy) +
        line(`M${x - 18} 44L${x} 30M${x + 18} 44L${x} 30`, LINE.fine, C.terraDark) +
        window2(x, 104, 14, 24) +
        window2(x, 160, 14, 24)
      );
    })
    .join('');
  const block =
    rect(m - 136, wallTop, 272, ground - wallTop, C.stoneLight, LINE.heavy) +
    // Rough-cut ground floor under a smooth upper storey.
    rect(m - 136, 164, 272, ground - 164, C.stone, LINE.form) +
    masonry(m - 134, 166, 268, ground - 168, 5, { rows: 6, gaps: 0.1 }) +
    // A long terracotta hip roof with a lantern on top.
    poly([[m - 146, wallTop], [m - 106, 66], [m + 106, 66], [m + 146, wallTop]], C.terra, LINE.heavy) +
    ticks(Array.from({ length: 16 }, (_, k) => [m - 100 + k * 13.4, 67, m - 124 + k * 16.5, wallTop - 1]), LINE.fine, C.terraDark) +
    rect(m - 148, wallTop - 2, 296, 8, C.ivory, LINE.form) +
    rect(m - 22, 40, 44, 28, C.stoneLight, LINE.form) +
    arch(m - 10, 66, 11, 20, C.slateDark, LINE.fine) +
    arch(m + 10, 66, 11, 20, C.slateDark, LINE.fine) +
    poly([[m - 28, 40], [m, 20], [m + 28, 40]], C.terra, LINE.form) +
    line(`M${m} 20V6`, LINE.form) +
    path(`M${m} 6L${m + 18} 10L${m} 15Z`, C.burgundy, LINE.fine);
  const upper = [-112, -80, -50, 50, 80, 112].map((d) => window2(m + d, 152, 15, 28)).join('');
  // Pedimented centre over a five-bay loggia.
  const center =
    poly([[m - 42, 112], [m, 86], [m + 42, 112]], C.ivory, LINE.form) +
    ell(m, 102, 6, 6, C.gold, LINE.fine) +
    rect(m - 36, 112, 72, 52, C.ivory, LINE.form) +
    arch(m - 16, 160, 16, 34, C.slateDark, LINE.fine) +
    arch(m + 16, 160, 16, 34, C.slateDark, LINE.fine) +
    rect(m - 136, 162, 272, 5, C.ivory, LINE.form);
  let loggia = rect(m - 72, 170, 144, ground - 170, C.slateDeep, LINE.form);
  for (let i = 0; i < 5; i++) loggia += arch(m - 58 + i * 29, ground, 24, 40, C.slateDark, LINE.fine);
  for (let i = 0; i < 6; i++) loggia += rect(m - 74.5 + i * 29, 174, 5, ground - 174, C.ivory, LINE.fine);
  const sideWin = [-110, 110].map((d) => arch(m + d, ground - 8, 15, 28, C.slateDark, LINE.fine)).join('');
  const steps = rect(m - 92, ground, 184, 6, C.ivory, LINE.fine) + rect(m - 104, ground + 6, 208, 6, C.stoneLight, LINE.fine);

  // The garden: an avenue between clipped beds leading the eye up to the door.
  const terrace = path(`M0 214H640V360H0Z`, C.sage, LINE.form);
  const avenue = path(`M296 224H344L460 360H180Z`, C.parchment, LINE.form);
  const beds =
    bed(92, 232, 86, 22, 8) + bed(462, 232, 86, 22, 8) + bed(190, 232, 92, 22, 8) + bed(358, 232, 92, 22, 8) +
    bed(36, 270, 110, 34, 12) + bed(494, 270, 110, 34, 12);
  const hedge = rect(0, 216, 280, 10, C.sageDark, LINE.form) + rect(360, 216, 280, 10, C.sageDark, LINE.form);
  const cyps = [64, 108, 152, 196, 240].map((x) => cypress(x + 2, 222, 44 + (x % 3) * 3)).join('') + [400, 444, 488, 532, 576].map((x) => cypress(x + 2, 222, 44 + (x % 3) * 3)).join('');
  // Gate piers in the near ground, with a pair of orbs.
  const pier = (x) =>
    rect(x - 15, 268, 30, 92, C.stone, LINE.heavy) + masonry(x - 13, 280, 26, 76, x, { rows: 7 }) + rect(x - 19, 258, 38, 12, C.ivory, LINE.form) + ell(x, 244, 14, 14, C.gold, LINE.form) + path(`M${x - 8} 238C${x - 4} 234 ${x} 233 ${x + 3} 233`, 'none', LINE.fine, C.goldLight);
  const trees =
    foliage([[10, 240, 40], [48, 268, 36], [-6, 290, 40], [28, 310, 44]], C.sageDark, LINE.heavy, C.sageDeep) +
    foliage([[630, 240, 40], [596, 268, 36], [650, 290, 40], [616, 310, 44]], C.sageDark, LINE.heavy, C.sageDeep);
  const leaves = line('M18 232q8 -6 14 0M44 262q8 -6 14 0M8 286q8 -6 14 0M30 306q8 -6 14 0M612 232q8 -6 14 0M588 262q8 -6 14 0M622 286q8 -6 14 0M602 306q8 -6 14 0', LINE.fine, C.sageLight);
  const wallL = rect(0, 322, 150, 38, C.stone, LINE.heavy) + rect(490, 322, 150, 38, C.stone, LINE.heavy) + masonry(4, 326, 142, 32, 11, { rows: 4 }) + masonry(494, 326, 142, 32, 12, { rows: 4 });
  // A steward walks up the avenue, small enough to give the house its size.
  const walker = person({ x: 330, y: 300, s: 0.4, dir: -1, top: C.burgundy, hose: C.slateDark, hat: 'beret', line: 3.6, skirt: C.burgundy, armL: [[-13, -102], [-20, -84], [-14, -70]], armR: [[13, -102], [20, -82], [22, -64]], legL: [[-6, -56], [-11, -28], [-15, -3]], legR: [[6, -56], [8, -28], [12, -3]] });
  const walker2 = person({ x: 296, y: 262, s: 0.26, dir: 1, gown: { fill: C.slate }, hat: 'coif', line: 5, collar: null });
  return [sky, clouds, hillsFar, hillsNear, rows, towers, block, upper, center, loggia, sideWin, steps, terrace, hedge, cyps, avenue, beds, wallL, pier(150), pier(490), trees, leaves, walker2, walker].join('');
}

/** Night Watch: a wall walk at dusk. One guard has seen something, the others are only now turning. */
export function night_watch() {
  const nightSky = rect(0, 0, W, H, C.slateDark, 0) + path(`M0 140C160 110 420 110 640 130V230H0Z`, C.slate, 0);
  const moon = ell(120, 66, 34, 34, C.ivory, LINE.form) + ell(108, 58, 7, 7, C.parchmentDark, 0) + ell(130, 78, 5, 5, C.parchmentDark, 0) + path(`M60 92C90 84 130 90 170 86C190 84 206 88 216 92`, 'none', LINE.form, C.slateLight);
  const stars = [[210, 34], [284, 56], [52, 30], [330, 24], [190, 94], [20, 102], [396, 70]].map(([x, y]) => ell(x, y, 1.8, 1.8, C.ivory, 0)).join('');
  // Far hills and a town below the wall, with a few lit windows.
  const hills = path(`M0 160C70 138 120 140 196 156S330 138 440 150V232H0Z`, C.slateDark, LINE.form, C.slateDeep);
  const torches = [[22, 150], [38, 146], [52, 148], [70, 142], [86, 144], [108, 142], [126, 145]].map(([x, y]) => line(`M${x} ${y + 7}V${y}`, LINE.fine, C.ink) + ell(x, y - 1.5, 2.2, 3, C.goldLight, 0.8)).join('');
  const town = [[12, 196, 34, 30], [46, 188, 30, 40], [78, 200, 40, 30], [120, 186, 26, 44], [146, 198, 42, 32], [190, 192, 30, 40], [222, 202, 38, 30], [262, 192, 26, 40], [290, 204, 40, 30]]
    .map(([x, y, w, h], i) => {
      const lit = i % 2 === 0;
      return rect(x, y, w, h, C.slate, LINE.fine, C.slateDeep) + poly([[x - 3, y], [x + w / 2, y - 16], [x + w + 3, y]], C.slateDark, LINE.fine, C.slateDeep) + rect(x + w * 0.25, y + 9, 5, 7, lit ? C.gold : C.slateDeep, 0) + (lit ? rect(x + w * 0.62, y + 15, 5, 7, C.goldLight, 0) : '');
    })
    .join('');

  // The round tower at right, roof and arrow loops, and a brazier burning on its platform.
  const tx = 500;
  const tower =
    rect(tx - 66, 62, 132, 232, C.stoneDark, LINE.heavy) +
    // Lit from the brazier on the left side, as one flat plane.
    path(`M${tx - 66} 62H${tx - 12}C${tx - 2} 130 ${tx - 8} 220 ${tx - 22} 292H${tx - 66}Z`, C.stone, 0) +
    masonry(tx - 62, 84, 124, 206, 21, { rows: 15, gaps: 0.3, ink: C.ink }) +
    rect(tx - 74, 52, 148, 14, C.stone, LINE.form) +
    ticks(Array.from({ length: 9 }, (_, k) => [tx - 72 + k * 18, 66, tx - 72 + k * 18, 74]), LINE.form) +
    poly([[tx - 80, 52], [tx, -24], [tx + 80, 52]], C.slateDeep, LINE.heavy) +
    ticks(Array.from({ length: 5 }, (_, k) => [tx - 54 + k * 27, 40, tx, -10]), LINE.fine, C.slate) +
    arch(tx - 26, 136, 12, 42, C.slateDeep, LINE.form) +
    arch(tx + 30, 216, 12, 42, C.slateDeep, LINE.form) +
    // A door to the walk, with the warm room behind it.
    arch(tx - 46, 298, 40, 74, C.goldLight, LINE.heavy) +
    path(`M${tx - 66} 298V244C${tx - 66} 228 ${tx - 58} 224 ${tx - 50} 224L${tx - 62} 298Z`, C.wood, LINE.form) +
    rect(tx + 44, 134, 90, 164, C.stoneDark, LINE.heavy) +
    masonry(tx + 48, 148, 84, 146, 22, { rows: 11, ink: C.ink });

  const battlements = (x0, x1, y, h, gap, fill) => {
    let out = '';
    for (let x = x0; x < x1; x += gap * 2) out += rect(x, y, gap, h, fill, LINE.heavy);
    return out;
  };
  // The far side of the wall walk, then the guards, then a close near parapet that puts us on the wall.
  const farWall = battlements(0, 400, 200, 34, 34, C.stoneDark) + rect(0, 232, 440, 34, C.stoneDark, LINE.heavy) + masonry(4, 238, 430, 26, 17, { rows: 3, ink: C.ink });
  const walk = rect(0, 266, 640, 40, C.stoneDeep, LINE.form);

  // Lantern glow is a flat shape, as printed colour would be.
    const lantern = (x, y) => line(`M${x} ${y - 14}V${y - 8}`, LINE.form) + rect(x - 7, y - 8, 14, 18, C.goldLight, LINE.form) + poly([[x - 9, y - 8], [x, y - 15], [x + 9, y - 8]], C.woodDark, LINE.fine) + line(`M${x} ${y - 8}V${y + 10}`, LINE.fine);
  // Pointing out over the wall with the whole arm, weight on the front foot.
  const pointing = person({
    x: 118, y: 302, s: 1.16, dir: -1, top: C.burgundy, sleeve: C.burgundy, hose: C.slateDark, skirt: C.burgundyDark, hat: 'kettle', lean: -6, line: 2.8,
    armL: [[-13, -102], [-36, -108], [-60, -116]], armR: [[13, -102], [17, -82], [12, -66]],
    legL: [[-6, -56], [-14, -28], [-18, -3]], legR: [[6, -56], [14, -30], [24, -3]],
    behind: '',
    inFront: path(`M-12 -104Q-2 -109 10 -104C13 -90 12 -76 9 -66Q-2 -62 -11 -66C-14 -78 -14 -92 -12 -104Z`, C.slateLight, 2.2) + line('M-3 -106C-1 -92 -1 -78 -2 -64', 1.2) + line('M-11 -72Q-2 -68 9 -72', 1.2, C.slateDark),
  });
  const halberd = line(`M244 112L256 306`, 5, C.ink) + line(`M244 112L256 306`, 2.2, C.woodLight) +
    path(`M242 96L248 64L252 96Z`, C.stoneLight, 2) + path(`M240 100C228 92 224 110 234 124L252 116L250 100Z`, C.stoneLight, 2) + path(`M250 102L264 92L262 112L251 112Z`, C.stoneLight, 2);
  // Half turned, one hand raising the lantern and the other on the halberd.
  const turning = person({
    x: 238, y: 300, s: 1.08, dir: -1, top: C.slate, sleeve: C.slate, hose: C.woodDark, skirt: C.slateDark, hat: 'hood', line: 2.8,
    armL: [[-13, -102], [-30, -92], [-32, -114]], armR: [[13, -102], [20, -94], [18, -112]],
    legL: [[-6, -56], [-9, -28], [-12, -3]], legR: [[6, -56], [10, -28], [13, -3]],
  });
  // Coming up late through the door, pulling a cloak on.
  const late = person({
    x: 442, y: 300, s: 0.96, dir: -1, top: C.terra, sleeve: C.terraDark, hose: C.slateDark, skirt: C.terraDark, hat: 'cap', line: 2.8,
    armL: [[-13, -102], [-22, -88], [-8, -104]], armR: [[13, -102], [20, -84], [18, -64]],
    legL: [[-6, -56], [-11, -28], [-15, -3]], legR: [[6, -56], [9, -30], [15, -3]],
    behind: path(`M6 -104C24 -92 28 -40 24 -18L4 -40Z`, C.burgundyDark, 2.2),
  });
  const brazier =
    line(`M340 306L352 262M376 306L364 262M358 306V262`, LINE.form) +
    path(`M334 262H382L376 246H340Z`, C.slateDark, LINE.form) +
    path(`M342 246C336 224 350 216 352 198C360 208 362 200 360 188C374 204 382 224 374 246Z`, C.terra, LINE.form) +
    path(`M350 246C346 232 356 228 358 216C366 226 372 234 366 246Z`, C.goldLight, LINE.fine);

  // A near parapet, big and dark, that frames the bottom.
  const near = rect(0, 322, 640, 38, C.slateDark, LINE.heavy) + masonry(4, 328, 632, 30, 41, { rows: 3, ink: C.ink, gaps: 0.1 }) + rect(0, 316, 640, 10, C.stoneDark, LINE.form);
  return [nightSky, moon, stars, hills, torches, town, tower, walk, farWall, halberd, brazier, late, pointing, turning, group('translate(0 0)', lantern(204, 182)), near].join('');
}

/** Royal Confessor: the king has handed over a letter nobody else should read, and it is burning. */
export function royal_confessor() {
  // A chapel in a palace, one window, one door left ajar.
  const wall = rect(0, 0, W, 270, C.stoneLight, 0) + masonry(0, 0, W, 256, 3, { rows: 16, gaps: 0.55, ink: C.stoneDark });
  const vault = path(`M0 0H640V40C560 16 420 12 320 54C220 12 80 16 0 40Z`, C.stone, LINE.form) + line(`M320 0V54`, LINE.form);
  const floorY = 256;
  const floor = rect(0, floorY, W, H - floorY, C.parchment, LINE.heavy);
  // A checkered floor falling to one point, so the eye runs to the middle of the room.
  let dark = '';
  const rowsY = [256, 266, 279, 296, 318, 346, 382];
  for (let r = 0; r < rowsY.length - 1; r++) {
    const y0 = rowsY[r];
    const y1 = rowsY[r + 1];
    for (let c = -8; c < 8; c++) {
      if ((c + r + 100) % 2) continue;
      const a0 = 320 + c * (y0 - 214) * 1.45;
      const a1 = 320 + (c + 1) * (y0 - 214) * 1.45;
      const b0 = 320 + c * (y1 - 214) * 1.45;
      const b1 = 320 + (c + 1) * (y1 - 214) * 1.45;
      dark += `M${a0.toFixed(1)} ${y0}L${a1.toFixed(1)} ${y0}L${b1.toFixed(1)} ${y1}L${b0.toFixed(1)} ${y1}Z`;
    }
  }
  const tiles = path(dark, C.burgundy, LINE.fine);

  // The window, tall and leaded, and the flat shaft of light it lays over the room.
  const wx = 134;
  let leads = '';
  for (let y = -40; y < 220; y += 24) leads += `M${wx - 36} ${y}l72 48M${wx + 36} ${y}l-72 48`;
  const windowArt =
    arch(wx, 212, 92, 192, C.stone, LINE.heavy) +
    arch(wx, 204, 72, 174, C.sky, LINE.form) +
    `<clipPath id="w"><path d="${archD(wx, 204, 72, 174)}"/></clipPath><g clip-path="url(#w)">${line(leads, LINE.fine, C.slate)}</g>` +
    line(`M${wx} 30V204`, LINE.form) +
    rect(wx - 52, 212, 104, 9, C.ivory, LINE.form);
  const shaft = path(`M${wx - 36} 212L${wx + 36} 212L352 346L164 346Z`, C.ivory, 0).replace('fill="', 'opacity=".45" fill="');

  // A tapestry to hang the room's colour on: a walled garden, no people.
  const tap =
    rect(232, 34, 150, 138, C.burgundyDark, LINE.heavy) +
    rect(240, 42, 134, 122, C.sage, LINE.fine) +
    path(`M240 124C276 102 330 110 374 124V164H240Z`, C.sageDark, LINE.fine) +
    foliage([[306, 84, 19], [290, 96, 15], [322, 98, 15]], C.sageDark, 1.4) +
    rect(303, 100, 6, 26, C.woodDark, LINE.fine) +
    [[262, 62], [346, 58], [254, 110], [356, 112], [284, 146], [336, 148]].map(([x, y]) => ell(x, y, 4, 4, C.gold, LINE.fine)).join('') +
    rect(232, 28, 150, 7, C.woodDark, LINE.fine);

  // The door at right, ajar, with a page at the gap who has seen too much.
  const door =
    arch(556, 256, 92, 176, C.stone, LINE.heavy) +
    arch(556, 256, 74, 160, C.slateDeep, LINE.form) +
    path(`M586 256V106C606 124 612 150 612 176V256Z`, C.wood, LINE.form) +
    ticks([[594, 118, 594, 256], [604, 134, 604, 256]], LINE.fine, C.woodDark) +
    ell(594, 186, 2.4, 2.4, C.goldLight, LINE.fine);
  const page = person({
    x: 552, y: 256, s: 0.86, dir: -1, top: C.slateLight, sleeve: C.slateLight, hose: C.woodDark, skirt: C.slate, hat: 'bare', hair: C.hair[2], line: 2.8,
    armL: [[-13, -102], [-20, -84], [-22, -92]], armR: [[13, -102], [20, -86], [28, -94]], skin: C.skin[1], tilt: -7, lean: -2,
    inFront: rect(21, -108, 12, 12, C.gold, 2) + line('M27 -116V-108', 2) + path('M27 -116C22 -122 25 -128 28 -132C31 -126 33 -122 27 -116Z', C.ivory, 1.6),
  });

  // The little altar behind the king.
  const altar =
    rect(404, 192, 122, 64, C.ivory, LINE.heavy) +
    rect(398, 184, 134, 10, C.burgundy, LINE.form) +
    path(`M450 184V136L466 118L482 136V184Z`, C.gold, LINE.form) +
    path(`M456 180V140L466 128L476 140V180Z`, C.burgundyDark, LINE.fine) +
    path(`M466 136V170M459 148H473`, 'none', 2.6, C.goldLight) +
    [414, 516].map((x) => rect(x - 4, 150, 8, 34, C.ivory, LINE.form) + path(`M${x} 150C${x - 6} 144 ${x - 2} 136 ${x} 130C${x + 3} 136 ${x + 6} 144 ${x} 150Z`, C.goldLight, LINE.fine)).join('') +
    rect(430, 208, 72, 34, C.burgundy, LINE.form) +
    ticks([[446, 208, 446, 242], [486, 208, 486, 242]], LINE.fine, C.gold);

  // A kneeling stool under the king.
  const kneeler = path(`M340 330L366 268H430L424 330Z`, C.woodDark, LINE.heavy) + rect(312, 322, 124, 14, C.burgundy, LINE.form) + rect(352, 258, 86, 12, C.wood, LINE.form);
  // The king kneels with head bowed, reaching out. Robes do the talking.
  const king = group(
    'translate(366 332) scale(1.32)',
    path(`M44 2C58 -14 56 -40 44 -58C34 -70 16 -74 2 -72C-14 -68 -28 -44 -32 -24L-24 2Z`, C.burgundy, 2.8),
    path(`M44 2C58 -14 56 -40 44 -58L30 -66C42 -46 44 -18 32 2Z`, C.burgundyDark, 0),
    // Ermine cape.
    path(`M-6 -74C8 -86 26 -84 38 -66C34 -54 20 -48 4 -50C-8 -52 -12 -64 -6 -74Z`, C.ivory, 2.2),
    ...[[6, -66], [18, -70], [28, -62], [12, -56], [24, -54]].map(([x, y]) => ell(x, y, 1.5, 2.2, C.ink, 0)),
    path(`M-24 2Q10 8 44 2L45 -4Q10 1 -26 -5Z`, C.gold, 1.6),
    // Arm stretching out with the letter.
    path(`M0 -66C-16 -62 -30 -58 -44 -60`, 'none', 12.4),
    path(`M0 -66C-16 -62 -30 -58 -44 -60`, 'none', 7.4, C.burgundy),
    ell(-48, -60, 4.6, 4.6, C.skin[0], 2.2),
    // Head bowed.
    `<g transform="translate(-4 -88) rotate(-24)">${ell(0, 0, 8.8, 10.6, C.skin[0], 2.4)}${path(`M6 -8C0 -13 11 -13 10 0C10 5 8 8 5 8C6 4 8 -2 6 -8Z`, C.hair[3], 1.8)}${path(`M-9 -8L-11 -21L-5.5 -15L0 -23L5.5 -15L11 -21L9 -8Q0 -11 -9 -8Z`, C.gold, 2.2)}${ell(0, -13, 1.5, 1.5, C.burgundy, 0)}${ell(-6, -11.5, 1, 1, C.burgundy, 0)}${ell(6, -11.5, 1, 1, C.burgundy, 0)}</g>`,
  );
  // The confessor stands in black, one hand lifting the letter into the brazier and one raised.
  const confessor = person({
    x: 214, y: 340, s: 1.5, dir: 1, top: C.slateDeep, sleeve: C.slateDeep, skin: C.skin[1], gown: { fill: C.slateDeep, w: 28, fold: true }, hat: 'cowl', line: 2.8, collar: null, belt: C.ivory, tilt: 8,
    armL: [[-13, -102], [-26, -116], [-34, -136]], armR: [[13, -102], [26, -86], [42, -78]], lean: 2,
    inFront: path(`M-8 -66C-10 -50 -6 -36 -9 -22`, 'none', 1.8, C.ivory) + ell(-9, -20, 2, 3, C.gold, 1.2),
  });
  // The letter passes between them and over the coals.
  const brazier =
    line(`M272 340L286 296M322 340L308 296M297 340V296`, LINE.form + 1) +
    path(`M268 296C272 312 322 312 326 296Z`, C.slateDark, LINE.heavy) +
    ell(297, 296, 30, 8, C.terra, LINE.form) +
    ell(297, 296, 18, 4.6, C.goldLight, LINE.fine) +
    path(`M286 294C278 276 290 268 292 250C302 262 304 256 304 244C316 262 318 282 310 294Z`, C.terra, LINE.form) +
    path(`M292 294C288 282 296 276 298 266C306 276 310 286 304 294Z`, C.goldLight, LINE.fine);
  const letter = group('translate(286 246) rotate(-14)', rect(-13, -9, 26, 18, C.ivory, LINE.form), line(`M-13 -9L0 1L13 -9`, LINE.fine), ell(0, 2, 3.4, 3.4, C.burgundy, LINE.fine));
  const smoke = path(`M302 238C292 222 312 210 300 192C292 180 306 170 300 156`, 'none', LINE.form, C.stoneDark);
  // Crown's cushion, set down: not needed in here.
  return [wall, vault, windowArt, tap, door, page, altar, floor, tiles, shaft, brazier, smoke, letter, confessor, kneeler, king].join('');
}

const fruit = (x, y, count, fill, r, seed) => {
  const random = rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) s += ell(x + (random() - 0.5) * 34, y - random() * 6, r, r, fill, LINE.fine);
  return s;
};

/** A market stall with a striped awning, seen a little from the side. */
function stall(x, y, w, h, a, b, depth, goods) {
  const top = y - h;
  const stripes = 6;
  let awn = '';
  for (let i = 0; i < stripes; i++) {
    const x0 = x + (w / stripes) * i;
    const x1 = x0 + w / stripes;
    awn += poly([[x0 + 12 - i * 4 + 10, top - depth], [x1 + 12 - (i + 1) * 4 + 10, top - depth], [x1, top], [x0, top]], i % 2 ? a : b, LINE.fine);
    awn += path(`M${x0} ${top}V${top + 7}Q${x0 + (x1 - x0) / 2} ${top + 14} ${x1} ${top + 7}V${top}Z`, i % 2 ? a : b, LINE.fine);
  }
  return (
    line(`M${x + 5} ${top}V${y}M${x + w - 5} ${top}V${y}`, LINE.form + 1.6) +
    rect(x, y - 34, w, 34, C.wood, LINE.heavy) +
    ticks([[x + w * 0.25, y - 34, x + w * 0.25, y], [x + w * 0.5, y - 34, x + w * 0.5, y], [x + w * 0.75, y - 34, x + w * 0.75, y]], LINE.fine, C.woodDark) +
    rect(x - 4, y - 38, w + 8, 7, C.woodLight, LINE.form) +
    goods +
    awn
  );
}
const basket = (x, y, fill, seed) => path(`M${x - 20} ${y - 18}L${x - 15} ${y}H${x + 15}L${x + 20} ${y - 18}Z`, C.woodLight, LINE.form) + fruit(x, y - 20, 9, fill, 5.2, seed) + line(`M${x - 18} ${y - 12}H${x + 18}M${x - 16} ${y - 5}H${x + 16}`, LINE.fine, C.woodDark);
const barrel = (x, y, w, h) => path(`M${x - w / 2} ${y - h}C${x - w / 2 - 6} ${y - h * 0.6} ${x - w / 2 - 6} ${y - h * 0.4} ${x - w / 2} ${y}H${x + w / 2}C${x + w / 2 + 6} ${y - h * 0.4} ${x + w / 2 + 6} ${y - h * 0.6} ${x + w / 2} ${y - h}Z`, C.wood, LINE.form) + ell(x, y - h, w / 2, 4, C.woodDark, LINE.form) + line(`M${x - w / 2 - 4} ${y - h * 0.7}H${x + w / 2 + 4}M${x - w / 2 - 4} ${y - h * 0.3}H${x + w / 2 + 4}`, LINE.form, C.goldDark);

/** Market Square: a Saturday in front of the guildhall, with several small stories going on at once. */
export function relay_junction() {
  const sky = rect(0, 0, W, H, C.sky, 0) + rect(0, 74, W, 90, C.skyLow, 0);
  // Town houses behind the square, gable to gable.
  const gabled = (x, base, w, h, fill, roof, seed) =>
    rect(x, base - h, w, h, fill, LINE.form) +
    poly([[x - 3, base - h], [x + w / 2, base - h - w * 0.62], [x + w + 3, base - h]], roof, LINE.form) +
    masonry(x + 2, base - h + 4, w - 4, h - 8, seed, { rows: 9, gaps: 0.6 }) +
    rect(x + w * 0.2, base - h + 12, w * 0.2, 16, C.slateDark, LINE.fine) +
    rect(x + w * 0.6, base - h + 12, w * 0.2, 16, C.slateDark, LINE.fine) +
    rect(x + w * 0.4, base - h + 42, w * 0.2, 16, C.slateDark, LINE.fine);
  const houses =
    gabled(-8, 182, 58, 96, C.parchment, C.terra, 61) + gabled(48, 182, 52, 116, C.terraLight, C.terraDark, 62) +
    gabled(544, 182, 54, 116, C.parchmentDark, C.slate, 63) + gabled(594, 182, 54, 92, C.terraLight, C.terra, 64);

  // The guildhall: arcade below, great hall windows above, bell tower to one side.
  const m = 322;
  const hall =
    rect(m - 212, 60, 424, 126, C.stoneLight, LINE.heavy) +
    masonry(m - 208, 70, 416, 46, 7, { rows: 6 }) +
    rect(m - 212, 118, 424, 7, C.ivory, LINE.form) +
    poly([[m - 222, 60], [m - 188, 28], [m + 188, 28], [m + 222, 60]], C.terra, LINE.heavy) +
    ticks(Array.from({ length: 24 }, (_, k) => [m - 182 + k * 15.8, 29, m - 212 + k * 18.4, 59]), LINE.fine, C.terraDark);
  let arcade = rect(m - 212, 125, 424, 61, C.slateDark, LINE.form);
  for (let i = 0; i < 8; i++) arcade += arch(m - 184 + i * 53, 186, 40, 56, C.slateDeep, LINE.fine);
  for (let i = 0; i < 9; i++) arcade += rect(m - 214 + i * 53, 132, 8, 54, C.stoneLight, LINE.fine);
  let upperWin = '';
  for (let i = 0; i < 7; i++) upperWin += arch(m - 156 + i * 52, 110, 18, 38, C.slateDark, LINE.fine) + line(`M${m - 156 + i * 52} 74V110`, LINE.fine, C.slateLight);
  // Bell tower, off centre so the square isn't a diagram.
  const tx = 468;
  const belfry =
    rect(tx - 25, 22, 50, 164, C.stone, LINE.heavy) +
    masonry(tx - 23, 64, 46, 110, 8, { rows: 11 }) +
    arch(tx, 56, 24, 30, C.slateDeep, LINE.form) +
    path(`M${tx - 8} 44C${tx - 8} 34 ${tx + 8} 34 ${tx + 8} 44L${tx + 10} 54H${tx - 10}Z`, C.gold, LINE.form) +
    rect(tx - 31, 14, 62, 9, C.ivory, LINE.form) +
    poly([[tx - 30, 14], [tx, -30], [tx + 30, 14]], C.slate, LINE.heavy) +
    // Blank banners, town colours only, with no real arms.
    line(`M${tx - 25} 92L${tx - 52} 88`, LINE.form) + path(`M${tx - 52} 88L${tx - 50} 118L${tx - 42} 110L${tx - 34} 118L${tx - 32} 90Z`, C.burgundy, LINE.form);

  const ground = rect(0, 184, W, H - 184, C.parchment, LINE.heavy);
  // Cobbles only here and there, and thicker near us.
  const random = rng(77);
  let cob = '';
  for (let i = 0; i < 60; i++) {
    const y = 200 + random() * random() * 0 + random() * 150;
    const size = 2 + ((y - 190) / 160) * 7;
    const x = random() * 640;
    cob += `M${x.toFixed(0)} ${y.toFixed(0)}q${size.toFixed(1)} ${(-size / 2).toFixed(1)} ${(size * 2).toFixed(1)} 0`;
  }
  const cobbles = line(cob, LINE.fine, C.parchmentDark.replace('D3C09C', 'B7A27E'));

  // The fountain is the middle of the action.
  const fx = 322;
  const fountain =
    ell(fx, 222, 64, 14, C.stoneDark, LINE.heavy) +
    ell(fx, 218, 56, 10, C.slateLight, LINE.form) +
    path(`M${fx - 64} 222V238C${fx - 64} 252 ${fx + 64} 252 ${fx + 64} 238V222C${fx + 64} 236 ${fx - 64} 236 ${fx - 64} 222Z`, C.stone, LINE.heavy) +
    rect(fx - 7, 168, 14, 50, C.stoneLight, LINE.form) +
    ell(fx, 168, 24, 6, C.stoneLight, LINE.form) +
    path(`M${fx - 2} 164C${fx - 5} 152 ${fx + 5} 152 ${fx + 2} 164Z`, C.gold, LINE.form) +
    path(`M${fx - 22} 170C${fx - 34} 180 ${fx - 36} 200 ${fx - 36} 214M${fx + 22} 170C${fx + 34} 180 ${fx + 36} 200 ${fx + 36} 214`, 'none', LINE.form, C.slate);
  // Left stall: greengrocer. Right stall: cloth.
  const leftGoods = fruit(68, 246, 13, C.terra, 6, 1) + fruit(118, 246, 11, C.gold, 6, 2) + fruit(166, 246, 12, C.sage, 6, 3);
  const leftStall = stall(36, 284, 160, 114, C.burgundy, C.ivory, 26, leftGoods);
  const bolts = [456, 476, 496, 516, 536, 556]
    .map((x, i) => ell(x + 9, 236, 10, 10, [C.burgundy, C.gold, C.slate, C.sage, C.terra, C.ivory][i], LINE.form) + ell(x + 9, 236, 3, 3, C.parchment, LINE.fine))
    .join('');
  const rightStall = stall(446, 284, 160, 114, C.slate, C.parchment, 26, bolts);

  // A busy back row, then the people the eye reads.
  const crowdFar = [
    person({ x: 232, y: 214, s: 0.36, dir: 1, top: C.slate, hat: 'cap', line: 4.5, hose: C.woodDark }),
    person({ x: 256, y: 212, s: 0.34, dir: -1, gown: { fill: C.terra }, hat: 'coif', line: 4.8, collar: null }),
    person({ x: 408, y: 214, s: 0.36, dir: -1, top: C.sageDark, hat: 'beret', line: 4.5, hose: C.slateDark }),
    person({ x: 426, y: 212, s: 0.34, dir: 1, gown: { fill: C.burgundy }, hat: 'veil', line: 4.8, collar: null }),
    person({ x: 204, y: 212, s: 0.33, dir: 1, top: C.gold, hat: 'bare', line: 4.8, hose: C.slate }),
  ].join('');
  // Greengrocer behind the stall, weighing in the air.
  const grocer = person({
    x: 112, y: 262, s: 0.6, dir: 1, top: C.sage, apron: C.ivory, hose: C.woodDark, gown: { fill: C.sage }, hat: 'kerchief', skin: C.skin[1], line: 3,
    armL: [[-13, -102], [-20, -82], [-14, -74]], armR: [[13, -102], [28, -96], [44, -106]],
    inFront: line('M44 -106V-92M44 -92L30 -90M44 -92L58 -90M30 -90V-78M58 -90V-78', 1.8) + path('M24 -78H36L33 -72H27Z', C.gold, 1.6) + path('M52 -78H64L61 -72H55Z', C.gold, 1.6) + ell(58, -80, 3.4, 3.4, C.terra, 1.3),
  });
  // Buyer, skeptical, hand on hip and holding out a coin.
  const buyer = person({
    x: 236, y: 306, s: 0.94, dir: -1, skin: C.skin[0], gown: { fill: C.burgundy, trim: C.gold, fold: true, w: 27 }, top: C.burgundyDark, sleeve: C.burgundyDark, hat: 'veil', line: 2.8,
    armL: [[-13, -102], [-30, -96], [-44, -102]], armR: [[13, -102], [22, -84], [11, -72]],
    inFront: ell(-49, -103, 3.4, 3.4, C.goldLight, 1.8),
  });
  // Merchant at the cloth stall, arms spread: this is the finest bolt in town.
  const draper = person({
    x: 526, y: 262, s: 0.6, dir: -1, top: C.burgundyDark, hose: C.slate, gown: { fill: C.burgundyDark }, hat: 'black-cap', line: 3,
    armL: [[-13, -102], [-32, -112], [-46, -124]], armR: [[13, -102], [28, -112], [42, -124]], skin: C.skin[2],
  });
  // A noble trying to look uninterested.
  const noble = person({
    x: 454, y: 322, s: 0.98, dir: 1, top: C.slateDark, sleeve: C.slate, hose: C.burgundy, skirt: C.slateDark, hat: 'feather', line: 2.8,
    armL: [[-13, -102], [-20, -78], [-10, -68]], armR: [[13, -102], [22, -84], [12, -70]],
    legL: [[-6, -56], [-8, -28], [-10, -3]], legR: [[6, -56], [12, -28], [18, -3]],
    behind: path(`M-10 -106C-28 -84 -30 -50 -22 -24L-4 -34Z`, C.burgundy, 2.4),
  });
  // A porter bent under a sack, crossing the front.
  const porter = person({
    x: 42, y: 350, s: 1.04, dir: 1, top: C.woodLight, hose: C.slateDark, skirt: C.wood, hat: 'cap', skin: C.skin[1], lean: 12, headAt: [8, -110], line: 2.8, handL: false,
    armL: [[-13, -102], [-16, -90], [-10, -84]], armR: [[13, -102], [28, -86], [14, -76]],
    legL: [[-6, -56], [-14, -28], [-20, -3]], legR: [[6, -56], [14, -30], [24, -3]],
    behind: path(`M-38 -84C-50 -122 -22 -146 0 -130C12 -118 12 -92 0 -80C-14 -72 -32 -74 -38 -84Z`, C.parchmentDark, 2.8) + line('M-30 -118C-22 -124 -14 -122 -8 -116', 1.4),
    inFront: path('M24 -106C20 -96 18 -86 15 -76', 'none', 2, C.woodDark),
  });
  // A child running after a goose, the only thing in the square moving fast.
  const child = person({
    x: 318, y: 334, s: 0.64, dir: 1, top: C.gold, hose: C.terraDark, skirt: C.gold, hat: 'bare', hair: C.hair[2], skin: C.skin[0], lean: 12, line: 3.2,
    armL: [[-13, -102], [-28, -94], [-38, -104]], armR: [[13, -102], [28, -96], [38, -106]],
    legL: [[-6, -56], [-22, -40], [-34, -30]], legR: [[6, -56], [16, -30], [26, -3]],
  });
  const goose = group('translate(382 340) scale(.95)',
    path(`M-20 -2C-32 -14 -24 -24 -8 -24C2 -24 10 -18 14 -14C16 -30 14 -44 22 -50C30 -52 34 -46 30 -42C24 -38 26 -20 22 -8C16 0 -8 4 -20 -2Z`, C.ivory, 2.4),
    path(`M32 -47L40 -44L31 -41Z`, C.terra, 1.6),
    path(`M-14 -14C-6 -22 6 -18 8 -10C0 -6 -8 -8 -14 -14Z`, C.parchment, 1.6),
    line(`M-2 2V8H4M8 1V8H14`, 2.2, C.terra),
  );
  // Goods spill into the foreground and frame the near corners.
  const nearGoods = barrel(592, 356, 44, 64) + basket(538, 350, C.terra, 8) + basket(204, 358, C.gold, 9) + '';
  return [sky, houses, hall, arcade, upperWin, group('translate(0 36)', belfry), ground, cobbles, crowdFar, fountain, grocer, leftStall, draper, rightStall, child, goose, buyer, noble, porter, nearGoods].join('');
}

export const PILOT = { dynamo: ['Gold', dynamo], monument: ['Grand Duchy', monument], night_watch: ['Night Watch', night_watch], royal_confessor: ['Royal Confessor', royal_confessor], relay_junction: ['Market Square', relay_junction] };
void H;
