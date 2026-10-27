import { defineConfig, devices } from '@playwright/test';

import { previewOrigin, previewPort, resolvePreviewUrl } from './tests/support/site';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/smoke/**',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.GITLAB_CI
    ? [
        ['list'],
        ['junit', { outputFile: 'test-results/browser.xml', includeProjectInTestName: true }],
        ['html', { open: 'never' }],
      ]
    : process.env.GITHUB_ACTIONS
      ? [['github'], ['html', { open: 'never' }]]
      : process.env.CI
        ? [['list'], ['html', { open: 'never' }]]
        : 'list',
  use: {
    baseURL: previewOrigin,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: `npm run preview -- --ignore-lock --host 127.0.0.1 --port ${previewPort}`,
    url: resolvePreviewUrl('/'),
    reuseExistingServer: false,
  },
});
