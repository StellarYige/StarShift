# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> preview error clears on next page and closing during rendering cannot restore old state
- Location: tests\matrix\faults.spec.ts:218:1

# Error details

```
TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '预览', exact: true })

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "星易 StarShift 首页" [ref=f1e5]:
        - /url: "#"
        - generic [ref=f1e13]: 星易 StarShift
        - generic [ref=f1e14]: BETA
      - navigation "主导航" [ref=f1e15]:
        - link "全部工具" [ref=f1e16]:
          - /url: "#"
        - link "自行部署" [ref=f1e17]:
          - /url: https://github.com/StellarYige/StarShift#自行部署
        - link "GitHub" [ref=f1e21]:
          - /url: https://github.com/StellarYige/StarShift
  - main [ref=f1e27]:
    - generic [ref=f1e28]:
      - link "全部工具" [ref=f1e29]:
        - /url: "#"
      - generic [ref=f1e32]:
        - generic [ref=f1e39]:
          - heading "图片转 PDF" [level=1] [ref=f1e40]
          - paragraph [ref=f1e41]: 散落的图片，整理成册
        - generic [ref=f1e42]: 本地处理
    - generic [ref=f1e46]:
      - generic [ref=f1e47]:
        - generic [ref=f1e48]: "1"
        - text: 选择文件
      - generic [ref=f1e50]:
        - generic [ref=f1e51]: "2"
        - text: 调整设置
      - generic [ref=f1e53]:
        - generic [ref=f1e54]: "3"
        - text: 转换与下载
    - generic [ref=f1e55]:
      - generic [ref=f1e56]:
        - generic [ref=f1e57]:
          - heading "待处理文件 2" [level=2] [ref=f1e58]:
            - text: 待处理文件
            - generic [ref=f1e59]: "2"
          - button "清空任务" [ref=f1e60] [cursor=pointer]
        - button "选择待转换文件" [ref=f1e64]
        - button [ref=f1e65] [cursor=pointer]:
          - strong [ref=f1e68]: 继续添加文件
        - list [ref=f1e69]:
          - listitem [ref=f1e70]:
            - generic [ref=f1e72]:
              - strong [ref=f1e73]: transparent.png
              - generic [ref=f1e74]:
                - text: 1 KB
                - generic [ref=f1e75]: ·
                - text: 处理失败
              - alert [ref=f1e76]: 图片队列顺序失效，请重新转换。
            - generic [ref=f1e77]:
              - button "向前移动 transparent.png" [disabled] [ref=f1e78]
              - button "向后移动 transparent.png" [ref=f1e81] [cursor=pointer]
              - button "旋转 transparent.png" [ref=f1e84] [cursor=pointer]
              - button "移到指定位置 transparent.png" [ref=f1e88] [cursor=pointer]: 移到…
              - button "重试 transparent.png" [ref=f1e89] [cursor=pointer]
              - button "移除 transparent.png" [ref=f1e93] [cursor=pointer]
          - listitem [ref=f1e97]:
            - generic [ref=f1e99]:
              - strong [ref=f1e100]: sample.webp
              - generic [ref=f1e101]:
                - text: 1 KB
                - generic [ref=f1e102]: ·
                - text: 处理失败
              - alert [ref=f1e103]: 图片队列顺序失效，请重新转换。
            - generic [ref=f1e104]:
              - button "向前移动 sample.webp" [ref=f1e105] [cursor=pointer]
              - button "向后移动 sample.webp" [disabled] [ref=f1e108]
              - button "旋转 sample.webp" [ref=f1e111] [cursor=pointer]
              - button "移到指定位置 sample.webp" [ref=f1e115] [cursor=pointer]: 移到…
              - button "重试 sample.webp" [ref=f1e116] [cursor=pointer]
              - button "移除 sample.webp" [ref=f1e120] [cursor=pointer]
      - complementary [ref=f1e124]:
        - generic [ref=f1e125]:
          - heading "转换设置" [level=2] [ref=f1e126]
          - generic [ref=f1e127]: OPTIONS
        - group [ref=f1e128]:
          - generic [ref=f1e129]:
            - text: 纸张大小
            - combobox "纸张大小" [ref=f1e130]:
              - option "A4 · 210 × 297 mm" [selected]
              - option "Letter · 8.5 × 11 in"
              - option "适应图片尺寸"
          - generic [ref=f1e131]:
            - text: 纸张方向
            - combobox "纸张方向" [ref=f1e132]:
              - option "纵向" [selected]
              - option "横向"
          - generic [ref=f1e133]:
            - text: 页边距（mm）
            - spinbutton "页边距（mm）" [ref=f1e134]: "12"
          - paragraph [ref=f1e135]: 每张图片一页，按列表顺序排列。透明区域填充为白色。
        - generic [ref=f1e136]:
          - button "开始转换" [ref=f1e137] [cursor=pointer]
          - generic [ref=f1e140]: 本地处理 · 不上传文件
    - alert [ref=f1e144]:
      - text: 图片队列顺序失效，请重新转换。
      - button "关闭提示" [ref=f1e145] [cursor=pointer]
    - paragraph [ref=f1e149]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e150]:
    - generic [ref=f1e151]:
      - generic [ref=f1e152]: ✳ 星易 StarShift
      - generic [ref=f1e153]: 小工具，少一点门槛。
    - generic [ref=f1e154]:
      - link "MIT 开源" [ref=f1e155]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e156]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e157]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
  130 |       await expect(page.locator('.notice').last()).toContainText(`启动超时（${stage === 'resources' ? '资源加载' : '工作线程启动'}）`);
  131 |       if (stage === 'resources') await expect(page.locator('.notice').last()).toContainText('仍收到下载进度');
  132 |       await expect(page.locator('.notice').last()).not.toContainText('减少文档大小');
  133 |       await expect(page.locator('.status-error')).toHaveCount(1);
  134 |       await expect(page.locator('.status-ready')).toHaveCount(1);
  135 |     }
  136 |     await expect(page.locator('.file-row')).toHaveCount(2);
  137 |     await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
  138 |     const released = await resources(page);
  139 |     await page.evaluate(() => { const host = window as StartupFaultHost; host.__startupFault = ''; host.__expireStartup = undefined; });
  140 |     await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  141 |     await verifyDocx(page, info); expect(frames).toBe(2);
  142 |     await expect(page.locator('.startup-wait, iframe')).toHaveCount(0);
  143 |     await page.evaluate(() => { location.hash = 'image-convert'; });
  144 |     await select(page, ['transparent.png']); await convert(page);
  145 |     await expect(page.locator('.result-list li')).toHaveCount(1);
  146 |     await page.getByRole('button', { name: '清空任务' }).click();
  147 |     await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
  148 |     await evidence(info, 'startup-observation.json', { stage, finish, method: 'Deterministic stage hold and parent observer clock offset; not a natural hang or speed measurement.', observedMessage, resumingDownloadClearsAdvisory: stage === 'resources' && finish === 'cancel' ? true : undefined, repeatedDependencyStateDoesNotResetWait: stage === 'worker' && finish === 'cancel' ? true : undefined, nativeInitializationTimeoutMs: 240000, frames, released, afterToolSwitch: await resources(page), actualRetry: 'two DOCX outputs; first output independently verified' });
  149 |   });
  150 | }
  151 |
  152 | for (const fault of ['download', 'script-download', 'initialize', 'timeout'] as const) {
  153 |   test(`${fault} failure stops the batch, preserves inputs, explicit retry recovers`, async ({ page, browserName }, info) => {
  154 |     test.skip(browserName !== 'chromium', 'Chromium fault injection; other engines have separate actual compatibility and lifecycle runs.');
  155 |     await trackResources(page);
  156 |     await page.addInitScript(kind => {
  157 |       const host = top as Window & { __fault?: string };
  158 |       if (window === top) {
  159 |         host.__fault = kind;
  160 |         const original = window.setTimeout.bind(window);
  161 |         window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => original(fn, host.__fault === 'timeout' && ms === 240000 ? 200 : ms, ...args)) as typeof window.setTimeout;
  162 |       } else if (location.pathname.endsWith('/office/frame.html')) {
  163 |         const original = window.fetch;
  164 |         window.fetch = (input, init) => host.__fault === 'download' && String(input).includes('/fonts/') ? Promise.resolve(new Response('', { status: 503 })) : original(input, init);
  165 |         const append = Node.prototype.appendChild;
  166 |         Node.prototype.appendChild = function<T extends Node>(node: T): T {
  167 |           if (host.__fault === 'script-download' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) node.src = new URL('missing-soffice.js', node.src).href;
  168 |           return append.call(this, node) as T;
  169 |         };
  170 |         const Native = Worker;
  171 |         window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { if (host.__fault === 'initialize') throw Error('Synthetic initialization failure'); super(url, options); } };
  172 |       }
  173 |     }, fault);
  174 |     await open(page, 'docx-pdf');
  175 |     await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
  176 |     let frames = 0; page.on('frameattached', () => { frames++; });
  177 |     await convert(page);
  178 |     await expect(page.locator('.status-error')).toHaveCount(1);
  179 |     await expect(page.locator('.status-ready')).toHaveCount(1);
  180 |     await expect(page.locator('.notice').last()).toContainText({ download: '下载失败', 'script-download': '下载失败', initialize: '初始化失败', timeout: '超时' }[fault]);
  181 |     expect(frames).toBe(1);
  182 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  183 |     await page.evaluate(() => { (window as Window & { __fault?: string }).__fault = ''; });
  184 |     await page.getByRole('button', { name: '重试 中文表格分页.docx' }).click();
  185 |     await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 240000 });
  186 |     await verifyDocx(page, info);
  187 |     await evidence(info, 'fault.json', { fault, frames, after: await resources(page), retry: 'actual conversion passed' });
  188 |     for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  189 |       await page.evaluate(id => { location.hash = id; }, tool);
  190 |       await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  191 |       await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  192 |     }
  193 |   });
  194 | }
  195 |
  196 | test('isolation unavailable explains DOCX and all other tools still convert', async ({ page }) => {
  197 |   await page.addInitScript(() => Object.defineProperty(window, 'crossOriginIsolated', { value: false, configurable: true }));
  198 |   await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']);
  199 |   await expect(page.getByRole('button', { name: '开始转换' })).toBeDisabled();
  200 |   await expect(page.locator('.notice').first()).toContainText('安全隔离');
  201 |   for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
  202 |     await page.evaluate(id => { location.hash = id; }, tool);
  203 |     await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
  204 |     await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  205 |   }
  206 | });
  207 |
  208 | test('one damaged DOCX between good files does not restart the shared engine', async ({ page, browserName }, info) => {
  209 |   test.skip(browserName !== 'chromium', 'Exact engine-reuse assertion on the supported reference engine.');
  210 |   await open(page, 'docx-pdf');
  211 |   let frames = 0; page.on('frameattached', () => { frames++; });
  212 |   await select(page, ['中文表格分页.docx', 'broken.docx', 'font-substitution.docx']);
  213 |   await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  214 |   await expect(page.locator('.status-error')).toHaveCount(1); expect(frames).toBe(1);
  215 |   await verifyDocx(page, info); await expect(page.locator('iframe')).toHaveCount(0);
  216 | });
  217 |
  218 | test('preview error clears on next page and closing during rendering cannot restore old state', async ({ page }) => {
  219 |   await trackResources(page);
  220 |   await page.addInitScript(() => {
  221 |     const original = HTMLCanvasElement.prototype.toBlob;
  222 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  223 |       const host = window as Window & { __failPreview?: boolean };
  224 |       if (host.__failPreview) { host.__failPreview = false; callback(null); return; }
  225 |       return original.call(this, callback, ...args);
  226 |     };
  227 |   });
  228 |   await open(page, 'image-pdf'); await select(page, ['transparent.png', 'sample.webp']); await convert(page);
  229 |   await page.evaluate(() => { (window as Window & { __failPreview?: boolean }).__failPreview = true; });
> 230 |   await page.getByRole('button', { name: '预览', exact: true }).click();
      |                                                               ^ TimeoutError: locator.click: Timeout 20000ms exceeded.
  231 |   await expect(page.locator('dialog [role=alert]')).toBeVisible();
  232 |   await page.getByRole('button', { name: '下一页' }).click();
  233 |   await expect(page.locator('dialog img')).toBeVisible();
  234 |   await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  235 |   await page.getByRole('button', { name: '上一页' }).click();
  236 |   await page.getByRole('button', { name: '关闭预览' }).click();
  237 |   await page.getByRole('button', { name: '清空任务' }).click();
  238 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  239 |   await expect.poll(async () => (await resources(page)).urls).toBe(0);
  240 |   await expect(page.locator('dialog, .result-list li')).toHaveCount(0);
  241 | });
  242 |
  243 | for (const stage of ['resource-load', 'initialize', 'import', 'export']) {
  244 |   test(`cancel during actual DOCX ${stage} cannot write into the next tool`, async ({ page, browserName }, info) => {
  245 |     test.skip(browserName !== 'chromium', 'Stage cancellation requires the supported reference DOCX engine.');
  246 |     await trackResources(page);
  247 |     await page.addInitScript(target => {
  248 |       if (window !== top) return;
  249 |       const observer = new MutationObserver(() => {
  250 |         if (document.querySelector('.progress-panel')?.getAttribute('data-phase') === target) {
  251 |           observer.disconnect();
  252 |           (window as Window & { __cancelledStage?: string }).__cancelledStage = target;
  253 |           (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
  254 |         }
  255 |       });
  256 |       observer.observe(document, { childList: true, subtree: true, attributes: true });
  257 |     }, stage);
  258 |     await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']); await convert(page);
  259 |     expect(await page.evaluate(() => (window as Window & { __cancelledStage?: string }).__cancelledStage)).toBe(stage);
  260 |     await expect(page.locator('.status-cancelled')).toHaveCount(1);
  261 |     await expect(page.locator('iframe')).toHaveCount(0);
  262 |     await expect.poll(async () => (await resources(page)).workers).toBe(0);
  263 |     await page.evaluate(() => { location.hash = 'image-convert'; });
  264 |     await select(page, ['transparent.png']); await convert(page);
  265 |     await expect(page.locator('.result-list li')).toHaveCount(1);
  266 |     await page.getByRole('button', { name: '清空任务' }).click();
  267 |     await evidence(info, 'cancellation.json', { stage, after: await resources(page) });
  268 |   });
  269 | }
  270 |
  271 | test('cancel thumbnail generation then immediately use another tool', async ({ page }) => {
  272 |   await trackResources(page);
  273 |   await page.addInitScript(() => {
  274 |     const encode = HTMLCanvasElement.prototype.toBlob;
  275 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) { return encode.call(this, blob => setTimeout(() => callback(blob), 400), ...args); };
  276 |   });
  277 |   await open(page, 'pdf-organize');
  278 |   await select(page, ['vector-three-pages.pdf']);
  279 |   await expect(page.locator('.page-card[data-thumbnail-state="loading"]').first()).toBeVisible();
  280 |   // Thumbnails are independent background work now. Clear cancels them while
  281 |   // keeping conversion settings; it does not cancel an already-ready input.
  282 |   await page.getByRole('button', { name: '清空任务' }).click();
  283 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  284 |   await page.evaluate(() => { location.hash = 'image-convert'; });
  285 |   await select(page, ['transparent.png']); await convert(page);
  286 |   await expect(page.locator('.result-list li')).toHaveCount(1);
  287 |   await expect(page.locator('.page-card')).toHaveCount(0);
  288 | });
  289 |
  290 | test('cancel DOM canvas encoding then ignore the late result in another tool', async ({ page }, info) => {
  291 |   await trackResources(page);
  292 |   await page.addInitScript(() => {
  293 |     Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
  294 |     const host = window as Window & { __holdEncoding?: boolean; __releaseEncoding?: () => void };
  295 |     const encode = HTMLCanvasElement.prototype.toBlob;
  296 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  297 |       return encode.call(this, blob => {
  298 |         if (host.__holdEncoding) host.__releaseEncoding = () => { host.__releaseEncoding = undefined; callback(blob); };
  299 |         else callback(blob);
  300 |       }, ...args);
  301 |     };
  302 |   });
  303 |   await open(page, 'image-convert'); await select(page, ['transparent.png']);
  304 |   await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = true; });
  305 |   await page.getByRole('button', { name: '开始转换', exact: true }).click();
  306 |   await page.waitForFunction(() => !!(window as Window & { __releaseEncoding?: () => void }).__releaseEncoding);
  307 |   await page.getByRole('button', { name: '取消任务', exact: true }).click();
  308 |   await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
  309 |   await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = false; location.hash = 'image-pdf'; });
  310 |   await select(page, ['transparent.png']); await convert(page);
  311 |   await page.evaluate(() => { (window as Window & { __releaseEncoding?: () => void }).__releaseEncoding?.(); });
  312 |   await expect(page.locator('.result-list li')).toHaveCount(1);
  313 |   await expect(page.locator('.result-list li')).toContainText('图片合辑.pdf');
  314 |   await page.getByRole('button', { name: '清空任务' }).click();
  315 |   await expect.poll(async () => (await resources(page)).urls).toBe(0);
  316 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  317 |   await evidence(info, 'canvas-cancellation.json', { after: await resources(page) });
  318 | });
  319 |
```
