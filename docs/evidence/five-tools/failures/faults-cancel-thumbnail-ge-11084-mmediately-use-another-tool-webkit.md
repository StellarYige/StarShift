# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> cancel thumbnail generation then immediately use another tool
- Location: tests\matrix\faults.spec.ts:271:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.page-card[data-thumbnail-state="loading"]').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.page-card[data-thumbnail-state="loading"]').first() with timeout 20000ms
  - waiting for locator('.page-card[data-thumbnail-state="loading"]').first()

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
  - heading "PDF 页面整理" [level=1]
  - paragraph: 让每一页，各就各位
  - text: 本地处理 1 选择文件 2 调整设置 3 转换与下载
  - heading "待处理文件 1" [level=2]
  - button "清空任务"
  - button "选择待转换文件"
  - button "继续添加文件":
    - strong: 继续添加文件
  - list:
    - listitem:
      - strong: vector-three-pages.pdf
      - text: 1 KB · 等待转换 3 页
      - button "移除 vector-three-pages.pdf"
  - strong: 已选 3 / 3 页
  - button "全选"
  - button "反选"
  - button "删除选中"
  - group:
    - text: 按队列位置选择
    - textbox "队列位置范围":
      - /placeholder: 全部，例如 1-3,5
    - button "应用选择范围"
    - button "旋转选中页"
    - text: 移动到第 N 位
    - spinbutton "选中页目标位置": "1"
    - button "移动选中页"
    - paragraph: 范围只改变勾选状态，导出顺序取当前队列。移动位置按移走选中页后的队列计算，选中页内部顺序保留。
  - article:
    - checkbox "选择 vector-three-pages.pdf 第 1 页" [checked]
    - img "vector-three-pages.pdf 第 1 页缩略图"
    - strong: 位置 1 · 原第 1 页
    - text: vector-three-pages.pdf
    - button "前移页面 1" [disabled]
    - button "后移页面 1"
    - button "旋转页面 1"
  - article:
    - checkbox "选择 vector-three-pages.pdf 第 2 页" [checked]
    - img "vector-three-pages.pdf 第 2 页缩略图"
    - strong: 位置 2 · 原第 2 页
    - text: vector-three-pages.pdf
    - button "前移页面 2"
    - button "后移页面 2"
    - button "旋转页面 2"
  - article:
    - checkbox "选择 vector-three-pages.pdf 第 3 页" [checked]
    - img "vector-three-pages.pdf 第 3 页缩略图"
    - strong: 位置 3 · 原第 3 页
    - text: vector-three-pages.pdf
    - button "前移页面 3"
    - button "后移页面 3" [disabled]
    - button "旋转页面 3"
  - complementary:
    - heading "转换设置" [level=2]
    - text: OPTIONS
    - group:
      - text: 输出方式
      - combobox "输出方式":
        - option "合并选中页为一个 PDF" [selected]
        - option "每个选中页拆为单独 PDF"
      - paragraph: 勾选需要的页面，通过箭头排序和旋转。原文字和矢量内容保留。
      - paragraph: 首版不保留书签、交互表单、批注、链接与数字签名；请保留原文件。
    - button "导出选中页面"
    - text: 本地处理 · 不上传文件
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
  230 |   await page.getByRole('button', { name: '预览', exact: true }).click();
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
> 279 |   await expect(page.locator('.page-card[data-thumbnail-state="loading"]').first()).toBeVisible();
      |                                                                                    ^ Error: expect(locator).toBeVisible() failed
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
