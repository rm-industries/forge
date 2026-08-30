import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const sourceDirectory = resolve('templates/default');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'forge-static-quality-'));
const fixtureDirectory = join(temporaryDirectory, 'template');
const excludedDirectories = new Set([
  '.astro',
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const run = (command: string, args: string[]) =>
  execute(command, args, { cwd: fixtureDirectory, maxBuffer: 10 * 1024 * 1024 });

const expectFailure = async (name: string, command: string, args: string[]) => {
  try {
    await run(command, args);
  } catch (error) {
    const exitCode = (error as NodeJS.ErrnoException & { code?: number }).code;
    if (typeof exitCode === 'number' && exitCode !== 0) return;
    throw error;
  }
  throw new Error(`${name} accepted its deliberately invalid fixture.`);
};

const withFixture = async (relativePath: string, contents: string, verify: () => Promise<void>) => {
  const path = join(fixtureDirectory, relativePath);
  await writeFile(path, contents);
  try {
    await verify();
  } finally {
    await rm(path, { force: true });
  }
};

try {
  await cp(sourceDirectory, fixtureDirectory, {
    recursive: true,
    filter: (source) => source === sourceDirectory || !excludedDirectories.has(basename(source)),
  });
  await run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  await run('npm', ['run', 'quality:static']);

  await withFixture('src/invalid-format.ts', 'export const invalidFormat={value:"broken"}\n', async () => {
    await expectFailure('Oxfmt', 'npm', ['run', 'format']);
  });
  await withFixture('src/invalid-code.ts', 'export const broken = ;\n', async () => {
    await expectFailure('Oxlint', 'npm', ['run', 'lint:code']);
  });
  await withFixture('src/styles/invalid.css', '.invalid { color: #fffff; }\n', async () => {
    await expectFailure('Stylelint', 'npm', ['run', 'lint:css']);
  });
  await withFixture('INVALID.md', '#Missing heading space\n', async () => {
    await expectFailure('Markdownlint', 'npm', ['run', 'lint:markdown']);
  });
  const misspelling = ['q', 'q', 'q', 'misspelled', 'word'].join('');
  await withFixture('src/invalid-spelling.ts', `export const ${misspelling} = 'fixture';\n`, async () => {
    await expectFailure('CSpell', 'npm', ['run', 'spellcheck']);
  });
  await withFixture('src/invalid-unused.ts', 'export const neverImported = true;\n', async () => {
    await expectFailure('Knip', 'npm', ['run', 'audit:unused']);
  });
  await withFixture('src/invalid-types.ts', 'export const invalidType: string = 42;\n', async () => {
    await expectFailure('TypeScript', 'npm', ['run', 'typecheck']);
  });
  await withFixture('src/pages/invalid-astro.astro', '<p>{missingValue}</p>\n', async () => {
    await expectFailure('Astro check', 'npm', ['run', 'astro:check']);
  });

  const packagePath = join(fixtureDirectory, 'package.json');
  const lockfilePath = join(fixtureDirectory, 'package-lock.json');
  const packageContents = await readFile(packagePath, 'utf8');
  const lockfileContents = await readFile(lockfilePath, 'utf8');
  try {
    await run('npm', [
      'install',
      '--package-lock-only',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      'lodash@4.17.20',
    ]);
    await expectFailure('npm audit', 'npm', ['run', 'audit']);
  } finally {
    await writeFile(packagePath, packageContents);
    await writeFile(lockfilePath, lockfileContents);
  }

  console.log('Verified the clean static pipeline and 9 isolated defect fixtures.');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
