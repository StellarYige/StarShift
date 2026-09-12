import { expect, type Page, type TestInfo } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
export async function open(page: Page, tool: string) {
  await page.goto(`./#${tool}`); await expect(page.locator('header')).toBeVisible();
}
export async function select(page: Page, files: string[]) {
  const titles: Record<string, string> = { 'docx-pdf': 'DOCX 转 PDF', 'image-pdf': '图片转 PDF', 'image-convert': '图片格式互转', 'pdf-image': 'PDF 转图片', 'pdf-organize': 'PDF 页面整理' };
  const title = titles[new URL(page.url()).hash.slice(1)];
  if (title) await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByTestId('file-input').setInputFiles(files.map(f => `tests/fixtures/${f}`));
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
}
export async function convert(page: Page) {
  await page.getByRole('button', { name: /^(开始转换|重新转换|导出选中页面)$/ }).click();
  await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden({ timeout: 270000 });
}
export async function download(page: Page, info: TestInfo, filename: string) {
  const waiting = page.waitForEvent('download'); await page.locator('.result-list a[download]').first().click();
  const result = await waiting; const file = info.outputPath(filename); await result.saveAs(file); return file;
}
export async function verifyDocx(page: Page, info: TestInfo, filename = 'output.pdf') {
  const output = await download(page, info, filename);
  expect(execFileSync('python', ['scripts/assert-docx-output.py', output], { encoding: 'utf8', windowsHide: true })).toContain('PASS');
}
export async function evidence(info: TestInfo, name: string, value: unknown) {
  const file = info.outputPath(name); await writeFile(file, JSON.stringify(value, null, 2));
  await info.attach(name, { path: file, contentType: 'application/json' });
}
export async function trackResources(page: Page) {
  await page.addInitScript(() => {
    const owner = top as Window & { __resources?: { workers: number; urls: Set<string>; created: number; ports: number; timers: Set<number> } };
    owner.__resources ??= { workers: 0, urls: new Set(), created: 0, ports: 0, timers: new Set() };
    const state = owner.__resources;
    const Original = Worker;
    window.Worker = class extends Original {
      private released = false;
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); state.workers++; state.created++; }
      terminate() { if (!this.released) { this.released = true; state.workers--; } super.terminate(); }
    };
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); state.urls.add(url); return url; };
    URL.revokeObjectURL = url => { state.urls.delete(url); revoke(url); };
    const Channel = MessageChannel;
    window.MessageChannel = class extends Channel {
      constructor() { super(); for (const port of [this.port1, this.port2]) { state.ports++; let closed = false; const close = port.close.bind(port); port.close = () => { if (!closed) { closed = true; state.ports--; } close(); }; } }
    };
    if (window === top) {
      const start = window.setTimeout.bind(window), stop = window.clearTimeout.bind(window);
      window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
        const id = start(() => { state.timers.delete(id); if (typeof fn === 'function') fn(...args); }, delay);
        if (delay && delay >= 30000) state.timers.add(id); return id;
      }) as typeof window.setTimeout;
      window.clearTimeout = id => { if (typeof id === 'number') state.timers.delete(id); stop(id); };
      const repeat = window.setInterval.bind(window), stopRepeat = window.clearInterval.bind(window);
      window.setInterval = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
        const id = repeat(fn, delay, ...args); state.timers.add(id); return id;
      }) as typeof window.setInterval;
      window.clearInterval = id => { if (typeof id === 'number') state.timers.delete(id); stopRepeat(id); };
    }
  });
}
export async function resources(page: Page) {
  return page.evaluate(() => {
    const r = (window as Window & { __resources?: { workers: number; urls: Set<string>; created: number; ports: number; timers: Set<number> } }).__resources!;
    return { workers: r.workers, urls: r.urls.size, created: r.created, ports: r.ports, timers: r.timers.size, frames: document.querySelectorAll('iframe').length };
  });
}
export { readFile };
