import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const identity = JSON.parse(await readFile(new URL('assets/identity.json', root), 'utf8'));
for (const [file, sha] of Object.entries(identity.buildInputs))
  assert.equal(
    createHash('sha256')
      .update(await readFile(new URL(`../../${file}`, root)))
      .digest('hex'),
    sha,
    `Rebuild WASM after changing ${file}`,
  );
for (const [filename, sha] of Object.entries(identity.assets))
  assert.equal(
    createHash('sha256')
      .update(await readFile(new URL(`assets/${filename}`, root)))
      .digest('hex'),
    sha,
    `Rebuild the pinned WASM asset: ${filename}`,
  );
await cp(new URL('assets/', root), new URL('dist/wasm/', root), { recursive: true });

const wasm = new WebAssembly.Module(await readFile(new URL('assets/engine_bg.wasm', root)));
assert.ok(
  !WebAssembly.Module.exports(wasm).some((item) => ['alloc', 'release'].includes(item.name)),
  'Production must use maintained bindings',
);
