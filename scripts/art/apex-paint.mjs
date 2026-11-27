// Apex ’66 painted artwork (docs/APEX_ART_BIBLE.md).
//
//   node scripts/art/apex-paint.mjs generate <id|family,...> [--ref id,...] [--n 4]
//       Paint each asset with Codex's built-in image tool (`codex exec`, the user's ChatGPT plan; no API key, no
//       billing). Raw PNGs land in .art/apex/raw/<id>.vN.png; the newest attempt becomes the pick. --ref attaches
//       accepted pictures as style references.
//   node scripts/art/apex-paint.mjs sheet <out.png> <id|family,...>      contact sheet of the current picks
//   node scripts/art/apex-paint.mjs status <accepted|rejected> <id,...> [note]
//   node scripts/art/apex-paint.mjs build                                encode accepted picks into public/art/apex
//
// Every prompt is MASTER + the family template + the subject line from apex-subjects.mjs + AVOID, and the manifest
// (data/apex-art-manifest.json) keeps the prompt, references, raw file and status of every attempt.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { CARDS, MISC, PADDOCK, PARTS, POSTERS, PROPS } from './apex-subjects.mjs';

export const MASTER =
  'A mid-century geometric motorsport illustration in the style of a 1966 screenprinted racing poster and period automotive advertising. ' +
  'Bold simplified silhouettes, moderate recognisable mechanical detail, flat colour shapes with two or three tonal shading steps, ' +
  'restrained thin charcoal outlines used sparingly, subtle printed ink grain with slight screenprint texture, generous negative space, ' +
  'light from the upper left. Palette: ivory #EDE3CB, red #B43D32, deep green #254C3D, ochre #D0A34B, petrol blue #486E8A, charcoal #292D2B, ' +
  'with occasional terracotta #BD7858, sage #94A58A and mist #B9C2BF; three to five dominant colours.';
export const AVOID =
  'Avoid: any text, letters, numbers, logos, brand names, watermarks, signatures, frames or borders; photorealism, 3D render, glossy ' +
  'reflections, airbrushed gradients, modern cars or modern aerodynamics, sponsor decals, exaggerated cartoon proportions, heavy grunge, clip art, neon colours.';

const KEY = 'isolated on a perfectly flat, uniform pure magenta #FF00FF background that touches every edge, with no ground plane, no cast shadow on the background and no magenta anywhere on the subject';

/** Family: prompt template, aspect hint, and how `build` encodes it. */
export const FAMILIES = {
  card: { aspect: 'landscape 4:3', frame: (s) => `Card illustration, a single edge-to-edge scene: ${s}. Horizon low, the car small to medium in frame, calm ivory or sky areas around it.`, out: { w: 480, h: 360 } },
  part: { aspect: 'square 1:1', frame: (s) => `Parts-catalogue illustration of one isolated period racing-car component: ${s}. Three-quarter view from slightly above, lit from the upper left, the object centred and filling about two thirds of the frame, on a plain flat ivory #EDE3CB background with a small flat charcoal shadow beneath it, nothing else in frame.`, out: { w: 320, h: 320 } },
  paddock: { aspect: 'square 1:1', frame: (s) => `Square spot illustration, one compact scene filling the frame edge to edge: ${s}.`, out: { w: 320, h: 320 } },
  poster: { aspect: 'portrait 2:3', frame: (s) => `Circuit poster artwork with no text. Fixed composition: the top quarter is calm open sky left empty for a title; a regional landmark silhouette on the horizon at the upper third; the circuit's signature bend sweeps diagonally from the lower left to the centre right; one open-wheel 1960s racing car leans into the bend in the lower third. Region: ${s}.`, out: { w: 600, h: 900 } },
  prop: { aspect: 'square 1:1', frame: (s) => `A single tabletop miniature model of ${s}, seen from a high three-quarter top-down angle of about 55 degrees, lit from the upper left, compact and chunky like a painted scale model, ${KEY}.`, out: { max: 256 }, alpha: true },
  car: { aspect: 'landscape 2:1', frame: (s) => `${s}, ${KEY}.`, out: { w: 240, h: 112 }, alpha: true },
  misc: { aspect: 'portrait 5:7', frame: (s) => `${s}.`, out: { w: 600, h: 840 } },
};

const CAR = 'A top-down overhead view, exactly from above, of one 1966 cigar-bodied open-wheel racing car, nose pointing right, plain unmarked ivory-white body with no stripes or numbers, open cockpit with a small wraparound windscreen, exposed rear engine with exhaust pipes, charcoal tyres, subtle dimensional shading';

