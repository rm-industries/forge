import { execFile } from 'node:child_process';
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { parse } from 'yaml';

import { deriveCiPrefix, workflowPath } from '../src/ci/paths.ts';
import { deriveScheduleMinutes } from '../src/schedule.ts';
import { templateTokenPrefix } from '../src/template-tokens.ts';

const lineEndingPattern = /\r?\n/u;

type PackResult = { filename: string };
type PackageMetadata = { name?: string };

const execute = promisify(execFile);
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = await mkdtemp(join(tmpdir(), 'create-forge-e2e-'));
const suppliedTarball = process.env.FORGE_CLI_TARBALL;

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

const assertGeneratedProject = async (directory: string, packageName: string, repositoryDirectory = directory) => {
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as PackageMetadata;
  if (await exists(join(directory, 'docs', 'deployment.md')))
    throw new Error('Deployment setup belongs in the consumer README, not its docs directory.');
  const deploymentGuide = await readFile(join(directory, 'README.md'), 'utf8');
  if (
    !deploymentGuide.includes('GitHub Actions') ||
    !deploymentGuide.includes('target: github-pages') ||
    deploymentGuide.includes('<!-- Forge inserts')
  )
    throw new Error('The default generated project must include its completed deployment setup guide.');
  const lockfile = await readFile(join(directory, 'package-lock.json'), 'utf8');
  const gitignore = await readFile(join(directory, '.gitignore'), 'utf8');
  const siteConfig = await readFile(join(directory, 'src', 'config', 'site.ts'), 'utf8');
  const prefix = deriveCiPrefix(relative(repositoryDirectory, directory));
  const securityWorkflow = await readFile(join(repositoryDirectory, workflowPath('security', prefix)), 'utf8');
  const automationWorkflow = await readFile(join(repositoryDirectory, workflowPath('automation', prefix)), 'utf8');
  const projectWorkflow = await readFile(join(repositoryDirectory, workflowPath('project', prefix)), 'utf8');
  const dependabot = await readFile(join(repositoryDirectory, '.github', 'dependabot.yml'), 'utf8');
  const projectDirectory = relative(repositoryDirectory, directory).split(sep).join('/') || '.';
  const dependabotDirectory = projectDirectory === '.' ? '/' : `/${projectDirectory}`;
  if (metadata.name !== packageName) {
    throw new Error(`Expected ${directory} to use package name ${packageName}.`);
  }
  for (const path of ['.lighthouseci/', 'playwright-report/', 'test-results/']) {
    if (!gitignore.split(lineEndingPattern).includes(path)) {
      throw new Error(`Generated fixture ${directory} does not ignore ${path}.`);
    }
  }
  if (`${lockfile}\n${siteConfig}\n${securityWorkflow}\n${automationWorkflow}`.includes(templateTokenPrefix)) {
    throw new Error(`Generated fixture ${directory} contains an unresolved template token.`);
  }
  for (const expected of [
    `path: ${projectDirectory}/coverage`,
    `path: ${projectDirectory}/dist`,
    `${projectDirectory}/playwright-report`,
    `${projectDirectory}/test-results`,
    `path: ${projectDirectory}/.lighthouseci`,
  ]) {
    if (!projectWorkflow.includes(expected)) {
      throw new Error(`Generated fixture ${directory} is missing project workflow value ${JSON.stringify(expected)}.`);
    }
  }
  if (!dependabot.includes(`directory: ${dependabotDirectory}`)) {
    throw new Error(`Generated fixture ${directory} has the wrong Dependabot directory.`);
  }
  if (await exists(join(directory, 'scripts/ci')))
    throw new Error('CI authoring files must not be delivered to consumers');
  const consumer = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  if (
    consumer.scripts['ci:generate'] ||
    consumer.scripts['ci:check'] ||
    consumer.devDependencies.yaml ||
    consumer.devDependencies.zod
  )
    throw new Error('CI authoring dependencies or commands leaked into consumer');
  const updates = parse(dependabot).updates;
  if (
    !updates.some(
      (update: { 'package-ecosystem': string; directory: string }) =>
        update['package-ecosystem'] === 'github-actions' && update.directory === '/',
    )
  )
    throw new Error('Dependabot must scan root workflows including prefixed nested workflows');
  const scheduleMinutes = deriveScheduleMinutes(packageName);
  for (const [workflow, minute] of [
    [securityWorkflow, scheduleMinutes.security],
    [automationWorkflow, scheduleMinutes.automation],
  ] as const) {
    if (parse(workflow).on.schedule[0].cron !== `${minute} 5 * * 1`) throw new Error('Incorrect generated schedule');
  }
  const project = parse(projectWorkflow);
  if (
    project.on.workflow_run ||
    project.jobs.deploy.environment.name !== 'github-pages' ||
    project.jobs.project ||
    project.jobs.compatibility ||
    !project.jobs.deploy.needs.includes('browser-tests')
  ) {
    throw new Error('Deployment must follow validation in the same workflow');
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

  let tarball = suppliedTarball ? resolve(suppliedTarball) : undefined;
  if (!tarball) {
    const { stdout: packOutput } = await execute(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', tarballDirectory],
      { cwd: packageDirectory },
    );
    const [packResult] = JSON.parse(packOutput) as PackResult[];
    if (!packResult) throw new Error('npm pack did not report a tarball.');
    tarball = join(tarballDirectory, packResult.filename);
  }
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
  await execute('npm', ['run', 'format'], { cwd: defaultDirectory, maxBuffer: 10 * 1024 * 1024 });
  await access(join(defaultDirectory, '.git', 'HEAD'));
  await access(join(defaultDirectory, '.github', 'dependabot.yml'));
  await access(join(defaultDirectory, '.github', 'workflows', 'automation.yml'));
  await access(join(defaultDirectory, '.github', 'workflows', 'project.yml'));
  await access(join(defaultDirectory, '.github', 'workflows', 'security.yml'));

  // Exercise shipped commands on the packed default, then on consumer-owned customization.
  const runConsumer = async (commands: string[]) => {
    for (const command of commands) {
      await execute('npm', ['run', command], { cwd: defaultDirectory, maxBuffer: 20 * 1024 * 1024 });
    }
  };
  await runConsumer(['test', 'build', 'validate:build']);
  await execute('npm', ['exec', '--', 'playwright', 'install', '--with-deps', 'chromium'], {
    cwd: defaultDirectory,
    maxBuffer: 20 * 1024 * 1024,
  });
  const starterTests = await readdir(join(packageDirectory, 'fixtures', 'starter-tests'));
  for (const name of starterTests) {
    await copyFile(
      join(packageDirectory, 'fixtures', 'starter-tests', name),
      join(defaultDirectory, 'tests', `starter-${name}`),
    );
  }
  const runBrowser = () =>
    execute('npm', ['run', 'test:e2e', '--', '--project=chromium', '--workers=2'], {
      cwd: defaultDirectory,
      maxBuffer: 20 * 1024 * 1024,
    });
  await runBrowser();
  for (const name of starterTests) await rm(join(defaultDirectory, 'tests', `starter-${name}`));

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
  await runConsumer(['test', 'build', 'validate:build']);
  await runBrowser();
  console.log('Verified default starter and customized consumer unit, build and Chromium commands.');
  await access(join(defaultDirectory, 'dist/studio/index.html'));
  const customizedArticle = await readFile(join(defaultDirectory, 'dist/articles/our-first-story/index.html'), 'utf8');
  if (
    !customizedArticle.includes('Our first story') ||
    (await exists(join(defaultDirectory, 'dist/about/index.html')))
  ) {
    throw new Error('The customized consumer must build edited content and replace the starter route.');
  }

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

  const gitlabDirectory = join(projectsDirectory, 'gitlab-site');
  await runGenerator(executable, projectsDirectory, [
    'gitlab-site',
    '--yes',
    '--ci-providers',
    'gitlab',
    '--no-install',
    '--no-git',
  ]);
  const gitlab = parse(await readFile(join(gitlabDirectory, '.gitlab-ci.yml'), 'utf8'));
  if (
    gitlab['browser-tests'].needs[0].job !== 'build' ||
    !gitlab.deploy.rules[0].if ||
    gitlab.deploy.pages.publish !== './dist' ||
    gitlab['smoke-deployed'].needs[0].job !== 'deploy' ||
    (await exists(join(gitlabDirectory, '.github/workflows/project.yml')))
  )
    throw new Error('GitLab bootstrap did not select the requested provider');

  const sharedRepository = join(projectsDirectory, 'shared-repository');
  await mkdir(sharedRepository);
  await writeFile(join(sharedRepository, '.gitlab-ci.yml'), 'existing gitlab configuration\n');
  await mkdir(join(sharedRepository, '.github'));
  await writeFile(join(sharedRepository, '.github/dependabot.yml'), 'existing dependency configuration\n');
  await runGenerator(executable, sharedRepository, [
    'site',
    '--yes',
    '--repository-root',
    '.',
    '--ci-prefix',
    'docs',
    '--ci-providers',
    'github,gitlab',
    '--node-version',
    '24',
    '--no-install',
    '--no-git',
  ]);
  const nestedGitlab = parse(await readFile(join(sharedRepository, '.gitlab/ci/docs.yml'), 'utf8'));
  await access(join(sharedRepository, '.github/workflows/docs-project.yml'));
  if (
    nestedGitlab.format.image !== 'node:24' ||
    nestedGitlab.compatibility ||
    nestedGitlab.default.before_script[0] !== "cd 'site'" ||
    nestedGitlab.deploy.rules[0].when !== 'never' ||
    nestedGitlab.deploy.pages.publish !== 'site/dist' ||
    (await readFile(join(sharedRepository, '.gitlab-ci.yml'), 'utf8')) !== 'existing gitlab configuration\n' ||
    (await readFile(join(sharedRepository, '.github/dependabot.yml'), 'utf8')) !== 'existing dependency configuration\n'
  )
    throw new Error('Combined-provider bootstrap did not preserve shared repository configuration');

  const currentDirectory = join(projectsDirectory, 'current-directory-site');
  await mkdir(currentDirectory);
  await runGenerator(executable, currentDirectory, ['.', '--yes', '--no-install', '--no-git']);
  await assertGeneratedProject(currentDirectory, 'current-directory-site');

  const nestedRepository = join(projectsDirectory, 'nested-repository');
  const nestedDirectory = join(nestedRepository, 'website');
  await mkdir(nestedRepository);
  await writeFile(join(nestedRepository, 'README.md'), 'Existing repository content\n');
  const nestedArguments = ['website', '--yes', '--repository-root', '.', '--no-git'];
  const { stdout: nestedOutput } = await runGenerator(executable, nestedRepository, nestedArguments);
  await assertGeneratedProject(nestedDirectory, 'website', nestedRepository);
  const nestedReadme = await readFile(join(nestedRepository, 'README.md'), 'utf8');
  if (nestedReadme !== 'Existing repository content\n' || (await exists(join(nestedDirectory, '.github')))) {
    throw new Error('Nested fixture did not preserve repository content or configure repository automation.');
  }
  if (!nestedOutput.includes('Dependencies: installed')) {
    throw new Error('Nested fixture did not install dependencies from its project root.');
  }
  // The nested layout and custom base URL need their own production build contract.
  await execute('npm', ['run', 'build'], { cwd: nestedDirectory, maxBuffer: 20 * 1024 * 1024 });
  await execute('npm', ['run', 'validate:build'], { cwd: nestedDirectory, maxBuffer: 20 * 1024 * 1024 });
  await access(join(nestedDirectory, 'dist', 'index.html'));

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

  const prefixedPagesDirectory = join(projectsDirectory, 'prefixed-pages');
  const prefixedPagesUrl = 'https://example.gitlab.io/site/staging/';
  await runGenerator(executable, projectsDirectory, [
    'prefixed-pages',
    '--yes',
    '--no-install',
    '--no-git',
    '--ci-providers',
    'github,gitlab',
    '--primary-ci',
    'gitlab',
    '--deployment',
    JSON.stringify({
      name: 'staging',
      sourceBranch: 'dev',
      target: 'gitlab-pages',
      pathPrefix: 'staging',
      url: prefixedPagesUrl,
    }),
  ]);
  const prefixedGuide = await readFile(join(prefixedPagesDirectory, 'README.md'), 'utf8');
  if (!prefixedGuide.includes('Premium or Ultimate') || !prefixedGuide.includes('pathPrefix: staging'))
    throw new Error('Prefixed Pages must document its capability requirement and persistent prefix.');
  const prefixedPipeline = parse(await readFile(join(prefixedPagesDirectory, '.gitlab-ci.yml'), 'utf8')) as {
    deploy: { pages: { path_prefix?: string; expire_in?: string }; environment: { url: string } };
  };
  const prefixedValidation = parse(await readFile(join(prefixedPagesDirectory, '.gitlab-ci.yml'), 'utf8')) as Record<
    string,
    { rules?: Array<{ when?: string }> }
  >;
  if (prefixedValidation.build?.rules?.[0]?.when !== 'on_success')
    throw new Error('Single-environment GitLab consumer jobs must admit workflow-approved merge requests.');
  const { site: prefixedSiteConfig } = (await import(
    pathToFileURL(join(prefixedPagesDirectory, 'src', 'config', 'site.ts')).href
  )) as { site: { url: string } };
  if (
    prefixedPipeline.deploy.pages.path_prefix !== 'staging' ||
    prefixedPipeline.deploy.pages.expire_in !== 'never' ||
    prefixedPipeline.deploy.environment.url !== prefixedPagesUrl ||
    prefixedSiteConfig.url !== prefixedPagesUrl
  ) {
    throw new Error('Prefixed Pages must preserve the persistent prefix and matching site/deployment URL.');
  }

  const cloudflareDirectory = join(projectsDirectory, 'cloudflare-site');
  await runGenerator(executable, projectsDirectory, [
    'cloudflare-site',
    '--yes',
    '--no-install',
    '--no-git',
    '--ci-providers',
    'github,gitlab',
    '--deployment',
    JSON.stringify({
      name: 'production',
      sourceBranch: 'main',
      target: 'cloudflare-pages',
      project: 'example-site',
      url: 'https://example-site.pages.dev',
    }),
    '--deployment',
    JSON.stringify({
      name: 'staging',
      sourceBranch: 'dev',
      target: 'cloudflare-pages',
      project: 'staging-site',
      url: 'https://staging.example.com/preview/',
    }),
  ]);
  const generatorMetadata = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) as {
    devDependencies: Record<string, string>;
  };
  const cloudflareGuide = await readFile(join(cloudflareDirectory, 'README.md'), 'utf8');
  for (const expected of ['staging-site', 'sourceBranch: dev', 'CLOUDFLARE_API_TOKEN', 'PUBLIC_SITE_URL'])
    if (!cloudflareGuide.includes(expected)) throw new Error(`Cloudflare deployment guide is missing ${expected}.`);
  const cloudflareMetadata = JSON.parse(await readFile(join(cloudflareDirectory, 'package.json'), 'utf8')) as {
    devDependencies: Record<string, string>;
  };
  const cloudflareLock = JSON.parse(await readFile(join(cloudflareDirectory, 'package-lock.json'), 'utf8')) as {
    packages: Record<string, { version?: string; integrity?: string; devDependencies?: Record<string, string> }>;
  };
  const wrangler = cloudflareLock.packages['node_modules/wrangler'];
  if (
    !cloudflareMetadata.devDependencies.wrangler ||
    cloudflareMetadata.devDependencies.wrangler !== generatorMetadata.devDependencies.wrangler ||
    cloudflareLock.packages['']?.devDependencies?.wrangler !== cloudflareMetadata.devDependencies.wrangler ||
    !wrangler?.version ||
    !wrangler.integrity ||
    (await exists(join(cloudflareDirectory, 'node_modules'))) ||
    (await exists(join(cloudflareDirectory, 'tools', 'cloudflare')))
  ) {
    throw new Error('Cloudflare bootstrap must resolve Wrangler in the site lockfile without installing dependencies.');
  }
  await runGenerator('npm', cloudflareDirectory, ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  await runGenerator('npm', cloudflareDirectory, ['run', 'audit:unused']);
  await runGenerator('npm', cloudflareDirectory, ['run', 'format']);
  await runGenerator('npm', cloudflareDirectory, ['run', 'lint:markdown']);
  const stagingUrl = 'https://staging.example.com/preview/';
  await execute('npm', ['run', 'build'], {
    cwd: cloudflareDirectory,
    env: { ...process.env, PUBLIC_SITE_URL: stagingUrl },
    maxBuffer: 10 * 1024 * 1024,
  });
  await runGenerator('npm', cloudflareDirectory, ['run', 'typecheck']);
  const canonicalLinkPattern = /<link rel="canonical" href="([^"]+)"/u;
  const builtHome = await readFile(join(cloudflareDirectory, 'dist', 'index.html'), 'utf8');
  if (canonicalLinkPattern.exec(builtHome)?.[1] !== stagingUrl)
    throw new Error('The staging artifact must use its selected canonical URL and base path.');
  const { stdout: selectedNodeUrl } = await execute(
    process.execPath,
    ['--input-type=module', '-e', "import { site } from './src/config/site.ts'; console.log(site.url);"],
    {
      cwd: cloudflareDirectory,
      env: { ...process.env, PUBLIC_SITE_URL: stagingUrl },
    },
  );
  if (selectedNodeUrl.trim() !== stagingUrl)
    throw new Error('Node-based browser and Lighthouse tooling must use the same selected canonical URL.');
  const { stdout: wranglerVersion } = await execute(
    process.execPath,
    [join(cloudflareDirectory, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), '--version'],
    {
      cwd: cloudflareDirectory,
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_LOG_PATH: join(fixtureDirectory, 'wrangler.log'),
      },
    },
  );
  if (!wranglerVersion.includes(wrangler.version)) {
    throw new Error('The installed deployment CLI must match the resolved Wrangler version.');
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

  console.log(`Verified ${tarball} across 11 isolated generator behavior fixtures and consumer customization.`);
} finally {
  await rm(fixtureDirectory, { recursive: true, force: true });
}
