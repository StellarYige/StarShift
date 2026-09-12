import { renderImage } from './images';
import { asBlob, errorMessage, MAX_TOTAL_BYTES, uniqueName } from './common';
import type { PageItem, Progress, Settings } from '../types';

export type WorkerJob =
  | { type: 'image'; file: Blob; settings: Settings; rotation: number }
  | { type: 'image-pdf'; images: { file: Blob; rotation: number }[]; settings: Settings }
  | { type: 'image-pdf-stream'; count: number; settings: Settings }
  | { type: 'organize'; sources: { id: string; bytes: Uint8Array }[]; pages: PageItem[]; split: boolean }
  | { type: 'zip'; outputs: { name: string; blob: Blob }[] };
export interface WorkerResult { blob: Blob; name?: string }
type ImageChunk = { type: 'image-pdf-chunk'; index: number; image: { blob: Blob; width: number; height: number } };
let stream: { pdf: Awaited<ReturnType<typeof import('./pdf-edit')['createImagePdf']>>; count: number; next: number; adding: boolean } | undefined;

self.onmessage = async ({ data: job }: MessageEvent<WorkerJob | ImageChunk>) => {
  const progress: Progress = (message, completed, total, detail) => self.postMessage({ progress: { message, completed, total, detail } });
  try {
    let results: WorkerResult[] = [];
    if (job.type === 'image') results = [await renderImage(job.file, job.settings, job.rotation)];
    if (job.type === 'image-pdf') {
      if (!job.images.length) throw new Error('请至少选择一张图片。');
      const { createImagePdf } = await import('./pdf-edit');
      const pdf = await createImagePdf(job.settings);
      for (let i = 0; i < job.images.length; i++) {
        progress(`正在处理第 ${i + 1} 张图片的方向和尺寸…`, i, job.images.length, { phase: 'render', unit: 'image' });
        await pdf.add(await renderImage(job.images[i].file, { ...job.settings, width: 0, height: 0, format: 'png', transparent: false, background: '#ffffff' }, job.images[i].rotation));
        progress(`第 ${i + 1} 张图片已嵌入 PDF`, i + 1, job.images.length, { phase: 'assemble', unit: 'image' });
      }
      results = [{ blob: await pdf.save() }];
    }
    if (job.type === 'image-pdf-stream') {
      if (!job.count || stream) throw new Error('图片队列无效，请重新转换。');
      const { createImagePdf } = await import('./pdf-edit');
      stream = { pdf: await createImagePdf(job.settings), count: job.count, next: 0, adding: false };
      self.postMessage({ nextImage: 0 }); return;
    }
    if (job.type === 'image-pdf-chunk') {
      if (!stream || stream.adding || job.index !== stream.next) throw new Error('图片队列顺序失效，请重新转换。');
      stream.adding = true;
      await stream.pdf.add(job.image);
      stream.adding = false; stream.next++;
      progress(`第 ${stream.next} 张图片已嵌入 PDF`, stream.next, stream.count, { phase: 'assemble', unit: 'image' });
      if (stream.next < stream.count) { self.postMessage({ nextImage: stream.next }); return; }
      results = [{ blob: await stream.pdf.save() }]; stream = undefined;
    }
    if (job.type === 'organize') {
      const { assemblePdf, loadPdfSources } = await import('./pdf-edit');
      const docs = await loadPdfSources(job.sources, job.pages);
      job.sources = [];
      const groups = job.split ? job.pages.map(p => [p]) : [job.pages];
      let outputBytes = 0;
      try {
        for (let i = 0; i < groups.length; i++) {
          progress('正在导出整理后的页面…', i, groups.length, { phase: 'assemble', unit: 'file' });
          const blob = await assemblePdf(docs, groups[i], job.split ? undefined : progress);
          outputBytes += blob.size;
          if (outputBytes > MAX_TOTAL_BYTES) throw new Error('本批输出超过 300 MB，请减少选中内容后重试。');
          results.push({ blob, name: job.split ? `页面-${String(i + 1).padStart(3, '0')}.pdf` : '整理后的文件.pdf' });
          progress('已导出整理后的页面', i + 1, groups.length, { phase: 'export', unit: 'file' });
        }
      } finally { docs.clear(); }
    }
    if (job.type === 'zip') {
      const { zipSync } = await import('fflate');
      const entries: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      for (let i = 0; i < job.outputs.length; i++) {
        progress('正在打包下载文件…', i, job.outputs.length, { phase: 'zip', unit: 'file' });
        entries[uniqueName(job.outputs[i].name, used)] = new Uint8Array(await job.outputs[i].blob.arrayBuffer());
        progress('正在打包下载文件…', i + 1, job.outputs.length, { phase: 'zip', unit: 'file' });
      }
      results = [{ blob: asBlob(zipSync(entries, { level: 0 }), 'application/zip') }];
    }
    self.postMessage({ results });
  } catch (error) { stream = undefined; self.postMessage({ error: errorMessage(error) }); }
};
