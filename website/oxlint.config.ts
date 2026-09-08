import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['import', 'oxc', 'typescript', 'unicorn', 'vitest'],
});
