/**
 * Drawing kit for Kingdom & Commerce's clear-line card art (docs/ART_BIBLE.md). Every function returns SVG markup.
 * Everything is flat colour with one ink. Line weights are named so that a scene keeps the hierarchy the bible asks for.
 */
export const W = 640;
export const H = 360;
export const C = {
  ink: '#261D23',
  burgundy: '#783547', burgundyDark: '#54263A', burgundyLight: '#9C5566',
  gold: '#C9A263', goldLight: '#E6CE97', goldDark: '#9A7A40',
  ivory: '#F5E9D6', parchment: '#E8D9BC', parchmentDark: '#D3C09C',
  stone: '#BDB19D', stoneLight: '#D6CCB8', stoneDark: '#8F8474', stoneDeep: '#6C6358',
  terra: '#B4694A', terraLight: '#CF8D69', terraDark: '#8A4B35',
  slate: '#56697A', slateLight: '#8DA0AC', slateDark: '#364553', slateDeep: '#232D3B',
  sage: '#8A9A72', sageLight: '#AEBB92', sageDark: '#5F704C', sageDeep: '#445237',
  wood: '#7A5438', woodLight: '#A17A55', woodDark: '#4F3625',
  sky: '#D5E0DE', skyLow: '#EEE9D8',
  skin: ['#E8C9A8', '#CDA27C', '#98694A'],
  hair: ['#4F3625', '#261D23', '#8A5A35', '#A89A88'],
};
/** Line weights at the 640 by 360 master: outer contour of a main mass, inner form, fine detail. */
export const LINE = { heavy: 3.2, form: 2, fine: 1.2 };

