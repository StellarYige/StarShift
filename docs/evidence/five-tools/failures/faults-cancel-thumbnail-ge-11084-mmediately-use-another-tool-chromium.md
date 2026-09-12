# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> cancel thumbnail generation then immediately use another tool
- Location: tests\matrix\faults.spec.ts:260:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.status-cancelled')
Expected: 1
Received: 0
Timeout:  20000ms

Call log:
  - Expect "toHaveCount" locator('.status-cancelled') with timeout 20000ms
  - waiting for locator('.status-cancelled')
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
        - generic [ref=f1e56]:
          - heading "待处理文件 1" [level=2] [ref=f1e57]:
            - text: 待处理文件
            - generic [ref=f1e58]: "1"
          - button "清空任务" [ref=f1e59] [cursor=pointer]
        - button "选择待转换文件" [ref=f1e63]
        - button [ref=f1e64] [cursor=pointer]:
          - strong [ref=f1e67]: 继续添加文件
        - list [ref=f1e68]:
          - listitem [ref=f1e69]:
            - generic [ref=f1e74]:
              - strong [ref=f1e75]: vector-three-pages.pdf
              - generic [ref=f1e76]:
                - text: 1 KB
                - generic [ref=f1e77]: ·
                - text: 等待转换
              - generic [ref=f1e78]: 3 页
            - button "移除 vector-three-pages.pdf" [ref=f1e80] [cursor=pointer]
        - generic [ref=f1e84]:
          - generic [ref=f1e85]:
            - strong [ref=f1e86]: 已选 3 / 3 页
            - button "全选" [ref=f1e87] [cursor=pointer]
            - button "反选" [ref=f1e88] [cursor=pointer]
            - button "删除选中" [ref=f1e89] [cursor=pointer]
          - group [ref=f1e90]:
            - generic [ref=f1e91]:
              - generic [ref=f1e92]:
                - text: 按队列位置选择
                - textbox "队列位置范围" [ref=f1e93]:
                  - /placeholder: 全部，例如 1-3,5
              - button "应用选择范围" [ref=f1e94] [cursor=pointer]
            - generic [ref=f1e95]:
              - button "旋转选中页" [ref=f1e96] [cursor=pointer]
              - generic [ref=f1e97]:
                - text: 移动到第 N 位
                - spinbutton "选中页目标位置" [ref=f1e98]: "1"
              - button "移动选中页" [ref=f1e99] [cursor=pointer]
            - paragraph [ref=f1e100]: 范围只改变勾选状态，导出顺序取当前队列。移动位置按移走选中页后的队列计算，选中页内部顺序保留。
          - generic [ref=f1e101]:
            - article [ref=f1e102]:
              - generic [ref=f1e103] [cursor=pointer]:
                - checkbox "选择 vector-three-pages.pdf 第 1 页" [checked] [ref=f1e104]
                - img "vector-three-pages.pdf 第 1 页缩略图" [ref=f1e106]
                - strong [ref=f1e107]: 位置 1 · 原第 1 页
                - generic "vector-three-pages.pdf" [ref=f1e108]
              - generic [ref=f1e109]:
                - button "前移页面 1" [disabled] [ref=f1e110]
                - button "后移页面 1" [ref=f1e113] [cursor=pointer]
                - button "旋转页面 1" [ref=f1e116] [cursor=pointer]
            - article [ref=f1e120]:
              - generic [ref=f1e121] [cursor=pointer]:
                - checkbox "选择 vector-three-pages.pdf 第 2 页" [checked] [ref=f1e122]
                - img "vector-three-pages.pdf 第 2 页缩略图" [ref=f1e124]
                - strong [ref=f1e125]: 位置 2 · 原第 2 页
                - generic "vector-three-pages.pdf" [ref=f1e126]
              - generic [ref=f1e127]:
                - button "前移页面 2" [ref=f1e128] [cursor=pointer]
                - button "后移页面 2" [ref=f1e131] [cursor=pointer]
                - button "旋转页面 2" [ref=f1e134] [cursor=pointer]
            - article [ref=f1e138]:
              - generic [ref=f1e139] [cursor=pointer]:
                - checkbox "选择 vector-three-pages.pdf 第 3 页" [checked] [ref=f1e140]
                - img "vector-three-pages.pdf 第 3 页缩略图" [ref=f1e142]
                - strong [ref=f1e143]: 位置 3 · 原第 3 页
                - generic "vector-three-pages.pdf" [ref=f1e144]
              - generic [ref=f1e145]:
                - button "前移页面 3" [ref=f1e146] [cursor=pointer]
                - button "后移页面 3" [disabled] [ref=f1e149]
                - button "旋转页面 3" [ref=f1e152] [cursor=pointer]
      - complementary [ref=f1e156]:
        - generic [ref=f1e157]:
          - heading "转换设置" [level=2] [ref=f1e158]
          - generic [ref=f1e159]: OPTIONS
        - group [ref=f1e160]:
          - generic [ref=f1e161]:
            - text: 输出方式
            - combobox "输出方式" [ref=f1e162]:
              - option "合并选中页为一个 PDF" [selected]
              - option "每个选中页拆为单独 PDF"
          - paragraph [ref=f1e163]: 勾选需要的页面，通过箭头排序和旋转。原文字和矢量内容保留。
          - paragraph [ref=f1e164]: 首版不保留书签、交互表单、批注、链接与数字签名；请保留原文件。
        - generic [ref=f1e165]:
          - button "导出选中页面" [ref=f1e166] [cursor=pointer]
          - generic [ref=f1e169]: 本地处理 · 不上传文件
    - paragraph [ref=f1e173]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e174]:
    - generic [ref=f1e175]:
      - generic [ref=f1e176]: ✳ 星易 StarShift
      - generic [ref=f1e177]: 小工具，少一点门槛。
    - generic [ref=f1e178]:
      - link "MIT 开源" [ref=f1e179] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e180] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e181] [cursor=pointer]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
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
> 270 |
      |                                                   ^ Error: expect(locator).toHaveCount(expected) failed
  271 | test('cancel thumbnail generation then immediately use another tool', async ({ page }) => {
  272 |   await trackResources(page); await open(page, 'pdf-organize');
  273 |   await page.evaluate(() => {
  274 |     const observer = new MutationObserver(() => {
  275 |       if (document.querySelector('.progress-panel')?.textContent?.includes('缩略图')) {
  276 |         observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
  277 |       }
  278 |     }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  279 |   });
  280 |   await select(page, ['vector-three-pages.pdf']);
  281 |   await expect(page.locator('.status-cancelled')).toHaveCount(1);
  282 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  283 |   await page.evaluate(() => { location.hash = 'image-convert'; });
  284 |   await select(page, ['transparent.png']); await convert(page);
  285 |   await expect(page.locator('.result-list li')).toHaveCount(1);
  286 |   await expect(page.locator('.page-card')).toHaveCount(0);
  287 | });
  288 |
  289 | test('cancel DOM canvas encoding then ignore the late result in another tool', async ({ page }, info) => {
  290 |   await trackResources(page);
  291 |   await page.addInitScript(() => {
  292 |     Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
  293 |     const host = window as Window & { __holdEncoding?: boolean; __releaseEncoding?: () => void };
  294 |     const encode = HTMLCanvasElement.prototype.toBlob;
  295 |     HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
  296 |       return encode.call(this, blob => {
  297 |         if (host.__holdEncoding) host.__releaseEncoding = () => { host.__releaseEncoding = undefined; callback(blob); };
  298 |         else callback(blob);
  299 |       }, ...args);
  300 |     };
  301 |   });
  302 |   await open(page, 'image-convert'); await select(page, ['transparent.png']);
  303 |   await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = true; });
  304 |   await page.getByRole('button', { name: '开始转换', exact: true }).click();
  305 |   await page.waitForFunction(() => !!(window as Window & { __releaseEncoding?: () => void }).__releaseEncoding);
  306 |   await page.getByRole('button', { name: '取消任务', exact: true }).click();
  307 |   await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
  308 |   await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = false; location.hash = 'image-pdf'; });
  309 |   await select(page, ['transparent.png']); await convert(page);
  310 |   await page.evaluate(() => { (window as Window & { __releaseEncoding?: () => void }).__releaseEncoding?.(); });
  311 |   await expect(page.locator('.result-list li')).toHaveCount(1);
  312 |   await expect(page.locator('.result-list li')).toContainText('图片合辑.pdf');
  313 |   await page.getByRole('button', { name: '清空任务' }).click();
  314 |   await expect.poll(async () => (await resources(page)).urls).toBe(0);
  315 |   await expect.poll(async () => (await resources(page)).workers).toBe(0);
  316 |   await evidence(info, 'canvas-cancellation.json', { after: await resources(page) });
  317 | });
  318 |
```
