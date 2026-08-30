import { defineConfig } from 'cspell';

export default defineConfig({
  // Ignore only installed dependencies and generated tool output.
  ignorePaths: ['node_modules', 'dist', 'coverage', 'playwright-report', 'test-results'],
  words: ['Catppuccin', 'contentinfo', 'daisyui', 'Fira', 'fontsource', 'Macchiato', 'prefersdark', 'Sveltia', 'WCAG'],
});
