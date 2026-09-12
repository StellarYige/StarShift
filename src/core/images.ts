import type { Settings } from '../types';
import { MAX_PIXELS } from './common';

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
export async function renderImage(file: Blob, settings: Pick<Settings, 'format' | 'quality' | 'width' | 'height' | 'transparent' | 'background'>, rotation = 0) {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('浏览器不支持本地图片引擎，请使用最新版 Chrome、Edge、Firefox 或 Safari。');
  const header = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
  const jpg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71;
  const webp = new TextDecoder().decode(header.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(header.subarray(8, 12)) === 'WEBP';
  if (!jpg && !png && !webp) throw new Error('图片内容不是 JPG、PNG 或 WebP，或文件已经损坏。');
  inspectImageHeader(header);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('图片无法解码，请检查是否损坏。'); }
  try {
    checkImagePixels(bitmap.width, bitmap.height);
    const angle = ((rotation % 360) + 360) % 360;
    const swap = angle === 90 || angle === 270;
    const { width, height } = fitDimensions(swap ? bitmap.height : bitmap.width, swap ? bitmap.width : bitmap.height, settings.width, settings.height);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
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
    ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
    const mime = imageMime(settings.format);
    const blob = await canvas.convertToBlob({ type: mime, quality: settings.quality });
    canvas.width = canvas.height = 1;
    if (blob.type !== mime) throw new Error(`此浏览器不支持导出 ${settings.format.toUpperCase()}，请选择另一种格式。`);
    return { blob, width, height };
  } finally { bitmap.close(); }
}
