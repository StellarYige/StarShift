import { defineConfig } from '@playwright/test';
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4187/StarShift/';
const outputDir = process.env.E2E_OUTPUT || 'test-results/e2e';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  fullyParallel: false,
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
  use: { baseURL, screenshot: 'only-on-failure', trace: 'retain-on-failure', viewport: { width: 1365, height: 1000 } },
  webServer: process.env.TEST_BASE_URL ? undefined : { command: 'node scripts/serve.mjs --port 4187', url: baseURL, reuseExistingServer: false, timeout: 15000 },
});
