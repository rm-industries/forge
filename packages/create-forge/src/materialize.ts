import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  rmdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { GeneratorOptions } from './options';
import { templateTokenPrefix, templateTokens } from './template-tokens';

export class MaterializationError extends Error {}

type MaterializationContext = {
  templateDirectory: string | URL;
  cwd?: string;
  signal?: AbortSignal;
  confirmOverwrite?: (destination: string) => Promise<boolean>;
  onFileCopied?: (path: string) => void;
};

type TemplateFile = { source: string; relativePath: string; mode: number };

const pathExists = async (path: string) => {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
};

const getPathStat = async (path: string) => {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

const assertNotAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('Project creation was interrupted.');
};

const resolveTemplateDirectory = (directory: string | URL) =>
  directory instanceof URL ? fileURLToPath(directory) : resolve(directory);

const resolveDestination = (destination: string, cwd: string) => {
  const segments = destination.split(/[\\/]/u);
  if (segments.includes('..')) {
    throw new MaterializationError(
      `Unsafe destination ${JSON.stringify(destination)}: parent traversal is not allowed.`,
    );
  }
  const resolved = isAbsolute(destination) ? resolve(destination) : resolve(cwd, destination);
  if (resolved === parse(resolved).root) {
    throw new MaterializationError(
      `Unsafe destination ${JSON.stringify(destination)}: a filesystem root is not allowed.`,
    );
  }
  return resolved;
};

const listTemplateFiles = async (root: string, directory = root): Promise<TemplateFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: TemplateFile[] = [];
  for (const entry of entries) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTemplateFiles(root, source)));
      continue;
    }
    if (!entry.isFile()) throw new MaterializationError(`Template entry ${source} is not a regular file.`);
    files.push({ source, relativePath: relative(root, source), mode: (await stat(source)).mode });
  }
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
};

const isDirectoryEmpty = async (directory: string) => (await readdir(directory)).length === 0;

const ensureDirectory = async (directory: string, created: Set<string>) => {
  const existing = await getPathStat(directory);
  if (existing) {
    if (existing.isSymbolicLink() || !existing.isDirectory()) {
      throw new Error(`Unsafe destination entry ${directory}: expected a regular directory.`);
    }
    return;
  }
  const parent = dirname(directory);
  if (parent !== directory) await ensureDirectory(parent, created);
  await mkdir(directory);
  created.add(directory);
};

const replaceToken = (source: string, token: string, value: string, field: string) => {
  const quotedToken = `'${token}'`;
  if (!source.includes(quotedToken)) throw new Error(`Packaged template is missing the ${field} token.`);
  return source.replaceAll(quotedToken, JSON.stringify(value));
};

const customizeTemplate = async (destination: string, options: GeneratorOptions) => {
  const packagePath = join(destination, 'package.json');
  const packageLockPath = join(destination, 'package-lock.json');
  const packageMetadata = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, unknown>;
  const packageLock = JSON.parse(await readFile(packageLockPath, 'utf8')) as {
    name?: string;
    packages?: Record<string, Record<string, unknown>>;
  };
  if (
    packageMetadata.name !== templateTokens.packageName ||
    packageLock.name !== templateTokens.packageName ||
    packageLock.packages?.['']?.name !== templateTokens.packageName
  ) {
    throw new Error('Packaged template contains unexpected package metadata tokens.');
  }
  packageMetadata.name = options.packageName;
  packageMetadata.version = '0.0.0';
  packageMetadata.private = true;
  packageLock.name = options.packageName;
  if (!packageLock.packages?.['']) throw new Error('Packaged template lockfile is missing its root package metadata.');
  packageLock.packages[''].name = options.packageName;
  packageLock.packages[''].version = '0.0.0';
  await writeFile(packagePath, `${JSON.stringify(packageMetadata, undefined, 2)}\n`);
  await writeFile(packageLockPath, `${JSON.stringify(packageLock, undefined, 2)}\n`);

  const siteConfigPath = join(destination, 'src', 'config', 'site.ts');
  let siteConfig = await readFile(siteConfigPath, 'utf8');
  siteConfig = replaceToken(siteConfig, templateTokens.siteName, options.siteName, 'site name');
  siteConfig = replaceToken(siteConfig, templateTokens.description, options.description, 'description');
  siteConfig = replaceToken(siteConfig, templateTokens.author, options.author, 'author');
  siteConfig = replaceToken(siteConfig, templateTokens.url, options.url, 'URL');
  siteConfig = replaceToken(siteConfig, templateTokens.repository, options.repository, 'repository');
  if (siteConfig.includes(templateTokenPrefix)) throw new Error('Packaged template contains unresolved tokens.');
  await writeFile(siteConfigPath, siteConfig);
};

