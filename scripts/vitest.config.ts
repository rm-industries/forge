import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'templates/default/scripts/ci/*.test.ts'],
  },
});
