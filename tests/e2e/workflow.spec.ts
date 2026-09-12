import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resources, trackResources } from '../matrix/helpers';

test('partial PDF output retry replaces only its own pages, and full conversion replaces the batch', async ({ page }) => {
  await trackResources(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    let calls = 0;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (++calls === 2) { callback(null); return; }
      original.call(this, callback, type, quality);
    };
  });
  await page.goto('./#pdf-image');
  const buffer = await readFile('tests/fixtures/vector-three-pages.pdf');
  await page.getByTestId('file-input').setInputFiles(['first.pdf', 'second.pdf'].map(name => ({ name, buffer, mimeType: 'application/pdf' })));
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.result-list li')).toHaveCount(4);
  await expect(page.locator('.status-error')).toHaveCount(1);
  const successful = await page.locator('.result-list a[download^="second"]').evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href));
  await page.getByRole('button', { name: '重试 first.pdf', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.result-list li')).toHaveCount(6);
  expect(await page.locator('.result-list a[download^="second"]').evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href))).toEqual(successful);
  expect(await page.locator('.result-list a[download]').evaluateAll(links => links.map(a => (a as HTMLAnchorElement).download))).toHaveLength(6);
  await expect(page.getByRole('button', { name: '转换未完成项', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '全部重新转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.result-list li')).toHaveCount(6);
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => { const r = await resources(page); return [r.workers, r.urls, r.timers]; }).toEqual([0, 0, 0]);
});

test('selection reasons survive conversion, settings errors block start, unfinished batch preserves successes', async ({ page }) => {
  await page.goto('./#image-convert');
  const buffer = await readFile('tests/fixtures/transparent.png');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'valid.png', buffer, mimeType: 'image/png' },
    { name: 'broken.png', buffer: Buffer.from('broken'), mimeType: 'image/png' },
    { name: 'empty.png', buffer: Buffer.alloc(0), mimeType: 'image/png' },
    { name: 'unsupported.txt', buffer, mimeType: 'text/plain' },
  ]);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.notice')).toContainText('空文件 1 个');
  await expect(page.locator('.notice')).toContainText('不支持的格式 1 个');
  await page.getByLabel('最大宽度').fill('-1');
  await expect(page.getByLabel('最大宽度')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: '开始转换', exact: true })).toBeDisabled();
  await page.getByLabel('最大宽度').fill('60');
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  const result = await page.locator('.result-list a').getAttribute('href');
  await page.getByRole('button', { name: '转换未完成项', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await expect(page.locator('.result-list a')).toHaveAttribute('href', result!);
  await expect(page.locator('.notice')).toContainText('空文件 1 个');
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect(page.getByLabel('最大宽度')).toHaveValue('60');
});

test('image PDF does not silently omit broken inputs and supports moving to a queue position', async ({ page }) => {
  await page.goto('./#image-pdf');
  const buffer = await readFile('tests/fixtures/transparent.png');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'valid.png', buffer, mimeType: 'image/png' },
    { name: 'broken.png', buffer: Buffer.from('broken'), mimeType: 'image/png' },
  ]);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByRole('button', { name: '移到指定位置 broken.png' }).click();
  await page.getByLabel('文件目标位置').fill('1');
  await page.getByRole('button', { name: '移动文件', exact: true }).click();
  await expect(page.locator('.file-row').first()).toContainText('broken.png');
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.result-list li')).toHaveCount(0);
  await page.getByRole('button', { name: '移除 broken.png' }).click();
  await page.getByRole('button', { name: '重试 valid.png', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
});

test('a failed whole PDF retry can continue after removing the unreadable source', async ({ page }) => {
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/vector-three-pages.pdf');
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByRole('button', { name: '旋转页面 1', exact: true }).click();
  const ids = await page.locator('.page-card').evaluateAll(cards => cards.map(card => card.getAttribute('data-page-id')));
  await page.getByRole('button', { name: '导出选中页面' }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/broken.pdf');
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByRole('button', { name: '全部重新转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.result-list li')).toHaveCount(0);
  await page.getByRole('button', { name: '移除 broken.pdf' }).click();
  await expect(page.getByRole('button', { name: '导出选中页面' })).toBeEnabled({ timeout: 1000 });
  expect(await page.locator('.page-card').evaluateAll(cards => cards.map(card => card.getAttribute('data-page-id')))).toEqual(ids);
  await page.getByRole('button', { name: '导出选中页面' }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
});

test('cancelling full reconversion keeps every unfinished source eligible to resume', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
    Object.defineProperty(window, 'createImageBitmap', { value: undefined, configurable: true });
  });
  await page.goto('./#image-convert');
  const buffer = await readFile('tests/fixtures/transparent.png');
  await page.getByTestId('file-input').setInputFiles(['one.png', 'two.png'].map(name => ({ name, buffer, mimeType: 'image/png' })));
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  await page.evaluate(() => {
    const native = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      HTMLCanvasElement.prototype.toBlob = native;
      native.call(this, value => setTimeout(() => callback(value), 1000), type, quality);
    };
  });
  await page.getByRole('button', { name: '全部重新转换', exact: true }).click();
  await page.getByRole('button', { name: '取消任务', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('.status-cancelled')).toHaveCount(2, { timeout: 1000 });
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  expect(await page.locator('.result-list a[download]').evaluateAll(links => links.map(link => link.getAttribute('download')))).toEqual(['one.png', 'two.png']);
});
