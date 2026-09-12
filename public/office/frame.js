// StarShift MIT. Run the fixed ZetaOffice build locally, with all documents confined to its in-memory FS.
import { ZetaHelperMain } from '../engine/zetaHelper.js';

const root = new URL('../', import.meta.url);
const allowed = new Set(['engine/soffice.js', 'engine/soffice.wasm', 'engine/soffice.data', 'engine/soffice.data.js.metadata', 'fonts/NotoSansCJKsc-Regular.otf'].map(p => new URL(p, root).href));
function assertResource(url, method = 'GET') {
  if (method.toUpperCase() !== 'GET' || !allowed.has(new URL(url instanceof Request ? url.url : String(url), location.href).href)) throw new Error('Blocked document network access');
}
const originalFetch = fetch.bind(window);
window.fetch = (url, options) => { assertResource(url, options?.method); return originalFetch(url, { ...options, credentials: 'omit', referrerPolicy: 'no-referrer' }); };
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) { assertResource(url, method); return originalOpen.call(this, method, url, ...args); };
window.WebSocket = class { constructor() { throw new Error('Blocked document network access'); } };
window.open = () => null;
for (const method of ['log', 'debug', 'info', 'warn', 'error']) console[method] = () => {};

window.addEventListener('message', async function connect(event) {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'starshift-connect' || !event.ports[0]) return;
  window.removeEventListener('message', connect);
  const port = event.ports[0];
  let currentId = 0;
  let fontTimer;
  const phase = message => port.postMessage({ type: 'progress', message });
  const fail = () => port.postMessage({ type: 'error', id: currentId, message: '文档引擎无法处理此文件，请重新另存为 DOCX 或减少文档大小后重试。' });
  try {
    phase('正在加载中文字体…');
    const response = await fetch(new URL('fonts/NotoSansCJKsc-Regular.otf', root));
    if (!response.ok) throw new Error('Font unavailable');
    const font = new Uint8Array(await response.arrayBuffer());
    phase('正在加载文档引擎资源…');
    const helper = new ZetaHelperMain(new URL('thread.js', import.meta.url).href, { wasmPkg: 'url:' + new URL('engine/', root).href, threadJsType: 'module', blockPageScroll: false });
    helper.Module.print = helper.Module.printErr = () => {};
    helper.Module.onAbort = fail;
    helper.Module.monitorRunDependencies = count => { if (count === 0) phase('正在初始化文档排版引擎…'); };
    helper.Module.preRun = [() => {
      const inject = () => {
        try { window.FS.mkdirTree('/instdir/share/fonts/truetype'); window.FS.writeFile('/instdir/share/fonts/truetype/NotoSansCJKsc-Regular.otf', font); return true; }
        catch { return false; }
      };
      if (!inject()) {
        helper.Module.addRunDependency('starshift-font');
        fontTimer = setInterval(() => { if (inject()) { clearInterval(fontTimer); helper.Module.removeRunDependency('starshift-font'); } }, 25);
      }
    }];
    helper.start(() => {
      helper.thrPort.onmessage = ({ data }) => {
        if (data.type === 'ready') { port.postMessage({ type: 'ready', id: 0 }); return; }
        if (data.type === 'progress') { phase(data.message); return; }
        try {
          if (data.type === 'done') {
            const bytes = new Uint8Array(helper.FS.readFile('/tmp/starshift-output.pdf'));
            port.postMessage({ type: 'done', id: currentId, bytes }, [bytes.buffer]);
          } else if (data.type === 'error') fail();
        } finally {
          for (const path of ['/tmp/starshift-input.docx', '/tmp/starshift-output.pdf']) { try { helper.FS.unlink(path); } catch { /* absent */ } }
        }
      };
      port.onmessage = ({ data }) => {
        if (data.type !== 'convert') return;
        currentId = data.id;
        try {
          helper.FS.writeFile('/tmp/starshift-input.docx', data.bytes);
          helper.thrPort.postMessage({ type: 'convert' });
        } catch { fail(); }
      };
    });
  } catch { clearInterval(fontTimer); fail(); }
});
