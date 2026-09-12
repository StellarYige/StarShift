# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> script-download failure stops the batch, preserves inputs, explicit retry recovers
- Location: tests\matrix\faults.spec.ts:142:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.result-list li')
Expected: 1
Received: 0
Timeout:  240000ms

Call log:
  - Expect "toHaveCount" locator('.result-list li') with timeout 240000ms
  - waiting for locator('.result-list li')
    470 × locator resolved to 0 elements
        - unexpected value "0"

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
          - heading "待处理文件 2" [level=2] [ref=f1e56]:
            - text: 待处理文件
            - generic [ref=f1e57]: "2"
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
          - listitem [ref=f1e87]:
            - generic [ref=f1e92]:
              - strong [ref=f1e93]: font-substitution.docx
              - generic [ref=f1e94]:
                - text: 10 KB
                - generic [ref=f1e95]: ·
                - text: 等待转换
            - button "移除 font-substitution.docx" [ref=f1e97] [cursor=pointer]
      - complementary [ref=f1e101]:
        - generic [ref=f1e102]:
          - heading "转换设置" [level=2] [ref=f1e103]
          - generic [ref=f1e104]: OPTIONS
        - group [ref=f1e105]:
          - generic [ref=f1e106]:
            - text: LibreOffice 本地排版
            - paragraph [ref=f1e107]: 保留中文、内嵌图片、表格与基本分页，PDF 文字可选择。
            - paragraph [ref=f1e108]: 引擎与中文字体解压后资源体积约 266 MiB；实际下载量取决于压缩与浏览器缓存。首次加载和初始化可能需要数分钟，建议使用桌面 Chrome / Edge。
            - paragraph [ref=f1e109]: 使用 Noto 中文替代字体，特殊字体与复杂版式可能变化，请预览核对。外部图片与链接不会加载。
        - generic [ref=f1e110]:
          - button "开始转换" [ref=f1e111] [cursor=pointer]
          - generic [ref=f1e114]: 本地处理 · 不上传文件
    - alert [ref=f1e118]:
      - text: 文档引擎启动超时（工作线程启动）。输入和设置已保留，可重新初始化后重试。 已停止本批文档引擎，未处理文件和设置已保留，请显式重试。
      - button "关闭提示" [ref=f1e119] [cursor=pointer]
    - paragraph [ref=f1e123]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e124]:
    - generic [ref=f1e125]:
      - generic [ref=f1e126]: ✳ 星易 StarShift
      - generic [ref=f1e127]: 小工具，少一点门槛。
    - generic [ref=f1e128]:
      - link "MIT 开源" [ref=f1e129] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e130] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e131] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
  74  |     let frames = 0; page.on('frameattached', () => { frames++; });
  75  |     await page.getByRole('button', { name: '开始转换', exact: true }).click();
  76  |     const panel = page.locator('.progress-panel');
  77  |     await expect(panel).toHaveAttribute('data-startup-stage', stage, { timeout: 90000 });
  78  |     if (stage !== 'resources') await page.waitForFunction(expected => (window as StartupFaultHost).__startupHeld === expected, stage, { timeout: 90000 });
  79  |     if (stage === 'resources') {
  80  |       await expect(panel).toContainText('最近仍收到下载数据');
  81  |       await page.evaluate(async () => {
  82  |         const host = window as StartupFaultHost;
  83  |         for (let n = 0; n < 10; n++) { host.__startupClockOffset! += 6000; await new Promise(resolve => setTimeout(resolve, 100)); }
  84  |       });
  85  |       // Require a new body observation after the clock adjustment, not stale UI
  86  |       // from just before its final jump, before testing a still-active download.
  87  |       const bytes = panel.locator('span').filter({ hasText: /^已读取 / });
  88  |       const previousBytes = await bytes.textContent();
  89  |       await expect(bytes).not.toHaveText(previousBytes!);
  90  |       await expect(panel.locator('.startup-wait')).toHaveCount(0);
  91  |     }
  92  |     if (!(finish === 'timeout' && stage === 'resources')) {
  93  |       if (stage === 'worker' && finish === 'cancel') {
  94  |         await page.frames().find(frame => frame.url().includes('/office/frame.html'))!.evaluate(() => {
  95  |           const module = (window as Window & { Module?: { monitorRunDependencies: (count: number) => void } }).Module!;
  96  |           setInterval(() => module.monitorRunDependencies(0), 100);
  97  |         });
  98  |       }
  99  |       await page.evaluate(() => { (window as StartupFaultHost).__pauseDownload = true; });
  100 |       await page.waitForTimeout(700); // Let the last real body progress observation settle.
  101 |       await page.evaluate(() => { (window as StartupFaultHost).__startupClockOffset! += 31000; });
  102 |       await expect(panel.locator('.startup-wait')).toContainText(stage === 'resources' ? '部分下载无法持续报告进度' : '未收到新的初始化进展');
  103 |       await expect(panel.locator('.startup-wait')).toContainText('取消后重新初始化');
  104 |       await expect(page.locator('.status-working')).toHaveCount(1);
  105 |       await expect(page.locator('.status-ready')).toHaveCount(1);
  106 |       expect(frames).toBe(1); // Advisory never starts an automatic retry.
  107 |     }
  108 |     expect(await page.evaluate(() => (window as StartupFaultHost).__startupTimeoutMs)).toBe(240000);
  109 |     const observedMessage = await panel.textContent();
  110 |     if (stage === 'resources' && finish === 'cancel') {
  111 |       await page.setViewportSize({ width: 390, height: 844 });
  112 |       await panel.screenshot({ path: info.outputPath('startup-wait.png') });
  113 |       await page.setViewportSize({ width: 1365, height: 1000 });
  114 |       await page.evaluate(() => { (window as StartupFaultHost).__pauseDownload = false; });
  115 |       await expect(panel.locator('.startup-wait')).toHaveCount(0);
  116 |       await expect(panel).toContainText('最近仍收到下载数据');
  117 |       expect(frames).toBe(1);
  118 |     }
  119 |     if (finish === 'cancel') {
  120 |       await page.getByRole('button', { name: '取消任务', exact: true }).click();
  121 |       await expect(page.locator('.notice').last()).toContainText('输入和设置已保留');
  122 |       await expect(page.locator('.status-cancelled')).toHaveCount(2);
  123 |     } else {
  124 |       await page.evaluate(() => (window as StartupFaultHost).__expireStartup?.());
  125 |       await expect(page.locator('.notice').last()).toContainText(`启动超时（${stage === 'resources' ? '资源加载' : '工作线程启动'}）`);
  126 |       if (stage === 'resources') await expect(page.locator('.notice').last()).toContainText('仍收到下载进度');
  127 |       await expect(page.locator('.notice').last()).not.toContainText('减少文档大小');
  128 |       await expect(page.locator('.status-error')).toHaveCount(1);
  129 |       await expect(page.locator('.status-ready')).toHaveCount(1);
  130 |     }
  131 |     await expect(page.locator('.file-row')).toHaveCount(2);
  132 |     await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
  133 |     const released = await resources(page);
  134 |     await page.evaluate(() => { const host = window as StartupFaultHost; host.__startupFault = ''; host.__expireStartup = undefined; });
  135 |     await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  136 |     await verifyDocx(page, info); expect(frames).toBe(2);
  137 |     await expect(page.locator('.startup-wait, iframe')).toHaveCount(0);
  138 |     await page.evaluate(() => { location.hash = 'image-convert'; });
  139 |     await select(page, ['transparent.png']); await convert(page);
  140 |     await expect(page.locator('.result-list li')).toHaveCount(1);
  141 |     await page.getByRole('button', { name: '清空任务' }).click();
  142 |     await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
  143 |     await evidence(info, 'startup-observation.json', { stage, finish, method: 'Deterministic stage hold and parent observer clock offset; not a natural hang or speed measurement.', observedMessage, resumingDownloadClearsAdvisory: stage === 'resources' && finish === 'cancel' ? true : undefined, repeatedDependencyStateDoesNotResetWait: stage === 'worker' && finish === 'cancel' ? true : undefined, nativeInitializationTimeoutMs: 240000, frames, released, afterToolSwitch: await resources(page), actualRetry: 'two DOCX outputs; first output independently verified' });
  144 |   });
  145 | }
  146 |
  147 | for (const fault of ['download', 'script-download', 'initialize', 'timeout'] as const) {
  148 |   test(`${fault} failure stops the batch, preserves inputs, explicit retry recovers`, async ({ page, browserName }, info) => {
  149 |     test.skip(browserName !== 'chromium', 'Chromium fault injection; other engines have separate actual compatibility and lifecycle runs.');
  150 |     await trackResources(page);
  151 |     await page.addInitScript(kind => {
  152 |       const host = top as Window & { __fault?: string };
  153 |       if (window === top) {
  154 |         host.__fault = kind;
  155 |         const original = window.setTimeout.bind(window);
  156 |         window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => original(fn, host.__fault === 'timeout' && ms === 240000 ? 200 : ms, ...args)) as typeof window.setTimeout;
  157 |       } else if (location.pathname.endsWith('/office/frame.html')) {
  158 |         const original = window.fetch;
  159 |         window.fetch = (input, init) => host.__fault === 'download' && String(input).includes('/fonts/') ? Promise.resolve(new Response('', { status: 503 })) : original(input, init);
  160 |         const append = Node.prototype.appendChild;
  161 |         Node.prototype.appendChild = function<T extends Node>(node: T): T {
  162 |           if (host.__fault === 'script-download' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) node.src = new URL('missing-soffice.js', node.src).href;
  163 |           return append.call(this, node) as T;
  164 |         };
  165 |         const Native = Worker;
  166 |         window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { if (host.__fault === 'initialize') throw Error('Synthetic initialization failure'); super(url, options); } };
  167 |       }
  168 |     }, fault);
  169 |     await open(page, 'docx-pdf');
  170 |     await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
  171 |     let frames = 0; page.on('frameattached', () => { frames++; });
  172 |     await convert(page);
  173 |     await expect(page.locator('.status-error')).toHaveCount(1);
> 174 |     await expect(page.locator('.status-ready')).toHaveCount(1);
      |                                                   ^ Error: expect(locator).toHaveCount(expected) failed
  175 |     await expect(page.locator('.notice').last()).toContainText({ download: '下载失败', 'script-download': '下载失败', initialize: '初始化失败', timeout: '超时' }[fault]);
  176 |     expect(frames).toBe(1);
  177 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  178 |     await page.evaluate(() => { (window as Window & { __fault?: string }).__fault = ''; });
  179 |     await page.getByRole('button', { name: '重试 中文表格分页.docx' }).click();
  180 |     await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 240000 });
  181 |     await verifyDocx(page, info);
  182 |     await evidence(info, 'fault.json', { fault, frames, after: await resources(page), retry: 'actual conversion passed' });
  183 |     for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  184 |       await page.evaluate(id => { location.hash = id; }, tool);
  185 |       await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  186 |       await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  187 |     }
  188 |   });
  189 | }
  190 |
  191 | test('isolation unavailable explains DOCX and all other tools still convert', async ({ page }) => {
  192 |   await page.addInitScript(() => Object.defineProperty(window, 'crossOriginIsolated', { value: false, configurable: true }));
  193 |   await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']);
  194 |   await expect(page.getByRole('button', { name: '开始转换' })).toBeDisabled();
  195 |   await expect(page.locator('.notice').first()).toContainText('安全隔离');
  196 |   for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  197 |     await page.evaluate(id => { location.hash = id; }, tool);
  198 |     await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  199 |     await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  200 |   }
  201 | });
  202 |
  203 | test('one damaged DOCX between good files does not restart the shared engine', async ({ page, browserName }, info) => {
  204 |   test.skip(browserName !== 'chromium', 'Exact engine-reuse assertion on the supported reference engine.');
  205 |   await open(page, 'docx-pdf');
  206 |   let frames = 0; page.on('frameattached', () => { frames++; });
  207 |   await select(page, ['中文表格分页.docx', 'broken.docx', 'font-substitution.docx']);
  208 |   await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  209 |   await expect(page.locator('.status-error')).toHaveCount(1); expect(frames).toBe(1);
  210 |   await verifyDocx(page, info); await expect(page.locator('iframe')).toHaveCount(0);
  211 | });
  212 |
  213 | test('preview error clears on next page and closing during rendering cannot restore old state', async ({ page }) => {
  214 |   await trackResources(page);
  215 |   await page.addInitScript(() => {
  216 |     const original = HTMLCanvasElement.prototype.toBlob;
  217 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  218 |       const host = window as Window & { __failPreview?: boolean };
  219 |       if (host.__failPreview) { host.__failPreview = false; callback(null); return; }
  220 |       return original.call(this, callback, ...args);
  221 |     };
  222 |   });
  223 |   await open(page, 'image-pdf'); await select(page, ['transparent.png', 'sample.webp']); await convert(page);
  224 |   await page.evaluate(() => { (window as Window & { __failPreview?: boolean }).__failPreview = true; });
  225 |   await page.getByRole('button', { name: '预览', exact: true }).click();
  226 |   await expect(page.locator('dialog [role=alert]')).toBeVisible();
  227 |   await page.getByRole('button', { name: '下一页' }).click();
  228 |   await expect(page.locator('dialog img')).toBeVisible();
  229 |   await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  230 |   await page.getByRole('button', { name: '上一页' }).click();
  231 |   await page.getByRole('button', { name: '关闭预览' }).click();
  232 |   await page.getByRole('button', { name: '清空任务' }).click();
  233 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  234 |   await expect.poll(async () => (await resources(page)).urls).toBe(0);
  235 |   await expect(page.locator('dialog, .result-list li')).toHaveCount(0);
  236 | });
  237 |
  238 | for (const stage of ['resource-load', 'initialize', 'import', 'export']) {
  239 |   test(`cancel during actual DOCX ${stage} cannot write into the next tool`, async ({ page, browserName }, info) => {
  240 |     test.skip(browserName !== 'chromium', 'Stage cancellation requires the supported reference DOCX engine.');
  241 |     await trackResources(page);
  242 |     await page.addInitScript(target => {
  243 |       if (window !== top) return;
  244 |       const observer = new MutationObserver(() => {
  245 |         if (document.querySelector('.progress-panel')?.getAttribute('data-phase') === target) {
  246 |           observer.disconnect();
  247 |           (window as Window & { __cancelledStage?: string }).__cancelledStage = target;
  248 |           (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
  249 |         }
  250 |       });
  251 |       observer.observe(document, { childList: true, subtree: true, attributes: true });
  252 |     }, stage);
  253 |     await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']); await convert(page);
  254 |     expect(await page.evaluate(() => (window as Window & { __cancelledStage?: string }).__cancelledStage)).toBe(stage);
  255 |     await expect(page.locator('.status-cancelled')).toHaveCount(1);
  256 |     await expect(page.locator('iframe')).toHaveCount(0);
  257 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  258 |     await page.evaluate(() => { location.hash = 'image-convert'; });
  259 |     await select(page, ['transparent.png']); await convert(page);
  260 |     await expect(page.locator('.result-list li')).toHaveCount(1);
  261 |     await page.getByRole('button', { name: '清空任务' }).click();
  262 |     await evidence(info, 'cancellation.json', { stage, after: await resources(page) });
  263 |   });
  264 | }
  265 |
  266 | test('cancel thumbnail generation then immediately use another tool', async ({ page }) => {
  267 |   await trackResources(page); await open(page, 'pdf-organize');
  268 |   await page.evaluate(() => {
  269 |     const observer = new MutationObserver(() => {
  270 |       if (document.querySelector('.progress-panel')?.textContent?.includes('缩略图')) {
  271 |         observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
  272 |       }
  273 |     }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  274 |   });
```
