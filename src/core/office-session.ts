import type { Progress } from '../types';
import { asBlob, checkAbort } from './common';
import { OfficeError, type OfficeErrorCode } from './office-error';

/** One serial batch owns one runtime. No idle engine or persistent document cache. */
export class OfficeSession {
  private frame?: HTMLIFrameElement;
  private port?: MessagePort;
  private connectPort?: MessagePort;
  private sequence = 0;
  private initialized = false;
  private fatal?: OfficeError;
  private pending?: { resolve: (data?: Uint8Array) => void; reject: (error: Error) => void };
  constructor(private signal: AbortSignal, private progress: Progress) {}
  private wait(timeout: number): Promise<Uint8Array | undefined> {
    checkAbort(this.signal);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.fatal = new OfficeError('timeout'); cleanup(); reject(this.fatal); this.destroy(); }, timeout);
      const abort = () => { cleanup(); reject(new DOMException('任务已取消', 'AbortError')); this.destroy(); };
      const cleanup = () => { clearTimeout(timer); this.signal.removeEventListener('abort', abort); this.pending = undefined; };
      this.signal.addEventListener('abort', abort, { once: true });
      this.pending = { resolve: data => { cleanup(); resolve(data); }, reject: error => { cleanup(); reject(error); } };
    });
  }
  async initialize() {
    checkAbort(this.signal);
    if (this.fatal) throw this.fatal;
    if (this.initialized) return;
    if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw new OfficeError('incompatible', 'DOCX 转 PDF 需要安全隔离环境。请通过 HTTPS 或 localhost 访问并刷新；其他四项工具仍可使用。');
    // These are startup requirements of the pinned engine, confirmed by actual
    // Firefox/WebKit attempts. Check before allocating its large WASM runtime.
    if (typeof OffscreenCanvas === 'undefined') throw new OfficeError('incompatible');
    if (navigator.permissions?.query) {
      try { await navigator.permissions.query({ name: 'clipboard-read' as PermissionName }); }
      catch (error) { if (error instanceof TypeError) throw new OfficeError('incompatible'); }
      checkAbort(this.signal);
    }
    this.progress('正在准备本地文档引擎…', undefined, undefined, { phase: 'resource-load', resource: 'engine' });
    const channel = new MessageChannel();
    this.port = channel.port1; this.connectPort = channel.port2;
    this.port.onmessage = ({ data }) => {
      if (this.signal.aborted) return;
      if (data.type === 'progress') { this.progress(data.message, undefined, undefined, data.detail); return; }
      if (data.id !== this.sequence) return;
      if (data.type === 'error') {
        const codes: OfficeErrorCode[] = ['download', 'initialize', 'incompatible', 'document', 'timeout'];
        const code = codes.includes(data.code) ? data.code as OfficeErrorCode : this.initialized ? 'document' : 'initialize';
        const error = new OfficeError(code);
        if (error.stopsBatch) this.fatal = error;
        this.pending?.reject(error);
      } else if (data.type === 'ready' || data.type === 'done') this.pending?.resolve(data.bytes);
    };
    const frame = document.createElement('iframe');
    frame.title = '本地文档转换引擎';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.allow = 'cross-origin-isolated';
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:500px;height:500px;border:0;visibility:hidden;pointer-events:none';
    const ready = this.wait(240_000);
    frame.onload = () => { frame.onload = null; frame.contentWindow?.postMessage({ type: 'starshift-connect' }, location.origin, [channel.port2]); };
    frame.onerror = () => this.pending?.reject(new OfficeError('download'));
    frame.src = `${import.meta.env.BASE_URL}office/frame.html?v=0.1.1`;
    this.frame = frame;
    document.body.appendChild(frame);
    try { await ready; this.initialized = true; }
    catch (error) { this.destroy(); throw error; }
  }
  async convert(bytes: Uint8Array) {
    await this.initialize();
    checkAbort(this.signal);
    if (this.fatal) throw this.fatal;
    const id = ++this.sequence;
    const result = this.wait(180_000);
    try { this.port!.postMessage({ type: 'convert', id, bytes }, [bytes.buffer as ArrayBuffer]); }
    catch { this.pending?.reject(new OfficeError('initialize')); }
    const data = await result;
    if (!data || new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') throw new OfficeError('document');
    return asBlob(data, 'application/pdf');
  }
  destroy() {
    this.pending?.reject(new DOMException('任务已取消', 'AbortError'));
    if (this.port) this.port.onmessage = null;
    this.port?.close(); this.port = undefined;
    this.connectPort?.close(); this.connectPort = undefined;
    if (this.frame) {
      this.frame.onload = this.frame.onerror = null;
      // Same-origin frame: dispose synchronously before removing its realm.
      try { this.frame.contentWindow?.dispatchEvent(new Event('starshift-dispose')); } catch { /* frame may already be gone */ }
      this.frame.remove(); this.frame = undefined;
    }
    this.initialized = false;
  }
}
