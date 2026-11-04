import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflare } from '@cloudflare/vite-plugin';

const noBench = fileURLToPath(new URL('./src/games/deckbench/off.ts', import.meta.url));

export default defineConfig(({ command, mode }) => ({
  plugins: [svelte(), cloudflare()],
  // The deck bench exists only on a dev server started with --mode bench, never in a build.
  define: { __DECK_BENCH__: JSON.stringify(command === 'serve' && mode === 'bench') },
  // The flag removes the bench's branches; its module has top-level calls, so it must be swapped out to leave too.
  resolve: { alias: command === 'build' ? [{ find: './deckbench', replacement: noBench }] : [] },
  build: { target: 'es2022', cssMinify: true },
}));
