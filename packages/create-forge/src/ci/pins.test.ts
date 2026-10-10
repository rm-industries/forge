import assert from 'node:assert/strict';
import test from 'node:test';

import { createCiPinResolver } from './pins.ts';

const sha = 'a'.repeat(40);
const workflow = (pin = sha, version = 'v7') =>
  `jobs:\n  test:\n    steps:\n      - uses: actions/checkout@${pin} # ${version}\n      - uses: ./.github/actions/setup-project\n`;

test('resolve current YAML pins and preserve Dependabot SHA and version updates', () => {
  const resolve = createCiPinResolver({ 'ci.yml': workflow(), 'other.yml': workflow() });
  assert.deepEqual(resolve('actions/checkout'), { ref: `actions/checkout@${sha}`, version: 'v7' });
  assert.throws(() => resolve('actions/setup-node'), /Missing action pin/);
  const updated = createCiPinResolver({ 'ci.yml': workflow('b'.repeat(40), 'v8') });
  assert.deepEqual(updated('actions/checkout'), { ref: `actions/checkout@${'b'.repeat(40)}`, version: 'v8' });
});

test('self-repository references need no external action pin', () => {
  const resolve = createCiPinResolver({
    'ci.yml': `${workflow()}      - uses: $/.github/actions/setup-project\n`,
  });
  assert.deepEqual(resolve('actions/checkout'), { ref: `actions/checkout@${sha}`, version: 'v7' });
  assert.throws(() => resolve('$/.github/actions/setup-project'), /Missing action pin/);
});

test('reject conflicting pins, mutable references, malformed YAML and duplicate keys', () => {
  assert.throws(() => createCiPinResolver({ a: workflow(), b: workflow('b'.repeat(40)) }), /Conflicting pins/);
  assert.throws(() => createCiPinResolver({ a: workflow(), b: workflow(sha, 'v8') }), /Conflicting pins/);
  for (const content of [workflow('v7'), 'jobs: [', 'jobs: {}\njobs: {}', 'uses: 42', `${workflow()}\n---\nuses: x`]) {
    assert.throws(() => createCiPinResolver({ 'ci.yml': content }));
  }
});
