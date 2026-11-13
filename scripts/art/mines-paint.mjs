// Miners & Saboteurs painted card faces: tunnels, destinations, actions, roles, rewards and card backs.
//
//   node scripts/art/mines-paint.mjs generate <workdir> [kind,...]  queue prompts on AI Horde one at a time, skipping
//                                                                   files already in <workdir>
//   node scripts/art/mines-paint.mjs build <workdir>                frame, resize and encode the picks into public/art/mines
//                                                                   and write the manifest; fails if a tunnel's painted
//                                                                   openings disagree with its links (MS-ART2)
//
// Tunnels are not left to the model: each one starts from a layout drawn here from the card's own links (the same
// data the rules use), which the model repaints at moderate strength. The build then measures every edge of the
// finished picture. Images come from the Deliberate checkpoint (CreativeML OpenRAIL-M) on AI Horde's free anonymous
// tier, from text prompts and these layouts only: no reference images, artist names or third-party pictures. See
// docs/ASSETS.md and docs/MINES_ART.md.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ACTION, CLASSIC_DECK, ENTRANCE, GOALS, ROLE, TUNNEL } from '../../src/games/mines/rules/cards.ts';

const STYLE = 'european ligne claire comic book illustration, clean even black ink outlines, flat colours with soft cel shading, warm earthy palette of sandstone, ochre, moss green and slate blue, warm lantern light, whimsical fantasy adventure, crisp detailed linework';
const AVOID = 'text, letters, words, numbers, watermark, signature, logo, speech bubble, panel border, frame, photo, photorealistic, 3d render, blurry, deformed, extra fingers, extra limbs, mutated hands, neon, glossy, nsfw, nude';

// ---- Tunnel layouts --------------------------------------------------------------------------------------------------

const GW = 384;
const GH = 576;
const CX = GW / 2;
const CY = GH / 2;
const PT = { N: [CX, 0], E: [GW, CY], S: [CX, GH], W: [0, CY] };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const INK = '#2a1d14';

