// Preserve copyright, licensing and source URL records from every bundled SFNT font.
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const metadata = JSON.parse(gunzipSync(await readFile('vendor/zetaoffice/soffice.data.js.metadata.gz')));
const image = gunzipSync(await readFile('vendor/zetaoffice/soffice.data.gz'));
const fonts = metadata.files.filter(f => /\.(ttf|otf)$/i.test(f.filename));
const notices = [];
for (const font of fonts) {
  const bytes = image.subarray(font.start, font.end);
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let nameOffset = 0;
  for (let i = 0; i < v.getUint16(4); i++) {
    const pos = 12 + i * 16;
    if (bytes.subarray(pos, pos + 4).toString() === 'name') nameOffset = v.getUint32(pos + 8);
  }
  if (!nameOffset) continue;
  const texts = new Set();
  const strings = nameOffset + v.getUint16(nameOffset + 4);
  for (let i = 0; i < v.getUint16(nameOffset + 2); i++) {
    const pos = nameOffset + 6 + i * 12;
    const id = v.getUint16(pos + 6);
    if (![0, 8, 9, 13, 14].includes(id)) continue;
    const platform = v.getUint16(pos);
    const data = bytes.subarray(strings + v.getUint16(pos + 10), strings + v.getUint16(pos + 10) + v.getUint16(pos + 8));
    const text = new TextDecoder(platform === 0 || platform === 3 ? 'utf-16be' : 'windows-1252').decode(data).trim();
    if (text) texts.add(text);
  }
  notices.push(`${font.filename}\n${'='.repeat(font.filename.length)}\n${[...texts].join('\n\n')}`);
}
await writeFile('vendor/licenses/BUNDLED-FONT-NOTICES.txt', 'Extracted without changes from the SFNT name tables of bundled ZetaOffice fonts. The complete license collection is in LibreOffice-license.xml.\n\n' + notices.join('\n\n---\n\n') + '\n');
console.log(`Preserved notices for ${fonts.length} bundled font files.`);
