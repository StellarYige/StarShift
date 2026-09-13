import { useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, RotateCw } from 'lucide-react';
import type { PageItem } from '../types';
import { errorMessage, parsePages } from '../core/common';
import { moveByOffset, moveToPosition } from '../core/queue';

interface Props {
  pages: PageItem[];
  busy: boolean;
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  revoke: (url?: string) => void;
}

export default function PageEditor({ pages, busy, setPages, revoke }: Props) {
  const [range, setRange] = useState('');
  const [pagePosition, setPagePosition] = useState('1');
  const [pageActionError, setPageActionError] = useState('');
  const selected = pages.filter(p => p.selected);

  function selectRange() {
    try {
      const positions = new Set(parsePages(range, pages.length));
      setPages(current => current.map((p, index) => ({ ...p, selected: positions.has(index + 1) })));
      setPageActionError('');
    } catch (error) { setPageActionError(errorMessage(error)); }
  }
  function movePages() {
    const position = Number(pagePosition), maximum = pages.length - selected.length + 1;
    if (!selected.length || !Number.isInteger(position) || position < 1 || position > maximum) { setPageActionError(`目标位置须在 1–${maximum} 之间，按移走选中页后的队列计算。`); return; }
    setPages(current => moveToPosition(current, new Set(selected.map(p => p.id)), position)); setPageActionError('');
  }
  // Keep form state until the batch is cleared, including an empty page queue.
  return <>
        {pages.length > 0 && <div className="page-editor"><div className="page-toolbar"><strong>已选 {selected.length} / {pages.length} 页</strong><button className="text-button" disabled={busy} onClick={() => setPages(current => current.map(p => ({ ...p, selected: true })))}>全选</button><button className="text-button" disabled={busy} onClick={() => setPages(current => current.map(p => ({ ...p, selected: !p.selected })))}>反选</button><button className="text-button muted" disabled={busy || !selected.length} onClick={() => { selected.forEach(p => revoke(p.thumbnail)); setPages(current => current.filter(p => !p.selected)); }}>删除选中</button></div>
          <fieldset className="page-batch" disabled={busy}><div><label>按队列位置选择<input aria-label="队列位置范围" placeholder="全部，例如 1-3,5" value={range} onChange={e => setRange(e.target.value)} /></label><button className="button secondary" onClick={selectRange}>应用选择范围</button></div><div><button className="button secondary" disabled={!selected.length} onClick={() => setPages(current => current.map(p => p.selected ? { ...p, rotation: (p.rotation + 90) % 360 } : p))}>旋转选中页</button><label>移动到第 N 位<input aria-label="选中页目标位置" type="number" min="1" max={pages.length - selected.length + 1} value={pagePosition} onChange={e => setPagePosition(e.target.value)} /></label><button className="button secondary" disabled={!selected.length} onClick={movePages}>移动选中页</button></div><p className="hint">范围只改变勾选状态，导出顺序取当前队列。移动位置按移走选中页后的队列计算，选中页内部顺序保留。</p>{pageActionError && <p className="field-error" role="alert">{pageActionError}</p>}</fieldset>
          <div className="page-grid">{pages.map((p, index) => <article key={p.id} data-page-id={p.id} data-source-page={p.page} data-thumbnail-state={p.thumbnailStatus} className={`page-card ${p.selected ? 'selected' : ''}`}>
          <label><input aria-label={`选择 ${p.sourceName} 第 ${p.page} 页`} type="checkbox" checked={p.selected} disabled={busy} onChange={e => setPages(current => current.map(x => x.id === p.id ? { ...x, selected: e.target.checked } : x))} /><span className="page-image">{p.thumbnail ? <img src={p.thumbnail} alt={`${p.sourceName} 第 ${p.page} 页缩略图`} style={{ transform: `rotate(${p.rotation}deg)` }} /> : <span>{p.thumbnailStatus === 'error' ? '缩略图失败，可尝试导出' : p.thumbnailStatus === 'loading' ? '正在生成缩略图…' : '缩略图待生成'}</span>}</span><strong>位置 {index + 1} · 原第 {p.page} 页</strong><small title={p.sourceName}>{p.sourceName}</small></label>
          <div className="page-actions"><button className="icon-button" aria-label={`前移页面 ${index + 1}`} disabled={busy || index === 0} onClick={() => setPages(current => moveByOffset(current, p.id, -1))}><ArrowUp size={15} /></button><button className="icon-button" aria-label={`后移页面 ${index + 1}`} disabled={busy || index === pages.length - 1} onClick={() => setPages(current => moveByOffset(current, p.id, 1))}><ArrowDown size={15} /></button><button className="icon-button" aria-label={`旋转页面 ${index + 1}`} disabled={busy} onClick={() => setPages(current => current.map(x => x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x))}><RotateCw size={15} /></button></div>
        </article>)}</div></div>}
  </>;
}
