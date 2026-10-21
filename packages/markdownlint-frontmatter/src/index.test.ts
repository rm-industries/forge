import assert from 'node:assert/strict';

import { applyFixes } from 'markdownlint';
import { lint } from 'markdownlint/sync';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';

import rule from './index.ts';

function check(source: string, stripped = true) {
  const errors = lint({
    strings: { 'article.md': source },
    ...(stripped ? {} : { frontMatter: null }),
    customRules: [rule],
    config: { default: false, 'forge/frontmatter-order': { orderedKeys: ['title', 'description', 'draft'] } },
  })['article.md'];
  assert.ok(errors, 'Markdownlint must return the requested document');
  return errors;
}
describe('public Markdownlint rule', () => {
  it.each(['', 'Body\n', '---\n---\nBody\n', '---\n# Document comment\n---\n'])(
    'accepts absent and empty frontmatter: %j',
    (source) => {
      expect(check(source)).toEqual([]);
    },
  );
  it.each(['\n', '\r\n'])('preserves scalar styles, nested mappings, comments, delimiters and %j', (eol) => {
    const source = [
      '---',
      '# Document comment',
      '',
      'draft: false # keep',
      '# Title comment',
      'title: "Hello"',
      'description: |-',
      '  first',
      '  second',
      'extra:',
      '  z: 1',
      '  a: 2',
      '...',
      'Body  ',
      '',
    ].join(eol);
    const expected = [
      '---',
      '# Document comment',
      '',
      '# Title comment',
      'title: "Hello"',
      'description: |-',
      '  first',
      '  second',
      'draft: false # keep',
      'extra:',
      '  z: 1',
      '  a: 2',
      '...',
      'Body  ',
      '',
    ].join(eol);
    expect(applyFixes(source, check(source))).toBe(expected);
    expect(check(expected)).toEqual([]);
  });
  it.each([
    ['# Draft must remain false\ndraft: false\ntitle: Hello', 'ambiguous comment'],
    ['# Title comment\ntitle: Hello\ndraft: false', 'ambiguous comment'],
    ['draft: false\n\n  # Ambiguous\ntitle: hello', 'ambiguous comment'],
    ['title: hello\n\n  # Ambiguous\ndraft: false', 'ambiguous comment'],
    ['title: hello\n  # Ambiguous\n\ndraft: false', 'ambiguous comment'],
    ['title: first\ntitle: second', 'Map keys must be unique'],
    ['title: &name hello\nextra: *name', 'anchors or aliases'],
    ['title: [broken', 'Unsafe YAML'],
    ['title: hello\n\n# Ambiguous\nextra: value', 'ambiguous comment'],
    ['title: hello\n# Ambiguous\n\nextra: value', 'ambiguous comment'],
  ])('diagnoses unsafe YAML even when ordered: %s', (yaml, detail) => {
    const source = `---\n${yaml}\n---\nBody\n`;
    const errors = check(source);
    expect(errors[0]?.errorDetail).toContain(detail);
    expect(errors.every((error) => error.fixInfo === null)).toBe(true);
    expect(applyFixes(source, errors)).toBe(source);
  });
  it.each(['|+', '>+'])('refuses reordered scalars that change meaning: %s', (style) => {
    const source = `---\ndraft: ${style}\n  hi\n\n\ntitle: |\n  hi\n\n---\nBody\n`;
    const errors = check(source);
    expect(errors[0]?.errorDetail).toContain('meaning');
    expect(errors.every((error) => error.fixInfo === null)).toBe(true);
    const fixed = applyFixes(source, errors);
    expect(fixed).toBe(source);
    const [, frontmatter] = fixed.split('---');
    assert.ok(frontmatter !== undefined);
    expect(parseDocument(frontmatter).get('draft')).toBe('hi\n\n\n');
  });
  it('keeps literal comment-looking block scalar content with its value', () => {
    const source = '---\ndraft: |\n  # literal\ntitle: Hello\n---\nBody\n';
    expect(applyFixes(source, check(source))).toBe('---\ntitle: Hello\ndraft: |\n  # literal\n---\nBody\n');
  });
  it('separates a blank-delimited header from attached first-field comments', () => {
    const source = '---\n# Document\n\n# Draft must remain false\ndraft: false\ntitle: Hello\n---\nBody\n';
    const expected = '---\n# Document\n\ntitle: Hello\n# Draft must remain false\ndraft: false\n---\nBody\n';
    expect(applyFixes(source, check(source))).toBe(expected);
    expect(check(expected)).toEqual([]);
  });
  it('moves empty values without dropping their key', () => {
    const source = '---\ndraft: false\ntitle:\n---\nBody';
    expect(applyFixes(source, check(source))).toBe('---\ntitle:\ndraft: false\n---\nBody');
  });
  it('keeps trailing document comments in place', () => {
    const source = '---\ndraft: false\ntitle: Hello\n\n# Document footer\n---\nBody';
    expect(applyFixes(source, check(source))).toBe('---\ntitle: Hello\ndraft: false\n\n# Document footer\n---\nBody');
  });
  it('requires actionable explicit configuration', () => {
    for (const config of [
      true,
      {},
      { orderedKeys: null },
      { orderedKeys: Array<string>(1) },
      { orderedKeys: 'title' },
      { orderedKeys: ['title', 'title'] },
      { orderedKeys: [''] },
      { orderedKeys: [1] },
    ]) {
      expect(() =>
        lint({
          strings: { doc: 'Body' },
          customRules: [rule],
          config: { default: false, 'forge/frontmatter-order': config },
        }),
      ).toThrow(/orderedKeys/);
    }
  });
  it('fixes frontmatter and ordinary Markdown rules together at correct source lines', () => {
    const source = '---\ndraft: false\ntitle: Hello\n---\n#Heading\n';
    const errors = lint({
      strings: { doc: source },
      customRules: [rule],
      config: { default: false, MD018: true, 'forge/frontmatter-order': { orderedKeys: ['title', 'draft'] } },
    }).doc;
    assert.ok(errors, 'Markdownlint must return the requested document');
    expect(errors.find((error) => error.ruleNames.includes('MD018'))?.lineNumber).toBe(5);
    expect(errors.find((error) => error.ruleNames.includes('forge/frontmatter-order'))?.lineNumber).toBe(2);
    expect(applyFixes(source, errors)).toBe('---\ntitle: Hello\ndraft: false\n---\n# Heading\n');
  });
  it('orders present fields and keeps unknown keys stable with exact fixes', () => {
    const source = '---\nz: 1\ndraft: false\ntitle: "Hello"\na: 2\n---\nBody\n';
    const expected = '---\ntitle: "Hello"\ndraft: false\nz: 1\na: 2\n---\nBody\n';
    const errors = check(source);
    expect(errors[0]?.errorDetail).toContain('title, draft, z, a');
    expect(applyFixes(source, errors)).toBe(expected);
    expect(check(expected)).toEqual([]);
  });
});
