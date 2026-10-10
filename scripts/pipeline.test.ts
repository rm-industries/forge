import { spawnSync } from 'node:child_process';

import { expect, test } from 'vitest';

test('npm exposes the local Zuke graph without running its tasks', () => {
  const result = spawnSync('npm', ['run', 'pipeline', '--', 'quality', '--dry-run'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  for (const name of ['format', 'lint', 'typecheck', 'test', 'build', 'pack', 'quality']) {
    expect(result.stdout).toContain(name);
  }
});

test('a local pipeline failure reaches npm as a nonzero exit code', () => {
  const result = spawnSync('npm', ['run', 'pipeline', '--', 'missing-target'], { encoding: 'utf8' });
  expect(result.status).not.toBeNull();
  expect(result.status).not.toBe(0);
});
