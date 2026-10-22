import { expect, test } from 'vitest';

import { contentModels } from '../../config/content-models/registry.ts';
import { sveltiaConfig } from './config.ts';

test('derives CMS collections and fields from every shared model', () => {
  expect(sveltiaConfig.collections.map(({ name }) => name)).toEqual(contentModels.map(({ name }) => name));
  for (const model of contentModels) {
    expect(sveltiaConfig.collections.find(({ name }) => name === model.name)?.fields.map(({ name }) => name)).toEqual([
      ...Object.keys(model.fields),
      ...(model.body ? [model.body.name ?? 'body'] : []),
    ]);
  }
});

test('keeps authentication credentials outside the configuration', () => {
  expect(sveltiaConfig.backend.name).toBe('github');
  expect('token' in sveltiaConfig.backend).toBe(false);
  expect(JSON.stringify(sveltiaConfig)).not.toContain('your-token');
});

test('serializes the generated configuration', () => {
  expect(() => JSON.stringify(sveltiaConfig)).not.toThrow();
});
