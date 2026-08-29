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
  await mkdir(join(fixture, 'dependency'));
  const destination = join(fixture, 'project');
  await writeFile(join(fixture, 'dependency', 'package.json'), '{"name":"fixture-dependency","version":"1.0.0"}\n');
  await writeFile(
    join(destination, 'package.json'),
    '{"name":"process-fixture","private":true,"dependencies":{"fixture-dependency":"file:../dependency"}}\n',
  );

  const options = { install: true, git: true } as GeneratorOptions;
  await runProjectSetup(options, {
    destination,
    environment: { ...process.env, npm_config_dry_run: 'false' },
  });

  await expect(
    access(join(destination, 'node_modules', 'fixture-dependency', 'package.json')),
  ).resolves.toBeUndefined();
  await expect(access(join(destination, '.git', 'HEAD'))).resolves.toBeUndefined();
  await expect(access(join(destination, '.git', 'index'))).rejects.toMatchObject({ code: 'ENOENT' });
});
