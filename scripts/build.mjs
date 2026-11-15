// Bundles the TypeScript source tree into the committed runtime artifacts:
//   backend.js  (Node/CommonJS, loaded by the Spindle backend host)
//   frontend.js (ES module, loaded by the Spindle frontend host)
// Version banner is stamped from spindle.json (the single version source).
// Build is deterministic — CI rebuilds and fails on any diff.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../spindle.json', import.meta.url), 'utf8'));
const banner = {
  js: `/* weft-chronicle v${manifest.version} — bundle built from src/ (see repository) */`,
};

const common = {
  bundle: true,
  banner,
  target: 'es2020',
  legalComments: 'inline',
  logLevel: 'warning',
};

await build({
  ...common,
  entryPoints: ['src/backend/backend.ts'],
  outfile: 'backend.js',
  platform: 'node',
  format: 'cjs',
});

await build({
  ...common,
  entryPoints: ['src/frontend/frontend.ts'],
  outfile: 'frontend.js',
  platform: 'browser',
  format: 'esm',
});
