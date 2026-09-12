import { test, expect } from '@playwright/test';
import { open, select, convert, trackResources, resources, verifyDocx, evidence } from './helpers';

type StartupFaultHost = Window & {
  __startupFault?: string; __pauseDownload?: boolean; __startupClockOffset?: number;
  __expireStartup?: () => void; __startupTimeoutMs?: number;
  __startupHeld?: string;
};
for (const { stage, finish } of [
  { stage: 'resources', finish: 'cancel' }, { stage: 'wasm', finish: 'cancel' },
  { stage: 'worker', finish: 'cancel' }, { stage: 'uno', finish: 'cancel' },
  { stage: 'worker', finish: 'timeout' }, { stage: 'resources', finish: 'timeout' },
] as const) {
  test(`DOCX startup ${stage} observation, ${finish} and explicit reinitialization`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Targeted startup injection on the supported engine; not a device compatibility claim.');
    await trackResources(page);
    await page.addInitScript(kind => {
      const host = top as StartupFaultHost;
      if (window === top) {
        host.__startupFault = kind; host.__startupClockOffset = 0;
        const now = performance.now.bind(performance);
        // Advance only the parent observer's clock. Engine clocks and native
        // deadlines keep real time; this is fault injection, not performance data.
        performance.now = () => now() + (host.__startupClockOffset || 0);
        const schedule = window.setTimeout.bind(window);
        window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === 240000 && typeof callback === 'function') {
            host.__startupTimeoutMs = delay;
            host.__expireStartup = () => callback.apply(window, args);
          }
          return schedule(callback, delay, ...args);
        }) as typeof window.setTimeout;
      } else if (location.pathname.endsWith('/office/frame.html')) {
        const fetchResource = window.fetch;
        window.fetch = (input, options) => {
          if (host.__startupFault !== 'resources' || !String(input).includes('/fonts/')) return fetchResource(input, options);
          return Promise.resolve(new Response(new ReadableStream({
            start(controller) {
              const timer = setInterval(() => { if (!host.__pauseDownload) controller.enqueue(new Uint8Array(1024)); }, 80);
              options?.signal?.addEventListener('abort', () => { clearInterval(timer); controller.error(new DOMException('Cancelled', 'AbortError')); }, { once: true });
            },
          })));
        };
        const append = Node.prototype.appendChild;
        Node.prototype.appendChild = function<T extends Node>(node: T): T {
          if (host.__startupFault === 'wasm' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) {
            const module = (window as Window & { Module?: { preRun: (() => void)[]; addRunDependency: (id: string) => void } }).Module!;
            module.preRun.push(() => { module.addRunDependency('synthetic-startup-hold'); host.__startupHeld = 'wasm'; });
          }
          return append.call(this, node) as T;
        };
        const message = Object.getOwnPropertyDescriptor(MessagePort.prototype, 'onmessage')!;
        Object.defineProperty(MessagePort.prototype, 'onmessage', {
          ...message,
          set(callback) {
            message.set!.call(this, typeof callback === 'function' ? function(this: MessagePort, event: MessageEvent) {
              if (host.__startupFault === 'worker' && event.data?.cmd === 'ZetaHelper::thr_started') { host.__startupHeld = 'worker'; return; }
              if (host.__startupFault === 'uno' && event.data?.type === 'ready') { host.__startupHeld = 'uno'; return; }
              return callback.call(this, event);
            } : callback);
          },
        });
      }
    }, stage);
    await open(page, 'docx-pdf');
    await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
    const baseline = await resources(page);
    let frames = 0; page.on('frameattached', () => { frames++; });
    await page.getByRole('button', { name: '开始转换', exact: true }).click();
    const panel = page.locator('.progress-panel');
    await expect(panel).toHaveAttribute('data-startup-stage', stage, { timeout: 90000 });
    if (stage !== 'resources') await page.waitForFunction(expected => (window as StartupFaultHost).__startupHeld === expected, stage, { timeout: 90000 });
    if (stage === 'resources') {
      await expect(panel).toContainText('最近仍收到下载数据');
      await page.evaluate(async () => {
        const host = window as StartupFaultHost;
        for (let n = 0; n < 10; n++) { host.__startupClockOffset! += 6000; await new Promise(resolve => setTimeout(resolve, 100)); }
      });
      // Require a new body observation after the clock adjustment, not stale UI
      // from just before its final jump, before testing a still-active download.
      const bytes = panel.locator('span').filter({ hasText: /^已读取 / });
      const previousBytes = await bytes.textContent();
      await expect(bytes).not.toHaveText(previousBytes!);
      await expect(panel.locator('.startup-wait')).toHaveCount(0);
    }
    if (!(finish === 'timeout' && stage === 'resources')) {
      if (stage === 'worker' && finish === 'cancel') {
        await page.frames().find(frame => frame.url().includes('/office/frame.html'))!.evaluate(() => {
          const module = (window as Window & { Module?: { monitorRunDependencies: (count: number) => void } }).Module!;
          setInterval(() => module.monitorRunDependencies(0), 100);
        });
      }
      await page.evaluate(() => { (window as StartupFaultHost).__pauseDownload = true; });
      await page.waitForTimeout(700); // Let the last real body progress observation settle.
      await page.evaluate(() => { (window as StartupFaultHost).__startupClockOffset! += 31000; });
      await expect(panel.locator('.startup-wait')).toContainText(stage === 'resources' ? '部分下载无法持续报告进度' : '未收到新的初始化进展');
      await expect(panel.locator('.startup-wait')).toContainText('取消后重新初始化');
      await expect(page.locator('.status-working')).toHaveCount(1);
      await expect(page.locator('.status-ready')).toHaveCount(1);
      expect(frames).toBe(1); // Advisory never starts an automatic retry.
    }
    expect(await page.evaluate(() => (window as StartupFaultHost).__startupTimeoutMs)).toBe(240000);
    const observedMessage = await panel.textContent();
    if (stage === 'resources' && finish === 'cancel') {
      await page.setViewportSize({ width: 390, height: 844 });
      await panel.screenshot({ path: info.outputPath('startup-wait.png') });
      await page.setViewportSize({ width: 1365, height: 1000 });
      await page.evaluate(() => { (window as StartupFaultHost).__pauseDownload = false; });
      await expect(panel.locator('.startup-wait')).toHaveCount(0);
      await expect(panel).toContainText('最近仍收到下载数据');
      expect(frames).toBe(1);
    }
    if (finish === 'cancel') {
      await page.getByRole('button', { name: '取消任务', exact: true }).click();
      await expect(page.locator('.notice').last()).toContainText('输入和设置已保留');
      await expect(page.locator('.status-cancelled')).toHaveCount(2);
    } else {
      await page.evaluate(() => (window as StartupFaultHost).__expireStartup?.());
      await expect(page.locator('.notice').last()).toContainText(`启动超时（${stage === 'resources' ? '资源加载' : '工作线程启动'}）`);
      if (stage === 'resources') await expect(page.locator('.notice').last()).toContainText('仍收到下载进度');
      await expect(page.locator('.notice').last()).not.toContainText('减少文档大小');
      await expect(page.locator('.status-error')).toHaveCount(1);
      await expect(page.locator('.status-ready')).toHaveCount(1);
    }
    await expect(page.locator('.file-row')).toHaveCount(2);
    await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
    const released = await resources(page);
    await page.evaluate(() => { const host = window as StartupFaultHost; host.__startupFault = ''; host.__expireStartup = undefined; });
    await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
    await verifyDocx(page, info); expect(frames).toBe(2);
    await expect(page.locator('.startup-wait, iframe')).toHaveCount(0);
    await page.evaluate(() => { location.hash = 'image-convert'; });
    await select(page, ['transparent.png']); await convert(page);
    await expect(page.locator('.result-list li')).toHaveCount(1);
    await page.getByRole('button', { name: '清空任务' }).click();
    await expect.poll(async () => ({ ...(await resources(page)), created: 0 })).toEqual({ ...baseline, created: 0 });
    await evidence(info, 'startup-observation.json', { stage, finish, method: 'Deterministic stage hold and parent observer clock offset; not a natural hang or speed measurement.', observedMessage, resumingDownloadClearsAdvisory: stage === 'resources' && finish === 'cancel' ? true : undefined, repeatedDependencyStateDoesNotResetWait: stage === 'worker' && finish === 'cancel' ? true : undefined, nativeInitializationTimeoutMs: 240000, frames, released, afterToolSwitch: await resources(page), actualRetry: 'two DOCX outputs; first output independently verified' });
  });
}

