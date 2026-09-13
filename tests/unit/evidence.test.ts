import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

it('collects both historical attachment formats without turning a failure into a pass', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'starshift-evidence-'));
  try {
    const attachment = path.join(directory, 'startup-data');
    writeFileSync(attachment, JSON.stringify({ stage: 'worker', ready: false }));
    const report = {
      stats: { expected: 0, unexpected: 1, skipped: 0 }, errors: [],
      suites: [{ suites: [{ specs: [{ title: 'startup timeout', file: 'faults.spec.ts', tests: [{
        projectName: 'chromium', expectedStatus: 'passed', status: 'unexpected', annotations: [],
        results: [{ status: 'failed', duration: 240000, errors: [{ message: 'startup timeout' }], attachments: [
          { name: 'startup', contentType: 'application/json', path: attachment },
          { name: 'cleanup.json', body: Buffer.from(JSON.stringify({ workers: 0 })).toString('base64') },
          { name: 'screenshot', contentType: 'image/png', path: 'not-a-json-attachment.png' },
        ] }],
      }] }] }] }],
    };
    const input = path.join(directory, 'report.json'), output = path.join(directory, 'collected', 'result.json');
    const original = JSON.stringify(report);
    writeFileSync(input, original);
    execFileSync(process.execPath, ['scripts/collect-test-evidence.mjs', input, output], { windowsHide: true });
    const result = JSON.parse(readFileSync(output, 'utf8'));
    expect(result.stats).toEqual(report.stats);
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0]).toMatchObject({ expectedStatus: 'passed', status: 'unexpected', results: [{
      status: 'failed', errors: [{ message: 'startup timeout' }],
      evidence: { startup: { stage: 'worker', ready: false }, 'cleanup.json': { workers: 0 } },
    }] });
    expect(readFileSync(input, 'utf8')).toBe(original);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
