import { cp, mkdir } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageDirectory, '..', '..');
const sourceDirectory = join(repositoryRoot, 'templates', 'default');
const destinationDirectory = join(packageDirectory, 'dist', 'template');
const excludedNames = new Set(['.astro', 'dist', 'node_modules', 'playwright-report', 'test-results']);

await mkdir(dirname(destinationDirectory), { recursive: true });
await cp(sourceDirectory, destinationDirectory, {
  recursive: true,
  filter: (source) => !excludedNames.has(source.split(sep).at(-1) ?? ''),
});