function rand(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The route a group of joined edges takes: as in scripts/art/mines.mjs, so both views agree. */
function routeOf(group) {
  const [a, b] = group;
  if (group.length === 1) {
    const [x, y] = PT[a];
    const mid = [x + (CX - x) * 0.5, y + (CY - y) * 0.5];
    return { d: `M${x} ${y}L${mid.join(' ')}`, mid, stub: true };
  }
  if (group.length === 2 && OPP[a] === b) return { d: `M${PT[a].join(' ')}L${PT[b].join(' ')}`, mid: [CX, CY] };
  if (group.length === 2) {
    const [ax, ay] = PT[a], [bx, by] = PT[b];
    return { d: `M${ax} ${ay}Q${CX} ${CY} ${bx} ${by}`, mid: [ax / 4 + CX / 2 + bx / 4, ay / 4 + CY / 2 + by / 4] };
  }
  return { d: group.map((e) => `M${PT[e].join(' ')}L${CX} ${CY}`).join(''), mid: [CX, CY] };
}

const stroke = (d, colour, w, extra = '') => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linejoin="round" ${extra.includes('linecap') ? extra : `stroke-linecap="square" ${extra}`}/>`;
const blob = (x, y, s, r, fill) => {
  const pts = Array.from({ length: 7 }, (_, k) => [x + Math.cos(k * 0.9 + r()) * s, y + Math.sin(k * 0.9 + r()) * s * 0.8].map((v) => v.toFixed(1)).join(','));
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
};

/** Every layer of one route: ink walls, floor, sleepers, rails. */
function shaft(d, half) {
  return [stroke(d, INK, half * 2 + 12), stroke(d, '#cfa46a', half * 2), stroke(d, '#a87d4b', half * 2 - 26), stroke(d, '#6e4a2a', half * 1.1, 'stroke-dasharray="12 22" stroke-linecap="butt"'), stroke(d, '#8b9094', half * 0.78, 'stroke-linecap="butt"'), stroke(d, '#a87d4b', half * 0.62, 'stroke-linecap="butt"')];
}

function rubble(x, y, seed) {
  const r = rand(seed);
  return Array.from({ length: 11 }, (_, i) => blob(x + (r() - 0.5) * 100, y + (r() - 0.5) * 90, 18 + r() * 16, r, i % 2 ? '#8a8178' : '#6a625b')).join('');
}

/** A timber frame across each opening, near the card's edge. */
function frames(edges, half) {
  return edges.map((e) => {
    const v = e === 'N' || e === 'S';
    const d = e === 'N' || e === 'W' ? 16 : (v ? GH : GW) - 36;
    const box = v ? [CX - half - 14, d, half * 2 + 28, 20] : [d, CY - half - 14, 20, half * 2 + 28];
    return `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="#9a6b3c" stroke="${INK}" stroke-width="3"/>`;
  }).join('');
}

const crystals = (x, y) =>
  [[0, 0, 1.6], [-40, 22, 1.1], [36, 24, 1]].map(([dx, dy, s]) => `<polygon points="${[[0, -40], [16, -8], [9, 28], [-11, 28], [-16, -6]].map(([px, py]) => [x + dx + px * s, y + dy + py * s].join(',')).join(' ')}" fill="#6fc7c4" stroke="#163f3e" stroke-width="3"/><polygon points="${[[0, -40], [16, -8], [0, 0]].map(([px, py]) => [x + dx + px * s, y + dy + py * s].join(',')).join(' ')}" fill="#d5f3f2"/>`).join('');

function ladder(x, y) {
  let out = `<circle cx="${x}" cy="${y}" r="62" fill="#ffe7a6" opacity=".35"/><rect x="${x - 40}" y="${y - 40}" width="80" height="80" fill="#1d150f" stroke="${INK}" stroke-width="4"/>`;
  out += `<rect x="${x - 30}" y="${y - 52}" width="10" height="104" fill="#c08a4c" stroke="${INK}" stroke-width="3"/><rect x="${x + 20}" y="${y - 52}" width="10" height="104" fill="#c08a4c" stroke="${INK}" stroke-width="3"/>`;
  for (let i = 0; i < 5; i++) out += `<rect x="${x - 22}" y="${y - 40 + i * 20}" width="44" height="7" fill="#d9a35f" stroke="${INK}" stroke-width="2"/>`;
  return out;
}

function door(x, y, colour, vertical) {
  const [w, h] = vertical ? [140, 34] : [34, 140];
  let out = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="4" fill="${colour}" stroke="${INK}" stroke-width="4"/>`;
  for (let i = 1; i < 4; i++) out += vertical ? `<line x1="${x - w / 2 + (i * w) / 4}" y1="${y - h / 2}" x2="${x - w / 2 + (i * w) / 4}" y2="${y + h / 2}" stroke="${INK}" stroke-width="2" opacity=".6"/>` : `<line x1="${x - w / 2}" y1="${y - h / 2 + (i * h) / 4}" x2="${x + w / 2}" y2="${y - h / 2 + (i * h) / 4}" stroke="${INK}" stroke-width="2" opacity=".6"/>`;
  return out + `<circle cx="${x}" cy="${y}" r="9" fill="#c9a24a" stroke="${INK}" stroke-width="3"/>`;
}

const nuggets = (x, y, n, s) =>
  Array.from({ length: n }, (_, i) => {
    const dx = [0, -40, 40, -20, 22, -50, 50][i] * s, dy = [0, 18, 18, -26, -26, -14, -10][i] * s;
    return `<ellipse cx="${x + dx}" cy="${y + dy}" rx="${26 * s}" ry="${20 * s}" fill="#e0ac3c" stroke="#5c3d0c" stroke-width="3"/><ellipse cx="${x + dx - 7 * s}" cy="${y + dy - 7 * s}" rx="${9 * s}" ry="${5 * s}" fill="#f8dc8c"/>`;
  }).join('');

