import { docxDirectory } from './measurement-paths.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const runs = [];
await mkdir(docxDirectory, { recursive: true });
for (let pair = 1; pair <= 5; pair++) {
  // Alternate order to reduce a simple time/order bias. Each run has a new
  // cold profile followed by a browser restart using that disk profile.
  const order = pair % 2 ? ['baseline', 'revised'] : ['revised', 'baseline'];
  for (const version of order) {
    const label = `${version}-local-pair-${pair}`;
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/measure-docx.mjs', '--url', `http://127.0.0.1:${version === 'baseline' ? 4188 : 4187}/StarShift/`, '--label', label, '--rounds', '1', '--batches', '0'], { stdio: 'inherit', windowsHide: true });
      child.on('error', reject); child.on('exit', resolve);
    });
    runs.push({ pair, version, label, code });
    await writeFile(`${docxDirectory}/paired-runs.json`, JSON.stringify({ time: new Date().toISOString(), method: 'Additional contemporaneous alternating-order pairs after the planned five-round runs; unchanged timing and browser method; no intentional engine performance optimization.', runs }, null, 2));
  }
}
if (runs.some(r => r.code !== 0)) process.exitCode = 1;
