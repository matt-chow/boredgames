// Sealed Correspondence art: portraits, card back, favor seal and cover.
//
//   node scripts/art/sealed.mjs generate <workdir>   queue every prompt below on AI Horde, one at a time, skipping files
//                                                    already in <workdir> (the anonymous tier refuses parallel jobs)
//   node scripts/art/sealed.mjs build <workdir>      crop, resize and encode the picked seeds into public/art/sealed
//
// Images are generated with the Deliberate checkpoint (CreativeML OpenRAIL-M) on AI Horde's free anonymous tier, at a
// size the anonymous tier accepts. No reference images, artist names or third-party pictures are used. See
// docs/ASSETS.md for licensing and docs/ART_BIBLE.md for the look.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const STYLE = 'storybook illustration, renaissance court portrait, gouache and ink, muted ivory burgundy brass and charcoal palette, warm candlelight, fine linework, painterly, half-length portrait, dark plain backdrop';
const AVOID = 'text, letters, watermark, signature, frame, border, blurry, deformed hands, extra fingers, extra limbs, modern clothing, photo, glasses, nsfw, nude';

const PORTRAITS = {
  heir: 'portrait of a young noble heir, a young woman in a burgundy velvet gown with a thin gold circlet, holding a sealed letter to her chest, poised and wary',
  dowager: 'portrait of an elderly dowager noblewoman in black velvet and pearls with a lace veil, shrewd knowing expression, holding a folded fan',
  ambassador: 'portrait of a middle-aged ambassador with a trimmed beard in a dark doublet with brass buttons and a gold chain of office, offering a folded letter',
  archivist: 'portrait of a stern middle-aged woman archivist in grey robes, holding a leather ledger and a ring of iron keys, shelves of scrolls behind',
  magistrate: 'portrait of a stern magistrate in crimson robes and a black velvet cap, holding a tall staff of office, judging gaze',
  confessor: 'portrait of a gentle hooded confessor monk in a brown habit holding a lit candle and a rosary, serene, eyes lowered',
  duelist: 'portrait of a confident young duelist in a slashed-sleeve doublet, rapier held upright before his face, faint smile',
  scribe: 'portrait of an elderly court scribe with a white beard writing with a quill, parchment scrolls, ink pot',
  censor: 'portrait of a sharp-eyed court censor in black robes, holding a quill and striking lines through a letter, a red wax seal stamp on the desk',
  informant: 'portrait of an informant in a dark hooded cloak half hidden behind a heavy curtain, face half in shadow, holding a tiny folded note',
};
const OTHER = {
  back: { w: 448, h: 640, prompt: 'ornate symmetrical playing card back design, deep burgundy field with fine brass gold filigree scrollwork border, central red wax seal medallion, flat ornamental pattern, renaissance, gouache', avoid: 'text, letters, watermark, signature, people, face, blurry, photo' },
  seal: { w: 512, h: 512, prompt: 'a single round red wax seal with an embossed crown and laurel crest, top-down view, centered, on plain ivory parchment, gouache illustration, clean, isolated', avoid: 'text, letters, watermark, signature, people, blurry, photo, multiple seals' },
  cover: { w: 448, h: 640, prompt: 'a letter sealed with red wax lying on a writing desk beside a candle, a quill and a gold signet ring, a velvet curtain behind, storybook illustration, renaissance, gouache and ink, muted ivory burgundy brass and charcoal palette, warm candlelight, painterly', avoid: 'text, letters, writing, watermark, signature, people, blurry, photo' },
};
const SEEDS = [11, 29];

/** The seed chosen for each file after looking at both. */
const PICKS = { heir: 11, dowager: 29, ambassador: 11, archivist: 11, magistrate: 29, confessor: 11, duelist: 29, scribe: 11, censor: 11, informant: 29, back: 1, seal: 1, cover: 1 };

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
  const out = 'public/art/sealed';
  mkdirSync(out, { recursive: true });
  for (const [k, seed] of Object.entries(PICKS)) {
    const src = join(dir, `${k}-${seed}.webp`);
    // Portraits lose a thin bottom strip, where the model sometimes scrawls a mock signature; the card's name plate
    // covers that part anyway.
    const img = sharp(src);
    const { width, height } = await img.metadata();
    const square = k === 'seal';
    const crop = square ? { left: Math.round(width * 0.15), top: Math.round(height * 0.15), width: Math.round(width * 0.7), height: Math.round(height * 0.7) } : { left: 0, top: 0, width, height: Math.round(height * 0.94) };
    const size = k === 'cover' ? { width: 600, height: 840 } : square ? { width: 128, height: 128 } : { width: 360, height: 504 };
    const file = k === 'cover' ? 'public/art/covers/sealed.webp' : join(out, `${k}.webp`);
    let pipe = sharp(src).extract(crop).resize({ ...size, fit: 'cover', position: square ? 'centre' : 'top' });
    // The seal is cut to a circle so it sits on any ground.
    if (square) pipe = sharp(await pipe.png().toBuffer()).composite([{ input: Buffer.from('<svg width="128" height="128"><circle cx="64" cy="64" r="62"/></svg>'), blend: 'dest-in' }]);
    await pipe.webp({ quality: 80 }).toFile(file);
    console.log('wrote', file);
  }
}

const [cmd, dir] = process.argv.slice(2);
if (!dir || !['generate', 'build'].includes(cmd)) {
  console.error('usage: node scripts/art/sealed.mjs generate|build <workdir>');
  process.exit(1);
}
await (cmd === 'generate' ? generate(dir) : build(dir));
