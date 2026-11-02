import { defineConfig } from 'vitest/config';

// Unit tests run in plain Node: the rules engine and room core are platform-independent.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
