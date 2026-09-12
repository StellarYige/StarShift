# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lifecycle.spec.ts >> clear preserves settings and releases selected File and output Blob references
- Location: tests\matrix\lifecycle.spec.ts:4:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "星易 StarShift 首页" [ref=f1e5] [cursor=pointer]:
        - /url: "#"
        - generic [ref=f1e13]: 星易 StarShift
        - generic [ref=f1e14]: BETA
      - navigation "主导航" [ref=f1e15]:
        - link "全部工具" [ref=f1e16] [cursor=pointer]:
          - /url: "#"
        - link "自行部署" [ref=f1e17] [cursor=pointer]:
          - /url: https://github.com/StellarYige/StarShift#自行部署
        - link "GitHub" [ref=f1e21] [cursor=pointer]:
          - /url: https://github.com/StellarYige/StarShift
  - main [ref=f1e27]:
    - generic [ref=f1e28]:
      - link "全部工具" [ref=f1e29] [cursor=pointer]:
        - /url: "#"
      - generic [ref=f1e32]:
        - generic [ref=f1e38]:
          - heading "PDF 页面整理" [level=1] [ref=f1e39]
          - paragraph [ref=f1e40]: 让每一页，各就各位
        - generic [ref=f1e41]: 本地处理
    - generic [ref=f1e45]:
      - generic [ref=f1e46]:
        - generic [ref=f1e47]: "1"
        - text: 选择文件
      - generic [ref=f1e49]:
        - generic [ref=f1e50]: "2"
        - text: 调整设置
      - generic [ref=f1e52]:
        - generic [ref=f1e53]: "3"
        - text: 转换与下载
    - generic [ref=f1e54]:
      - generic [ref=f1e55]:
        - heading "待处理文件 0" [level=2] [ref=f1e57]:
          - text: 待处理文件
          - generic [ref=f1e58]: "0"
        - button "选择待转换文件" [ref=f1e59]
        - button "把文件拖到这里 或点击选择文件 PDF · 支持批量选择" [ref=f1e60] [cursor=pointer]:
          - strong [ref=f1e65]: 把文件拖到这里
          - generic [ref=f1e66]: 或点击选择文件
          - generic [ref=f1e67]: PDF · 支持批量选择
        - generic [ref=f1e68]:
          - generic [ref=f1e72]: 文件只留在你的浏览器中
          - generic [ref=f1e73]: ·
          - generic [ref=f1e74]: 无需注册
      - complementary [ref=f1e75]:
        - generic [ref=f1e76]:
          - heading "转换设置" [level=2] [ref=f1e77]
          - generic [ref=f1e78]: OPTIONS
        - group [ref=f1e79]:
          - generic [ref=f1e80]:
            - text: 输出方式
            - combobox "输出方式" [ref=f1e81]:
              - option "合并选中页为一个 PDF" [selected]
              - option "每个选中页拆为单独 PDF"
          - paragraph [ref=f1e82]: 勾选需要的页面，通过箭头排序和旋转。原文字和矢量内容保留。
          - paragraph [ref=f1e83]: 首版不保留书签、交互表单、批注、链接与数字签名；请保留原文件。
        - generic [ref=f1e84]:
          - button "导出选中页面" [disabled] [ref=f1e85]
          - generic [ref=f1e88]: 本地处理 · 不上传文件
    - paragraph [ref=f1e92]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e93]:
    - generic [ref=f1e94]:
      - generic [ref=f1e95]: ✳ 星易 StarShift
      - generic [ref=f1e96]: 小工具，少一点门槛。
    - generic [ref=f1e97]:
      - link "MIT 开源" [ref=f1e98] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e99] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e100] [cursor=pointer]:
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
  24  |     await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  25  |     await page.getByRole('button', { name: '清空任务' }).click();
  26  |     await expect(page.locator('.file-row, .result-list li, .page-card, dialog')).toHaveCount(0);
  27  |     if (tool === 'image-convert') await expect(page.getByLabel('最大宽度')).toHaveValue('60');
  28  |     // Allow React's unmount effects to complete before the explicit GC check.
  29  |     await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  30  |     if (cdp) await cdp.send('HeapProfiler.collectGarbage');
  31  |     const references = await page.evaluate(() => {
  32  |       const refs = (window as Window & { __releaseRefs?: WeakRef<object>[] }).__releaseRefs!;
  33  |       return { observed: refs.length, live: refs.filter(ref => ref.deref()).length };
  34  |     });
  35  |     expect(references.observed).toBeGreaterThan(0);
