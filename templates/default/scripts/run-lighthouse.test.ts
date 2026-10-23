import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getLighthouseUrls } from './run-lighthouse';

describe('getLighthouseUrls', () => {
  let output: string;
  beforeEach(() => {
    output = mkdtempSync(join(tmpdir(), 'lighthouse-routes-'));
    for (const route of [
      'index.html',
      'about/index.html',
      'orphan/ignored/index.html',
      'stories/index.html',
      'stories/renamed-detail/index.html',
      'stories/second-detail/index.html',
      'admin/index.html',
      '404.html',
    ]) {
      const file = join(output, route);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, '<!doctype html><title>Page</title>');
    }
  });
  afterEach(() => rmSync(output, { recursive: true, force: true }));

  it('keeps a renamed content-detail route in budgets without auditing every article', () => {
    const urls = getLighthouseUrls('https://example.github.io/example-project', undefined, output);
    expect(urls).toContain('http://127.0.0.1:4321/example-project/stories/renamed-detail/');
    expect(urls).not.toContain('http://127.0.0.1:4321/example-project/stories/second-detail/');
    expect(urls.some((url) => url.includes('/admin/') || url.includes('/404'))).toBe(false);
  });
  it('audits only homepage, discovered listing and one detail without expanding to navigation', () => {
    const urls = getLighthouseUrls('https://example.com', undefined, output);
    expect(urls).toEqual([
      'http://127.0.0.1:4321/',
      'http://127.0.0.1:4321/stories/',
      'http://127.0.0.1:4321/stories/renamed-detail/',
    ]);
    for (const url of urls) expect(new URL(url).origin).toBe('http://127.0.0.1:4321');
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('does not invent a listing when the site has no built listing/detail pair', () => {
    rmSync(join(output, 'stories'), { recursive: true });
    expect(getLighthouseUrls('https://example.com', undefined, output)).toEqual(['http://127.0.0.1:4321/']);
  });

  it('audits project deployments below their configured base path', () => {
    const urls = getLighthouseUrls('https://example.github.io/example-project', undefined, output);
    expect(urls).toContain('http://127.0.0.1:4321/example-project/');
    for (const url of urls) expect(url).toMatch(/^http:\/\/127\.0\.0\.1:4321\/example-project\//u);
  });
});
