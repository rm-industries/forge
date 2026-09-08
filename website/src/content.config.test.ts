import { expect, test } from 'vitest';

import { collections } from './content.config.ts';

test('registers the documentation collection', () => {
  expect(Object.keys(collections)).toEqual(['documentation']);
});
