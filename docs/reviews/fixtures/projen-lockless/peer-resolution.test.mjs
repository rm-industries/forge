import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveFixture } from './peer-registry.mjs';

test('overlapping root and peer ranges select the older compatible host', async (t) => {
  const result = await resolveFixture({ host: '^1.0.0', peer: '>=1.0.0 <1.5.0' });
  assert.equal(result.code, 0, result.error);
  assert.equal(result.versions['node_modules/fixture-host'], '1.0.0');
  t.diagnostic(JSON.stringify(result));
});

test('disjoint root and peer ranges fail with ERESOLVE', async () => {
  const result = await resolveFixture({ host: '^1.5.0', peer: '>=1.0.0 <1.5.0' });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /ERESOLVE/);
});

test('an absent optional peer is not automatically installed', async () => {
  const result = await resolveFixture({ peer: '^1.0.0', optional: true });
  assert.equal(result.code, 0, result.error);
  assert.equal(result.versions['node_modules/fixture-host'], undefined);
  assert.equal(result.versions['node_modules/fixture-model'], '1.0.0');
});

test('an explicitly installed optional peer still constrains the host', async () => {
  const result = await resolveFixture({ host: '^1.0.0', peer: '>=1.0.0 <1.5.0', optional: true });
  assert.equal(result.code, 0, result.error);
  assert.equal(result.versions['node_modules/fixture-host'], '1.0.0');
});

test('an incompatible explicitly installed optional peer fails', async () => {
  const result = await resolveFixture({ host: '^1.5.0', peer: '>=1.0.0 <1.5.0', optional: true });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /ERESOLVE/);
});

test('newer model with an incompatible peer does not guarantee backtracking to an older model', async (t) => {
  const result = await resolveFixture({ host: '^1.0.0', peer: '^1.0.0', optional: true, multiple: true });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /ERESOLVE/);
  assert.match(result.error, /fixture-model@1\.1\.0/);
  t.diagnostic(
    'Model 1.0.0 with host 1.5.0 would satisfy the manifest, but npm selected model 1.1.0 and rejected its peer.',
  );
});
