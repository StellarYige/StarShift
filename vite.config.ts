import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH || '/StarShift/',
  plugins: [react()],
  // Discover worker-only imports before users select a file, avoiding a cold-start reload.
  optimizeDeps: { include: ['pdf-lib', 'fflate', 'pdfjs-dist'] },
  worker: { format: 'es' },
  server: {
    host: '127.0.0.1',
    // Browser diagnostics stay local, even when Vite detects a coding agent.
    forwardConsole: false,
    // Large immutable assets and test output do not need HMR; avoid Windows file locks.
    watch: { ignored: ['**/vendor/**', '**/.cache/**', '**/release/**', '**/test-results/**', '**/public/engine/**', '**/public/fonts/**', '**/public/pdfjs/**', '**/public/licenses/**', '**/public/asset-manifest.json', '**/public/coi-serviceworker.js'] },
  },
  preview: { host: '127.0.0.1' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
