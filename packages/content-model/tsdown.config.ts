import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    astro: 'src/astro/index.ts',
    index: 'src/index.ts',
    sveltia: 'src/sveltia/index.ts',
  },
  format: 'esm',
  platform: 'neutral',
  sourcemap: true,
});
