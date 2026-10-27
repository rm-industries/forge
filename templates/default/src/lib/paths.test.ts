import { describe, expect, it } from 'vitest';

import { resolveSiteHref } from './paths';

describe('resolveSiteHref', () => {
  it('keeps root-relative URLs unchanged for root deployments', () => {
    expect(resolveSiteHref('/articles/', '/')).toBe('/articles/');
  });

  it('prefixes root-relative URLs for project deployments', () => {
    expect(resolveSiteHref('/articles/', '/forge/')).toBe('/forge/articles/');
    expect(resolveSiteHref('/articles/', 'forge')).toBe('/forge/articles/');
  });

  it('mounts logical routes even when their name matches the deployment base', () => {
    expect(resolveSiteHref('/articles/post/', '/articles/')).toBe('/articles/articles/post/');
    expect(resolveSiteHref('/articles/?q=x#details', '/articles/')).toBe('/articles/articles/?q=x#details');
    expect(resolveSiteHref('/', '/preview/')).toBe('/preview/');
  });

  it.each(['https://example.com', '//cdn.example.com/file.svg', '#content', 'mailto:hello@example.com'])(
    'keeps non-local URL %s unchanged',
    (href) => {
      expect(resolveSiteHref(href, '/forge/')).toBe(href);
    },
  );
});
