#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

import { confirm, isCancel } from '@clack/prompts';

import { runCli } from './cli';
import { materializeProject } from './materialize';
import { ProcessStepError, runProjectSetup } from './process';
import { formatCompletion } from './reporter';

type PackageMetadata = {
  version: string;
};

const packageJson = new URL('../package.json', import.meta.url);
const metadata = JSON.parse(await readFile(packageJson, 'utf8')) as PackageMetadata;
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const result = await runCli(process.argv.slice(2), metadata.version, { interactive });

if (result.options) {
  const controller = new AbortController();
  let interruptedExitCode: number | undefined;
  const interrupt = () => {
    interruptedExitCode = 130;
    controller.abort();
  };
  const terminate = () => {
    interruptedExitCode = 143;
    controller.abort();
  };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', terminate);
  try {
    const materialized = await materializeProject(result.options, {
      templateDirectory: new URL('./template/', import.meta.url),
      signal: controller.signal,
      ...(interactive
        ? {
            confirmOverwrite: async (destination: string) => {
              const answer = await confirm({
                message: `${destination} is not empty. Continue and overwrite conflicting template files?`,
                initialValue: false,
              });
              return !isCancel(answer) && answer;
            },
          }
        : {}),
    });
    await runProjectSetup(result.options, {
      destination: materialized.destination,
      signal: controller.signal,
    });
    result.output = formatCompletion(result.options, { destination: materialized.destination });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.output = `error: ${message}\n`;
    result.exitCode = interruptedExitCode ?? (error instanceof ProcessStepError ? error.exitCode : 1);
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);
  }
}

process.stdout.write(result.output);
process.exitCode = result.exitCode;
