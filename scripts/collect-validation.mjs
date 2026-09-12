// Preserve compact, auditable test results; large synthetic files stay in CI artifacts.
import { readFile, writeFile } from 'node:fs/promises';
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: collect-validation.mjs report.json evidence.json');
const report = JSON.parse(await readFile(input, 'utf8'));
const tests = [];
async function visit(suites) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) for (const test of spec.tests) {
      const results = [];
      for (const result of test.results) {
        const evidence = {};
        for (const attachment of result.attachments || []) {
          if (attachment.contentType === 'application/json' && attachment.path) {
            evidence[attachment.name] = JSON.parse(await readFile(attachment.path, 'utf8'));
          }
        }
        results.push({ status: result.status, durationMs: result.duration, errors: result.errors, evidence });
      }
      tests.push({ title: spec.title, file: spec.file, project: test.projectName, expectedStatus: test.expectedStatus, status: test.status, annotations: test.annotations, results });
    }
    await visit(suite.suites);
  }
}
await visit(report.suites);
const result = { captured: new Date().toISOString(), source: input, stats: report.stats, errors: report.errors, tests };
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, stats: result.stats, tests: tests.length }));
