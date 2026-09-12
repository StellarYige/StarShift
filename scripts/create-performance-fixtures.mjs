import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import sharp from 'sharp';

const directory = '.cache/five-tools-fixtures';
await mkdir(directory, { recursive: true });
const records = [];
async function save(name, data, details) {
  await writeFile(`${directory}/${name}`, data);
  records.push({ name, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), ...details });
}
// Generated gradients and vector/text pages; no personal documents or images.
const smallImage = await sharp({ create: { width: 240, height: 160, channels: 3, background: '#638947' } }).png().toBuffer();
for (const count of [100, 500]) {
  const pdf = await PDFDocument.create();
  pdf.setCreationDate(new Date('2026-01-01T00:00:00Z')); pdf.setModificationDate(new Date('2026-01-01T00:00:00Z'));
  const font = await pdf.embedFont(StandardFonts.Helvetica), image = await pdf.embedPng(smallImage);
  for (let i = 1; i <= count; i++) {
    const page = pdf.addPage([595.28, 841.89]);
    page.drawText(`SYNTHETIC PAGE ${i}`, { font, x: 40, y: 790, size: 22 });
    for (let line = 0; line < 16; line++) page.drawText(`Local processing measurement sample - line ${line + 1}`, { font, x: 40, y: 750 - line * 22, size: 12 });
    page.drawRectangle({ x: 40, y: 100, width: 250, height: 180, color: rgb(0.2, 0.5, 0.7) });
    page.drawImage(image, { x: 310, y: 110, width: 240, height: 160 });
    if (i % 5 === 0) page.setRotation(degrees(90));
  }
  await save(`mixed-${count}.pdf`, await pdf.save(), { pages: count });
}
for (let index = 0; index < 10; index++) {
  const width = 3000, height = 2000, raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 3;
    raw[p] = (x + index * 23) % 256; raw[p + 1] = (y + index * 31) % 256; raw[p + 2] = (Math.floor(x / 16) + Math.floor(y / 16) + index * 17) % 256;
  }
  await save(`image-${String(index + 1).padStart(2, '0')}.jpg`, await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).withMetadata({ orientation: index === 0 ? 6 : 1 }).toBuffer(), { width, height });
}
await writeFile(`${directory}/manifest.json`, JSON.stringify({ synthetic: true, records }, null, 2));
console.log(JSON.stringify({ directory, files: records.length }));
