# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lifecycle.spec.ts >> clear preserves settings and releases selected File and output Blob references
- Location: tests\matrix\lifecycle.spec.ts:4:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.result-list li').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.result-list li').first() with timeout 20000ms
  - waiting for locator('.result-list li').first()

```

```yaml
- banner:
  - link "星易 StarShift 首页":
    - /url: "#"
    - text: 星易 StarShift BETA
  - navigation "主导航":
    - link "全部工具":
      - /url: "#"
    - link "自行部署":
      - /url: https://github.com/StellarYige/StarShift#自行部署
    - link "GitHub":
      - /url: https://github.com/StellarYige/StarShift
- main:
  - link "全部工具":
    - /url: "#"
  - heading "图片转 PDF" [level=1]
  - paragraph: 散落的图片，整理成册
  - text: 本地处理 1 选择文件 2 调整设置 3 转换与下载
  - heading "待处理文件 1" [level=2]
  - button "清空任务"
  - button "选择待转换文件"
  - button "继续添加文件":
    - strong: 继续添加文件
  - list:
    - listitem:
      - strong: transparent.png
      - text: 1 KB · 处理失败
      - alert: 图片队列顺序失效，请重新转换。
      - button "向前移动 transparent.png" [disabled]
      - button "向后移动 transparent.png" [disabled]
      - button "旋转 transparent.png"
      - button "移到指定位置 transparent.png": 移到…
      - button "重试 transparent.png"
      - button "移除 transparent.png"
  - complementary:
    - heading "转换设置" [level=2]
    - text: OPTIONS
    - group:
      - text: 纸张大小
      - combobox "纸张大小":
        - option "A4 · 210 × 297 mm" [selected]
        - option "Letter · 8.5 × 11 in"
        - option "适应图片尺寸"
      - text: 纸张方向
      - combobox "纸张方向":
        - option "纵向" [selected]
        - option "横向"
      - text: 页边距（mm）
      - spinbutton "页边距（mm）": "12"
      - paragraph: 每张图片一页，按列表顺序排列。透明区域填充为白色。
    - button "开始转换"
    - text: 本地处理 · 不上传文件
  - alert:
    - text: 图片队列顺序失效，请重新转换。
    - button "关闭提示"
  - paragraph: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
