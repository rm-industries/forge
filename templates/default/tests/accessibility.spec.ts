import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { publicRoutes } from './pages';
import { resolvePreviewPath } from './support/site';

const analyzePage = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  return results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
};

for (const colorScheme of ['light', 'dark'] as const) {
  for (const route of publicRoutes) {
    test(`${route} has no serious or critical violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(resolvePreviewPath(route));

      expect(await analyzePage(page)).toEqual([]);
    });
  }
}

for (const route of publicRoutes) {
  test(`${route} exposes one main landmark and one level-one heading`, async ({ page }) => {
    await page.goto(resolvePreviewPath(route));

    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}

test('avoids horizontal overflow on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of publicRoutes) {
    await page.goto(resolvePreviewPath(route));
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(
      false,
    );
  }
});
