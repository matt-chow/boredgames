import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DECK_BENCH__: 'false' },
  test: { include: ['scripts/bot-*.test.ts'], environment: 'node', testTimeout: 6 * 3_600_000 },
});
