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

  it('mounts logical paths even when they start with the deployment base', () => {
    expect(resolveSiteHref('/docs/getting-started/?view=full#tools', '/docs/')).toBe(
      '/docs/docs/getting-started/?view=full#tools',
    );
    expect(resolveSiteHref('/forge', '/forge/')).toBe('/forge/forge');
  });

  it.each(['https://example.com', '//cdn.example.com/file.svg', '#content', 'mailto:hello@example.com'])(
    'keeps non-local URL %s unchanged',
    (href) => {
      expect(resolveSiteHref(href, '/forge/')).toBe(href);
    },
  );
});
