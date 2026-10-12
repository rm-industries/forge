import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    include: ['src/**/*.test.ts'],
  },
});
