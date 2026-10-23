import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

test('reports the pinned bindings version without a Rust installation', () => {
  const manifest = readFileSync(new URL('../native/Cargo.toml', import.meta.url), 'utf8');
  const version = /^wasm-bindgen = "=(\d+\.\d+\.\d+)"$/m.exec(manifest)?.[1];
  expect(version).toBeDefined();
  expect(
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL('../native/build-wasm.ts', import.meta.url)), '--bindings-version'],
      {
        encoding: 'utf8',
        env: { ...process.env, PATH: '' },
      },
    ).trim(),
  ).toBe(version);
});
