import { describe, expect, it } from 'vitest';

import { getLighthouseUrls } from './run-lighthouse';

describe('getLighthouseUrls', () => {
  it('audits root deployments from the preview origin', () => {
    expect(getLighthouseUrls('/')).toEqual([
      'http://127.0.0.1:4321/',
      'http://127.0.0.1:4321/docs/getting-started/',
      'http://127.0.0.1:4321/packages/',
    ]);
  });

  it('audits project deployments below their configured base path', () => {
    expect(getLighthouseUrls('/example-project/')).toEqual([
      'http://127.0.0.1:4321/example-project/',
      'http://127.0.0.1:4321/example-project/docs/getting-started/',
      'http://127.0.0.1:4321/example-project/packages/',
    ]);
  });
});
