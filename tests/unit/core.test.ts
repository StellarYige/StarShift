import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, PDFName, PDFArray, degrees } from 'pdf-lib';
import { inspectDocxZip } from '../../src/core/docx';
import { parsePages, uniqueName } from '../../src/core/common';
import { fitDimensions, inspectImageHeader } from '../../src/core/images';
import { assemblePdf } from '../../src/core/pdf-edit';

describe('page selection and safe output names', () => {
  it('parses ranges, Chinese commas, deduplication and preserves selection order', () => {
    expect(parsePages('3,1-2，3', 5)).toEqual([3, 1, 2]);
    expect(parsePages('', 3)).toEqual([1, 2, 3]);
    for (const s of ['0', '3-1', '1-6', '1,', 'NaN', '1.5']) expect(() => parsePages(s, 5)).toThrow();
  });
  it('prevents path traversal and case-insensitive ZIP name collisions', () => {
    const used = new Set<string>();
    expect(uniqueName('Photo.png', used)).toBe('Photo.png');
    expect(uniqueName('photo.png', used)).toBe('photo (2).png');
    expect(uniqueName('../escape.png', used)).not.toContain('/');
  });
});
describe('image geometry', () => {
  it('reads real PNG, JPEG and WebP dimensions before decoding and rejects huge PNG headers', () => {
    for (const name of ['transparent.png', 'orientation-6.jpg', 'sample.webp']) expect(inspectImageHeader(readFileSync(`tests/fixtures/${name}`))).toEqual({ width: 120, height: 80 });
    const png = new Uint8Array(readFileSync('tests/fixtures/transparent.png'));
    new DataView(png.buffer).setUint32(16, 100000);
    expect(() => inspectImageHeader(png)).toThrow(/像素/);
  });
  it('maintains proportions, does not upscale, and rejects memory hazards', () => {
    expect(fitDimensions(400, 200, 100, 100)).toEqual({ width: 100, height: 50 });
    expect(fitDimensions(400, 200, 0, 100)).toEqual({ width: 200, height: 100 });
    expect(fitDimensions(40, 20, 200, 200)).toEqual({ width: 40, height: 20 });
    expect(() => fitDimensions(10000, 10000, 0, 0)).toThrow();
    expect(() => fitDimensions(100, 100, NaN, 0)).toThrow();
  });
});
describe('DOCX package validation', () => {
  it('accepts the Chinese fixture and rejects broken / encrypted formats', () => {
    expect(() => inspectDocxZip(readFileSync('tests/fixtures/中文表格分页.docx'))).not.toThrow();
    expect(() => inspectDocxZip(readFileSync('tests/fixtures/broken.docx'))).toThrow();
    expect(() => inspectDocxZip(Uint8Array.of(0xd0, 0xcf))).toThrow(/加密/);
  });
  it('rejects decompression bombs before allocation', () => {
    const b = new Uint8Array(readFileSync('tests/fixtures/中文表格分页.docx'));
    const v = new DataView(b.buffer); let pos = -1;
    for (let i = 0; i < b.length - 4; i++) if (v.getUint32(i, true) === 0x02014b50) { pos = i; break; }
    v.setUint32(pos + 24, 500_000_000, true);
    expect(() => inspectDocxZip(b)).toThrow(/100 MB/);
  });
});
describe('vector PDF organization', () => {
  it('merges, reorders, rotates and extracts source content without image conversion', async () => {
    const src = await PDFDocument.create(); const font = await src.embedFont(StandardFonts.Helvetica);
    const first = src.addPage([200, 300]); first.drawText('FIRST', { font });
    first.node.set(PDFName.of('Annots'), src.context.obj([]));
    const second = src.addPage([400, 500]); second.drawText('SECOND', { font }); second.setRotation(degrees(90));
    const blob = await assemblePdf([{ id: 'a', bytes: await src.save() }], [{ sourceId: 'a', page: 2, rotation: 90 }, { sourceId: 'a', page: 1, rotation: 0 }]);
    const result = await PDFDocument.load(await blob.arrayBuffer());
    expect(result.getPageCount()).toBe(2); expect(result.getPage(0).getRotation().angle).toBe(180);
    expect(result.getPage(0).getWidth()).toBe(400); expect(result.getPage(1).getWidth()).toBe(200);
    expect(result.getPage(1).node.has(PDFName.of('Annots'))).toBe(false);
    expect(result.getPage(0).node.Resources()?.has(PDFName.of('Font'))).toBe(true);
    expect(result.getPage(0).node.Contents()).toBeInstanceOf(PDFArray);
  });
});
