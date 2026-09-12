import { test, expect } from '@playwright/test';
import { open, convert, evidence, download, readFile } from './helpers';
import { PDFDocument } from 'pdf-lib';
test('simulated touch file selection, multiple files, preview, rotation and download', async ({ page, browser }, info) => {
  await open(page, 'image-pdf');
  const waiting = page.waitForEvent('filechooser'); await page.locator('.drop-zone').tap();
  const chooser = await waiting; expect(chooser.isMultiple()).toBe(true);
  await chooser.setFiles(['tests/fixtures/transparent.png', 'tests/fixtures/sample.webp']);
  await expect(page.locator('.file-row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  const cancellation = page.waitForEvent('filechooser'); await page.locator('.drop-zone').tap(); await (await cancellation).setFiles([]);
  await expect(page.locator('.file-row')).toHaveCount(2);
  await page.getByRole('button', { name: '旋转 transparent.png', exact: true }).tap();
  await convert(page); const output = await download(page, info, 'mobile.pdf');
  expect((await PDFDocument.load(await readFile(output))).getPageCount()).toBe(2);
  await page.getByRole('button', { name: '预览', exact: true }).tap();
  await expect(page.locator('dialog img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '下一页' }).tap(); await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  // WebKit clips a fraction of the footer's box at the rounded dialog corners.
  // Verify the interactive contents are fully visible instead.
  await expect(page.locator('.preview-footer .pager')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.preview-footer a')).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath('portrait.png'), fullPage: true });
  const viewport = page.viewportSize()!; await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await expect(page.locator('.preview-footer .pager')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.preview-footer a')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: '关闭预览' })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath('landscape.png'), fullPage: true });
  await page.getByRole('button', { name: '关闭预览' }).tap(); await page.getByRole('button', { name: '清空任务' }).tap();
  await evidence(info, 'simulation.json', { simulated: true, actualPhone: false, project: info.project.name, version: browser.version(), fileChooser: 'automated; no real OS picker or photo library tested', downloads: 'actual saved PDF reopened with pdf-lib' });
});
