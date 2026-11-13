// Palazzo art: five engraved role portraits, the card back and the cover.
//
//   node scripts/art/palazzo.mjs generate <workdir>  queue every prompt below on AI Horde, one at a time, skipping files
//                                                    already in <workdir> (the anonymous tier refuses parallel jobs)
//   node scripts/art/palazzo.mjs build <workdir>     crop, resize and encode the picked seeds into public/art/palazzo
//
// Images are generated with the Deliberate checkpoint (CreativeML OpenRAIL-M) on AI Horde's free anonymous tier. No
// reference images, artist names or third-party pictures are used. See docs/ASSETS.md for licensing.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const STYLE = 'antique copperplate engraving, fine crosshatching and stipple, sepia ink on cream paper, renaissance italian court portrait, half-length, plain hatched backdrop, highly detailed linework';
const AVOID = 'text, letters, watermark, signature, frame, border, blurry, deformed hands, extra fingers, extra limbs, modern clothing, photo, color, glasses, nsfw, nude';

const PORTRAITS = {
  chancellor: 'portrait of a portly elderly chancellor in a fur-trimmed robe with a heavy chain of office, one hand resting on a stack of coins and a ledger, self-assured',
  magistrate: 'portrait of a severe middle-aged woman magistrate in dark robes and a flat cap, holding a rolled decree with a hanging wax seal, unforgiving gaze',
  bravo: 'portrait of a lean scarred hired swordsman in a slashed doublet and a wide-brimmed hat, a dagger half drawn from his belt, sly menacing grin',
  envoy: 'portrait of a young courteous envoy in a travelling cloak with a satchel of letters, offering a folded letter with a slight bow, discreet smile',
  sentinel: 'portrait of a vigilant palace guard captain in a breastplate and morion helmet, holding a halberd and a lantern, watchful eyes',
};
const OTHER = {
  back: { w: 448, h: 640, prompt: 'ornate symmetrical playing card back, antique copperplate engraving, central italian palazzo facade medallion with arches and a tower, fine crosshatched scrollwork border, sepia ink on cream paper, flat ornamental pattern', avoid: 'text, letters, watermark, signature, people, face, blurry, photo, color' },
  cover: { w: 448, h: 640, prompt: 'an italian renaissance palazzo courtyard at dusk with arcades and a tall tower, a masked figure in a cloak in the foreground, scattered gold coins on stone steps, antique copperplate engraving, fine crosshatching, sepia ink on cream paper', avoid: 'text, letters, watermark, signature, blurry, photo, modern' },
};
const SEEDS = [11, 29];

/** The seed chosen for each file after looking at both. */
const PICKS = { chancellor: 29, magistrate: 11, bravo: 11, envoy: 11, sentinel: 11, back: 1, cover: 1 };

const jobs = [
  ...Object.entries(PORTRAITS).flatMap(([k, p]) => SEEDS.map((seed) => ({ out: `${k}-${seed}.webp`, seed, w: 448, h: 640, prompt: `${p}, ${STYLE} ### ${AVOID}` }))),
  ...Object.entries(OTHER).flatMap(([k, o]) => [1, 2].map((seed) => ({ out: `${k}-${seed}.webp`, seed, w: o.w, h: o.h, prompt: `${o.prompt} ### ${o.avoid}` }))),
];

const HEAD = { apikey: '0000000000', 'Client-Agent': 'boredgames-art:1.0:anon', 'Content-Type': 'application/json' };
const wait = (ms) => new Promise((f) => setTimeout(f, ms));

async function horde({ prompt, seed, w, h }) {
  const body = { prompt, params: { width: w, height: h, steps: 24, cfg_scale: 6, sampler_name: 'k_dpmpp_2m', karras: true, seed: String(seed), n: 1 }, models: ['Deliberate'], nsfw: false, censor_nsfw: true, r2: true, shared: false, slow_workers: true };
  const r = await (await fetch('https://aihorde.net/api/v2/generate/async', { method: 'POST', headers: HEAD, body: JSON.stringify(body) })).json();
  if (!r.id) throw new Error(JSON.stringify(r));
  for (;;) {
    await wait(8000);
    const c = await (await fetch(`https://aihorde.net/api/v2/generate/check/${r.id}`, { headers: HEAD })).json();
    if (c.faulted) throw new Error('faulted');
    if (c.done) break;
  }
  const g = (await (await fetch(`https://aihorde.net/api/v2/generate/status/${r.id}`, { headers: HEAD })).json()).generations?.[0];
  if (!g || g.censored) throw new Error('no image');
  return Buffer.from(await (await fetch(g.img)).arrayBuffer());
}

async function generate(dir) {
  mkdirSync(dir, { recursive: true });
  for (const j of jobs) {
    if (existsSync(join(dir, j.out))) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        writeFileSync(join(dir, j.out), await horde(j));
        console.log('saved', j.out);
        break;
      } catch (e) {
        console.log(j.out, 'failed', String(e).slice(0, 200));
        await wait(5000);
      }
    }
  }
}

async function build(dir) {
  const out = 'public/art/palazzo';
  mkdirSync(out, { recursive: true });
  for (const [k, seed] of Object.entries(PICKS)) {
    const src = join(dir, `${k}-${seed}.webp`);
    // Portraits lose a thin bottom strip, where the model sometimes scrawls a mock signature; the card's name plate
    // covers that part anyway.
    const { width, height } = await sharp(src).metadata();
    const size = k === 'cover' ? { width: 600, height: 840 } : { width: 360, height: 504 };
    const file = k === 'cover' ? 'public/art/covers/palazzo.webp' : join(out, `${k}.webp`);
    const pipe = sharp(src).extract({ left: 0, top: 0, width, height: Math.round(height * 0.94) }).resize({ ...size, fit: 'cover', position: 'top' });
    await pipe.webp({ quality: 80 }).toFile(file);
    console.log('wrote', file);
  }
}

const [cmd, dir] = process.argv.slice(2);
if (!dir || !['generate', 'build'].includes(cmd)) {
  console.error('usage: node scripts/art/palazzo.mjs generate|build <workdir>');
  process.exit(1);
}
await (cmd === 'generate' ? generate(dir) : build(dir));
