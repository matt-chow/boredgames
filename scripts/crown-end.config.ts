import { defineConfig } from 'vitest/config';

// `npm run experiment:crown-end` plays seeded bot games on copies of the rules. It's a report, not a test, so it isn't in `npm test`.
export default defineConfig({
  define: { __DECK_BENCH__: 'false' },
  test: { include: ['scripts/crown-end-experiment.test.ts'], environment: 'node', testTimeout: 3_600_000 },
});
