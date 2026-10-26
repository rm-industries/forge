import { readFile } from 'node:fs/promises';

import { expect, test } from 'vitest';

import { collections } from './content.config.ts';

test('registers the documentation collection', () => {
  expect(Object.keys(collections)).toEqual(['documentation']);
});

test('declares Node 26 website tooling without CMS application dependencies', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));

  expect(manifest.engines.node).toBe('^26.0.0');
  expect(lock.packages[''].engines.node).toBe('^26.0.0');
  expect(Object.keys(manifest.dependencies)).not.toContain('@sveltia/cms');
  expect(Object.keys(manifest.dependencies)).not.toContain('@rm-industries/content-model');
});
