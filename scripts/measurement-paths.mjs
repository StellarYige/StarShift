// Generated measurements stay outside committed historical evidence. Pass an
// explicit --output where supported, or set MEASUREMENT_DIR for a whole run.
import path from 'node:path';

export const measurementRoot = process.env.MEASUREMENT_DIR || 'test-results/measurements';
export const docxDirectory = path.join(measurementRoot, 'docx');
export const fiveToolsDirectory = path.join(measurementRoot, 'five-tools');
export const memoryDirectory = path.join(measurementRoot, 'memory');
