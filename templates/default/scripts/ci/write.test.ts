import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { configSchema } from './config.ts';
import { createGithubWorkflows } from './github.ts';
import { writeCi } from './write.ts';

const source = fileURLToPath(new URL('./', import.meta.url));
test('preserves Dependabot action pins, checks drift, and rejects conflicting updates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-ci-test-'));
  try {
    await cp(source, join(root, 'scripts/ci'), { recursive: true });
    const defaults: Record<string, { ref: string }> = {};
    createGithubWorkflows(
      configSchema.parse(JSON.parse(await readFile(join(root, 'scripts/ci/config.json'), 'utf8'))),
      (action) => (defaults[action] = { ref: `${action}@${'a'.repeat(40)}` }),
    );
    await writeFile(join(root, 'scripts/ci/actions.json'), JSON.stringify(defaults));
    // Consumer configuration may be nested or use a different provider. Isolate the fixture.
    await writeFile(
      join(root, 'scripts/ci/config.json'),
      JSON.stringify({
        directory: '.',
        repositoryRoot: '.',
        providers: ['github'],
        primary: 'github',
        securityMinute: 17,
        automationMinute: 43,
      }),
    );
    const files = await writeCi(root);
    const path = join(root, '.github/workflows/project.yml');
    const initial = await readFile(path, 'utf8');
    await rm(join(root, 'scripts/ci/actions.json'));
    const ref = defaults['actions/setup-node']!.ref;
    const updatedRef = `actions/setup-node@${'b'.repeat(40)}`;
    await writeFile(path, initial.replaceAll(ref, updatedRef));
    await writeCi(root);
    expect(await readFile(path, 'utf8')).toContain(updatedRef);
    await expect(writeCi(root, undefined, true)).resolves.toBeDefined();
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace('name: Project Continuous Integration', 'name: Custom'),
    );
    await expect(writeCi(root, undefined, true)).rejects.toThrow('stale');
    await writeFile(path, files['.github/workflows/project.yml']!.replace(ref, updatedRef));
    await expect(writeCi(root)).rejects.toThrow('Conflicting pins');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
