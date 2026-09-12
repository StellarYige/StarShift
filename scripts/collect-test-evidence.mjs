// Preserve assertions and JSON attachments without copying synthetic output
// files, browser traces, or absolute Playwright installation paths.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw Error('Usage: collect-test-evidence.mjs report.json destination.json');
const report = JSON.parse(await readFile(source, 'utf8'));
const tests = [];
async function visit(suite) {
  for (const spec of suite.specs || []) for (const test of spec.tests) {
    const results = [];
    for (const result of test.results) {
      const evidence = {};
      for (const attachment of result.attachments || []) if (attachment.name.endsWith('.json')) {
        const content = attachment.body ? Buffer.from(attachment.body, 'base64').toString('utf8') : await readFile(attachment.path, 'utf8');
        evidence[attachment.name] = JSON.parse(content);
      }
      results.push({ status: result.status, durationMs: result.duration, errors: result.errors, evidence });
    }
    tests.push({ title: spec.title, file: spec.file, project: test.projectName, expectedStatus: test.expectedStatus, status: test.status, annotations: test.annotations, results });
  }
  for (const child of suite.suites || []) await visit(child);
}
for (const suite of report.suites) await visit(suite);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify({ captured: new Date().toISOString(), source, stats: report.stats, errors: report.errors, tests }, null, 2));
console.log(JSON.stringify({ destination, stats: report.stats }));
