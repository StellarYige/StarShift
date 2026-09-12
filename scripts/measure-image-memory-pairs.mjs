// Separate resource measurements using the existing browser/process sampler.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'docs/evidence/five-tools/performance';
await mkdir(directory, { recursive: true });
const runs = [];
for (let pair = 1; pair <= 5; pair++) for (const version of pair % 2 ? ['baseline', 'revised'] : ['revised', 'baseline']) {
  const output = `${directory}/image-memory-${version}-${pair}.json`;
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/measure-memory.mjs', '--tool', 'image-pdf', '--rounds', '1', '--url', `http://127.0.0.1:${version === 'baseline' ? 4188 : 4187}/StarShift/`, '--output', output], { stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('exit', resolve);
  });
  runs.push({ pair, version, output, code });
  await writeFile(`${directory}/image-memory-runs.json`, JSON.stringify({ method: 'Five alternating pairs; existing private-bytes/working-set/page-GC/WeakRef sampler. Separate from timing runs.', runs }, null, 2));
}
if (runs.some(r => r.code !== 0)) process.exitCode = 1;
