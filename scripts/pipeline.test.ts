import { spawnSync } from 'node:child_process';

import { expect, test } from 'vitest';

// A fresh runner downloads and checks Zuke before the command can start.
test('npm exposes the local Zuke graph without running its tasks', { timeout: 60_000 }, () => {
  const result = spawnSync('npm', ['run', 'pipeline', '--', 'quality', '--dry-run'], {
    encoding: 'utf8',
    timeout: 55_000,
  });
  expect({ status: result.status, error: result.status === 0 ? '' : result.stderr }).toEqual({ status: 0, error: '' });
  for (const name of ['format', 'lint', 'typecheck', 'test', 'build', 'pack', 'quality']) {
    expect(result.stdout).toContain(name);
  }
});

test('a local pipeline failure reaches npm as a nonzero exit code', { timeout: 60_000 }, () => {
  const result = spawnSync('npm', ['run', 'pipeline', '--', 'missing-target'], {
    encoding: 'utf8',
    timeout: 55_000,
  });
  expect(result.status).not.toBeNull();
  expect(result.status).not.toBe(0);
});
