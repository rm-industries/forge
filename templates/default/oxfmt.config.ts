import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: [
    '.github/workflows/*project.yml',
    '.github/workflows/*security.yml',
    '.github/workflows/*automation.yml',
  ],
  singleQuote: true,
  sortImports: true,
  sortPackageJson: true,
  sortTailwindcss: true,
  trailingComma: 'all',
});
