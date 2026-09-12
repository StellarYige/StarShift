import type { Settings } from '../types';
import { checkAbort, MAX_PIXELS } from './common';

export function imageMime(format: string) { return format === 'jpg' ? 'image/jpeg' : `image/${format}`; }
export function checkImagePixels(width: number, height: number) {
  if (!width || !height || width * height > MAX_PIXELS || width > 16384 || height > 16384) throw new Error('原图超过 3200 万像素或边长超过 16384，请先缩小图片后重试。');
}
export function inspectImageHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0;
  const text = (start: number, end: number) => new TextDecoder().decode(bytes.subarray(start, end));
  if (bytes[0] === 137 && text(1, 4) === 'PNG' && bytes.length >= 24) {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP' && bytes.length >= 30) {
    const chunk = text(12, 16);
    if (chunk === 'VP8X') {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
    } else if (chunk === 'VP8 ') { width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff; }
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 9 <= bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 255) { offset++; continue; }
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      const size = view.getUint16(offset + 2);
      if (size < 2) break;
      offset += 2 + size;
    }
  }
  if (!width || !height) throw new Error('图片头信息损坏、不受支持或元数据过大，请用图片软件重新导出后重试。');
  checkImagePixels(width, height);
  return { width, height };
}
export function fitDimensions(w: number, h: number, maxW: number, maxH: number) {
  for (const n of [w, h, maxW, maxH]) if (!Number.isFinite(n) || n < 0) throw new Error('图片尺寸必须是有效的正数。');
  const ratio = Math.min(maxW > 0 ? maxW / w : Infinity, maxH > 0 ? maxH / h : Infinity, 1);
  const width = Math.max(1, Math.round(w * ratio));
  const height = Math.max(1, Math.round(h * ratio));
  if (width * height > MAX_PIXELS || width > 16384 || height > 16384) throw new Error('图片像素过大，请先缩小到 3200 万像素以内。');
  return { width, height };
}
function abortable<T>(work: Promise<T>, signal?: AbortSignal, releaseLate?: (value: T) => void): Promise<T> {
  if (!signal) return work;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('任务已取消', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) { releaseLate?.(value); abort(); } else resolve(value);
    }, error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) { signal.removeEventListener('abort', abort); abort(); }
  });
}
async function decodeImage(file: Blob, signal?: AbortSignal) {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await abortable(createImageBitmap(file, { imageOrientation: 'from-image' }), signal, value => value.close());
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch { if (signal) checkAbort(signal); throw new Error('图片无法解码，请检查是否损坏。'); }
  }
  const image = new Image(), url = URL.createObjectURL(file);
  const release = () => { image.onload = image.onerror = null; image.removeAttribute('src'); URL.revokeObjectURL(url); };
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { image.onload = image.onerror = null; signal?.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new DOMException('任务已取消', 'AbortError')); };
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error('图片无法解码，请检查是否损坏。')); };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      image.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release };
  } catch (error) { release(); throw error; }
}
export async function renderImage(file: Blob, settings: Pick<Settings, 'format' | 'quality' | 'width' | 'height' | 'transparent' | 'background'>, rotation = 0, signal?: AbortSignal) {
  if (signal) checkAbort(signal);
  const header = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
  const jpg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71;
  const webp = new TextDecoder().decode(header.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(header.subarray(8, 12)) === 'WEBP';
  if (!jpg && !png && !webp) throw new Error('图片内容不是 JPG、PNG 或 WebP，或文件已经损坏。');
  inspectImageHeader(header);
  if (signal) checkAbort(signal);
  const bitmap = await decodeImage(file, signal);
  let canvas: OffscreenCanvas | HTMLCanvasElement | undefined;
  try {
    if (signal) checkAbort(signal);
    checkImagePixels(bitmap.width, bitmap.height);
    const angle = ((rotation % 360) + 360) % 360;
    const swap = angle === 90 || angle === 270;
    const { width, height } = fitDimensions(swap ? bitmap.height : bitmap.width, swap ? bitmap.width : bitmap.height, settings.width, settings.height);
    canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('浏览器无法创建画布，请减少任务数量。');
    if (!settings.transparent || settings.format === 'jpg') {
      ctx.fillStyle = settings.background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.imageSmoothingQuality = 'high';
    const drawW = swap ? height : width;
    const drawH = swap ? width : height;
    ctx.drawImage(bitmap.source, -drawW / 2, -drawH / 2, drawW, drawH);
    const mime = imageMime(settings.format);
    const encoded = 'convertToBlob' in canvas ? canvas.convertToBlob({ type: mime, quality: settings.quality })
      : new Promise<Blob>((resolve, reject) => (canvas as HTMLCanvasElement).toBlob(value => value ? resolve(value) : reject(new Error('图片编码失败。')), mime, settings.quality));
    const blob = await abortable(encoded, signal);
    if (signal) checkAbort(signal);
    if (blob.type !== mime) throw new Error(`此浏览器不支持导出 ${settings.format.toUpperCase()}，请选择另一种格式。`);
    return { blob, width, height };
  } finally { bitmap.release(); if (canvas) canvas.width = canvas.height = 1; }
}
