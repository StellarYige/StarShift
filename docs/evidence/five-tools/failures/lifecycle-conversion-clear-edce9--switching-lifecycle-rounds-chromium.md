# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lifecycle.spec.ts >> conversion, clear, retry and tool switching lifecycle rounds
- Location: tests\matrix\lifecycle.spec.ts:70:1

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "chromium"
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
        - generic [ref=f1e37]:
          - heading "DOCX 转 PDF" [level=1] [ref=f1e38]
          - paragraph [ref=f1e39]: 文档排版，妥善保留
        - generic [ref=f1e40]: 本地处理
    - generic [ref=f1e44]:
      - generic [ref=f1e45]:
        - generic [ref=f1e46]: "1"
        - text: 选择文件
      - generic [ref=f1e48]:
        - generic [ref=f1e49]: "2"
        - text: 调整设置
      - generic [ref=f1e51]:
        - generic [ref=f1e52]: "3"
        - text: 转换与下载
    - generic [ref=f1e53]:
      - generic [ref=f1e54]:
        - generic [ref=f1e55]:
          - heading "待处理文件 1" [level=2] [ref=f1e56]:
            - text: 待处理文件
            - generic [ref=f1e57]: "1"
          - button "清空任务" [ref=f1e58] [cursor=pointer]
        - button "选择待转换文件" [ref=f1e62]
        - button [ref=f1e63] [cursor=pointer]:
          - strong [ref=f1e66]: 继续添加文件
        - list [ref=f1e67]:
          - listitem [ref=f1e68]:
            - generic [ref=f1e73]:
              - strong [ref=f1e74]: 中文表格分页.docx
              - generic [ref=f1e75]:
                - text: 10 KB
                - generic [ref=f1e76]: ·
                - text: 处理失败
              - alert [ref=f1e77]: 转换失败：文档引擎启动超时（工作线程启动）。输入和设置已保留，可重新初始化后重试。
            - generic [ref=f1e78]:
              - button "重试 中文表格分页.docx" [ref=f1e79] [cursor=pointer]
              - button "移除 中文表格分页.docx" [ref=f1e83] [cursor=pointer]
      - complementary [ref=f1e87]:
        - generic [ref=f1e88]:
          - heading "转换设置" [level=2] [ref=f1e89]
          - generic [ref=f1e90]: OPTIONS
        - group [ref=f1e91]:
          - generic [ref=f1e92]:
            - text: LibreOffice 本地排版
            - paragraph [ref=f1e93]: 保留中文、内嵌图片、表格与基本分页，PDF 文字可选择。
            - paragraph [ref=f1e94]: 引擎与中文字体解压后资源体积约 266 MiB；实际下载量取决于压缩与浏览器缓存。首次加载和初始化可能需要数分钟，建议使用桌面 Chrome / Edge。
            - paragraph [ref=f1e95]: 使用 Noto 中文替代字体，特殊字体与复杂版式可能变化，请预览核对。外部图片与链接不会加载。
        - generic [ref=f1e96]:
          - button "开始转换" [ref=f1e97] [cursor=pointer]
          - generic [ref=f1e100]: 本地处理 · 不上传文件
    - alert [ref=f1e104]:
      - text: 文档引擎启动超时（工作线程启动）。输入和设置已保留，可重新初始化后重试。 已停止本批文档引擎，未处理文件和设置已保留，请显式重试。
      - button "关闭提示" [ref=f1e105] [cursor=pointer]
    - paragraph [ref=f1e109]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e110]:
    - generic [ref=f1e111]:
      - generic [ref=f1e112]: ✳ 星易 StarShift
      - generic [ref=f1e113]: 小工具，少一点门槛。
    - generic [ref=f1e114]:
      - link "MIT 开源" [ref=f1e115] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e116] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e117] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
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
  36  |     if (cdp) expect(references.live).toBe(0);
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
> 103 |     else { expect(browserName).not.toBe('chromium'); await expect(page.locator('.notice').last()).toContainText('不兼容'); }
      |                                    ^ Error: expect(received).not.toBe(expected) // Object.is equality
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
