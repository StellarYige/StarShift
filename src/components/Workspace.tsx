import { lazy, Suspense, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Upload, Plus, X, ArrowUp, ArrowDown, RotateCw, Download, Eye, Check, LoaderCircle, File, Trash2, ArrowRight, Square, RotateCcw, ShieldCheck, FolderDown } from 'lucide-react';
import type { InputItem, OutputItem, PageItem, Progress, ProgressDetail, Settings, ToolId } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { bytesLabel, checkAbort, errorMessage, MAX_FILE_BYTES, MAX_PAGES, MAX_TOTAL_BYTES, parsePages, stem, uniqueName } from '../core/common';
import { moveToPosition, settingsErrors } from '../core/queue';
import { runWorker } from '../core/worker-client';
import { OfficeError } from '../core/office-error';
import { checkOfficeCompatibility } from '../core/office-compatibility';
import ToolSettings from './ToolSettings';
import { usePageThumbnails } from './usePageThumbnails';

const Preview = lazy(() => import('./Preview'));
const labels = { ready: '等待转换', working: '正在处理', done: '已完成', error: '处理失败', cancelled: '已取消' };
const acceptMap: Record<ToolId, string> = { 'docx-pdf': '.docx', 'image-pdf': '.jpg,.jpeg,.png,.webp', 'image-convert': '.jpg,.jpeg,.png,.webp', 'pdf-image': '.pdf', 'pdf-organize': '.pdf' };

export default function Workspace({ tool }: { tool: ToolId }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [batch, setBatch] = useState(0);
  // Unmount file-owning state on clear. Updating its arrays alone lets React's
  // previous render retain the last File/Blob until another update occurs.
  return <WorkspaceBatch key={batch} tool={tool} settings={settings} setSettings={setSettings} onClear={() => setBatch(n => n + 1)} />;
}

