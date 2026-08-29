#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

import { runCli } from './cli';

type PackageMetadata = {
  version: string;
};

const packageJson = new URL('../package.json', import.meta.url);
const metadata = JSON.parse(await readFile(packageJson, 'utf8')) as PackageMetadata;
const result = runCli(process.argv.slice(2), metadata.version);

process.stdout.write(result.output);
process.exitCode = result.exitCode;
