import { defineConfig } from 'tsdown';
export default defineConfig([
  {
    entry: { index: 'src/index.ts', worker: 'src/worker.ts' },
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    external: ['./generated/engine.js'],
  },
  {
    entry: { build: 'src/build.ts' },
    format: 'esm',
    platform: 'node',
    outExtensions: () => ({ js: '.js' }),
    sourcemap: true,
    clean: false,
  },
]);
