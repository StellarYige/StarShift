import { fiveToolsDirectory } from './measurement-paths.mjs';
// Alternating production A/B runs. No fault injection, OS sampling, or forced
// GC in timing runs. Keep failures and individual samples, including feedback.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const output = fiveToolsDirectory;
const pdfOnly = process.argv.includes('--pdf-only');
const outputName = pdfOnly ? 'paired-pdf-final' : 'paired';
await mkdir(output, { recursive: true });
await mkdir('.cache/five-tools-output', { recursive: true });
const report = { date: new Date().toISOString(), baseline: '19a49db', revised: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim(), cpu: os.cpus()[0].model, ram: os.totalmem(), os: `${os.type()} ${os.release()}`, node: process.version, method: 'Five alternating pairs, new Chromium process/context for each version; production build, 1365x1000. UI feedback = event/action to updated DOM plus next animation frame, not physical display latency. Timing uses the same Playwright polling in both versions; interpretation includes UI overhead. No faults or forced GC.', samples: [] };
const manifest = JSON.parse(await readFile('.cache/five-tools-fixtures/manifest.json', 'utf8'));
report.fixtures = manifest;

async function sample(pair, version) {
  const browser = await chromium.launch({ headless: true }); report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
  await context.addInitScript(() => {
    window.__five = { workers: 0, feedback: [], events: {} };
    const native = Worker;
    window.Worker = class extends native {
      constructor(...args) { super(...args); window.__five.workers++; this.released = false; }
      terminate() { if (!this.released) { this.released = true; window.__five.workers--; } super.terminate(); }
    };
    document.addEventListener('change', event => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
        window.__five.events.selection = performance.now();
        const observer = new MutationObserver(() => {
          if (!document.querySelector('.file-row')) return;
          observer.disconnect(); requestAnimationFrame(() => window.__five.feedback.push({ action: 'selection', ms: performance.now() - window.__five.events.selection }));
        }); observer.observe(document, { childList: true, subtree: true });
      }
    }, true);
  });
  const page = await context.newPage(), row = { pair, version, metrics: {}, feedback: [], status: 'running' };
  const url = `http://127.0.0.1:${version === 'baseline' ? 4188 : 4187}/StarShift/`;
  const idle = () => expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden({ timeout: 180000 });
  async function clock() { return page.evaluate(() => performance.now()); }
  async function actionFeedback(selector, action) {
    return page.evaluate(async ({ selector, action }) => {
      const start = performance.now(); document.querySelector(selector).click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.__five.feedback.push({ action, ms: performance.now() - start });
    }, { selector, action });
  }
  async function save(locator, name) {
    const waiting = page.waitForEvent('download'); await locator.click();
    const file = `.cache/five-tools-output/${version}-${pair}-${name}`; await (await waiting).saveAs(file); return file;
  }
  try {
    await page.goto(url + '#pdf-organize'); await expect(page.locator('header')).toBeVisible();
    await page.getByTestId('file-input').setInputFiles('.cache/five-tools-fixtures/mixed-100.pdf');
    await expect(page.locator('.page-card')).toHaveCount(100); await idle();
    row.metrics.pdfReady100Ms = await page.evaluate(() => performance.now() - window.__five.events.selection);
    await expect.poll(() => page.evaluate(() => window.__five.workers)).toBe(0);
    for (let i = 0; i < 8; i++) await actionFeedback('.page-actions button:not(:disabled)', 'page-sort');
    // Restore original page order using a fresh file before output assertions.
    await page.getByRole('button', { name: '清空任务' }).click();
    await page.getByTestId('file-input').setInputFiles('.cache/five-tools-fixtures/mixed-100.pdf'); await idle();
    await expect.poll(() => page.evaluate(() => window.__five.workers)).toBe(0);
    await page.getByRole('button', { name: '导出选中页面', exact: true }).click(); await idle();
    await expect(page.locator('.result-list li')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.__five.workers)).toBe(0);
    let start = await clock();
    await page.getByRole('button', { name: '预览', exact: true }).click(); await expect(page.locator('dialog img')).toBeVisible();
    row.metrics.previewOpen100Ms = await clock() - start;
    start = await clock();
    for (let i = 2; i <= 6; i++) {
      const previous = await page.locator('dialog img').getAttribute('src');
      await page.getByRole('button', { name: '下一页', exact: true }).click();
      // Require a newly rendered image. A React label update alone is not a
      // completed page turn. Keep slower and failed observations in the data.
      await expect(page.locator('dialog img')).not.toHaveAttribute('src', previous, { timeout: 20000 });
      await expect(page.locator('dialog img')).toHaveAttribute('alt', new RegExp(`第 ${i} 页`), { timeout: 20000 });
    }
    row.metrics.previewFiveTurnsMs = await clock() - start;
    await page.getByRole('button', { name: '关闭预览', exact: true }).click();
    await page.getByLabel('输出方式').selectOption('split');
    start = await clock(); await actionFeedback('.convert-actions button.secondary:not(:disabled), .convert-actions button.primary:not(:disabled)', 'start');
    // Baseline has only the primary re-convert button. Revised's primary is
    // disabled when all items are complete; the secondary replaces all results.
    await expect(page.locator('.result-list li')).toHaveCount(100, { timeout: 180000 }); await idle();
    row.metrics.split100Ms = await clock() - start;
    row.pdfQuality = JSON.parse(execFileSync('python', ['scripts/assert-performance-output.py', await save(page.getByRole('button', { name: '全部打包下载' }), 'split.zip')], { encoding: 'utf8', windowsHide: true }));
    await page.getByRole('button', { name: '清空任务' }).click();
    if (pdfOnly) { row.feedback.push(...await page.evaluate(() => window.__five.feedback)); row.status = 'passed'; return; }
    await page.evaluate(() => { location.hash = 'image-pdf'; });
    await expect(page.getByRole('heading', { name: '图片转 PDF', exact: true })).toBeVisible();
    await page.getByTestId('file-input').setInputFiles(manifest.records.filter(r => r.name.endsWith('.jpg')).map(r => '.cache/five-tools-fixtures/' + r.name));
    await idle(); row.metrics.imagePrepare10Ms = await page.evaluate(() => performance.now() - window.__five.events.selection);
    for (let i = 0; i < 8; i++) await actionFeedback('.file-actions button:not(:disabled)', 'image-sort');
    // Eight moves on the first row undo each pair.
    for (let i = 0; i < 8; i++) {
      const start = await clock(); await page.getByLabel('页边距（mm）').fill(String(i % 2 ? 12 : 13));
      row.feedback.push({ action: 'settings', ms: await clock() - start });
    }
    start = await clock(); await actionFeedback('.convert-actions button.primary', 'start');
    await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 180000 }); await idle();
    row.metrics.imagePdf10Ms = await clock() - start;
    row.imageQuality = JSON.parse(execFileSync('python', ['scripts/assert-performance-output.py', await save(page.locator('.result-list a[download]'), 'images.pdf')], { encoding: 'utf8', windowsHide: true }));
    row.feedback.push(...await page.evaluate(() => window.__five.feedback));
    row.status = 'passed';
  } catch (error) {
    row.status = 'failed'; row.error = String(error.stack);
    row.state = await page.evaluate(() => ({ dialog: !!document.querySelector('dialog[open]'), previewError: document.querySelector('.preview-error')?.textContent, loading: document.querySelector('dialog [role=status]')?.textContent, pager: document.querySelector('.pager')?.textContent, workers: window.__five.workers })).catch(() => ({ pageUnresponsive: true }));
  }
  finally { await browser.close(); report.samples.push(row); await writeFile(`${output}/${outputName}.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ pair, version, status: row.status, metrics: row.metrics, error: row.error })); }
}
for (let pair = 1; pair <= 5; pair++) for (const version of pair % 2 ? ['baseline', 'revised'] : ['revised', 'baseline']) await sample(pair, version);
if (report.samples.some(s => s.status !== 'passed')) process.exitCode = 1;
