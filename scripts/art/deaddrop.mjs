/** Dead Drop's artwork: original screen-print style posters, drawn from code. Run: node scripts/art/deaddrop.mjs */
import { mkdirSync, writeFileSync } from 'node:fs';

const C = {
  night: '#101a2e',
  navy: '#17243d',
  navy2: '#223453',
  navy3: '#33496b',
  ink: '#1b1e24',
  char: '#2a2e36',
  char2: '#3d424c',
  parch: '#e4d6b5',
  parch2: '#c9b891',
  cream: '#f4ecd9',
  wine: '#6f2334',
  wine2: '#93364a',
  teal: '#4a7877',
  teal2: '#7ba5a1',
  tealD: '#2c4f53',
  amber: '#dca23f',
  amber2: '#f3cd7c',
};

const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (d, stroke, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const at = (x, y, s, body, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})" ${extra}>${body}</g>`;
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

const defs = `<defs>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .07  0 0 0 0 .08  0 0 0 0 .1  0 0 0 .9 -.28"/></filter>
<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.3" fill="${C.cream}"/></pattern>
<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" fill="${C.ink}"/></pattern>
</defs>`;

const svg = (w, h, body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">${defs}${body}${rect(0, 0, w, h, '#000', 'filter="url(#grain)" opacity=".3"')}</svg>\n`;

/** A plain badge carries no grain: it stays crisp at 24 pixels. */
const badge = (ring, fill, body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${label}"><circle cx="48" cy="48" r="46" fill="${fill}"/><circle cx="48" cy="48" r="41.5" fill="none" stroke="${ring}" stroke-width="3"/><circle cx="48" cy="48" r="46" fill="none" stroke="${C.ink}" stroke-width="2" opacity=".5"/>${body}</svg>\n`;

/** Block letters, cut like a stencil. Drawn, not typed, so they look the same on every device. */
const GLYPHS = {
  D: 'M0 0H16V90H0ZM21 0H30Q60 0 60 30V60Q60 90 30 90H21V74H30Q44 74 44 60V30Q44 16 30 16H21Z',
  E: 'M0 0H16V90H0ZM21 0H58V16H21ZM21 37H50V53H21ZM21 74H58V90H21Z',
  A: 'M0 90 22 0H28V24L16 90ZM60 90 38 0H32V24L44 90ZM19 56H41V69H19Z',
  R: 'M0 0H16V90H0ZM21 0H34Q60 0 60 26Q60 52 34 52H21V38H32Q44 38 44 26Q44 15 32 15H21ZM27 57H43L60 90H43Z',
  O: 'M27 0Q0 0 0 30V60Q0 90 27 90V74Q16 74 16 60V30Q16 16 27 16ZM33 0Q60 0 60 30V60Q60 90 33 90V74Q44 74 44 60V30Q44 16 33 16Z',
  P: 'M0 0H16V90H0ZM21 0H34Q60 0 60 28Q60 56 34 56H21V41H32Q44 41 44 28Q44 15 32 15H21Z',
  H: 'M0 0H16V90H0ZM44 0H60V90H44ZM21 37H39V53H21Z',
  T: 'M0 0H26V16H0ZM34 0H60V16H34ZM22 21H38V90H22Z',
  L: 'M0 0H16V90H0ZM21 74H56V90H21Z',
};
const word = (text, x, y, s, fill, gap = 12) => [...text].map((ch, i) => at(x + i * (60 + gap) * s, y, s, path(GLYPHS[ch], fill))).join('');

/**
 * A figure in hat and trench coat, 104 units tall, feet at the origin, facing right (dir 1) or left (dir -1).
 * `coat` shows on the lit side and `shade` on the other.
 */
function spy(x, y, s, { coat = C.char, shade = C.ink, hat = C.ink, dir = 1, skin = C.parch2, carry = '', arm = true } = {}) {
  const body = [
    carry,
    path('M-8-27-6.5 0H-1L-.5-27ZM.5-27 1.5 0H7L8-27Z', shade),
    path('M-8 0H-.5V-2.5H-7ZM1.5 0H10V-2.5H2Z', C.ink),
    path('M-6-84H6L13-76 16-28 10-20H-10L-16-28-13-76Z', coat),
    path('M1-84H6L13-76 16-28 10-20H3Z', shade, 'opacity=".55"'),
    path('M-13.5-52H14.5L14.8-47H-14Z', shade),
    path('M-6-84 0-70 7-84 2-86H-3Z', C.parch2),
    arm ? path('M9-78 15-74 19-44 14-41 9-48Z', shade) : '',
    ell(1, -90, 5.5, 6.5, skin),
    path('M-7-97-5.5-104Q1-108 7.5-104L8-97Z', hat),
    path('M-12-95.5Q1-99 14-95.5Q1-93 -12-95.5Z', hat),
    rect(-6, -98, 14, 2, C.wine2),
  ].join('');
  return at(x, y, s * dir, body, dir < 0 ? '' : '').replace(`scale(${s * dir})`, `scale(${s * dir} ${s})`);
}

const briefcase = (x, y) => rect(x, y, 15, 11, C.wine2) + rect(x, y, 15, 2.5, C.wine) + line(`M${x + 4} ${y}v-3h7v3`, C.ink, 1.5);

/** The pool of light and the ink shadow a figure casts. */
const shadow = (x, y, len, fill = C.ink, rise = 14) => poly([[x - 7, y], [x + 8, y], [x + len + 18, y + rise], [x + len, y + rise]], fill, 'opacity=".55"');

function streetLamp(x, y, h, glow = true) {
  return (
    (glow ? poly([[x - 7, y - h + 12], [x + 7, y - h + 12], [x + 62, y], [x - 62, y]], C.amber2, 'opacity=".18"') : '') +
    rect(x - 2, y - h, 4, h, C.ink) +
    rect(x - 5, y - 4, 10, 4, C.ink) +
    path(`M${x - 8} ${y - h + 12}L${x - 5} ${y - h - 6}H${x + 5}L${x + 8} ${y - h + 12}Z`, C.amber2) +
    path(`M${x - 9} ${y - h + 12}H${x + 9}V${y - h + 15}H${x - 9}ZM${x - 7} ${y - h - 6}L${x} ${y - h - 13}L${x + 7} ${y - h - 6}Z`, C.ink)
  );
}

const moon = (x, y, r, fill = C.parch) => ell(x, y, r, r, fill) + ell(x - r * 0.3, y - r * 0.2, r * 0.22, r * 0.18, C.parch2, 'opacity=".55"') + ell(x + r * 0.3, y + r * 0.3, r * 0.14, r * 0.12, C.parch2, 'opacity=".55"');
const beam = (x, y, angle, len, spread, fill = C.teal2, op = 0.16) => {
  const a = (angle * Math.PI) / 180;
  const p = (d) => [x + Math.sin(a + d) * len, y - Math.cos(a + d) * len];
  return poly([[x, y], p(-spread), p(spread)], fill, `opacity="${op}"`);
};
const stars = (pts, fill = C.cream) => pts.map(([x, y, r = 1.3]) => ell(x, y, r, r, fill)).join('');
const roofs = (y, fill, xs) => xs.map(([x, w, h]) => rect(x, y - h, w, h + 300, fill)).join('');

function embassy() {
  const W = 640;
  const cols = [146, 212, 278, 362, 428, 494];
  return [
    rect(0, 0, W, 400, C.navy),
    rect(0, 0, W, 90, C.night),
    rect(0, 90, W, 44, '#142039'),
    moon(556, 74, 40),
    beam(70, 340, 24, 420, 0.08),
    beam(590, 340, -32, 420, 0.07),
    stars([[40, 40], [120, 22], [210, 60], [300, 18], [420, 34], [470, 76], [610, 150], [24, 110]]),
    roofs(200, C.navy2, [[0, 90, 40], [70, 40, 66], [550, 90, 70], [612, 40, 40]]),
    // Flag on the roofline: an invented state's colours.
    rect(318, 8, 3, 66, C.ink),
    path('M321 10 366 14Q358 22 368 30L321 28Z', C.wine2),
    path('M321 19 364 20.5 367 24 321 23.5Z', C.parch),
    // The body of the building.
    rect(100, 134, 440, 202, C.parch2),
    rect(100, 134, 440, 202, 'url(#dots)', 'opacity=".16"'),
    rect(118, 150, 404, 186, C.tealD),
    poly([[76, 134], [320, 42], [564, 134]], C.cream),
    poly([[110, 128], [320, 54], [530, 128]], C.parch2),
    poly([[320, 54], [530, 128], [320, 128]], C.teal2, 'opacity=".45"'),
    // The crest in the pediment.
    ell(320, 100, 19, 19, C.wine),
    ell(320, 100, 15, 15, 'none', `stroke="${C.amber}" stroke-width="2"`),
    path('M320 88 324 97 334 97 326 103 329 112 320 106 311 112 314 103 306 97 316 97Z', C.amber),
    rect(76, 134, 488, 12, C.cream),
    rect(88, 146, 464, 10, C.parch2),
    range(30, (i) => rect(92 + i * 15.4, 148, 7, 5, C.char, 'opacity=".5"')),
    // Lit windows, one with someone at the blind.
    ...cols.slice(0, -1).map((x, i) => {
      if (i === 2) return '';
      const wx = x + 25;
      return rect(wx, 172, 30, 50, i === 1 ? C.amber2 : C.amber, i === 3 ? 'opacity=".25"' : '') + line(`M${wx + 15} 172V222M${wx} 196H${wx + 30}`, C.ink, 2) + rect(wx - 3, 168, 36, 4, C.cream) + rect(wx, 240, 30, 50, C.night) + rect(wx - 3, 236, 36, 4, C.cream) + (i === 1 ? ell(wx + 19, 194, 5, 6, C.ink) + path(`M${wx + 10} 222Q${wx + 11} 202 ${wx + 19} 200Q${wx + 27} 202 ${wx + 28} 222Z`, C.ink) : '');
    }),
    // Columns, lit from the left.
    ...cols.map((x) => rect(x - 10, 156, 22, 164, C.cream) + rect(x + 4, 156, 8, 164, C.teal2, 'opacity=".7"') + line(`M${x - 5} 160V318M${x} 160V318`, C.parch2, 1.2) + rect(x - 14, 156, 30, 7, C.parch) + rect(x - 14, 312, 30, 8, C.parch)),
    // The door and its fanlight.
    path('M296 320V248Q320 220 344 248V320Z', C.ink),
    path('M300 320V250H318V320ZM322 320V250H340V320Z', C.wine),
    path('M300 246Q320 226 340 246Z', C.amber2),
    line('M320 228V246M310 232 316 246M330 232 324 246', C.ink, 1.5),
    // Steps.
    rect(120, 320, 400, 7, C.cream),
    rect(108, 327, 424, 7, C.parch2),
    rect(96, 334, 448, 7, C.parch),
    rect(84, 341, 472, 7, C.parch2),
    rect(0, 348, W, 52, C.char),
    rect(0, 348, W, 3, C.char2),
    // The lamp, the sedan, and a figure keeping watch beyond the railings.
    streetLamp(66, 350, 150),
    shadow(556, 372, -100, C.ink, 14),
    path('M428 372 430 354Q444 350 456 338Q470 326 500 326H528Q548 326 560 342L586 350Q600 354 600 372Z', C.ink),
    path('M466 342Q476 332 498 332V344H462ZM504 332H526Q540 334 550 346L504 345Z', C.teal2, 'opacity=".55"'),
    line('M440 356H590', C.char2, 1.5),
    ell(452, 373, 13, 13, C.char),
    ell(452, 373, 6, 6, C.parch2),
    ell(562, 373, 13, 13, C.char),
    ell(562, 373, 6, 6, C.parch2),
    rect(592, 353, 8, 5, C.amber2),
    rect(433, 340, 2, 16, C.parch2),
    path('M435 340 449 343 435 347Z', C.wine2),
    shadow(36, 386, 76),
    spy(36, 386, 0.94, { coat: C.wine, shade: '#451723', carry: briefcase(13, -33) }),
    // Railings run the width of the kerb.
    range(44, (i) => rect(i * 15 + 2, 352, 2.5, 26, C.ink) + poly([[i * 15, 353], [i * 15 + 3.2, 346], [i * 15 + 6.4, 353]], C.ink)).replace(/^/, ''),
    rect(0, 358, W, 2.5, C.ink),
    rect(0, 374, W, 2.5, C.ink),
  ].join('');
}

function station() {
  const W = 640;
  const cx = 320;
  // The glass fan: panes as wedges between radial ribs.
  const panes = [];
  const R = 262;
  for (let i = 0; i < 12; i++) {
    const a0 = Math.PI + (i / 12) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 12) * Math.PI;
    const P = (r, a) => [Math.round(cx + Math.cos(a) * r), Math.round(304 + Math.sin(a) * r)];
    for (const [r0, r1, fill] of [[92, 160, i % 3 === 0 ? C.amber : C.tealD], [160, 216, i % 4 === 1 ? C.amber2 : C.teal], [216, 262, i % 5 === 2 ? C.amber : C.tealD]]) panes.push(poly([P(r0, a0), P(r1, a0), P(r1, a1), P(r0, a1)], fill, `stroke="${C.ink}" stroke-width="3" opacity="${fill === C.teal ? 0.75 : 1}"`));
  }
  return [
    rect(0, 0, W, 400, C.night),
    rect(0, 0, W, 66, C.navy),
    stars([[30, 24], [90, 50], [160, 18], [480, 20], [560, 46], [612, 16]]),
    // The hall's flanking masonry.
    rect(0, 80, 76, 320, C.navy3),
    rect(564, 80, 76, 320, C.navy3),
    range(8, (i) => rect(14, 100 + i * 28, 48, 3, C.navy2) + rect(578, 100 + i * 28, 48, 3, C.navy2)),
    poly([[0, 80], [38, 44], [76, 80]], C.navy2),
    poly([[564, 80], [602, 44], [640, 80]], C.navy2),
    // The arch.
    ell(cx, 304, R + 16, R + 16, C.parch2),
    ell(cx, 304, R + 8, R + 8, C.parch),
    ...panes,
    ell(cx, 304, 92, 92, C.ink),
    rect(0, 304, W, 96, C.char),
    rect(76, 304, 488, 96, C.ink),
    // The great clock, ten to midnight.
    ell(cx, 128, 44, 44, C.ink),
    ell(cx, 128, 38, 38, C.cream),
    range(12, (i) => {
      const a = (i * Math.PI) / 6;
      return line(`M${cx + Math.sin(a) * 30} ${128 - Math.cos(a) * 30}L${cx + Math.sin(a) * 35} ${128 - Math.cos(a) * 35}`, C.ink, 2.2);
    }),
    line(`M${cx} 128L${cx - 3} 104`, C.ink, 3.5, 'stroke-linecap="round"'),
    line(`M${cx} 128L${cx - 22} 115`, C.wine, 2.5, 'stroke-linecap="round"'),
    ell(cx, 128, 3, 3, C.wine),
    // Tracks converge on the engine.
    poly([[240, 400], [300, 304], [340, 304], [400, 400]], C.char),
    line('M262 400 308 310M378 400 332 310', C.parch2, 3),
    range(6, (i) => rect(258 - i * -9 + 0, 392 - i * 15, 124 - i * 18, 4, C.char2)),
    // Platforms.
    poly([[0, 400], [0, 330], [262, 304], [226, 400]], C.char2),
    poly([[640, 400], [640, 330], [378, 304], [414, 400]], C.char2),
    line('M226 400 262 304M414 400 378 304', C.amber, 4, 'stroke-dasharray="12 8"'),
    // The locomotive, head on.
    rect(262, 188, 116, 122, C.ink),
    ell(320, 228, 54, 54, C.char),
    ell(320, 228, 54, 54, 'none', `stroke="${C.parch2}" stroke-width="2.5"`),
    ell(320, 228, 40, 40, C.ink),
    range(8, (i) => {
      const a = (i * Math.PI) / 4;
      return ell(320 + Math.cos(a) * 47, 228 + Math.sin(a) * 47, 2, 2, C.parch2);
    }),
    rect(306, 158, 28, 34, C.ink),
    rect(300, 152, 40, 8, C.char2),
    ell(320, 228, 14, 14, C.amber2),
    ell(320, 228, 7, 7, C.cream),
    path('M262 286H378V306H262Z', C.wine),
    rect(262, 286, 116, 3, C.wine2),
    rect(272, 290, 18, 10, C.ink),
    rect(350, 290, 18, 10, C.ink),
    ell(280, 296, 7, 7, C.char2),
    ell(360, 296, 7, 7, C.char2),
    // The headlamp's beam, and steam going up to the glass.
    poly([[308, 232], [332, 232], [460, 400], [180, 400]], C.amber2, 'opacity=".2"'),
    ...[[280, 150, 34], [254, 124, 28], [352, 136, 36], [384, 112, 30], [230, 96, 22], [410, 84, 22], [318, 124, 24]].map(([x, y, r]) => ell(x, y, r, r * 0.86, C.cream, 'opacity=".78"')),
    ...[[292, 140, 22], [362, 130, 22], [262, 118, 16]].map(([x, y, r]) => ell(x, y, r, r * 0.86, C.parch, 'opacity=".9"')),
    // The departures board and the platform lamps.
    rect(476, 216, 74, 48, C.ink),
    rect(480, 220, 66, 40, C.tealD),
    range(4, (i) => rect(484, 225 + i * 8, 34 + (i * 13) % 24, 3, C.amber2) + rect(530, 225 + i * 8, 11, 3, C.cream)),
    rect(486, 264, 3, 56, C.ink),
    rect(538, 264, 3, 56, C.ink),
    streetLamp(120, 336, 118),
    // Someone waiting with a case; someone else watching them from the far platform.
    shadow(190, 382, 56),
    spy(190, 382, 0.96, { coat: C.teal, shade: C.tealD, dir: 1, carry: briefcase(13, -33) }),
    shadow(560, 356, -22, C.ink, 8),
    spy(560, 356, 0.62, { coat: C.char, shade: C.ink, dir: -1 }),
  ].join('');
}

function hotel() {
  const W = 640;
  const x0 = 170;
  const tower = (x, y, w, h, fill) => rect(x, y, w, h, fill);
  const fins = (x, y, w, h, n, seed = 1) =>
    range(n, (i) => {
      const fx = x + (i * w) / n;
      const fw = w / n;
      return rect(fx + fw * 0.2, y, fw * 0.6, h, C.navy2) + range(Math.floor(h / 18), (j) => ((i * 7 + j * (11 + seed)) % 5 < 2 ? rect(fx + fw * 0.26, y + 4 + j * 18, fw * 0.48, 11, (i + j) % 3 ? C.amber : C.amber2) : ''));
    });
  return [
    rect(0, 0, W, 400, C.night),
    rect(0, 0, W, 120, '#1d1a33'),
    rect(0, 120, W, 90, '#3b1f35'),
    rect(0, 210, W, 70, C.wine),
    rect(0, 280, W, 40, C.wine2),
    // Searchlights crossing above the roof.
    beam(90, 330, 22, 460, 0.05, C.amber2, 0.28),
    beam(560, 330, -22, 460, 0.05, C.amber2, 0.28),
    beam(250, 330, -10, 460, 0.04, C.cream, 0.14),
    beam(400, 330, 12, 460, 0.04, C.cream, 0.14),
    stars([[30, 30], [120, 60], [540, 30], [610, 80], [90, 110]]),
    // Neighbours.
    roofs(170, C.navy, [[0, 70, 0], [66, 60, -46], [520, 70, -30], [586, 54, 16]]),
    range(5, (i) => rect(14 + i * 10, 186, 5, 10, C.amber, 'opacity=".5"') + rect(530 + i * 12, 216, 5, 10, C.amber, 'opacity=".55"')),
    // The stepped tower.
    tower(306, 22, 28, 40, C.parch),
    poly([[320, 0], [326, 24], [314, 24]], C.parch),
    tower(286, 48, 68, 40, C.cream),
    tower(254, 76, 132, 44, C.parch),
    tower(218, 108, 204, 40, C.cream),
    tower(x0, 138, 300, 212, C.parch),
    rect(320, 22, 14, 40, C.parch2),
    rect(320, 48, 34, 40, C.parch2),
    rect(320, 76, 66, 44, C.parch2),
    rect(320, 108, 102, 40, C.parch2),
    rect(320, 138, 150, 212, C.parch2),
    fins(262, 82, 116, 34, 7, 3),
    fins(224, 114, 192, 30, 11, 2),
    fins(182, 150, 276, 108, 15),
    // Bands of ornament.
    rect(x0 - 8, 134, 316, 6, C.wine),
    rect(x0, 258, 300, 8, C.wine),
    range(24, (i) => poly([[x0 + i * 12.5, 266], [x0 + 6 + i * 12.5, 274], [x0 + 12.5 + i * 12.5, 266]], C.amber)),
    // The sunburst over the door.
    rect(250, 274, 140, 76, C.ink),
    range(13, (i) => {
      const a0 = Math.PI + (i / 13) * Math.PI;
      const a1 = Math.PI + ((i + 0.55) / 13) * Math.PI;
      const P = (r, a) => [320 + Math.cos(a) * r, 322 + Math.sin(a) * r];
      return poly([P(14, a0), P(64, a0), P(64, a1), P(14, a1)], i % 2 ? C.amber2 : C.amber);
    }),
    ell(320, 322, 14, 14, C.amber2),
    // Marquee with its bulbs.
    path('M226 322H414L432 342H208Z', C.wine),
    rect(208, 342, 224, 8, C.ink),
    range(19, (i) => ell(214 + i * 11.8, 346, 2.4, 2.4, C.amber2)),
    // Revolving door.
    rect(288, 350, 64, 30, C.tealD),
    line('M320 350V380M288 350 352 380M352 350 288 380', C.amber, 2.5),
    rect(284, 348, 72, 3, C.parch),
    // Side wings and piers.
    rect(x0, 350, 300, 30, C.char),
    range(6, (i) => (i === 2 || i === 3 ? '' : rect(x0 + 14 + i * 47, 354, 30, 20, i % 2 ? C.amber : C.amber2))),
    // The neon, standing off the corner.
    rect(474, 118, 42, 212, C.ink),
    rect(478, 122, 34, 204, C.wine),
    ...[...'HOTEL'].map((ch, i) => at(483, 134 + i * 38, 0.4, path(GLYPHS[ch], C.amber2))),
    rect(470, 182, 8, 4, C.char2),
    rect(470, 280, 8, 4, C.char2),
    // Pavement, limousine and two figures who haven't met yet.
    rect(0, 380, W, 20, C.char2),
    rect(0, 380, W, 2.5, C.ink),
    shadow(76, 390, 40, C.ink, 8),
    path('M16 388 18 370Q32 366 46 352Q58 342 84 342H122Q146 342 158 358L188 366Q202 370 202 388Z', C.ink),
    path('M54 358Q62 348 84 348V360H50ZM90 348H120Q136 350 146 362L90 361Z', C.amber2, 'opacity=".7"'),
    line('M26 372H190', C.char2, 1.5),
    ell(44, 389, 11, 11, C.char),
    ell(44, 389, 5, 5, C.parch2),
    ell(164, 389, 11, 11, C.char),
    ell(164, 389, 5, 5, C.parch2),
    shadow(254, 396, 26, C.ink, 4),
    spy(254, 396, 0.74, { coat: C.wine2, shade: C.wine, dir: 1 }),
    spy(376, 396, 0.74, { coat: C.tealD, shade: C.ink, dir: -1, carry: briefcase(12, -33) }),
    streetLamp(584, 394, 140),
  ].join('');
}

function harbour() {
  const W = 640;
  const crane = (x, base, s, flip = 1) =>
    at(
      x,
      base,
      s,
      [
        line('M-26 0-14-108M26 0 14-108M-26 0 14-108M26 0-14-108M-23-30H23M-19-58H19M-16-84H16', C.ink, 4),
        rect(-20, -120, 40, 14, C.ink),
        rect(-14, -148, 28, 30, C.char2),
        rect(-7, -142, 14, 11, C.amber2),
        line(`M${flip * -46} -128H${flip * 142}`, C.ink, 7),
        range(9, (i) => line(`M${flip * (-40 + i * 20)} -124 ${flip * (-30 + i * 20)} -112 ${flip * (-20 + i * 20)} -124`, C.ink, 2.4)),
        line(`M0-186 ${flip * 142}-128M0-186 ${flip * -46}-128`, C.ink, 2.4),
        line('M0-186V-148', C.ink, 7),
        line(`M${flip * 96} -128V-60`, C.ink, 1.8),
        rect(flip * 96 - 11, -60, 22, 18, C.wine2),
        line(`M${flip * 96 - 11} -55H${flip * 96 + 11}`, C.ink, 1.4),
      ].join(''),
    );
  return [
    rect(0, 0, W, 400, C.night),
    rect(0, 0, W, 100, C.navy),
    rect(0, 100, W, 60, C.navy2),
    rect(0, 160, W, 50, C.tealD),
    rect(0, 196, W, 28, C.teal),
    moon(138, 112, 46, C.amber2),
    stars([[40, 30], [220, 22], [300, 56], [420, 18], [520, 44], [610, 26]]),
    // A far shore: warehouses, a dome and a lighthouse with its beam.
    poly([[590, 222], [240, 170], [240, 196]], C.amber2, 'opacity=".2"'),
    path('M0 224V204H44V190H74V206H112V186Q128 168 144 186V206H186V196H230V224Z', C.navy),
    rect(586, 158, 15, 66, C.cream),
    rect(586, 176, 15, 10, C.wine2),
    rect(586, 198, 15, 10, C.wine2),
    rect(583, 149, 21, 9, C.ink),
    rect(587, 151, 13, 6, C.amber2),
    path('M581 149 593 141 606 149Z', C.wine),
    path('M570 224 578 214H610L620 224Z', C.ink),
    // The water, and the moon's road on it.
    rect(0, 224, W, 176, C.navy),
    ...[[116, 228, 44], [104, 238, 68], [124, 248, 34], [96, 260, 82], [114, 274, 60], [88, 290, 94], [120, 306, 50], [98, 322, 80]].map(([x, y, w]) => rect(x, y, w, 3.5, C.amber2, 'opacity=".6"')),
    range(26, (i) => rect((i * 83) % 620, 232 + (i * 37) % 120, 18 + (i * 13) % 34, 2.5, C.teal2, 'opacity=".32"')),
    // The freighter.
    path('M196 292 182 234H570L608 200 596 258 574 306H226Z', C.ink),
    path('M186 250H590L584 264H189Z', C.wine),
    path('M198 292H575L574 306H226Z', C.wine),
    range(11, (i) => ell(226 + i * 30, 240, 2.8, 2.8, C.amber2)),
    // Bridge and funnel.
    rect(250, 178, 110, 56, C.cream),
    rect(322, 178, 38, 56, C.parch2),
    rect(238, 170, 134, 9, C.parch),
    rect(262, 150, 76, 21, C.parch),
    rect(254, 146, 92, 5, C.ink),
    range(6, (i) => rect(258 + i * 16, 186, 10, 12, C.amber) + rect(258 + i * 16, 208, 10, 12, i % 2 ? C.amber2 : C.tealD)),
    range(4, (i) => rect(270 + i * 15, 155, 10, 10, C.amber2)),
    path('M392 234 398 142H444L450 234Z', C.ink),
    rect(397, 164, 49, 16, C.amber),
    rect(397, 184, 49, 5, C.wine2),
    ...[[420, 124, 18], [440, 102, 24], [468, 78, 28], [504, 62, 26]].map(([x, y, r]) => ell(x, y, r, r * 0.74, C.parch2, 'opacity=".42"')),
    // Masts and rigging.
    rect(208, 150, 4, 84, C.ink),
    rect(548, 142, 4, 92, C.ink),
    line('M210 152 254 150M550 144 446 150M210 180 182 232M550 170 598 212', C.ink, 1.5),
    // Cranes over the near quay.
    crane(84, 344, 1.04, 1),
    crane(540, 344, 0.86, -1),
    // The quay, crates, a bollard and the waiting party.
    rect(0, 344, W, 56, C.char),
    rect(0, 344, W, 5, C.parch2),
    range(11, (i) => rect(i * 60 + 12, 349, 3, 12, C.ink)),
    rect(0, 376, W, 24, C.ink),
    rect(232, 312, 44, 34, C.parch2),
    line('M232 312 276 346M276 312 232 346', C.ink, 2.2),
    rect(232, 312, 44, 34, 'none', `stroke="${C.ink}" stroke-width="3"`),
    rect(276, 322, 30, 24, C.wine),
    line('M276 334H306M291 322V346', C.ink, 2),
    path('M404 346V324Q404 318 416 318Q428 318 428 324V346Z', C.tealD),
    path('M404 324H428M404 338H428', 'none', `stroke="${C.ink}" stroke-width="2"`),
    path('M460 370V352Q460 346 472 346Q484 346 484 352V370Z', C.ink),
    rect(456, 348, 32, 5, C.char2),
    line('M484 356Q520 366 548 348T624 346', C.parch2, 3),
    shadow(358, 378, 62),
    spy(358, 378, 1, { coat: C.parch2, shade: '#8f8263', dir: 1, hat: C.wine, carry: briefcase(13, -33) }),
    // Gulls.
    line('M340 92q9-8 16 0q7-8 16 0M404 40q6-5 11 0q5-5 11 0M92 58q6-5 11 0q5-5 11 0', C.cream, 2),
  ].join('');
}

function cover() {
  const W = 600;
  const H = 840;
  return [
    rect(0, 0, W, H, C.night),
    rect(0, 0, W, 300, C.navy),
    rect(0, 300, W, 110, C.navy2),
    rect(0, 410, W, 80, C.navy3),
    // The moon behind the city.
    moon(300, 372, 174, C.parch),
    ell(300, 372, 174, 174, 'url(#hatch)', 'opacity=".05"'),
    beam(90, 590, 28, 700, 0.06, C.amber2, 0.2),
    beam(510, 590, -28, 700, 0.06, C.amber2, 0.2),
    stars([[40, 170], [90, 240], [160, 190], [470, 180], [520, 250], [560, 170], [30, 300], [570, 320]]),
    // A European city: domes, spires, a clock tower, a bridge. Each layer darker and nearer.
    path('M0 520V426H34V396H58V426H92V378L108 340 124 378V430H168V410H210V356Q210 318 248 306V290H254V270H258V290H264V306Q302 318 302 356V410H340V378H352L366 322 380 378H392V424H440V394H472V428H510V398H530L548 348 566 398H600V520Z', C.teal),
    path('M0 556V470H46V440H96V474H150V446H176V420L188 390 200 420V478H254V454H306V474H356V430H366V404H382V430H398V474H456V448H506V478H548V452H600V556Z', C.tealD),
    // The river and the bridge across it.
    rect(0, 540, W, 90, C.navy),
    path('M0 556H600V580H576Q552 546 524 580H470Q442 546 414 580H356Q328 546 300 580H246Q218 546 190 580H132Q104 546 76 580H24Q10 562 0 572Z', C.ink),
    range(14, (i) => rect(i * 43 + 6, 548, 3, 10, C.ink)),
    rect(0, 546, W, 3, C.ink),
    rect(180, 590, 240, 3, C.amber2, 'opacity=".4"'),
    rect(226, 604, 170, 3, C.amber2, 'opacity=".3"'),
    rect(90, 600, 70, 3, C.teal2, 'opacity=".4"'),
    rect(440, 612, 90, 3, C.teal2, 'opacity=".35"'),
    // The quay, cobbled, with the lamp's pool of light.
    rect(0, 628, W, 212, C.ink),
    rect(0, 628, W, 5, C.parch2),
    ell(300, 730, 220, 66, C.char2),
    ell(300, 726, 150, 42, C.amber, 'opacity=".42"'),
    range(32, (i) => ell(40 + (i * 79) % 530, 646 + (i * 53) % 170, 16, 4, C.char, 'opacity=".7"')),
    // The lamp stands between them, and the case on the ground between them is the drop.
    poly([[286, 322], [314, 322], [454, 730], [146, 730]], C.amber2, 'opacity=".16"'),
    rect(295, 330, 10, 396, C.ink),
    rect(287, 716, 26, 14, C.ink),
    rect(290, 520, 20, 6, C.ink),
    path('M278 324 284 282H316L322 324Z', C.amber2),
    path('M274 324H326V332H274ZM282 282 300 262 318 282Z', C.ink),
    // Shadows thrown away from the lamp.
    poly([[150, 748], [200, 748], [20, 812], [-60, 812]], C.night, 'opacity=".8"'),
    poly([[400, 748], [450, 748], [660, 812], [580, 812]], C.night, 'opacity=".8"'),
    // Two rivals, the height of the page's middle.
    spy(175, 750, 3.5, { coat: C.wine, shade: '#451723', hat: C.ink, dir: 1, skin: C.parch }),
    spy(425, 750, 3.5, { coat: C.teal, shade: C.tealD, hat: C.ink, dir: -1, skin: C.parch }),
    rect(274, 722, 52, 36, C.amber),
    rect(274, 722, 52, 8, '#a97a26'),
    line('M288 722v-9h24v9', C.ink, 4),
    rect(296, 730, 8, 7, C.ink),
    // The title and the stamp.
    rect(0, 0, W, 196, C.parch),
    rect(0, 0, W, 196, 'url(#dots)', 'opacity=".0"'),
    rect(0, 188, W, 8, C.wine),
    rect(0, 180, W, 3, C.wine),
    word('DEAD', 148, 18, 0.86, C.ink, 13),
    word('DROP', 148, 98, 0.86, C.wine, 13),
    `<g transform="translate(482 254) rotate(-12)"><rect x="-82" y="-24" width="164" height="48" fill="none" stroke="${C.wine2}" stroke-width="5"/><text x="0" y="9" font-family="'Courier New',Courier,monospace" font-weight="700" font-size="24" text-anchor="middle" fill="${C.wine2}" letter-spacing="2">CLASSIFIED</text></g>`,
    rect(0, 806, W, 34, C.parch),
    `<text x="300" y="830" font-family="'Courier New',Courier,monospace" font-weight="700" font-size="17" text-anchor="middle" fill="${C.ink}" letter-spacing="4">TWO AGENTS. FOUR LOCATIONS. NO TRUST.</text>`,
  ].join('');
}

const stamp = (x, y, rot, text, color, size = 22) => {
  const w = text.length * size * 0.66 + 22;
  return `<g transform="translate(${x} ${y}) rotate(${rot})" opacity=".82"><rect x="${-w / 2}" y="${-size}" width="${w}" height="${size * 1.75}" fill="none" stroke="${color}" stroke-width="3"/><text y="${size * 0.3}" font-family="'Courier New',Courier,monospace" font-weight="700" font-size="${size}" text-anchor="middle" fill="${color}" letter-spacing="1">${text}</text></g>`;
};

/** A manila folder for a mission card: a tab, a fold, a stamp. The location's picture sits on top. */
function dossier() {
  return [
    path('M4 26Q4 18 12 18H96Q104 18 108 26L114 36H316Q324 36 324 44V190Q324 198 316 198H12Q4 198 4 190Z', C.parch2),
    path('M4 48Q4 40 12 40H316Q324 40 324 48V190Q324 198 316 198H12Q4 198 4 190Z', C.parch),
    line('M4 48H324', '#a8966e', 1.5),
    line('M14 186H314', '#a8966e', 1, 'stroke-dasharray="3 5"'),
    stamp(254, 170, -8, 'TOP SECRET', C.wine2, 17),
    line('M22 18V8Q22 4 26 4H34Q38 4 38 8V34', C.char2, 2.5),
  ].join('');
}

/** A typed report sheet's letterhead. */
function report() {
  return [
    rect(0, 0, 640, 82, C.cream),
    rect(0, 0, 640, 82, 'url(#dots)', 'opacity="0"'),
    rect(0, 72, 640, 3, C.wine),
    rect(0, 77, 640, 1.5, C.wine),
    ell(42, 36, 24, 24, C.wine),
    ell(42, 36, 19, 19, 'none', `stroke="${C.amber2}" stroke-width="2"`),
    path('M42 20 46 31 58 31 48 38 52 50 42 43 32 50 36 38 26 31 38 31Z', C.amber2),
    `<text x="80" y="31" font-family="'Courier New',Courier,monospace" font-weight="700" font-size="21" fill="${C.ink}" letter-spacing="3">INTELLIGENCE REPORT</text>`,
    `<text x="80" y="54" font-family="'Courier New',Courier,monospace" font-size="13" fill="${C.char2}" letter-spacing="2">FIELD DIRECTORATE // EYES ONLY</text>`,
    stamp(556, 40, -7, 'CLASSIFIED', C.wine2, 15),
  ].join('');
}

const paper = () => `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="p" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .34  0 0 0 0 .2  0 0 0 .5 -.2"/></filter><rect width="320" height="320" fill="#efe5cd"/><rect width="320" height="320" filter="url(#p)" opacity=".5"/></svg>\n`;

const W = '#f4ecd9';
const ICONS = {
  // A case handed over: a case with an arrow into it.
  deliver: badge(C.amber, C.wine, rect(24, 42, 48, 32, W, 'rx="3"') + rect(24, 42, 48, 8, C.parch2, 'rx="2"') + line('M38 42V32H58V42', W, 5) + rect(43, 50, 10, 8, C.wine) + rect(45, 52, 6, 4, C.amber2), 'Deliver'),
  // A glass over a page.
  investigate: badge(C.teal2, C.tealD, ell(42, 42, 17, 17, 'none', `stroke="${W}" stroke-width="6"`) + ell(42, 42, 12, 12, C.teal2, 'opacity=".55"') + line('M55 55 72 72', W, 9, 'stroke-linecap="round"') + line('M34 40q4-7 11-7', W, 2.5, 'stroke-linecap="round"'), 'Investigate'),
  // A hand closing, in a gunsight.
  intercept: badge(C.ink, C.amber, ell(48, 48, 26, 26, 'none', `stroke="${C.ink}" stroke-width="5"`) + line('M48 12V34M48 62V84M12 48H34M62 48H84', C.ink, 5) + ell(48, 48, 6, 6, C.wine), 'Intercept'),
  // An empty coat on a stand: a shape with nobody in it.
  decoy: badge(C.parch2, C.char, path('M38 34H58L64 42 66 72H30L32 42Z', 'none', `stroke="${W}" stroke-width="3.5" stroke-dasharray="5 3.5"`) + path('M38 25 40 18Q48 15 56 18L58 25Z', W) + path('M31 26Q48 21 65 26Q48 30 31 26Z', W) + line('M48 72V84', W, 3.5), 'Decoy'),
  // A black umbrella: what gets opened in the rain.
  cover: badge(C.amber, C.navy2, path('M18 50Q20 22 48 20Q76 22 78 50Q71 43 63 50Q55 43 48 50Q41 43 33 50Q25 43 18 50Z', W) + line('M48 50V72Q48 79 41 79Q35 79 35 73', W, 4.5, 'stroke-linecap="round"') + line('M48 14V20', W, 3.5), 'Cover'),
  // A wax seal, split by a question.
  challenge: badge(C.amber2, C.wine2, path('M48 18 56 25 66 23 69 33 79 37 76 47 81 56 72 62 71 73 60 72 53 80 45 74 35 77 30 68 20 64 23 54 17 45 26 38 27 28 37 27Z', C.wine) + `<text x="48" y="65" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="42" fill="${C.amber2}">?</text>`, 'Challenge'),
};

const out = 'public/art/deaddrop';
mkdirSync(out, { recursive: true });
const SCENES = { embassy: [embassy, 'The Embassy at night'], station: [station, 'The Rail Station under its glass arch'], hotel: [hotel, 'The Art Deco Grand Hotel'], harbour: [harbour, 'The Harbour, with a freighter and cranes'] };
for (const [name, [draw, label]] of Object.entries(SCENES)) writeFileSync(`${out}/${name}.svg`, svg(640, 400, draw(), label));
for (const [name, file] of Object.entries(ICONS)) writeFileSync(`${out}/icon-${name}.svg`, file);
writeFileSync(`${out}/dossier.svg`, svg(328, 202, dossier(), 'A manila dossier'));
writeFileSync(`${out}/report.svg`, svg(640, 82, report(), 'Intelligence report letterhead'));
writeFileSync(`${out}/paper.svg`, paper());
writeFileSync('public/art/covers/dead-drop.svg', svg(600, 840, cover(), 'Dead Drop: two rival spies under a lamp in a European city at night'));
