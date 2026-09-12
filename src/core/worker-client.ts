import type { Progress } from '../types';
import type { WorkerJob, WorkerResult } from './task-worker';
import { checkAbort } from './common';

export function runWorker(job: WorkerJob, signal: AbortSignal, progress?: Progress): Promise<WorkerResult[]> {
  checkAbort(signal);
  if ((job.type === 'image' || job.type === 'image-pdf') && (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined')) {
    return renderOnPage(job, signal, progress);
  }
  const worker = new Worker(new URL('./task-worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(new DOMException('任务已取消', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('处理时间过长，请减少文件大小或页数后重试。')); }, 180_000);
    function cleanup() { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.onmessage = worker.onerror = null; worker.terminate(); }
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => { cleanup(); reject(new Error('处理 Worker 意外停止，请检查浏览器兼容性或减少内存占用。')); };
    worker.onmessage = ({ data }) => {
      if (signal.aborted) { abort(); return; }
      if (data.progress) { progress?.(data.progress.message, data.progress.completed, data.progress.total, data.progress.detail); return; }
      cleanup();
      data.error ? reject(new Error(data.error)) : resolve(data.results);
    };
    try { worker.postMessage(job); } catch { cleanup(); reject(new Error('无法启动此任务，请减少文件大小后重试。')); }
  });
}

// WebKit ports without worker canvas support can still use their local DOM
// decoder and canvas. PDF assembly remains in a cancellable Worker.
async function renderOnPage(job: Extract<WorkerJob, { type: 'image' | 'image-pdf' }>, signal: AbortSignal, progress?: Progress): Promise<WorkerResult[]> {
  const { renderImage } = await import('./images');
  checkAbort(signal);
  if (job.type === 'image') return [await renderImage(job.file, job.settings, job.rotation, signal)];
  const images = [];
  for (let i = 0; i < job.images.length; i++) {
    checkAbort(signal);
    progress?.('正在处理图片方向和尺寸…', i + 1, job.images.length);
    images.push(await renderImage(job.images[i].file, { ...job.settings, width: 0, height: 0, format: 'png', transparent: false }, job.images[i].rotation, signal));
  }
  return runWorker({ type: 'image-pdf-ready', images, settings: job.settings }, signal, progress);
}
