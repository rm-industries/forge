import assert from 'node:assert/strict';
import test from 'node:test';

import { getArticleNeighbors, getArticles } from './articles.ts';

test('excludes drafts and sorts published articles newest first', () => {
  const articles = getArticles();

  assert.equal(
    articles.some(({ draft }) => draft),
    false,
  );
  assert.deepEqual(
    articles.map(({ slug }) => slug),
    ['designing-a-calm-starting-point', 'content-that-travels-well', 'accessible-by-default'],
  );
});

test('can include drafts for local previews', () => {
  assert.equal(
    getArticles({ includeDrafts: true }).some(({ slug }) => slug === 'future-draft'),
    true,
  );
});

test('derives previous and next entries from the visible collection', () => {
  const articles = getArticles();
  const neighbors = getArticleNeighbors('content-that-travels-well', articles);

  assert.equal(neighbors.previous?.slug, 'accessible-by-default');
  assert.equal(neighbors.next?.slug, 'designing-a-calm-starting-point');
});
