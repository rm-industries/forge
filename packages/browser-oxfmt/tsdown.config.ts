import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: { index: 'src/index.ts', worker: 'src/worker.ts' },
  format: 'esm',
  platform: 'browser',
  sourcemap: true,
  external: ['./wasm/engine.js'],
});
