import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { OutputItem } from '../types';
import { errorMessage } from '../core/common';

export default function Preview({ output, onClose }: { output: OutputItem; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(1);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const isPdf = output.blob.type === 'application/pdf';
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!isPdf) return;
    const controller = new AbortController();
    let url = '';
    setLoading(true); setImage(''); setError('');
    void (async () => {
      const { openPdf, renderPdfPage } = await import('../core/pdf-render');
      const doc = await openPdf(output.blob, controller.signal);
      try {
        if (controller.signal.aborted) return;
        setCount(doc.numPages);
        const p = await doc.getPage(page);
        const view = p.getViewport({ scale: 1 });
        const blob = await renderPdfPage(doc, page, Math.min(1100 / view.width, 1.75), 'png', 1, controller.signal);
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setImage(url);
      } finally { await doc.loadingTask.destroy(); }
    })().catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [output, page, isPdf]);
  return <dialog ref={dialog} className="preview-dialog" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="preview-header"><strong>{output.name}</strong><button className="icon-button" aria-label="关闭预览" onClick={onClose}><X size={20} /></button></div>
    <div className="preview-body checker">
      {loading && <p role="status">正在生成预览…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (!isPdf || image) && <img src={isPdf ? image : output.url} alt={`${output.name}${isPdf ? ` 第 ${page} 页` : ''}`} />}
    </div>
    <div className="preview-footer">{isPdf && <div className="pager"><button className="icon-button" aria-label="上一页" disabled={page === 1 || loading} onClick={() => setPage(n => n - 1)}><ChevronLeft size={18} /></button><span>第 {page} / {count} 页</span><button className="icon-button" aria-label="下一页" disabled={page === count || loading} onClick={() => setPage(n => n + 1)}><ChevronRight size={18} /></button></div>}<a className="button primary" href={output.url} download={output.name}><Download size={16} />下载文件</a></div>
  </dialog>;
}