const n = (x) => +x.toFixed(1);
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const path = (d, fill = 'none', sw = LINE.form, ink = C.ink) => `<path d="${d}" fill="${fill}"${sw ? ` stroke="${ink}" stroke-width="${sw}"` : ' stroke="none"'}/>`;
export const poly = (pts, fill, sw = LINE.form, ink = C.ink) => path(`M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`, fill, sw, ink);
export const rect = (x, y, w, h, fill, sw = LINE.form, ink = C.ink) => path(`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`, fill, sw, ink);
export const ell = (x, y, rx, ry, fill, sw = LINE.form, ink = C.ink, rot = 0) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${sw ? ` stroke="${ink}" stroke-width="${sw}"` : ' stroke="none"'}${rot ? ` transform="rotate(${rot} ${n(x)} ${n(y)})"` : ''}/>`;
export const line = (d, sw = LINE.fine, ink = C.ink) => path(d, 'none', sw, ink);
/** Lines between many pairs as one path, which keeps files small. */
export const ticks = (pairs, sw = LINE.fine, ink = C.ink) => line(pairs.map(([a, b, c, d]) => `M${n(a)} ${n(b)}L${n(c)} ${n(d)}`).join(''), sw, ink);
export const group = (t, ...parts) => `<g transform="${t}">${parts.join('')}</g>`;

/** An arched opening standing on (x, y). */
export const archD = (x, y, w, h) => `M${n(x - w / 2)} ${n(y)}V${n(y - h + w / 2)}A${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(x + w / 2)} ${n(y - h + w / 2)}V${n(y)}Z`;
export const arch = (x, y, w, h, fill, sw = LINE.form) => path(archD(x, y, w, h), fill, sw);

/** Scattered short courses of masonry, not a full grid: enough to say stone without cluttering the form. */
export function masonry(x, y, w, h, seed, { rows = 8, gaps = 0.45, sw = LINE.fine, ink = C.stoneDeep } = {}) {
  const r = rng(seed);
  const rowH = h / rows;
  let d = '';
  for (let i = 0; i < rows; i++) {
    if (r() < gaps) continue;
    const yy = y + i * rowH;
    const x0 = x + r() * w * 0.7;
    const len = Math.min(x + w - x0, 14 + r() * w * 0.3);
    d += `M${n(x0)} ${n(yy)}h${n(len)}`;
    if (r() < 0.7) d += `M${n(x0 + r() * len)} ${n(yy)}v${n(rowH)}`;
  }
  return line(d, sw, ink);
}

/** Lobed foliage from circles merged by a shared fill: draws the outline first, then the fill over it. */
export function foliage(lobes, fill, sw = LINE.form, shade = null) {
  const out = lobes.map(([x, y, r]) => ell(x, y, r, r, C.ink, 0)).join('').replace(/fill="[^"]+"/g, `fill="${C.ink}"`);
  // The ink silhouette is the fill grown by the line weight.
  const grown = lobes.map(([x, y, r]) => ell(x, y, r + sw, r + sw, C.ink, 0)).join('');
  const body = lobes.map(([x, y, r]) => ell(x, y, r, r, fill, 0)).join('');
  const dark = shade ? lobes.slice(0, Math.ceil(lobes.length / 2)).map(([x, y, r]) => ell(x + r * 0.2, y + r * 0.35, r * 0.72, r * 0.6, shade, 0)).join('') : '';
  void out;
  return grown + body + dark;
}

export const cypress = (x, y, h, w = h * 0.2, fill = C.sageDark, shade = C.sageDeep) =>
  path(`M${n(x)} ${n(y - h)}C${n(x + w * 0.5)} ${n(y - h * 0.8)} ${n(x + w * 0.8)} ${n(y - h * 0.3)} ${n(x + w * 0.2)} ${n(y)}H${n(x - w * 0.2)}C${n(x - w * 0.8)} ${n(y - h * 0.3)} ${n(x - w * 0.5)} ${n(y - h * 0.8)} ${n(x)} ${n(y - h)}Z`, fill) +
  path(`M${n(x + w * 0.05)} ${n(y - h * 0.85)}C${n(x + w * 0.6)} ${n(y - h * 0.5)} ${n(x + w * 0.55)} ${n(y - h * 0.2)} ${n(x + w * 0.2)} ${n(y)}H${n(x)}C${n(x + w * 0.2)} ${n(y - h * 0.3)} ${n(x + w * 0.2)} ${n(y - h * 0.5)} ${n(x + w * 0.05)} ${n(y - h * 0.85)}Z`, shade, 0);

const limb = (d, color, width, sw) => path(d, 'none', width + sw * 2) + path(d, 'none', width, color);
const pts = (a) => `M${a.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}`;

/**
 * A person with no face. Feet stand on 0,0 and they are 130 units tall at scale 1, six and a half heads.
 * `dir` is the way they look: hair and hat sit behind that. Arms and legs are points in those units, shoulder or hip first.
 */
export function person(o) {
  const {
    x, y, s = 1, flip = false, dir = 1, skin = C.skin[0], hair = C.hair[0], top = C.burgundy, sleeve = top, hose = C.slate,
    gown = null, skirt = null, hat = null, armL = [[-13, -102], [-18, -80], [-16, -60]], armR = [[13, -102], [18, -80], [16, -60]],
    legL = [[-6, -56], [-7, -28], [-8, -3]], legR = [[6, -56], [7, -28], [8, -3]], lean = 0, headAt = [0, -118], tilt = 0,
    apron = null, belt = C.woodDark, behind = '', inFront = '', handL = true, handR = true, line: lw = 2.2, collar = C.ivory,
  } = o;
  const sw = lw;
  const hip = lean * 0.4;
  const sh = lean;
  const out = [behind];
  const shoe = ([a, b]) => ell(a + 3 * dir, b + 0.5, 6.5, 3, C.woodDark, sw * 0.8);
  if (!gown) {
    out.push(limb(pts(legL.map(([a, b], i) => (i ? [a, b] : [a + hip, b]))), hose, 7, sw), shoe(legL.at(-1)));
    out.push(limb(pts(legR.map(([a, b], i) => (i ? [a, b] : [a + hip, b]))), hose, 7, sw), shoe(legR.at(-1)));
  }
  // The arm away from us is behind the body.
  const armBack = dir > 0 ? armL : armR;
  const armFront = dir > 0 ? armR : armL;
  const hasBack = dir > 0 ? handL : handR;
  const hasFront = dir > 0 ? handR : handL;
  const shiftArm = (a) => a.map(([p, q], i) => (i ? [p, q] : [p + sh, q]));
  out.push(limb(pts(shiftArm(armBack)), sleeve, 7.5, sw));
  if (hasBack) out.push(ell(armBack.at(-1)[0], armBack.at(-1)[1], 3.6, 3.6, skin, sw * 0.8));
  if (gown) {
    const g = typeof gown === 'string' ? { fill: gown } : gown;
    const w = g.w ?? 25;
    const tail = g.tail ?? 0;
    out.push(path(`M${n(-11 + hip)} -68C${n(-w * 0.7)} -44 ${n(-w)} -14 ${n(-w - tail * (dir < 0 ? 1 : 0))} 0Q0 5 ${n(w + tail * (dir > 0 ? 0 : 0))} 0C${n(w)} -14 ${n(w * 0.7)} -44 ${n(11 + hip)} -68Z`, g.fill, sw));
    if (g.fold) out.push(line(`M${n(-5 + hip)} -60C-7 -40 -11 -22 -13 -3M${n(5 + hip)} -60C7 -38 10 -22 12 -3`, sw * 0.6));
    if (g.trim) out.push(path(`M${n(-w)} 0Q0 5 ${n(w)} 0L${n(w - 1.5)} -6Q0 -1 ${n(-w + 1.5)} -6Z`, g.trim, sw * 0.6));
    if (g.panel) out.push(path(`M${n(-4 + hip)} -68L-9 2Q0 4 9 2L${n(4 + hip)} -68Z`, g.panel, sw * 0.6));
  } else if (skirt) {
    out.push(path(`M${n(-11 + hip)} -68L-15 -46Q0 -43 15 -46L${n(11 + hip)} -68Z`, skirt, sw));
  }
  // Torso.
  out.push(path(`M${n(-13 + sh)} -104Q${n(sh)} -109 ${n(13 + sh)} -104L${n(11 + hip)} -66Q${n(hip)} -63 ${n(-11 + hip)} -66Z`, top, sw));
  if (apron) out.push(path(`M${n(-8 + hip)} -68L-11 -30Q0 -27 11 -30L${n(8 + hip)} -68Z`, apron, sw * 0.7));
  if (belt) out.push(line(`M${n(-11 + hip)} -68Q${n(hip)} -65 ${n(11 + hip)} -68`, sw * 1.2, belt));
  // Neck and head. A blank head by rule: nothing goes on the oval but hair and a hat.
  const [hx, hy] = headAt;
  const head = [];
  head.push(limb(`M0 12L0 18`, skin, 6, sw * 0.9));
  if (collar) head.push(path(`M-7 16Q0 22 7 16L5 22Q0 25 -5 22Z`, collar, sw * 0.7));
  head.push(ell(0, 0, 8.6, 10.4, skin, sw));
  head.push(headgear(hat, hair, dir, sw));
  out.push(`<g transform="translate(${n(hx + sh)} ${n(hy)})${tilt ? ` rotate(${tilt})` : ''}">${head.join('')}</g>`);
  out.push(limb(pts(shiftArm(armFront)), sleeve, 7.5, sw));
  if (hasFront) out.push(ell(armFront.at(-1)[0], armFront.at(-1)[1], 3.6, 3.6, skin, sw * 0.8));
  out.push(inFront);
  const scale = flip ? `scale(${-s} ${s})` : `scale(${s})`;
  return `<g transform="translate(${n(x)} ${n(y)}) ${scale}">${out.join('')}</g>`;
}

/** Hats and hair sit on a head centred on 0,0, looking towards `dir`. */
function headgear(hat, hair, dir, sw) {
  const b = -dir;
  const hairShape = path(`M${n(5 * dir)} -9C${n(-2 * dir)} -13 ${n(10 * b)} -11 ${n(9.5 * b)} -1C${n(9.5 * b)} 4 ${n(8 * b)} 7 ${n(5 * b)} 8C${n(4 * b)} 3 ${n(2 * b)} -3 ${n(5 * dir)} -9Z`, hair, sw * 0.8);
  switch (hat) {
    case 'bare':
      return hairShape;
    case 'beret':
      return hairShape + path(`M${n(-11)} -6C-13 -14 -5 -18 2 -17C9 -17 13 -12 11 -6C4 -9 -4 -9 -11 -6Z`, C.burgundyDark, sw * 0.9) + line(`M-9 -6Q0 -9 9 -6`, sw * 0.6, C.gold);
    case 'cap':
      return hairShape + path(`M${n(-10)} -5C-10 -13 -5 -15 0 -15C5 -15 10 -13 10 -5C4 -8 -4 -8 -10 -5Z`, C.woodLight, sw * 0.9);
    case 'black-cap':
      return hairShape + path(`M-10.5 -4L-9 -12C-4 -15 4 -15 9 -12L10.5 -4C4 -7 -4 -7 -10.5 -4Z`, C.ink, sw * 0.9);
    case 'feather':
      return hairShape + path(`M-12 -6C-12 -13 -5 -15 1 -15C7 -15 12 -12 12 -6C4 -9 -4 -9 -12 -6Z`, C.slateDark, sw * 0.9) + path(`M${n(-4 * dir)} -13C${n(-8 * dir)} -22 ${n(-16 * dir)} -24 ${n(-20 * dir)} -21C${n(-16 * dir)} -19 ${n(-12 * dir)} -15 ${n(-6 * dir)} -11Z`, C.ivory, sw * 0.7);
    case 'coif':
      return path(`M${n(8 * dir)} -7C${n(2 * dir)} -13 ${n(10 * b)} -13 ${n(11 * b)} -3C${n(11 * b)} 3 ${n(9 * b)} 8 ${n(5 * b)} 10C${n(5 * b)} 3 ${n(4 * b)} -3 ${n(8 * dir)} -7Z`, C.ivory, sw * 0.9);
    case 'veil':
      return path(`M${n(8 * dir)} -6C${n(3 * dir)} -14 ${n(10 * b)} -14 ${n(11 * b)} -2C${n(13 * b)} 10 ${n(16 * b)} 18 ${n(19 * b)} 24L${n(5 * b)} 18C${n(4 * b)} 6 ${n(3 * b)} -3 ${n(8 * dir)} -6Z`, C.parchment, sw * 0.9);
    case 'kerchief':
      return path(`M${n(8 * dir)} -5C${n(4 * dir)} -13 ${n(9 * b)} -14 ${n(11 * b)} -5C${n(14 * b)} -2 ${n(14 * b)} 2 ${n(11 * b)} 3C${n(8 * b)} 2 ${n(4 * b)} -3 ${n(8 * dir)} -5Z`, C.terra, sw * 0.9);
    case 'cowl':
      return path(`M${n(7.5 * dir)} -9C${n(2 * dir)} -16 ${n(13 * b)} -14 ${n(13 * b)} 0C${n(13 * b)} 8 ${n(10 * b)} 13 ${n(4 * b)} 16L${n(7 * dir)} 14C${n(3 * dir)} 7 ${n(2 * dir)} -3 ${n(7.5 * dir)} -9Z`, C.woodDark, sw * 0.9);
    case 'crown':
      return hairShape + path(`M-9 -8L-11 -21L-5.5 -15L0 -23L5.5 -15L11 -21L9 -8Q0 -11 -9 -8Z`, C.gold, sw * 0.9) + ell(0, -13, 1.4, 1.4, C.burgundy, 0) + ell(-6, -11.5, 1, 1, C.burgundy, 0) + ell(6, -11.5, 1, 1, C.burgundy, 0);
    case 'kettle':
      return path(`M-8 -5C-8 -15 8 -15 8 -5Z`, C.slateLight, sw * 0.9) + path(`M-14 -5Q0 -9 14 -5L10 -2Q0 -5 -10 -2Z`, C.slateLight, sw * 0.9);
    case 'hood':
      return path(`M${n(7.5 * dir)} -8C${n(3 * dir)} -15 ${n(10 * b)} -15 ${n(12 * b)} -3C${n(16 * b)} 2 ${n(20 * b)} 10 ${n(22 * b)} 18L${n(6 * b)} 13C${n(4 * b)} 5 ${n(3 * b)} -3 ${n(7.5 * dir)} -8Z`, C.slateDark, sw * 0.9);
    default:
      return hairShape;
  }
}

/** Wraps a scene as a standalone file: background ink defaults on one root group, so each element stays short. */
export const svg = (title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"><title>${title}</title><g stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`;
