import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-report.json' }]],
  use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4187/StarShift/', screenshot: 'only-on-failure', trace: 'retain-on-failure', viewport: { width: 1365, height: 1000 } },
  webServer: process.env.TEST_BASE_URL ? undefined : { command: 'node scripts/serve.mjs --port 4187', url: 'http://127.0.0.1:4187/StarShift/', reuseExistingServer: false, timeout: 15000 },
});
