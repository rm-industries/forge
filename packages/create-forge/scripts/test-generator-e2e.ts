import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { templateTokenPrefix } from '../src/template-tokens.ts';

type PackResult = { filename: string };
type PackageMetadata = { name?: string };

const execute = promisify(execFile);
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = await mkdtemp(join(tmpdir(), 'create-forge-e2e-'));

const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const runGenerator = async (executable: string, cwd: string, args: string[]) => {
  return execute(executable, args, { cwd, maxBuffer: 10 * 1024 * 1024 });
};

const assertGeneratedProject = async (directory: string, packageName: string) => {
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as PackageMetadata;
  const lockfile = await readFile(join(directory, 'package-lock.json'), 'utf8');
  const siteConfig = await readFile(join(directory, 'src', 'config', 'site.ts'), 'utf8');
  if (metadata.name !== packageName) {
    throw new Error(`Expected ${directory} to use package name ${packageName}.`);
  }
  if (`${lockfile}\n${siteConfig}`.includes(templateTokenPrefix)) {
    throw new Error(`Generated fixture ${directory} contains an unresolved template token.`);
  }
};

try {
  const tarballDirectory = join(fixtureDirectory, 'tarball');
  const runnerDirectory = join(fixtureDirectory, 'runner');
  const projectsDirectory = join(fixtureDirectory, 'projects');
  await mkdir(tarballDirectory);
  await mkdir(runnerDirectory);
  await mkdir(projectsDirectory);
  await writeFile(
    join(runnerDirectory, 'package.json'),
    `${JSON.stringify({ name: 'create-forge-e2e-runner', private: true }, undefined, 2)}\n`,
  );

  const { stdout: packOutput } = await execute(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', tarballDirectory],
    { cwd: packageDirectory },
  );
  const [packResult] = JSON.parse(packOutput) as PackResult[];
  if (!packResult) throw new Error('npm pack did not report a tarball.');
  const tarball = join(tarballDirectory, packResult.filename);
  await execute('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: runnerDirectory,
  });
  const executable = join(runnerDirectory, 'node_modules', '.bin', 'create-forge');

  const defaultDirectory = join(projectsDirectory, 'default-site');
  const { stdout: defaultOutput } = await runGenerator(executable, projectsDirectory, ['default-site', '--yes']);
  if (!defaultOutput.includes('Dependencies: installed') || !defaultOutput.includes('Git repository: initialized')) {
    throw new Error('Default fixture did not report completed installation and Git setup.');
  }
  await assertGeneratedProject(defaultDirectory, 'default-site');
  await access(join(defaultDirectory, 'node_modules'));
  await access(join(defaultDirectory, '.git', 'HEAD'));
  await execute('npm', ['run', 'typecheck'], { cwd: defaultDirectory });
  await execute('npm', ['run', 'build'], { cwd: defaultDirectory });

  const explicitDirectory = join(projectsDirectory, 'explicit-site');
  await runGenerator(executable, projectsDirectory, [
    'explicit-site',
    '--name',
    'explicit-package',
    '--site-name',
    'Explicit Site',
    '--description',
    'A fully specified fixture',
    '--author',
    'Forge Maintainers',
    '--url',
    'https://explicit.example.com',
    '--repository',
    'rm-industries/explicit-site',
    '--no-install',
    '--no-git',
  ]);
  await assertGeneratedProject(explicitDirectory, 'explicit-package');
  const explicitConfig = await readFile(join(explicitDirectory, 'src', 'config', 'site.ts'), 'utf8');
  for (const value of [
    'Explicit Site',
    'A fully specified fixture',
    'Forge Maintainers',
    'https://explicit.example.com',
    'rm-industries/explicit-site',
  ]) {
    if (!explicitConfig.includes(value)) throw new Error(`Explicit fixture is missing ${JSON.stringify(value)}.`);
  }

  const scopedDirectory = join(projectsDirectory, 'scoped-site');
  await runGenerator(executable, projectsDirectory, [
    'scoped-site',
    '--yes',
    '--name',
    '@example/scoped-site',
    '--no-install',
    '--no-git',
  ]);
  await assertGeneratedProject(scopedDirectory, '@example/scoped-site');

  const noInstallDirectory = join(projectsDirectory, 'no-install-site');
  const { stdout: noInstallOutput } = await runGenerator(executable, projectsDirectory, [
    'no-install-site',
    '--yes',
    '--no-install',
    '--no-git',
  ]);
  await assertGeneratedProject(noInstallDirectory, 'no-install-site');
  if (
    (await exists(join(noInstallDirectory, 'node_modules'))) ||
    (await exists(join(noInstallDirectory, '.git'))) ||
    !noInstallOutput.includes('npm install')
  ) {
    throw new Error('No-install fixture did not preserve its requested setup state or next steps.');
  }

  const conflictDirectory = join(projectsDirectory, 'conflict-site');
  await mkdir(conflictDirectory);
  await writeFile(join(conflictDirectory, 'existing.txt'), 'preserve me\n');
  let conflictExitCode: number | undefined;
  let conflictOutput = '';
  try {
    await runGenerator(executable, projectsDirectory, ['conflict-site', '--yes', '--no-install', '--no-git']);
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { code?: number; stdout?: string };
    conflictExitCode = typeof failure.code === 'number' ? failure.code : undefined;
    conflictOutput = failure.stdout ?? '';
  }
  const conflictEntries = await readdir(conflictDirectory);
  const existingContent = await readFile(join(conflictDirectory, 'existing.txt'), 'utf8');
  if (
    conflictExitCode !== 1 ||
    !conflictOutput.includes('is not empty. No files were changed.') ||
    conflictEntries.join('\n') !== 'existing.txt' ||
    existingContent !== 'preserve me\n'
  ) {
    throw new Error('Conflict fixture did not fail safely with its existing filesystem state intact.');
  }

  console.log(`Verified ${packResult.filename} across 5 isolated end-to-end generator fixtures.`);
} finally {
  await rm(fixtureDirectory, { recursive: true, force: true });
}
