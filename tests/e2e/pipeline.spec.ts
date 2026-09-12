import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resources, trackResources } from '../matrix/helpers';

test('DOM image PDF fallback sends the next image only after embedding acknowledgement', async ({ page }, info) => {
  await trackResources(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'OffscreenCanvas', { value: undefined });
    Object.defineProperty(window, 'createImageBitmap', { value: undefined });
    const native = Worker;
    const events: string[] = [];
    (window as Window & { __imageEvents?: string[] }).__imageEvents = events;
    window.Worker = class extends native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', ({ data }) => { if (data.nextImage !== undefined) events.push(`ready:${data.nextImage}`); });
      }
      postMessage(message: { type?: string; index?: number }, options?: Transferable[] | StructuredSerializeOptions) {
        if (message.type === 'image-pdf-chunk') events.push(`image:${message.index}`);
        if (Array.isArray(options)) super.postMessage(message, options); else super.postMessage(message, options);
      }
    };
  });
  await page.goto('./#image-pdf');
  await page.getByTestId('file-input').setInputFiles(['tests/fixtures/transparent.png', 'tests/fixtures/orientation-6.jpg', 'tests/fixtures/sample.webp']);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByLabel('纸张大小').selectOption('fit'); await page.getByLabel('页边距（mm）').fill('0');
  await page.getByRole('button', { name: '旋转 sample.webp', exact: true }).click();
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  expect(await page.evaluate(() => (window as Window & { __imageEvents?: string[] }).__imageEvents)).toEqual(['ready:0', 'image:0', 'ready:1', 'image:1', 'ready:2', 'image:2']);
  const waiting = page.waitForEvent('download'); await page.locator('.result-list a').click();
  const file = info.outputPath('dom-images.pdf'); await (await waiting).saveAs(file);
  const doc = await PDFDocument.load(await readFile(file));
  expect(doc.getPages().map(p => p.getSize())).toEqual([{ width: 90, height: 60 }, { width: 60, height: 90 }, { width: 60, height: 90 }]);
  const pixels = JSON.parse(execFileSync('python', ['-c', 'import fitz,json,sys; d=fitz.open(sys.argv[1]); print(json.dumps([list(p.get_pixmap().samples[:3]) for p in d]))', file], { encoding: 'utf8', windowsHide: true }));
  expect(pixels[0]).toEqual([255, 255, 255]);
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => { const r = await resources(page); return [r.workers, r.urls, r.timers]; }).toEqual([0, 0, 0]);
});

test('image thumbnails do not load PDF or ZIP modules and cancellation rejects late DOM image work', async ({ page }) => {
  await trackResources(page);
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'OffscreenCanvas', { value: undefined });
    Object.defineProperty(window, 'createImageBitmap', { value: undefined });
  });
  await page.goto('./#image-pdf');
  await page.getByTestId('file-input').setInputFiles(['tests/fixtures/transparent.png', 'tests/fixtures/sample.webp']);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  expect(requests.some(url => /pdf-edit-|browser-/.test(url))).toBe(false);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) { original.call(this, value => setTimeout(() => callback(value), 1500), type, quality); };
  });
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.locator('.progress-panel')).toContainText('第 1 张');
  const before = Date.now(); await page.getByRole('button', { name: '取消任务', exact: true }).click();
  await expect.poll(async () => (await resources(page)).workers, { intervals: [20, 50, 100] }).toBe(0);
  expect(Date.now() - before).toBeLessThan(1000);
  await expect(page.locator('.status-cancelled')).toHaveCount(2);
  await page.waitForTimeout(1700); // Wait past the injected encoder callback.
  await expect(page.locator('.result-list li')).toHaveCount(0);
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => (await resources(page)).urls).toBe(0);
});

test('single thumbnail failure keeps the source page exportable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { HTMLCanvasElement.prototype.toBlob = original; callback(null); };
  });
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/vector-three-pages.pdf');
  await expect(page.getByText('缩略图失败，可尝试导出', { exact: true })).toBeVisible();
  await expect(page.locator('.page-card input:checked')).toHaveCount(3);
  await page.getByRole('button', { name: '导出选中页面' }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
});
