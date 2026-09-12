import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { zipSync, unzipSync, strToU8 } from 'fflate';

test('DOCX to PDF: Chinese, image, table, pagination, local-only network and preview', async ({ page, context }, info) => {
  test.setTimeout(300000);
  const network: { url: string; method: string; body: boolean }[] = [];
  context.on('request', r => network.push({ url: r.url(), method: r.method(), body: r.postData() !== null }));
  await page.goto('./#docx-pdf');
  await expect(page.locator('header')).toBeVisible();
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await page.getByTestId('file-input').setInputFiles([
    { name: 'PRIVATE-DOCX-SENTINEL.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await readFile('tests/fixtures/external-reference.docx') },
    { name: 'FONT-SUBSTITUTION.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await readFile('tests/fixtures/font-substitution.docx') },
  ]);
  const started = Date.now();
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(2, { timeout: 240000 });
  const elapsed = Date.now() - started;
  const waiting = page.waitForEvent('download');
  await page.locator('.result-list a[download]').first().click();
  const download = await waiting;
  const outputPath = info.outputPath('chinese-output.pdf');
  await download.saveAs(outputPath);
  const verification = execFileSync('python', ['scripts/assert-docx-output.py', outputPath], { encoding: 'utf8' });
  expect(verification).toContain('PASS');
  const secondWaiting = page.waitForEvent('download');
  await page.locator('.result-list a[download]').nth(1).click();
  const second = await secondWaiting;
  await second.saveAs(info.outputPath('substituted-font.pdf'));
  expect(execFileSync('python', ['scripts/assert-docx-output.py', info.outputPath('substituted-font.pdf')], { encoding: 'utf8' })).toContain('PASS');
  await page.getByRole('button', { name: '预览', exact: true }).first().click();
  await expect(page.locator('dialog img')).toBeVisible();
  await page.screenshot({ path: info.outputPath('docx-preview.png') });
  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  expect(network.filter(r => /^https?:/.test(r.url)).every(r => new URL(r.url).origin === new URL(page.url()).origin)).toBe(true);
  expect(network.every(r => r.method === 'GET' && !r.body && !r.url.includes('PRIVATE-DOCX-SENTINEL') && !r.url.includes('example.invalid'))).toBe(true);
  expect(await page.locator('iframe[title="本地文档转换引擎"]').count()).toBe(0);
  await writeFile(info.outputPath('docx-network.json'), JSON.stringify({ elapsedMs: elapsed, requests: network }, null, 2));
});

test('DOCX rejects malformed and macro packages before loading engine', async ({ page }) => {
  const urls: string[] = []; page.on('request', r => urls.push(r.url()));
  await page.goto('./#docx-pdf'); await expect(page.locator('header')).toBeVisible();
  const entries = unzipSync(await readFile('tests/fixtures/中文表格分页.docx'));
  entries['word/vbaProject.bin'] = strToU8('synthetic macro marker; not executable');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'broken.docx', mimeType: 'application/zip', buffer: await readFile('tests/fixtures/broken.docx') },
    { name: 'macro.docx', mimeType: 'application/zip', buffer: Buffer.from(zipSync(entries)) },
  ]);
  await page.getByRole('button', { name: '开始转换' }).click();
  await expect(page.locator('.status-error')).toHaveCount(2);
  expect(urls.some(u => u.includes('/engine/'))).toBe(false);
});

test('DOCX engine loading can be cancelled and releases the frame', async ({ page }) => {
  await page.goto('./#docx-pdf'); await expect(page.locator('header')).toBeVisible();
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/中文表格分页.docx');
  await page.getByRole('button', { name: '开始转换' }).click();
  await expect(page.locator('iframe[title="本地文档转换引擎"]')).toHaveCount(1);
  await page.getByRole('button', { name: '取消任务' }).click();
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await expect(page.locator('iframe[title="本地文档转换引擎"]')).toHaveCount(0);
  await expect(page.locator('.status-cancelled')).toHaveCount(1);
});