/** The layout a tunnel is painted from. Openings come only from def.links. */
export function layout(def) {
  const r = rand(def.kind);
  const twins = def.links.length > 1 && def.links.every((g) => g.length === 2) && def.kind !== 'overpass';
  const half = twins ? 50 : 62;
  let body = `<rect width="${GW}" height="${GH}" fill="#5b4636"/>`;
  for (let i = 0; i < 26; i++) body += blob(r() * GW, r() * GH, 22 + r() * 34, r, r() < 0.5 ? '#6c5641' : '#4c3a2d');
  body += `<radialGradient id="lamp"><stop offset="0" stop-color="#ffd27a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient><circle cx="${CX}" cy="${CY}" r="220" fill="url(#lamp)"/>`;
  const routes = def.links.map(routeOf);
  if (def.kind === 'overpass') {
    // The lower shaft darkens only in the bridge's shadow, so its own openings still read as open.
    body += shaft(routes[0].d, half).join('') + `<rect x="${CX - half - 6}" y="${CY - half - 40}" width="${half * 2 + 12}" height="${half * 2 + 80}" fill="#000" opacity=".4"/>`;
    body += shaft(routes[1].d, half).join('');
    for (let x = 30; x < GW; x += 30) body += `<rect x="${x}" y="${CY - half}" width="20" height="${half * 2}" fill="#b07f48" stroke="${INK}" stroke-width="3"/>`;
  } else {
    const layers = routes.map((rt) => shaft(rt.d, half));
    for (let k = 0; k < layers[0].length; k++) body += layers.map((l) => l[k]).join('');
  }
  routes.forEach((rt, i) => rt.stub && (body += rubble(...rt.mid, def.kind + i)));
  if (def.links.length > 1 && def.links.every((g) => g.length === 1)) body += rubble(CX, CY, def.kind + 'mid');
  body += frames(def.links.flat(), half);
  const mid = routes[0].mid;
  const edges = def.links.flat();
  if (def.door) body += door(mid[0], mid[1], def.door === 'green' ? '#3f8a3a' : '#2f63a8', routes[0].d.includes('Q') ? !edges.includes('N') : edges.includes('N'));
  if (def.ladder) body += ladder(...(def.kind === 'entrance' ? [CX, CY] : mid));
  if (def.crystals) body += crystals(edges.includes('E') ? 84 : 300, edges.includes('N') ? 470 : 110);
  if (def.kind === 'gold') body += nuggets(CX, CY, 7, 1.15);
  if (def.kind.startsWith('coal')) body += Array.from({ length: 6 }, (_, i) => blob(CX + [-30, 26, 0, -48, 44, 4][i] + (def.kind === 'coalR' ? 24 : -24), CY + 24 + [0, 8, -28, 30, 34, 40][i], 22, r, i % 2 ? '#1d1b1a' : '#3b3836')).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}">${body}</svg>`;
}

// ---- Prompts -----------------------------------------------------------------------------------------------------

const MINE = 'overhead view looking straight down on a game board tile of underground mine tunnels carved through dark boulders, sandy tunnel floor with wooden sleepers and iron mine-cart rails, timber beams, warm lantern glow';
const TUNNEL_EXTRA = {
  gold: 'a glittering heap of gold nuggets at the crossing, sparkles',
  coalL: 'a pile of black coal lumps on the tunnel floor', coalR: 'a pile of black coal lumps on the tunnel floor',
  entrance: 'a wooden ladder rising out of a square shaft toward daylight',
};
const tunnelPrompt = (def) => {
  const extra = TUNNEL_EXTRA[def.kind] ?? (def.door ? `a sturdy ${def.door} painted wooden gate with iron studs across the tunnel` : def.ladder ? 'a wooden ladder rising out of a square shaft' : def.crystals ? 'a large cluster of sharp teal quartz crystals growing out of the rock' : def.kind === 'overpass' ? 'a wooden plank bridge carrying one tunnel over the other' : def.links.some((g) => g.length === 1) ? 'tunnels blocked by heaps of grey fallen rubble stones' : '');
  return `${MINE}${extra ? `, ${extra}` : ''}, ${STYLE} ### ${AVOID}, people, person, perspective, horizon, sky`;
};

