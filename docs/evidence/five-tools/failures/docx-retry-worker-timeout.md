# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> DOCX startup resources observation, cancel and explicit reinitialization
- Location: tests\matrix\faults.spec.ts:14:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.result-list li')
Expected: 2
Received: 0
Timeout:  20000ms

Call log:
  - Expect "toHaveCount" locator('.result-list li') with timeout 20000ms
  - waiting for locator('.result-list li')
    43 × locator resolved to 0 elements
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
                - text: 已取消
              - generic [ref=f1e96]: 任务已取消，可以重试。
            - generic [ref=f1e97]:
              - button "重试 font-substitution.docx" [ref=f1e98] [cursor=pointer]
              - button "移除 font-substitution.docx" [ref=f1e102] [cursor=pointer]
      - complementary [ref=f1e106]:
        - generic [ref=f1e107]:
          - heading "转换设置" [level=2] [ref=f1e108]
          - generic [ref=f1e109]: OPTIONS
        - group [ref=f1e110]:
          - generic [ref=f1e111]:
            - text: LibreOffice 本地排版
            - paragraph [ref=f1e112]: 保留中文、内嵌图片、表格与基本分页，PDF 文字可选择。
            - paragraph [ref=f1e113]: 引擎与中文字体解压后资源体积约 266 MiB；实际下载量取决于压缩与浏览器缓存。首次加载和初始化可能需要数分钟，建议使用桌面 Chrome / Edge。
            - paragraph [ref=f1e114]: 使用 Noto 中文替代字体，特殊字体与复杂版式可能变化，请预览核对。外部图片与链接不会加载。
        - generic [ref=f1e115]:
          - button "开始转换" [ref=f1e116] [cursor=pointer]
          - generic [ref=f1e119]: 本地处理 · 不上传文件
    - alert [ref=f1e123]:
      - text: 文档引擎启动超时（工作线程启动）。输入和设置已保留，可重新初始化后重试。 已停止本批文档引擎，未处理文件和设置已保留，请显式重试。
      - button "关闭提示" [ref=f1e124] [cursor=pointer]
    - paragraph [ref=f1e128]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e129]:
    - generic [ref=f1e130]:
      - generic [ref=f1e131]: ✳ 星易 StarShift
      - generic [ref=f1e132]: 小工具，少一点门槛。
    - generic [ref=f1e133]:
      - link "MIT 开源" [ref=f1e134] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e135] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e136] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
  29  |             host.__expireStartup = () => callback.apply(window, args);
  30  |           }
  31  |           return schedule(callback, delay, ...args);
  32  |         }) as typeof window.setTimeout;
  33  |       } else if (location.pathname.endsWith('/office/frame.html')) {
  34  |         const fetchResource = window.fetch;
  35  |         window.fetch = (input, options) => {
  36  |           if (host.__startupFault !== 'resources' || !String(input).includes('/fonts/')) return fetchResource(input, options);
  37  |           return Promise.resolve(new Response(new ReadableStream({
  38  |             start(controller) {
  39  |               const timer = setInterval(() => { if (!host.__pauseDownload) controller.enqueue(new Uint8Array(1024)); }, 80);
  40  |               options?.signal?.addEventListener('abort', () => { clearInterval(timer); controller.error(new DOMException('Cancelled', 'AbortError')); }, { once: true });
  41  |             },
  42  |           })));
  43  |         };
  44  |         const append = Node.prototype.appendChild;
  45  |         Node.prototype.appendChild = function<T extends Node>(node: T): T {
  46  |           if (host.__startupFault === 'wasm' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) {
  47  |             const module = (window as Window & { Module?: { preRun: (() => void)[]; addRunDependency: (id: string) => void } }).Module!;
  48  |             module.preRun.push(() => { module.addRunDependency('synthetic-startup-hold'); host.__startupHeld = 'wasm'; });
  49  |           }
  50  |           return append.call(this, node) as T;
  51  |         };
  52  |         const message = Object.getOwnPropertyDescriptor(MessagePort.prototype, 'onmessage')!;
  53  |         Object.defineProperty(MessagePort.prototype, 'onmessage', {
  54  |           ...message,
  55  |           set(callback) {
  56  |             message.set!.call(this, typeof callback === 'function' ? function(this: MessagePort, event: MessageEvent) {
  57  |               if (host.__startupFault === 'worker' && event.data?.cmd === 'ZetaHelper::thr_started') { host.__startupHeld = 'worker'; return; }
  58  |               if (host.__startupFault === 'uno' && event.data?.type === 'ready') { host.__startupHeld = 'uno'; return; }
  59  |               return callback.call(this, event);
  60  |             } : callback);
  61  |           },
  62  |         });
  63  |       }
  64  |     }, stage);
  65  |     await open(page, 'docx-pdf');
  66  |     await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
  67  |     const baseline = await resources(page);
  68  |     let frames = 0; page.on('frameattached', () => { frames++; });
  69  |     await page.getByRole('button', { name: '开始转换', exact: true }).click();
  70  |     const panel = page.locator('.progress-panel');
  71  |     await expect(panel).toHaveAttribute('data-startup-stage', stage, { timeout: 90000 });
  72  |     if (stage !== 'resources') await page.waitForFunction(expected => (window as StartupFaultHost).__startupHeld === expected, stage, { timeout: 90000 });
  73  |     if (stage === 'resources') {
  74  |       await expect(panel).toContainText('最近仍收到下载数据');
  75  |       await page.evaluate(async () => {
  76  |         const host = window as StartupFaultHost;
  77  |         for (let n = 0; n < 10; n++) { host.__startupClockOffset! += 6000; await new Promise(resolve => setTimeout(resolve, 100)); }
  78  |       });
  79  |       // Require a new body observation after the clock adjustment, not stale UI
  80  |       // from just before its final jump, before testing a still-active download.
  81  |       const bytes = panel.locator('span').filter({ hasText: /^已读取 / });
  82  |       const previousBytes = await bytes.textContent();
  83  |       await expect(bytes).not.toHaveText(previousBytes!);
  84  |       await expect(panel.locator('.startup-wait')).toHaveCount(0);
  85  |     }
  86  |     if (!(finish === 'timeout' && stage === 'resources')) {
  87  |       if (stage === 'worker' && finish === 'cancel') {
  88  |         await page.frames().find(frame => frame.url().includes('/office/frame.html'))!.evaluate(() => {
  89  |           const module = (window as Window & { Module?: { monitorRunDependencies: (count: number) => void } }).Module!;
  90  |           setInterval(() => module.monitorRunDependencies(0), 100);
  91  |         });
  92  |       }
  93  |       await page.evaluate(() => { (window as StartupFaultHost).__pauseDownload = true; });
  94  |       await page.waitForTimeout(700); // Let the last real body progress observation settle.
  95  |       await page.evaluate(() => { (window as StartupFaultHost).__startupClockOffset! += 31000; });
  96  |       await expect(panel.locator('.startup-wait')).toContainText(stage === 'resources' ? '部分下载无法持续报告进度' : '未收到新的初始化进展');
  97  |       await expect(panel.locator('.startup-wait')).toContainText('取消后重新初始化');
  98  |       await expect(page.locator('.status-working')).toHaveCount(1);
  99  |       await expect(page.locator('.status-ready')).toHaveCount(1);
  100 |       expect(frames).toBe(1); // Advisory never starts an automatic retry.
  101 |     }
  102 |     expect(await page.evaluate(() => (window as StartupFaultHost).__startupTimeoutMs)).toBe(240000);
  103 |     const observedMessage = await panel.textContent();
  104 |     if (stage === 'resources' && finish === 'cancel') {
  105 |       await page.setViewportSize({ width: 390, height: 844 });
  106 |       await panel.screenshot({ path: info.outputPath('startup-wait.png') });
  107 |       await page.setViewportSize({ width: 1365, height: 1000 });
  108 |       await page.evaluate(() => { (window as StartupFaultHost).__pauseDownload = false; });
  109 |       await expect(panel.locator('.startup-wait')).toHaveCount(0);
  110 |       await expect(panel).toContainText('最近仍收到下载数据');
  111 |       expect(frames).toBe(1);
  112 |     }
  113 |     if (finish === 'cancel') {
  114 |       await page.getByRole('button', { name: '取消任务', exact: true }).click();
  115 |       await expect(page.locator('.notice').last()).toContainText('输入和设置已保留');
  116 |       await expect(page.locator('.status-cancelled')).toHaveCount(2);
  117 |     } else {
  118 |       await page.evaluate(() => (window as StartupFaultHost).__expireStartup?.());
  119 |       await expect(page.locator('.notice').last()).toContainText(`启动超时（${stage === 'resources' ? '资源加载' : '工作线程启动'}）`);
  120 |       if (stage === 'resources') await expect(page.locator('.notice').last()).toContainText('仍收到下载进度');
  121 |       await expect(page.locator('.notice').last()).not.toContainText('减少文档大小');
  122 |       await expect(page.locator('.status-error')).toHaveCount(1);
  123 |       await expect(page.locator('.status-ready')).toHaveCount(1);
  124 |     }
  125 |     await expect(page.locator('.file-row')).toHaveCount(2);
  126 |     await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
  127 |     const released = await resources(page);
  128 |     await page.evaluate(() => { const host = window as StartupFaultHost; host.__startupFault = ''; host.__expireStartup = undefined; });
