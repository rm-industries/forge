import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveCiPrefix, validateCiPrefix, workflowPath } from './paths.ts';

test('derive workflow names from the relative project path, with explicit overrides', () => {
  assert.equal(deriveCiPrefix(''), undefined);
  assert.equal(deriveCiPrefix('.'), undefined);
  assert.equal(deriveCiPrefix('website'), 'website');
  assert.equal(deriveCiPrefix('apps/Docs Site'), 'apps-docs-site');
  assert.equal(workflowPath('project'), '.github/workflows/project.yml');
  assert.equal(workflowPath('project', 'docs'), '.github/workflows/docs-project.yml');
  for (const value of ['', '../outside', 'site.yml', 'Uppercase', 'a--b', 'a'.repeat(81)]) {
    assert.throws(() => validateCiPrefix(value));
  }
  assert.throws(() => workflowPath('../outside'));
  assert.throws(() => deriveCiPrefix('サイト'), /--ci-prefix/);
});