> 36  |     if (cdp) expect(references.live).toBe(0);
      |                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  37  |     samples.push({ tool, forcedPageGc: !!cdp, references });
  38  |   }
  39  |   await cdp?.detach();
  40  |   await evidence(info, 'clear-references.json', { samples, limitation: 'Firefox/WebKit have no forced GC in this test; live weak references there are not a leak assertion.' });
  41  | });
  42  |
  43  | test('failed PDF releases its Worker and allows a good retry', async ({ page }) => {
  44  |   await trackResources(page); await open(page, 'pdf-image');
  45  |   await select(page, ['broken.pdf']); await convert(page);
  46  |   await expect(page.locator('.status-error')).toHaveCount(1);
  47  |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  48  |   await page.getByRole('button', { name: '清空任务' }).click();
  49  |   await select(page, ['vector-three-pages.pdf']); await convert(page);
  50  |   await expect(page.locator('.result-list li')).toHaveCount(3);
  51  | });
  52  |
  53  | test('repeated ZIP download reuses one URL and clear releases timers and outputs', async ({ page }, info) => {
  54  |   await trackResources(page); await open(page, 'image-convert');
  55  |   await select(page, ['transparent.png']); await convert(page);
  56  |   const before = await resources(page);
  57  |   const samples = [];
  58  |   for (let i = 0; i < 3; i++) {
  59  |     const waiting = page.waitForEvent('download'); await page.getByRole('button', { name: '全部打包下载' }).click(); await waiting;
  60  |     samples.push(await resources(page));
  61  |   }
  62  |   expect(samples.map(r => r.urls)).toEqual([before.urls + 1, before.urls + 1, before.urls + 1]);
  63  |   expect(samples.map(r => r.created)).toEqual([before.created + 1, before.created + 1, before.created + 1]);
  64  |   await page.getByRole('button', { name: '清空任务' }).click();
  65  |   await expect(page.locator('.file-row, .result-list li, .zip-ready')).toHaveCount(0);
  66  |   await expect.poll(async () => ({ ...(await resources(page)), created: 0, ports: 0 })).toEqual({ workers: 0, urls: 0, created: 0, ports: 0, timers: 0, frames: 0 });
  67  |   await evidence(info, 'zip-lifecycle.json', { before, samples, after: await resources(page) });
  68  | });
  69  |
  70  | test('conversion, clear, retry and tool switching lifecycle rounds', async ({ page, browserName }, info) => {
  71  |   test.setTimeout(600000);
  72  |   await trackResources(page); await open(page, 'pdf-image');
  73  |   const samples = [];
  74  |   const rounds = browserName === 'chromium' ? 10 : 3;
  75  |   for (let i = 0; i < rounds; i++) {
  76  |     await page.evaluate(() => { location.hash = 'pdf-organize'; });
  77  |     await expect(page.getByRole('heading', { name: 'PDF 页面整理', exact: true })).toBeVisible();
  78  |     await page.evaluate(() => {
  79  |       const observer = new MutationObserver(() => {
  80  |         if (document.querySelector('.progress-panel')?.textContent?.includes('正在检查文件')) {
  81  |           observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
  82  |         }
  83  |       }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  84  |     });
  85  |     await select(page, ['vector-three-pages.pdf']);
  86  |     await expect(page.locator('.status-cancelled')).toHaveCount(1);
  87  |     await page.getByRole('button', { name: '清空任务' }).click();
  88  |     await page.evaluate(() => { location.hash = 'pdf-image'; });
  89  |     await select(page, ['vector-three-pages.pdf']); await page.getByLabel('选择页码').fill('999'); await convert(page);
  90  |     await expect(page.locator('.status-error')).toHaveCount(1);
  91  |     await page.getByLabel('选择页码').fill('1');
  92  |     await page.getByRole('button', { name: '重试 vector-three-pages.pdf' }).click();
  93  |     await expect(page.locator('.result-list li')).toHaveCount(1);
  94  |     await page.getByRole('button', { name: '预览', exact: true }).click(); await expect(page.locator('dialog img')).toBeVisible();
  95  |     await page.getByRole('button', { name: '关闭预览' }).click();
  96  |     await page.getByRole('button', { name: '清空任务' }).click();
  97  |     await page.evaluate(() => { location.hash = 'image-convert'; });
  98  |     await select(page, ['transparent.png']); await convert(page);
  99  |     await page.getByRole('button', { name: '清空任务' }).click();
  100 |     await page.evaluate(() => { location.hash = 'docx-pdf'; });
  101 |     await select(page, ['中文表格分页.docx']); await convert(page);
  102 |     if (await page.locator('.result-list li').count()) await verifyDocx(page, info, `round-${i + 1}.pdf`);
  103 |     else { expect(browserName).not.toBe('chromium'); await expect(page.locator('.notice').last()).toContainText('不兼容'); }
  104 |     await page.getByRole('button', { name: '清空任务' }).click();
  105 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  106 |     await expect.poll(async () => (await resources(page)).urls).toBe(0);
  107 |     samples.push(await resources(page));
  108 |   }
  109 |   expect(samples.every(r => r.workers === 0 && r.urls === 0 && r.frames === 0 && r.timers === 0)).toBe(true);
  110 |   expect(samples.at(-1)!.ports).toBe(samples[0].ports);
  111 |   await evidence(info, 'lifecycle.json', { rounds, samples });
  112 | });
  113 |
```
