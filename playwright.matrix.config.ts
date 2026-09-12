import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4187/StarShift/';
export default defineConfig({
  testDir: './tests/matrix', timeout: 300000, expect: { timeout: 20000 },
  workers: 1, fullyParallel: false,
  outputDir: process.env.MATRIX_OUTPUT || 'test-results/matrix',
  reporter: [['list'], ['json', { outputFile: `${process.env.MATRIX_OUTPUT || 'test-results/matrix'}/report.json` }]],
  // Native counters and real output files are the lifecycle evidence. Recording
  // repeated 161 MB WASM response bodies perturbs these resource checks.
  use: { baseURL, actionTimeout: 20000, screenshot: 'only-on-failure', trace: 'off', viewport: { width: 1365, height: 1000 } },
  webServer: process.env.TEST_BASE_URL ? undefined : { command: 'node scripts/serve.mjs --port 4187', url: baseURL, reuseExistingServer: false, timeout: 15000 },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: process.env.DEBUG_BROWSER ? { args: ['--remote-debugging-port=9228'] } : {} }, testIgnore: ['other-tools.spec.ts', 'mobile.spec.ts'] },
    { name: 'firefox', use: { browserName: 'firefox' }, testIgnore: 'mobile.spec.ts' },
    { name: 'webkit', use: { browserName: 'webkit' }, testIgnore: 'mobile.spec.ts' },
    { name: 'android-simulation', use: { ...devices['Pixel 7'], browserName: 'chromium' }, testMatch: 'mobile.spec.ts' },
    { name: 'iphone-simulation', use: { ...devices['iPhone 15'], browserName: 'webkit' }, testMatch: 'mobile.spec.ts' },
    ...(process.env.LOCAL_BROWSERS ? [
      { name: 'chrome-installed', use: { browserName: 'chromium' as const, channel: 'chrome' }, testMatch: ['other-tools.spec.ts', 'compatibility.spec.ts'] },
      { name: 'edge-installed', use: { browserName: 'chromium' as const, channel: 'msedge' }, testMatch: ['other-tools.spec.ts', 'compatibility.spec.ts'] },
    ] : []),
  ],
});
