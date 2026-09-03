import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type TextFile = {
  path: string;
  content: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const sourceDirectory = join(repositoryRoot, 'templates', 'default');
const copiedDirectoryName = 'default';
const excludedNames = new Set([
  '.astro',
  '.lighthouseci',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const;
const localDependencyProtocols = /^(?:file|link|workspace):/u;
const unresolvedTokenPatterns = [
  /(?<!\$)\{\{[^{}]+\}\}/gu,
  /__FORGE_[A-Z0-9_]+__/gu,
  /%FORGE_[A-Z0-9_]+%/gu,
  /FORGE_[A-Z0-9_]+_PLACEHOLDER/gu,
];
const allowedRuntimeTokens = new Map<string, ReadonlySet<string>>([
  ['src/config/content-models/articles.ts', new Set(['{{slug}}'])],
  ['src/integrations/sveltia/config.ts', new Set(['{{collection}}', '{{path}}', '{{slug}}'])],
]);
const personalIdentifierPattern = /rahul(?:0705|mohandas)|rahul\s+mohandas/iu;
const expectedTemplateContent = [
  { path: 'src/config/site.ts', value: "url: 'https://example.com'" },
  { path: 'src/integrations/sveltia/config.ts', value: "repo: 'your-github-user/your-repository'" },
  {
    path: '.github/workflows/project.yml',
    value: 'actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0',
  },
] as const;

export const findLocalDependencies = (manifest: PackageManifest): string[] =>
  dependencySections.flatMap((section) =>
    Object.entries(manifest[section] ?? {})
      .filter(([, version]) => localDependencyProtocols.test(version))
      .map(([name, version]) => `${section}.${name}=${version}`),
  );

export const findUnresolvedTokens = (files: readonly TextFile[]): string[] =>
  files.flatMap(({ path, content }) =>
    unresolvedTokenPatterns.flatMap((pattern) =>
      [...content.matchAll(pattern)]
        .map(([token]) => token)
        .filter((token) => !allowedRuntimeTokens.get(path)?.has(token))
        .map((token) => `${path}: ${token}`),
    ),
  );

export const findPersonalIdentifiers = (files: readonly TextFile[]): string[] =>
  files.flatMap(({ path, content }) => {
    const match = content.match(personalIdentifierPattern);
    return match ? [`${path}: ${match[0]}`] : [];
  });

const listTextFiles = async (directory: string, root = directory): Promise<TextFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: TextFile[] = [];

  for (const entry of entries) {
    if (excludedNames.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTextFiles(absolutePath, root)));
      continue;
    }

    if (!entry.isFile()) continue;

    const content = await readFile(absolutePath, 'utf8').catch(() => undefined);
    if (content !== undefined && !content.includes('\0')) {
      files.push({ path: relative(root, absolutePath), content });
    }
  }

  return files;
};

const assertTemplateState = async (directory: string) => {
  const packageJsonPath = join(directory, 'package.json');
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageManifest;
  const localDependencies = findLocalDependencies(manifest);

  if (localDependencies.length > 0) {
    throw new Error(`Template dependencies must resolve from a registry:\n${localDependencies.join('\n')}`);
  }

  const files = await listTextFiles(directory);
  const unresolvedTokens = findUnresolvedTokens(files);
  if (unresolvedTokens.length > 0) {
    throw new Error(`Unresolved template tokens found:\n${unresolvedTokens.join('\n')}`);
  }

  const personalIdentifiers = findPersonalIdentifiers(files);
  if (personalIdentifiers.length > 0) {
    throw new Error(`Personal reference identifiers found:\n${personalIdentifiers.join('\n')}`);
  }

  for (const expected of expectedTemplateContent) {
    const file = files.find(({ path }) => path === expected.path);
    if (!file?.content.includes(expected.value)) {
      throw new Error(`Expected documented starter default is missing from ${expected.path}: ${expected.value}`);
    }
  }
};

const run = async (command: string, args: readonly string[], cwd: string) =>
  new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(`${command} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`),
      );
    });
  });

const verifyTemplate = async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'forge-template-'));
  const copiedDirectory = join(temporaryRoot, copiedDirectoryName);

  if (!resolve(copiedDirectory).startsWith(`${resolve(tmpdir())}${sep}`)) {
    throw new Error(`Refusing to use a verification directory outside the OS temporary directory: ${copiedDirectory}`);
  }

  try {
    console.log(`Copying the default template to ${copiedDirectory}`);
    await cp(sourceDirectory, copiedDirectory, {
      recursive: true,
      filter: (source) => !excludedNames.has(source.split(sep).at(-1) ?? ''),
    });

    await assertTemplateState(copiedDirectory);
    await run('npm', ['ci'], copiedDirectory);
    await run('npm', ['run', 'quality:core'], copiedDirectory);
    console.log('Standalone template verification passed.');
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
};

const isEntryPoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  await verifyTemplate();
}
