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

test('exposes tags as a default-empty list derived from the article model', () => {
  const tags = sveltiaConfig.collections[0]?.fields.find(({ name }) => name === 'tags');

  assert.deepEqual(tags, {
    name: 'tags',
    label: 'Tags',
    after_input: 'Use a few concise topics that help readers understand the article.',
    required: false,
    widget: 'list',
    default: [],
  });
});

test('serializes the generated configuration', () => {
  assert.doesNotThrow(() => JSON.stringify(sveltiaConfig));
});
