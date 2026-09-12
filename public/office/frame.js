// StarShift MIT. Adapter 0.1.1-startup.1; engine, font and UNO thread URLs stay stable.
import { ZetaHelperMain } from '../engine/zetaHelper.js';

const root = new URL('../', import.meta.url);
const allowed = new Set(['engine/soffice.js', 'engine/soffice.wasm', 'engine/soffice.data', 'engine/soffice.data.js.metadata', 'fonts/NotoSansCJKsc-Regular.otf'].map(p => new URL(p, root).href));
const workers = new Set(), objectUrls = new Set(), requests = new Set(), ports = new Set(), timers = new Set();
const downloads = new AbortController();
let disposed = false, port, helper, fontTimer, font, currentId = 0, failed = false, resourceObserver;
const phase = (message, detail) => { if (!disposed && !failed) port?.postMessage({ type: 'progress', message, detail }); };
const completedResources = new Set();
const startup = { resourcesComplete: 0, runtimeInitialized: false, workersCreated: 0, workersLoaded: 0, runDependencies: undefined, downloadSequence: 0 };
let fontLoaded = false, helperStarted = false, documentReady = false, lastStartupReport = -Infinity;
function reportStartup(force = false, detail = {}) {
  if (disposed || failed || documentReady || !port) return;
  const now = performance.now();
  if (!force && now - lastStartupReport < 250) return;
  lastStartupReport = now;
  const stage = helperStarted ? 'uno' : startup.runtimeInitialized ? 'worker' : completedResources.size === allowed.size ? 'wasm' : 'resources';
  const message = stage === 'resources' ? fontLoaded ? '正在加载文档引擎资源…' : '正在加载中文字体…'
    : stage === 'wasm' ? '正在初始化文档排版引擎…'
    : stage === 'worker' ? '正在启动文档工作线程…' : '正在等待文档服务就绪…';
  phase(message, { phase: stage === 'resources' ? 'resource-load' : 'initialize', resource: fontLoaded ? 'engine' : 'font', ...detail, startup: { ...startup, stage } });
}
function resourceComplete(url) {
  if (!allowed.has(url) || completedResources.has(url)) return;
  completedResources.add(url); startup.resourcesComplete = completedResources.size;
  reportStartup(true);
}
// Only classify known startup capability failures; never expose engine strings,
// which may contain document data, in progress or diagnostics.
const incompatible = error => error instanceof WebAssembly.CompileError || (currentId === 0 && (
  /clipboard-(?:read|write).*Permission(?:Descriptor|Name)/i.test(String(error)) ||
  /current browser does not support OffscreenCanvas/i.test(String(error))
));
const fail = (code = 'initialize') => {
  if (disposed || failed) return;
  if (code !== 'document') failed = true;
  port?.postMessage({ type: 'error', id: currentId, code });
};
function dispose() {
  if (disposed) return;
  disposed = true;
  resourceObserver?.disconnect(); resourceObserver = undefined; completedResources.clear();
  clearInterval(fontTimer); font = undefined;
  timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers.clear();
  downloads.abort(); requests.forEach(xhr => xhr.abort()); requests.clear();
  workers.forEach(worker => worker.terminate()); workers.clear();
  helper?.thrPort?.close(); helper = undefined;
  ports.forEach(channelPort => channelPort.close()); ports.clear();
  port?.close(); port = undefined;
  objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls.clear();
}
addEventListener('starshift-dispose', dispose, { once: true });
addEventListener('pagehide', dispose, { once: true });
const NativeChannel = window.MessageChannel;
window.MessageChannel = class extends NativeChannel {
  constructor() { super(); ports.add(this.port1); ports.add(this.port2); }
};
for (const [start, stop] of [['setTimeout', 'clearTimeout'], ['setInterval', 'clearInterval']]) {
  const create = window[start].bind(window), clear = window[stop].bind(window);
  window[start] = (callback, delay, ...args) => {
    const id = create(typeof callback === 'function' ? (...values) => { if (start === 'setTimeout') timers.delete(id); callback.apply(window, values); } : callback, delay, ...args);
    timers.add(id); return id;
  };
  window[stop] = id => { timers.delete(id); clear(id); };
}
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
  constructor(...args) {
    super(...args); workers.add(this); startup.workersCreated++; reportStartup(true);
    // The pinned Emscripten runtime emits this fixed command after loading its
    // Worker. Observe the milestone only; never inspect other message payloads.
    let loaded = false;
    this.addEventListener('message', ({ data }) => {
      if (!loaded && data?.cmd === 'loaded') { loaded = true; startup.workersLoaded++; reportStartup(true); }
    });
    this.addEventListener('error', event => fail(incompatible(event.error || event.message) ? 'incompatible' : 'initialize'));
  }
  terminate() { workers.delete(this); super.terminate(); }
};
const createUrl = URL.createObjectURL.bind(URL), revokeUrl = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = blob => { const url = createUrl(blob); objectUrls.add(url); return url; };
URL.revokeObjectURL = url => { objectUrls.delete(url); revokeUrl(url); };
function assertResource(url, method = 'GET') {
  if (method.toUpperCase() !== 'GET' || !allowed.has(new URL(url instanceof Request ? url.url : String(url), location.href).href)) throw new Error('Blocked document network access');
}
const originalFetch = fetch.bind(window);
window.fetch = async (url, options) => {
  assertResource(url, options?.method || (url instanceof Request ? url.method : 'GET'));
  try {
    const response = await originalFetch(url, { ...options, signal: downloads.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) { fail('download'); throw new Error('Resource unavailable'); }
    // Return the original response: preserve WebAssembly.instantiateStreaming.
    return response;
  } catch (error) { if (!disposed) fail('download'); throw error; }
};
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  assertResource(url, method); requests.add(this);
  const resource = new URL(url, location.href).href;
  let loaded = 0;
  this.addEventListener('progress', event => {
    if (event.loaded > loaded) { loaded = event.loaded; startup.downloadSequence++; reportStartup(); }
  });
  this.addEventListener('error', () => fail('download'), { once: true });
  this.addEventListener('loadend', () => { requests.delete(this); if (!disposed && this.status !== 200) fail('download'); else if (!disposed) resourceComplete(resource); }, { once: true });
  return originalOpen.call(this, method, url, ...args);
};
window.WebSocket = class { constructor() { throw new Error('Blocked document network access'); } };
window.open = () => null;
if (navigator.permissions?.query) {
  const query = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = descriptor => query(descriptor).catch(error => {
    // This pinned engine queries these names on startup. Unsupported permission
    // names reject with TypeError; permission denial itself is not incompatibility.
    if (currentId === 0 && /^clipboard-(read|write)$/.test(descriptor.name) && error instanceof TypeError) fail('incompatible');
    throw error;
  });
}
addEventListener('error', event => { fail(event.target instanceof HTMLScriptElement ? 'download' : incompatible(event.error) ? 'incompatible' : 'initialize'); }, true);
addEventListener('unhandledrejection', event => { fail(incompatible(event.reason) ? 'incompatible' : 'initialize'); event.preventDefault(); });
for (const method of ['log', 'debug', 'info', 'warn', 'error']) console[method] = () => {};
// Completion only, never used as a claim of ongoing bytes or transfer volume.
// In particular, do not clone/consume a WASM response to invent download progress.
if (typeof PerformanceObserver !== 'undefined') {
  resourceObserver = new PerformanceObserver(list => { for (const entry of list.getEntries()) resourceComplete(entry.name); });
  resourceObserver.observe({ type: 'resource', buffered: true });
}

