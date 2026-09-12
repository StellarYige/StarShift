import { readFile, writeFile } from 'node:fs/promises';
const directory = 'docs/evidence/five-tools/performance';
const pdfOnly = process.argv.includes('--pdf-only');
const data = JSON.parse(await readFile(`${directory}/${pdfOnly ? 'paired-pdf-final' : 'paired'}.json`, 'utf8'));
const median = values => { const sorted = [...values].sort((a, b) => a - b); return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2; };
const summary = values => ({ samples: values, median: median(values), min: Math.min(...values), max: Math.max(...values) });
const metrics = {};
for (const key of Object.keys(data.samples[0].metrics)) {
  const pairs = Array.from({ length: 5 }, (_, i) => {
    const baseline = data.samples.find(s => s.pair === i + 1 && s.version === 'baseline')?.metrics[key];
    const revised = data.samples.find(s => s.pair === i + 1 && s.version === 'revised')?.metrics[key];
    return { pair: i + 1, baseline, revised, improvement: baseline ? 1 - revised / baseline : null };
  });
  const valid = pairs.filter(p => Number.isFinite(p.baseline) && Number.isFinite(p.revised));
  const baseline = summary(valid.map(p => p.baseline)), revised = summary(valid.map(p => p.revised));
  const improvement = 1 - revised.median / baseline.median, improvedPairs = valid.filter(p => p.revised < p.baseline).length;
  metrics[key] = { pairs, baseline, revised, improvedPairs, medianImprovement: improvement, meetsPerformanceThreshold: valid.length === 5 && improvedPairs >= 4 && improvement >= 0.05 };
}
const feedback = {};
for (const version of ['baseline', 'revised']) {
  const values = data.samples.filter(s => s.version === version).flatMap(s => s.feedback);
  feedback[version] = {};
  for (const action of new Set(values.map(v => v.action))) {
    const ms = values.filter(v => v.action === action).map(v => v.ms).sort((a, b) => a - b);
    feedback[version][action] = { ...summary(ms), p95: ms[Math.ceil(ms.length * 0.95) - 1], meets200ms: ms[Math.ceil(ms.length * 0.95) - 1] <= 200 };
  }
}
const first = data.samples.find(s => s.status === 'passed');
const quality = data.samples.map(s => ({ pair: s.pair, version: s.version, pdf: !!s.pdfQuality && JSON.stringify(s.pdfQuality) === JSON.stringify(first?.pdfQuality), images: s.imageQuality ? JSON.stringify(s.imageQuality) === JSON.stringify(first?.imageQuality) : null }));
let memory = null;
try {
  const runs = JSON.parse(await readFile(`${directory}/image-memory-runs.json`, 'utf8'));
  const samples = [];
  for (const run of runs.runs) {
    const record = JSON.parse(await readFile(run.output, 'utf8'));
    samples.push({ ...run, peakPrivateBytes: Math.max(...record.samples.map(s => s.osMemory?.privateBytes || 0)), afterClearPrivateBytes: record.samples.at(-1)?.osMemory?.privateBytes, references: record.samples.at(-1)?.weakReferences, failure: record.failure });
  }
  const baseline = summary(samples.filter(s => s.version === 'baseline').map(s => s.peakPrivateBytes));
  const revised = summary(samples.filter(s => s.version === 'revised').map(s => s.peakPrivateBytes));
  const improvedPairs = samples.filter(s => s.version === 'revised' && s.peakPrivateBytes < samples.find(b => b.version === 'baseline' && b.pair === s.pair).peakPrivateBytes).length;
  memory = { samples, baseline, revised, improvedPairs, medianImprovement: 1 - revised.median / baseline.median, meetsPerformanceThreshold: samples.length === 10 && improvedPairs >= 4 && 1 - revised.median / baseline.median >= 0.05 && samples.every(s => !s.failure && s.code === 0) };
} catch (error) { memory = { unavailable: error.message }; }
let previewPaint = null;
try {
  const paint = JSON.parse(await readFile(`${directory}/preview-paint.json`, 'utf8'));
  previewPaint = { failures: paint.samples.filter(s => s.status !== 'passed'), metrics: {} };
  for (const kind of ['open', 'turn']) {
    const values = paint.samples.filter(s => s.status === 'passed').map(s => ({ pair: s.pair, version: s.version, ms: s.events.filter(e => e.kind === kind).reduce((sum, e) => sum + e.ms, 0) }));
    const baseline = summary(values.filter(s => s.version === 'baseline').map(s => s.ms)), revised = summary(values.filter(s => s.version === 'revised').map(s => s.ms));
    const improvedPairs = values.filter(s => s.version === 'revised' && s.ms < values.find(b => b.version === 'baseline' && b.pair === s.pair)?.ms).length;
    previewPaint.metrics[kind] = { values, baseline, revised, improvedPairs, medianImprovement: 1 - revised.median / baseline.median, meetsPerformanceThreshold: values.length === 10 && improvedPairs >= 4 && 1 - revised.median / baseline.median >= 0.05 };
  }
} catch (error) { previewPaint = { unavailable: error.message }; }
await writeFile(`${directory}/${pdfOnly ? 'summary-pdf-final' : 'summary'}.json`, JSON.stringify({ metrics, feedback, quality, memory, previewPaint, failures: data.samples.filter(s => s.status !== 'passed').map(s => ({ pair: s.pair, version: s.version, error: s.error })) }, null, 2));
const compactMetric = value => ({ improvedPairs: value.improvedPairs, improvement: value.medianImprovement, passed: value.meetsPerformanceThreshold });
console.log(JSON.stringify({ metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, compactMetric(value)])), feedback: Object.fromEntries(Object.entries(feedback).map(([version, actions]) => [version, Object.fromEntries(Object.entries(actions).map(([action, result]) => [action, { p95: result.p95, meets200ms: result.meets200ms }]))])), qualityEqual: quality.every(s => s.pdf && s.images !== false), memory: memory.unavailable ? memory : compactMetric(memory), previewPaint: previewPaint.metrics ? Object.fromEntries(Object.entries(previewPaint.metrics).map(([kind, value]) => [kind, compactMetric(value)])) : previewPaint }, null, 2));