function WorkspaceBatch({ tool, settings, setSettings, onClear }: { tool: ToolId; settings: Settings; setSettings: Dispatch<SetStateAction<Settings>>; onClear: () => void }) {
  const [items, setItems] = useState<InputItem[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [busy, setBusy] = useState(false);
  const thumbnails = usePageThumbnails(pages, items, busy, setPages);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState<{ completed?: number; total?: number; detail?: ProgressDetail }>({});
  const [notice, setNotice] = useState('');
  const [selectionNotice, setSelectionNotice] = useState('');
  const [compatibilityNotice, setCompatibilityNotice] = useState('');
  const [range, setRange] = useState('');
  const [pagePosition, setPagePosition] = useState('1');
  const [pageActionError, setPageActionError] = useState('');
  const [moveId, setMoveId] = useState('');
  const [itemPosition, setItemPosition] = useState('1');
  const [preview, setPreview] = useState<OutputItem>();
  const [zipUrl, setZipUrl] = useState('');
  const zipRef = useRef('');
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const usedNames = useRef(new Set<string>());
  const outputBytes = useRef(0);
  const outputsRef = useRef(outputs); outputsRef.current = outputs;
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const itemsRef = useRef(items); itemsRef.current = items;
  const imageTool = tool.startsWith('image');
  const organize = tool === 'pdf-organize';
  const selected = pages.filter(p => p.selected);
  const usable = items.filter(i => i.preparation !== 'checking');
  const merged = tool === 'image-pdf' || organize;
  const errors = settingsErrors(tool, settings);
  const invalidSettings = Object.keys(errors).length > 0;
  const unfinished = usable.filter(i => i.status !== 'done');
  useEffect(() => {
    if (tool !== 'docx-pdf') return;
    const abort = new AbortController();
    void checkOfficeCompatibility(abort.signal).catch(error => { if (!abort.signal.aborted) setCompatibilityNotice(errorMessage(error)); });
    return () => abort.abort();
  }, [tool]);
  const taskProgress = (abort: AbortController): Progress => (message, completed, total, detail) => {
    if (controller.current !== abort || abort.signal.aborted) return;
    setPhase(message); setProgress({ completed, total, detail });
  };
  const register = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.current.add(url); return url; };
  const revoke = (url?: string) => { if (url) { URL.revokeObjectURL(url); urls.current.delete(url); } };
  useEffect(() => () => { generation.current++; controller.current?.abort(); controller.current = null; running.current = false; itemsRef.current = []; urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); zipRef.current = ''; }, []);
  function updateItem(id: string, change: Partial<InputItem>) { setItems(current => current.map(item => item.id === id ? { ...item, ...change } : item)); }
  function clearZip() { revoke(zipRef.current); zipRef.current = ''; setZipUrl(''); }
  function clearOutputs(sourceIds?: Set<string>) {
    clearZip();
    const removed = outputsRef.current.filter(o => !sourceIds || o.sourceIds.some(id => sourceIds.has(id)));
    const remaining = outputsRef.current.filter(o => !removed.includes(o));
    removed.forEach(o => revoke(o.url));
    outputsRef.current = remaining; setOutputs(remaining);
    usedNames.current = new Set(remaining.map(o => o.name.toLowerCase()));
    outputBytes.current = remaining.reduce((n, o) => n + o.blob.size, 0);
    if (preview && removed.some(o => o.id === preview.id)) setPreview(undefined);
  }
  function clear() {
    generation.current++; controller.current?.abort(); controller.current = null; running.current = false; itemsRef.current = [];
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); zipRef.current = ''; outputBytes.current = 0; usedNames.current.clear();
    onClear();
  }
  function addOutput(name: string, blob: Blob, signal: AbortSignal, sourceIds: string[]) {
    checkAbort(signal);
    clearZip();
    if (outputBytes.current + blob.size > MAX_TOTAL_BYTES) throw new Error('本批输出已接近 300 MB，请下载已有结果后，减少页数或清晰度重试。');
    outputBytes.current += blob.size;
    const output = { id: crypto.randomUUID(), name: uniqueName(name, usedNames.current), blob, url: register(blob), sourceIds };
    outputsRef.current = [...outputsRef.current, output]; setOutputs(outputsRef.current);
  }
  async function addFiles(files: File[]) {
    if (running.current || !files.length) return;
    running.current = true; setBusy(true); setNotice(''); setSelectionNotice('');
    const abort = new AbortController(); controller.current = abort;
    const task = ++generation.current, progressHandler = taskProgress(abort);
    let total = itemsRef.current.reduce((n, i) => n + i.file.size, 0);
    let pageTotal = pages.length;
    const accepted: InputItem[] = [];
    const skipped = { unsupported: 0, empty: 0, fileLimit: 0, batchLimit: 0 };
    for (const file of files) {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptMap[tool].split(',').includes(ext)) { skipped.unsupported++; continue; }
      if (!file.size) { skipped.empty++; continue; }
      if (file.size > MAX_FILE_BYTES) { skipped.fileLimit++; continue; }
      if (total + file.size > MAX_TOTAL_BYTES) { skipped.batchLimit++; continue; }
      total += file.size;
      accepted.push({ id: crypto.randomUUID(), file, rotation: 0, status: 'ready', preparation: 'checking', thumbnailStatus: imageTool ? 'waiting' : undefined });
    }
    setItems(current => [...current, ...accepted]);
    setSelectionNotice([
      skipped.unsupported && `不支持的格式 ${skipped.unsupported} 个（支持 ${acceptMap[tool]}）`,
      skipped.empty && `空文件 ${skipped.empty} 个`, skipped.fileLimit && `超过单文件 100 MB 的文件 ${skipped.fileLimit} 个`,
      skipped.batchLimit && `超过本批 300 MB 上限的文件 ${skipped.batchLimit} 个`,
    ].filter(Boolean).join('；'));
    try {
      await thumbnails.stop();
      for (const item of accepted) {
        checkAbort(abort.signal);
        progressHandler('正在检查文件…', undefined, undefined, { phase: 'prepare', unit: 'file' });
        try {
          if (imageTool) {
            const { inspectImageHeader } = await import('../core/images');
            inspectImageHeader(new Uint8Array(await item.file.slice(0, 1024 * 1024).arrayBuffer()));
            checkAbort(abort.signal);
            updateItem(item.id, { preparation: 'ready', thumbnailStatus: 'loading' });
            progressHandler('正在生成图片缩略图…');
            const [result] = await runWorker({ type: 'image', file: item.file, settings: { ...DEFAULT_SETTINGS, width: 240, height: 180 }, rotation: 0 }, abort.signal);
            checkAbort(abort.signal);
            updateItem(item.id, { thumbnail: register(result.blob), thumbnailStatus: 'ready' });
          } else if (organize) {
            const { pdfPages } = await import('../core/pdf-render');
            const additions = await pdfPages(item.file, item.id, MAX_PAGES - pageTotal, abort.signal);
            checkAbort(abort.signal); pageTotal += additions.length;
            setPages(current => [...current, ...additions]);
            updateItem(item.id, { preparation: 'ready', message: `${additions.length} 页` });
          } else { updateItem(item.id, { preparation: 'ready' }); }
        } catch (error) {
          if (abort.signal.aborted) throw error;
          updateItem(item.id, { preparation: 'error', status: 'error', thumbnailStatus: 'error', message: errorMessage(error) });
        }
      }
    } catch (error) { if (generation.current === task) { setNotice(errorMessage(error)); setItems(current => current.map(i => i.preparation === 'checking' || i.thumbnailStatus === 'loading' ? { ...i, preparation: i.preparation === 'checking' ? 'cancelled' : i.preparation, status: 'cancelled', thumbnailStatus: 'waiting' } : i)); } }
    finally { if (generation.current === task) { controller.current = null; running.current = false; setBusy(false); setPhase(''); setProgress({}); } }
  }
  async function convert(mode: 'unfinished' | 'all' = 'unfinished', retryId?: string) {
    if (running.current || invalidSettings) return;
    running.current = true; setBusy(true); setNotice('');
    const batch = merged || mode === 'all' ? usable : retryId ? usable.filter(i => i.id === retryId) : unfinished;
    if (merged || mode === 'all') clearOutputs();
    const abort = new AbortController(); controller.current = abort;
    const task = ++generation.current, progressHandler = taskProgress(abort);
    let office: import('../core/docx').OfficeSession | undefined;
    try {
      await thumbnails.stop(); checkAbort(abort.signal);
      if (!batch.length || (organize && !selected.length)) throw new Error('请先添加有效文件，并至少选择一页。');
      if (tool === 'image-pdf' || organize) {
        if (organize && batch.some(i => i.preparation !== 'ready')) throw new Error('有文件尚未成功读取。请先重试读取或移除该文件，再整体导出；不会自动跳过。');
        batch.forEach(i => updateItem(i.id, { status: 'working', message: undefined }));
        const results = tool === 'image-pdf'
          ? await runWorker({ type: 'image-pdf', images: batch.map(i => ({ file: i.file, rotation: i.rotation })), settings }, abort.signal, progressHandler)
          : await runWorker({ type: 'organize', sources: await Promise.all(batch.filter(i => selected.some(p => p.sourceId === i.id)).map(async i => ({ id: i.id, bytes: new Uint8Array(await i.file.arrayBuffer()) }))), pages: selected, split: settings.split }, abort.signal, progressHandler);
        if (results.reduce((n, r) => n + r.blob.size, 0) > MAX_TOTAL_BYTES) throw new Error('本批输出超过 300 MB，请减少选中内容后重试。');
        results.forEach(result => addOutput(result.name || '图片合辑.pdf', result.blob, abort.signal, batch.map(i => i.id)));
        batch.forEach(i => updateItem(i.id, { status: 'done' }));
      } else {
        for (const [index, item] of batch.entries()) {
          checkAbort(abort.signal); updateItem(item.id, { status: 'working', message: undefined });
          clearOutputs(new Set([item.id]));
          const fileProgress: Progress = (message, completed, total, detail) => progressHandler(`文件 ${index + 1}/${batch.length} · ${item.file.name}：${message}`, completed, total, { phase: 'render', ...detail, fileIndex: index + 1, fileTotal: batch.length });
          fileProgress('正在准备转换…', index, batch.length, { phase: 'prepare', unit: 'file' });
          try {
            if (tool === 'image-convert') {
              const [result] = await runWorker({ type: 'image', file: item.file, settings, rotation: item.rotation }, abort.signal, fileProgress);
              addOutput(`${stem(item.file.name)}.${settings.format}`, result.blob, abort.signal, [item.id]);
            } else if (tool === 'pdf-image') {
              const { pdfToImages } = await import('../core/pdf-render');
              await pdfToImages(item.file, settings, abort.signal, fileProgress, (name, blob) => addOutput(name, blob, abort.signal, [item.id]));
            } else {
              const { OfficeSession, prepareDocx } = await import('../core/docx');
              progressHandler('正在检查文档结构与外部引用…', undefined, undefined, { phase: 'document-check' });
              const bytes = await prepareDocx(item.file, abort.signal);
              office ??= new OfficeSession(abort.signal, progressHandler);
              addOutput(`${stem(item.file.name)}.pdf`, await office.convert(bytes), abort.signal, [item.id]);
            }
            updateItem(item.id, { status: 'done', preparation: 'ready' });
            fileProgress('转换完成', index + 1, batch.length, { phase: 'export', unit: 'file' });
          } catch (error) {
            if (abort.signal.aborted) throw error;
            updateItem(item.id, { status: 'error', message: `转换失败：${errorMessage(error)}` });
            if (error instanceof OfficeError && error.stopsBatch) {
              setNotice(`${errorMessage(error)} 已停止本批文档引擎，未处理文件和设置已保留，请显式重试。`);
              break;
            }
          }
        }
      }
    } catch (error) {
      if (generation.current === task) {
        setNotice(abort.signal.aborted && tool === 'docx-pdf' ? '已取消文档任务，输入和设置已保留。再次开始转换会重新初始化文档引擎。' : errorMessage(error));
        setItems(current => current.map(i => batch.some(b => b.id === i.id) && i.status !== 'done' && i.status !== 'error' ? { ...i, status: abort.signal.aborted ? 'cancelled' : 'error', message: errorMessage(error) } : i));
      }
    } finally { office?.destroy(); if (generation.current === task) { controller.current = null; running.current = false; setBusy(false); setPhase(''); setProgress({}); } }
  }
  async function downloadZip() {
    if (running.current) return;
    const download = (url: string) => { const a = document.createElement('a'); a.href = url; a.download = 'StarShift-转换结果.zip'; document.body.appendChild(a); a.click(); a.remove(); };
    if (zipRef.current) { download(zipRef.current); return; }
    const abort = new AbortController(); controller.current = abort; running.current = true; setBusy(true); setNotice('');
    const task = ++generation.current, progressHandler = taskProgress(abort);
    try {
      const [result] = await runWorker({ type: 'zip', outputs }, abort.signal, progressHandler);
      checkAbort(abort.signal);
      const url = register(result.blob);
      zipRef.current = url; setZipUrl(url);
      download(url);
    } catch (error) { if (generation.current === task) setNotice(errorMessage(error)); }
    finally { if (generation.current === task) { controller.current = null; running.current = false; setBusy(false); setPhase(''); setProgress({}); } }
  }
  function move<T extends { id: string }>(list: T[], id: string, offset: number) {
    const index = list.findIndex(i => i.id === id); const next = [...list];
    if (index + offset < 0 || index + offset >= list.length) return list;
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    return next;
  }
  function removeItem(item: InputItem) {
    revoke(item.thumbnail); pages.filter(p => p.sourceId === item.id).forEach(p => revoke(p.thumbnail));
    setPages(current => current.filter(p => p.sourceId !== item.id)); setItems(current => current.filter(i => i.id !== item.id));
  }
  async function retry(item: InputItem) {
    if (organize && item.preparation !== 'ready') {
      if (running.current) return;
      const abort = new AbortController(); controller.current = abort; running.current = true; setBusy(true);
      const task = ++generation.current;
      updateItem(item.id, { preparation: 'checking', message: undefined });
      try {
        await thumbnails.stop();
        const { pdfPages } = await import('../core/pdf-render');
        const additions = await pdfPages(item.file, item.id, MAX_PAGES - pages.length, abort.signal);
        checkAbort(abort.signal);
        setPages(current => [...current, ...additions]);
        updateItem(item.id, { preparation: 'ready', status: 'ready', message: `${additions.length} 页` });
      } catch (error) {
        if (generation.current === task) updateItem(item.id, { preparation: abort.signal.aborted ? 'cancelled' : 'error', status: abort.signal.aborted ? 'cancelled' : 'error', message: errorMessage(error) });
      } finally { if (generation.current === task) { controller.current = null; running.current = false; setBusy(false); setPhase(''); setProgress({}); } }
    } else await convert('unfinished', merged ? undefined : item.id);
  }
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
  return <>
    <div className="steps"><span className="step active"><b>1</b>选择文件</span><span className="step-line" /><span className={`step ${items.length ? 'active' : ''}`}><b>2</b>调整设置</span><span className="step-line" /><span className={`step ${outputs.length ? 'active' : ''}`}><b>3</b>转换与下载</span></div>
    <div className="workspace-grid">
      <section className="files-panel panel">
        <div className="panel-heading"><h2>待处理文件 <span className="counter">{items.length}</span></h2>{items.length > 0 && <button className="text-button muted" disabled={busy} onClick={clear}><Trash2 size={15} />清空任务</button>}</div>
        <input ref={input} data-testid="file-input" className="file-input" type="file" multiple accept={acceptMap[tool]} onChange={e => { void addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} aria-label="选择待转换文件" disabled={busy} />
        <button className={`drop-zone ${drag ? 'dragging' : ''} ${items.length ? 'compact' : ''}`} disabled={busy} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); void addFiles(Array.from(e.dataTransfer.files)); }}>
          <span className="upload-icon">{items.length ? <Plus size={22} /> : <Upload size={28} strokeWidth={1.7} />}</span>
          <strong>{items.length ? '继续添加文件' : '把文件拖到这里'}</strong>
          {!items.length && <><span>或点击选择文件</span><small>{acceptMap[tool].replaceAll('.', '').replaceAll(',', ' / ').toUpperCase()} <i>·</i> 支持批量选择</small></>}
        </button>
        {!items.length && <div className="empty-note"><ShieldCheck size={15} /><span>文件只留在你的浏览器中</span><span className="dot">·</span><span>无需注册</span></div>}
        {!!items.length && <ul className="file-list">{items.map((item, index) => <li key={item.id} className={`file-row status-${item.status}`}>
          <div className="file-thumb">{item.thumbnail ? <img src={item.thumbnail} alt="" style={{ transform: `rotate(${item.rotation}deg)` }} /> : <File size={23} strokeWidth={1.5} />}</div>
          <div className="file-info"><strong title={item.file.name}>{item.file.name}</strong><span>{bytesLabel(item.file.size)}<i>·</i>{(item.status === 'working' || item.preparation === 'checking') && <LoaderCircle size={12} className="spin" />}{item.status === 'done' && <Check size={12} />}{item.preparation === 'checking' ? '正在检查文件' : labels[item.status]}{item.rotation > 0 && ` · ${item.rotation}°`}</span>{item.thumbnailStatus === 'loading' && <small>缩略图生成中…</small>}{item.message && <small role={item.status === 'error' ? 'alert' : undefined}>{item.message}</small>}</div>
          <div className="file-actions">{imageTool && <><button className="icon-button" title="向前移动" aria-label={`向前移动 ${item.file.name}`} disabled={busy || index === 0} onClick={() => setItems(current => move(current, item.id, -1))}><ArrowUp size={15} /></button><button className="icon-button" title="向后移动" aria-label={`向后移动 ${item.file.name}`} disabled={busy || index === items.length - 1} onClick={() => setItems(current => move(current, item.id, 1))}><ArrowDown size={15} /></button><button className="icon-button" title="顺时针旋转" aria-label={`旋转 ${item.file.name}`} disabled={busy} onClick={() => updateItem(item.id, { rotation: (item.rotation + 90) % 360 })}><RotateCw size={15} /></button></>}
            {tool === 'image-pdf' && <button className="text-button" aria-label={`移到指定位置 ${item.file.name}`} disabled={busy} onClick={() => { setMoveId(item.id); setItemPosition(String(index + 1)); }}>移到…</button>}
            {(item.status === 'error' || item.status === 'cancelled') && <button className="icon-button" title={merged ? '整体重试；读取失败时先重试读取' : '重试此文件'} aria-label={`重试 ${item.file.name}`} disabled={busy || invalidSettings} onClick={() => void retry(item)}><RotateCcw size={15} /></button>}
            <button className="icon-button" aria-label={`移除 ${item.file.name}`} title="移除文件" disabled={busy} onClick={() => removeItem(item)}><X size={16} /></button></div>
        </li>)}</ul>}
        {moveId && <form className="queue-position" onSubmit={e => { e.preventDefault(); const n = Number(itemPosition); if (Number.isInteger(n) && n >= 1 && n <= items.length) { setItems(current => moveToPosition(current, new Set([moveId]), n)); setMoveId(''); } }}><label>移到第 N 位<input aria-label="文件目标位置" type="number" min="1" max={items.length} required value={itemPosition} onChange={e => setItemPosition(e.target.value)} /></label><button className="button secondary" disabled={busy}>移动文件</button><button className="text-button" type="button" onClick={() => setMoveId('')}>关闭</button></form>}
        {organize && pages.length > 0 && <div className="page-editor"><div className="page-toolbar"><strong>已选 {selected.length} / {pages.length} 页</strong><button className="text-button" disabled={busy} onClick={() => setPages(current => current.map(p => ({ ...p, selected: true })))}>全选</button><button className="text-button" disabled={busy} onClick={() => setPages(current => current.map(p => ({ ...p, selected: !p.selected })))}>反选</button><button className="text-button muted" disabled={busy || !selected.length} onClick={() => { selected.forEach(p => revoke(p.thumbnail)); setPages(current => current.filter(p => !p.selected)); }}>删除选中</button></div>
          <fieldset className="page-batch" disabled={busy}><div><label>按队列位置选择<input aria-label="队列位置范围" placeholder="全部，例如 1-3,5" value={range} onChange={e => setRange(e.target.value)} /></label><button className="button secondary" onClick={selectRange}>应用选择范围</button></div><div><button className="button secondary" disabled={!selected.length} onClick={() => setPages(current => current.map(p => p.selected ? { ...p, rotation: (p.rotation + 90) % 360 } : p))}>旋转选中页</button><label>移动到第 N 位<input aria-label="选中页目标位置" type="number" min="1" max={pages.length - selected.length + 1} value={pagePosition} onChange={e => setPagePosition(e.target.value)} /></label><button className="button secondary" disabled={!selected.length} onClick={movePages}>移动选中页</button></div><p className="hint">范围只改变勾选状态，导出顺序取当前队列。移动位置按移走选中页后的队列计算，选中页内部顺序保留。</p>{pageActionError && <p className="field-error" role="alert">{pageActionError}</p>}</fieldset>
          <div className="page-grid">{pages.map((p, index) => <article key={p.id} data-page-id={p.id} data-source-page={p.page} className={`page-card ${p.selected ? 'selected' : ''}`}>
          <label><input aria-label={`选择 ${p.sourceName} 第 ${p.page} 页`} type="checkbox" checked={p.selected} disabled={busy} onChange={e => setPages(current => current.map(x => x.id === p.id ? { ...x, selected: e.target.checked } : x))} /><span className="page-image">{p.thumbnail ? <img src={p.thumbnail} alt={`${p.sourceName} 第 ${p.page} 页缩略图`} style={{ transform: `rotate(${p.rotation}deg)` }} /> : <span>{p.thumbnailStatus === 'error' ? '缩略图失败，可尝试导出' : '缩略图待生成'}</span>}</span><strong>位置 {index + 1} · 原第 {p.page} 页</strong><small title={p.sourceName}>{p.sourceName}</small></label>
          <div className="page-actions"><button className="icon-button" aria-label={`前移页面 ${index + 1}`} disabled={busy || index === 0} onClick={() => setPages(current => move(current, p.id, -1))}><ArrowUp size={15} /></button><button className="icon-button" aria-label={`后移页面 ${index + 1}`} disabled={busy || index === pages.length - 1} onClick={() => setPages(current => move(current, p.id, 1))}><ArrowDown size={15} /></button><button className="icon-button" aria-label={`旋转页面 ${index + 1}`} disabled={busy} onClick={() => setPages(current => current.map(x => x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x))}><RotateCw size={15} /></button></div>
        </article>)}</div></div>}
      </section>
      <aside className="settings-panel panel"><div className="panel-heading"><h2>转换设置</h2><span className="subtle">OPTIONS</span></div><ToolSettings tool={tool} settings={settings} set={value => setSettings(current => ({ ...current, ...value }))} disabled={busy} />
        {compatibilityNotice && <p className="notice" role="alert">{compatibilityNotice}</p>}
        <div className="convert-actions">{busy ? <button className="button cancel" onClick={() => controller.current?.abort()}><Square size={14} />取消任务</button> : <><button className="button primary" disabled={!unfinished.length || invalidSettings || (organize && !selected.length) || (tool === 'docx-pdf' && !crossOriginIsolated)} onClick={() => void convert()}>{outputs.length ? '转换未完成项' : organize ? '导出选中页面' : '开始转换'}<ArrowRight size={17} /></button>{outputs.length > 0 && <button className="button secondary" disabled={invalidSettings || !usable.length || (organize && !selected.length)} onClick={() => void convert('all')}>全部重新转换</button>}</>}<small><ShieldCheck size={13} />{outputs.length ? '全部重新转换会替换当前结果' : '本地处理 · 不上传文件'}</small>{outputs.length > 0 && <button className="text-button results-jump" onClick={() => { const section = document.getElementById('conversion-results'); section?.scrollIntoView({ behavior: 'smooth', block: 'start' }); section?.focus({ preventScroll: true }); }}>查看结果（{outputs.length}）</button>}</div>
      </aside>
    </div>
    {busy && <div className="progress-panel" role="status" aria-live="polite" data-phase={progress.detail?.phase} data-startup-stage={progress.detail?.startup?.stage}><LoaderCircle className="spin" size={18} /><span>{phase || '正在准备…'}</span>{!!progress.total && <><span>{progress.completed} / {progress.total}</span><progress max={progress.total} value={progress.completed} /></>}{progress.detail?.loadedBytes !== undefined && <span>已读取 {bytesLabel(progress.detail.loadedBytes)}{progress.detail.totalBytes ? ` / ${bytesLabel(progress.detail.totalBytes)}` : ''}</span>}{progress.detail?.startup?.stage === 'resources' && progress.detail.downloadActive && <span>最近仍收到下载数据…</span>}{progress.detail?.quietForMs !== undefined && <span className="startup-wait">已 {Math.floor(progress.detail.quietForMs / 1000)} 秒未收到新的{progress.detail.startup?.stage === 'resources' ? '资源加载进度；部分下载无法持续报告进度。' : '初始化进展。'}可继续等待，或取消后重新初始化；输入和设置会保留。</span>}</div>}
    {notice && <div className="notice" role="alert">{notice}<button className="icon-button" aria-label="关闭提示" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {selectionNotice && <div className="notice" role="alert">已跳过：{selectionNotice}</div>}
    {outputs.length > 0 && <section id="conversion-results" tabIndex={-1} className="results-panel panel"><div className="panel-heading"><h2><span className="success-dot"><Check size={14} /></span>转换结果 <span className="counter">{outputs.length}</span></h2><button className="button secondary small" disabled={busy} onClick={() => void downloadZip()}><FolderDown size={16} />全部打包下载</button></div><ul className="result-list">{outputs.map(o => <li key={o.id}><div className="result-icon"><File size={21} /></div><div className="file-info"><strong title={o.name}>{o.name}</strong><span>{bytesLabel(o.blob.size)} · {o.blob.type === 'application/pdf' ? 'PDF' : o.blob.type.split('/')[1].toUpperCase()}</span></div><button className="button ghost small" aria-label="预览" onClick={e => { previewTrigger.current = e.currentTarget; setPreview(o); }}><Eye size={16} /><span>预览</span></button><a className="button secondary small" aria-label="下载" href={o.url} download={o.name}><Download size={16} /><span>下载</span></a></li>)}</ul><p className="result-note">结果仅保存在当前页面。下载后可清空任务，关闭或刷新页面会释放文件。</p></section>}
    <p className="memory-note">为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。</p>
    {zipUrl && <p className="zip-ready"><a className="button secondary small" href={zipUrl} download="StarShift-转换结果.zip"><Download size={16} />下载已准备的 ZIP</a><span>如果浏览器没有开始下载，请点击此链接。</span></p>}
    {preview && <Suspense fallback={<p role="status">正在打开预览…</p>}><Preview key={preview.id} output={preview} onClose={() => { setPreview(undefined); previewTrigger.current?.focus(); }} /></Suspense>}
  </>;
}
