import { expect, test } from '@playwright/test';

import { resolvePreviewPath } from './preview';

test('identifies the current primary navigation item', async ({ page }) => {
  await page.goto(resolvePreviewPath('/'));

  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
});

test('moves keyboard users directly to the main content', async ({ browserName, page }) => {
  await page.goto(resolvePreviewPath('/'));
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/u);
  await expect(page.getByRole('main')).toBeFocused();
});

test('keeps navigation available without horizontal overflow on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(resolvePreviewPath('/'));

  await page.locator('summary').click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
});

test('honors reduced-motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(resolvePreviewPath('/'));

  const motionStyles = await page.getByRole('link', { name: 'Browse the articles' }).evaluate((element) => {
    const styles = getComputedStyle(element);

    return {
      animationDuration: styles.animationDuration,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      transitionDuration: styles.transitionDuration,
    };
  });

  expect(motionStyles.scrollBehavior).toBe('auto');
  expect(Number.parseFloat(motionStyles.animationDuration)).toBeLessThanOrEqual(0.001);
  expect(Number.parseFloat(motionStyles.transitionDuration)).toBeLessThanOrEqual(0.001);
});
