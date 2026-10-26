import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import type { GeneratorOptions } from './options';
import { executeCommand, ProcessStepError, runProjectSetup, type CommandExecutor } from './process';

const options: GeneratorOptions = {
  destination: 'generated-site',
  repositoryRoot: 'generated-site',
  packageName: 'generated-site',
  siteName: 'Generated Site',
  description: 'A generated site',
  author: '',
  url: 'https://example.com',
  repository: '',
  install: true,
  git: true,
};

const fixtures: string[] = [];
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
const project = async () => {
  const path = await mkdtemp(join(tmpdir(), 'forge-setup-'));
  fixtures.push(path);
  await writeFile(join(path, 'package.json'), JSON.stringify({ name: 'fixture' }));
  await writeFile(
    join(path, 'package-lock.json'),
    JSON.stringify({ name: 'fixture', lockfileVersion: 3, packages: { '': { name: 'fixture' } } }),
  );
  return path;
};
describe('project setup steps', () => {
  test('runs npm installation and Git initialization in order', async () => {
    const destination = await project();
    const execute = vi.fn<CommandExecutor>(async () => undefined);
    await runProjectSetup(options, {
      projectRoot: destination,
      repositoryRoot: '/temporary/repository',
      execute,
    });

    expect(execute.mock.calls.map(([command]) => [command.executable, command.arguments, command.cwd])).toEqual([
      [
        'npm',
        [
          'install',
          '--package-lock=true',
          '--package-lock-only=false',
          '--dry-run=false',
          '--workspaces=false',
          '--strict-peer-deps',
          '--legacy-peer-deps=false',
          '--force=false',
        ],
        destination,
      ],
      ['git', ['init', '--initial-branch=main'], '/temporary/repository'],
    ]);
  });

  test('does not run installation or Git when both are disabled', async () => {
    const execute = vi.fn<CommandExecutor>(async () => undefined);
    await runProjectSetup(
      { ...options, install: false, git: false },
      { projectRoot: '/temporary/project', repositoryRoot: '/temporary/project', execute },
    );
    expect(execute).not.toHaveBeenCalled();
  });

  test('does not run Git after installation fails', async () => {
    const failure = new ProcessStepError('npm failed with exit code 2.', 2);
    const execute = vi.fn<CommandExecutor>(async () => {
      throw failure;
    });

    await expect(
      runProjectSetup(options, {
        projectRoot: '/temporary/project',
        repositoryRoot: '/temporary/project',
        execute,
      }),
    ).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test('passes the abort signal to every command', async () => {
    const destination = await project();
    const controller = new AbortController();
    const execute = vi.fn<CommandExecutor>(async ({ signal }) => {
      expect(signal).toBe(controller.signal);
    });
    await runProjectSetup(options, {
      projectRoot: destination,
      repositoryRoot: destination,
      signal: controller.signal,
      execute,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

describe('process execution', () => {
  test('reports the command exit code and preserves the working directory', async () => {
    await expect(
      executeCommand({
        executable: process.execPath,
        arguments: ['--eval', 'process.exit(7)'],
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({ exitCode: 7, message: expect.stringContaining('generated project remains') });
  });

  test('terminates an active command when aborted', async () => {
    const controller = new AbortController();
    const command = executeCommand({
      executable: process.execPath,
      arguments: ['--eval', 'setInterval(() => undefined, 1000)'],
      cwd: process.cwd(),
      signal: controller.signal,
    });
    controller.abort();
    await expect(command).rejects.toMatchObject({ exitCode: 130, message: expect.stringContaining('interrupted') });
  });
});

test.each(['missing', 'identity', 'declarations', 'local'])(
  'rejects an invalid install lock before Git (%s)',
  async (kind) => {
    const destination = await project();
    if (kind === 'missing') await rm(join(destination, 'package-lock.json'));
    else {
      const lock = {
        lockfileVersion: 3,
        name: kind === 'identity' ? 'wrong' : 'fixture',
        packages: {
          '': { name: 'fixture', ...(kind === 'declarations' ? { dependencies: { example: '1.0.0' } } : {}) },
          ...(kind === 'local' ? { 'node_modules/example': { link: true, resolved: '../example' } } : {}),
        },
      };
      await writeFile(join(destination, 'package-lock.json'), JSON.stringify(lock));
    }
    const execute = vi.fn<CommandExecutor>(async () => undefined);
    await expect(
      runProjectSetup(options, { projectRoot: destination, repositoryRoot: destination, execute }),
    ).rejects.toMatchObject({ exitCode: 1, message: expect.stringContaining('retry npm install') });
    expect(execute.mock.calls.map(([command]) => command.executable)).toEqual(['npm']);
  },
);
