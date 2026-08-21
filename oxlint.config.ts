import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['import', 'oxc', 'typescript', 'unicorn', 'vitest'],
  overrides: [
    {
      files: ['packages/content-model/src/**/*.ts'],
      rules: {
        'import/extensions': ['error', 'never', { checkTypeImports: true }],
      },
    },
  ],
});
