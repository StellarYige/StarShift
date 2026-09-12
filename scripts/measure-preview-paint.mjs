// Resolve the first-open discrepancy separately from Playwright polling time.
// Record actual input events to decoded image + animation frame in the page.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
const destination = 'docs/evidence/five-tools/performance/preview-paint.json';
const report = { time: new Date().toISOString(), baseline: '19a49db', revised: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), cpu: os.cpus()[0].model, ram: os.totalmem(), os: os.release(), method: 'Five alternating production pairs; fresh browser/context each. Bring preview trigger into view and wait for background thumbnails to finish before timing. Browser capture-phase click to image load plus requestAnimationFrame, not automation polling or physical screen scanout. No fault injection, forced GC or OS sampler.', samples: [] };
await mkdir('docs/evidence/five-tools/performance', { recursive: true });
for (let pair = 1; pair <= 5; pair++) for (const version of pair % 2 ? ['baseline', 'revised'] : ['revised', 'baseline']) {
  const browser = await chromium.launch(); report.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
  const sample = { pair, version, status: 'running' };
  await page.addInitScript(() => {
    window.__paint = { events: [], started: null, workers: 0, created: 0 };
    const Native = Worker;
    window.Worker = class extends Native {
      constructor(...args) { super(...args); window.__paint.workers++; window.__paint.created++; this.closed = false; }
      terminate() { if (!this.closed) { this.closed = true; window.__paint.workers--; } super.terminate(); }
    };
    document.addEventListener('click', event => {
      const label = event.target.closest('button')?.getAttribute('aria-label');
      if (label === '预览' || label === '下一页') window.__paint.started = { kind: label === '预览' ? 'open' : 'turn', at: performance.now() };
    }, true);
    document.addEventListener('load', event => {
      if (!event.target.matches?.('dialog img') || !window.__paint.started) return;
      const start = window.__paint.started; window.__paint.started = null;
      const width = event.target.naturalWidth, height = event.target.naturalHeight;
      requestAnimationFrame(() => window.__paint.events.push({ kind: start.kind, ms: performance.now() - start.at, width, height }));
    }, true);
  });
  try {
    await page.goto(`http://127.0.0.1:${version === 'baseline' ? 4188 : 4187}/StarShift/#pdf-organize`);
    await page.getByTestId('file-input').setInputFiles('.cache/five-tools-fixtures/mixed-100.pdf');
    await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden({ timeout: 20000 });
    await page.getByRole('button', { name: '导出选中页面' }).click();
    await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 20000 });
    const trigger = page.getByRole('button', { name: '预览', exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => window.__paint.workers), { timeout: 20000 }).toBe(0);
    const created = await page.evaluate(() => window.__paint.created);
    await trigger.click();
    await expect.poll(() => page.evaluate(() => window.__paint.events.length), { timeout: 20000 }).toBe(1);
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: '下一页' }).click();
      await expect.poll(() => page.evaluate(() => window.__paint.events.length), { timeout: 20000 }).toBe(i + 2);
    }
    sample.events = await page.evaluate(() => window.__paint.events);
    sample.createdDuringPreview = await page.evaluate(() => window.__paint.created) - created;
    sample.status = 'passed';
  } catch (error) {
    sample.status = 'failed'; sample.error = String(error.stack);
    sample.events = await page.evaluate(() => window.__paint.events).catch(() => null);
    sample.state = await page.locator('dialog').textContent().catch(() => null);
  } finally {
    await browser.close(); report.samples.push(sample);
    await writeFile(destination, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(sample));
  }
}
if (report.samples.some(sample => sample.status !== 'passed')) process.exitCode = 1;
