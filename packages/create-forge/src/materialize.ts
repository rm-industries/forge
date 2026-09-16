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
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { GeneratorOptions } from './options';
import { deriveScheduleMinutes } from './schedule';
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
    const relativePath = relative(root, source);
    files.push({
      source,
      relativePath: relativePath === '.gitignore.template' ? '.gitignore' : relativePath,
      mode: (await stat(source)).mode,
    });
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

const quoteTypeScriptString = (value: string) =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')}'`;

const replaceToken = (source: string, token: string, value: string, field: string) => {
  const quotedToken = `'${token}'`;
  if (!source.includes(quotedToken)) throw new Error(`Packaged template is missing the ${field} token.`);
  return source.replaceAll(quotedToken, quoteTypeScriptString(value));
};

const replaceRawToken = (source: string, token: string, value: string, field: string) => {
  if (!source.includes(token)) throw new Error(`Packaged template is missing the ${field} token.`);
  return source.replaceAll(token, value);
};

const customizeTemplate = async (projectRoot: string, repositoryRoot: string, options: GeneratorOptions) => {
  const relativeProjectDirectory = relative(repositoryRoot, projectRoot);
  const projectDirectory = relativeProjectDirectory.split(sep).join('/') || '.';
  const projectPathFilter = projectDirectory === '.' ? '**' : `${projectDirectory}/**`;
  const dependabotDirectory = projectDirectory === '.' ? '/' : `/${projectDirectory}`;
  const packagePath = join(projectRoot, 'package.json');
  const packageLockPath = join(projectRoot, 'package-lock.json');
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

  const siteConfigPath = join(projectRoot, 'src', 'config', 'site.ts');
  let siteConfig = await readFile(siteConfigPath, 'utf8');
  siteConfig = replaceToken(siteConfig, templateTokens.siteName, options.siteName, 'site name');
  siteConfig = replaceToken(siteConfig, templateTokens.description, options.description, 'description');
  siteConfig = replaceToken(siteConfig, templateTokens.author, options.author, 'author');
  siteConfig = replaceToken(siteConfig, templateTokens.url, options.url, 'URL');
  siteConfig = replaceToken(siteConfig, templateTokens.repository, options.repository, 'repository');
  if (siteConfig.includes(templateTokenPrefix)) throw new Error('Packaged template contains unresolved tokens.');
  await writeFile(siteConfigPath, siteConfig);

  const scheduleMinutes = deriveScheduleMinutes(options.packageName);
  const securityWorkflowPath = join(repositoryRoot, '.github', 'workflows', 'security.yml');
  const automationWorkflowPath = join(repositoryRoot, '.github', 'workflows', 'automation.yml');
  let securityWorkflow = await readFile(securityWorkflowPath, 'utf8');
  let automationWorkflow = await readFile(automationWorkflowPath, 'utf8');
  securityWorkflow = replaceRawToken(
    securityWorkflow,
    templateTokens.securityScheduleMinute,
    String(scheduleMinutes.security),
    'security schedule minute',
  );
  automationWorkflow = replaceRawToken(
    automationWorkflow,
    templateTokens.automationScheduleMinute,
    String(scheduleMinutes.automation),
    'automation schedule minute',
  );
  await writeFile(securityWorkflowPath, securityWorkflow);
  await writeFile(automationWorkflowPath, automationWorkflow);

  const tokenizedFiles = [
    {
      path: join(repositoryRoot, '.github', 'workflows', 'project.yml'),
      replacements: [
        [templateTokens.projectDirectory, projectDirectory, 'project directory'],
        [templateTokens.projectPathFilter, projectPathFilter, 'project path filter'],
      ],
    },
    {
      path: securityWorkflowPath,
      replacements: [[templateTokens.projectPathFilter, projectPathFilter, 'project path filter']],
    },
    {
      path: join(repositoryRoot, '.github', 'actions', 'setup-project', 'action.yml'),
      replacements: [[templateTokens.projectDirectory, projectDirectory, 'project directory']],
    },
    {
      path: join(repositoryRoot, '.github', 'dependabot.yml'),
      replacements: [[templateTokens.dependabotDirectory, dependabotDirectory, 'Dependabot directory']],
    },
  ] as const;
  for (const file of tokenizedFiles) {
    let source = await readFile(file.path, 'utf8');
    for (const [token, value, field] of file.replacements) source = replaceRawToken(source, token, value, field);
    await writeFile(file.path, source);
  }
};

export const materializeProject = async (options: GeneratorOptions, context: MaterializationContext) => {
  const cwd = context.cwd ?? process.cwd();
  const projectRoot = resolveDestination(options.destination, cwd);
  const repositoryRoot = resolveDestination(options.repositoryRoot, cwd);
  const projectPath = relative(repositoryRoot, projectRoot);
  if (projectPath.startsWith('..') || isAbsolute(projectPath)) {
    throw new MaterializationError(`Project root ${projectRoot} must be inside repository root ${repositoryRoot}.`);
  }
  const templateDirectory = resolveTemplateDirectory(context.templateDirectory);
  const repositoryStat = await getPathStat(repositoryRoot);
  if (repositoryStat && (repositoryStat.isSymbolicLink() || !repositoryStat.isDirectory())) {
    throw new MaterializationError(`Unsafe repository root ${repositoryRoot}: expected a regular directory.`);
  }
  const files = await listTemplateFiles(templateDirectory);
  const destinationExisted = await pathExists(projectRoot);
  if (destinationExisted) {
    const destinationStat = await lstat(projectRoot);
    if (destinationStat.isSymbolicLink() || !destinationStat.isDirectory()) {
      throw new MaterializationError(`Unsafe destination ${projectRoot}: expected a regular directory.`);
    }
  }
  if (destinationExisted && !(await isDirectoryEmpty(projectRoot))) {
    const confirmed = await context.confirmOverwrite?.(projectRoot);
    if (!confirmed) {
      throw new MaterializationError(`Destination ${projectRoot} is not empty. No files were changed.`);
    }
  }
  if (projectRoot !== repositoryRoot) {
    const repositoryFiles = files.filter((file) => file.relativePath.startsWith(`.github${sep}`));
    let hasRepositoryConflict = false;
    for (const file of repositoryFiles) {
      if (await pathExists(join(repositoryRoot, file.relativePath))) {
        hasRepositoryConflict = true;
        break;
      }
    }
    if (hasRepositoryConflict && !(await context.confirmOverwrite?.(repositoryRoot))) {
      throw new MaterializationError(
        `Repository root ${repositoryRoot} contains conflicting files. No files were changed.`,
      );
    }
  }
  const backupDirectory = await mkdtemp(join(tmpdir(), 'create-forge-backup-'));
  const createdFiles = new Set<string>();
  const createdDirectories = new Set<string>();
  const backups = new Map<string, string>();

  try {
    assertNotAborted(context.signal);
    await ensureDirectory(repositoryRoot, createdDirectories);
    await ensureDirectory(projectRoot, createdDirectories);
    for (const file of files) {
      assertNotAborted(context.signal);
      const targetRoot = file.relativePath.startsWith(`.github${sep}`) ? repositoryRoot : projectRoot;
      const target = join(targetRoot, file.relativePath);
      const targetRelative = relative(targetRoot, target);
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
    await customizeTemplate(projectRoot, repositoryRoot, options);
    const tokenBytes = Buffer.from(templateTokenPrefix);
    for (const file of files) {
      assertNotAborted(context.signal);
      const targetRoot = file.relativePath.startsWith(`.github${sep}`) ? repositoryRoot : projectRoot;
      if ((await readFile(join(targetRoot, file.relativePath))).includes(tokenBytes)) {
        throw new Error(`Generated file ${file.relativePath} contains an unresolved template token.`);
      }
    }
    return { destination: projectRoot, projectRoot, repositoryRoot, filesCopied: files.length };
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
      ? `Recovery: review ${repositoryRoot}; some changes could not be rolled back automatically.`
      : `Recovery: changes from this invocation were rolled back; resolve the error and retry.`;
    throw new MaterializationError(`${reason} ${recovery}`, { cause: error });
  } finally {
    await rm(backupDirectory, { recursive: true, force: true });
  }
};
