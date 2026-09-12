import type { Progress } from '../types';
import { asBlob, checkAbort } from './common';

/** Isolated frame owns one ZetaOffice runtime and its UNO workers; discard it on completion or cancellation. */
export class OfficeSession {
  private frame?: HTMLIFrameElement;
  private port?: MessagePort;
  private sequence = 0;
  private pending?: { resolve: (data?: Uint8Array) => void; reject: (error: Error) => void };
  constructor(private signal: AbortSignal, private progress: Progress) {}
  private wait(timeout: number): Promise<Uint8Array | undefined> {
    checkAbort(this.signal);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('文档处理超时，请减少文档大小或重试。')); this.destroy(); }, timeout);
      const abort = () => { cleanup(); reject(new DOMException('任务已取消', 'AbortError')); this.destroy(); };
      const cleanup = () => { clearTimeout(timer); this.signal.removeEventListener('abort', abort); this.pending = undefined; };
      this.signal.addEventListener('abort', abort, { once: true });
      this.pending = {
        resolve: data => { cleanup(); resolve(data); },
        reject: error => { cleanup(); reject(error); },
      };
    });
  }
  async initialize() {
    if (this.frame) return;
    if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw new Error('DOCX 转 PDF 需要安全隔离环境。请使用最新版桌面 Chrome / Edge，通过 HTTPS 或 localhost 访问并刷新。');
    this.progress('正在准备本地文档引擎…');
    const channel = new MessageChannel();
    this.port = channel.port1;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'progress') { this.progress(data.message); return; }
      if (data.id !== this.sequence) return;
      if (data.type === 'error') this.pending?.reject(new Error(data.message));
      else this.pending?.resolve(data.bytes);
    };
    const frame = document.createElement('iframe');
    frame.title = '本地文档转换引擎';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.allow = 'cross-origin-isolated';
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:500px;height:500px;border:0;visibility:hidden;pointer-events:none';
    const ready = this.wait(240_000);
    frame.onload = () => frame.contentWindow?.postMessage({ type: 'starshift-connect' }, location.origin, [channel.port2]);
    frame.onerror = () => this.pending?.reject(new Error('本地文档引擎加载失败，请检查静态资源是否完整。'));
    frame.src = `${import.meta.env.BASE_URL}office/frame.html`;
    this.frame = frame;
    document.body.appendChild(frame);
    await ready;
  }
  async convert(bytes: Uint8Array) {
    await this.initialize();
    checkAbort(this.signal);
    const id = ++this.sequence;
    const result = this.wait(180_000);
    this.port!.postMessage({ type: 'convert', id, bytes }, [bytes.buffer as ArrayBuffer]);
    const data = await result;
    if (!data || new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') throw new Error('引擎未返回有效 PDF。');
    return asBlob(data, 'application/pdf');
  }
  destroy() {
    this.pending?.reject(new DOMException('任务已取消', 'AbortError'));
    this.port?.close(); this.port = undefined;
    this.frame?.remove(); this.frame = undefined;
  }
}
