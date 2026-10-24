import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

// Bypass Astro's Vite alias for component runtime imports.
const { dev } = createRequire(import.meta.url)('astro') as typeof import('astro');

// This catches a working production copy paired with a broken Vite development bridge.
test('serves the project policy and packaged worker graph during development', async () => {
  const server = await dev({
    root: fileURLToPath(new URL('../', import.meta.url)),
    base: '/project',
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  });
  try {
    const root = `http://127.0.0.1:${server.address.port}/project/admin/formatter/`;
    const policy = await fetch(`${root}policy.json`);
    expect(policy.status).toBe(200);
    expect(policy.headers.get('content-type')).toContain('application/json');
    expect(await policy.json()).toMatchObject({
      upstreamVersion: '0.74.0',
      options: { printWidth: 120, tabWidth: 2, singleQuote: true, endOfLine: 'lf' },
    });
    for (const name of ['index.js', 'worker.js', 'generated/engine.js']) {
      const response = await fetch(root + name);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('javascript');
    }
    const wasm = await fetch(`${root}generated/engine_bg.wasm`);
    expect(wasm.status).toBe(200);
    expect(wasm.headers.get('content-type')).toBe('application/wasm');
    expect((await fetch(`${root}missing.js`)).status).toBe(404);
    expect((await fetch(`${root}${encodeURIComponent('../package.json')}`)).status).toBe(404);
  } finally {
    await server.stop();
  }
}, 30_000);
