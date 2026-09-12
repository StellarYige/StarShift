import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
import { createHash } from 'node:crypto';

const entries = {};
async function walk(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), name + '/');
    else entries[name] = new Uint8Array(await readFile(path.join(dir, entry.name)));
  }
}
if (!(await stat('dist/index.html').catch(() => null))) throw new Error('Run npm run build first.');
await walk('dist');
for (const name of ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/TEST_REPORT.md', 'docs/ENGINE_EVALUATION.md']) entries[name] = new Uint8Array(await readFile(name));
entries['SERVING.txt'] = new TextEncoder().encode('Serve this directory over HTTPS or localhost. Do not double-click index.html. Default base is /StarShift/. Example: place this directory as StarShift under a web root and run python -m http.server 8080 in that root; visit http://localhost:8080/StarShift/. Source and build commands: https://github.com/StellarYige/StarShift\n');
await mkdir('release', { recursive: true });
const zip = zipSync(entries, { level: 6 });
const file = 'StarShift-0.1.0-static.zip';
await writeFile(`release/${file}`, zip);
const sha = createHash('sha256').update(zip).digest('hex');
await writeFile(`release/${file}.sha256`, `${sha}  ${file}\n`);
console.log(`${file}: ${(zip.length / 1048576).toFixed(1)} MiB; SHA-256 ${sha}`);
