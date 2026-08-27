import { describe, expect, test } from 'vitest';

import { findLocalDependencies, findPersonalIdentifiers, findUnresolvedTokens } from './verify-template.ts';

describe('template isolation guardrails', () => {
  test('rejects dependency protocols that can resolve through the source checkout', () => {
    expect(
      findLocalDependencies({
        dependencies: { local: 'file:../local', published: '^1.0.0' },
        devDependencies: { workspace: 'workspace:*' },
      }),
    ).toEqual(['dependencies.local=file:../local', 'devDependencies.workspace=workspace:*']);
  });

  test('reports unresolved generator tokens with their paths', () => {
    expect(
      findUnresolvedTokens([
        { path: 'site.ts', content: 'const name = {{ project_name }};' },
        { path: 'config.ts', content: 'const id = __FORGE_SITE_ID__;' },
      ]),
    ).toEqual(['site.ts: {{ project_name }}', 'config.ts: __FORGE_SITE_ID__']);
  });

  test('permits only the documented Sveltia runtime tokens in their owning files', () => {
    expect(
      findUnresolvedTokens([
        { path: 'src/config/content-models/articles.ts', content: "slug: '{{slug}}'" },
        {
          path: 'src/integrations/sveltia/config.ts',
          content: "message: 'content({{collection}}): update {{slug}} at {{path}}'",
        },
      ]),
    ).toEqual([]);
    expect(findUnresolvedTokens([{ path: 'src/config/site.ts', content: "name: '{{slug}}'" }])).toEqual([
      'src/config/site.ts: {{slug}}',
    ]);
  });

  test('reports personal reference identifiers but permits generic defaults', () => {
    expect(findPersonalIdentifiers([{ path: 'site.ts', content: 'https://example.com' }])).toEqual([]);
    expect(findPersonalIdentifiers([{ path: 'site.ts', content: 'rahul0705' }])).toEqual(['site.ts: rahul0705']);
  });
});
