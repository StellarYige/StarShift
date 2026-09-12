export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
export const MAX_PIXELS = 32_000_000;
export const MAX_PAGES = 500;

export function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('任务已取消', 'AbortError');
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return '任务已取消，可以重试。';
    if (/password|encrypt/i.test(error.name + error.message)) return '文件已加密，请先在本地解除密码保护后重试。';
    if (/out of memory|memory access|allocation/i.test(error.message)) return '浏览器内存不足，请减少页数、文件数量或清晰度后重试。';
    if (/invalid pdf|pdf header|xref|bad zip|invalid zip|invalid distance/i.test(error.message)) return '文件损坏或格式不符，请用原软件重新导出后重试。';
    return error.message;
  }
  return '处理失败，请检查文件后重试。';
}

export function parsePages(value: string, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_PAGES) throw new Error(`首版为保护浏览器内存，支持每份 PDF 最多 ${MAX_PAGES} 页。`);
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set<number>();
  for (const part of value.replaceAll('，', ',').split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('页码格式有误，请输入如 1-3,5,8。');
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > count) throw new Error(`页码超出范围：本文件共 ${count} 页。`);
    for (let p = start; p <= end; p++) pages.add(p);
  }
  return [...pages];
}

export function stem(name: string) { return name.replace(/\.[^.]+$/, '') || '文件'; }
export function bytesLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function uniqueName(name: string, used: Set<string>): string {
  const safe = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^\.+/, '_');
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : '';
  let result = safe;
  for (let n = 2; used.has(result.toLowerCase()); n++) result = `${base} (${n})${ext}`;
  used.add(result.toLowerCase());
  return result;
}

export function asBlob(data: Uint8Array, type: string) {
  return new Blob([new Uint8Array(data)], { type });
}
