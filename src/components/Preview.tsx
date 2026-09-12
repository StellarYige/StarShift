import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { OutputItem } from '../types';
import { checkAbort, errorMessage } from '../core/common';

export default function Preview({ output, onClose }: { output: OutputItem; onClose: () => void }) {
  const [page, setPage] = useState(1), [jump, setJump] = useState('1');
  const [count, setCount] = useState(1), [zoom, setZoom] = useState('fit');
  const [image, setImage] = useState(''), [imageWidth, setImageWidth] = useState(0), [naturalWidth, setNaturalWidth] = useState(0);
  const [error, setError] = useState(''), [jumpError, setJumpError] = useState('');
  const [loading, setLoading] = useState(true), [retry, setRetry] = useState(0), [openRetry, setOpenRetry] = useState(0);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [width, setWidth] = useState(800);
  const dialog = useRef<HTMLDialogElement>(null), body = useRef<HTMLDivElement>(null);
  const renderQueue = useRef<Promise<unknown>>(Promise.resolve());
  const isPdf = output.blob.type === 'application/pdf';
  useEffect(() => {
    const modal = dialog.current!, trigger = document.activeElement as HTMLElement | null;
    modal.showModal();
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0].contentRect.width)));
    observer.observe(body.current!);
    return () => { observer.disconnect(); modal.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  // One document/Worker per dialog, independent of the current render.
  useEffect(() => {
    if (!isPdf) { setLoading(false); return; }
    const controller = new AbortController();
    let current: PDFDocumentProxy | undefined;
    setDoc(undefined); setLoading(true); setError('');
    void (async () => {
      const { openPdf } = await import('../core/pdf-render');
      current = await openPdf(output.blob, controller.signal);
      checkAbort(controller.signal);
      setCount(current.numPages); setDoc(current);
    })().catch(e => { if (!controller.signal.aborted) { setError(errorMessage(e)); setLoading(false); } });
    return () => { controller.abort(); void current?.loadingTask.destroy().catch(() => {}); };
  }, [output, isPdf, openRetry]);
  useEffect(() => {
    if (!isPdf || !doc) return;
    const controller = new AbortController();
    let url = '';
    setLoading(true); setImage(''); setError('');
    // Wait for old rendering/cleanup before reusing the same cached page.
    renderQueue.current = renderQueue.current.catch(() => {}).then(async () => {
      checkAbort(controller.signal);
      const { renderPdfPage } = await import('../core/pdf-render');
      const p = await doc.getPage(page);
      checkAbort(controller.signal);
      const view = p.getViewport({ scale: 1 });
      const scale = zoom === 'fit' ? width / view.width : Number(zoom) * 96 / 72;
      const blob = await renderPdfPage(doc, page, scale, 'png', 1, controller.signal);
      checkAbort(controller.signal);
      url = URL.createObjectURL(blob); setImageWidth(view.width * scale); setImage(url);
    }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [doc, page, zoom, width, retry, isPdf]);
  function go(n: number) { setPage(n); setJump(String(n)); setJumpError(''); }
  function jumpToPage() {
    const n = Number(jump);
    if (!Number.isInteger(n) || n < 1 || n > count) { setJumpError(`请输入 1–${count} 之间的页码。`); return; }
    go(n);
  }
  return <dialog ref={dialog} className="preview-dialog" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={e => {
    if (!isPdf || /INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(Math.max(1, page - 1)); }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(Math.min(count, page + 1)); }
    if (e.key === 'Home') { e.preventDefault(); go(1); }
    if (e.key === 'End') { e.preventDefault(); go(count); }
  }}>
    <div className="preview-header"><strong>{output.name}</strong><button className="icon-button" aria-label="关闭预览" onClick={onClose}><X size={20} /></button></div>
    <div className="preview-controls">
      <label>缩放<select aria-label="预览缩放" value={zoom} onChange={e => setZoom(e.target.value)}><option value="fit">适合宽度</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label>
      {isPdf && <form onSubmit={e => { e.preventDefault(); jumpToPage(); }}><label>跳到第<input aria-label="预览页码" type="number" min="1" max={count} value={jump} onChange={e => setJump(e.target.value)} aria-invalid={!!jumpError} /></label><button className="button secondary" type="submit">跳转</button></form>}
      {jumpError && <span className="field-error" role="alert">{jumpError}</span>}
    </div>
    <div ref={body} className="preview-body checker">
      {loading && <p role="status">正在生成预览…</p>}
      {error && <div className="preview-error"><p role="alert">{error}</p><button className="button secondary" onClick={() => { setError(''); if (isPdf && !doc) setOpenRetry(n => n + 1); else setRetry(n => n + 1); }}>重试当前页</button></div>}
      {!loading && !error && (!isPdf || image) && <img src={isPdf ? image : output.url} style={{ width: zoom === 'fit' ? '100%' : isPdf ? imageWidth : naturalWidth ? naturalWidth * Number(zoom) : undefined, maxWidth: zoom === 'fit' ? '100%' : 'none' }} onError={() => setError('预览图片读取失败，请重试；仍可下载原结果。')} onLoad={e => { if (!isPdf) setNaturalWidth(e.currentTarget.naturalWidth); }} alt={`${output.name}${isPdf ? ` 第 ${page} 页` : ''}`} />}
    </div>
    <div className="preview-footer">{isPdf && <div className="pager"><button className="icon-button" aria-label="上一页" disabled={page === 1 || !doc} onClick={() => go(page - 1)}><ChevronLeft size={18} /></button><span aria-live="polite">第 {page} / {count} 页</span><button className="icon-button" aria-label="下一页" disabled={page === count || !doc} onClick={() => go(page + 1)}><ChevronRight size={18} /></button></div>}<a className="button primary" href={output.url} download={output.name}><Download size={16} />下载文件</a></div>
  </dialog>;
}
