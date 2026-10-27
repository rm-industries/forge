import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GeneratorOptions } from './options';

export class ProcessStepError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1, options?: ErrorOptions) {
    super(message, options);
    this.exitCode = exitCode;
  }
}

export type Command = {
  executable: string;
  arguments: readonly string[];
  cwd: string;
  signal?: AbortSignal;
  environment?: NodeJS.ProcessEnv;
};

export type CommandExecutor = (command: Command) => Promise<void>;

const signalExitCode = (signal: NodeJS.Signals | null) => {
  if (signal === 'SIGINT') return 130;
  if (signal === 'SIGTERM') return 143;
  return 1;
};

export const executeCommand: CommandExecutor = ({ executable, arguments: args, cwd, signal, environment }) =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      stdio: 'inherit',
      ...(signal ? { signal } : {}),
      ...(environment ? { env: environment } : {}),
    });

    child.once('error', (error) => {
      const interrupted = signal?.aborted;
      reject(
        new ProcessStepError(
          interrupted
            ? `${executable} was interrupted. The generated project remains at ${cwd}; retry ${executable} ${args[0] ?? ''} there.`
            : `Could not start ${executable}: ${error.message}. The generated project remains at ${cwd}; retry the command there.`,
          interrupted ? 130 : 1,
          { cause: error },
        ),
      );
    });
    child.once('close', (code, processSignal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const detail = processSignal ? `signal ${processSignal}` : `exit code ${code ?? 'unknown'}`;
      reject(
        new ProcessStepError(
          `${executable} failed with ${detail}. The generated project remains at ${cwd}; review the output above and retry the command there.`,
          processSignal ? signalExitCode(processSignal) : (code ?? 1),
        ),
      );
    });
  });

type ProjectSetupContext = {
  projectRoot: string;
  repositoryRoot: string;
  signal?: AbortSignal;
  execute?: CommandExecutor;
  environment?: NodeJS.ProcessEnv;
};

export const runProjectSetup = async (options: GeneratorOptions, context: ProjectSetupContext) => {
  const execute = context.execute ?? executeCommand;
  const command = (executable: string, args: readonly string[]) =>
    execute({
      executable,
      arguments: args,
      cwd: context.projectRoot,
      ...(context.signal ? { signal: context.signal } : {}),
      ...(context.environment ? { environment: context.environment } : {}),
    });

  if (options.install) {
    await command('npm', [
      'install',
      '--package-lock=true',
      '--package-lock-only=false',
      '--dry-run=false',
      '--workspaces=false',
      '--strict-peer-deps',
      '--legacy-peer-deps=false',
      '--force=false',
    ]);
    try {
      const manifest = JSON.parse(await readFile(join(context.projectRoot, 'package.json'), 'utf8'));
      const lock = JSON.parse(await readFile(join(context.projectRoot, 'package-lock.json'), 'utf8'));
      assert.ok(lock.lockfileVersion >= 2);
      assert.equal(lock.name, manifest.name);
      assert.equal(lock.packages?.['']?.version, manifest.version);
      assert.equal(lock.packages?.['']?.name, manifest.name);
      for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        assert.deepEqual(lock.packages[''][section], manifest[section]);
        for (const name of Object.keys(manifest[section] ?? {})) {
          const entry = lock.packages[`node_modules/${name}`];
          assert.ok(
            entry?.version && /^https?:\/\//.test(entry.resolved) && !entry.link,
            `Expected registry package ${name}`,
          );
        }
      }
      for (const [name, entry] of Object.entries(lock.packages) as [string, { link?: boolean; resolved?: string }][]) {
        if (name)
          assert.ok(
            !entry.link && (!entry.resolved || /^https?:\/\//.test(entry.resolved)),
            `Unexpected local package ${name}`,
          );
      }
    } catch (cause) {
      throw new ProcessStepError(
        `Installation did not produce a valid project lockfile. The generated project remains at ${context.projectRoot}; review npm configuration and retry npm install there.`,
        1,
        { cause },
      );
    }
  }
  if (options.git) {
    await execute({
      executable: 'git',
      arguments: ['init', '--initial-branch=main'],
      cwd: context.repositoryRoot,
      ...(context.signal ? { signal: context.signal } : {}),
      ...(context.environment ? { environment: context.environment } : {}),
    });
  }
};
