import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { it, expect } from 'vitest';

it('prepares an isolated canonical starter through its public command, including hidden files and starter tests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'template-contract-'));
  const destination = join(root, 'starter');
  try {
    execFileSync(process.execPath, ['scripts/test-template.ts', 'prepare', destination], { stdio: 'pipe' });
    expect(await readFile(join(destination, '.gitignore'), 'utf8')).toContain('node_modules');
    expect(() =>
      execFileSync(process.execPath, ['scripts/test-template.ts', 'prepare', destination], { stdio: 'pipe' }),
    ).toThrow('Template destination already exists');
    expect(await readFile(join(destination, 'tests/starter-routes.spec.ts'), 'utf8')).toBeTruthy();
    expect(await readFile(join(destination, 'src/config/site.ts'), 'utf8')).toContain('https://example.com');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
