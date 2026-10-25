// cspell:ignore ERESOLVE
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveFixture } from './peer-registry.mjs';

const resolveFormatter = (options) => resolveFixture({ formatter: true, optional: true, ...options });

test('an exact formatter peer selects its engine inside the consumer range', async () => {
  const result = await resolveFormatter({ host: '>=0.74.0 <1.0.0', peer: '0.74.0' });
  assert.equal(result.code, 0, result.error);
  assert.equal(result.versions['node_modules/fixture-oxfmt'], '0.74.0');
  assert.equal(result.versions['node_modules/fixture-browser-oxfmt'], '0.1.2');
});

test('an absent optional CLI is not installed', async () => {
  const result = await resolveFormatter({ peer: '0.74.0' });
  assert.equal(result.code, 0, result.error);
  assert.equal(result.versions['node_modules/fixture-oxfmt'], undefined);
});

test('an explicitly incompatible CLI fails instead of bypassing the optional peer', async () => {
  const result = await resolveFormatter({ host: '0.75.0', peer: '0.74.0' });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /ERESOLVE/);
});

test('a later allowed browser patch selects its own exact engine, excluding browser 0.2', async () => {
  const result = await resolveFormatter({ host: '>=0.74.0 <1.0.0', peer: '0.74.0', multiple: true });
  assert.equal(result.code, 0, result.error);
  assert.equal(result.versions['node_modules/fixture-browser-oxfmt'], '0.1.3');
  assert.equal(result.versions['node_modules/fixture-oxfmt'], '0.76.0');
});

test('npm does not promise backtracking to an older compatible browser patch', async () => {
  const result = await resolveFormatter({ host: '>=0.74.0 <0.76.0', peer: '0.74.0', multiple: true });
  assert.notEqual(result.code, 0);
  assert.match(result.error, /ERESOLVE/);
  assert.match(result.error, /fixture-browser-oxfmt@0\.1\.3/);
});

for (const [generatorVersion, contractCode] of [
  ['1.0.0', 1],
  ['1.0.1', 0],
]) {
  test(`packed formatter fixture ${generatorVersion} detects or corrects upstream behavior loss`, async () => {
    const result = await resolveFormatter({ host: '>=0.74.0 <1.0.0', peer: '0.74.0', generatorVersion });
    assert.equal(result.code, 0, result.error);
    assert.equal(result.contractCode, contractCode);
    assert.equal(
      result.versions['node_modules/fixture-browser-oxfmt'],
      generatorVersion === '1.0.0' ? '0.1.3' : '0.1.2',
    );
  });
}
