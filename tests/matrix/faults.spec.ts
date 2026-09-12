import { test, expect } from '@playwright/test';
import { open, select, convert, trackResources, resources, verifyDocx, evidence } from './helpers';

for (const fault of ['download', 'script-download', 'initialize', 'timeout'] as const) {
  test(`${fault} failure stops the batch, preserves inputs, explicit retry recovers`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Chromium fault injection; other engines have separate actual compatibility and lifecycle runs.');
    await trackResources(page);
    await page.addInitScript(kind => {
      const host = top as Window & { __fault?: string };
      if (window === top) {
        host.__fault = kind;
        const original = window.setTimeout.bind(window);
        window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => original(fn, host.__fault === 'timeout' && ms === 240000 ? 200 : ms, ...args)) as typeof window.setTimeout;
      } else if (location.pathname.endsWith('/office/frame.html')) {
        const original = window.fetch;
        window.fetch = (input, init) => host.__fault === 'download' && String(input).includes('/fonts/') ? Promise.resolve(new Response('', { status: 503 })) : original(input, init);
        const append = Node.prototype.appendChild;
        Node.prototype.appendChild = function<T extends Node>(node: T): T {
          if (host.__fault === 'script-download' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) node.src = new URL('missing-soffice.js', node.src).href;
          return append.call(this, node) as T;
        };
        const Native = Worker;
        window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { if (host.__fault === 'initialize') throw Error('Synthetic initialization failure'); super(url, options); } };
      }
    }, fault);
    await open(page, 'docx-pdf');
    await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
    let frames = 0; page.on('frameattached', () => { frames++; });
    await convert(page);
    await expect(page.locator('.status-error')).toHaveCount(1);
    await expect(page.locator('.status-ready')).toHaveCount(1);
    await expect(page.locator('.notice').last()).toContainText({ download: '下载失败', 'script-download': '下载失败', initialize: '初始化失败', timeout: '超时' }[fault]);
    expect(frames).toBe(1);
    await expect.poll(async () => (await resources(page)).workers).toBe(0);
    await page.evaluate(() => { (window as Window & { __fault?: string }).__fault = ''; });
    await page.getByRole('button', { name: '重试 中文表格分页.docx' }).click();
    await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 240000 });
    await verifyDocx(page, info);
    await evidence(info, 'fault.json', { fault, frames, after: await resources(page), retry: 'actual conversion passed' });
    for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
      await page.evaluate(id => { location.hash = id; }, tool);
      await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
      await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
    }
  });
}

test('isolation unavailable explains DOCX and all other tools still convert', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'crossOriginIsolated', { value: false, configurable: true }));
  await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']);
  await expect(page.getByRole('button', { name: '开始转换' })).toBeDisabled();
  await expect(page.locator('.notice').first()).toContainText('安全隔离');
  for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
    await page.evaluate(id => { location.hash = id; }, tool);
    await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
    await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  }
});

test('one damaged DOCX between good files does not restart the shared engine', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'Exact engine-reuse assertion on the supported reference engine.');
  await open(page, 'docx-pdf');
  let frames = 0; page.on('frameattached', () => { frames++; });
  await select(page, ['中文表格分页.docx', 'broken.docx', 'font-substitution.docx']);
  await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  await expect(page.locator('.status-error')).toHaveCount(1); expect(frames).toBe(1);
  await verifyDocx(page, info); await expect(page.locator('iframe')).toHaveCount(0);
});

test('preview error clears on next page and closing during rendering cannot restore old state', async ({ page }) => {
  await trackResources(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
      const host = window as Window & { __failPreview?: boolean };
      if (host.__failPreview) { host.__failPreview = false; callback(null); return; }
      return original.call(this, callback, ...args);
    };
  });
  await open(page, 'image-pdf'); await select(page, ['transparent.png', 'sample.webp']); await convert(page);
  await page.evaluate(() => { (window as Window & { __failPreview?: boolean }).__failPreview = true; });
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('dialog [role=alert]')).toBeVisible();
  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.locator('dialog img')).toBeVisible();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  await page.getByRole('button', { name: '上一页' }).click();
  await page.getByRole('button', { name: '关闭预览' }).click();
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await expect.poll(async () => (await resources(page)).urls).toBe(0);
  await expect(page.locator('dialog, .result-list li')).toHaveCount(0);
});

for (const stage of ['resource-load', 'initialize', 'import', 'export']) {
  test(`cancel during actual DOCX ${stage} cannot write into the next tool`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Stage cancellation requires the supported reference DOCX engine.');
    await trackResources(page);
    await page.addInitScript(target => {
      if (window !== top) return;
      const observer = new MutationObserver(() => {
        if (document.querySelector('.progress-panel')?.getAttribute('data-phase') === target) {
          observer.disconnect();
          (window as Window & { __cancelledStage?: string }).__cancelledStage = target;
          (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
        }
      });
      observer.observe(document, { childList: true, subtree: true, attributes: true });
    }, stage);
    await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']); await convert(page);
    expect(await page.evaluate(() => (window as Window & { __cancelledStage?: string }).__cancelledStage)).toBe(stage);
    await expect(page.locator('.status-cancelled')).toHaveCount(1);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect.poll(async () => (await resources(page)).workers).toBe(0);
    await page.evaluate(() => { location.hash = 'image-convert'; });
    await select(page, ['transparent.png']); await convert(page);
    await expect(page.locator('.result-list li')).toHaveCount(1);
    await page.getByRole('button', { name: '清空任务' }).click();
    await evidence(info, 'cancellation.json', { stage, after: await resources(page) });
  });
}

test('cancel thumbnail generation then immediately use another tool', async ({ page }) => {
  await trackResources(page); await open(page, 'pdf-organize');
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.progress-panel')?.textContent?.includes('缩略图')) {
        observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
      }
    }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await select(page, ['vector-three-pages.pdf']);
  await expect(page.locator('.status-cancelled')).toHaveCount(1);
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await page.evaluate(() => { location.hash = 'image-convert'; });
  await select(page, ['transparent.png']); await convert(page);
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await expect(page.locator('.page-card')).toHaveCount(0);
});

test('cancel DOM canvas encoding then ignore the late result in another tool', async ({ page }, info) => {
  await trackResources(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
    const host = window as Window & { __holdEncoding?: boolean; __releaseEncoding?: () => void };
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
      return encode.call(this, blob => {
        if (host.__holdEncoding) host.__releaseEncoding = () => { host.__releaseEncoding = undefined; callback(blob); };
        else callback(blob);
      }, ...args);
    };
  });
  await open(page, 'image-convert'); await select(page, ['transparent.png']);
  await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = true; });
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await page.waitForFunction(() => !!(window as Window & { __releaseEncoding?: () => void }).__releaseEncoding);
  await page.getByRole('button', { name: '取消任务', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
  await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = false; location.hash = 'image-pdf'; });
  await select(page, ['transparent.png']); await convert(page);
  await page.evaluate(() => { (window as Window & { __releaseEncoding?: () => void }).__releaseEncoding?.(); });
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await expect(page.locator('.result-list li')).toContainText('图片合辑.pdf');
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => (await resources(page)).urls).toBe(0);
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await evidence(info, 'canvas-cancellation.json', { after: await resources(page) });
});
