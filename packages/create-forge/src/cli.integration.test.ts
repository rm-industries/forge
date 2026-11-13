import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, test } from 'vitest';

import { runCli } from './cli';
import type { PromptAdapter } from './prompts';

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

test('opts in to ordered security.txt contacts and validates fixed expiration and root hosting', async () => {
  const contacts = ['mailto:security@example.test', 'https://example.test/report'];
  const expiration = new Date(Date.now() + 86_400_000).toISOString();
  const flags = [
    '--security-contact',
    contacts[0]!,
    '--security-contact',
    contacts[1]!,
    '--security-expires',
    expiration,
  ];
  const result = await runCli(['--yes', ...flags], '2.0.0', { interactive: false });
  expect(result.options?.security).toEqual({ contacts, expiration: { fixed: expiration } });
  for (const invalid of [
    ['--security-txt'],
    [...flags.slice(0, -1), '2020-02-01T00:00:00Z'],
    [...flags, '--url', 'https://example.test/project/'],
    ['--security-contact', 'http://example.test/report', '--security-expires', expiration],
  ]) {
    const failure = await runCli(['--yes', ...invalid], '2.0.0', { interactive: false });
    expect(failure).toMatchObject({ exitCode: 1, output: expect.stringContaining('security.txt') });
  }
});

test('uses the same security.txt configuration for interactive and non-interactive setup', async () => {
  const contacts = ['mailto:security@example.test', 'https://example.test/report'];
  const expiration = new Date(Date.now() + 86_400_000).toISOString();
  const prompts: PromptAdapter = {
    confirm: async () => true,
    text: async ({ message, validate }) => {
      const value = message.includes('contact URIs') ? contacts.join(' ') : expiration;
      expect(validate?.(value)).toBeUndefined();
      return value;
    },
    isCancel: () => false,
  };
  const args = [
    'site',
    '--name',
    'site',
    '--site-name',
    'Site',
    '--description',
    '',
    '--author',
    '',
    '--url',
    'https://example.test/',
    '--repository',
    '',
    '--no-install',
    '--no-git',
  ];
  const interactive = await runCli(args, '2.0.0', { interactive: true, prompts });
  const scripted = await runCli(
    [
      ...args,
      '--security-txt',
      '--security-contact',
      contacts[0]!,
      '--security-contact',
      contacts[1]!,
      '--security-expires',
      expiration,
    ],
    '2.0.0',
    { interactive: false },
  );
  expect(interactive).toEqual(scripted);
  expect(interactive.options?.security).toEqual({ contacts, expiration: { fixed: expiration } });
});
