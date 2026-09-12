import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { InputItem, PageItem } from '../types';
import { PageThumbnails } from '../core/page-thumbnails';

export function usePageThumbnails(pages: PageItem[], sources: InputItem[], busy: boolean, setPages: Dispatch<SetStateAction<PageItem[]>>) {
  const scheduler = useRef<PageThumbnails | null>(null);
  if (!scheduler.current) scheduler.current = new PageThumbnails((id, change) => setPages(current => current.map(p => p.id === id ? { ...p, ...change } : p)));
  useEffect(() => { scheduler.current!.activate(); return () => scheduler.current!.dispose(); }, []);
  useEffect(() => { scheduler.current!.refresh(pages, sources); }, [pages, sources]);
  useEffect(() => { if (busy) void scheduler.current!.stop(); else scheduler.current!.resume(); }, [busy]);
  const order = pages.map(p => p.id).join(',');
  useEffect(() => {
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); }
      const ids = [...visible].sort((a, b) => Math.abs(a.getBoundingClientRect().top - innerHeight / 2) - Math.abs(b.getBoundingClientRect().top - innerHeight / 2)).map(el => (el as HTMLElement).dataset.pageId!);
      scheduler.current!.visible(ids);
    }, { rootMargin: `${innerHeight}px 0px` });
    document.querySelectorAll('[data-page-id]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [order]);
  return scheduler.current;
}
