import { describe, expect, test, vi } from 'vitest';

import type { GeneratorOptions } from './options';
import { executeCommand, ProcessStepError, runProjectSetup, type CommandExecutor } from './process';

const options: GeneratorOptions = {
  destination: 'generated-site',
  packageName: 'generated-site',
  siteName: 'Generated Site',
  description: 'A generated site',
  author: '',
  url: 'https://example.com',
  repository: '',
  install: true,
  git: true,
};

describe('project setup steps', () => {
  test('runs npm installation and Git initialization in order', async () => {
    const execute = vi.fn<CommandExecutor>(async () => undefined);
    await runProjectSetup(options, { destination: '/temporary/project', execute });

    expect(execute.mock.calls.map(([command]) => [command.executable, command.arguments])).toEqual([
      ['npm', ['install']],
      ['git', ['init', '--initial-branch=main']],
    ]);
  });

  test('does not run installation or Git when both are disabled', async () => {
    const execute = vi.fn<CommandExecutor>(async () => undefined);
    await runProjectSetup({ ...options, install: false, git: false }, { destination: '/temporary/project', execute });
    expect(execute).not.toHaveBeenCalled();
  });

  test('does not run Git after installation fails', async () => {
    const failure = new ProcessStepError('npm failed with exit code 2.', 2);
    const execute = vi.fn<CommandExecutor>(async () => {
      throw failure;
    });

    await expect(runProjectSetup(options, { destination: '/temporary/project', execute })).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test('passes the abort signal to every command', async () => {
    const controller = new AbortController();
    const execute = vi.fn<CommandExecutor>(async ({ signal }) => {
      expect(signal).toBe(controller.signal);
    });
    await runProjectSetup(options, { destination: '/temporary/project', signal: controller.signal, execute });
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
