import { expect, test, describe } from 'vitest';

import { defineWork, siteWork, workOrder } from './model.ts';

describe('shared work model', () => {
  test('validates dependencies and computes an order with each prerequisite once', () => {
    expect(() => defineWork({ a: { name: 'A', commands: ['true'], needs: ['missing'] } })).toThrow(
      'Unknown dependency',
    );
    expect(() =>
      defineWork({
        a: { name: 'A', commands: ['true'], needs: ['b'] },
        b: { name: 'B', commands: ['true'], needs: ['a'] },
      }),
    ).toThrow('cycle');
    const order = workOrder(siteWork, ['browser-tests', 'lighthouse']);
    expect(order.filter((id) => id === 'build')).toHaveLength(1);
    expect(order.indexOf('unit-tests')).toBeLessThan(order.indexOf('build'));
    expect(() => workOrder(siteWork, ['missing'])).toThrow('Unknown target');
  });
});
