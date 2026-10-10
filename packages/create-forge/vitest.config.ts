import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/ci.test.ts', 'src/ci-pins.test.ts'],
  },
});
