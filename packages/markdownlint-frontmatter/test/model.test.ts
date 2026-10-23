import assert from 'node:assert/strict';

import { applyFixes } from 'markdownlint';
import { lint } from 'markdownlint/sync';
import { expect, test } from 'vitest';

import rule, { frontmatterOrderFromModel } from '../src/index';

test('field order drives lint for independent model shapes and reordered fields', () => {
  const title = { kind: 'string', required: true, label: 'Title' } as const;
  const description = { kind: 'string', label: 'Description' } as const;
  const draft = { kind: 'boolean', label: 'Draft' } as const;
  for (const [fields, expected] of [
    [{ title, description, draft }, ['title', 'description', 'draft']],
    [{ description, draft, title }, ['description', 'draft', 'title']],
    [{ draft, title, description }, ['draft', 'title', 'description']],
  ] as const) {
    const model = { fields, body: { name: 'body', label: 'Body' } };
    const config = frontmatterOrderFromModel(model);
    expect(config.orderedKeys).toEqual(expected);
    const input = '---\nunknown: keep\ntitle: Hello\ndraft: false\nextra: last\n---\nbody: unchanged\n';
    const errors = lint({
      strings: { entry: input },
      customRules: [rule],
      config: { default: false, 'forge/frontmatter-order': config },
    }).entry;
    assert.ok(errors, 'Markdownlint must return the requested document');
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
