import { expect, test } from '@playwright/test';

import { resolvePreviewPath, resolvePreviewUrl } from './preview';

const primaryRoutes = [
  { path: '/', current: 'Home' },
  { path: '/docs/getting-started/', current: 'Get started' },
  { path: '/packages/', current: 'Packages' },
  { path: '/docs/', current: 'Docs' },
] as const;

test('keeps product learning in primary navigation and Project in the footer', async ({ page }) => {
  await page.goto(resolvePreviewPath('/'));
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link')).toHaveText([
    'Home',
    'Get started',
    'Docs',
    'Packages',
  ]);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Project', exact: true }).click();
  await expect(page).toHaveURL(resolvePreviewUrl('/project/'));
});

for (const route of primaryRoutes) {
  test(`${route.path} identifies exactly one current primary navigation item`, async ({ page }) => {
    await page.goto(resolvePreviewPath(route.path));

    const currentLinks = page.getByRole('navigation', { name: 'Primary navigation' }).locator('a[aria-current="page"]');
    await expect(currentLinks).toHaveCount(1);
    await expect(currentLinks).toHaveText(route.current);
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'RM Industries' })).toHaveAttribute(
      'href',
      'https://www.rm-industries.com/',
    );
  });
}

test('links back to RM Industries from non-primary pages', async ({ page }) => {
  for (const path of ['/project/', '/does-not-exist/']) {
    await page.goto(resolvePreviewPath(path));
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'RM Industries' })).toHaveAttribute(
      'href',
      'https://www.rm-industries.com/',
    );
  }
});

test('uses primary navigation to move between pages and identify the current page', async ({ page }) => {
  await page.goto(resolvePreviewPath('/'));

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

  await navigation.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(resolvePreviewUrl('/docs/getting-started/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Create a Forge site' })).toBeVisible();
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
  await navigation.getByRole('link', { name: 'Packages' }).click();

  await expect(page).toHaveURL(resolvePreviewUrl('/packages/'));
  await page.locator('summary').filter({ hasText: 'Menu' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Mobile navigation' }).locator('a[aria-current="page"]'),
  ).toHaveText('Packages');
  await expect(page.getByRole('heading', { level: 1, name: 'Four packages. One owned site.' })).toBeVisible();
});
