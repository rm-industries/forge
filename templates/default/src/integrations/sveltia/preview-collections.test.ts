import assert from 'node:assert/strict';
import test from 'node:test';

import { articleContentModel } from '../../config/content-models/articles.ts';
import { previewCollectionNames } from './preview-collections.ts';

test('registers a preview for every collection that renders rich content', () => {
  assert.deepEqual(previewCollectionNames, [articleContentModel.name]);
});
