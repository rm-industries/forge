import { defineConfig, devices } from '@playwright/test';

import { previewOrigin, resolvePreviewUrl } from './tests/preview';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
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
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    env: {
      ...process.env,
      ASTRO_PREVIEW_BACKGROUND: '0',
    },
    url: resolvePreviewUrl('/'),
    reuseExistingServer: !process.env.CI,
  },
});
