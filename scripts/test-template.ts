import { spawn } from 'node:child_process';
import { access, copyFile, cp, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertStarterIsolation } from './verify-template.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(repositoryRoot, 'packages/create-forge/fixtures');
const excluded = new Set([
  'node_modules',
  'package-lock.json',
  'dist',
  '.astro',
  'coverage',
  '.lighthouseci',
  'playwright-report',
  'test-results',
]);

export const prepareTemplate = async (destination: string) => {
  // Fail rather than mix a stale build into the canonical source.
  try {
    await access(destination);
    throw new Error(`Template destination already exists: ${destination}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await cp(join(repositoryRoot, 'templates/default'), destination, {
    recursive: true,
    filter: (source) => !excluded.has(basename(source)),
  });
  await assertStarterIsolation(destination);
  for (const path of await readdir(join(fixtureRoot, 'starter-unit'), { recursive: true })) {
    if (path.endsWith('.test.ts')) await copyFile(join(fixtureRoot, 'starter-unit', path), join(destination, path));
  }
  for (const name of await readdir(join(fixtureRoot, 'starter-tests'))) {
    await copyFile(join(fixtureRoot, 'starter-tests', name), join(destination, 'tests', `starter-${name}`));
  }
};

const run = async (directory: string, args: string[]) =>
  new Promise<void>((resolvePromise, reject) => {
    const child = spawn('npm', args, { cwd: directory, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`npm ${args.join(' ')} failed: ${code}`)),
    );
  });

const testCustomization = async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-customization-'));
  const defaultDirectory = join(root, 'starter');
  try {
    await prepareTemplate(defaultDirectory);
    // Starter identity assertions belong to the canonical fixture, not edited content.
    for (const path of await readdir(join(fixtureRoot, 'starter-unit'), { recursive: true })) {
      if (path.endsWith('.test.ts')) await rm(join(defaultDirectory, path));
    }
    for (const name of await readdir(join(fixtureRoot, 'starter-tests'))) {
      await rm(join(defaultDirectory, 'tests', `starter-${name}`));
    }
    const customize = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await customize(path);
        else if (!entry.name.endsWith('.test.ts') && /\.(?:ts|astro|md|css)$/u.test(entry.name)) {
          const original = await readFile(path, 'utf8');
          const updated = original
            .replaceAll('/about/', '/studio/')
            .replaceAll('designing-a-calm-starting-point', 'our-first-story')
            .replaceAll('Designing a calm starting point', 'Our first story')
            .replaceAll('A useful foundation, not a finished identity.', 'Meet our studio')
            .replace("darkTheme: FlavorName = 'mocha'", "darkTheme: FlavorName = 'macchiato'");
          if (updated !== original) await writeFile(path, updated);
        }
      }
    };
    await customize(join(defaultDirectory, 'src'));
    await rename(join(defaultDirectory, 'src/pages/about.astro'), join(defaultDirectory, 'src/pages/studio.astro'));
    await rename(
      join(defaultDirectory, 'src/content/articles/designing-a-calm-starting-point.md'),
      join(defaultDirectory, 'src/content/articles/our-first-story.md'),
    );
    await run(defaultDirectory, ['install']);
    for (const command of ['test', 'build', 'validate:build']) await run(defaultDirectory, ['run', command]);
    await run(defaultDirectory, ['exec', '--', 'playwright', 'install', '--with-deps', 'chromium']);
    await run(defaultDirectory, ['run', 'test:e2e', '--', '--project=chromium', '--workers=2']);
    await access(join(defaultDirectory, 'dist/studio/index.html'));
    const article = await readFile(join(defaultDirectory, 'dist/articles/our-first-story/index.html'), 'utf8');
    if (!article.includes('Our first story')) throw new Error('Customized article was not built.');
    try {
      await access(join(defaultDirectory, 'dist/about/index.html'));
      throw new Error('Customized route retained the starter output.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    console.log('Verified customized template unit, build and Chromium commands.');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'prepare' && process.argv[3]) await prepareTemplate(resolve(process.argv[3]));
  else if (process.argv[2] === 'customization') await testCustomization();
  else throw new Error('Usage: node scripts/test-template.ts prepare <new-directory> | customization');
}
