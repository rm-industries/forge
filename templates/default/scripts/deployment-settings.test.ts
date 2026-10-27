import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const resolve = (site: string) =>
  spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
  const { getViteConfig } = await import('astro/config');
  const { define } = await getViteConfig({})({ command: 'serve', mode: 'production' });
  console.log(JSON.stringify({ site: JSON.parse(define['import.meta.env.SITE']), base: JSON.parse(define['import.meta.env.BASE_URL']) }));
`,
    ],
    {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, NODE_ENV: 'production', PUBLIC_SITE_URL: site },
      encoding: 'utf8',
    },
  );

describe('Astro public deployment settings', () => {
  it('rejects malformed settings without reflecting their sensitive input', () => {
    const result = resolve('https://private-password@');
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain('private-password');
  });

  it('resolves the selected public override with its normalized mount', () => {
    const result = resolve('https://deployment.example/articles');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim().split('\n').at(-1) ?? 'null')).toEqual({
      site: 'https://deployment.example/articles/',
      base: '/articles/',
    });
  });

  it.each([
    'file:///private/site',
    'https://user:password@example.com/',
    'https://example.com/?secret=x',
    'https://example.com/#fragment',
  ])('rejects unsuitable public URL %s at the Astro boundary', (site) => {
    const result = resolve(site);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'The public site URL must use HTTP or HTTPS without credentials, a query, or a fragment.',
    );
  });
});