// Second pass (seeds 41, 59, 83): the first prompts drifted to sunny landscapes, character sheets and captions, so these
// pin the scene underground and push those away. The few first-pass pictures that were kept are in V1.
const V2 = [41, 59, 83];
// Third pass (seeds 101, 131, 167): "lantern light" in the shared scene turned every action into a lantern, so actions
// get a plain rock scene, the subject is weighted, and lamps are refused unless the card is about one.
const V3 = [101, 131, 167];
const ACT_SCENE = 'dark mine background with rough rock walls and timber beams';
const UNDERGROUND = 'inside a dark underground mine, rough rock walls and wooden support beams, warm lantern light';
const OUTDOORS = 'sky, clouds, mountains, trees, forest, grass, house, window, landscape, outdoors, poster, title, caption, character sheet, model sheet, multiple views, turnaround, colour swatches, border, white background';
const FIG = 'single full body figure, whole body visible from hat to boots, standing in a mine tunnel, slightly exaggerated comic proportions, expressive pose';
const ROLE_PROMPT = {
  miner: 'a cheerful stout dwarvish miner with a bushy moustache, brass helmet with a little lamp, leather apron and rolled sleeves, pickaxe over his shoulder, sturdy boots',
  saboteur: 'a sly lanky miner with a crooked grin, black scarf over his chin and a black flat cap, sneaking on tiptoe with a small powder keg with a lit fuse under one arm',
  green: 'a determined young miner in a moss green jacket, green cap and green neckerchief, gripping a pickaxe with both hands, sturdy boots',
  blue: 'a confident young woman miner in a slate blue jacket and blue cap, long braid, shovel over her shoulder, sturdy boots',
  foreman: '(a big burly stern old man:1.3) mine foreman with grey mutton chop whiskers, brown waistcoat and bowler hat, rolled plans under one arm, pointing ahead',
  opportunist: 'a shifty grinning prospector in a patched maroon coat, many pouches and trinkets hanging from his belt, holding up a gold nugget',
  seeker: 'an eager woman geologist in a wide-brimmed hat and round spectacles, holding up a glowing teal crystal, rock hammer at her belt, satchel',
};
const SCENE = 'a small storybook vignette inside a mine, centred composition, rocky cave background with timber supports';
const V1 = {
  fixPick: { seed: 7, prompt: 'a cheerful miner fitting a new wooden handle onto a pickaxe head at a workbench' },
  fixCart: { seed: 7, prompt: 'a miner hammering a new wheel onto a wooden mine cart' },
  survey: { seed: 7, prompt: 'a miner studying a hand drawn map of tunnels unrolled on a crate by lantern light' },
  guard: { seed: 23, prompt: 'an iron-bound wooden strongbox with a heavy padlock, gold nuggets glinting, on a rocky ledge' },
  swapHands: { seed: 23, prompt: 'two miners trading leather satchels with each other, wary smiles' },
  free: { seed: 23, prompt: 'a miner hauling a rope to pull a trapped friend up out of a pit' },
};
const ACTION_PROMPT = {
  breakPick: '(a broken pickaxe snapped in two:1.4), splintered wooden handle and iron head lying apart on the rocky floor',
  breakLamp: '(a smashed brass lantern lying on its side:1.3), (broken glass shards:1.3) scattered on the rocky floor, smoke',
  breakCart: '(an overturned wooden mine cart:1.4) lying on its side next to iron rails, (a broken wheel:1.3), spilled rocks',
  fixLamp: 'a smiling miner (striking a match:1.3) to light a brass lantern held in his other hand',
  fixPickLamp: '(a pickaxe:1.3) and (a brass lantern:1.3) lying on a wooden workbench with a hammer and pliers',
  fixPickCart: '(a pickaxe:1.3) and (a wooden cart wheel:1.3) lying on a wooden workbench with a hammer and pliers',
  fixLampCart: '(a brass lantern:1.3) and (a wooden cart wheel:1.3) lying on a wooden workbench with a hammer and pliers',
  caveIn: '(a cave-in:1.4), (big boulders falling from the tunnel roof:1.3), broken timber beams, dust cloud, rubble pile',
  theft: 'a sneaky thief in a black mask and scarf (running away on tiptoe holding a sack of gold:1.3), gold coins dropping',
  inspect: 'two miners face to face, one (peering through a magnifying glass:1.3) into the face of the other, the other sweating nervously',
  swapRole: 'a miner (holding two different brass badges, one in each hand:1.3), sly wink, swapping them',
  trap: 'a miner (trapped behind iron prison bars:1.4) across a mine tunnel, gripping the bars, worried face',
};
const OTHER_PROMPT = {
  cardBack: 'ornate symmetrical card back pattern filling the whole picture, two crossed pickaxes over a brass mining lantern in a round medallion, interlaced copper and sandstone ornament on deep brown',
  roleBack: 'ornate symmetrical card back pattern filling the whole picture, a brass miner helmet with a star in a round medallion, interlaced copper and slate blue ornament on deep brown',
  goalBack: 'a heavy round wooden mine door set into a rock wall, iron bands and studs, mysterious, symmetrical, seen straight on',
  reward1: 'a single gold nugget resting on a rock, sparkling, simple centred still life',
  reward2: 'a small open leather pouch spilling a few shiny gold nuggets onto a dark rock, sparkling, centred still life',
  reward3: '(a wooden mine cart heaped high with gold nuggets:1.4) on iron rails, sparkling, centred',
};
const OTHER_V1 = { goalBack: 23, reward1: 23 };

