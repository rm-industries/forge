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

import { resolveDeployments } from './ci/deployment.ts';
import { generationOptionsSchema } from './ci/generation-options.ts';
import { deriveCiPrefix, validateCiPrefix, workflowPath } from './ci/paths';
import { createDeploymentGuide, deploymentGuidePlaceholder } from './deployment-docs.ts';
import type { GeneratorOptions } from './options';
import { executeCommand, type CommandExecutor } from './process';
import { deriveScheduleMinutes } from './schedule';
import { templateTokenPrefix, templateTokens } from './template-tokens';
import { writeProjectCi } from './write-ci';

const templateWorkflowPathPattern = /^\.github\/workflows\/(project|security|automation|deployment)\.yml$/;
const generatedGithubWorkflowPathPattern = /^\.github[\\/]workflows[\\/][a-z0-9-]+\.yml$/;
const generatedGitlabChildPipelinePathPattern = /^\.gitlab[\\/]ci[\\/][a-z0-9-]+\.yml$/;

const pathSeparatorPattern = /[\\/]/u;

export class MaterializationError extends Error {}

type MaterializationContext = {
  templateDirectory: string | URL;
  cwd?: string;
  signal?: AbortSignal;
  confirmOverwrite?: (destination: string) => Promise<boolean>;
  onFileCopied?: (path: string) => void;
  generateCi?: typeof writeProjectCi;
  execute?: CommandExecutor;
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
  const segments = destination.split(pathSeparatorPattern);
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

const customizeTemplate = async (
  projectRoot: string,
  repositoryRoot: string,
  options: GeneratorOptions,
  ciPrefix?: string,
  skipped: Set<string> = new Set(),
  cloudflareVersion?: string,
  execute: CommandExecutor = executeCommand,
  signal?: AbortSignal,
) => {
  const relativeProjectDirectory = relative(repositoryRoot, projectRoot);
  const projectDirectory = relativeProjectDirectory.split(sep).join('/') || '.';
  const dependabotDirectory = projectDirectory === '.' ? '/' : `/${projectDirectory}`;
  const packagePath = join(projectRoot, 'package.json');
  const packageMetadata = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, unknown>;
  if (packageMetadata.name !== templateTokens.packageName) {
    throw new Error('Packaged template contains unexpected package metadata tokens.');
  }
  packageMetadata.name = options.packageName;
  packageMetadata.version = '0.0.0';
  packageMetadata.private = true;
  if (cloudflareVersion) {
    // Deployment invokes the locked executable by path, outside Knip's module graph.
    const knip = (packageMetadata.knip ?? {}) as { ignoreDependencies?: string[] };
    packageMetadata.knip = {
      ...knip,
      ignoreDependencies: [...new Set([...(knip.ignoreDependencies ?? []), 'wrangler'])],
    };
    packageMetadata.devDependencies = {
      ...(packageMetadata.devDependencies as Record<string, string> | undefined),
      wrangler: cloudflareVersion,
    };
  }
  await writeFile(packagePath, `${JSON.stringify(packageMetadata, undefined, 2)}\n`);

  const siteConfigPath = join(projectRoot, 'src', 'config', 'site.ts');
  let siteConfig = await readFile(siteConfigPath, 'utf8');
  siteConfig = replaceToken(siteConfig, templateTokens.siteName, options.siteName, 'site name');
  siteConfig = replaceToken(siteConfig, templateTokens.description, options.description, 'description');
  siteConfig = replaceToken(siteConfig, templateTokens.author, options.author, 'author');
  siteConfig = replaceToken(siteConfig, templateTokens.url, options.deployments?.[0]?.url ?? options.url, 'URL');
  siteConfig = replaceToken(siteConfig, templateTokens.repository, options.repository, 'repository');
  if (siteConfig.includes(templateTokenPrefix)) throw new Error('Packaged template contains unresolved tokens.');
  await writeFile(siteConfigPath, siteConfig);

  const scheduleMinutes = deriveScheduleMinutes(options.packageName);
  const providers = options.ciProviders ?? ['github'];
  const ciConfig = {
    directory: projectDirectory,
    repositoryRoot: relative(projectRoot, repositoryRoot).split(sep).join('/') || '.',
    providers,
    nodeVersion: options.nodeVersion,
    deployments: options.deployments,
    primary: options.primaryCi ?? (providers.includes('github') ? 'github' : 'gitlab'),
    securityMinute: scheduleMinutes.security,
    automationMinute: scheduleMinutes.automation,
    ...(ciPrefix === undefined ? {} : { prefix: ciPrefix }),
  };

  const deploymentGuidePath = join(projectRoot, 'README.md');
  await writeFile(
    deploymentGuidePath,
    replaceRawToken(
      await readFile(deploymentGuidePath, 'utf8'),
      deploymentGuidePlaceholder,
      createDeploymentGuide(generationOptionsSchema.parse(ciConfig)),
      'deployment guide',
    ),
  );

  const dependabot = join(repositoryRoot, '.github', 'dependabot.yml');
  if (!skipped.has(dependabot)) {
    const content = replaceRawToken(
      await readFile(dependabot, 'utf8'),
      templateTokens.dependabotDirectory,
      dependabotDirectory,
      'Dependabot directory',
    );
    await writeFile(dependabot, content);
  }
  if (cloudflareVersion) {
    try {
      await execute({
        executable: 'npm',
        arguments: [
          'install',
          '--package-lock-only',
          '--package-lock=true',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--workspaces=false',
        ],
        cwd: projectRoot,
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      throw new Error('Cloudflare dependency resolution failed; check network access and npm configuration.', {
        cause: error,
      });
    }
  }
  return generationOptionsSchema.parse(ciConfig);
};

export const materializeProject = async (options: GeneratorOptions, context: MaterializationContext) => {
  const providers = options.ciProviders ?? ['github'];
  const deployments = resolveDeployments(
    options.deployments,
    options.primaryCi ?? (providers.includes('github') ? 'github' : 'gitlab'),
  );
  if (options.deployments !== undefined) options = { ...options, deployments };
  const cwd = context.cwd ?? process.cwd();
  const projectRoot = resolveDestination(options.destination, cwd);
  const repositoryRoot = resolveDestination(options.repositoryRoot, cwd);
  const projectPath = relative(repositoryRoot, projectRoot);
  if (projectPath.startsWith('..') || isAbsolute(projectPath)) {
    throw new MaterializationError(`Project root ${projectRoot} must be inside repository root ${repositoryRoot}.`);
  }
  const ciPrefix = options.ciPrefix === undefined ? deriveCiPrefix(projectPath) : validateCiPrefix(options.ciPrefix);
  const templateDirectory = resolveTemplateDirectory(context.templateDirectory);
  const repositoryStat = await getPathStat(repositoryRoot);
  if (repositoryStat && (repositoryStat.isSymbolicLink() || !repositoryStat.isDirectory())) {
    throw new MaterializationError(`Unsafe repository root ${repositoryRoot}: expected a regular directory.`);
  }
  let files = (await listTemplateFiles(templateDirectory)).map((file) => {
    const path = file.relativePath.split(sep).join('/');
    const workflow = templateWorkflowPathPattern.exec(path);
    return workflow ? { ...file, relativePath: workflowPath(workflow[1]!, ciPrefix).split('/').join(sep) } : file;
  });
  let cloudflareVersion: string | undefined;
  if (options.deployments?.some((deployment) => deployment.target === 'cloudflare-pages')) {
    const defaults = JSON.parse(
      await readFile(resolve(templateDirectory, '..', 'cloudflare', 'package.json'), 'utf8'),
    ) as { devDependencies?: Record<string, string> };
    cloudflareVersion = defaults.devDependencies?.wrangler;
    if (!cloudflareVersion) throw new MaterializationError('Packaged Cloudflare defaults are missing Wrangler.');
  }
  const skipped = new Set<string>();
  const retained: TemplateFile[] = [];
  for (const file of files) {
    const shared =
      file.relativePath.startsWith(`.github${sep}`) && !file.relativePath.startsWith(`.github${sep}workflows${sep}`);
    const path = join(repositoryRoot, file.relativePath);
    if (shared && (await pathExists(path))) skipped.add(path);
    else retained.push(file);
  }
  files = retained;
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
  const approvedWorkflows = new Set<string>();
  for (const name of (options.ciProviders ?? ['github']).includes('github')
    ? ['project', 'security', 'automation']
    : []) {
    const path = join(repositoryRoot, workflowPath(name, ciPrefix));
    if (await pathExists(path)) {
      if (!(await context.confirmOverwrite?.(path)))
        throw new MaterializationError(`Workflow ${path} already exists. No files were changed.`);
      approvedWorkflows.add(path);
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
    const lock = join(projectRoot, 'package-lock.json');
    const existing = await getPathStat(lock);
    if (existing) {
      if (existing.isSymbolicLink() || !existing.isFile())
        throw new Error(`Unsafe destination entry ${lock}: expected a regular file.`);
      if (cloudflareVersion) {
        const backup = join(backupDirectory, 'package-lock.json');
        await copyFile(lock, backup);
        backups.set(lock, backup);
      }
    } else if (cloudflareVersion) createdFiles.add(lock);
    const ciConfig = await customizeTemplate(
      projectRoot,
      repositoryRoot,
      options,
      ciPrefix,
      skipped,
      cloudflareVersion,
      context.execute,
      context.signal,
    );
    const stagedCi = join(backupDirectory, 'generated-ci');
    await mkdir(stagedCi);
    await (context.generateCi ?? writeProjectCi)(ciConfig, stagedCi, context.signal);
    const generatedFiles = await listTemplateFiles(stagedCi);
    for (const file of generatedFiles) {
      if (
        !generatedGithubWorkflowPathPattern.test(file.relativePath) &&
        !generatedGitlabChildPipelinePathPattern.test(file.relativePath) &&
        file.relativePath !== '.gitlab-ci.yml'
      )
        throw new Error('Unexpected generated CI path');
      const path = join(repositoryRoot, file.relativePath);
      const existing = await getPathStat(path);
      if (existing) {
        if (existing.isSymbolicLink() || !existing.isFile()) throw new Error(`Unsafe destination entry ${path}`);
        if (!approvedWorkflows.has(path) && !(await context.confirmOverwrite?.(path)))
          throw new Error(`Workflow ${path} already exists; no workflow was overwritten.`);
        const backup = join(backupDirectory, 'workflow-backups', file.relativePath);
        await mkdir(dirname(backup), { recursive: true });
        await copyFile(path, backup);
        backups.set(path, backup);
      } else createdFiles.add(path);
      await ensureDirectory(dirname(path), createdDirectories);
      await copyFile(file.source, path);
    }
    const tokenBytes = Buffer.from(templateTokenPrefix);
    for (const file of files) {
      assertNotAborted(context.signal);
      const targetRoot = file.relativePath.startsWith(`.github${sep}`) ? repositoryRoot : projectRoot;
      if ((await readFile(join(targetRoot, file.relativePath))).includes(tokenBytes)) {
        throw new Error(`Generated file ${file.relativePath} contains an unresolved template token.`);
      }
    }
    return {
      destination: projectRoot,
      projectRoot,
      repositoryRoot,
      filesCopied: files.length + generatedFiles.length,
      skippedConfiguration: [...skipped].map((path) => relative(repositoryRoot, path).split(sep).join('/')),
    };
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
