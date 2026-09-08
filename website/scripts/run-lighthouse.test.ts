import { describe, expect, it } from 'vitest';

import { getLighthouseUrls } from './run-lighthouse';

describe('getLighthouseUrls', () => {
  it('audits root deployments from the preview origin', () => {
    expect(getLighthouseUrls('https://example.com')).toEqual([
      'http://127.0.0.1:4321/',
      'http://127.0.0.1:4321/get-started/',
      'http://127.0.0.1:4321/features/',
    ]);
  });

  it('audits project deployments below their configured base path', () => {
    expect(getLighthouseUrls('https://example.github.io/example-project')).toEqual([
      'http://127.0.0.1:4321/example-project/',
      'http://127.0.0.1:4321/example-project/get-started/',
      'http://127.0.0.1:4321/example-project/features/',
    ]);
  });
});
