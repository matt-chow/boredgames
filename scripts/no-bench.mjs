// Fails the build if any part of the deck test bench reached the bundles. Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MARKERS = ['hit-discard', 'Deck bench', 'trash-up-to-2'];
const found = [];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) walk(path);
    else {
      const text = readFileSync(path, 'latin1');
      for (const m of MARKERS) if (text.includes(m)) found.push(`${path}: contains "${m}"`);
    }
  }
}

walk('dist');
if (found.length) {
  console.error(`The deck bench leaked into the build:\n  ${found.join('\n  ')}`);
  process.exit(1);
}
console.log('no-bench: the build contains nothing of the deck bench.');
