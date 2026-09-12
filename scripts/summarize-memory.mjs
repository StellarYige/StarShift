import { readFile, writeFile } from 'node:fs/promises';
const root = 'docs/evidence/v0.1.1';
const summaries = {};
for (const name of ['chromium', 'firefox', 'webkit']) {
  const report = JSON.parse(await readFile(`${root}/memory-${name}.json`, 'utf8'));
  const phase = name === 'chromium' ? 'cleared-after-page-gc' : 'cleared-before-gc';
  const cleared = report.samples.filter(s => s.phase === phase);
  const metric = key => {
    const baseline = report.samples[0]?.osMemory?.[key] ?? null;
    const values = report.samples.map(s => s.osMemory?.[key]).filter(Number.isFinite);
    const after = cleared.map(s => s.osMemory?.[key] ?? null);
    return { baseline, sampledPeak: values.length ? Math.max(...values) : null, clearedByRound: after,
      last: after.at(-1) ?? null, lastMinusFirstCleared: Number.isFinite(after.at(-1)) && Number.isFinite(after[0]) ? after.at(-1) - after[0] : null };
  };
  summaries[name] = { version: report.version, docx: report.docx, rounds: cleared.length,
    failure: report.failure ?? null, conversionFailures: report.conversionFailures ?? [], privateBytes: metric('privateBytes'), workingSetBytes: metric('workingSetBytes'),
    pageJsHeap: { baseline: report.samples[0]?.jsHeap ?? null, clearedByRound: cleared.map(s => s.jsHeap) },
    clearedWeakReferences: cleared.map(s => s.weakReferences),
    limitations: report.limitations };
}
await writeFile(`${root}/memory-summary.json`, JSON.stringify(summaries, null, 2));
console.log(JSON.stringify(summaries, null, 2));
