import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, test } from 'vitest';

import { runCli } from './cli';

const fixtures: string[] = [];
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })));
});

test('resolves a CI-safe invocation against a temporary destination', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'create-forge-cli-'));
  fixtures.push(fixture);
  const destination = join(fixture, 'generated-site');
  const result = await runCli([destination, '--yes', '--no-install', '--no-git'], '0.3.0-alpha.0', {
    interactive: false,
  });
  expect(result).toMatchObject({
    exitCode: 0,
    options: { destination, packageName: 'generated-site', install: false, git: false },
  });
});
