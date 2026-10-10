import { expect, test } from '@playwright/test';

import { resolvePreviewPath } from './preview';

test('uses the documented action hierarchy and semantic badges', async ({ page }) => {
  await page.goto(resolvePreviewPath('/'));

  await expect(page.getByRole('link', { name: 'Create a site' })).toHaveClass(/btn-primary/u);
  await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveClass(/btn-outline/u);
  await expect(page.getByRole('link', { name: 'Explore the features' })).toHaveClass(/btn-primary/u);
  await expect(page.getByRole('link', { name: 'Read the documentation' })).toHaveClass(/btn-outline/u);
  await expect(page.getByText('Built with Forge', { exact: true })).toHaveClass(/badge-neutral/u);

  await page.goto(resolvePreviewPath('/packages/'));

  await expect(page.getByRole('link', { name: 'View on npm' }).first()).toHaveClass(/btn-primary/u);
  await expect(page.getByRole('link', { name: 'Source and API' }).first()).toHaveClass(/btn-outline/u);
  await expect(page.locator('.badge-neutral')).toHaveCount(3);

  await page.goto(resolvePreviewPath('/404/'));

  await expect(page.getByRole('link', { name: 'Return home' })).toHaveClass(/btn-primary/u);
  await expect(page.getByText('404', { exact: true })).toHaveClass(/badge-neutral/u);
});
