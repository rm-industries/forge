import assert from 'node:assert/strict';
import test from 'node:test';

import { articleContentModel } from '../../config/content-models/articles.ts';
import { sveltiaConfig } from './config.ts';

test('derives the article collection from the shared model', () => {
  assert.deepEqual(
    sveltiaConfig.collections.map(({ name }) => name),
    [articleContentModel.name],
  );
  assert.deepEqual(
    sveltiaConfig.collections[0]?.fields.map(({ name }) => name),
    [...Object.keys(articleContentModel.fields), 'body'],
  );
});

test('keeps authentication credentials outside the configuration', () => {
  assert.equal(sveltiaConfig.backend.name, 'github');
  assert.equal('token' in sveltiaConfig.backend, false);
  assert.equal(JSON.stringify(sveltiaConfig).includes('your-token'), false);
});

test('serializes the generated configuration', () => {
  assert.doesNotThrow(() => JSON.stringify(sveltiaConfig));
});
