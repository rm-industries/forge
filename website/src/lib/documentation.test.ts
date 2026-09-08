import { describe, expect, it } from 'vitest';

import { documentationGroup, documentationHref, documentationId, documentationTitle } from './documentation.ts';

describe('documentation helpers', () => {
  it('derives a clean title from the first level-one heading', () => {
    expect(documentationTitle({ body: '# Use `Forge`\n' } as never)).toBe('Use Forge');
  });

  it('falls back to the entry ID when a heading is unavailable', () => {
    expect(documentationTitle({ body: undefined, id: 'guides/setup' } as never)).toBe('guides/setup');
    expect(documentationTitle({ body: 'No heading', id: 'policy' } as never)).toBe('policy');
  });

  it('maps document IDs to website routes', () => {
    expect(documentationHref('')).toBe('/docs/');
    expect(documentationHref('guides/setup')).toBe('/docs/guides/setup/');
  });

  it('normalizes Markdown paths into collection IDs', () => {
    expect(documentationId({ entry: 'README.md' })).toBe('');
    expect(documentationId({ entry: 'guides/README.md' })).toBe('guides');
    expect(documentationId({ entry: 'guides/setup.md' })).toBe('guides/setup');
  });

  it('groups architecture, review, and general documentation', () => {
    expect(documentationGroup('decisions/0001-example')).toBe('Architecture decisions');
    expect(documentationGroup('reviews/1.0.0')).toBe('Release reviews');
    expect(documentationGroup('guides/setup')).toBe('Guides and policies');
  });
});
