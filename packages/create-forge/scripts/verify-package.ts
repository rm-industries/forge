import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { templateTokenPrefix } from '../src/template-tokens.ts';

type PackResult = {
  filename: string;
};

const execute = promisify(execFile);
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) as {
  version: string;
};
const fixtureDirectory = await mkdtemp(join(tmpdir(), 'create-forge-package-'));

try {
  const packageDirectoryOutput = join(fixtureDirectory, 'packages');
  await mkdir(packageDirectoryOutput);
  const { stdout: packOutput } = await execute(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', packageDirectoryOutput],
    { cwd: packageDirectory },
  );
  const [packResult] = JSON.parse(packOutput) as PackResult[];
  if (!packResult) throw new Error('npm pack did not report a tarball.');

  const tarball = join(packageDirectoryOutput, packResult.filename);
  const invocationDirectory = join(fixtureDirectory, 'invocation');
  await mkdir(invocationDirectory);
  await writeFile(
    join(fixtureDirectory, 'package.json'),
    `${JSON.stringify({ name: 'create-forge-invocation', private: true }, undefined, 2)}\n`,
  );
  await execute('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: fixtureDirectory,
  });

  const executable = join(fixtureDirectory, 'node_modules', '.bin', 'create-forge');
  const { stdout: help } = await execute(executable, ['--help'], { cwd: invocationDirectory });
  const { stdout: version } = await execute(executable, ['--version'], { cwd: invocationDirectory });
  await execute(executable, ['generated-site', '--yes', '--no-install', '--git'], {
    cwd: invocationDirectory,
  });

  if (!help.includes('Usage: create-forge [options] [destination]')) {
    throw new Error('Installed executable did not return the expected help output.');
  }
  if (version.trim() !== metadata.version) {
    throw new Error(`Installed executable reported ${version.trim()} instead of ${metadata.version}.`);
  }

  const generatedDirectory = join(invocationDirectory, 'generated-site');
  const generatedMetadata = JSON.parse(await readFile(join(generatedDirectory, 'package.json'), 'utf8')) as {
    name?: string;
  };
  const generatedSiteConfig = await readFile(join(generatedDirectory, 'src', 'config', 'site.ts'), 'utf8');
  if (generatedMetadata.name !== 'generated-site' || generatedSiteConfig.includes(templateTokenPrefix)) {
    throw new Error('Installed executable did not produce normalized, fully resolved project metadata.');
  }
  await access(join(generatedDirectory, '.editorconfig'));
  await access(join(generatedDirectory, '.git', 'HEAD'));
  try {
    await access(join(generatedDirectory, '.git', 'index'));
    throw new Error('Installed executable unexpectedly staged or committed generated files.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  await access(
    join(fixtureDirectory, 'node_modules', '@rm-industries', 'create-forge', 'dist', 'template', '.editorconfig'),
  );
  await access(
    join(fixtureDirectory, 'node_modules', '@rm-industries', 'create-forge', 'dist', 'template', 'package-lock.json'),
  );

  console.log(`Verified ${packResult.filename} in an isolated invocation fixture.`);
} finally {
  await rm(fixtureDirectory, { recursive: true, force: true });
}
