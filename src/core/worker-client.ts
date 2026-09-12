import type { Progress } from '../types';
import type { WorkerJob, WorkerResult } from './task-worker';
import { checkAbort } from './common';

export function runWorker(job: WorkerJob, signal: AbortSignal, progress?: Progress): Promise<WorkerResult[]> {
  checkAbort(signal);
  const worker = new Worker(new URL('./task-worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(new DOMException('任务已取消', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('处理时间过长，请减少文件大小或页数后重试。')); }, 180_000);
    function cleanup() { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); }
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => { cleanup(); reject(new Error('处理 Worker 意外停止，请检查浏览器兼容性或减少内存占用。')); };
    worker.onmessage = ({ data }) => {
      if (data.progress) { progress?.(data.progress.message, data.progress.completed, data.progress.total); return; }
      cleanup();
      data.error ? reject(new Error(data.error)) : resolve(data.results);
    };
    worker.postMessage(job);
  });
}
