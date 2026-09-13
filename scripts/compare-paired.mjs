import { docxDirectory } from './measurement-paths.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const root = docxDirectory;
const median = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : null;
};
const groups = {};
for (const scenario of ['cold', 'revisit']) {
  const pairs = [];
  for (let pair = 1; pair <= 5; pair++) {
    const samples = {};
    for (const version of ['baseline', 'revised']) {
      const report = JSON.parse(await readFile(`${root}/${version}-local-pair-${pair}.json`, 'utf8'));
      const sample = report.samples.find(s => s.scenario === scenario);
      samples[version] = { status: sample.status, batchMs: sample.elapsedMs, unoReadyMs: sample.stages.startToUnoReadyMs, fontWaitMs: sample.stages.fontWaitMs };
    }
    pairs.push({ pair, ...samples });
  }
  const valid = pairs.filter(p => p.baseline.status === 'passed' && p.revised.status === 'passed');
  const stages = {};
  for (const stage of ['batchMs', 'unoReadyMs', 'fontWaitMs']) {
    const measured = valid.filter(p => Number.isFinite(p.baseline[stage]) && Number.isFinite(p.revised[stage]));
    const baselineMedian = median(measured.map(p => p.baseline[stage]));
    const revisedMedian = median(measured.map(p => p.revised[stage]));
    const improvedPairs = measured.filter(p => p.revised[stage] < p.baseline[stage]).length;
    const medianImprovement = baselineMedian > 0 && revisedMedian !== null ? 1 - revisedMedian / baselineMedian : null;
    stages[stage] = { measuredPairs: measured.length, improvedPairs, baselineMedian, revisedMedian, medianImprovement,
      meetsNumericalThreshold: measured.length === 5 && improvedPairs >= 4 && medianImprovement >= 0.05 };
  }
  groups[scenario] = { pairs, failedPairs: pairs.length - valid.length, stages };
}
const report = { time: new Date().toISOString(), method: 'Five additional adjacent pairs, alternating version order; same Chromium and documents. Descriptive comparison, no claim of controlled background CPU load or causal acceleration. No font/engine parallel preparation change was introduced.', groups };
await writeFile(`${root}/paired-comparison.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
