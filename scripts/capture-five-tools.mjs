import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const [directory = 'test-results/screenshots', base = 'http://127.0.0.1:4187/StarShift/'] = process.argv.slice(2);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
const audit = [];
try {
  await page.goto(`${base}#image-pdf`);
  await page.getByTestId('file-input').setInputFiles(['tests/fixtures/transparent.png', 'tests/fixtures/orientation-6.jpg']);
  await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  await page.screenshot({ path: `${directory}/desktop-queue.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await page.getByRole('button', { name: '查看结果（1）' }).click();
  await expect(page.locator('#conversion-results')).toBeInViewport();
  await expect(page.locator('.results-jump')).toBeInViewport({ ratio: 1 });
  // Wait for the intentional smooth scroll before capturing fixed controls.
  await page.evaluate(() => new Promise(resolve => {
    let previous = scrollY, stable = 0;
    const check = () => { if (scrollY === previous) stable++; else stable = 0; previous = scrollY; if (stable >= 3) resolve(); else requestAnimationFrame(check); };
    requestAnimationFrame(check);
  }));
  audit.push(await page.evaluate(() => ({ stage: 'results', viewport: [innerWidth, innerHeight], bar: document.querySelector('.convert-actions').getBoundingClientRect().toJSON(), resultsButton: document.querySelector('.results-jump').getBoundingClientRect().toJSON() })));
  await page.screenshot({ path: `${directory}/mobile-results-viewport.png` });
  await page.screenshot({ path: `${directory}/mobile-results.png`, fullPage: true });
  await page.getByRole('button', { name: '预览', exact: true }).click(); await expect(page.locator('dialog img')).toBeVisible();
  await page.screenshot({ path: `${directory}/mobile-preview.png` });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('dialog img')).toBeVisible();
  await expect.poll(() => page.locator('dialog img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: `${directory}/mobile-preview-landscape.png` });
  await page.getByRole('button', { name: '关闭预览' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = 'pdf-organize'; });
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/vector-three-pages.pdf');
  await expect(page.locator('.page-card')).toHaveCount(3);
  await expect(page.locator('.page-card img').first()).toBeVisible();
  await page.screenshot({ path: `${directory}/mobile-page-editor.png`, fullPage: true });
  audit.push(await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth, smallButtons: [...document.querySelectorAll('.workspace-grid button, .workspace-grid a.button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map(e => ({ label: e.getAttribute('aria-label') || e.textContent, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })) })));
  for (const [tool, title] of [['docx-pdf', 'DOCX 转 PDF'], ['image-convert', '图片格式互转'], ['pdf-image', 'PDF 转图片']]) {
    await page.evaluate(id => { location.hash = id; }, tool);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    if (tool === 'image-convert') await page.getByLabel('输出格式').selectOption('jpg');
    const sizing = await page.evaluate(() => ({
      tool: location.hash,
      smallText: [...document.querySelectorAll('.hint,.docx-notes p,.local-tag,.page-toolbar strong,.input-caption,.field-value,footer,nav')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 12).map(e => ({ tag: e.tagName, class: e.className, size: getComputedStyle(e).fontSize })),
      smallControls: [...document.querySelectorAll('.settings-fields select,.settings-fields input:not([type=checkbox]),.back-link,.site-header a,footer a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map(e => ({ label: e.getAttribute('aria-label') || e.textContent, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })),
    }));
    expect(sizing.smallText).toEqual([]); expect(sizing.smallControls).toEqual([]); audit.push(sizing);
  }
} finally { await browser.close(); await writeFile(`${directory}/audit.json`, JSON.stringify(audit, null, 2)); }
