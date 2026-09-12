# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: other-tools.spec.ts >> images to PDF: order, EXIF, rotation, margins, paper and preview
- Location: tests\e2e\conversions.spec.ts:102:1

# Error details

```
TimeoutError: page.waitForEvent: Timeout 20000ms exceeded while waiting for event "download"
=========================== logs ===========================
waiting for event "download"
============================================================
```

```
TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('.result-list a[download]').first()

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
              - strong [ref=f1e73]: orientation-6.jpg
              - generic [ref=f1e74]:
                - text: 2 KB
                - generic [ref=f1e75]: ·
                - text: 处理失败
              - alert [ref=f1e76]: 图片队列顺序失效，请重新转换。
            - generic [ref=f1e77]:
              - button "向前移动 orientation-6.jpg" [disabled] [ref=f1e78]
              - button "向后移动 orientation-6.jpg" [ref=f1e81] [cursor=pointer]
              - button "旋转 orientation-6.jpg" [ref=f1e84] [cursor=pointer]
              - button "移到指定位置 orientation-6.jpg" [ref=f1e88] [cursor=pointer]: 移到…
              - button "重试 orientation-6.jpg" [ref=f1e89] [cursor=pointer]
              - button "移除 orientation-6.jpg" [ref=f1e93] [cursor=pointer]
          - listitem [ref=f1e97]:
            - generic [ref=f1e99]:
              - strong [ref=f1e100]: transparent.png
              - generic [ref=f1e101]:
                - text: 1 KB
                - generic [ref=f1e102]: ·
                - text: 处理失败
              - alert [ref=f1e103]: 图片队列顺序失效，请重新转换。
            - generic [ref=f1e104]:
              - button "向前移动 transparent.png" [ref=f1e105] [cursor=pointer]
              - button "向后移动 transparent.png" [disabled] [ref=f1e108]
              - button "旋转 transparent.png" [ref=f1e111] [cursor=pointer]
              - button "移到指定位置 transparent.png" [ref=f1e115] [cursor=pointer]: 移到…
              - button "重试 transparent.png" [ref=f1e116] [cursor=pointer]
              - button "移除 transparent.png" [ref=f1e120] [cursor=pointer]
      - complementary [ref=f1e124]:
        - generic [ref=f1e125]:
          - heading "转换设置" [level=2] [ref=f1e126]
          - generic [ref=f1e127]: OPTIONS
        - group [ref=f1e128]:
          - generic [ref=f1e129]:
            - text: 纸张大小
            - combobox "纸张大小" [ref=f1e130]:
              - option "A4 · 210 × 297 mm"
              - option "Letter · 8.5 × 11 in"
              - option "适应图片尺寸" [selected]
          - generic [ref=f1e131]:
            - text: 页边距（mm）
            - spinbutton "页边距（mm）" [ref=f1e132]: "0"
          - paragraph [ref=f1e133]: 每张图片一页，按列表顺序排列。透明区域填充为白色。
        - generic [ref=f1e134]:
          - button "开始转换" [ref=f1e135] [cursor=pointer]
          - generic [ref=f1e138]: 本地处理 · 不上传文件
    - alert [ref=f1e142]:
      - text: 图片队列顺序失效，请重新转换。
      - button "关闭提示" [ref=f1e143] [cursor=pointer]
    - paragraph [ref=f1e147]: 为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。
  - contentinfo [ref=f1e148]:
    - generic [ref=f1e149]:
      - generic [ref=f1e150]: ✳ 星易 StarShift
      - generic [ref=f1e151]: 小工具，少一点门槛。
    - generic [ref=f1e152]:
      - link "MIT 开源" [ref=f1e153]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/LICENSE
      - link "第三方许可" [ref=f1e154]:
        - /url: https://github.com/StellarYige/StarShift/blob/main/THIRD_PARTY_NOTICES.md
      - link "反馈问题" [ref=f1e155]:
        - /url: https://github.com/StellarYige/StarShift/issues
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { readFile, writeFile, open as openFile } from 'node:fs/promises';
  3   | import { PDFDocument } from 'pdf-lib';
  4   | import sharp from 'sharp';
  5   | import { unzipSync } from 'fflate';
  6   | import { execFileSync } from 'node:child_process';
  7   |
  8   | async function open(page: Page, tool = '') {
  9   |   await page.goto(`./${tool ? '#' + tool : ''}`);
  10  |   await expect(page.locator('header')).toBeVisible();
  11  | }
  12  | async function select(page: Page, names: string[]) {
  13  |   await page.getByTestId('file-input').setInputFiles(names.map(n => `tests/fixtures/${n}`));
  14  |   await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
  15  | }
  16  | async function start(page: Page) {
  17  |   await page.getByRole('button', { name: '开始转换', exact: true }).click();
  18  |   await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden({ timeout: 45000 });
  19  | }
  20  | async function download(page: Page, info: TestInfo, filename: string, nth = 0) {
  21  |   const waiting = page.waitForEvent('download');
> 22  |   await page.locator('.result-list a[download]').nth(nth).click();
      |                                                           ^ TimeoutError: locator.click: Timeout 20000ms exceeded.
  23  |   const result = await waiting;
  24  |   await result.saveAs(info.outputPath(filename));
  25  |   return readFile(info.outputPath(filename));
  26  | }
  27  | async function zip(page: Page, info: TestInfo) {
  28  |   const waiting = page.waitForEvent('download');
  29  |   await page.getByRole('button', { name: '全部打包下载' }).click();
  30  |   const result = await waiting;
  31  |   await result.saveAs(info.outputPath('results.zip'));
  32  |   return unzipSync(await readFile(info.outputPath('results.zip')));
  33  | }
  34  |
  35  | test('homepage, mobile, hash refresh and no eager engine download', async ({ page }, info) => {
  36  |   const urls: string[] = [];
  37  |   page.on('request', r => urls.push(r.url()));
  38  |   await open(page);
  39  |   await expect(page.locator('.tool-card')).toHaveCount(5);
  40  |   await page.screenshot({ path: info.outputPath('home-desktop.png'), fullPage: true });
  41  |   expect(urls.some(u => u.includes('/engine/'))).toBe(false);
  42  |   await page.setViewportSize({ width: 390, height: 844 });
  43  |   await page.screenshot({ path: info.outputPath('home-mobile.png'), fullPage: true });
  44  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  45  |   await page.locator('a.tool-card[href="#image-convert"]').click();
  46  |   await page.reload();
  47  |   await expect(page.getByRole('heading', { name: '图片格式互转', exact: true })).toBeVisible();
  48  |   await page.screenshot({ path: info.outputPath('workspace-mobile.png'), fullPage: true });
  49  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  50  | });
  51  |
  52  | test('PNG transparency to JPG white fill, correct MIME, dimensions and download', async ({ page }, info) => {
  53  |   await open(page, 'image-convert');
  54  |   await select(page, ['transparent.png']);
  55  |   await page.getByLabel('输出格式').selectOption('jpg');
  56  |   await page.getByLabel('最大宽度').fill('60');
  57  |   await start(page);
  58  |   const bytes = await download(page, info, 'transparent.jpg');
  59  |   const metadata = await sharp(bytes).metadata();
  60  |   expect(metadata.format).toBe('jpeg'); expect(metadata.width).toBe(60); expect(metadata.height).toBe(40);
  61  |   const { data } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  62  |   // Lossy JPEG chroma subsampling may bleed a little color into a small transparent corner.
  63  |   expect(Math.min(...data.subarray(0, 3))).toBeGreaterThanOrEqual(240);
  64  |   await page.getByRole('button', { name: '预览', exact: true }).click();
  65  |   await expect(page.locator('dialog img')).toBeVisible();
  66  | });
  67  |
  68  | test('PNG / WebP batch preserves alpha and duplicate names in ZIP', async ({ page }, info) => {
  69  |   await open(page, 'image-convert');
  70  |   await select(page, ['transparent.png', 'transparent.png', 'sample.webp']);
  71  |   await page.getByLabel('输出格式').selectOption('webp');
  72  |   await start(page);
  73  |   await expect(page.locator('.result-list li')).toHaveCount(3);
  74  |   const entries = await zip(page, info);
  75  |   expect(Object.keys(entries)).toEqual(['transparent.webp', 'transparent (2).webp', 'sample.webp']);
  76  |   for (const bytes of Object.values(entries)) {
  77  |     expect((await sharp(bytes).metadata()).format).toBe('webp');
  78  |     const { data, info: image } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  79  |     expect(image.width).toBe(120); expect(image.height).toBe(80); expect(data[3]).toBe(0);
  80  |   }
  81  |   await page.getByRole('button', { name: '清空任务' }).click();
  82  |   await expect(page.locator('.file-row')).toHaveCount(0); await expect(page.locator('.result-list li')).toHaveCount(0);
  83  | });
  84  |
  85  | test('JPEG EXIF orientation then user rotation applied once', async ({ page }, info) => {
  86  |   await open(page, 'image-convert');
  87  |   await select(page, ['orientation-6.jpg']);
  88  |   await start(page);
  89  |   const first = await download(page, info, 'exif.png');
  90  |   expect((await sharp(first).metadata()).width).toBe(80); expect((await sharp(first).metadata()).height).toBe(120);
  91  |   const firstPixel = (await sharp(first).removeAlpha().raw().toBuffer()).subarray(0, 3);
  92  |   expect(firstPixel[0]).toBeGreaterThan(200); expect(firstPixel[1]).toBeGreaterThan(175); expect(firstPixel[2]).toBeLessThan(100);
  93  |   await page.getByRole('button', { name: '旋转 orientation-6.jpg', exact: true }).click();
  94  |   await page.getByRole('button', { name: '全部重新转换', exact: true }).click();
  95  |   await expect(page.getByRole('button', { name: '取消任务' })).toBeHidden();
  96  |   const second = await download(page, info, 'rotated.png');
  97  |   expect((await sharp(second).metadata()).width).toBe(120); expect((await sharp(second).metadata()).height).toBe(80);
  98  |   const secondPixel = (await sharp(second).removeAlpha().raw().toBuffer()).subarray(0, 3);
  99  |   expect(secondPixel[0]).toBeLessThan(90); expect(secondPixel[1]).toBeGreaterThan(175);
  100 | });
  101 |
  102 | test('images to PDF: order, EXIF, rotation, margins, paper and preview', async ({ page }, info) => {
  103 |   await open(page, 'image-pdf');
  104 |   await select(page, ['transparent.png', 'orientation-6.jpg']);
  105 |   await page.getByRole('button', { name: '向前移动 orientation-6.jpg' }).click();
  106 |   await page.getByLabel('纸张大小').selectOption('fit');
  107 |   await page.getByLabel('页边距（mm）').fill('0');
  108 |   await start(page);
  109 |   const bytes = await download(page, info, 'images.pdf');
  110 |   const doc = await PDFDocument.load(bytes);
  111 |   expect(doc.getPageCount()).toBe(2);
  112 |   expect(doc.getPage(0).getSize()).toEqual({ width: 60, height: 90 });
  113 |   expect(doc.getPage(1).getSize()).toEqual({ width: 90, height: 60 });
  114 |   await page.getByRole('button', { name: '预览', exact: true }).click();
  115 |   await expect(page.locator('dialog img')).toBeVisible();
  116 |   await page.getByRole('button', { name: '下一页' }).click();
  117 |   await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  118 |   await page.screenshot({ path: info.outputPath('pdf-preview.png') });
  119 | });
  120 |
  121 | test('PDF to images: selected pages, DPI and rotated page geometry', async ({ page }, info) => {
  122 |   await open(page, 'pdf-image');
```
