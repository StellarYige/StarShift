import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFile, writeFile, open as openFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { unzipSync } from 'fflate';
import { execFileSync } from 'node:child_process';

async function open(page: Page, tool = '') {
  await page.goto(`./${tool ? '#' + tool : ''}`);
  await expect(page.locator('header')).toBeVisible();
}
async function select(page: Page, names: string[]) {
  await page.getByTestId('file-input').setInputFiles(names.map(n => `tests/fixtures/${n}`));
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
}
async function start(page: Page) {
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden({ timeout: 45000 });
}
async function download(page: Page, info: TestInfo, filename: string, nth = 0) {
  const waiting = page.waitForEvent('download');
  await page.locator('.result-list a[download]').nth(nth).click();
  const result = await waiting;
  await result.saveAs(info.outputPath(filename));
  return readFile(info.outputPath(filename));
}
async function zip(page: Page, info: TestInfo) {
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: '全部打包下载' }).click();
  const result = await waiting;
  await result.saveAs(info.outputPath('results.zip'));
  return unzipSync(await readFile(info.outputPath('results.zip')));
}

test('homepage, mobile, hash refresh and no eager engine download', async ({ page }, info) => {
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url()));
  await open(page);
  await expect(page.locator('.tool-card')).toHaveCount(5);
  await page.screenshot({ path: info.outputPath('home-desktop.png'), fullPage: true });
  expect(urls.some(u => u.includes('/engine/'))).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('home-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('a.tool-card[href="#image-convert"]').click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '图片格式互转', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('workspace-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('PNG transparency to JPG white fill, correct MIME, dimensions and download', async ({ page }, info) => {
  await open(page, 'image-convert');
  await select(page, ['transparent.png']);
  await page.getByLabel('输出格式').selectOption('jpg');
  await page.getByLabel('最大宽度').fill('60');
  await start(page);
  const bytes = await download(page, info, 'transparent.jpg');
  const metadata = await sharp(bytes).metadata();
  expect(metadata.format).toBe('jpeg'); expect(metadata.width).toBe(60); expect(metadata.height).toBe(40);
  const { data } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  // Lossy JPEG chroma subsampling may bleed a little color into a small transparent corner.
  expect(Math.min(...data.subarray(0, 3))).toBeGreaterThanOrEqual(240);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('dialog img')).toBeVisible();
});

test('PNG / WebP batch preserves alpha and duplicate names in ZIP', async ({ page }, info) => {
  await open(page, 'image-convert');
  await select(page, ['transparent.png', 'transparent.png', 'sample.webp']);
  await page.getByLabel('输出格式').selectOption('webp');
  await start(page);
  await expect(page.locator('.result-list li')).toHaveCount(3);
  const entries = await zip(page, info);
  expect(Object.keys(entries)).toEqual(['transparent.webp', 'transparent (2).webp', 'sample.webp']);
  for (const bytes of Object.values(entries)) {
    expect((await sharp(bytes).metadata()).format).toBe('webp');
    const { data, info: image } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(image.width).toBe(120); expect(image.height).toBe(80); expect(data[3]).toBe(0);
  }
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect(page.locator('.file-row')).toHaveCount(0); await expect(page.locator('.result-list li')).toHaveCount(0);
});

