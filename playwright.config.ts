import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:3012',
    channel: process.env.YOSIS_E2E_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `"${process.execPath}" scripts/start.mjs`,
    url: 'http://127.0.0.1:3012/api/health',
    env: { YOSIS_API_PORT: '3012' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