/** Every asset: id → family and subject. */
export function catalogue() {
  const out = {};
  for (const [k, s] of Object.entries(CARDS)) out[`card.${k}`] = { family: k === 'back' ? 'misc' : 'card', subject: s };
  for (const [k, s] of Object.entries(PARTS)) out[`part.${k}`] = { family: 'part', subject: s };
  for (const [k, s] of Object.entries(PADDOCK)) out[k] = { family: 'paddock', subject: s };
  for (const [k, p] of Object.entries(POSTERS)) out[`poster.${k}`] = { family: 'poster', subject: `${p.subject}; regional colours: ${p.accent}` };
  for (const [k, s] of Object.entries(PROPS)) out[`prop.${k}`] = { family: 'prop', subject: s };
  out.car = { family: 'car', subject: CAR };
  for (const [k, s] of Object.entries(MISC)) out[`misc.${k}`] = { family: k === 'table' ? 'paddock' : 'misc', subject: s };
  return out;
}

export const promptFor = (id) => {
  const a = catalogue()[id];
  const f = FAMILIES[a.family];
  return `${MASTER}\n\n${f.frame(a.subject)} Format: ${f.aspect}.\n\n${AVOID}`;
};

const WORK = '.art/apex';
const RAW = join(WORK, 'raw');
const MANIFEST = 'data/apex-art-manifest.json';
const GEN = join(homedir(), '.codex', 'generated_images');

const load = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {});
const save = (m) => writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b))), null, 1)}\n`);

function expand(list) {
  const all = catalogue();
  return list.split(',').flatMap((x) => (all[x] ? [x] : Object.keys(all).filter((id) => all[id].family === x || id.startsWith(`${x}.`))));
}

const pngsSince = (t) =>
  existsSync(GEN)
    ? readdirSync(GEN).flatMap((d) => {
        const dir = join(GEN, d);
        if (!statSync(dir).isDirectory() || statSync(dir).mtimeMs < t - 1000) return [];
        return readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => join(dir, f)).filter((f) => statSync(f).mtimeMs >= t);
      }).sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    : [];

/** One Codex session paints a batch in order; pictures are matched to ids by the order they were saved. */
function paint(ids, refs) {
  const t = Date.now();
  const refNote = refs.length
    ? `The attached image(s) are the locked style references for this game. Match their illustration style, palette, grain, outline weight, shading and level of detail exactly; take only the style from them, never their subject.\n\n`
    : '';
  const prompt =
    `You are producing illustrations for a board game. Use your built-in image generation tool once per item below, in this order, ` +
    `one separate image per item. Use each prompt exactly as given. Do not run shell commands and do not write files. ` +
    `After each image, print one line: DONE <item id>.\n\n${refNote}` +
    ids.map((id) => `ITEM ${id}\n${promptFor(id)}`).join('\n\n');
  const args = ['exec', '-s', 'read-only', '--skip-git-repo-check', ...refs.flatMap((r) => ['-i', r]), '-'];
  const res = spawnSync('codex', args, { input: prompt, encoding: 'utf8', timeout: 25 * 60_000, maxBuffer: 64 << 20, shell: process.platform === 'win32' });
  const done = [...(res.stdout ?? '').matchAll(/^DONE (\S+)/gm)].map((m) => m[1]);
  const files = pngsSince(t);
  if (files.length !== ids.length) {
    console.error(`Expected ${ids.length} pictures, got ${files.length}. Codex said: ${(res.stdout ?? '').slice(-600)} ${(res.stderr ?? '').slice(-300)}`);
    return [];
  }
  if (done.length && done.join() !== ids.join()) console.warn(`Codex reported ${done.join()}; matching by order.`);
  return ids.map((id, i) => [id, files[i]]);
}

function generate(list, refIds, n) {
  mkdirSync(RAW, { recursive: true });
  const m = load();
  const refs = refIds.map((id) => {
    const p = m[id]?.pick;
    if (!p) throw new Error(`Reference ${id} has no pick`);
    return p;
  });
  // A family or prefix skips pictures already accepted; naming an id repaints it.
  const ids = expand(list).filter((id) => list.split(',').includes(id) || m[id]?.status !== 'accepted');
  for (let i = 0; i < ids.length; i += n) {
    const batch = ids.slice(i, i + n);
    console.log(`Painting ${batch.join(', ')}…`);
    for (const [id, src] of paint(batch, refs)) {
      const e = (m[id] ??= { family: catalogue()[id].family, attempts: [] });
      const file = join(RAW, `${id}.v${e.attempts.length + 1}.png`).replaceAll('\\', '/');
      copyFileSync(src, file);
      e.attempts.push({ file, refs: refIds, prompt: promptFor(id), at: new Date().toISOString(), status: 'pending' });
      e.pick = file;
      e.status = 'pending';
      console.log(`  ${id} → ${file}`);
    }
    save(m);
  }
}

/** Magenta key: alpha from the distance to #FF00FF, with the magenta spill pulled out of the edge pixels. */
async function keyed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const mag = Math.min(r, b) - g; // how magenta the pixel is
    const a = mag > 150 ? 0 : mag > 60 ? Math.round(255 * (150 - mag) / 90) : 255;
    if (a < 255 && a > 0) {
      const spill = Math.min(r, b) - g;
      data[i] = Math.max(0, r - spill * 0.6);
      data[i + 2] = Math.max(0, b - spill * 0.6);
    }
    data[i + 3] = a;
  }
  return sharp(data, { raw: info }).trim({ threshold: 1 }).png();
}

/** Recolour the canonical car's light body to a livery colour, keeping its shading (tyres and metal stay). */
async function recolour(png, hex) {
  const { data, info } = await png.raw().toBuffer({ resolveWithObject: true });
  const t = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // Body paint: warm light ivory and its shading; chrome and tyres are cooler or darker. A soft mask keeps the
    // print grain from breaking the livery into speckles.
    if (data[i + 3] === 0 || r < b) continue;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const w = clamp((0.56 - (mx - mn) / mx) / 0.12) * clamp((mx - 95) / 50);
    if (!w) continue;
    const l = Math.min(1.12, (0.3 * r + 0.59 * g + 0.11 * b) / 215);
    for (let k = 0; k < 3; k++) data[i + k] = Math.round(data[i + k] * (1 - w) + Math.min(255, t[k] * l) * w);
  }
  return sharp(data, { raw: info }).png();
}

async function build() {
  const m = load();
  const all = catalogue();
  const out = 'public/art/apex';
  mkdirSync(out, { recursive: true });
  const shipped = {};
  for (const [id, e] of Object.entries(m)) {
    if (e.status !== 'accepted' || !all[id]) continue;
    const f = FAMILIES[all[id].family];
    const name = `${id.replaceAll('.', '-')}.webp`;
    if (id === 'car') {
      // The livery body colours, read from the UI's own table so the two never disagree.
      const bodies = [...readFileSync('src/games/apex/ui/assets.ts', 'utf8').matchAll(/body: '(#[0-9a-f]{6})'/g)].map((x) => x[1]);
      const base = await (await keyed(e.pick)).resize(f.out.w, f.out.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      for (const [i, body] of bodies.entries()) {
        await (await recolour(sharp(base), body)).webp({ quality: 86, alphaQuality: 90 }).toFile(join(out, `car-${i}.webp`));
        shipped[`car.${i}`] = `/art/apex/car-${i}.webp`;
      }
      continue;
    }
    let img = f.alpha ? await keyed(e.pick) : sharp(e.pick);
    img = f.out.max ? img.resize(f.out.max, f.out.max, { fit: 'inside' }) : img.resize(f.out.w, f.out.h, { fit: 'cover', position: 'attention' });
    const info = await img.webp({ quality: 80, alphaQuality: 90 }).toFile(join(out, name));
    shipped[id] = `/art/apex/${name}`;
    e.size = [info.width, info.height];
    e.bytes = info.size;
  }
  save(m);
  writeFileSync(
    'src/games/apex/ui/painted.ts',
    `// Written by \`node scripts/art/apex-paint.mjs build\` from the accepted paintings. Do not edit by hand.\nexport const PAINTED: Record<string, string> = ${JSON.stringify(shipped, null, 1)};\n`,
  );
  console.log(`Shipped ${Object.keys(shipped).length} paintings.`);
}

