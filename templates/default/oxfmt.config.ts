import { defineConfig } from 'oxfmt';

export default defineConfig({
  singleQuote: true,
  ignorePatterns: ['.github/workflows/*.yml', '.gitlab-ci.yml', '.gitlab/ci/*.yml'],
  sortImports: true,
  sortPackageJson: true,
  sortTailwindcss: true,
  trailingComma: 'all',
});
