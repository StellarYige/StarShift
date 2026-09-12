# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> DOCX startup uno observation, cancel and explicit reinitialization
- Location: tests\matrix\faults.spec.ts:14:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('.progress-panel')
Expected: "uno"
Received: "worker"
Timeout:  90000ms

Call log:
  - Expect "toHaveAttribute" locator('.progress-panel') with timeout 90000ms
  - waiting for locator('.progress-panel')
    - locator resolved to <div role="status" aria-live="polite" class="progress-panel" data-phase="document-check">…</div>
    - unexpected value "null"
    12 × locator resolved to <div role="status" aria-live="polite" class="progress-panel" data-phase="resource-load" data-startup-stage="resources">…</div>
       - unexpected value "resources"
    17 × locator resolved to <div role="status" aria-live="polite" class="progress-panel" data-phase="initialize" data-startup-stage="worker">…</div>
       - unexpected value "worker"

```

```yaml
- status: 正在启动文档工作线程…
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { open, select, convert, trackResources, resources, verifyDocx, evidence } from './helpers';
  3   |
  4   | type StartupFaultHost = Window & {
  5   |   __startupFault?: string; __pauseDownload?: boolean; __startupClockOffset?: number;
  6   |   __expireStartup?: () => void; __startupTimeoutMs?: number;
  7   |   __startupHeld?: string;
  8   | };
  9   | for (const { stage, finish } of [
  10  |   { stage: 'resources', finish: 'cancel' }, { stage: 'wasm', finish: 'cancel' },
  11  |   { stage: 'worker', finish: 'cancel' }, { stage: 'uno', finish: 'cancel' },
  12  |   { stage: 'worker', finish: 'timeout' }, { stage: 'resources', finish: 'timeout' },
  13  | ] as const) {
  14  |   test(`DOCX startup ${stage} observation, ${finish} and explicit reinitialization`, async ({ page, browserName }, info) => {
  15  |     test.skip(browserName !== 'chromium', 'Targeted startup injection on the supported engine; not a device compatibility claim.');
  16  |     await trackResources(page);
  17  |     await page.addInitScript(kind => {
  18  |       const host = top as StartupFaultHost;
  19  |       if (window === top) {
  20  |         host.__startupFault = kind; host.__startupClockOffset = 0;
  21  |         const now = performance.now.bind(performance);
  22  |         // Advance only the parent observer's clock. Engine clocks and native
  23  |         // deadlines keep real time; this is fault injection, not performance data.
  24  |         performance.now = () => now() + (host.__startupClockOffset || 0);
  25  |         const schedule = window.setTimeout.bind(window);
  26  |         window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
  27  |           if (delay === 240000 && typeof callback === 'function') {
  28  |             host.__startupTimeoutMs = delay;
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
> 71  |     await expect(panel).toHaveAttribute('data-startup-stage', stage, { timeout: 90000 });
      |                         ^ Error: expect(locator).toHaveAttribute(expected) failed
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
  129 |     await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
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
```
