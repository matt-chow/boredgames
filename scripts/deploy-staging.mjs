// Builds and deploys the staging Worker. Staging must be selected at build time: the Cloudflare Vite plugin writes the
// chosen environment into the build, and `wrangler deploy` then publishes that. Stops if the build isn't staging's.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const env = { ...process.env, CLOUDFLARE_ENV: 'staging' };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('npm run build');
const pointer = JSON.parse(readFileSync('.wrangler/deploy/config.json', 'utf8'));
const built = JSON.parse(readFileSync(new URL(pointer.configPath, new URL('../.wrangler/deploy/', import.meta.url)), 'utf8'));
if (built.name !== 'boredgames-staging') throw new Error(`Refusing to deploy: the build is for "${built.name}", not staging.`);
run('npx wrangler deploy');