// crystalN's short stub washed out at 0.5 (seeds 7 and 23), so it keeps more of its layout.
const STRENGTH = { crystalN: 0.4 };
const PAINTED_TUNNELS = [...Object.keys(TUNNEL), 'entrance', 'gold', 'coalL', 'coalR'];
const defOf = (k) => TUNNEL[k] ?? GOALS[k] ?? (k === 'entrance' ? ENTRANCE : null);

/** Every painted face: its job and how the build frames it. */
export const PAINTED = [
  ...PAINTED_TUNNELS.map((k) => ({ kind: k, group: 'tunnel', prompt: tunnelPrompt(defOf(k)), strength: STRENGTH[k] ?? 0.5 })),
  ...Object.keys(ROLE).map((k) => ({ kind: k, group: 'role', seeds: k === 'foreman' ? V3 : V2, prompt: `${ROLE_PROMPT[k]}, ${FIG}, ${UNDERGROUND}, ${STYLE} ### ${AVOID}, ${OUTDOORS}, cropped, close-up, portrait, headshot, cut off feet` })),
  ...Object.keys(ACTION).map((k) => V1[k]
    ? { kind: k, group: 'action', seeds: [V1[k].seed], prompt: `${V1[k].prompt}, ${SCENE}, ${STYLE} ### ${AVOID}` }
    : { kind: k, group: 'action', seeds: V3, prompt: `${ACTION_PROMPT[k]}, ${ACT_SCENE}, ${STYLE.replace(", warm lantern light", "")} ### ${AVOID}, ${OUTDOORS}${/Lamp/.test(k) ? '' : ', lantern, lamp, candle'}` }),
  ...Object.keys(OTHER_PROMPT).map((k) => ({ kind: k, group: k.startsWith('reward') ? 'reward' : 'back', seeds: OTHER_V1[k] ? [OTHER_V1[k]] : k === 'reward3' ? V3 : V2, prompt: OTHER_V1[k] ? `${OTHER_PROMPT[k]}, ${STYLE} ### ${AVOID}, people` : `${OTHER_PROMPT[k]}, ${STYLE} ### ${AVOID}, ${OUTDOORS}, people${k === 'reward3' ? ', lantern, lamp, umbrella, parasol' : ''}` })),
];

/** Seeds tried per group, and the seed picked for each kind after looking at them. */
const SEEDS = { tunnel: [7] };
const PICKS = {
  crystalN: 41, deadCross: 59, deadL: 23, ladderV: 23, deadV: 23, foreman: 131, breakLamp: 101, breakCart: 101, fixLamp: 101, fixPickLamp: 167, fixPickCart: 131, fixLampCart: 101,
  caveIn: 101, theft: 101, inspect: 167, swapRole: 101, trap: 131, reward3: 101, miner: 59, saboteur: 83, green: 41, blue: 41, opportunist: 59, seeker: 83, cardBack: 83, roleBack: 59, reward2: 41 };

// ---- Generation --------------------------------------------------------------------------------------------------

const HEAD = { apikey: '0000000000', 'Client-Agent': 'boredgames-art:1.0:anon', 'Content-Type': 'application/json' };
const wait = (ms) => new Promise((f) => setTimeout(f, ms));

async function horde({ prompt, seed, source, strength }) {
  const params = { width: GW, height: GH, steps: 28, cfg_scale: 7, sampler_name: 'k_dpmpp_2m', karras: true, seed: String(seed), n: 1 };
  const body = { prompt, params, models: ['Deliberate'], nsfw: false, censor_nsfw: true, r2: true, shared: false, slow_workers: true };
  if (source) Object.assign(params, { denoising_strength: strength }), Object.assign(body, { source_image: source, source_processing: 'img2img' });
  const r = await (await fetch('https://aihorde.net/api/v2/generate/async', { method: 'POST', headers: HEAD, body: JSON.stringify(body) })).json();
  if (!r.id) throw new Error(JSON.stringify(r));
  for (;;) {
    await wait(6000);
    const c = await (await fetch(`https://aihorde.net/api/v2/generate/check/${r.id}`, { headers: HEAD })).json();
    if (c.faulted) throw new Error('faulted');
    if (c.done) break;
  }
  const g = (await (await fetch(`https://aihorde.net/api/v2/generate/status/${r.id}`, { headers: HEAD })).json()).generations?.[0];
  if (!g || g.censored) throw new Error('no image');
  return Buffer.from(await (await fetch(g.img)).arrayBuffer());
}

