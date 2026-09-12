import { mkdir, writeFile } from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, PageBreak, WidthType } from 'docx';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import sharp from 'sharp';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

await mkdir('tests/fixtures', { recursive: true });
const fixture = (name, bytes) => writeFile(`tests/fixtures/${name}`, bytes);
// All fixtures are synthetic and authored for StarShift. No private documents.
const raw = Buffer.alloc(120 * 80 * 4);
for (let y = 0; y < 80; y++) for (let x = 0; x < 120; x++) {
  const i = (y * 120 + x) * 4;
  raw[i] = x < 60 ? 240 : 30; raw[i + 1] = y < 40 ? 30 : 210; raw[i + 2] = 50;
  raw[i + 3] = x < 20 && y < 20 ? 0 : 255;
}
const picture = await sharp(raw, { raw: { width: 120, height: 80, channels: 4 } }).png().toBuffer();
await fixture('transparent.png', picture);
await fixture('sample.webp', await sharp(picture).webp().toBuffer());
await fixture('orientation-6.jpg', await sharp(picture).flatten({ background: '#ffffff' }).jpeg({ quality: 100 }).withMetadata({ orientation: 6 }).toBuffer());
await fixture('broken.pdf', Buffer.from('%PDF-1.7\nthis is broken'));
await fixture('broken.docx', Buffer.from('not a zip'));
const run = text => new TextRun({ text, font: 'Noto Sans CJK SC', size: 24 });
const doc = new Document({
  creator: 'StarShift synthetic tests',
  styles: { default: { document: { run: { font: 'Noto Sans CJK SC', size: 24 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
    new Paragraph({ children: [new TextRun({ text: '星易中文排版测试', font: 'Noto Sans CJK SC', size: 40, bold: true })] }),
    new Paragraph({ children: [run('第一页：中文应清晰可读，标点正常。StarShift PAGE_ONE')] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: ['项目', '数量', '备注'].map(t => new TableCell({ children: [new Paragraph({ children: [run(t)] })] })) }),
      new TableRow({ children: ['中文表格 CELL_ALPHA', '42', '保留边框与对齐'].map(t => new TableCell({ children: [new Paragraph({ children: [run(t)] })] })) }),
    ] }),
    new Paragraph({ children: [new ImageRun({ data: picture, type: 'png', transformation: { width: 240, height: 160 } })] }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [run('第二页：显式分页 PAGE_TWO')] }),
    new Paragraph({ children: [run('这段文字应只出现在第二页。转换保留文字层。')] }),
  ] }],
});
const docx = await Packer.toBuffer(doc);
await fixture('中文表格分页.docx', docx);
const external = unzipSync(docx);
external['word/_rels/document.xml.rels'] = strToU8(strFromU8(external['word/_rels/document.xml.rels']).replace('</Relationships>', '<Relationship Id="rIdExternal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.invalid/private-file-name.png" TargetMode="External"/></Relationships>'));
await fixture('external-reference.docx', zipSync(external));
const substituteFont = unzipSync(docx);
for (const [name, data] of Object.entries(substituteFont)) if (name.endsWith('.xml')) substituteFont[name] = strToU8(strFromU8(data).replaceAll('Noto Sans CJK SC', 'SimSun'));
await fixture('font-substitution.docx', zipSync(substituteFont));
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
for (let i = 0; i < 3; i++) {
  const page = pdf.addPage([300, 400]);
  page.drawText(`VECTOR PAGE ${i + 1}`, { x: 35, y: 350, size: 18, font });
  page.drawRectangle({ x: 40, y: 50, width: 120, height: 180, color: [rgb(0.9, 0.1, 0.1), rgb(0.1, 0.8, 0.2), rgb(0.1, 0.2, 0.9)][i] });
  if (i === 1) page.setRotation(degrees(90));
}
await fixture('vector-three-pages.pdf', await pdf.save());
console.log('Synthetic fixtures created.');
