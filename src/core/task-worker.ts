import { renderImage } from './images';
import { assemblePdf, imagesToPdf } from './pdf-edit';
import { zipSync } from 'fflate';
import { asBlob, errorMessage, uniqueName } from './common';
import type { PageItem, Settings } from '../types';

export type WorkerJob =
  | { type: 'image'; file: Blob; settings: Settings; rotation: number }
  | { type: 'image-pdf'; images: { file: Blob; rotation: number }[]; settings: Settings }
  | { type: 'image-pdf-ready'; images: { blob: Blob; width: number; height: number }[]; settings: Settings }
  | { type: 'organize'; sources: { id: string; bytes: Uint8Array }[]; pages: PageItem[]; split: boolean }
  | { type: 'zip'; outputs: { name: string; blob: Blob }[] };
export interface WorkerResult { blob: Blob; name?: string }

self.onmessage = async ({ data: job }: MessageEvent<WorkerJob>) => {
  const progress = (message: string, completed?: number, total?: number) => self.postMessage({ progress: { message, completed, total } });
  try {
    let results: WorkerResult[] = [];
    if (job.type === 'image') results = [await renderImage(job.file, job.settings, job.rotation)];
    if (job.type === 'image-pdf') {
      const images = [];
      for (let i = 0; i < job.images.length; i++) {
        progress('正在处理图片方向和尺寸…', i + 1, job.images.length);
        images.push(await renderImage(job.images[i].file, { ...job.settings, width: 0, height: 0, format: 'png', transparent: false }, job.images[i].rotation));
      }
      results = [{ blob: await imagesToPdf(images, job.settings, progress) }];
    }
    if (job.type === 'image-pdf-ready') results = [{ blob: await imagesToPdf(job.images, job.settings, progress) }];
    if (job.type === 'organize') {
      const groups = job.split ? job.pages.map(p => [p]) : [job.pages];
      for (let i = 0; i < groups.length; i++) {
        progress('正在导出整理后的页面…', i + 1, groups.length);
        results.push({ blob: await assemblePdf(job.sources, groups[i]), name: job.split ? `页面-${String(i + 1).padStart(3, '0')}.pdf` : '整理后的文件.pdf' });
      }
    }
    if (job.type === 'zip') {
      const entries: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      for (let i = 0; i < job.outputs.length; i++) {
        progress('正在打包下载文件…', i + 1, job.outputs.length);
        entries[uniqueName(job.outputs[i].name, used)] = new Uint8Array(await job.outputs[i].blob.arrayBuffer());
      }
      results = [{ blob: asBlob(zipSync(entries, { level: 0 }), 'application/zip') }];
    }
    self.postMessage({ results });
  } catch (error) { self.postMessage({ error: errorMessage(error) }); }
};
