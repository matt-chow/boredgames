/**
 * Miners & Saboteurs artwork: original woodcut-style cards drawn from code. Tunnels are drawn from the same link data
 * the rules use (src/games/mines/rules/cards.ts), so the picture can never disagree with the connectivity.
 * Run: node scripts/art/mines.mjs   (Node 24 loads the .ts registry directly)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { ACTION, ART_KINDS, DEEP_KINDS, ENTRANCE, GOALS, ROLE, TUNNEL, artOf } from '../../src/games/mines/rules/cards.ts';

const W = 120;
const H = 180;
const CX = W / 2;
const CY = H / 2;
const PT = { N: [CX, 0], E: [W, CY], S: [CX, H], W: [0, CY] };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** The tabletop palette, and the immersive one: the same cards seen by lantern light. */
const TABLE = {
  rock: '#4a3a2e', rock2: '#5a4737', rock3: '#2c221b', wall: '#1f1813',
  earth: '#9b7650', floor: '#c49b66', sleeper: '#6b4a2b', timber: '#7a5532', timber2: '#a0743f',
  frame: '#2a1f17', glow: null,
};
const DEEP = {
  rock: '#171b24', rock2: '#222836', rock3: '#0c0e13', wall: '#07080b',
  earth: '#3a2f22', floor: 'url(#lamp)', sleeper: '#2b2016', timber: '#4f3a24', timber2: '#80602f',
  frame: '#000', glow: '#f0b55a',
};
const C = {
  cream: '#efe3c8', parch: '#e2d1ac', parch2: '#c9b48a', ink: '#24190f', iron: '#8d9296', iron2: '#c3c7ca',
  gold: '#e0ac3c', gold2: '#f8dc8c', coal: '#1d1b1a', coal2: '#3b3836', green: '#4c8a3e', blue: '#3c679c',
  red: '#a8432c', teal: '#3f7a74', plum: '#6a3d63', crystal: '#7fd0cf', crystal2: '#d5f3f2', brown: '#6b4a2b',
};

const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const line = (d, stroke, w = 2, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const at = (x, y, s, body, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})" ${extra}>${body}</g>`;
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

