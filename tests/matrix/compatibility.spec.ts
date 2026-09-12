import { test, expect } from '@playwright/test';
import { open, select, convert, verifyDocx, evidence } from './helpers';
test('DOCX conversion attempt, output or explicit incompatibility, then another tool', async ({ page, browser }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const engineRequests: string[] = [];
  page.on('request', request => { if (/\/engine\/soffice\.(wasm|data|js)(?:$|\?)/.test(request.url())) engineRequests.push(new URL(request.url()).pathname); });
  try {
  await open(page, 'docx-pdf');
  await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
  await convert(page);
  const count = await page.locator('.result-list li').count();
  let result: string;
  if (count === 2) {
    result = 'DOCX conversion passed'; await verifyDocx(page, info);
    await page.getByRole('button', { name: '预览', exact: true }).first().click();
    await expect(page.locator('dialog img')).toBeVisible();
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
    await page.getByRole('button', { name: '关闭预览' }).click();
  } else {
    expect(info.project.name).toMatch(/^(firefox|webkit)$/);
    await expect(page.locator('.notice').last()).toContainText('不兼容');
    await expect(page.locator('.status-error')).toHaveCount(1);
    await expect(page.locator('.status-ready')).toHaveCount(1);
    result = 'DOCX incompatible; conversion did not pass';
    info.annotations.push({ type: 'DOCX incompatible', description: result });
  }
  await evidence(info, 'compatibility.json', { browser: info.project.name, version: browser.version(), result, simulated: false, engineRequests, rejectedBeforeEngineAllocation: count === 0 && engineRequests.length === 0 });
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: '清空任务' }).click();
  await page.evaluate(() => { location.hash = 'image-convert'; });
  await select(page, ['transparent.png']); await convert(page);
  await expect(page.locator('.result-list li')).toHaveCount(1);
  } finally {
    await evidence(info, 'engine-attempt.json', { browser: info.project.name, version: browser.version(), errors, isolated: page.isClosed() ? null : await page.evaluate(() => crossOriginIsolated).catch(() => null) });
  }
});
