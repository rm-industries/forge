import assert from 'node:assert/strict';
import test from 'node:test';

import { isCurrentPath, isExternalHref } from './navigation.ts';

test('matches exact and nested navigation paths at segment boundaries', () => {
  assert.equal(isCurrentPath('/articles/', '/articles'), true);
  assert.equal(isCurrentPath('/articles/example/', '/articles/'), true);
  assert.equal(isCurrentPath('/articles-summary/', '/articles'), false);
});

test('matches the home route only at the site root', () => {
  assert.equal(isCurrentPath('/', '/'), true);
  assert.equal(isCurrentPath('/articles/', '/'), false);
});

test('does not treat external URLs as current paths', () => {
  assert.equal(isCurrentPath('/', 'https://example.com'), false);
  assert.equal(isExternalHref('https://example.com'), true);
  assert.equal(isExternalHref('/about/'), false);
});
