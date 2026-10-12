import { expect, test, describe } from 'vitest';

import { defineWork } from './model.ts';

describe('shared work model', () => {
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
