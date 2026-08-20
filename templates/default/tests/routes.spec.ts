import { expect, test } from '@playwright/test';

const routes = ['/', '/about/', '/articles/', '/articles/designing-a-calm-starting-point/', '/404/'];

test('serves every baseline page with configured canonical and social metadata', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new URL(route, 'https://example.com').href,
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Forge');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      new URL(route, 'https://example.com').href,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
});

test('resolves every internal page link', async ({ page, request }) => {
  await page.goto('/');

  const pending = ['/'];
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
      if (url.origin !== 'http://127.0.0.1:4321') continue;

      const linkedPath = url.pathname;
      const response = await request.get(linkedPath);
      expect(response.status(), `${path} links to ${linkedPath}`).toBeLessThan(400);

      if (!visited.has(linkedPath)) pending.push(linkedPath);
    }
  }
});

test('serves feed, crawler, manifest, and not-found metadata', async ({ request }) => {
  const feed = await request.get('/rss.xml');
  expect(feed.ok()).toBe(true);
  expect(await feed.text()).toContain('https://example.com/articles/designing-a-calm-starting-point/');
  expect(await feed.text()).not.toContain('future-draft');

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://example.com/sitemap-index.xml');

  const manifest = await request.get('/site.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect(manifest.headers()['content-type']).toMatch(/application\/manifest\+json/u);
  expect(await manifest.json()).toMatchObject({ name: 'Forge', start_url: '/' });

  const missing = await request.get('/does-not-exist/');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('That page is not here.');
});
