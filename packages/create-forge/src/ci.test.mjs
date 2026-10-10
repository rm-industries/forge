import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { defineCiConfig, generateCi, isPrimaryCi } from './ci.mjs';

test('generate either provider or both independently of the primary', () => {
  assert.deepEqual(Object.keys(generateCi()), ['.github/workflows/ci.yml']);
  assert.deepEqual(Object.keys(generateCi({ enabled: ['gitlab'] })), ['.gitlab-ci.yml']);
  const config = { enabled: ['github', 'gitlab'], primary: 'github' };
  const files = generateCi(config);
  assert.equal(Object.keys(files).length, 2);
  assert.deepEqual(files, generateCi({ ...config, primary: 'gitlab' }));
  const scripts = JSON.parse(readFileSync(new URL('../../../templates/default/package.json', import.meta.url))).scripts;
  for (const content of Object.values(files)) {
    for (const script of ['lint:css', 'typecheck', 'test', 'build', 'test:e2e']) {
      assert.ok(scripts[script]);
      assert.ok(content.includes(script === 'test' ? 'npm test' : `npm run ${script}`));
    }
    assert.ok(content.includes('npm ci'));
    assert.ok(content.includes('22.22.2'));
    assert.ok(content.includes('playwright install --with-deps chromium'));
    assert.doesNotMatch(content, /deploy|environment:|pages:/);
  }
});

test('reject invalid selections and require a primary for authoritative automation', () => {
  for (const config of [
    {},
    { enabled: [] },
    { enabled: ['unknown'] },
    { enabled: ['github', 'github'] },
    { enabled: ['github'], primary: 'gitlab' },
    { enabled: ['github'], primary: ['github'] },
  ]) {
    assert.throws(() => generateCi(config), TypeError);
  }
  assert.throws(() => isPrimaryCi({ enabled: ['github'] }, 'github'), TypeError);
  for (const primary of ['github', 'gitlab']) {
    const config = { enabled: ['github', 'gitlab'], primary };
    assert.equal(['github', 'gitlab'].filter((id) => isPrimaryCi(config, id)).length, 1);
  }
  const enabled = ['github'];
  const config = defineCiConfig({ enabled });
  enabled.push('gitlab');
  assert.deepEqual(config.enabled, ['github']);
  assert.ok(Object.isFrozen(config.enabled));
});
