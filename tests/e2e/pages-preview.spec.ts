import { test, expect } from '@playwright/test';
import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';
import { trackResources, resources } from '../matrix/helpers';

test.beforeAll(async () => {
  try { await access('.cache/five-tools-fixtures/mixed-500.pdf'); }
  catch { execFileSync(process.execPath, ['scripts/create-performance-fixtures.mjs'], { windowsHide: true }); }
});

test('PDF preview parses once, supports rapid navigation, zoom, render retry, and restores focus', async ({ page }) => {
  await trackResources(page);
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/vector-three-pages.pdf');
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByRole('button', { name: '导出选中页面', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  const before = await resources(page), trigger = page.getByRole('button', { name: '预览', exact: true });
  await trigger.click();
  await expect(page.locator('dialog img')).toBeVisible();
  const opened = await resources(page);
  expect(opened.created).toBe(before.created + 1);
  await page.getByLabel('预览页码').fill('3'); await page.getByRole('button', { name: '跳转', exact: true }).click();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 3 页/);
  await page.getByLabel('预览缩放').selectOption('2');
  await expect(page.locator('dialog img')).toBeVisible();
  expect(await page.locator('dialog img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(800);
  await page.getByRole('button', { name: '关闭预览' }).focus();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('End');
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 3 页/);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { HTMLCanvasElement.prototype.toBlob = original; callback(null); };
  });
  await page.getByLabel('预览缩放').selectOption('1.5');
  await expect(page.getByRole('button', { name: '重试当前页' })).toBeVisible();
  await expect(page.locator('dialog a[download]')).toBeVisible();
  await page.getByRole('button', { name: '重试当前页' }).click();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 3 页/);
  const after = await resources(page);
  expect(after.created).toBe(opened.created); expect(after.urls).toBe(opened.urls);
  await page.getByRole('button', { name: '关闭预览' }).click();
  await expect(trigger).toBeFocused();
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => (await resources(page)).urls).toBe(0);
});

test('100 PDF pages are usable before thumbnails; viewport cache evicts and rebuilds without changing IDs', async ({ page }) => {
  test.setTimeout(180000);
  await trackResources(page);
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles('.cache/five-tools-fixtures/mixed-100.pdf');
  await expect(page.locator('.page-card')).toHaveCount(100);
  await expect(page.getByRole('button', { name: '导出选中页面', exact: true })).toBeEnabled();
  const first = page.locator('.page-card').first(), id = await first.getAttribute('data-page-id');
  await expect(first.locator('img')).toBeVisible();
  const firstUrl = await first.locator('img').getAttribute('src');
  for (let n = 10; n < 100; n += 10) {
    const card = page.locator('.page-card').nth(n);
    await card.scrollIntoViewIfNeeded(); await expect(card.locator('img')).toBeVisible();
    expect(await page.locator('.page-card img').count()).toBeLessThanOrEqual(60);
  }
  await expect(first.locator('img')).toHaveCount(0);
  await first.scrollIntoViewIfNeeded(); await expect(first.locator('img')).toBeVisible();
  expect(await first.locator('img').getAttribute('src')).not.toBe(firstUrl);
  await page.getByRole('button', { name: '旋转页面 1', exact: true }).click();
  await page.getByRole('button', { name: '后移页面 1', exact: true }).click();
  await expect(page.locator('.page-card').nth(1)).toHaveAttribute('data-page-id', id!);
  await expect(page.locator('.page-card').nth(1).locator('img')).toHaveAttribute('style', /rotate\(90deg\)/);
  expect((await resources(page)).urls).toBeLessThanOrEqual(60);
  await page.getByRole('button', { name: '导出选中页面', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => { const r = await resources(page); return [r.workers, r.urls, r.timers]; }).toEqual([0, 0, 0]);
});

test('queue range, bulk rotation and move preserve source page order in multi-source split outputs', async ({ page }, info) => {
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles(['tests/fixtures/vector-three-pages.pdf', 'tests/fixtures/vector-three-pages.pdf']);
  await expect(page.locator('.page-card')).toHaveCount(6);
  await page.getByLabel('队列位置范围').fill('5,2-3'); await page.getByRole('button', { name: '应用选择范围' }).click();
  await page.getByRole('button', { name: '旋转选中页' }).click();
  await page.getByLabel('选中页目标位置').fill('2'); await page.getByRole('button', { name: '移动选中页' }).click();
  await expect(page.locator('.page-card.selected')).toHaveCount(3);
  expect(await page.locator('.page-card.selected').evaluateAll(cards => cards.map(c => c.getAttribute('data-source-page')))).toEqual(['2', '3', '2']);
  await page.getByLabel('输出方式').selectOption('split');
  await page.getByRole('button', { name: '导出选中页面' }).click();
  await expect(page.locator('.result-list li')).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const waiting = page.waitForEvent('download'); await page.locator('.result-list a').nth(i).click();
    const download = await waiting, file = info.outputPath(`split-${i}.pdf`); await download.saveAs(file);
    const doc = await PDFDocument.load(await readFile(file)); expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getRotation().angle).toBe([180, 90, 180][i]);
    const content = JSON.parse(execFileSync('python', ['-c', 'import fitz,json,sys; d=fitz.open(sys.argv[1]); print(json.dumps({"text":d[0].get_text().strip(),"paths":len(d[0].get_drawings()),"images":len(d[0].get_images())}))', file], { encoding: 'utf8', windowsHide: true }));
    expect(content.text).toBe(`VECTOR PAGE ${[2, 3, 2][i]}`); expect(content.paths).toBeGreaterThan(0); expect(content.images).toBe(0);
  }
});

