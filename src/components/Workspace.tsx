import { lazy, Suspense, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Upload, Plus, X, ArrowUp, ArrowDown, RotateCw, Download, Eye, Check, LoaderCircle, File, Trash2, ArrowRight, Square, RotateCcw, ShieldCheck, FolderDown } from 'lucide-react';
import type { InputItem, OutputItem, PageItem, Progress, ProgressDetail, Settings, ToolId } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { bytesLabel, checkAbort, errorMessage, MAX_FILE_BYTES, MAX_PAGES, MAX_TOTAL_BYTES, stem, uniqueName } from '../core/common';
import { runWorker } from '../core/worker-client';
import { OfficeError } from '../core/office-error';
import ToolSettings from './ToolSettings';

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
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState<{ completed?: number; total?: number; detail?: ProgressDetail }>({});
  const [notice, setNotice] = useState('');
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
  const itemsRef = useRef(items); itemsRef.current = items;
  const imageTool = tool.startsWith('image');
  const organize = tool === 'pdf-organize';
  const selected = pages.filter(p => p.selected);
  const usable = items.filter(i => i.status !== 'working' && (!organize || pages.some(p => p.sourceId === i.id)));
  const taskProgress = (abort: AbortController): Progress => (message, completed, total, detail) => {
    if (controller.current !== abort || abort.signal.aborted) return;
    setPhase(message); setProgress({ completed, total, detail });
  };
  const register = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.current.add(url); return url; };
  const revoke = (url?: string) => { if (url) { URL.revokeObjectURL(url); urls.current.delete(url); } };
  useEffect(() => () => { generation.current++; controller.current?.abort(); controller.current = null; running.current = false; itemsRef.current = []; urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); zipRef.current = ''; }, []);
  function updateItem(id: string, change: Partial<InputItem>) { setItems(current => current.map(item => item.id === id ? { ...item, ...change } : item)); }
  function clearZip() { revoke(zipRef.current); zipRef.current = ''; setZipUrl(''); }
  function clearOutputs() { clearZip(); outputs.forEach(o => revoke(o.url)); setOutputs([]); usedNames.current.clear(); outputBytes.current = 0; setPreview(undefined); }
  function clear() {
    generation.current++; controller.current?.abort(); controller.current = null; running.current = false; itemsRef.current = [];
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); zipRef.current = ''; outputBytes.current = 0; usedNames.current.clear();
    onClear();
  }
  function addOutput(name: string, blob: Blob, signal: AbortSignal) {
    checkAbort(signal);
    clearZip();
    if (outputBytes.current + blob.size > MAX_TOTAL_BYTES) throw new Error('本批输出已接近 300 MB，请下载已有结果后，减少页数或清晰度重试。');
    outputBytes.current += blob.size;
    const output = { id: crypto.randomUUID(), name: uniqueName(name, usedNames.current), blob, url: register(blob) };
    setOutputs(current => [...current, output]);
  }
  async function addFiles(files: File[]) {
    if (running.current || !files.length) return;
    running.current = true; setBusy(true); setNotice('');
    const abort = new AbortController(); controller.current = abort;
    const task = ++generation.current, progressHandler = taskProgress(abort);
    let total = itemsRef.current.reduce((n, i) => n + i.file.size, 0);
    let pageTotal = pages.length;
    const accepted: InputItem[] = [];
    for (const file of files) {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptMap[tool].split(',').includes(ext)) { setNotice(`请选择 ${acceptMap[tool]} 格式；不支持的文件已跳过。`); continue; }
      if (!file.size || file.size > MAX_FILE_BYTES || total + file.size > MAX_TOTAL_BYTES) { setNotice('已跳过空文件或超大文件。内存保护：单文件 100 MB，本批合计 300 MB。'); continue; }
      total += file.size;
      accepted.push({ id: crypto.randomUUID(), file, rotation: 0, status: 'working' });
    }
    setItems(current => [...current, ...accepted]);
    try {
      for (const item of accepted) {
        checkAbort(abort.signal);
        progressHandler('正在检查文件…');
        try {
          if (imageTool) {
            const [result] = await runWorker({ type: 'image', file: item.file, settings: { ...DEFAULT_SETTINGS, width: 240, height: 180 }, rotation: 0 }, abort.signal);
            checkAbort(abort.signal);
            updateItem(item.id, { thumbnail: register(result.blob), status: 'ready' });
          } else if (organize) {
            const { pdfThumbnails } = await import('../core/pdf-render');
            const thumbnails = await pdfThumbnails(item.file, item.id, abort.signal, progressHandler);
            if (pageTotal + thumbnails.length > MAX_PAGES) { thumbnails.forEach(p => URL.revokeObjectURL(p.thumbnail)); throw new Error(`本批页面超过 ${MAX_PAGES} 页，请减少文件数量。`); }
            pageTotal += thumbnails.length;
            if (abort.signal.aborted) { thumbnails.forEach(p => URL.revokeObjectURL(p.thumbnail)); checkAbort(abort.signal); }
            thumbnails.forEach(p => urls.current.add(p.thumbnail));
            setPages(current => [...current, ...thumbnails]);
            updateItem(item.id, { status: 'ready', message: `${thumbnails.length} 页` });
          } else { updateItem(item.id, { status: 'ready' }); }
        } catch (error) {
          if (abort.signal.aborted) throw error;
          updateItem(item.id, { status: 'error', message: errorMessage(error) });
        }
      }
    } catch (error) { if (generation.current === task) { setNotice(errorMessage(error)); setItems(current => current.map(i => i.status === 'working' ? { ...i, status: 'cancelled' } : i)); } }
    finally { if (generation.current === task) { controller.current = null; running.current = false; setBusy(false); setPhase(''); setProgress({}); } }
  }
  async function convert(retryId?: string) {
    if (running.current) return;
    running.current = true; setBusy(true); setNotice('');
    if (!retryId) clearOutputs();
    const abort = new AbortController(); controller.current = abort;
    const task = ++generation.current, progressHandler = taskProgress(abort);
    const batch = retryId ? items.filter(i => i.id === retryId) : usable;
    let office: import('../core/docx').OfficeSession | undefined;
    try {
      if (!batch.length || (organize && !selected.length)) throw new Error('请先添加有效文件，并至少选择一页。');
      if (tool === 'image-pdf' || organize) {
        batch.forEach(i => updateItem(i.id, { status: 'working', message: undefined }));
        const results = tool === 'image-pdf'
          ? await runWorker({ type: 'image-pdf', images: batch.map(i => ({ file: i.file, rotation: i.rotation })), settings }, abort.signal, progressHandler)
          : await runWorker({ type: 'organize', sources: await Promise.all(batch.map(async i => ({ id: i.id, bytes: new Uint8Array(await i.file.arrayBuffer()) }))), pages: selected, split: settings.split }, abort.signal, progressHandler);
        results.forEach(result => addOutput(result.name || '图片合辑.pdf', result.blob, abort.signal));
        batch.forEach(i => updateItem(i.id, { status: 'done' }));
      } else {
        for (const item of batch) {
          checkAbort(abort.signal); updateItem(item.id, { status: 'working', message: undefined });
          progressHandler('正在准备转换…');
          try {
            if (tool === 'image-convert') {
              const [result] = await runWorker({ type: 'image', file: item.file, settings, rotation: item.rotation }, abort.signal, progressHandler);
              addOutput(`${stem(item.file.name)}.${settings.format}`, result.blob, abort.signal);
            } else if (tool === 'pdf-image') {
              const { pdfToImages } = await import('../core/pdf-render');
              await pdfToImages(item.file, settings, abort.signal, progressHandler, (name, blob) => addOutput(name, blob, abort.signal));
            } else {
              const { OfficeSession, prepareDocx } = await import('../core/docx');
              progressHandler('正在检查文档结构与外部引用…', undefined, undefined, { phase: 'document-check' });
              const bytes = await prepareDocx(item.file, abort.signal);
              office ??= new OfficeSession(abort.signal, progressHandler);
              addOutput(`${stem(item.file.name)}.pdf`, await office.convert(bytes), abort.signal);
            }
            updateItem(item.id, { status: 'done' });
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
    if (organize) {
      removeItem(item);
      itemsRef.current = itemsRef.current.filter(i => i.id !== item.id);
      await addFiles([item.file]);
    } else if (tool === 'image-pdf') await convert();
    else await convert(item.id);
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
          <div className="file-info"><strong title={item.file.name}>{item.file.name}</strong><span>{bytesLabel(item.file.size)}<i>·</i>{item.status === 'working' && <LoaderCircle size={12} className="spin" />}{item.status === 'done' && <Check size={12} />}{labels[item.status]}{item.rotation > 0 && ` · ${item.rotation}°`}</span>{item.message && <small role={item.status === 'error' ? 'alert' : undefined}>{item.message}</small>}</div>
          <div className="file-actions">{imageTool && <><button className="icon-button" title="向前移动" aria-label={`向前移动 ${item.file.name}`} disabled={busy || index === 0} onClick={() => setItems(current => move(current, item.id, -1))}><ArrowUp size={15} /></button><button className="icon-button" title="向后移动" aria-label={`向后移动 ${item.file.name}`} disabled={busy || index === items.length - 1} onClick={() => setItems(current => move(current, item.id, 1))}><ArrowDown size={15} /></button><button className="icon-button" title="顺时针旋转" aria-label={`旋转 ${item.file.name}`} disabled={busy} onClick={() => updateItem(item.id, { rotation: (item.rotation + 90) % 360 })}><RotateCw size={15} /></button></>}
            {(item.status === 'error' || item.status === 'cancelled') && <button className="icon-button" title="重试" aria-label={`重试 ${item.file.name}`} disabled={busy} onClick={() => void retry(item)}><RotateCcw size={15} /></button>}
            <button className="icon-button" aria-label={`移除 ${item.file.name}`} title="移除文件" disabled={busy} onClick={() => removeItem(item)}><X size={16} /></button></div>
        </li>)}</ul>}
        {organize && pages.length > 0 && <div className="page-editor"><div className="page-toolbar"><strong>已选 {selected.length} / {pages.length} 页</strong><button className="text-button" disabled={busy} onClick={() => setPages(current => current.map(p => ({ ...p, selected: true })))}>全选</button><button className="text-button" disabled={busy} onClick={() => setPages(current => current.map(p => ({ ...p, selected: !p.selected })))}>反选</button><button className="text-button muted" disabled={busy || !selected.length} onClick={() => { selected.forEach(p => revoke(p.thumbnail)); setPages(current => current.filter(p => !p.selected)); }}>删除选中</button></div><div className="page-grid">{pages.map((p, index) => <article key={p.id} className={`page-card ${p.selected ? 'selected' : ''}`}>
          <label><input aria-label={`选择 ${p.sourceName} 第 ${p.page} 页`} type="checkbox" checked={p.selected} disabled={busy} onChange={e => setPages(current => current.map(x => x.id === p.id ? { ...x, selected: e.target.checked } : x))} /><span className="page-image"><img src={p.thumbnail} alt={`${p.sourceName} 第 ${p.page} 页缩略图`} style={{ transform: `rotate(${p.rotation}deg)` }} /></span><strong>第 {p.page} 页</strong><small title={p.sourceName}>{p.sourceName}</small></label>
          <div className="page-actions"><button className="icon-button" aria-label={`前移页面 ${index + 1}`} disabled={busy || index === 0} onClick={() => setPages(current => move(current, p.id, -1))}><ArrowUp size={15} /></button><button className="icon-button" aria-label={`后移页面 ${index + 1}`} disabled={busy || index === pages.length - 1} onClick={() => setPages(current => move(current, p.id, 1))}><ArrowDown size={15} /></button><button className="icon-button" aria-label={`旋转页面 ${index + 1}`} disabled={busy} onClick={() => setPages(current => current.map(x => x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360 } : x))}><RotateCw size={15} /></button></div>
        </article>)}</div></div>}
      </section>
      <aside className="settings-panel panel"><div className="panel-heading"><h2>转换设置</h2><span className="subtle">OPTIONS</span></div><ToolSettings tool={tool} settings={settings} set={value => setSettings(current => ({ ...current, ...value }))} disabled={busy} />
        {tool === 'docx-pdf' && !crossOriginIsolated && <p className="notice" role="alert">当前浏览器未启用安全隔离，DOCX 转换不可用。请通过 HTTPS 或 localhost 访问，并尝试刷新。</p>}
        <div className="convert-actions">{busy ? <button className="button cancel" onClick={() => controller.current?.abort()}><Square size={14} />取消任务</button> : <button className="button primary" disabled={!usable.length || (organize && !selected.length) || (tool === 'docx-pdf' && !crossOriginIsolated)} onClick={() => void convert()}>{outputs.length ? '重新转换' : organize ? '导出选中页面' : '开始转换'}<ArrowRight size={17} /></button>}<small><ShieldCheck size={13} />本地处理 · 不上传文件</small></div>
      </aside>
    </div>
    {busy && <div className="progress-panel" role="status" aria-live="polite" data-phase={progress.detail?.phase} data-startup-stage={progress.detail?.startup?.stage}><LoaderCircle className="spin" size={18} /><span>{phase || '正在准备…'}</span>{!!progress.total && <><span>{progress.completed} / {progress.total}</span><progress max={progress.total} value={progress.completed} /></>}{progress.detail?.loadedBytes !== undefined && <span>已读取 {bytesLabel(progress.detail.loadedBytes)}{progress.detail.totalBytes ? ` / ${bytesLabel(progress.detail.totalBytes)}` : ''}</span>}{progress.detail?.startup?.stage === 'resources' && progress.detail.downloadActive && <span>最近仍收到下载数据…</span>}{progress.detail?.quietForMs !== undefined && <span className="startup-wait">已 {Math.floor(progress.detail.quietForMs / 1000)} 秒未收到新的{progress.detail.startup?.stage === 'resources' ? '资源加载进度；部分下载无法持续报告进度。' : '初始化进展。'}可继续等待，或取消后重新初始化；输入和设置会保留。</span>}</div>}
    {notice && <div className="notice" role="alert">{notice}<button className="icon-button" aria-label="关闭提示" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {outputs.length > 0 && <section className="results-panel panel"><div className="panel-heading"><h2><span className="success-dot"><Check size={14} /></span>转换结果 <span className="counter">{outputs.length}</span></h2><button className="button secondary small" disabled={busy} onClick={() => void downloadZip()}><FolderDown size={16} />全部打包下载</button></div><ul className="result-list">{outputs.map(o => <li key={o.id}><div className="result-icon"><File size={21} /></div><div className="file-info"><strong title={o.name}>{o.name}</strong><span>{bytesLabel(o.blob.size)} · {o.blob.type === 'application/pdf' ? 'PDF' : o.blob.type.split('/')[1].toUpperCase()}</span></div><button className="button ghost small" aria-label="预览" onClick={() => setPreview(o)}><Eye size={16} /><span>预览</span></button><a className="button secondary small" aria-label="下载" href={o.url} download={o.name}><Download size={16} /><span>下载</span></a></li>)}</ul><p className="result-note">结果仅保存在当前页面。下载后可清空任务，关闭或刷新页面会释放文件。</p></section>}
    <p className="memory-note">为保护浏览器内存：单文件最大 100 MB，单批输入与输出各 300 MB，PDF 最多 500 页，单张图片最多 3200 万像素。这些是技术保护，无使用次数限制。</p>
    {zipUrl && <p className="zip-ready"><a className="button secondary small" href={zipUrl} download="StarShift-转换结果.zip"><Download size={16} />下载已准备的 ZIP</a><span>如果浏览器没有开始下载，请点击此链接。</span></p>}
    {preview && <Suspense fallback={<p role="status">正在打开预览…</p>}><Preview key={preview.id} output={preview} onClose={() => setPreview(undefined)} /></Suspense>}
  </>;
}
