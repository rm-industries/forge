import { expect, test } from 'vitest';

import { defineModel } from '../packages/content-model/src/index.ts';
import { createSveltiaCollection } from '../packages/content-model/src/sveltia/index.ts';
import { frontmatterOrderFromModel } from '../packages/markdownlint-frontmatter/src/index.ts';

test('content models project the same field order into frontmatter and Sveltia', () => {
  const title = { kind: 'string', required: true, label: 'Title' } as const;
  const description = { kind: 'string', label: 'Description' } as const;
  const draft = { kind: 'boolean', label: 'Draft' } as const;
  for (const [name, fields, expected] of [
    ['articles', { title, description, draft }, ['title', 'description', 'draft']],
    ['pages', { description, draft, title }, ['description', 'draft', 'title']],
    ['articles', { draft, title, description }, ['draft', 'title', 'description']],
  ] as const) {
    const model = defineModel({
      name,
      label: name,
      labelSingular: name,
      folder: `content/${name}`,
      slug: '{{slug}}',
      fields,
      body: { name: 'body', label: 'Body' },
    });
    const config = frontmatterOrderFromModel(model);
    expect(config.orderedKeys).toEqual(expected);
    expect(createSveltiaCollection(model).fields.map((field) => field.name)).toEqual([...expected, 'body']);
  }
});
