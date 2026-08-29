import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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
  await execute(executable, ['generated-site', '--yes', '--no-install', '--no-git'], {
    cwd: invocationDirectory,
  });

  if (!help.includes('Usage: create-forge [options] [destination]')) {
    throw new Error('Installed executable did not return the expected help output.');
  }
  if (version.trim() !== metadata.version) {
    throw new Error(`Installed executable reported ${version.trim()} instead of ${metadata.version}.`);
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
