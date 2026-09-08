import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

import { previewOrigin, resolvePreviewUrl } from './tests/preview';

const previewPort = new URL(previewOrigin).port || '4321';
const reporter: 'list' | ReporterDescription[] =
  process.env.FORGE_PLAYWRIGHT_REPORTER === 'list'
    ? 'list'
    : process.env.CI
      ? [['github'], ['html', { open: 'never' }]]
      : 'list';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter,
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
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${previewPort}`,
    env: {
      ...process.env,
      ASTRO_PREVIEW_BACKGROUND: '0',
    },
    url: resolvePreviewUrl('/'),
    reuseExistingServer: !process.env.CI,
  },
});