async function generate(dir, only) {
  mkdirSync(dir, { recursive: true });
  for (const p of PAINTED.filter((p) => !only || only.includes(p.kind))) {
    const source = p.group === 'tunnel' ? (await sharp(Buffer.from(layout(defOf(p.kind)))).webp({ quality: 95 }).toBuffer()).toString('base64') : undefined;
    for (const seed of PICKS[p.kind] ? [PICKS[p.kind]] : p.seeds ?? SEEDS[p.group]) {
      const out = join(dir, `${p.kind}-${seed}.webp`);
      if (existsSync(out)) continue;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          writeFileSync(out, await horde({ ...p, seed, source }));
          console.log('saved', out);
          break;
        } catch (e) {
          console.log(p.kind, seed, 'failed', String(e).slice(0, 200));
          await wait(5000);
        }
      }
    }
  }
}

// ---- Build -------------------------------------------------------------------------------------------------------

/** The card at 2x its 120 by 180 tabletop size: sharp in the hand fan and on a zoomed board. */
const W = 240;
const H = 360;
const BAND = { break: '#a8432c', fix: '#3f7a74', survey: '#8a6a2c', caveIn: '#5a4a3e', expanded: '#6a3d63' };
const ROLE_TINT = { miner: '#e0ac3c', saboteur: '#a8432c', green: '#4c8a3e', blue: '#3c679c', foreman: '#8a7a5a', opportunist: '#7a3c2c', seeker: '#3f7a74' };
const TOOL_FILE = { pick: 'toolPick', lamp: 'toolLamp', cart: 'toolCart' };
const bandOf = (k) => (k.startsWith('break') ? BAND.break : k.startsWith('fix') ? BAND.fix : BAND[k] ?? BAND.expanded);

/** Mean brightness of a box of a raw greyscale image. */
function lum(px, w, x0, y0, bw, bh) {
  let s = 0;
  for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) s += px[y * w + x];
  return s / (bw * bh);
}

/**
 * MS-ART2: which edges of a painted tunnel read as open. Just inside each edge, the midpoint (where a tunnel meets
 * its neighbour) is compared with the rock either side of it along the same edge: a tunnel floor is clearly brighter.
 */
export async function openings(input) {
  const { data, info } = await sharp(input).resize(W, H).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, d = 3, len = 30, deep = 6, off = 85;
  const box = (e, shift) =>
    e === 'N' ? [W / 2 - len / 2 + shift, d, len, deep] : e === 'S' ? [W / 2 - len / 2 + shift, H - d - deep, len, deep] : e === 'W' ? [d, H / 2 - len / 2 + shift, deep, len] : [W - d - deep, H / 2 - len / 2 + shift, deep, len];
  const lift = Object.fromEntries(['N', 'E', 'S', 'W'].map((e) => [e, lum(data, w, ...box(e, 0)) - (lum(data, w, ...box(e, -off)) + lum(data, w, ...box(e, off))) / 2]));
  return { lift, open: Object.keys(lift).filter((e) => lift[e] > 35).sort() };
}

const roundMask = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="14" fill="#fff"/></svg>`);
const border = (extra = '') => Buffer.from(`<svg width="${W}" height="${H}">${extra}<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12.5" fill="none" stroke="#1a120c" stroke-width="4"/></svg>`);

/** A cream chip holding a tool badge, so an action's tool shows by shape as well as by the band's colour. */
async function chips(kind) {
  const tools = ACTION[kind]?.tools;
  if (!tools) return [];
  const file = (t) => `public/art/mines/${TOOL_FILE[t]}${kind.startsWith('break') ? 'Broken' : ''}.svg`;
  return Promise.all(tools.map(async (t, i) => ({ input: await sharp(file(t), { density: 96 }).resize(46, 46).png().toBuffer(), left: W - 56 - i * 50, top: 34 })));
}

