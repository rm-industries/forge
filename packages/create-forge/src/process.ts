import { spawn } from 'node:child_process';

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
            ? `${executable} was interrupted. The generated project remains at ${cwd}.`
            : `Could not start ${executable}: ${error.message}. The generated project remains at ${cwd}.`,
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
  destination: string;
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
      cwd: context.destination,
      ...(context.signal ? { signal: context.signal } : {}),
      ...(context.environment ? { environment: context.environment } : {}),
    });

  if (options.install) await command('npm', ['install']);
  if (options.git) await command('git', ['init', '--initial-branch=main']);
};