async function sheet(outFile, list) {
  const m = load();
  const ids = expand(list).filter((id) => m[id]?.pick);
  const cell = 300, cols = Math.min(6, ids.length), rows = Math.ceil(ids.length / cols);
  const tiles = await Promise.all(
    ids.map(async (id, i) => ({
      input: await sharp(m[id].pick).flatten({ background: '#777' }).resize(cell - 8, cell - 28, { fit: 'contain', background: '#777' }).png().toBuffer(),
      left: (i % cols) * cell + 4,
      top: Math.floor(i / cols) * cell + 24,
    })),
  );
  const labels = ids.map((id, i) => `<text x="${(i % cols) * cell + 6}" y="${Math.floor(i / cols) * cell + 17}" font-family="sans-serif" font-size="14">${id} [${m[id].status}]</text>`).join('');
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}">${labels}</svg>`);
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#e8e8e8' } }).composite([...tiles, { input: svg, left: 0, top: 0 }]).png().toFile(outFile);
  console.log(`${ids.length} on ${outFile}`);
}

const [cmd, ...rest] = process.argv.slice(2);
const flag = (k, d) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : d);
if (cmd === 'generate') generate(rest[0], (flag('--ref', '') || '').split(',').filter(Boolean), Number(flag('--n', 4)));
else if (cmd === 'sheet') await sheet(rest[0], rest[1]);
else if (cmd === 'status') {
  const m = load();
  for (const id of expand(rest[1])) {
    const e = m[id];
    e.status = rest[0];
    const a = e.attempts.find((x) => x.file === e.pick);
    a.status = rest[0];
    if (rest[2]) a.note = rest[2];
  }
  save(m);
} else if (cmd === 'build') await build();
else console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(0, 12).join('\n'));
