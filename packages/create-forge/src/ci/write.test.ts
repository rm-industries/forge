import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { configSchema } from './config.ts';
import { writeCi } from './write.ts';

const config = configSchema.parse({
  directory: 'site',
  repositoryRoot: '..',
  prefix: 'site',
  providers: ['github', 'gitlab'],
  primary: 'github',
  securityMinute: 17,
  automationMinute: 43,
});
test('writes validated consumer YAML from ephemeral options and immutable pins', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-ci-write-'));
  try {
    const files = await writeCi(config, root, (action) => ({ ref: `${action}@${'a'.repeat(40)}`, version: 'v1' }));
    expect(Object.keys(files)).toEqual([
      '.github/workflows/site-project.yml',
      '.github/workflows/site-security.yml',
      '.github/workflows/site-automation.yml',
      '.gitlab/ci/site.yml',
    ]);
    expect(await readFile(join(root, '.github/workflows/site-project.yml'), 'utf8')).toContain('# v1');
    expect(await readFile(join(root, '.gitlab/ci/site.yml'), 'utf8')).toContain("cd 'site'");
    await expect(writeCi(config, root, (action) => ({ ref: `${action}@main` }))).rejects.toThrow();
    const gitlab = await writeCi({ ...config, providers: ['gitlab'], primary: 'gitlab' }, root, () => {
      throw new Error('GitLab does not need action pins');
    });
    expect(Object.keys(gitlab)).toEqual(['.gitlab/ci/site.yml']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
