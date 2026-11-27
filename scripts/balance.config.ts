import { defineConfig } from 'vitest/config';

// `npm run balance` plays thousands of seeded bot games. It's a report, not a test, so it isn't in `npm test`.
export default defineConfig({
  define: { __DECK_BENCH__: 'false', __DEAD_DROP__: 'true' },
  test: { include: ['scripts/clockwork-balance.test.ts', 'scripts/expansion5-balance.test.ts', 'scripts/apex-balance.test.ts'], environment: 'node', testTimeout: 3_600_000 },
});
