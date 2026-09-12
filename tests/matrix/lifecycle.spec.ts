import { test, expect } from '@playwright/test';
import { open, select, convert, trackResources, resources, evidence, verifyDocx } from './helpers';

test('clear preserves settings and releases selected File and output Blob references', async ({ page, browserName, context }, info) => {
  await page.addInitScript(() => {
    if (window !== top) return;
    const refs: WeakRef<object>[] = [];
    (window as Window & { __releaseRefs?: WeakRef<object>[] }).__releaseRefs = refs;
    document.addEventListener('change', event => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
        for (const file of event.target.files || []) refs.push(new WeakRef(file));
      }
    }, true);
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { refs.push(new WeakRef(blob)); return create(blob); };
  });
  await open(page, 'image-convert');
  const cdp = browserName === 'chromium' ? await context.newCDPSession(page) : undefined;
  const samples = [];
  for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
    await page.evaluate(id => { location.hash = id; }, tool);
    await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
    if (tool === 'image-convert') await page.getByLabel('最大宽度').fill('60');
    await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
    await page.getByRole('button', { name: '清空任务' }).click();
    await expect(page.locator('.file-row, .result-list li, .page-card, dialog')).toHaveCount(0);
    if (tool === 'image-convert') await expect(page.getByLabel('最大宽度')).toHaveValue('60');
    // Allow React's unmount effects to complete before the explicit GC check.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    if (cdp) await cdp.send('HeapProfiler.collectGarbage');
    const inspectReferences = () => page.evaluate(() => {
      const refs = (window as Window & { __releaseRefs?: WeakRef<object>[] }).__releaseRefs!;
      return { observed: refs.length, live: refs.filter(ref => ref.deref()).length };
    });
    const immediate = await inspectReferences(), cleanupStarted = Date.now();
    // A cancelled thumbnail may still be unwinding an asynchronous PDF open.
    // Preserve the immediate count, then require zero after cleanup, bounded
    // by the same assertion deadline; two animation frames are not completion.
    if (cdp) await expect.poll(async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await inspectReferences()).live; }).toBe(0);
    const references = await inspectReferences();
    expect(references.observed).toBeGreaterThan(0);
    if (cdp) expect(references.live).toBe(0);
    samples.push({ tool, forcedPageGc: !!cdp, immediate, cleanupMs: Date.now() - cleanupStarted, references });
  }
  await cdp?.detach();
  await evidence(info, 'clear-references.json', { samples, limitation: 'Firefox/WebKit have no forced GC in this test; live weak references there are not a leak assertion.' });
});

test('failed PDF releases its Worker and allows a good retry', async ({ page }) => {
  await trackResources(page); await open(page, 'pdf-image');
  await select(page, ['broken.pdf']); await convert(page);
  await expect(page.locator('.status-error')).toHaveCount(1);
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await page.getByRole('button', { name: '清空任务' }).click();
  await select(page, ['vector-three-pages.pdf']); await convert(page);
  await expect(page.locator('.result-list li')).toHaveCount(3);
});

test('repeated ZIP download reuses one URL and clear releases timers and outputs', async ({ page }, info) => {
  await trackResources(page); await open(page, 'image-convert');
  await select(page, ['transparent.png']); await convert(page);
  const before = await resources(page);
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const waiting = page.waitForEvent('download'); await page.getByRole('button', { name: '全部打包下载' }).click(); await waiting;
    samples.push(await resources(page));
  }
  expect(samples.map(r => r.urls)).toEqual([before.urls + 1, before.urls + 1, before.urls + 1]);
  expect(samples.map(r => r.created)).toEqual([before.created + 1, before.created + 1, before.created + 1]);
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect(page.locator('.file-row, .result-list li, .zip-ready')).toHaveCount(0);
  await expect.poll(async () => ({ ...(await resources(page)), created: 0, ports: 0 })).toEqual({ workers: 0, urls: 0, created: 0, ports: 0, timers: 0, frames: 0 });
  await evidence(info, 'zip-lifecycle.json', { before, samples, after: await resources(page) });
});

test('conversion, clear, retry and tool switching lifecycle rounds', async ({ page, browserName }, info) => {
  test.setTimeout(600000);
  await trackResources(page); await open(page, 'pdf-image');
  const samples = [];
  const rounds = browserName === 'chromium' ? 10 : 3;
  for (let i = 0; i < rounds; i++) {
    await page.evaluate(() => { location.hash = 'pdf-organize'; });
    await expect(page.getByRole('heading', { name: 'PDF 页面整理', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const observer = new MutationObserver(() => {
        if (document.querySelector('.progress-panel')?.textContent?.includes('正在检查文件')) {
          observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
        }
      }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await select(page, ['vector-three-pages.pdf']);
    await expect(page.locator('.status-cancelled')).toHaveCount(1);
    await page.getByRole('button', { name: '清空任务' }).click();
    await page.evaluate(() => { location.hash = 'pdf-image'; });
    await select(page, ['vector-three-pages.pdf']); await page.getByLabel('选择页码').fill('999'); await convert(page);
    await expect(page.locator('.status-error')).toHaveCount(1);
    await page.getByLabel('选择页码').fill('1');
    await page.getByRole('button', { name: '重试 vector-three-pages.pdf' }).click();
    await expect(page.locator('.result-list li')).toHaveCount(1);
    await page.getByRole('button', { name: '预览', exact: true }).click(); await expect(page.locator('dialog img')).toBeVisible();
    await page.getByRole('button', { name: '关闭预览' }).click();
    await page.getByRole('button', { name: '清空任务' }).click();
    await page.evaluate(() => { location.hash = 'image-convert'; });
    await select(page, ['transparent.png']); await convert(page);
    await page.getByRole('button', { name: '清空任务' }).click();
    await page.evaluate(() => { location.hash = 'docx-pdf'; });
    await select(page, ['中文表格分页.docx']); await convert(page);
    if (await page.locator('.result-list li').count()) await verifyDocx(page, info, `round-${i + 1}.pdf`);
    else { expect(browserName).not.toBe('chromium'); await expect(page.locator('.notice').last()).toContainText('不兼容'); }
    await page.getByRole('button', { name: '清空任务' }).click();
    await expect.poll(async () => (await resources(page)).workers).toBe(0);
    await expect.poll(async () => (await resources(page)).urls).toBe(0);
    samples.push(await resources(page));
  }
  expect(samples.every(r => r.workers === 0 && r.urls === 0 && r.frames === 0 && r.timers === 0)).toBe(true);
  expect(samples.at(-1)!.ports).toBe(samples[0].ports);
  await evidence(info, 'lifecycle.json', { rounds, samples });
});
