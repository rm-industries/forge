/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    reporters: process.env.GITLAB_CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: 'test-results/unit.xml',
              classnameTemplate: `{filename}:node-${process.env.NODE_VERSION ?? 'primary'}`,
            },
          ],
        ]
      : process.env.GITHUB_ACTIONS === 'true'
        ? ['default', 'github-actions']
        : ['default'],
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/support/**/*.test.ts'],
    coverage: {
      include: [
        'src/config/**/*.ts',
        'src/content.config.ts',
        'src/integrations/**/*.ts',
        'src/lib/**/*.ts',
        'src/themes/site-theme.ts',
      ],
      provider: 'v8',
      reporter: process.env.GITLAB_CI
        ? ['text', 'html', ['cobertura', { projectRoot: process.env.CI_PROJECT_DIR ?? process.cwd() }]]
        : ['text', 'html'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
