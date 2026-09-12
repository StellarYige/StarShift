import { unzip, zip, strFromU8, strToU8 } from 'fflate';
import { checkAbort, MAX_FILE_BYTES } from './common';

/** Inspect ZIP directory BEFORE allocating uncompressed data. Reject ZIP64 and encrypted packages. */
export function inspectDocxZip(data: Uint8Array) {
  if (data[0] === 0xd0 && data[1] === 0xcf) throw new Error('文件已加密或不是 DOCX，请先解除密码保护并另存为 DOCX。');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === data.length) { end = i; break; }
  }
  if (end < 0) throw new Error('DOCX 压缩结构损坏。');
  const count = view.getUint16(end + 10, true);
  if (count > 4000 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('DOCX 结构过大或使用了不支持的分卷压缩。');
  let offset = view.getUint32(end + 16, true);
  let total = 0;
  const names = new Set<string>();
  for (let n = 0; n < count; n++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('DOCX 压缩目录损坏。');
    if (view.getUint16(offset + 8, true) & 1) throw new Error('DOCX 已加密，请先解除密码保护。');
    total += view.getUint32(offset + 24, true);
    if (total > MAX_FILE_BYTES) throw new Error('DOCX 解压后超过 100 MB，请压缩文档中的图片后重试。');
    const size = view.getUint16(offset + 28, true);
    const name = strFromU8(data.subarray(offset + 46, offset + 46 + size));
    if (names.has(name) || name.startsWith('/') || name.split(/[\\/]/).includes('..')) throw new Error('DOCX 包含不安全的压缩路径。');
    names.add(name);
    if (/vbaproject|activex|embeddings\/|macros\//i.test(name)) throw new Error('首版不处理含宏、嵌入对象或 ActiveX 的文档，请移除后重试。');
    offset += 46 + size + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  if (!names.has('word/document.xml') || !names.has('[Content_Types].xml')) throw new Error('这不是有效的 DOCX 文件。');
}

export async function prepareDocx(file: Blob, signal: AbortSignal): Promise<Uint8Array> {
  checkAbort(signal);
  const data = new Uint8Array(await file.arrayBuffer());
  inspectDocxZip(data);
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    const stop = unzip(data, (err, value) => { signal.removeEventListener('abort', abort); err ? reject(err) : resolve(value); });
    function abort() { stop(); reject(new DOMException('任务已取消', 'AbortError')); }
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
  checkAbort(signal);
  // Reject active content; remove all external relationships, including external images and templates.
  for (const [name, bytes] of Object.entries(entries)) {
    if (!/\.(xml|rels)$/i.test(name)) continue;
    const text = strFromU8(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('文档含不支持的实体声明，请在原软件中重新另存为 DOCX。');
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('DOCX 内部 XML 损坏。');
    const fields = Array.from(xml.getElementsByTagNameNS('*', 'instrText')).map(el => el.textContent).join(' ');
    const simpleFields = Array.from(xml.getElementsByTagNameNS('*', 'fldSimple')).map(el => Array.from(el.attributes).map(a => a.value).join(' ')).join(' ');
    if (/\b(DDE|DDEAUTO|INCLUDEPICTURE|INCLUDETEXT|LINK)\b/i.test(fields + simpleFields) || xml.getElementsByTagNameNS('*', 'altChunk').length) throw new Error('文档含动态域或外部嵌入内容，请在原软件中转为静态内容后重试。');
    if (name.endsWith('.rels')) {
      for (const el of Array.from(xml.getElementsByTagNameNS('*', 'Relationship'))) {
        const target = el.getAttribute('Target') || '';
        if (el.getAttribute('TargetMode')?.toLowerCase() === 'external' || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) el.remove();
      }
      entries[name] = strToU8(new XMLSerializer().serializeToString(xml));
    }
  }
  return new Promise((resolve, reject) => {
    const stop = zip(entries, { level: 1 }, (err, result) => { signal.removeEventListener('abort', abort); err ? reject(err) : resolve(result); });
    function abort() { stop(); reject(new DOMException('任务已取消', 'AbortError')); }
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export { OfficeSession } from './office-session';