- contentinfo:
  - text: ✳ 星易 StarShift 小工具，少一点门槛。
  - link "MIT 开源":
    - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
  - link "第三方许可":
    - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
  - link "反馈问题":
    - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { open, select, convert, trackResources, resources, evidence, verifyDocx } from './helpers';
  3   |
  4   | test('clear preserves settings and releases selected File and output Blob references', async ({ page, browserName, context }, info) => {
  5   |   await page.addInitScript(() => {
  6   |     if (window !== top) return;
  7   |     const refs: WeakRef<object>[] = [];
  8   |     (window as Window & { __releaseRefs?: WeakRef<object>[] }).__releaseRefs = refs;
  9   |     document.addEventListener('change', event => {
  10  |       if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
  11  |         for (const file of event.target.files || []) refs.push(new WeakRef(file));
  12  |       }
  13  |     }, true);
  14  |     const create = URL.createObjectURL.bind(URL);
  15  |     URL.createObjectURL = blob => { refs.push(new WeakRef(blob)); return create(blob); };
  16  |   });
  17  |   await open(page, 'image-convert');
  18  |   const cdp = browserName === 'chromium' ? await context.newCDPSession(page) : undefined;
  19  |   const samples = [];
  20  |   for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  21  |     await page.evaluate(id => { location.hash = id; }, tool);
  22  |     await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  23  |     if (tool === 'image-convert') await page.getByLabel('最大宽度').fill('60');
> 24  |     await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
      |                                                                                ^ Error: expect(locator).toBeVisible() failed
  25  |     await page.getByRole('button', { name: '清空任务' }).click();
  26  |     await expect(page.locator('.file-row, .result-list li, .page-card, dialog')).toHaveCount(0);
  27  |     if (tool === 'image-convert') await expect(page.getByLabel('最大宽度')).toHaveValue('60');
  28  |     // Allow React's unmount effects to complete before the explicit GC check.
  29  |     await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  30  |     if (cdp) await cdp.send('HeapProfiler.collectGarbage');
  31  |     const inspectReferences = () => page.evaluate(() => {
  32  |       const refs = (window as Window & { __releaseRefs?: WeakRef<object>[] }).__releaseRefs!;
  33  |       return { observed: refs.length, live: refs.filter(ref => ref.deref()).length };
  34  |     });
  35  |     const immediate = await inspectReferences(), cleanupStarted = Date.now();
  36  |     // A cancelled thumbnail may still be unwinding an asynchronous PDF open.
  37  |     // Preserve the immediate count, then require zero after cleanup, bounded
  38  |     // by the same assertion deadline; two animation frames are not completion.
  39  |     if (cdp) await expect.poll(async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await inspectReferences()).live; }).toBe(0);
  40  |     const references = await inspectReferences();
  41  |     expect(references.observed).toBeGreaterThan(0);
  42  |     if (cdp) expect(references.live).toBe(0);
  43  |     samples.push({ tool, forcedPageGc: !!cdp, immediate, cleanupMs: Date.now() - cleanupStarted, references });
  44  |   }
  45  |   await cdp?.detach();
  46  |   await evidence(info, 'clear-references.json', { samples, limitation: 'Firefox/WebKit have no forced GC in this test; live weak references there are not a leak assertion.' });
  47  | });
  48  |
  49  | test('failed PDF releases its Worker and allows a good retry', async ({ page }) => {
  50  |   await trackResources(page); await open(page, 'pdf-image');
  51  |   await select(page, ['broken.pdf']); await convert(page);
  52  |   await expect(page.locator('.status-error')).toHaveCount(1);
  53  |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  54  |   await page.getByRole('button', { name: '清空任务' }).click();
  55  |   await select(page, ['vector-three-pages.pdf']); await convert(page);
  56  |   await expect(page.locator('.result-list li')).toHaveCount(3);
  57  | });
  58  |
  59  | test('repeated ZIP download reuses one URL and clear releases timers and outputs', async ({ page }, info) => {
  60  |   await trackResources(page); await open(page, 'image-convert');
  61  |   await select(page, ['transparent.png']); await convert(page);
  62  |   const before = await resources(page);
  63  |   const samples = [];
  64  |   for (let i = 0; i < 3; i++) {
  65  |     const waiting = page.waitForEvent('download'); await page.getByRole('button', { name: '全部打包下载' }).click(); await waiting;
  66  |     samples.push(await resources(page));
  67  |   }
  68  |   expect(samples.map(r => r.urls)).toEqual([before.urls + 1, before.urls + 1, before.urls + 1]);
  69  |   expect(samples.map(r => r.created)).toEqual([before.created + 1, before.created + 1, before.created + 1]);
  70  |   await page.getByRole('button', { name: '清空任务' }).click();
  71  |   await expect(page.locator('.file-row, .result-list li, .zip-ready')).toHaveCount(0);
  72  |   await expect.poll(async () => ({ ...(await resources(page)), created: 0, ports: 0 })).toEqual({ workers: 0, urls: 0, created: 0, ports: 0, timers: 0, frames: 0 });
  73  |   await evidence(info, 'zip-lifecycle.json', { before, samples, after: await resources(page) });
  74  | });
  75  |
  76  | test('conversion, clear, retry and tool switching lifecycle rounds', async ({ page, browserName }, info) => {
  77  |   test.setTimeout(600000);
  78  |   await trackResources(page); await open(page, 'pdf-image');
  79  |   const samples = [];
  80  |   const rounds = browserName === 'chromium' ? 10 : 3;
  81  |   for (let i = 0; i < rounds; i++) {
  82  |     await page.evaluate(() => { location.hash = 'pdf-organize'; });
  83  |     await expect(page.getByRole('heading', { name: 'PDF 页面整理', exact: true })).toBeVisible();
  84  |     await page.evaluate(() => {
  85  |       const observer = new MutationObserver(() => {
  86  |         if (document.querySelector('.progress-panel')?.textContent?.includes('正在检查文件')) {
  87  |           observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
  88  |         }
  89  |       }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  90  |     });
  91  |     await select(page, ['vector-three-pages.pdf']);
  92  |     await expect(page.locator('.status-cancelled')).toHaveCount(1);
  93  |     await page.getByRole('button', { name: '清空任务' }).click();
  94  |     await page.evaluate(() => { location.hash = 'pdf-image'; });
  95  |     await select(page, ['vector-three-pages.pdf']); await page.getByLabel('选择页码').fill('999'); await convert(page);
  96  |     await expect(page.locator('.status-error')).toHaveCount(1);
  97  |     await page.getByLabel('选择页码').fill('1');
  98  |     await page.getByRole('button', { name: '重试 vector-three-pages.pdf' }).click();
  99  |     await expect(page.locator('.result-list li')).toHaveCount(1);
  100 |     await page.getByRole('button', { name: '预览', exact: true }).click(); await expect(page.locator('dialog img')).toBeVisible();
  101 |     await page.getByRole('button', { name: '关闭预览' }).click();
  102 |     await page.getByRole('button', { name: '清空任务' }).click();
  103 |     await page.evaluate(() => { location.hash = 'image-convert'; });
  104 |     await select(page, ['transparent.png']); await convert(page);
  105 |     await page.getByRole('button', { name: '清空任务' }).click();
  106 |     await page.evaluate(() => { location.hash = 'docx-pdf'; });
  107 |     await select(page, ['中文表格分页.docx']); await convert(page);
  108 |     if (await page.locator('.result-list li').count()) await verifyDocx(page, info, `round-${i + 1}.pdf`);
  109 |     else { expect(browserName).not.toBe('chromium'); await expect(page.locator('.notice').last()).toContainText('不兼容'); }
  110 |     await page.getByRole('button', { name: '清空任务' }).click();
  111 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  112 |     await expect.poll(async () => (await resources(page)).urls).toBe(0);
  113 |     samples.push(await resources(page));
  114 |   }
  115 |   expect(samples.every(r => r.workers === 0 && r.urls === 0 && r.frames === 0 && r.timers === 0)).toBe(true);
  116 |   expect(samples.at(-1)!.ports).toBe(samples[0].ports);
  117 |   await evidence(info, 'lifecycle.json', { rounds, samples });
  118 | });
  119 |
```
