import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { templateTokens } from '../src/template-tokens.ts';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageDirectory, '..', '..');
const sourceDirectory = join(repositoryRoot, 'templates', 'default');
const destinationDirectory = join(packageDirectory, 'dist', 'template');
const excludedNames = new Set([
  '.astro',
  '.lighthouseci',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

await rm(destinationDirectory, { recursive: true, force: true });
await mkdir(dirname(destinationDirectory), { recursive: true });
await cp(sourceDirectory, destinationDirectory, {
  recursive: true,
  filter: (source) => !excludedNames.has(source.split(sep).at(-1) ?? ''),
});
await rename(join(destinationDirectory, '.gitignore'), join(destinationDirectory, '.gitignore.template'));

for (const filename of ['package.json', 'package-lock.json']) {
  const path = join(destinationDirectory, filename);
  const metadata = JSON.parse(await readFile(path, 'utf8')) as {
    name?: string;
    packages?: Record<string, { name?: string }>;
  };
  metadata.name = templateTokens.packageName;
  if (metadata.packages?.['']) metadata.packages[''].name = templateTokens.packageName;
  await writeFile(path, `${JSON.stringify(metadata, undefined, 2)}\n`);
}

const siteConfigPath = join(destinationDirectory, 'src', 'config', 'site.ts');
const tokenizedSiteConfig = (await readFile(siteConfigPath, 'utf8'))
  .replace("name: 'Forge',", `name: '${templateTokens.siteName}',`)
  .replace(
    "description: 'A content-driven website created with Forge.',",
    `description: '${templateTokens.description}',`,
  )
  .replace("author: 'Site Author',", `author: '${templateTokens.author}',`)
  .replace("url: 'https://example.com',", `url: '${templateTokens.url}',`)
  .replace("repository: '',", `repository: '${templateTokens.repository}',`);
for (const token of [
  templateTokens.siteName,
  templateTokens.description,
  templateTokens.author,
  templateTokens.url,
  templateTokens.repository,
]) {
  if (!tokenizedSiteConfig.includes(token)) throw new Error(`Could not inject template token ${token}.`);
}
await writeFile(siteConfigPath, tokenizedSiteConfig);
