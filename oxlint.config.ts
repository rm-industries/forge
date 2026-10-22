import { defineConfig } from 'oxlint';

export default defineConfig({
  ignorePatterns: ['packages/browser-oxfmt/src/generated/**'],
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
