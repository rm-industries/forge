import { describe, expect, it } from 'vitest';

import { documentationHref, documentationId, documentationPublication, documentationTitle } from './documentation.ts';

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

  it('uses the registered identity rather than the source filename', () => {
    expect(documentationId({ entry: 'docs/getting-started.md' })).toBe('getting-started');
  });

  it('identifies the canonical tutorial source and section', () => {
    expect(documentationPublication('getting-started')).toEqual({
      id: 'getting-started',
      source: 'docs/getting-started.md',
      section: 'Start here',
    });
  });
});
