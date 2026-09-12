# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> cancel DOM canvas encoding then ignore the late result in another tool
- Location: tests\matrix\faults.spec.ts:290:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.result-list li')
Expected: 1
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
          - heading "待处理文件 1" [level=2] [ref=f1e58]:
            - text: 待处理文件
            - generic [ref=f1e59]: "1"
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
              - button "向后移动 transparent.png" [disabled] [ref=f1e81]
              - button "旋转 transparent.png" [ref=f1e84] [cursor=pointer]
              - button "移到指定位置 transparent.png" [ref=f1e88] [cursor=pointer]: 移到…
              - button "重试 transparent.png" [ref=f1e89] [cursor=pointer]
              - button "移除 transparent.png" [ref=f1e93] [cursor=pointer]
      - complementary [ref=f1e97]:
        - generic [ref=f1e98]:
          - heading "转换设置" [level=2] [ref=f1e99]
          - generic [ref=f1e100]: OPTIONS
        - group [ref=f1e101]:
          - generic [ref=f1e102]:
            - text: 纸张大小
            - combobox "纸张大小" [ref=f1e103]:
              - option "A4 · 210 × 297 mm" [selected]
              - option "Letter · 8.5 × 11 in"
              - option "适应图片尺寸"
          - generic [ref=f1e104]:
            - text: 纸张方向
            - combobox "纸张方向" [ref=f1e105]:
              - option "纵向" [selected]
              - option "横向"
          - generic [ref=f1e106]:
            - text: 页边距（mm）
            - spinbutton "页边距（mm）" [ref=f1e107]: "12"
          - paragraph [ref=f1e108]: 每张图片一页，按列表顺序排列。透明区域填充为白色。
        - generic [ref=f1e109]:
          - button "开始转换" [ref=f1e110] [cursor=pointer]
          - generic [ref=f1e113]: 本地处理 · 不上传文件
    - alert [ref=f1e117]:
      - text: 图片队列顺序失效，请重新转换。
      - button "关闭提示" [ref=f1e118] [cursor=pointer]
    - paragraph [ref=f1e122]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e123]:
    - generic [ref=f1e124]:
      - generic [ref=f1e125]: ✳ 星易 StarShift
      - generic [ref=f1e126]: 小工具，少一点门槛。
    - generic [ref=f1e127]:
      - link "MIT 开源" [ref=f1e128]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e129]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e130]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
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
> 312 |   await expect(page.locator('.result-list li')).toHaveCount(1);
      |                                                 ^ Error: expect(locator).toHaveCount(expected) failed
  313 |   await expect(page.locator('.result-list li')).toContainText('图片合辑.pdf');
  314 |   await page.getByRole('button', { name: '清空任务' }).click();
  315 |   await expect.poll(async () => (await resources(page)).urls).toBe(0);
  316 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  317 |   await evidence(info, 'canvas-cancellation.json', { after: await resources(page) });
  318 | });
  319 |
```
