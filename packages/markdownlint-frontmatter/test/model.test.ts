import { applyFixes } from 'markdownlint';
import { lint } from 'markdownlint/sync';
import { expect, test } from 'vitest';

import { defineModel } from '../../content-model/src/index';
import { createSveltiaCollection } from '../../content-model/src/sveltia/index';
import rule, { frontmatterOrderFromModel } from '../src/index';

test('model order drives lint and Sveltia for separate collections and reordered fields', () => {
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
    const input = '---\nunknown: keep\ntitle: Hello\ndraft: false\nextra: last\n---\nbody: unchanged\n';
    const errors = lint({
      strings: { entry: input },
      customRules: [rule],
      config: { default: false, 'forge/frontmatter-order': config },
    }).entry!;
    const fixed = applyFixes(input, errors);
    const known = expected
      .filter((key) => key !== 'description')
      .map((key) => (key === 'title' ? 'title: Hello' : 'draft: false'));
    expect(fixed).toBe(['---', ...known, 'unknown: keep', 'extra: last', '---', 'body: unchanged', ''].join('\n'));
    expect(
      lint({
        strings: { entry: fixed },
        customRules: [rule],
        config: { default: false, 'forge/frontmatter-order': config },
      }).entry,
    ).toEqual([]);
  }
});

test('the public rule rejects invalid projected field names', () => {
  expect(() =>
    lint({
      strings: { entry: 'Body' },
      customRules: [rule],
      config: { default: false, 'forge/frontmatter-order': frontmatterOrderFromModel({ fields: { '': {} } }) },
    }),
  ).toThrow(/orderedKeys/);
});