test('JPEG EXIF orientation then user rotation applied once', async ({ page }, info) => {
  await open(page, 'image-convert');
  await select(page, ['orientation-6.jpg']);
  await start(page);
  const first = await download(page, info, 'exif.png');
  expect((await sharp(first).metadata()).width).toBe(80); expect((await sharp(first).metadata()).height).toBe(120);
  const firstPixel = (await sharp(first).removeAlpha().raw().toBuffer()).subarray(0, 3);
  expect(firstPixel[0]).toBeGreaterThan(200); expect(firstPixel[1]).toBeGreaterThan(175); expect(firstPixel[2]).toBeLessThan(100);
  await page.getByRole('button', { name: '旋转 orientation-6.jpg', exact: true }).click();
  await page.getByRole('button', { name: '重新转换', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  const second = await download(page, info, 'rotated.png');
  expect((await sharp(second).metadata()).width).toBe(120); expect((await sharp(second).metadata()).height).toBe(80);
  const secondPixel = (await sharp(second).removeAlpha().raw().toBuffer()).subarray(0, 3);
  expect(secondPixel[0]).toBeLessThan(90); expect(secondPixel[1]).toBeGreaterThan(175);
});

test('images to PDF: order, EXIF, rotation, margins, paper and preview', async ({ page }, info) => {
  await open(page, 'image-pdf');
  await select(page, ['transparent.png', 'orientation-6.jpg']);
  await page.getByRole('button', { name: '向前移动 orientation-6.jpg' }).click();
  await page.getByLabel('纸张大小').selectOption('fit');
  await page.getByLabel('页边距（mm）').fill('0');
  await start(page);
  const bytes = await download(page, info, 'images.pdf');
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
  expect(doc.getPage(0).getSize()).toEqual({ width: 60, height: 90 });
  expect(doc.getPage(1).getSize()).toEqual({ width: 90, height: 60 });
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('dialog img')).toBeVisible();
  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  await page.screenshot({ path: info.outputPath('pdf-preview.png') });
});

test('PDF to images: selected pages, DPI and rotated page geometry', async ({ page }, info) => {
  await open(page, 'pdf-image');
  await select(page, ['vector-three-pages.pdf']);
  await page.getByLabel('选择页码').fill('2-3');
  await page.getByLabel('清晰度').selectOption('144');
  await page.getByLabel('输出格式').selectOption('jpg');
  await start(page);
  const entries = await zip(page, info);
  expect(Object.keys(entries)).toEqual(['vector-three-pages-第002页.jpg', 'vector-three-pages-第003页.jpg']);
  const [rotated, normal] = await Promise.all(Object.values(entries).map(bytes => sharp(bytes).metadata()));
  expect([rotated.width, rotated.height, rotated.format]).toEqual([800, 600, 'jpeg']);
  expect([normal.width, normal.height]).toEqual([600, 800]);
  const [green, blue] = await Promise.all(Object.values(entries).map(bytes => sharp(bytes).stats()));
  expect(green.channels[1].mean).toBeGreaterThan(green.channels[0].mean + 10);
  expect(blue.channels[2].mean).toBeGreaterThan(blue.channels[0].mean + 10);
});

test('PDF organization: merge, delete, select, reorder, rotate, split and vectors', async ({ page }, info) => {
  await open(page, 'pdf-organize');
  await select(page, ['vector-three-pages.pdf', 'vector-three-pages.pdf']);
  await expect(page.locator('.page-card')).toHaveCount(6);
  await page.getByRole('button', { name: '旋转页面 1', exact: true }).click();
  await page.getByRole('button', { name: '后移页面 1', exact: true }).click();
  await page.locator('.page-card input').nth(2).uncheck();
  await page.locator('.page-card input').nth(4).uncheck();
  await page.getByRole('button', { name: '导出选中页面' }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  const bytes = await download(page, info, 'organized.pdf');
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(4); expect(doc.getPage(0).getRotation().angle).toBe(90); expect(doc.getPage(1).getRotation().angle).toBe(90);
  const vectorCheck = JSON.parse(execFileSync('python', ['-c', 'import fitz,json,sys; d=fitz.open(sys.argv[1]); print(json.dumps({"text":[p.get_text().strip() for p in d],"paths":[len(p.get_drawings()) for p in d],"images":[len(p.get_images()) for p in d]}))', info.outputPath('organized.pdf')], { encoding: 'utf8' }));
  expect(vectorCheck.text).toEqual(['VECTOR PAGE 2', 'VECTOR PAGE 1', 'VECTOR PAGE 1', 'VECTOR PAGE 3']);
  expect(vectorCheck.paths.every((n: number) => n > 0)).toBe(true); expect(vectorCheck.images).toEqual([0, 0, 0, 0]);
  await page.getByLabel('输出方式').selectOption('split');
  await page.getByRole('button', { name: '重新转换' }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  const entries = await zip(page, info);
  expect(Object.keys(entries)).toHaveLength(4);
  for (const data of Object.values(entries)) expect((await PDFDocument.load(data)).getPageCount()).toBe(1);
  await page.getByRole('button', { name: '删除选中' }).click();
  await expect(page.locator('.page-card')).toHaveCount(2);
});

test('broken PDF, invalid range, retry and cancellation are explicit', async ({ page }) => {
  await open(page, 'pdf-image');
  await select(page, ['broken.pdf', 'vector-three-pages.pdf']);
  await page.getByLabel('选择页码').fill('999');
  await start(page);
  await expect(page.locator('.status-error')).toHaveCount(2);
  await page.getByLabel('选择页码').fill('1');
  await page.getByRole('button', { name: '重试 vector-three-pages.pdf' }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await page.getByRole('button', { name: '重新转换' }).click();
  const cancel = page.getByRole('button', { name: '取消任务' });
  if (await cancel.isVisible()) { await cancel.click(); await expect(cancel).toBeHidden(); }
  await expect(page.getByRole('button', { name: '清空任务' })).toBeEnabled();
});

test('local-only network audit while converting user-named files', async ({ page, context }, info) => {
  const network: { url: string; method: string; body: boolean }[] = [];
  context.on('request', r => { network.push({ url: r.url(), method: r.method(), body: r.postData() !== null }); });
  await open(page, 'image-convert');
  await page.getByTestId('file-input').setInputFiles({ name: 'PRIVATE-SENTINEL-name.png', mimeType: 'image/png', buffer: await readFile('tests/fixtures/transparent.png') });
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await start(page); await zip(page, info);
  expect(network.every(r => r.method === 'GET' && !r.body && !r.url.includes('PRIVATE-SENTINEL'))).toBe(true);
  expect(network.filter(r => /^https?:/.test(r.url)).every(r => new URL(r.url).origin === new URL(page.url()).origin)).toBe(true);
  await writeFile(info.outputPath('network.json'), JSON.stringify(network, null, 2));
});

test('encrypted PDF and oversized files receive explicit errors', async ({ page }, info) => {
  await open(page, 'pdf-image');
  await select(page, ['encrypted.pdf']);
  await start(page);
  await expect(page.locator('.file-row small')).toContainText('加密');
  await page.getByRole('button', { name: '清空任务' }).click();
  const largePath = info.outputPath('too-large.pdf');
  const largeFile = await openFile(largePath, 'w');
  await largeFile.truncate(100 * 1024 * 1024 + 1); await largeFile.close();
  await page.getByTestId('file-input').setInputFiles(largePath);
  await expect(page.locator('.notice')).toContainText('100 MB');
  await expect(page.locator('.file-row')).toHaveCount(0);
});

test('A4 landscape and millimetre margins produce the requested paper size', async ({ page }, info) => {
  await open(page, 'image-pdf');
  await select(page, ['transparent.png']);
  await page.getByLabel('纸张方向').selectOption('landscape');
  await page.getByLabel('页边距（mm）').fill('20');
  await start(page);
  const doc = await PDFDocument.load(await download(page, info, 'a4-landscape.pdf'));
  expect(doc.getPage(0).getWidth()).toBeCloseTo(841.89, 1);
  expect(doc.getPage(0).getHeight()).toBeCloseTo(595.28, 1);
  const box = JSON.parse(execFileSync('python', ['-c', 'import fitz,json,sys; d=fitz.open(sys.argv[1]); print(json.dumps(d[0].get_image_info()[0]["bbox"]))', info.outputPath('a4-landscape.pdf')], { encoding: 'utf8' }));
  expect(box[1]).toBeCloseTo(20 * 72 / 25.4, 1);
});