test('500 page boundary checks total before thumbnails and tool switch cancels background rendering', async ({ page }) => {
  await trackResources(page);
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles('.cache/five-tools-fixtures/mixed-500.pdf');
  await expect(page.locator('.page-card')).toHaveCount(500);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/vector-three-pages.pdf');
  await expect(page.locator('.status-error')).toContainText('500');
  await expect(page.locator('.page-card')).toHaveCount(500);
  await page.evaluate(() => { location.hash = 'image-convert'; });
  await expect(page.getByRole('heading', { name: '图片格式互转', exact: true })).toBeVisible();
  await expect.poll(async () => { const r = await resources(page); return [r.workers, r.urls, r.timers]; }).toEqual([0, 0, 0]);
});

test('late thumbnails preserve selection and rotation after moving; closing a loading preview cannot overwrite the next result', async ({ page }) => {
  await trackResources(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) { original.call(this, value => setTimeout(() => callback(value), 500), type, quality); };
  });
  await page.goto('./#pdf-organize');
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/vector-three-pages.pdf');
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  const loading = page.locator('.page-card[data-thumbnail-state="loading"]').first();
  await expect(loading).toBeVisible();
  const id = await loading.getAttribute('data-page-id');
  const card = page.locator(`[data-page-id="${id}"]`);
  await card.locator('input').uncheck();
  await card.getByRole('button', { name: /^旋转页面/ }).click();
  await card.locator('.page-actions button:not(:disabled)').first().click();
  await expect(card.locator('img')).toBeVisible();
  await expect(card.locator('img')).toHaveAttribute('style', /rotate\(90deg\)/);
  await expect(card.locator('input')).not.toBeChecked();
  await page.getByLabel('输出方式').selectOption('split');
  await page.getByRole('button', { name: '导出选中页面' }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2);
  await page.getByRole('button', { name: '预览', exact: true }).first().click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.getByRole('button', { name: '关闭预览' }).click();
  await page.getByRole('button', { name: '预览', exact: true }).nth(1).click();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', '页面-002.pdf 第 1 页');
  await page.waitForTimeout(600);
  await expect(page.locator('dialog img')).toHaveAttribute('alt', '页面-002.pdf 第 1 页');
  await page.getByRole('button', { name: '关闭预览' }).click();
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => { const r = await resources(page); return [r.workers, r.urls]; }).toEqual([0, 0]);
});
