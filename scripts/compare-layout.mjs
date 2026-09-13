import { measurementRoot } from './measurement-paths.mjs';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [baseline, revised, directory = `${measurementRoot}/layout`] = process.argv.slice(2);
if (!baseline || !revised) throw Error('Usage: compare-layout.mjs baseline-pdf-stem revised-pdf-stem [evidence-directory]');
await mkdir(directory, { recursive: true });
const samples = [];
for (const page of [1, 2]) {
  const before = await readFile(`${baseline}-page-${page}.png`);
  const after = await readFile(`${revised}-page-${page}.png`);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  samples.push({ page, baselineSha256: hash(before), revisedSha256: hash(after), identical: before.equals(after) });
  await copyFile(`${revised}-page-${page}.png`, `${directory}/docx-page-${page}.png`);
}
await writeFile(`${directory}/layout-comparison.json`, JSON.stringify({ time: new Date().toISOString(), baseline, revised,
  scope: 'Same repository synthetic two-page fixture, same independent PyMuPDF renderer. No claim for arbitrary documents.', samples }, null, 2));
console.log(JSON.stringify(samples));
if (samples.some(sample => !sample.identical)) process.exitCode = 1;
