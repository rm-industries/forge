import { expect, test } from '@playwright/test';

import { resolvePreviewPath } from './preview';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`renders Forge marks without distortion or overflow in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(resolvePreviewPath('/'));

    const marks = page.locator('img[src*="forge-logo"]');
    await expect(marks).toHaveCount(2);
    for (const mark of await marks.all()) {
      const dimensions = await mark.evaluate((image: HTMLImageElement) => {
        const bounds = image.getBoundingClientRect();
        return {
          loaded: image.complete && image.naturalWidth > 0,
          naturalRatio: image.naturalWidth / image.naturalHeight,
          renderedRatio: bounds.width / bounds.height,
        };
      });
      expect(dimensions.loaded).toBe(true);
      expect(dimensions.naturalRatio).toBe(1);
      expect(dimensions.renderedRatio).toBe(1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(
      false,
    );
  });
}

test('renders favicon and social card at their intended intrinsic sizes', async ({ page }) => {
  await page.goto(resolvePreviewPath('/'));

  const dimensions = await page.evaluate(
    async (sources) =>
      Promise.all(
        sources.map(
          (source) =>
            new Promise<{ height: number; width: number }>((resolve, reject) => {
              const image = new Image();
              image.addEventListener('load', () => resolve({ height: image.naturalHeight, width: image.naturalWidth }));
              image.addEventListener('error', () => reject(new Error(`Could not load ${source}`)));
              image.src = source;
            }),
        ),
      ),
    [resolvePreviewPath('/favicon.svg'), resolvePreviewPath('/social-card.svg')],
  );

  expect(dimensions).toEqual([
    { height: 160, width: 160 },
    { height: 630, width: 1200 },
  ]);
});
