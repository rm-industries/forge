import { expect, test } from 'vitest';

import { createPreviewTarget, resolveConfiguredSite } from './preview-url';

test('targets an alternate local port at the configured mount and preserves query and fragment', () => {
  const target = createPreviewTarget(new URL('https://public.example/preview/'), '5432');

  expect(target.origin).toBe('http://127.0.0.1:5432');
  expect(target.resolveUrl('/articles/?q=x#details')).toBe('http://127.0.0.1:5432/preview/articles/?q=x#details');
  expect(target.resolvePath('/articles/?q=x#details')).toBe('/preview/articles/?q=x#details');
});

test('rejects invalid or non-canonical local ports instead of starting another target', () => {
  for (const port of ['', '0', '65536', '-1', '4321.5', 'abc', ' 4321', '4321\n']) {
    expect(() => createPreviewTarget(new URL('https://public.example/'), port)).toThrow(/PLAYWRIGHT_PORT/u);
  }
});

test('uses Astro resolved site and base for public identity independently of the local target', () => {
  const site = resolveConfiguredSite(JSON.stringify('https://public.example/'), JSON.stringify('/preview'));

  expect(site.href).toBe('https://public.example/preview/');
  expect(createPreviewTarget(site).resolveUrl('/')).toBe('http://127.0.0.1:4321/preview/');
});

test('reports missing or unexpected Astro definitions clearly', () => {
  for (const [site, base] of [
    [undefined, JSON.stringify('/')],
    ['null', JSON.stringify('/')],
    [JSON.stringify('https://public.example/'), undefined],
    [JSON.stringify('https://public.example/'), 'false'],
    [JSON.stringify('https://public.example/'), JSON.stringify('')],
    [JSON.stringify('https://public.example/'), JSON.stringify('preview')],
    [JSON.stringify('https://public.example/'), JSON.stringify('//other.example/')],
    ['malformed', JSON.stringify('/')],
    [JSON.stringify('not a URL'), JSON.stringify('/')],
  ]) {
    expect(() => resolveConfiguredSite(site, base)).toThrow(/Astro to provide SITE and BASE_URL/u);
  }
});

test('keeps the root default and treats route-name collisions as logical routes', () => {
  expect(createPreviewTarget(new URL('https://public.example/')).resolveUrl('/articles/post/')).toBe(
    'http://127.0.0.1:4321/articles/post/',
  );
  expect(createPreviewTarget(new URL('https://public.example/articles/')).resolvePath('/articles/post/')).toBe(
    '/articles/articles/post/',
  );
});

test('keeps paths intact when the requested port is the standard HTTP port', () => {
  const target = createPreviewTarget(new URL('https://public.example/preview/'), '80');

  expect(target.origin).toBe('http://127.0.0.1');
  expect(target.resolvePath('/articles/')).toBe('/preview/articles/');
});