for (const fault of ['download', 'script-download', 'initialize', 'timeout'] as const) {
  test(`${fault} failure stops the batch, preserves inputs, explicit retry recovers`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Chromium fault injection; other engines have separate actual compatibility and lifecycle runs.');
    await trackResources(page);
    await page.addInitScript(kind => {
      const host = top as Window & { __fault?: string };
      if (window === top) {
        host.__fault = kind;
        const original = window.setTimeout.bind(window);
        window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => original(fn, host.__fault === 'timeout' && ms === 240000 ? 200 : ms, ...args)) as typeof window.setTimeout;
      } else if (location.pathname.endsWith('/office/frame.html')) {
        const original = window.fetch;
        window.fetch = (input, init) => host.__fault === 'download' && String(input).includes('/fonts/') ? Promise.resolve(new Response('', { status: 503 })) : original(input, init);
        const append = Node.prototype.appendChild;
        Node.prototype.appendChild = function<T extends Node>(node: T): T {
          if (host.__fault === 'script-download' && node instanceof HTMLScriptElement && node.src.endsWith('/soffice.js')) node.src = new URL('missing-soffice.js', node.src).href;
          return append.call(this, node) as T;
        };
        const Native = Worker;
        window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { if (host.__fault === 'initialize') throw Error('Synthetic initialization failure'); super(url, options); } };
      }
    }, fault);
    await open(page, 'docx-pdf');
    await select(page, ['中文表格分页.docx', 'font-substitution.docx']);
    let frames = 0; page.on('frameattached', () => { frames++; });
    await convert(page);
    await expect(page.locator('.status-error')).toHaveCount(1);
    await expect(page.locator('.status-ready')).toHaveCount(1);
    await expect(page.locator('.notice').last()).toContainText({ download: '下载失败', 'script-download': '下载失败', initialize: '初始化失败', timeout: '超时' }[fault]);
    expect(frames).toBe(1);
    await expect.poll(async () => (await resources(page)).workers).toBe(0);
    await page.evaluate(() => { (window as Window & { __fault?: string }).__fault = ''; });
    await page.getByRole('button', { name: '重试 中文表格分页.docx' }).click();
    await expect(page.locator('.result-list li')).toHaveCount(1, { timeout: 240000 });
    await verifyDocx(page, info);
    await evidence(info, 'fault.json', { fault, frames, after: await resources(page), retry: 'actual conversion passed' });
    for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
      await page.evaluate(id => { location.hash = id; }, tool);
      await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
      await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
    }
  });
}

