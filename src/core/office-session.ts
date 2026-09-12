import type { Progress, ProgressDetail, OfficeStartupProgress } from '../types';
import { asBlob, checkAbort } from './common';
import { OfficeError, type OfficeErrorCode } from './office-error';
import { checkOfficeCompatibility } from './office-compatibility';

/** One serial batch owns one runtime. No idle engine or persistent document cache. */
export class OfficeSession {
  private frame?: HTMLIFrameElement;
  private port?: MessagePort;
  private connectPort?: MessagePort;
  private sequence = 0;
  private initialized = false;
  private fatal?: OfficeError;
  private startup?: { message: string; detail: ProgressDetail; signature: string; advancedAt: number; downloadedAt?: number };
  private startupTimer?: ReturnType<typeof setInterval>;
  private startupReported?: string;
  private pending?: { resolve: (data?: Uint8Array) => void; reject: (error: Error) => void };
  constructor(private signal: AbortSignal, private progress: Progress) {}
  private startupProgress(message: string, detail: ProgressDetail) {
    const now = performance.now(), previous = this.startup;
    const signature = JSON.stringify(detail.startup);
    const downloaded = (detail.startup?.downloadSequence ?? 0) > (previous?.detail.startup?.downloadSequence ?? 0);
    this.startup = {
      message, detail, signature,
      advancedAt: previous?.signature === signature ? previous.advancedAt : now,
      downloadedAt: downloaded ? now : previous?.downloadedAt,
    };
    this.reportStartup();
  }
  private reportStartup() {
    const state = this.startup;
    if (!state || this.signal.aborted || this.initialized) return;
    const now = performance.now(), quietForMs = now - state.advancedAt;
    const detail = {
      ...state.detail,
      quietForMs: quietForMs >= 30_000 ? Math.floor(quietForMs / 10_000) * 10_000 : undefined,
      downloadActive: state.downloadedAt !== undefined && now - state.downloadedAt < 5000,
    };
    const signature = JSON.stringify([state.message, detail]);
    if (signature === this.startupReported) return;
    this.startupReported = signature;
    this.progress(state.message, undefined, undefined, detail);
  }
  private stopStartup() {
    clearInterval(this.startupTimer); this.startupTimer = undefined;
    this.startup = undefined; this.startupReported = undefined;
  }
  private timeoutError() {
    if (this.initialized) return new OfficeError('timeout');
    const labels: Record<OfficeStartupProgress['stage'], string> = {
      resources: '资源加载', wasm: '排版引擎初始化', worker: '工作线程启动', uno: '文档服务就绪',
    };
    const state = this.startup;
    const stage = state?.detail.startup?.stage ?? 'resources';
    const downloading = stage === 'resources' && state?.downloadedAt !== undefined && performance.now() - state.downloadedAt < 5000;
    return new OfficeError('timeout', `文档引擎启动超时（${labels[stage]}）。${downloading ? '超时前仍收到下载进度；请检查网络或稍后重试。' : ''}输入和设置已保留，可重新初始化后重试。`);
  }
  private wait(timeout: number): Promise<Uint8Array | undefined> {
    checkAbort(this.signal);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.fatal = this.timeoutError(); cleanup(); reject(this.fatal); this.destroy(); }, timeout);
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
    await checkOfficeCompatibility(this.signal);
    this.startupProgress('正在准备本地文档引擎…', { phase: 'resource-load', resource: 'engine', startup: { stage: 'resources', resourcesComplete: 0, runtimeInitialized: false, workersCreated: 0, workersLoaded: 0, downloadSequence: 0 } });
    const channel = new MessageChannel();
    this.port = channel.port1; this.connectPort = channel.port2;
    this.port.onmessage = ({ data }) => {
      if (this.signal.aborted) return;
      if (data.type === 'progress') {
        if (!this.initialized && data.detail?.startup) this.startupProgress(data.message, data.detail);
        else this.progress(data.message, undefined, undefined, data.detail);
        return;
      }
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
    // Parent-owned advisory only: it neither rejects nor restarts a batch.
    this.startupTimer = setInterval(() => this.reportStartup(), 1000);
    frame.onload = () => { frame.onload = null; frame.contentWindow?.postMessage({ type: 'starshift-connect' }, location.origin, [channel.port2]); };
    frame.onerror = () => this.pending?.reject(new OfficeError('download'));
    frame.src = `${import.meta.env.BASE_URL}office/frame.html?v=0.1.1-startup.1`;
    this.frame = frame;
    document.body.appendChild(frame);
    try { await ready; this.initialized = true; this.stopStartup(); }
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
    this.stopStartup();
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
