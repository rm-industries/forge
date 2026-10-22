import { describe, expect, it } from 'vitest';

import { getLighthouseUrls } from './run-lighthouse';

describe('getLighthouseUrls', () => {
  it('audits the homepage and public navigation from the preview origin', () => {
    const urls = getLighthouseUrls('https://example.com');
    expect(urls).toContain('http://127.0.0.1:4321/');
    for (const url of urls) expect(new URL(url).origin).toBe('http://127.0.0.1:4321');
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('audits project deployments below their configured base path', () => {
    const urls = getLighthouseUrls('https://example.github.io/example-project');
    expect(urls).toContain('http://127.0.0.1:4321/example-project/');
    for (const url of urls) expect(url).toMatch(/^http:\/\/127\.0\.0\.1:4321\/example-project\//u);
  });
});