test('isolation unavailable explains DOCX and all other tools still convert', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'crossOriginIsolated', { value: false, configurable: true }));
  await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']);
  await expect(page.getByRole('button', { name: '开始转换' })).toBeDisabled();
  await expect(page.locator('.notice').first()).toContainText('安全隔离');
  for (const tool of ['image-convert', 'image-pdf', 'pdf-image', 'pdf-organize']) {
    await page.evaluate(id => { location.hash = id; }, tool);
    await select(page, [tool.startsWith('image') ? 'transparent.png' : 'vector-three-pages.pdf']);
    await convert(page); await expect(page.locator('.result-list li').first()).toBeVisible();
  }
});

test('one damaged DOCX between good files does not restart the shared engine', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'Exact engine-reuse assertion on the supported reference engine.');
  await open(page, 'docx-pdf');
  let frames = 0; page.on('frameattached', () => { frames++; });
  await select(page, ['中文表格分页.docx', 'broken.docx', 'font-substitution.docx']);
  await convert(page); await expect(page.locator('.result-list li')).toHaveCount(2);
  await expect(page.locator('.status-error')).toHaveCount(1); expect(frames).toBe(1);
  await verifyDocx(page, info); await expect(page.locator('iframe')).toHaveCount(0);
});

test('preview error clears on next page and closing during rendering cannot restore old state', async ({ page }) => {
  await trackResources(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
      const host = window as Window & { __failPreview?: boolean };
      if (host.__failPreview) { host.__failPreview = false; callback(null); return; }
      return original.call(this, callback, ...args);
    };
  });
  await open(page, 'image-pdf'); await select(page, ['transparent.png', 'sample.webp']); await convert(page);
  await page.evaluate(() => { (window as Window & { __failPreview?: boolean }).__failPreview = true; });
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('dialog [role=alert]')).toBeVisible();
  await page.getByRole('button', { name: '下一页' }).click();
  await expect(page.locator('dialog img')).toBeVisible();
  await expect(page.locator('dialog img')).toHaveAttribute('alt', /第 2 页/);
  await page.getByRole('button', { name: '上一页' }).click();
  await page.getByRole('button', { name: '关闭预览' }).click();
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await expect.poll(async () => (await resources(page)).urls).toBe(0);
  await expect(page.locator('dialog, .result-list li')).toHaveCount(0);
});

