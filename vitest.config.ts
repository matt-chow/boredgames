import { defineConfig } from 'vitest/config';

// Unit tests run in plain Node: the rules engine and room core are platform-independent.
export default defineConfig({
  // The deck bench is hosted only on a bench dev server; see src/shared/bench.d.ts.
  define: { __DECK_BENCH__: 'false', __DEAD_DROP__: 'true' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
