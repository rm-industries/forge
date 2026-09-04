import { describe, expect, it } from 'vitest';

import { resolveCanonicalHref, resolveSiteHref } from './paths';

describe('resolveSiteHref', () => {
  it('keeps root-relative URLs unchanged for root deployments', () => {
    expect(resolveSiteHref('/articles/', '/')).toBe('/articles/');
  });

  it('prefixes root-relative URLs for project deployments', () => {
    expect(resolveSiteHref('/articles/', '/forge/')).toBe('/forge/articles/');
    expect(resolveSiteHref('/articles/', 'forge')).toBe('/forge/articles/');
  });

  it('does not prefix an existing deployment base', () => {
    expect(resolveSiteHref('/forge/articles/', '/forge/')).toBe('/forge/articles/');
    expect(resolveSiteHref('/forge', '/forge/')).toBe('/forge');
  });

  it.each(['https://example.com', '//cdn.example.com/file.svg', '#content', 'mailto:hello@example.com'])(
    'keeps non-local URL %s unchanged',
    (href) => {
      expect(resolveSiteHref(href, '/forge/')).toBe(href);
    },
  );
});

describe('resolveCanonicalHref', () => {
  it('retains the production project base during local development', () => {
    expect(resolveCanonicalHref('/articles/', 'https://owner.github.io/forge/', '/')).toBe(
      'https://owner.github.io/forge/articles/',
    );
  });

  it('does not duplicate the project base in a production route', () => {
    expect(resolveCanonicalHref('/forge/articles/', 'https://owner.github.io/forge/', '/forge/')).toBe(
      'https://owner.github.io/forge/articles/',
    );
    expect(resolveCanonicalHref('/forge', 'https://owner.github.io/forge/', '/forge/')).toBe(
      'https://owner.github.io/forge/',
    );
  });
});
