# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: faults.spec.ts >> cancel during actual DOCX import cannot write into the next tool
- Location: tests\matrix\faults.spec.ts:91:3

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: expect(locator).toBeHidden() failed

Locator:  getByRole('button', { name: '取消任务', exact: true })
Expected: hidden
Received: visible
Timeout:  270000ms

Call log:
  - Expect "toBeHidden" getByRole('button', { name: '取消任务', exact: true }) with timeout 270000ms
  - waiting for getByRole('button', { name: '取消任务', exact: true })
    31 × locator resolved to <button class="button cancel">…</button>
       - unexpected value "visible"

```

```yaml
- button "取消任务"
```

# Test source

```ts
  1  | import { expect, type Page, type TestInfo } from '@playwright/test';
  2  | import { readFile, writeFile } from 'node:fs/promises';
  3  | import { execFileSync } from 'node:child_process';
  4  | export async function open(page: Page, tool: string) {
  5  |   await page.goto(`./#${tool}`); await expect(page.locator('header')).toBeVisible();
  6  | }
  7  | export async function select(page: Page, files: string[]) {
  8  |   await page.getByTestId('file-input').setInputFiles(files.map(f => `tests/fixtures/${f}`));
  9  |   await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden();
  10 | }
  11 | export async function convert(page: Page) {
  12 |   await page.getByRole('button', { name: /^(开始转换|重新转换|导出选中页面)$/ }).click();
> 13 |   await expect(page.getByRole('button', { name: '取消任务', exact: true })).toBeHidden({ timeout: 270000 });
     |                                                                         ^ Error: expect(locator).toBeHidden() failed
  14 | }
  15 | export async function download(page: Page, info: TestInfo, filename: string) {
  16 |   const waiting = page.waitForEvent('download'); await page.locator('.result-list a[download]').first().click();
  17 |   const result = await waiting; const file = info.outputPath(filename); await result.saveAs(file); return file;
  18 | }
  19 | export async function verifyDocx(page: Page, info: TestInfo, filename = 'output.pdf') {
  20 |   const output = await download(page, info, filename);
  21 |   expect(execFileSync('python', ['scripts/assert-docx-output.py', output], { encoding: 'utf8', windowsHide: true })).toContain('PASS');
  22 | }
  23 | export async function evidence(info: TestInfo, name: string, value: unknown) {
  24 |   const file = info.outputPath(name); await writeFile(file, JSON.stringify(value, null, 2));
  25 |   await info.attach(name, { path: file, contentType: 'application/json' });
  26 | }
  27 | export async function trackResources(page: Page) {
  28 |   await page.addInitScript(() => {
  29 |     const owner = top as Window & { __resources?: { workers: number; urls: Set<string>; created: number; ports: number; timers: Set<number> } };
  30 |     owner.__resources ??= { workers: 0, urls: new Set(), created: 0, ports: 0, timers: new Set() };
  31 |     const state = owner.__resources;
  32 |     const Original = Worker;
  33 |     window.Worker = class extends Original {
  34 |       private released = false;
  35 |       constructor(url: string | URL, options?: WorkerOptions) { super(url, options); state.workers++; state.created++; }
  36 |       terminate() { if (!this.released) { this.released = true; state.workers--; } super.terminate(); }
  37 |     };
  38 |     const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
  39 |     URL.createObjectURL = blob => { const url = create(blob); state.urls.add(url); return url; };
  40 |     URL.revokeObjectURL = url => { state.urls.delete(url); revoke(url); };
  41 |     const Channel = MessageChannel;
  42 |     window.MessageChannel = class extends Channel {
  43 |       constructor() { super(); for (const port of [this.port1, this.port2]) { state.ports++; let closed = false; const close = port.close.bind(port); port.close = () => { if (!closed) { closed = true; state.ports--; } close(); }; } }
  44 |     };
  45 |     if (window === top) {
  46 |       const start = window.setTimeout.bind(window), stop = window.clearTimeout.bind(window);
  47 |       window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
  48 |         const id = start(() => { state.timers.delete(id); if (typeof fn === 'function') fn(...args); }, delay);
  49 |         if (delay && delay >= 30000) state.timers.add(id); return id;
  50 |       }) as typeof window.setTimeout;
  51 |       window.clearTimeout = id => { if (typeof id === 'number') state.timers.delete(id); stop(id); };
  52 |     }
  53 |   });
  54 | }
  55 | export async function resources(page: Page) {
  56 |   return page.evaluate(() => {
  57 |     const r = (window as Window & { __resources?: { workers: number; urls: Set<string>; created: number; ports: number; timers: Set<number> } }).__resources!;
  58 |     return { workers: r.workers, urls: r.urls.size, created: r.created, ports: r.ports, timers: r.timers.size, frames: document.querySelectorAll('iframe').length };
  59 |   });
  60 | }
  61 | export { readFile };
  62 |
```
