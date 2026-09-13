import { useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, Check, File, LoaderCircle, RotateCcw, RotateCw, X } from 'lucide-react';
import type { InputItem, ToolId } from '../types';
import { bytesLabel } from '../core/common';
import { moveByOffset, moveToPosition } from '../core/queue';

const labels = { ready: '等待转换', working: '正在处理', done: '已完成', error: '处理失败', cancelled: '已取消' };

interface Props {
  tool: ToolId;
  items: InputItem[];
  busy: boolean;
  invalidSettings: boolean;
  setItems: Dispatch<SetStateAction<InputItem[]>>;
  updateItem: (id: string, change: Partial<InputItem>) => void;
  retry: (item: InputItem) => Promise<void>;
  removeItem: (item: InputItem) => void;
}

export default function InputQueue({ tool, items, busy, invalidSettings, setItems, updateItem, retry, removeItem }: Props) {
  const [moveId, setMoveId] = useState('');
  const [itemPosition, setItemPosition] = useState('1');
  const imageTool = tool.startsWith('image');
  const merged = tool === 'image-pdf' || tool === 'pdf-organize';

  return <>
        {!!items.length && <ul className="file-list">{items.map((item, index) => <li key={item.id} className={`file-row status-${item.status}`}>
          <div className="file-thumb">{item.thumbnail ? <img src={item.thumbnail} alt="" style={{ transform: `rotate(${item.rotation}deg)` }} /> : <File size={23} strokeWidth={1.5} />}</div>
          <div className="file-info"><strong title={item.file.name}>{item.file.name}</strong><span>{bytesLabel(item.file.size)}<i>·</i>{(item.status === 'working' || item.preparation === 'checking') && <LoaderCircle size={12} className="spin" />}{item.status === 'done' && <Check size={12} />}{item.preparation === 'checking' ? '正在检查文件' : labels[item.status]}{item.rotation > 0 && ` · ${item.rotation}°`}</span>{item.thumbnailStatus === 'loading' && <small>缩略图生成中…</small>}{item.message && <small role={item.status === 'error' ? 'alert' : undefined}>{item.message}</small>}</div>
          <div className="file-actions">{imageTool && <><button className="icon-button" title="向前移动" aria-label={`向前移动 ${item.file.name}`} disabled={busy || index === 0} onClick={() => setItems(current => moveByOffset(current, item.id, -1))}><ArrowUp size={15} /></button><button className="icon-button" title="向后移动" aria-label={`向后移动 ${item.file.name}`} disabled={busy || index === items.length - 1} onClick={() => setItems(current => moveByOffset(current, item.id, 1))}><ArrowDown size={15} /></button><button className="icon-button" title="顺时针旋转" aria-label={`旋转 ${item.file.name}`} disabled={busy} onClick={() => updateItem(item.id, { rotation: (item.rotation + 90) % 360 })}><RotateCw size={15} /></button></>}
            {tool === 'image-pdf' && <button className="text-button" aria-label={`移到指定位置 ${item.file.name}`} disabled={busy} onClick={() => { setMoveId(item.id); setItemPosition(String(index + 1)); }}>移到…</button>}
            {(item.status === 'error' || item.status === 'cancelled') && <button className="icon-button" title={merged ? '整体重试；读取失败时先重试读取' : '重试此文件'} aria-label={`重试 ${item.file.name}`} disabled={busy || invalidSettings} onClick={() => void retry(item)}><RotateCcw size={15} /></button>}
            <button className="icon-button" aria-label={`移除 ${item.file.name}`} title="移除文件" disabled={busy} onClick={() => removeItem(item)}><X size={16} /></button></div>
        </li>)}</ul>}
        {moveId && <form className="queue-position" onSubmit={e => { e.preventDefault(); const n = Number(itemPosition); if (Number.isInteger(n) && n >= 1 && n <= items.length) { setItems(current => moveToPosition(current, new Set([moveId]), n)); setMoveId(''); } }}><label>移到第 N 位<input aria-label="文件目标位置" type="number" min="1" max={items.length} required value={itemPosition} onChange={e => setItemPosition(e.target.value)} /></label><button className="button secondary" disabled={busy}>移动文件</button><button className="text-button" type="button" onClick={() => setMoveId('')}>关闭</button></form>}
  </>;
}
