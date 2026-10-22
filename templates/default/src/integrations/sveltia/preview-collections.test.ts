import { expect, test } from 'vitest';

import { contentModels } from '../../config/content-models/registry.ts';
import { previewCollectionNames } from './preview-collections.ts';

test('registers a preview for every collection that renders rich content', () => {
  expect(previewCollectionNames).toEqual(contentModels.filter((model) => model.body).map(({ name }) => name));
});
