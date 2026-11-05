/** Writes the catalogue's illustrations to public/cards/<card key>.svg. Run: node scripts/build-card-art.mjs [key ...] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { COURT } from './art/court.mjs';
import { svg } from './art/kit.mjs';
import { PILOT } from './art/pilot.mjs';
import { PROJECTS, TREASURY } from './art/treasury.mjs';
import { TOWN } from './art/town.mjs';
import { WORK } from './art/work.mjs';

const only = new Set(process.argv.slice(2));
const ALL = { ...TREASURY, ...PROJECTS, ...WORK, ...TOWN, ...COURT };
mkdirSync('public/cards', { recursive: true });
for (const [key, [name, draw]] of Object.entries(ALL)) {
  if (PILOT[key]) throw new Error(`${key} is an approved pilot: do not redraw it`);
  if (only.size && !only.has(key)) continue;
  const file = svg(name, draw());
  writeFileSync(`public/cards/${key}.svg`, file);
  if (file.length > 48 * 1024) console.log(`OVER BUDGET ${key}: ${(file.length / 1024).toFixed(1)} KB`);
}
