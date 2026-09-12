import { mkdir, copyFile, cp, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

for (const dir of ['public/engine', 'public/fonts', 'public/pdfjs', 'public/licenses']) await mkdir(dir, { recursive: true });
const sha256 = data => createHash('sha256').update(data).digest('hex');
const engine = JSON.parse(await readFile('vendor/zetaoffice/manifest.json', 'utf8'));
const manifest = {};
for (const [name, expected] of Object.entries(engine.files)) {
  const data = gunzipSync(await readFile(`vendor/zetaoffice/${name}.gz`));
  if (data.length !== expected.bytes || sha256(data) !== expected.sha256) throw new Error(`Bundled engine integrity check failed: ${name}`);
  const target = `public/engine/${name}`;
  const existing = await readFile(target).catch(() => null);
  if (!existing || sha256(existing) !== expected.sha256) await writeFile(target, data);
  manifest[`engine/${name}`] = expected;
}
for (const file of ['zeta.js', 'zetaHelper.js']) await copyFile(`node_modules/zetajs/source/${file}`, `public/engine/${file}`);
const font = gunzipSync(await readFile('vendor/fonts/NotoSansCJKsc-Regular.otf.gz'));
const fontMeta = JSON.parse(await readFile('vendor/fonts/manifest.json', 'utf8'));
if (sha256(font) !== fontMeta.sha256) throw new Error('Bundled Chinese font integrity check failed');
await writeFile('public/fonts/NotoSansCJKsc-Regular.otf', font);
manifest['fonts/NotoSansCJKsc-Regular.otf'] = { bytes: font.length, sha256: sha256(font) };
await copyFile('node_modules/coi-serviceworker/coi-serviceworker.js', 'public/coi-serviceworker.js');
for (const dir of ['cmaps', 'standard_fonts', 'wasm']) await cp(`node_modules/pdfjs-dist/${dir}`, `public/pdfjs/${dir}`, { recursive: true });
await cp('vendor/licenses', 'public/licenses', { recursive: true });
await copyFile('vendor/fonts/OFL.txt', 'public/licenses/Noto-CJK-OFL.txt');
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const inventory = [];
for (const [location, meta] of Object.entries(lock.packages)) {
  if (!location || meta.dev) continue;
  const name = location.slice(location.lastIndexOf('node_modules/') + 13);
  const files = await readdir(location).catch(() => []);
  for (const file of files.filter(f => /^(licen[cs]e|copying|notice)(\.|$)/i.test(f))) {
    if ((await stat(`${location}/${file}`)).isFile()) await copyFile(`${location}/${file}`, `public/licenses/${name.replaceAll('/', '-')}-${file}`);
  }
  inventory.push({ name, version: meta.version, license: meta.license });
}
await writeFile('public/licenses/dependencies.json', JSON.stringify(inventory, null, 2));
await writeFile('public/asset-manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Local, verified DOCX assets: ${(Object.values(manifest).reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)} MiB. No network download during asset preparation.`);
