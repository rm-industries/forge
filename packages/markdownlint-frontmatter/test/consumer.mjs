import assert from 'node:assert/strict';

import rule from '@rm-industries/markdownlint-frontmatter';
import { applyFixes } from 'markdownlint';
import { lint } from 'markdownlint/sync';

function check(source) {
  return lint({
    strings: { 'article.md': source },
    customRules: [rule],
    config: {
      default: false,
      MD018: true,
      'forge/frontmatter-order': { orderedKeys: ['title', 'description', 'draft'] },
    },
  })['article.md'];
}
for (const eol of ['\n', '\r\n']) {
  const input = [
    '---',
    '# Document',
    'other: {z: 1, a: 2}',
    'draft: false',
    '# Title',
    'title: "Hello"',
    'description: |-',
    '  First',
    '  Second',
    'extra: yes',
    '',
    '# Footer',
    '...',
    '#Heading',
    '',
  ].join(eol);
  const expected = [
    '---',
    '# Document',
    '# Title',
    'title: "Hello"',
    'description: |-',
    '  First',
    '  Second',
    'draft: false',
    'other: {z: 1, a: 2}',
    'extra: yes',
    '',
    '# Footer',
    '...',
    '# Heading',
    '',
  ].join(eol);
  const errors = check(input);
  assert.equal(errors.find((error) => error.ruleNames.includes('MD018')).lineNumber, 14);
  assert.equal(applyFixes(input, errors), expected);
  assert.deepEqual(check(expected), []);
  assert.equal(applyFixes(expected, check(expected)), expected);
}
for (const input of ['', 'Body\n', '---\n---\nBody\n', '---\ntitle: Hello\nextra: 1\n---\nBody\n']) {
  assert.deepEqual(check(input), []);
}
for (const yaml of [
  'title: first\ntitle: second',
  'title: &a first\nextra: *a',
  'title: [broken',
  'title: hello\n\n# Ambiguous\nextra: 1',
]) {
  const input = `---\n${yaml}\n---\nBody\n`;
  const errors = check(input);
  assert.ok(errors.length > 0);
  assert.ok(errors.every((error) => error.fixInfo === null));
  assert.equal(applyFixes(input, errors), input);
}
console.log(
  'Packed consumer: exact LF/CRLF fixes, body rules, unknown/optional fields, scalar styles, nested maps, comments, unsafe YAML and idempotence passed.',
);
