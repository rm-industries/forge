import { expect, test } from '@playwright/test';

import { site } from '../src/config/site';
import { resolvePreviewPath, resolvePreviewUrl } from './preview';

const routes = ['/', '/docs/getting-started/', '/features/', '/packages/', '/docs/', '/project/', '/about/', '/404/'];

test('serves every baseline page with configured canonical and social metadata', async ({ page }) => {
  for (const route of routes) {
    await page.goto(resolvePreviewPath(route));

    const canonicalUrl = new URL(resolvePreviewPath(route), site.url).href;

    await expect(page.locator('meta[name="generator"]')).toHaveAttribute('content', 'Forge by RM Industries');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalUrl);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property^="article:"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', site.name);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonicalUrl);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
});

test('resolves every internal page link', async ({ page, request }) => {
  await page.goto(resolvePreviewPath('/'));

  const pending = [resolvePreviewPath('/')];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const path = pending.shift();
    if (!path || visited.has(path)) continue;

    visited.add(path);
    await page.goto(path);

    const links = await page
      .locator('a[href]')
      .evaluateAll((elements) => elements.map((element) => (element as HTMLAnchorElement).href));

    for (const href of links) {
      const url = new URL(href);
      if (url.origin !== new URL(resolvePreviewUrl('/')).origin) continue;

      const linkedPath = url.pathname;
      const response = await request.get(linkedPath);
      expect(response.status(), `${path} links to ${linkedPath}`).toBeLessThan(400);

      if (!visited.has(linkedPath)) pending.push(linkedPath);
    }
  }
});

test('serves crawler, manifest, and not-found metadata', async ({ request }) => {
  const robots = await request.get(resolvePreviewPath('/robots.txt'));
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${new URL('sitemap-index.xml', site.url).href}`);

  const manifest = await request.get(resolvePreviewPath('/site.webmanifest'));
  expect(manifest.ok()).toBe(true);
  expect(manifest.headers()['content-type']).toMatch(/application\/manifest\+json/u);
  expect(await manifest.json()).toMatchObject({ name: site.name, start_url: resolvePreviewPath('/') });

  const missing = await request.get(resolvePreviewPath('/does-not-exist/'));
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('That page is not here.');
});

test('helps visitors recover from a missing page', async ({ page }) => {
  const response = await page.goto(resolvePreviewPath('/does-not-exist/'));

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'That page is not here.' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL(resolvePreviewUrl('/'));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('publishes only selected documentation and retires the competing tutorial', async ({ page, request }) => {
  await page.goto(resolvePreviewPath('/docs/'));
  await expect(page.getByRole('link', { name: 'Create a Forge site', exact: true })).toHaveAttribute(
    'href',
    resolvePreviewPath('/docs/getting-started/'),
  );
  await expect(page.getByRole('link', { name: 'Maintainer release guide', exact: true })).toHaveCount(0);
  for (const route of ['/docs/releasing/', '/get-started/']) {
    const response = await request.get(resolvePreviewPath(route));
    expect(response.status()).toBe(404);
  }
  const sitemap = await request.get(resolvePreviewPath('/sitemap-0.xml'));
  const xml = await sitemap.text();
  expect(xml).toContain('/docs/getting-started/');
  expect(xml).not.toContain('/docs/releasing/');
  expect(xml).not.toContain('/forge/get-started/');
});

test('follows the complete generated-site guide journey in reading order', async ({ page }) => {
  const journey = [
    ['getting-started', 'Create a Forge site'],
    ['configuration', 'Configure and customize your site'],
    ['content-and-cms', 'Content and CMS editing'],
    ['themes-and-accessibility', 'Themes and accessibility'],
    ['deployment', 'Deploy your site'],
    ['ci-providers', 'Generated CI'],
    ['quality-and-troubleshooting', 'Quality checks and troubleshooting'],
    ['upgrades', 'Maintain and upgrade your site'],
    ['support-policy', 'Compatibility and support'],
    ['browser-formatter-adoption', 'Existing-site browser formatter adoption'],
  ];
  await page.goto(resolvePreviewPath('/docs/getting-started/'));
  for (let index = 0; index < journey.length; index += 1) {
    const [id, title] = journey[index]!;
    await expect(page).toHaveURL(resolvePreviewUrl(`/docs/${id}/`));
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    if (index > 0) {
      await expect(
        page.getByRole('link', { name: `Previous: ${journey[index - 1]![1]}`, exact: true }),
      ).toHaveAttribute('href', resolvePreviewPath(`/docs/${journey[index - 1]![0]}/`));
    }
    if (index + 1 < journey.length) {
      await page.getByRole('link', { name: `Next: ${journey[index + 1]![1]}`, exact: true }).click();
    }
  }
});

test('connects all four packages to their canonical references', async ({ page }) => {
  await page.goto(resolvePreviewPath('/packages/'));
  const references = page.getByRole('link', { name: 'Reference', exact: true });
  await expect(references).toHaveCount(4);
  for (const [index, slug] of [
    'create-forge',
    'content-model',
    'browser-oxfmt',
    'markdownlint-frontmatter',
  ].entries()) {
    await expect(references.nth(index)).toHaveAttribute('href', resolvePreviewPath(`/docs/${slug}/`));
    await page.goto(resolvePreviewPath(`/docs/${slug}/`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute(
      'href',
      `https://github.com/rm-industries/forge/blob/main/packages/${slug}/README.md`,
    );
    await page.goto(resolvePreviewPath('/packages/'));
  }
});