> 129 |     await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
      |                                                                        ^ Error: expect(locator).toHaveCount(expected) failed
  130 |     await verifyDocx(page, info); expect(frames).toBe(2);
  131 |     await expect(page.locator('.startup-wait, iframe')).toHaveCount(0);
  132 |     await page.evaluate(() => { location.hash = 'image-convert'; });
  133 |     await select(page, ['transparent.png']); await convert(page);
  134 |     await expect(page.locator('.result-list li')).toHaveCount(1);
  135 |     await page.getByRole('button', { name: '清空任务' }).click();
  136 |     await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
  137 |     await evidence(info, 'startup-observation.json', { stage, finish, method: 'Deterministic stage hold and parent observer clock offset; not a natural hang or speed measurement.', observedMessage, resumingDownloadClearsAdvisory: stage === 'resources' && finish === 'cancel' ? true : undefined, repeatedDependencyStateDoesNotResetWait: stage === 'worker' && finish === 'cancel' ? true : undefined, nativeInitializationTimeoutMs: 240000, frames, released, afterToolSwitch: await resources(page), actualRetry: 'two DOCX outputs; first output independently verified' });
  138 |   });
  139 | }
  140 |
  141 | for (const fault of ['download', 'script-download', 'initialize', 'timeout'] as const) {
  142 |   test(`${fault} failure stops the batch, preserves inputs, explicit retry recovers`, async ({ page, browserName }, info) => {
  143 |     test.skip(browserName !== 'chromium', 'Chromium fault injection; other engines have separate actual compatibility and lifecycle runs.');
  144 |     await trackResources(page);
  145 |     await page.addInitScript(kind => {
  146 |       const host = top as Window & { __fault?: string };
  147 |       if (window === top) {
  148 |         host.__fault = kind;
  149 |         const original = window.setTimeout.bind(window);
  150 |         window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => original(fn, host.__fault === 'timeout' && ms === 240000 ? 200 : ms, ...args)) as typeof window.setTimeout;
  151 |       } else if (location.pathname.endsWith('/office/frame.html')) {
  152 |         const original = window.fetch;
  153 |         window.fetch = (input, init) => host.__fault === 'download' && String(input).includes('/fonts/') ? Promise.resolve(new Response('', { status: 503 })) : original(input, init);
  154 |         const append = Node.prototype.appendChild;
  155 |         Node.prototype.appendChild = function<T extends Node>(node: T): T {
  156 |           if (host.__fault === 'script-download' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) node.src = new URL('missing-soffice.js', node.src).href;
  157 |           return append.call(this, node) as T;
  158 |         };
  159 |         const Native = Worker;
  160 |         window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { if (host.__fault === 'initialize') throw Error('Synthetic initialization failure'); super(url, options); } };
  161 |       }
  162 |     }, fault);
  163 |     await open(page, 'docx-pdf');
  164 |     await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
  165 |     let frames = 0; page.on('frameattached', () => { frames++; });
  166 |     await convert(page);
  167 |     await expect(page.locator('.status-error')).toHaveCount(1);
  168 |     await expect(page.locator('.status-ready')).toHaveCount(1);
  169 |     await expect(page.locator('.notice').last()).toContainText({ download: '下载失败', 'script-download': '下载失败', initialize: '初始化失败', timeout: '超时' }[fault]);
  170 |     expect(frames).toBe(1);
  171 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  172 |     await page.evaluate(() => { (window as Window & { __fault?: string }).__fault = ''; });
  173 |     await page.getByRole('button', { name: '重试 中文表格分页.docx' }).click();
  174 |     await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 240000 });
  175 |     await verifyDocx(page, info);
  176 |     await evidence(info, 'fault.json', { fault, frames, after: await resources(page), retry: 'actual conversion passed' });
  177 |     for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  178 |       await page.evaluate(id => { location.hash = id; }, tool);
  179 |       await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  180 |       await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  181 |     }
  182 |   });
  183 | }
  184 |
  185 | test('isolation unavailable explains DOCX and all other tools still convert', async ({ page }) => {
  186 |   await page.addInitScript(() => Object.defineProperty(window, 'crossOriginIsolated', { value: false, configurable: true }));
  187 |   await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']);
  188 |   await expect(page.getByRole('button', { name: '开始转换' })).toBeDisabled();
  189 |   await expect(page.locator('.notice').first()).toContainText('安全隔离');
  190 |   for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  191 |     await page.evaluate(id => { location.hash = id; }, tool);
  192 |     await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  193 |     await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  194 |   }
  195 | });
  196 |
  197 | test('one damaged DOCX between good files does not restart the shared engine', async ({ page, browserName }, info) => {
  198 |   test.skip(browserName !== 'chromium', 'Exact engine-reuse assertion on the supported reference engine.');
  199 |   await open(page, 'docx-pdf');
  200 |   let frames = 0; page.on('frameattached', () => { frames++; });
  201 |   await select(page, ['中文表格分页.docx', 'broken.docx', 'font-substitution.docx']);
  202 |   await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  203 |   await expect(page.locator('.status-error')).toHaveCount(1); expect(frames).toBe(1);
  204 |   await verifyDocx(page, info); await expect(page.locator('iframe')).toHaveCount(0);
  205 | });
  206 |
  207 | test('preview error clears on next page and closing during rendering cannot restore old state', async ({ page }) => {
  208 |   await trackResources(page);
  209 |   await page.addInitScript(() => {
  210 |     const original = HTMLCanvasElement.prototype.toBlob;
  211 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  212 |       const host = window as Window & { __failPreview?: boolean };
  213 |       if (host.__failPreview) { host.__failPreview = false; callback(null); return; }
  214 |       return original.call(this, callback, ...args);
  215 |     };
  216 |   });
  217 |   await open(page, 'image-pdf'); await select(page, ['transparent.png', 'sample.webp']); await convert(page);
  218 |   await page.evaluate(() => { (window as Window & { __failPreview?: boolean }).__failPreview = true; });
  219 |   await page.getByRole('button', { name: '预览', exact: true }).click();
  220 |   await expect(page.locator('dialog [role=alert]')).toBeVisible();
  221 |   await page.getByRole('button', { name: '下一页' }).click();
  222 |   await expect(page.locator('dialog img')).toBeVisible();
  223 |   await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  224 |   await page.getByRole('button', { name: '上一页' }).click();
  225 |   await page.getByRole('button', { name: '关闭预览' }).click();
  226 |   await page.getByRole('button', { name: '清空任务' }).click();
  227 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  228 |   await expect.poll(async () => (await resources(page)).urls).toBe(0);
  229 |   await expect(page.locator('dialog, .result-list li')).toHaveCount(0);
```
