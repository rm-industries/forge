import { defineConfig } from 'oxfmt';

export default defineConfig({
  trailingComma: 'all',
  singleQuote: true,
  sortImports: true,
  sortTailwindcss: true,
  sortPackageJson: true,
  ignorePatterns: ['packages/browser-oxfmt/assets/**', 'packages/browser-oxfmt/NOTICE.md'],
});
