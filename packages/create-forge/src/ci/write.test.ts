import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { format } from 'oxfmt';
import { expect, test } from 'vitest';

import { generationOptionsSchema } from './generation-options.ts';
import { writeCi } from './write.ts';

const config = generationOptionsSchema.parse({
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
    for (const [path, content] of Object.entries(files)) {
      expect(content).toContain('You own this');
      const formatted = await format(path, content, { singleQuote: true, printWidth: 120 });
      expect(formatted.errors).toEqual([]);
      expect(content).toBe(formatted.code);
    }
    expect(await readFile(join(root, '.github/workflows/site-project.yml'), 'utf8')).toContain('# v1');
    expect(await readFile(join(root, '.gitlab/ci/site.yml'), 'utf8')).toContain("cd 'site'");
    await expect(writeCi(config, root, (action) => ({ ref: `${action}@main` }))).rejects.toThrow(
      'Invalid string: must match pattern',
    );
    const gitlab = await writeCi({ ...config, providers: ['gitlab'], primary: 'gitlab' }, root, () => {
      throw new Error('GitLab does not need action pins');
    });
    expect(Object.keys(gitlab)).toEqual(['.gitlab/ci/site.yml']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
