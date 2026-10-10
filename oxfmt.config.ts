import { defineConfig } from 'oxfmt';

export default defineConfig({
  trailingComma: 'all',
  singleQuote: true,
  sortImports: true,
  sortTailwindcss: true,
  sortPackageJson: true,
  ignorePatterns: [
    '.github/workflows/project.yml',
    '.github/workflows/security.yml',
    '.github/workflows/automation.yml',
    '.github/workflows/website-project.yml',
    '.github/workflows/website-security.yml',
    '.github/workflows/website-automation.yml',
  ],
});