async function loadFont() {
  reportStartup(true);
  const response = await fetch(new URL('fonts/NotoSansCJKsc-Regular.otf', root));
  const length = Number(response.headers.get('content-length'));
  const totalBytes = !response.headers.get('content-encoding') && length > 0 ? length : undefined;
  if (!response.body) { const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length) startup.downloadSequence++; return bytes; }
  const reader = response.body.getReader(), chunks = [];
  let loadedBytes = 0, previous = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value); loadedBytes += value.length; if (value.length) startup.downloadSequence++;
      if (performance.now() - previous > 100) {
        reportStartup(false, { loadedBytes, totalBytes, byteKind: 'decoded' });
        previous = performance.now();
      }
    }
  } catch (error) { fail('download'); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(loadedBytes); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
addEventListener('message', async function connect(event) {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'starshift-connect' || !event.ports[0]) return;
  removeEventListener('message', connect);
  port = event.ports[0];
  try {
    font = await loadFont();
    if (disposed || failed) return;
    fontLoaded = true; resourceComplete(new URL('fonts/NotoSansCJKsc-Regular.otf', root).href); reportStartup(true);
    helper = new ZetaHelperMain(new URL('thread.js?v=0.1.1', import.meta.url).href, { wasmPkg: 'url:' + new URL('engine/', root).href, threadJsType: 'module', blockPageScroll: false });
    helper.Module.print = () => {};
    helper.Module.printErr = message => { if (incompatible(message)) fail('incompatible'); };
    helper.Module.onAbort = reason => fail(incompatible(reason) ? 'incompatible' : 'initialize');
    helper.Module.monitorRunDependencies = count => {
      if (startup.runDependencies !== count) { startup.runDependencies = count; reportStartup(); }
    };
    const initialized = helper.Module.onRuntimeInitialized;
    helper.Module.onRuntimeInitialized = function(...args) {
      startup.runtimeInitialized = true; reportStartup(true);
      return initialized?.apply(this, args);
    };
    helper.Module.preRun = [() => {
      const inject = () => {
        if (disposed) return false;
        try { window.FS.mkdirTree('/instdir/share/fonts/truetype'); window.FS.writeFile('/instdir/share/fonts/truetype/NotoSansCJKsc-Regular.otf', font); font = undefined; return true; }
        catch { return false; }
      };
      if (!inject()) {
        helper.Module.addRunDependency('starshift-font');
        fontTimer = setInterval(() => { if (inject()) { clearInterval(fontTimer); helper.Module.removeRunDependency('starshift-font'); } }, 25);
      }
    }];
    helper.start(() => {
      helperStarted = true; reportStartup(true);
      helper.thrPort.onmessage = ({ data }) => {
        if (disposed || failed) return;
        if (data.type === 'ready') { documentReady = true; resourceObserver?.disconnect(); port.postMessage({ type: 'ready', id: 0 }); return; }
        if (data.type === 'progress') { phase(data.message, data.detail); return; }
        try {
          if (data.type === 'done') {
            const bytes = new Uint8Array(helper.FS.readFile('/tmp/starshift-output.pdf'));
            port.postMessage({ type: 'done', id: currentId, bytes }, [bytes.buffer]);
          } else if (data.type === 'error') fail('document');
        } catch { fail('initialize'); }
        finally { for (const path of ['/tmp/starshift-input.docx', '/tmp/starshift-output.pdf']) { try { helper.FS.unlink(path); } catch { /* absent */ } } }
      };
      port.onmessage = ({ data }) => {
        if (data.type !== 'convert' || disposed || failed) return;
        currentId = data.id;
        try { helper.FS.writeFile('/tmp/starshift-input.docx', data.bytes); helper.thrPort.postMessage({ type: 'convert' }); }
        catch { fail('initialize'); }
      };
    });
  } catch { clearInterval(fontTimer); fail('initialize'); }
});
