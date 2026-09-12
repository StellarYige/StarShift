import { getDocument, GlobalWorkerOptions, PasswordResponses } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { checkAbort, MAX_PAGES, MAX_PIXELS, parsePages, stem } from './common';
import type { PageItem, Progress, Settings } from '../types';

GlobalWorkerOptions.workerSrc = workerUrl;
export async function openPdf(file: Blob, signal: AbortSignal): Promise<PDFDocumentProxy> {
  checkAbort(signal);
  const data = new Uint8Array(await file.arrayBuffer());
  checkAbort(signal);
  const task = getDocument({
    data,
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
    wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/`,
    enableXfa: false, stopAtErrors: true,
    maxImageSize: MAX_PIXELS, useSystemFonts: false,
  });
  let encrypted = false;
  const destroy = task.destroy.bind(task);
  let destruction: Promise<void> | undefined;
  task.destroy = () => {
    signal.removeEventListener('abort', abort);
    return destruction ??= destroy();
  };
  const abort = () => { void task.destroy().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  task.onPassword = (_update: unknown, reason: number) => { if (reason === PasswordResponses.NEED_PASSWORD || reason === PasswordResponses.INCORRECT_PASSWORD) { encrypted = true; abort(); } };
  try {
    const doc = await task.promise;
    checkAbort(signal);
    if (doc.numPages > MAX_PAGES) { await doc.loadingTask.destroy(); throw new Error(`文件超过 ${MAX_PAGES} 页，请先在本地拆分为较小文件。`); }
    return doc;
  } catch (error) {
    await task.destroy().catch(() => {});
    checkAbort(signal);
    if (encrypted) throw new Error('PDF 已加密，请先在本地解除密码保护。');
    throw error;
  }
}
export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number, scale: number, format: 'png' | 'jpg', quality: number, signal: AbortSignal) {
  checkAbort(signal);
  const page = await doc.getPage(pageNumber);
  checkAbort(signal);
  const viewport = page.getViewport({ scale });
  if (viewport.width * viewport.height > MAX_PIXELS || Math.max(viewport.width, viewport.height) > 16384) throw new Error('当前页渲染尺寸过大，请降低清晰度。');
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画布不可用，请关闭其他大文件后重试。');
  const task = page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' });
  const abort = () => task.cancel();
  signal.addEventListener('abort', abort, { once: true });
  try {
    await task.promise;
    checkAbort(signal);
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob && blob.type === mime ? resolve(blob) : reject(new Error('图片编码失败。')), mime, quality));
    checkAbort(signal);
    return blob;
  } finally { signal.removeEventListener('abort', abort); canvas.width = canvas.height = 1; page.cleanup(); }
}
export async function pdfThumbnails(file: File, id: string, signal: AbortSignal, progress: Progress) {
  const doc = await openPdf(file, signal);
  const pages: PageItem[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      checkAbort(signal);
      progress('正在生成页面缩略图…', i, doc.numPages);
      const page = await doc.getPage(i);
      const view = page.getViewport({ scale: 1 });
      const blob = await renderPdfPage(doc, i, Math.min(180 / view.width, 230 / view.height), 'png', 1, signal);
      pages.push({ id: crypto.randomUUID(), sourceId: id, sourceName: file.name, page: i, rotation: 0, selected: true, thumbnail: URL.createObjectURL(blob) });
    }
    return pages;
  } catch (err) { pages.forEach(p => URL.revokeObjectURL(p.thumbnail)); throw err; }
  finally { await doc.loadingTask.destroy(); }
}
export async function pdfToImages(file: File, settings: Settings, signal: AbortSignal, progress: Progress, output: (name: string, blob: Blob) => void) {
  const doc = await openPdf(file, signal);
  try {
    const pages = parsePages(settings.pages, doc.numPages);
    for (let i = 0; i < pages.length; i++) {
      progress('正在渲染 PDF 页面…', i + 1, pages.length);
      const blob = await renderPdfPage(doc, pages[i], settings.dpi / 72, settings.format === 'jpg' ? 'jpg' : 'png', settings.quality, signal);
      output(`${stem(file.name)}-第${String(pages[i]).padStart(3, '0')}页.${settings.format === 'jpg' ? 'jpg' : 'png'}`, blob);
    }
  } finally { await doc.loadingTask.destroy(); }
}
