import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { InputItem, PageItem } from '../types';
import { checkAbort } from './common';

/** A queue-local cache. It owns at most one PDF, one render, and 60 URLs. */
export class PageThumbnails {
  private pages: PageItem[] = [];
  private sources: InputItem[] = [];
  private wanted: string[] = [];
  private urls = new Map<string, string>();
  private failed = new Set<string>();
  private paused = true;
  private disposed = false;
  private abort?: AbortController;
  private pumping?: Promise<void>;
  constructor(private update: (id: string, change: Partial<PageItem>) => void) {}
  activate() { this.disposed = false; }
  refresh(pages: PageItem[], sources: InputItem[]) {
    this.pages = pages; this.sources = sources;
    const ids = new Set(pages.map(p => p.id));
    for (const id of this.urls.keys()) if (!ids.has(id)) this.evict(id);
    for (const id of this.failed) if (!ids.has(id)) this.failed.delete(id);
  }
  visible(ids: string[]) { this.wanted = ids.slice(0, 60); this.start(); }
  resume() { this.paused = false; this.start(); }
  async stop() { this.paused = true; this.abort?.abort(); await this.pumping; }
  dispose() {
    this.disposed = true; void this.stop();
    for (const id of this.urls.keys()) this.evict(id);
    this.pages = []; this.sources = []; this.wanted = []; this.failed.clear();
  }
  private evict(id: string) {
    const url = this.urls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(id);
    if (!this.disposed) this.update(id, { thumbnail: undefined, thumbnailStatus: 'waiting' });
  }
  private next() { return this.wanted.map(id => this.pages.find(p => p.id === id)).find(p => p && !this.urls.has(p.id) && !this.failed.has(p.id)); }
  private start() {
    if (this.paused || this.disposed || this.pumping || !this.next()) return;
    const abort = new AbortController(); this.abort = abort;
    this.pumping = this.pump(abort.signal).catch(() => {}).finally(() => {
      this.pumping = undefined; this.abort = undefined;
      this.start();
    });
  }
  private async pump(signal: AbortSignal) {
    let doc: PDFDocumentProxy | undefined, sourceId = '';
    try {
      const { openPdf, renderPdfPage } = await import('./pdf-render');
      while (!this.paused && !this.disposed) {
        checkAbort(signal);
        const page = this.next();
        if (!page) return;
        this.update(page.id, { thumbnailStatus: 'loading' });
        try {
          if (sourceId !== page.sourceId) {
            await doc?.loadingTask.destroy(); doc = undefined;
            const source = this.sources.find(s => s.id === page.sourceId);
            if (!source) { this.failed.add(page.id); continue; }
            doc = await openPdf(source.file, signal); sourceId = source.id;
          }
          checkAbort(signal);
          const p = await doc!.getPage(page.page);
          const view = p.getViewport({ scale: 1 });
          const blob = await renderPdfPage(doc!, page.page, Math.min(180 / view.width, 230 / view.height), 'png', 1, signal);
          checkAbort(signal);
          if (!this.pages.some(p => p.id === page.id) || !this.wanted.includes(page.id)) { this.update(page.id, { thumbnailStatus: 'waiting' }); continue; }
          while (this.urls.size >= 60) {
            const victim = [...this.urls.keys()].find(id => !this.wanted.includes(id));
            if (!victim) break;
            this.evict(victim);
          }
          const url = URL.createObjectURL(blob); this.urls.set(page.id, url);
          this.update(page.id, { thumbnail: url, thumbnailStatus: 'ready' });
        } catch (error) {
          if (signal.aborted) { if (!this.disposed) this.update(page.id, { thumbnailStatus: 'waiting' }); throw error; }
          this.failed.add(page.id); this.update(page.id, { thumbnailStatus: 'error' });
        }
      }
    } finally { await doc?.loadingTask.destroy().catch(() => {}); }
  }
}