/** A seeded generator per card, so the rock texture is the same on every run. */
function rand(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const defs = `<defs>
<radialGradient id="lamp" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="100"><stop offset="0" stop-color="#e2a957"/><stop offset=".55" stop-color="#8a5f2f"/><stop offset="1" stop-color="#3a2a1a"/></radialGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .05  0 0 0 .8 -.25"/></filter>
</defs>`;

const svg = (w, h, body, label, grain = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">${defs}${body}${grain ? rect(0, 0, w, h, '#000', 'filter="url(#grain)" opacity=".35"') : ''}</svg>\n`;

/** A card: a rounded face with a thin frame, everything inside clipped to it. */
const card = (kind, body, label, frame = '#1a120c') =>
  svg(W, H, `<clipPath id="c-${kind}"><rect width="${W}" height="${H}" rx="7"/></clipPath><g clip-path="url(#c-${kind})">${body}</g><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="6.5" fill="none" stroke="${frame}" stroke-width="2"/>`, label);

// ---- Tunnels -------------------------------------------------------------------------------------------------------

function rock(kind, P) {
  const r = rand(kind);
  let out = rect(0, 0, W, H, P.rock);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H, s = 4 + r() * 11;
    const pts = [0, 1, 2, 3, 4].map((k) => [x + Math.cos(k * 1.26 + r()) * s, y + Math.sin(k * 1.26 + r()) * s * 0.8].map((v) => v.toFixed(1)));
    out += poly(pts, r() < 0.5 ? P.rock2 : P.rock3, `opacity="${(0.5 + r() * 0.5).toFixed(2)}"`);
  }
  return out;
}

/** The route a group of joined edges takes: straight through, a curve round the corner, or spokes to the middle. */
function routeOf(group) {
  const [a, b] = group;
  if (group.length === 1) {
    const [x, y] = PT[a];
    return { d: `M${x} ${y}L${x + (CX - x) * 0.5} ${y + (CY - y) * 0.55}`, mid: [x + (CX - x) * 0.5, y + (CY - y) * 0.55], stub: true };
  }
  if (group.length === 2 && OPP[a] === b) return { d: `M${PT[a].join(' ')}L${PT[b].join(' ')}`, mid: [CX, CY] };
  if (group.length === 2) {
    const [ax, ay] = PT[a], [bx, by] = PT[b];
    return { d: `M${ax} ${ay}Q${CX} ${CY} ${bx} ${by}`, mid: [ax / 4 + CX / 2 + bx / 4, ay / 4 + CY / 2 + by / 4] };
  }
  return { d: group.map((e) => `M${PT[e].join(' ')}L${CX} ${CY}`).join(''), mid: [CX, CY] };
}

function shaft(route, P, width = 40) {
  return (
    line(route.d, P.wall, width + 8, 'stroke-linecap="butt" stroke-linejoin="round"') +
    line(route.d, P.earth, width, 'stroke-linecap="butt" stroke-linejoin="round"') +
    line(route.d, P.floor, width - 14, 'stroke-linecap="butt" stroke-linejoin="round"') +
    line(route.d, P.sleeper, 12, 'stroke-dasharray="3 8" stroke-linecap="butt" opacity=".75"')
  );
}

/** Rubble where a tunnel ends. */
function rubble(x, y, P, seed) {
  const r = rand(seed);
  return range(7, (i) => ell(x + (r() - 0.5) * 26, y + (r() - 0.5) * 22, 5 + r() * 5, 4 + r() * 4, i % 2 ? P.rock2 : P.rock3, `stroke="${P.wall}" stroke-width="1.2"`));
}

/** Timber frames where each open edge meets the card's border. */
function frames(edges, P) {
  return edges
    .map((e) => {
      const v = e === 'N' || e === 'S';
      const d = e === 'N' ? 5 : e === 'S' ? H - 11 : e === 'W' ? 5 : W - 11;
      return v ? rect(CX - 25, d, 50, 6, P.timber, `stroke="${P.frame}" stroke-width="1"`) : rect(d, CY - 25, 6, 50, P.timber, `stroke="${P.frame}" stroke-width="1"`);
    })
    .join('');
}

const ladder = (x, y, P) =>
  rect(x - 10, y - 20, 4, 40, P.timber2) + rect(x + 6, y - 20, 4, 40, P.timber2) + range(5, (i) => rect(x - 8, y - 16 + i * 8, 16, 3, P.timber2)) +
  ell(x, y - 26, 13, 5, '#f4e1a8', 'opacity=".5"');

function door(x, y, colour, P) {
  return (
    `<circle cx="${x}" cy="${y}" r="17" fill="${colour}" stroke="${P.frame}" stroke-width="2.5"/>` +
    range(3, (i) => rect(x - 11 + i * 8, y - 12, 2, 24, '#00000055')) +
    `<circle cx="${x}" cy="${y - 2}" r="3" fill="${C.ink}"/>` + rect(x - 1.2, y, 2.4, 6, C.ink)
  );
}

const crystalAt = (x, y, s = 1) =>
  at(x, y, s, poly([[0, -14], [6, -3], [3, 10], [-4, 10], [-6, -2]], C.crystal, 'stroke="#1b4c4b" stroke-width="1.5"') + poly([[0, -14], [6, -3], [0, 0]], C.crystal2) + poly([[-12, 2], [-6, -2], [-4, 10], [-10, 10]], '#5aa9a8', 'stroke="#1b4c4b" stroke-width="1.2"'));

const nuggets = (x, y, n, s = 1) =>
  at(x, y, s, range(n, (i) => {
    const dx = [0, -13, 13, -6, 7][i], dy = [0, 6, 6, -9, -9][i];
    return path(`M${dx - 9} ${dy + 4}Q${dx - 10} ${dy - 6} ${dx - 1} ${dy - 8}Q${dx + 10} ${dy - 7} ${dx + 9} ${dy + 2}Q${dx + 6} ${dy + 9} ${dx - 3} ${dy + 8}Z`, C.gold, `stroke="#6e4c12" stroke-width="1.5"`) + ell(dx - 2, dy - 3, 3, 2, C.gold2);
  }));

function tunnelCard(def, P, deep) {
  const routes = def.links.map(routeOf);
  const crossing = def.kind === 'overpass';
  let body = rock(def.kind, P);
  if (deep) body += `<circle cx="${CX}" cy="${CY}" r="80" fill="url(#halo)"/>`;
  routes.forEach((r, i) => {
    if (crossing && i === 1) body += line(routes[0].d, P.wall, 52, 'opacity=".55"'); // the lower gallery runs beneath
    body += shaft(r, P, def.links.length > 1 && !crossing && def.links.every((g) => g.length === 2) ? 30 : 40);
  });
  if (crossing) body += range(6, (i) => rect(CX - 20, 30 + i * 22, 40, 5, P.timber2, `stroke="${P.frame}" stroke-width=".8"`));
  routes.forEach((r, i) => r.stub && (body += rubble(...r.mid, P, def.kind + i)));
  // Two openings that do not meet still need something solid between them.
  if (def.links.length > 1 && def.links.every((g) => g.length === 1)) body += rubble(CX, CY, P, def.kind + 'mid');
  body += frames(def.links.flat(), P);
  const mid = routes[0].mid;
  if (def.door) body += door(mid[0], mid[1], def.door === 'green' ? C.green : C.blue, P);
  if (def.ladder) body += ladder(...(def.kind === 'entrance' ? [CX, CY] : mid), P);
  if (def.crystals) body += crystalAt(def.links.flat().includes('E') ? 92 : 28, def.links.flat().includes('N') ? 150 : 34, 1.1);
  if (def.kind === 'entrance') body += poly([[CX - 30, 0], [CX + 30, 0], [CX + 12, CY], [CX - 12, CY]], '#ffe7a6', 'opacity=".22"') + rect(CX - 22, CY + 24, 44, 8, P.timber2, `stroke="${P.frame}"`);
  if (def.kind === 'gold') body += nuggets(CX, CY, 5, 1.1) + range(6, (i) => poly([[0, -5], [1.4, -1.4], [5, 0], [1.4, 1.4], [0, 5], [-1.4, 1.4], [-5, 0], [-1.4, -1.4]].map(([x, y]) => [x + [22, 98, 30, 92, 60, 60][i], y + [40, 46, 140, 132, 30, 152][i]]), C.gold2));
  if (def.kind.startsWith('coal')) body += range(5, (i) => poly([[0, -8], [8, -2], [5, 8], [-6, 7], [-8, -3]].map(([x, y]) => [x + CX + [-8, 9, 0, -14, 13][i] + (def.kind === 'coalR' ? 8 : -8), y + CY + 8 + [0, 3, -9, 10, 12][i]]), i % 2 ? C.coal : C.coal2, 'stroke="#000" stroke-width="1"'));
  if (deep && P.glow) body += `<circle cx="${CX}" cy="${CY}" r="5" fill="${P.glow}" opacity=".9"/>`;
  return card(def.kind, body, def.name);
}

// ---- Card backs ----------------------------------------------------------------------------------------------------

function back(kind, P, label, emblem) {
  const tile = range(9, (i) => range(6, (j) => poly([[j * 22 + (i % 2) * 11, i * 22 - 6], [j * 22 + 11 + (i % 2) * 11, i * 22 + 5], [j * 22 + (i % 2) * 11, i * 22 + 16], [j * 22 - 11 + (i % 2) * 11, i * 22 + 5]], 'none', `stroke="${P}" stroke-width="1.2" opacity=".35"`)));
  return card(kind, rect(0, 0, W, H, '#3a2a1e') + tile + rect(10, 10, W - 20, H - 20, 'none', `rx="5" stroke="${C.gold}" stroke-width="2" opacity=".7"`) + emblem, label);
}

const lanternEmblem = (x, y, s) =>
  at(x, y, s, `<circle r="30" fill="url(#halo)"/>` + rect(-12, -18, 24, 6, C.iron, 'rx="2"') + path('M-11-12H11L9 14H-9Z', '#f2c86a', `stroke="${C.ink}" stroke-width="2"`) + line('M-6-12V14M0-12V14M6-12V14', C.ink, 1.2, 'opacity=".5"') + rect(-13, 14, 26, 6, C.iron, 'rx="2"') + line('M-8-18Q0-30 8-18', C.iron2, 2.5));

// ---- Icons (drawn in a 100-unit box around 0,0) --------------------------------------------------------------------

const ICON = {
  pick: line('M-30 34L24-22', C.brown, 8, 'stroke-linecap="round"') + path('M-4-40Q26-40 42-12Q28-26 6-28Q22-18 30 4Q14-24-14-32Z', C.iron, `stroke="${C.ink}" stroke-width="2.5"`),
  lamp: rect(-16, -34, 32, 8, C.iron, `rx="3" stroke="${C.ink}" stroke-width="2"`) + path('M-15-26H15L12 22H-12Z', '#f2c86a', `stroke="${C.ink}" stroke-width="3"`) + ell(0, -2, 6, 10, '#fff2c0') + rect(-18, 22, 36, 9, C.iron, `rx="3" stroke="${C.ink}" stroke-width="2"`) + line('M-10-34Q0-50 10-34', C.ink, 3),
  cart: path('M-36-18H36L26 18H-26Z', C.iron, `stroke="${C.ink}" stroke-width="3"`) + line('M-30-8H30', C.ink, 1.5, 'opacity=".5"') + `<circle cx="-16" cy="26" r="9" fill="${C.coal2}" stroke="${C.ink}" stroke-width="2.5"/><circle cx="16" cy="26" r="9" fill="${C.coal2}" stroke="${C.ink}" stroke-width="2.5"/>` + line('M-44 36H44', C.brown, 4),
  crack: line('M-40-30L-12-6L-22 4L10 22L2 30L40 44', C.red, 6, 'stroke-linejoin="bevel"') + line('M-40-30L-12-6L-22 4L10 22L2 30L40 44', '#fff', 1.5, 'opacity=".5"'),
  mend: `<circle cx="30" cy="-30" r="16" fill="${C.teal}" stroke="${C.ink}" stroke-width="2.5"/>` + line('M30-40V-20M20-30H40', '#fff', 4),
  map: path('M-38-30L-12-36L12-28L38-34V30L12 36L-12 28L-38 34Z', C.parch, `stroke="${C.ink}" stroke-width="2.5"`) + line('M-12-36V28M12-28V36', C.ink, 1.5, 'opacity=".4"') + line('M-28 20Q-16 0 0 8T24-14', C.red, 2.5, 'stroke-dasharray="4 4"') + line('M20-22L30-12M30-22L20-12', C.red, 3.5),
  rocks: range(6, (i) => poly([[0, -9], [9, -3], [7, 8], [-7, 9], [-10, -2]].map(([x, y]) => [x * 1.4 + [-24, 4, 26, -10, 16, -30][i], y * 1.4 + [-34, -22, -36, 8, 18, 30][i]]), i % 2 ? C.coal2 : '#6f6052', `stroke="${C.ink}" stroke-width="2"`)) + line('M-40 46H40', C.ink, 3) + line('M-20-46V-36M2-48V-38M22-46V-36', C.ink, 2),
  pouch: path('M-26 0Q-30 38 0 40Q30 38 26 0Q20-14 8-18H-8Q-20-14-26 0Z', '#8a5a33', `stroke="${C.ink}" stroke-width="3"`) + line('M-12-18Q0-10 12-18', C.ink, 3) + `<circle cx="22" cy="-30" r="10" fill="${C.gold}" stroke="#6e4c12" stroke-width="2"/>` + line('M-40-40Q-30-20-10-26', C.ink, 4, 'stroke-linecap="round"'),
  box: rect(-34, -16, 68, 44, '#7b5532', `stroke="${C.ink}" stroke-width="3"`) + path('M-34-16Q-34-38 0-38Q34-38 34-16Z', '#94683c', `stroke="${C.ink}" stroke-width="3"`) + rect(-36, -8, 72, 7, C.iron, `stroke="${C.ink}" stroke-width="1.5"`) + rect(-8, -2, 16, 18, C.gold, `rx="2" stroke="${C.ink}" stroke-width="2"`) + `<circle cx="0" cy="5" r="2.5" fill="${C.ink}"/>`,
  swap: path('M-40-6Q-40-24-24-24H-8V6H-40Z', '#8a5a33', `stroke="${C.ink}" stroke-width="2.5"`) + path('M8-6H40V24H24Q8 24 8 6Z', '#6d4426', `stroke="${C.ink}" stroke-width="2.5"`) + line('M-22-34Q0-48 22-28', C.ink, 3) + poly([[22, -28], [12, -30], [20, -38]], C.ink) + line('M22 34Q0 48-22 28', C.ink, 3) + poly([[-22, 28], [-12, 30], [-20, 38]], C.ink),
  eye: path('M-42 0Q0-36 42 0Q0 36-42 0Z', C.cream, `stroke="${C.ink}" stroke-width="3"`) + `<circle r="14" fill="${C.teal}" stroke="${C.ink}" stroke-width="2"/><circle r="6" fill="${C.ink}"/><circle cx="-4" cy="-4" r="2.5" fill="#fff"/>`,
  badge: poly(Array.from({ length: 10 }, (_, i) => [Math.sin((i * Math.PI) / 5) * (i % 2 ? 16 : 34), -Math.cos((i * Math.PI) / 5) * (i % 2 ? 16 : 34)]), C.gold, `stroke="${C.ink}" stroke-width="2.5"`) + line('M-44 10A44 44 0 0 0 30 34', C.ink, 3) + poly([[30, 34], [20, 30], [28, 24]], C.ink) + line('M44-10A44 44 0 0 0-30-34', C.ink, 3) + poly([[-30, -34], [-20, -30], [-28, -24]], C.ink),
  bars: rect(-38, -38, 76, 76, '#2c2420', `stroke="${C.ink}" stroke-width="3"`) + range(5, (i) => rect(-32 + i * 15, -38, 5, 76, C.iron)) + rect(-38, -6, 76, 6, C.iron) + rect(-10, 4, 20, 18, C.gold, `rx="3" stroke="${C.ink}" stroke-width="2"`) + line('M-6 4V-4Q0-12 6-4V4', C.ink, 3),
  rope: range(4, (i) => ell(0, 8, 34 - i * 7, 20 - i * 4, 'none', `stroke="#b88a4a" stroke-width="6"`)) + range(4, (i) => ell(0, 8, 34 - i * 7, 20 - i * 4, 'none', `stroke="${C.ink}" stroke-width="1" opacity=".5"`)) + line('M30 6Q42-30 10-40', '#b88a4a', 6) + line('M10-40Q-2-44-4-34', C.iron, 5, 'stroke-linecap="round"'),
};

const ACTION_ART = {
  breakPick: ['pick', 'crack'], breakLamp: ['lamp', 'crack'], breakCart: ['cart', 'crack'],
  fixPick: ['pick', 'mend'], fixLamp: ['lamp', 'mend'], fixCart: ['cart', 'mend'],
  survey: ['map'], caveIn: ['rocks'], theft: ['pouch'], guard: ['box'], swapHands: ['swap'], inspect: ['eye'], swapRole: ['badge'], trap: ['bars'], free: ['rope'],
};
const FIX_PAIR = { fixPickLamp: ['pick', 'lamp'], fixPickCart: ['pick', 'cart'], fixLampCart: ['lamp', 'cart'] };
const BAND = { break: C.red, fix: C.teal, survey: '#8a6a2c', caveIn: '#5a4a3e', expanded: C.plum };

function actionCard(kind) {
  const band = kind.startsWith('break') ? BAND.break : kind.startsWith('fix') ? BAND.fix : kind === 'survey' ? BAND.survey : kind === 'caveIn' ? BAND.caveIn : BAND.expanded;
  let icon;
  if (FIX_PAIR[kind]) {
    const [a, b] = FIX_PAIR[kind];
    icon = at(CX, 66, 0.62, ICON[a]) + at(CX, 128, 0.62, ICON[b]) + at(CX + 6, 112, 0.7, ICON.mend) + line(`M30 97H90`, C.ink, 1.5, 'stroke-dasharray="3 3" opacity=".5"');
  } else icon = at(CX, 96, 0.9, ACTION_ART[kind].map((k) => ICON[k]).join(''));
  const body = rect(0, 0, W, H, C.parch) + range(14, (i) => line(`M0 ${i * 14}H${W}`, C.parch2, 1, 'opacity=".5"')) + rect(0, 0, W, 26, band) + rect(0, H - 14, W, 14, band) + range(3, (i) => `<circle cx="${CX - 14 + i * 14}" cy="13" r="3" fill="${C.cream}" opacity=".8"/>`) + icon;
  return card(kind, body, ACTION[kind].name, C.ink);
}

// ---- Roles ---------------------------------------------------------------------------------------------------------

function figure(hat, coat, extra = '') {
  return (
    path('M-30 70Q-30 20 0 18Q30 20 30 70Z', coat, `stroke="${C.ink}" stroke-width="3"`) +
    `<circle cy="0" r="18" fill="#d9b48c" stroke="${C.ink}" stroke-width="3"/>` +
    `<circle cx="-6" cy="0" r="2" fill="${C.ink}"/><circle cx="6" cy="0" r="2" fill="${C.ink}"/>` +
    path('M-22-6Q-22-26 0-26Q22-26 22-6Z', hat, `stroke="${C.ink}" stroke-width="3"`) + rect(-26, -8, 52, 5, hat, `stroke="${C.ink}" stroke-width="2"`) +
    extra
  );
}

const ROLE_ART = {
  miner: [C.gold, '#6d5034', at(0, -24, 0.25, ICON.lamp) + at(30, 46, 0.45, ICON.pick)],
  saboteur: ['#2b2b2b', '#3d3433', path('M-22 2Q0 10 22 2V10Q0 18-22 10Z', '#2b2b2b') + line('M24 40Q40 30 34 14', '#c9a24a', 2.5) + `<circle cx="34" cy="12" r="4" fill="#ffb347"/>` + rect(16, 38, 18, 26, C.red, `rx="3" stroke="${C.ink}" stroke-width="2"`)],
  green: [C.green, '#4b5b3c', at(0, -24, 0.25, ICON.lamp) + at(30, 46, 0.45, ICON.pick)],
  blue: [C.blue, '#3b4a5f', at(0, -24, 0.25, ICON.lamp) + at(30, 46, 0.45, ICON.pick)],
  foreman: ['#d4d0c4', '#5b4d3e', rect(14, 30, 24, 32, C.cream, `stroke="${C.ink}" stroke-width="2"`) + line('M18 40H34M18 47H34M18 54H30', C.ink, 1.5)],
  opportunist: ['#7a3c2c', '#5e3a4a', `<circle cx="28" cy="44" r="11" fill="${C.gold}" stroke="#6e4c12" stroke-width="2"/>` + line('M-10 8Q0 13 10 8', C.ink, 2)],
  seeker: [C.teal, '#3e4e4f', crystalAt(28, 50, 1.2)],
};

function roleCard(role) {
  const [hat, coat, extra] = ROLE_ART[role];
  const tint = role === 'green' ? C.green : role === 'blue' ? C.blue : role === 'saboteur' ? C.red : role === 'miner' ? C.gold : '#8a7a5a';
  const body = rect(0, 0, W, H, '#3a2c20') + `<circle cx="${CX}" cy="76" r="56" fill="${tint}" opacity=".35"/>` + at(CX, 72, 1, figure(hat, coat, extra)) + rect(0, H - 30, W, 30, tint) + rect(0, H - 30, W, 3, C.ink, 'opacity=".4"');
  return card(role, body, ROLE[role].name);
}

// ---- Rewards and tokens --------------------------------------------------------------------------------------------

const rewardCard = (v) => card(`reward${v}`, rect(0, 0, W, H, '#2e2219') + `<circle cx="${CX}" cy="${CY}" r="50" fill="url(#halo)"/>` + nuggets(CX, CY, [1, 3, 5][v - 1], 1.5) + range(v, (i) => `<circle cx="${CX - (v - 1) * 9 + i * 18}" cy="${H - 20}" r="6" fill="${C.gold}" stroke="#6e4c12" stroke-width="1.5"/>`), `${v} gold`);

/** A plain badge carries no grain: it stays crisp at 24 pixels. */
const badge = (ring, fill, body, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${label}"><circle cx="48" cy="48" r="46" fill="${fill}"/><circle cx="48" cy="48" r="41" fill="none" stroke="${ring}" stroke-width="3"/>${body}</svg>\n`;

const toolBadge = (tool, broken) =>
  badge(broken ? C.red : '#c9b48a', broken ? '#3a2a24' : '#4d3a2a', at(48, 50, 0.62, ICON[tool]) + (broken ? at(48, 48, 0.7, ICON.crack) : ''), `${tool}${broken ? ', broken' : ''}`);

// ---- Cover ---------------------------------------------------------------------------------------------------------

function cover() {
  const r = rand('cover');
  let body = rect(0, 0, 600, 840, '#20170f');
  for (let i = 0; i < 90; i++) {
    const x = r() * 600, y = r() * 840, s = 10 + r() * 30;
    body += poly([0, 1, 2, 3, 4].map((k) => [x + Math.cos(k * 1.26 + r()) * s, y + Math.sin(k * 1.26 + r()) * s * 0.8]), r() < 0.5 ? '#2e2218' : '#17100a');
  }
  // A cutaway mine: shafts and galleries lit from the entrance.
  const d = 'M300 0V260H120V520H300V700M300 260H480V420H560M120 520H40M300 520H440V640';
  body += line(d, '#0b0805', 74, 'stroke-linejoin="round"') + line(d, '#7a5533', 62, 'stroke-linejoin="round"') + line(d, '#b88a55', 40, 'stroke-linejoin="round"') + line(d, '#5a3d22', 14, 'stroke-dasharray="5 12"');
  body += poly([[250, 0], [350, 0], [330, 260], [270, 260]], '#ffe2a0', 'opacity=".18"');
  body += at(440, 640, 2.2, nuggets(0, 0, 5)) + `<circle cx="440" cy="640" r="110" fill="url(#halo)"/>`;
  body += at(300, 330, 1.6, figure(C.gold, '#6d5034', at(0, -24, 0.25, ICON.lamp))) + at(140, 590, 1.3, figure('#2b2b2b', '#3d3433', path('M-22 2Q0 10 22 2V10Q0 18-22 10Z', '#2b2b2b')));
  body += at(540, 420, 1.4, crystalAt(0, 0)) + at(60, 470, 1.2, crystalAt(0, 0));
  body += at(300, 120, 1.6, lanternEmblem(0, 0, 1)) + at(480, 380, 0.9, ICON.cart) + rect(0, 760, 600, 80, '#0b0805', 'opacity=".6"');
  return svg(600, 840, body, 'Miners and Saboteurs: a lantern-lit cutaway mine with a miner, a hooded saboteur and a heap of gold');
}

// ---- Write ---------------------------------------------------------------------------------------------------------

const out = 'public/art/mines';
mkdirSync(`${out}/deep`, { recursive: true });
mkdirSync('public/art/covers', { recursive: true });

const fixed = { entrance: ENTRANCE, ...GOALS };
function draw(kind, P, deep) {
  const def = TUNNEL[kind] ?? fixed[kind];
  if (def) return tunnelCard(def, P, deep);
  if (kind === 'goalBack') return back(kind, C.gold, 'A face-down destination', at(CX, CY, 1, `<circle r="30" fill="#2a1d14" stroke="${C.gold}" stroke-width="3"/>` + nuggets(0, 2, 1, 1) + line('M-16-16L16 16M16-16L-16 16', C.gold, 2, 'opacity=".35"')));
  if (kind === 'cardBack') return back(kind, C.parch2, 'The back of a mine card', lanternEmblem(CX, CY, 1.4));
  if (kind === 'roleBack') return back(kind, C.teal, 'The back of a role card', at(CX, CY, 0.8, ICON.badge));
  if (ACTION[kind]) return actionCard(kind);
  if (ROLE[kind]) return roleCard(kind);
  if (kind.startsWith('reward')) return rewardCard(Number(kind.slice(6)));
  if (kind === 'nugget') return badge(C.gold, '#3a2a1e', nuggets(48, 52, 1, 2), 'gold');
  if (kind === 'crystal') return badge(C.crystal, '#1f2e33', crystalAt(50, 54, 2.2), 'crystal');
  const tool = /^tool(Pick|Lamp|Cart)(Broken)?$/.exec(kind);
  if (tool) return toolBadge(tool[1].toLowerCase(), !!tool[2]);
  throw new Error(`No art for ${kind}`);
}

// Tabletop card faces are paintings now (scripts/art/mines-paint.mjs); this draws the badges, the deep mine and the cover.
for (const kind of ART_KINDS.filter((k) => artOf(k).endsWith('.svg'))) writeFileSync(`${out}/${kind}.svg`, draw(kind, TABLE, false));
for (const kind of DEEP_KINDS) writeFileSync(`${out}/deep/${kind}.svg`, kind === 'goalBack' ? back(kind, C.crystal, 'A face-down destination', at(CX, CY, 1, `<circle r="30" fill="#0e1218" stroke="${C.crystal}" stroke-width="3"/>` + nuggets(0, 2, 1, 1))) : draw(kind, DEEP, true));
writeFileSync('public/art/covers/mines.svg', cover());
console.log(`Wrote the badges, ${DEEP_KINDS.length} deep tiles and the cover.`);