export const materializeProject = async (options: GeneratorOptions, context: MaterializationContext) => {
  const cwd = context.cwd ?? process.cwd();
  const destination = resolveDestination(options.destination, cwd);
  const templateDirectory = resolveTemplateDirectory(context.templateDirectory);
  const destinationExisted = await pathExists(destination);
  if (destinationExisted) {
    const destinationStat = await lstat(destination);
    if (destinationStat.isSymbolicLink() || !destinationStat.isDirectory()) {
      throw new MaterializationError(`Unsafe destination ${destination}: expected a regular directory.`);
    }
  }
  if (destinationExisted && !(await isDirectoryEmpty(destination))) {
    const confirmed = await context.confirmOverwrite?.(destination);
    if (!confirmed) {
      throw new MaterializationError(`Destination ${destination} is not empty. No files were changed.`);
    }
  }

  const files = await listTemplateFiles(templateDirectory);
  const backupDirectory = await mkdtemp(join(tmpdir(), 'create-forge-backup-'));
  const createdFiles = new Set<string>();
  const createdDirectories = new Set<string>();
  const backups = new Map<string, string>();

  try {
    assertNotAborted(context.signal);
    await ensureDirectory(destination, createdDirectories);
    for (const file of files) {
      assertNotAborted(context.signal);
      const target = join(destination, file.relativePath);
      const targetRelative = relative(destination, target);
      if (targetRelative.startsWith('..') || isAbsolute(targetRelative))
        throw new Error(`Unsafe template path ${file.relativePath}.`);
      await ensureDirectory(dirname(target), createdDirectories);
      const targetStat = await getPathStat(target);
      if (targetStat) {
        if (targetStat.isSymbolicLink() || !targetStat.isFile()) {
          throw new Error(`Unsafe destination entry ${target}: expected a regular file.`);
        }
        const backup = join(backupDirectory, file.relativePath);
        await mkdir(dirname(backup), { recursive: true });
        await copyFile(target, backup);
        backups.set(target, backup);
      } else {
        createdFiles.add(target);
      }
      await copyFile(file.source, target);
      await chmod(target, file.mode);
      context.onFileCopied?.(target);
    }
    assertNotAborted(context.signal);
    await customizeTemplate(destination, options);
    const tokenBytes = Buffer.from(templateTokenPrefix);
    for (const file of files) {
      assertNotAborted(context.signal);
      if ((await readFile(join(destination, file.relativePath))).includes(tokenBytes)) {
        throw new Error(`Generated file ${file.relativePath} contains an unresolved template token.`);
      }
    }
    return { destination, filesCopied: files.length };
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    for (const [target, backup] of backups) {
      try {
        await copyFile(backup, target);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    for (const file of createdFiles) {
      try {
        await rm(file, { force: true });
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    for (const directory of [...createdDirectories].sort((left, right) => right.length - left.length)) {
      try {
        await rmdir(directory);
      } catch (cleanupError) {
        if (!['ENOENT', 'ENOTEMPTY'].includes((cleanupError as NodeJS.ErrnoException).code ?? '')) {
          cleanupErrors.push(cleanupError);
        }
      }
    }
    const reason = error instanceof Error ? error.message : String(error);
    const recovery = cleanupErrors.length
      ? `Recovery: review ${destination}; some changes could not be rolled back automatically.`
      : `Recovery: changes from this invocation were rolled back; resolve the error and retry.`;
    throw new MaterializationError(`${reason} ${recovery}`, { cause: error });
  } finally {
    await rm(backupDirectory, { recursive: true, force: true });
  }
};
