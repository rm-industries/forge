import { defineConfig } from 'cspell';

export default defineConfig({
  // Ignore only installed dependencies and generated tool output.
  ignorePaths: ['node_modules', 'dist', 'coverage', 'playwright-report', 'test-results', '.lighthouseci'],
  words: [
    'interruptible',
    'zizmorcore',
    'autorun',
    'Catppuccin',
    'contentinfo',
    'daisyui',
    'Fira',
    'fontsource',
    'frontmatter',
    'GHSA',
    'lhci',
    'lighthouseci',
    'Macchiato',
    'prefersdark',
    'Sveltia',
    'unreviewed',
    'vite',
    'WCAG',
    'Zizmor',
  ],
});