for (const stage of ['resource-load', 'initialize', 'import', 'export']) {
  test(`cancel during actual DOCX ${stage} cannot write into the next tool`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Stage cancellation requires the supported reference DOCX engine.');
    await trackResources(page);
    await page.addInitScript(target => {
      if (window !== top) return;
      const observer = new MutationObserver(() => {
        if (document.querySelector('.progress-panel')?.getAttribute('data-phase') === target) {
          observer.disconnect();
          (window as Window & { __cancelledStage?: string }).__cancelledStage = target;
          (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
        }
      });
      observer.observe(document, { childList: true, subtree: true, attributes: true });
    }, stage);
    await open(page, 'docx-pdf'); await select(page, ['中文表格分页.docx']); await convert(page);
    expect(await page.evaluate(() => (window as Window & { __cancelledStage?: string }).__cancelledStage)).toBe(stage);
    await expect(page.locator('.status-cancelled')).toHaveCount(1);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect.poll(async () => (await resources(page)).workers).toBe(0);
    await page.evaluate(() => { location.hash = 'image-convert'; });
    await select(page, ['transparent.png']); await convert(page);
    await expect(page.locator('.result-list li')).toHaveCount(1);
    await page.getByRole('button', { name: '清空任务' }).click();
    await evidence(info, 'cancellation.json', { stage, after: await resources(page) });
  });
}

test('cancel thumbnail generation then immediately use another tool', async ({ page }) => {
  await trackResources(page); await open(page, 'pdf-organize');
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.progress-panel')?.textContent?.includes('缩略图')) {
        observer.disconnect(); (document.querySelector('.convert-actions .cancel') as HTMLButtonElement | null)?.click();
      }
    }); observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await select(page, ['vector-three-pages.pdf']);
  await expect(page.locator('.status-cancelled')).toHaveCount(1);
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await page.evaluate(() => { location.hash = 'image-convert'; });
  await select(page, ['transparent.png']); await convert(page);
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await expect(page.locator('.page-card')).toHaveCount(0);
});

test('cancel DOM canvas encoding then ignore the late result in another tool', async ({ page }, info) => {
  await trackResources(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
    const host = window as Window & { __holdEncoding?: boolean; __releaseEncoding?: () => void };
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
      return encode.call(this, blob => {
        if (host.__holdEncoding) host.__releaseEncoding = () => { host.__releaseEncoding = undefined; callback(blob); };
        else callback(blob);
      }, ...args);
    };
  });
  await open(page, 'image-convert'); await select(page, ['transparent.png']);
  await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = true; });
  await page.getByRole('button', { name: '开始转换', exact: true }).click();
  await page.waitForFunction(() => !!(window as Window & { __releaseEncoding?: () => void }).__releaseEncoding);
  await page.getByRole('button', { name: '取消任务', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
  await page.evaluate(() => { (window as Window & { __holdEncoding?: boolean }).__holdEncoding = false; location.hash = 'image-pdf'; });
  await select(page, ['transparent.png']); await convert(page);
  await page.evaluate(() => { (window as Window & { __releaseEncoding?: () => void }).__releaseEncoding?.(); });
  await expect(page.locator('.result-list li')).toHaveCount(1);
  await expect(page.locator('.result-list li')).toContainText('图片合辑.pdf');
  await page.getByRole('button', { name: '清空任务' }).click();
  await expect.poll(async () => (await resources(page)).urls).toBe(0);
  await expect.poll(async () => (await resources(page)).workers).toBe(0);
  await evidence(info, 'canvas-cancellation.json', { after: await resources(page) });
});
