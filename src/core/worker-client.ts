import type { Progress } from '../types';
import type { WorkerJob, WorkerResult } from './worker-protocol';
import { checkAbort } from './common';

export function runWorker(job: WorkerJob, signal: AbortSignal, progress?: Progress): Promise<WorkerResult[]> {
  checkAbort(signal);
  const needsDom = typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined';
  if (job.type === 'image' && needsDom) {
    return renderOnPage(job, signal);
  }
  const worker = new Worker(new URL('./task-worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    let closed = false, decoding = false, expectedImage = 0;
    const decoder = new AbortController();
    const abort = () => { cleanup(); reject(new DOMException('任务已取消', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('处理时间过长，请减少文件大小或页数后重试。')); }, 180_000);
    function cleanup() { closed = true; decoder.abort(); clearTimeout(timer); signal.removeEventListener('abort', abort); worker.onmessage = worker.onerror = null; worker.terminate(); }
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => { cleanup(); reject(new Error('处理 Worker 意外停止，请检查浏览器兼容性或减少内存占用。')); };
    worker.onmessage = ({ data }) => {
      if (signal.aborted) { abort(); return; }
      if (data.progress) { progress?.(data.progress.message, data.progress.completed, data.progress.total, data.progress.detail); return; }
      if (data.nextImage !== undefined) {
        if (job.type !== 'image-pdf' || !needsDom || decoding || data.nextImage !== expectedImage || expectedImage >= job.images.length) { cleanup(); reject(new Error('图片组装顺序失效，请重新转换。')); return; }
        decoding = true;
        const index = expectedImage++;
        void (async () => {
          const { renderImage } = await import('./images');
          checkAbort(decoder.signal);
          progress?.(`正在处理第 ${index + 1} 张图片的方向和尺寸…`, index, job.images.length, { phase: 'render', unit: 'image' });
          const image = await renderImage(job.images[index].file, { ...job.settings, width: 0, height: 0, format: 'png', transparent: false, background: '#ffffff' }, job.images[index].rotation, decoder.signal);
          checkAbort(decoder.signal);
          decoding = false;
          worker.postMessage({ type: 'image-pdf-chunk', index, image });
        })().catch(error => { if (!closed) { cleanup(); reject(error); } });
        return;
      }
      cleanup();
      data.error ? reject(new Error(data.error)) : resolve(data.results);
    };
    try {
      worker.postMessage(job.type === 'image-pdf' && needsDom ? { type: 'image-pdf-stream', count: job.images.length, settings: job.settings } : job,
        job.type === 'organize' ? job.sources.map(s => s.bytes.buffer as ArrayBuffer) : []);
    } catch { cleanup(); reject(new Error('无法启动此任务，请减少文件大小后重试。')); }
  });
}

// WebKit ports without worker canvas support can still use their local DOM
// decoder and canvas. PDF assembly remains in a cancellable Worker.
async function renderOnPage(job: Extract<WorkerJob, { type: 'image' }>, signal: AbortSignal): Promise<WorkerResult[]> {
  const { renderImage } = await import('./images');
  checkAbort(signal);
  return [await renderImage(job.file, job.settings, job.rotation, signal)];
}
