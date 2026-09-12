// StarShift MIT. Adapter 0.1.1; pinned engine and font URLs remain stable.
import { ZetaHelperMain } from '../engine/zetaHelper.js';

const root = new URL('../', import.meta.url);
const allowed = new Set(['engine/soffice.js', 'engine/soffice.wasm', 'engine/soffice.data', 'engine/soffice.data.js.metadata', 'fonts/NotoSansCJKsc-Regular.otf'].map(p => new URL(p, root).href));
const workers = new Set(), objectUrls = new Set(), requests = new Set(), ports = new Set(), timers = new Set();
const downloads = new AbortController();
let disposed = false, port, helper, fontTimer, font, currentId = 0, failed = false;
const phase = (message, detail) => { if (!disposed && !failed) port?.postMessage({ type: 'progress', message, detail }); };
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
  constructor(...args) { super(...args); workers.add(this); this.addEventListener('error', event => fail(incompatible(event.error || event.message) ? 'incompatible' : 'initialize')); }
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
  this.addEventListener('error', () => fail('download'), { once: true });
  this.addEventListener('loadend', () => { requests.delete(this); if (!disposed && this.status !== 200) fail('download'); }, { once: true });
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

async function loadFont() {
  phase('正在加载中文字体…', { phase: 'resource-load', resource: 'font' });
  const response = await fetch(new URL('fonts/NotoSansCJKsc-Regular.otf', root));
  const length = Number(response.headers.get('content-length'));
  const totalBytes = !response.headers.get('content-encoding') && length > 0 ? length : undefined;
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader(), chunks = [];
  let loadedBytes = 0, previous = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value); loadedBytes += value.length;
      if (performance.now() - previous > 100) {
        phase('正在加载中文字体…', { phase: 'resource-load', resource: 'font', loadedBytes, totalBytes, byteKind: 'decoded' });
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
    phase('正在加载文档引擎资源…', { phase: 'resource-load', resource: 'engine' });
    helper = new ZetaHelperMain(null, { wasmPkg: 'url:' + new URL('engine/', root).href, blockPageScroll: false });
    // Official ordered UNO scripts; no dynamic module import in the office Worker.
    helper.Module.uno_scripts = [new URL('engine/zeta.js', root).href, new URL('thread.js?v=0.1.1', import.meta.url).href];
    helper.Module.print = () => {};
    helper.Module.printErr = message => { if (incompatible(message)) fail('incompatible'); };
    helper.Module.onAbort = reason => fail(incompatible(reason) ? 'incompatible' : 'initialize');
    helper.Module.monitorRunDependencies = count => { if (count === 0) phase('正在初始化文档排版引擎…', { phase: 'initialize' }); };
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
    const script = document.createElement('script');
    script.src = new URL('engine/soffice.js', root).href;
    script.onload = () => {
      if (disposed || failed) return;
      helper.Module.uno_main.then(thrPort => {
      if (disposed || failed) { thrPort.close(); return; }
      helper.thrPort = thrPort; helper.FS = window.FS;
      helper.thrPort.onmessage = ({ data }) => {
        if (disposed || failed) return;
        if (data.type === 'ready') { window.dispatchEvent(new Event('resize')); port.postMessage({ type: 'ready', id: 0 }); return; }
        if (data.type === 'initialize-error') { fail('initialize'); return; }
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
      }).catch(() => fail('initialize'));
    };
    script.onerror = () => fail('download');
    document.body.appendChild(script);
  } catch { clearInterval(fontTimer); fail('initialize'); }
});
