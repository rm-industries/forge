#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

import { confirm, isCancel } from '@clack/prompts';

import { runCli } from './cli';
import { materializeProject } from './materialize';

type PackageMetadata = {
  version: string;
};

const packageJson = new URL('../package.json', import.meta.url);
const metadata = JSON.parse(await readFile(packageJson, 'utf8')) as PackageMetadata;
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const result = await runCli(process.argv.slice(2), metadata.version, { interactive });

if (result.options) {
  try {
    await materializeProject(result.options, {
      templateDirectory: new URL('./template/', import.meta.url),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.output = `error: ${message}\n`;
    result.exitCode = 1;
  }
}

process.stdout.write(result.output);
process.exitCode = result.exitCode;
