import { expect, test } from 'vitest';

import { normalizePublicSite } from './public-site';

test.each([
  ['https://example.com///', 'https://example.com/'],
  ['http://example.com/project', 'http://example.com/project/'],
  ['https://example.com/%3F%23', 'https://example.com/%3F%23/'],
])('normalizes the public site URL %s', (value, expected) => {
  expect(normalizePublicSite(value).href).toBe(expected);
});

test.each([
  ['example.com', 'must be an absolute URL'],
  ['file:///private/site', 'must use HTTP or HTTPS'],
  ['https://user@example.com/', 'without credentials'],
  ['https://:secret@example.com/', 'without credentials'],
  ['https://example.com/?', 'a query, or a fragment'],
  ['https://example.com/#', 'a query, or a fragment'],
])('rejects unsuitable public site URLs (%s)', (value, expected) => {
  expect(() => normalizePublicSite(value)).toThrow(expected);
});
