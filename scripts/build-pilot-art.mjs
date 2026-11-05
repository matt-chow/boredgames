/** Writes the pilot illustrations to public/cards/<card key>.svg. Run: node scripts/build-pilot-art.mjs */
import { mkdirSync, writeFileSync } from 'node:fs';
import { svg } from './art/kit.mjs';
import { PILOT } from './art/pilot.mjs';

mkdirSync('public/cards', { recursive: true });
for (const [key, [name, draw]] of Object.entries(PILOT)) {
  const file = svg(name, draw());
  writeFileSync(`public/cards/${key}.svg`, file);
  console.log(`${key}: ${(file.length / 1024).toFixed(1)} KB`);
}
