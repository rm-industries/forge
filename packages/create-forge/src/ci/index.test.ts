import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parse, stringify } from 'yaml';

import { type CiConfig, defineCiConfig, generateCi, isPrimaryCi } from './index.ts';
import { ciSchemas, validateCiYaml } from './schema.ts';

test('generate either provider or both independently of the primary', () => {
  assert.deepEqual(Object.keys(generateCi()), ['.github/workflows/ci.yml']);
  assert.deepEqual(Object.keys(generateCi({ enabled: ['gitlab'] })), ['.gitlab-ci.yml']);
  const config: CiConfig = { enabled: ['github', 'gitlab'], primary: 'github' };
  const files = generateCi(config);
  assert.equal(Object.keys(files).length, 2);
  assert.deepEqual(files, generateCi({ ...config, primary: 'gitlab' }));
  const scripts = JSON.parse(
    readFileSync(new URL('../../../../templates/default/package.json', import.meta.url), 'utf8'),
  ).scripts;
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

test('validate final YAML and reject syntax errors, duplicate keys, and extra documents', () => {
  for (const provider of ['github', 'gitlab'] as const) {
    const content = Object.values(generateCi({ enabled: [provider] }))[0]!;
    assert.equal(validateCiYaml(ciSchemas[provider], content), content);
    for (const invalid of ['jobs: [', `${content}\nquality: {}\nquality: {}`, `${content}\n---\nextra: true`]) {
      assert.throws(() => validateCiYaml(ciSchemas[provider], invalid));
    }
  }
});

test('reject unknown nested fields and incorrect types without stripping or coercing', () => {
  for (const provider of ['github', 'gitlab'] as const) {
    const content = Object.values(generateCi({ enabled: [provider] }))[0]!;
    for (const mutate of [
      (config: ReturnType<typeof parse>) => {
        config.unrecognized = true;
      },
      (config: ReturnType<typeof parse>) => {
        const job = provider === 'github' ? config.jobs.quality : config.quality;
        job.unrecognized = true;
      },
      (config: ReturnType<typeof parse>) => {
        if (provider === 'github') config.jobs.quality.strategy['fail-fast'] = 'false';
        else config.default.interruptible = 'true';
      },
      (config: ReturnType<typeof parse>) => {
        if (provider === 'github') config.jobs.browser.steps = [];
        else config.browser.script = [];
      },
      (config: ReturnType<typeof parse>) => {
        if (provider === 'github') config.jobs.quality.steps[0].with['persist-credentials'] = true;
        else config.quality.parallel.matrix[0].NODE_VERSION = [26];
      },
    ]) {
      const config = parse(content);
      mutate(config);
      assert.throws(() => validateCiYaml(ciSchemas[provider], stringify(config)));
    }
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
    assert.throws(() => generateCi(config as unknown as CiConfig), TypeError);
  }
  assert.throws(() => isPrimaryCi({ enabled: ['github'] }, 'github'), TypeError);
  for (const primary of ['github', 'gitlab'] as const) {
    const config: CiConfig = { enabled: ['github', 'gitlab'], primary };
    assert.equal((['github', 'gitlab'] as const).filter((id) => isPrimaryCi(config, id)).length, 1);
  }
  const enabled: CiConfig['enabled'][number][] = ['github'];
  const config = defineCiConfig({ enabled });
  enabled.push('gitlab');
  assert.deepEqual(config.enabled, ['github']);
  assert.ok(Object.isFrozen(config.enabled));
});
