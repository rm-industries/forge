import { expect, test, describe } from 'vitest';

import { defineWork, nonEmptyStringSchema, nonEmptyStringsSchema, imageSchema, siteWork } from './model.ts';

describe('shared work model', () => {
  test('validates reusable strings, command lists and image references', () => {
    expect(nonEmptyStringSchema.parse('  npm run build  ')).toBe('npm run build');
    expect(() => nonEmptyStringSchema.parse('  ')).toThrow();
    expect(() => nonEmptyStringsSchema.parse([])).toThrow();
    expect(() => nonEmptyStringsSchema.parse(['true', ' '])).toThrow();
    expect(imageSchema.parse('node:26')).toBe('node:26');
    expect(() => imageSchema.parse('node:26; echo unsafe')).toThrow();
  });
  test('requires build artifacts before running site build consumers', () => {
    expect(siteWork.build!.artifacts).toContain('dist');
    for (const work of Object.values(siteWork).filter((work) => work.browsers.length > 0))
      expect(work.needs).toContain('build');
  });
  test('rejects missing dependencies and cycles', () => {
    expect(() => defineWork({ a: { name: 'A', commands: ['true'], needs: ['missing'] } })).toThrow(
      'Unknown dependency',
    );
    expect(() =>
      defineWork({
        a: { name: 'A', commands: ['true'], needs: ['b'] },
        b: { name: 'B', commands: ['true'], needs: ['a'] },
      }),
    ).toThrow('cycle');
  });
});
