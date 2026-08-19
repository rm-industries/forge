import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const violations = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');

  expect(violations).toEqual([]);
});

test('exposes landmarks and identifies the current navigation item', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('moves keyboard users directly to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/u);
  await expect(page.getByRole('main')).toBeFocused();
});

test('keeps navigation available without horizontal overflow on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');

  await page.locator('summary').click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
});
