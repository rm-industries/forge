import { expect, test } from '@playwright/test';

import { resolvePreviewPath, resolvePreviewUrl } from './preview';

test('uses primary navigation to move between pages and identify the current page', async ({ page }) => {
  await page.goto(resolvePreviewPath('/'));

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

  await navigation.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(resolvePreviewUrl('/get-started/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Create a Forge site.' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Get started' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('opens mobile navigation and follows a configured link', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(resolvePreviewPath('/'));

  await page.locator('summary').filter({ hasText: 'Menu' }).click();
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: 'Project' }).click();

  await expect(page).toHaveURL(resolvePreviewUrl('/project/'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Build and improve Forge with RM Industries.' }),
  ).toBeVisible();
});

test('moves from the article listing into an article and through article pagination', async ({ page }) => {
  await page.goto(resolvePreviewPath('/articles/'));

  await page.getByRole('link', { name: /Own the output/u }).click();
  await expect(page).toHaveURL(resolvePreviewUrl('/articles/own-the-output/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Own the output' })).toBeVisible();

  const articleNavigation = page.getByRole('navigation', { name: 'Article navigation' });
  await articleNavigation.getByRole('link', { name: /One model, two integrations/u }).click();
  await expect(page).toHaveURL(resolvePreviewUrl('/articles/one-model-two-integrations/'));
  await expect(page.getByRole('heading', { level: 1, name: 'One model, two integrations' })).toBeVisible();
});
