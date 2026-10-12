import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { test } from 'vitest';

import { generationOptionsSchema } from './generation-options.ts';
import { createGithubWorkflows } from './github.ts';
import { createCiPinResolver } from './pins.ts';

const missingActionPinMessagePattern = /Missing action pin/;
const conflictingPinsMessagePattern = /Conflicting pins/;
const immutableCommitSuffixPattern = /@[a-f0-9]{40}$/;

const sha = 'a'.repeat(40);
const workflow = (pin = sha, version = 'v7') =>
  `jobs:\n  test:\n    steps:\n      - uses: actions/checkout@${pin} # ${version}\n      - uses: ./.github/actions/setup-project\n`;

test('resolve current YAML pins and preserve Dependabot SHA and version updates', () => {
  const resolve = createCiPinResolver({ 'ci.yml': workflow(), 'other.yml': workflow() });
  assert.deepEqual(resolve('actions/checkout'), { ref: `actions/checkout@${sha}`, version: 'v7' });
  assert.throws(() => resolve('actions/setup-node'), missingActionPinMessagePattern);
  const updated = createCiPinResolver({ 'ci.yml': workflow('b'.repeat(40), 'v8') });
  assert.deepEqual(updated('actions/checkout'), { ref: `actions/checkout@${'b'.repeat(40)}`, version: 'v8' });
});

test('self-repository references need no external action pin', () => {
  const resolve = createCiPinResolver({
    'ci.yml': `${workflow()}      - uses: $/.github/actions/setup-project\n`,
  });
  assert.deepEqual(resolve('actions/checkout'), { ref: `actions/checkout@${sha}`, version: 'v7' });
  assert.throws(() => resolve('$/.github/actions/setup-project'), missingActionPinMessagePattern);
});

test('reject conflicting pins, mutable references, malformed YAML and duplicate keys', () => {
  assert.throws(
    () => createCiPinResolver({ a: workflow(), b: workflow('b'.repeat(40)) }),
    conflictingPinsMessagePattern,
  );
  assert.throws(() => createCiPinResolver({ a: workflow(), b: workflow(sha, 'v8') }), conflictingPinsMessagePattern);
  for (const content of [workflow('v7'), 'jobs: [', 'jobs: {}\njobs: {}', 'uses: 42', `${workflow()}\n---\nuses: x`]) {
    assert.throws(() => createCiPinResolver({ 'ci.yml': content }));
  }
});

test('every generated action has a tested immutable pin in maintained Forge YAML', () => {
  const maintained: Record<string, string> = {};
  for (const path of ['project', 'generator', 'security', 'automation', 'website'])
    maintained[path] = readFileSync(new URL(`../../../../.github/workflows/${path}.yml`, import.meta.url), 'utf8');
  maintained.setup = readFileSync(
    new URL('../../../../.github/actions/setup-project/action.yml', import.meta.url),
    'utf8',
  );
  const resolve = createCiPinResolver(maintained);
  const used = new Set<string>();
  createGithubWorkflows(
    generationOptionsSchema.parse({
      directory: '.',
      repositoryRoot: '.',
      providers: ['github'],
      primary: 'github',
      securityMinute: 17,
      automationMinute: 43,
    }),
    (action) => {
      used.add(action);
      const pin = resolve(action);
      assert.match(pin.ref, immutableCommitSuffixPattern);
      assert.ok(pin.version, `Version comment missing for ${action}`);
      return pin;
    },
  );
  assert.ok(used.has('actions/deploy-pages'));
});
