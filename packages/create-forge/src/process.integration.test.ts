import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, test } from 'vitest';

import type { GeneratorOptions } from './options';
import { runProjectSetup } from './process';

const fixtures: string[] = [];
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })));
});

test('runs real npm and Git setup in a clean temporary project', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'create-forge-process-'));
  fixtures.push(fixture);
  await mkdir(join(fixture, 'project'));
  const destination = join(fixture, 'project');
  await writeFile(
    join(destination, 'package.json'),
    '{"name":"process-fixture","private":true,"dependencies":{"is-number":"7.0.0"}}\n',
  );

  const options = { install: true, git: true } as GeneratorOptions;
  await runProjectSetup(options, {
    projectRoot: destination,
    repositoryRoot: destination,
    environment: {
      ...process.env,
      npm_config_package_lock: 'false',
      npm_config_package_lock_only: 'true',
      npm_config_dry_run: 'true',
    },
  });

  await expect(access(join(destination, 'node_modules', 'is-number', 'package.json'))).resolves.toBeUndefined();
  await expect(access(join(destination, 'package-lock.json'))).resolves.toBeUndefined();
  await expect(access(join(destination, '.git', 'HEAD'))).resolves.toBeUndefined();
  await expect(access(join(destination, '.git', 'index'))).rejects.toMatchObject({ code: 'ENOENT' });
});
