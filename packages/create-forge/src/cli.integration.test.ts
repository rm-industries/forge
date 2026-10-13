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

const invalidDeploymentInputMessagePattern = /deployment|Deployment/;
test('accepts a structured deployment and rejects malformed or unsupported inputs before prompting', async () => {
  const deployment = { name: 'staging', sourceBranch: 'dev', target: 'gitlab-pages' };
  const result = await runCli(
    ['--yes', '--ci-providers', 'gitlab', '--deployment', JSON.stringify(deployment)],
    '1.1.1',
    { interactive: false },
  );
  expect(result.exitCode).toBe(0);
  expect(result.options?.deployments).toEqual([deployment]);
  for (const input of ['not-json', '{}', JSON.stringify({ ...deployment, target: 'cloudflare-pages' })]) {
    const invalid = await runCli(['--deployment', input], '1.1.1', { interactive: false });
    expect(invalid.exitCode).toBe(1);
    expect(invalid.output).toMatch(invalidDeploymentInputMessagePattern);
  }
  const repeated = await runCli(
    [
      '--yes',
      '--deployment',
      JSON.stringify({ ...deployment, target: 'github-pages' }),
      '--deployment',
      JSON.stringify({ ...deployment, target: 'github-pages' }),
    ],
    '1.1.1',
    { interactive: false },
  );
  expect(repeated.exitCode).toBe(1);
  expect(repeated.output).toMatch(invalidDeploymentInputMessagePattern);
});
