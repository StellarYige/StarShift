import { PDFDocument, PDFName, degrees, PageSizes } from 'pdf-lib';
import type { PageItem, Progress, Settings } from '../types';
import { asBlob } from './common';

export async function loadPdfSources(sources: { id: string; bytes: Uint8Array }[], pages: Pick<PageItem, 'sourceId'>[]) {
  const needed = new Set(pages.map(p => p.sourceId));
  const docs = new Map<string, PDFDocument>();
  for (const source of sources) if (needed.has(source.id) && !docs.has(source.id)) docs.set(source.id, await PDFDocument.load(source.bytes, { updateMetadata: false }));
  return docs;
}

export async function assemblePdf(sources: { id: string; bytes: Uint8Array }[] | Map<string, PDFDocument>, pages: Pick<PageItem, 'sourceId' | 'page' | 'rotation'>[], progress?: Progress) {
  if (!pages.length) throw new Error('请至少选择一页。');
  const docs = sources instanceof Map ? sources : await loadPdfSources(sources, pages);
  const output = await PDFDocument.create();
  output.setProducer('StarShift / pdf-lib');
  for (let i = 0; i < pages.length; i++) {
    const item = pages[i];
    const doc = docs.get(item.sourceId);
    if (!doc || item.page < 1 || item.page > doc.getPageCount()) throw new Error('页面来源失效，请重新选择文件。');
    const [page] = await output.copyPages(doc, [item.page - 1]);
    page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360));
    // No active annotations/actions survive into the new document. Page graphics and text remain vectors.
    page.node.delete(PDFName.of('Annots'));
    page.node.delete(PDFName.of('AA'));
    output.addPage(page);
    progress?.('正在整理页面…', i + 1, pages.length);
  }
  return asBlob(await output.save(), 'application/pdf');
}

export async function createImagePdf(settings: Settings) {
  const doc = await PDFDocument.create();
  doc.setProducer('StarShift / pdf-lib');
  if (!Number.isFinite(settings.margin) || settings.margin < 0 || settings.margin > 50) throw new Error('页边距须在 0–50 mm 之间。');
  const margin = settings.margin * 72 / 25.4;
  return {
    async add({ blob, width, height }: { blob: Blob; width: number; height: number }) {
    const image = await doc.embedPng(await blob.arrayBuffer());
    let size: [number, number] = settings.paper === 'fit' ? [width * 0.75 + margin * 2, height * 0.75 + margin * 2] : [...(settings.paper === 'a4' ? PageSizes.A4 : PageSizes.Letter)];
    if (settings.landscape && settings.paper !== 'fit') size = [size[1], size[0]];
    const page = doc.addPage(size);
    const scale = Math.min((size[0] - margin * 2) / width, (size[1] - margin * 2) / height);
    page.drawImage(image, { x: (size[0] - width * scale) / 2, y: (size[1] - height * scale) / 2, width: width * scale, height: height * scale });
    // pdf-lib clears the embedder's decoded pixels when embed completes.
    // Do this before decoding the next image, not only at final save.
    await image.embed();
    },
    async save() { return asBlob(await doc.save(), 'application/pdf'); },
  };
}
