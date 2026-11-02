import { defineConfig } from '@playwright/test';

// End-to-end tests run against the real Worker + Durable Object runtime
// (workerd via the Cloudflare Vite plugin). Set E2E_BASE_URL to test a
// deployed build instead, e.g. the public smoke test.
const external = process.env.E2E_BASE_URL;
const PORT = 5174;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: external ? 2 : 3,
  reporter: [['list']],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    // Microsoft Edge ships with Windows; set E2E_CHANNEL= to use Playwright's Chromium.
    channel: process.env.E2E_CHANNEL === undefined ? 'msedge' : process.env.E2E_CHANNEL || undefined,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: external
    ? undefined
    : {
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