function overlay(p) {
  if (p.group === 'action') return `<rect width="${W}" height="30" fill="${bandOf(p.kind)}"/><rect y="30" width="${W}" height="3" fill="#1a120c" opacity=".5"/><rect y="${H - 16}" width="${W}" height="16" fill="${bandOf(p.kind)}"/>`;
  if (p.group === 'role') return `<rect y="${H - 14}" width="${W}" height="14" fill="${ROLE_TINT[p.kind]}"/><rect y="${H - 16}" width="${W}" height="2" fill="#1a120c" opacity=".5"/>`;
  if (p.group === 'reward') {
    const v = Number(p.kind.slice(6));
    return `<rect y="${H - 44}" width="${W}" height="44" fill="#2e2219" opacity=".85"/>` + Array.from({ length: v }, (_, i) => `<circle cx="${W / 2 - (v - 1) * 18 + i * 36}" cy="${H - 22}" r="12" fill="#e0ac3c" stroke="#5c3d0c" stroke-width="3"/>`).join('');
  }
  if (p.group === 'back') return `<rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="8" fill="none" stroke="#e0ac3c" stroke-width="3" opacity=".7"/>`;
  return '';
}

const rulesetsOf = (k) => {
  if (ROLE[k]) return ROLE[k].rulesets;
  if (['entrance', 'gold', 'coalL', 'coalR', 'goalBack', 'cardBack'].includes(k)) return ['classic', 'expanded', 'duel'];
  if (k === 'roleBack' || k.startsWith('reward')) return k === 'roleBack' ? ['classic', 'expanded'] : ['classic'];
  const inClassic = CLASSIC_DECK.some(([c]) => c === k);
  return inClassic ? ['classic', 'expanded', 'duel'] : ['expanded'];
};

async function build(dir) {
  const out = 'public/art/mines';
  const manifest = [];
  const wrong = [];
  for (const p of PAINTED) {
    const seed = PICKS[p.kind] ?? (p.seeds ?? SEEDS[p.group])[0];
    const src = join(dir, `${p.kind}-${seed}.webp`);
    const art = await sharp(src).resize(W, H, { fit: 'cover' }).toBuffer();
    const file = join(out, `${p.kind}.webp`);
    await sharp(art)
      .composite([{ input: border(overlay(p)) }, ...(await chips(p.kind)), { input: roundMask, blend: 'dest-in' }])
      .webp({ quality: 82, alphaQuality: 60, effort: 6 })
      .toFile(file);
    // Measure the framed file that ships, as MS-ART2 does: the border alone can tip a faint opening.
    if (p.group === 'tunnel') {
      const want = [...new Set(defOf(p.kind).links.flat())].sort();
      const { open } = await openings(file);
      if (open.join() !== want.join()) wrong.push(`${p.kind}: painted ${open.join('') || 'none'}, links say ${want.join('')}`);
    }
    manifest.push({
      asset: `mines/${p.kind}`, card: p.kind, category: p.group, rulesets: rulesetsOf(p.kind), file: `/art/mines/${p.kind}.webp`, width: W, height: H,
      variant: `seed ${seed}`, source: p.group === 'tunnel' ? `AI Horde, Deliberate, img2img from the card's link layout at strength ${p.strength}` : 'AI Horde, Deliberate, text prompt only',
      fallback: 'none: MS-ART1 fails the build if the file is missing',
    });
  }
  writeFileSync('data/mines-art-manifest.json', `${JSON.stringify(manifest, null, 1)}\n`);
  console.log(`Wrote ${manifest.length} painted faces.`);
  if (wrong.length) {
    console.error(`MS-ART2: openings disagree with the links:\n${wrong.join('\n')}`);
    process.exit(1);
  }
}

const [cmd, dir, only] = process.argv.slice(2);
if (!import.meta.main) {
  // Imported for openings(); no command to run.
} else if (cmd === 'build' && dir) await build(dir);
else if (cmd === 'layout') {
  // Writes every layout as PNG, for checking them by eye.
  mkdirSync(dir, { recursive: true });
  for (const k of PAINTED_TUNNELS) await sharp(Buffer.from(layout(defOf(k)))).png().toFile(join(dir, `${k}.png`));
} else if (cmd === 'generate' && dir) await generate(dir, only?.split(','));
else {
  console.error('usage: node scripts/art/mines-paint.mjs generate|build|layout <workdir> [kinds]');
  process.exit(1);
}
