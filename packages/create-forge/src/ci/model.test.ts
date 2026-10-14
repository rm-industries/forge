import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';
import { Document } from 'yaml';

import { generationOptionsSchema } from './generation-options.ts';
import { createGithubWorkflows } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';
import { defineWork, siteWork, nonEmptyStringSchema, nonEmptyStringsSchema, imageSchema } from './model.ts';
import { githubJobSchema, githubWorkflowSchema, gitlabPipelineSchema, validateCiYaml } from './schema.ts';

const duplicateYamlKeyMessagePattern = /unique/i;
const invalidProviderDefinitionMessagePattern = /duplicate|Unrecognized|Invalid/i;

const config = generationOptionsSchema.parse({
  directory: 'website',
  repositoryRoot: '..',
  prefix: 'website',
  providers: ['github', 'gitlab'],
  primary: 'github',
  securityMinute: 17,
  automationMinute: 43,
});
const pins = (action: string) => ({ ref: `${action}@${'a'.repeat(40)}` });

describe('shared work and provider rendering', () => {
  test('generates one selected runtime without consumer compatibility jobs', () => {
    const selected = generationOptionsSchema.parse({ ...config, nodeVersion: '24' });
    const github = createGithubWorkflows(selected, pins).project;
    expect(github.jobs).not.toHaveProperty('compatibility');
    expect(
      github.jobs.format!.steps.find((step) => 'uses' in step && step.uses.startsWith('actions/setup-node@')),
    ).toMatchObject({ with: { 'node-version': '24' } });
    const gitlab = createGitlabPipeline(selected);
    expect(gitlab).not.toHaveProperty('compatibility');
    expect(gitlab.format).toMatchObject({ image: 'node:24' });
    expect(generationOptionsSchema.parse(config).nodeVersion).toBe('26');
    expect(() => generationOptionsSchema.parse({ ...config, nodeVersion: '20' })).toThrow('Invalid option');
  });
  test('validates reusable strings, command lists and image references', () => {
    expect(nonEmptyStringSchema.parse('  npm run build  ')).toBe('npm run build');
    expect(() => nonEmptyStringSchema.parse('  ')).toThrow('Too small');
    expect(() => nonEmptyStringsSchema.parse([])).toThrow('Too small');
    expect(() => nonEmptyStringsSchema.parse(['true', ' '])).toThrow('Too small');
    expect(imageSchema.parse('node:26')).toBe('node:26');
    expect(() => imageSchema.parse('node:26; echo unsafe')).toThrow('Invalid string: must match pattern');
  });
  test('requires build artifacts before running site build consumers', () => {
    expect(siteWork.build!.artifacts).toContain('dist');
    for (const work of Object.values(siteWork).filter((work) => work.browsers.length > 0))
      expect(work.needs).toContain('build');
  });
  test('filters workflow validation while keeping project and security checks unconditional', () => {
    const workflows = createGithubWorkflows(config, pins);
    for (const event of ['push', 'pull_request'] as const) {
      expect(workflows.automation.on[event]).toEqual({ branches: ['main'], paths: ['.github/**'] });
      expect(workflows.project.on[event]).toEqual({ branches: ['main'] });
      expect(workflows.security.on[event]).toEqual({ branches: ['main'] });
    }
    expect(workflows.automation.on.schedule).toEqual([{ cron: '43 5 * * 1' }]);
  });
  test('rejects missing dependencies and cycles', () => {
    expect(() => defineWork({ a: { name: 'A', commands: ['true'], needs: ['missing'] } })).toThrow(
      'Unknown dependency',
    );
    expect(() =>
      defineWork({
        a: { name: 'A', commands: ['true'], needs: ['b'] },
        b: { name: 'B', commands: ['true'], needs: ['a'] },
      }),
    ).toThrow('cycle');
  });
  test('keeps Pages in the validated run and preserves native environments and outputs', () => {
    const { project } = createGithubWorkflows(config, pins);
    expect(project.on).not.toHaveProperty('workflow_run');
    expect(project.jobs).not.toHaveProperty('project');
    expect(project.jobs.deploy!.needs).toEqual(Object.keys(siteWork));
    expect(project.jobs.deploy!.environment!.name).toBe('github-pages');
    expect(project.jobs.deploy!.outputs!['page-url']).toBe('${{ steps.deployment.outputs.page_url }}');
    expect(project.jobs['browser-tests']!.steps.some((step) => 'run' in step && step.run === 'npm run build')).toBe(
      false,
    );
    expect(
      project.jobs['browser-tests']!.steps.some(
        (step) => 'uses' in step && step.uses.startsWith('actions/download-artifact@'),
      ),
    ).toBe(true);
    expect(project.defaults!.run['working-directory']).toBe('website');
    expect(validateCiYaml(githubWorkflowSchema, new Document(project).toString())).toContain('github-pages');
  });
  test('renders GitLab dependencies, artifact paths and duplicate pipeline suppression', () => {
    const pipeline = createGitlabPipeline(config, Object.fromEntries(Object.entries(siteWork).reverse()));
    expect(pipeline.stages).toEqual(['validate', 'build', 'verify', 'deploy', 'smoke']);
    const browser = pipeline['browser-tests'];
    expect(browser).toMatchObject({
      needs: [{ job: 'build', artifacts: true }],
      stage: 'verify',
      artifacts: { paths: ['website/playwright-report', 'website/test-results'] },
    });
    expect(pipeline).not.toHaveProperty('compatibility');
    expect(pipeline).not.toHaveProperty('dependency-audit');
    expect(pipeline.build).toHaveProperty('artifacts.when', 'on_success');
    expect(pipeline.workflow.rules[2]).toMatchObject({ when: 'never' });
    validateCiYaml(gitlabPipelineSchema, new Document(pipeline).toString());
    expect(() =>
      gitlabPipelineSchema.parse({
        ...pipeline,
        build: { ...pipeline.build, needs: [{ job: 'browser-tests', artifacts: true }] },
      }),
    ).toThrow('must precede');
  });
  test('publishes GitLab reports with project-relative paths, including nested projects', () => {
    const pipeline = createGitlabPipeline(config);
    expect(pipeline['unit-tests']).toHaveProperty('artifacts.reports', {
      junit: 'website/test-results/unit.xml',
      coverage_report: { coverage_format: 'cobertura', path: 'website/coverage/cobertura-coverage.xml' },
    });
    expect(pipeline['browser-tests']).toHaveProperty('artifacts.reports.junit', 'website/test-results/browser.xml');
    expect(pipeline['smoke-deployed']).toHaveProperty('artifacts.reports.junit', 'website/test-results/smoke.xml');
    expect(pipeline['lint-code']).toHaveProperty(
      'artifacts.reports.codequality',
      'website/test-results/code-quality.json',
    );
    for (const id of ['unit-tests', 'browser-tests', 'smoke-deployed', 'lint-code']) {
      expect(pipeline[id]).toHaveProperty('artifacts.when', 'always');
    }
    const lint = pipeline['lint-code'] as { script: string[] };
    expect(lint.script.join('\n')).toContain('exit "$status"');
    expect(lint.script.join('\n')).toContain('--format gitlab');
    expect(createGithubWorkflows(config, pins).project.jobs['lint-code']!.steps).toContainEqual({
      run: 'npm run lint:code -- --format github',
    });
  });
  test('configures the installed Chromium for GitLab Lighthouse root containers only', () => {
    const gitlab = createGitlabPipeline(config);
    expect(gitlab.lighthouse).toHaveProperty(
      'variables.LHCI_COLLECT__SETTINGS__CHROME_FLAGS',
      '--no-sandbox --disable-dev-shm-usage --disable-gpu',
    );
    const script = (gitlab.lighthouse as { script: string[] }).script;
    expect(script[0]).toBe('npx playwright install --with-deps chromium');
    expect(script[1]).toContain('export CHROME_PATH=');
    expect(script[1]).toContain('chromium.executablePath()');
    expect(script[2]).toBe('npm run lighthouse:ci');
    expect(gitlab['browser-tests']).not.toHaveProperty('variables');
    expect(JSON.stringify(createGithubWorkflows(config, pins))).not.toContain(
      '--no-sandbox --disable-dev-shm-usage --disable-gpu',
    );
  });
  test('retains failed lint findings and their exit status while rebasing nested project paths', () => {
    const directory = mkdtempSync(join(tmpdir(), 'forge-lint-report-'));
    try {
      mkdirSync(join(directory, 'bin'));
      writeFileSync(
        join(directory, 'bin', 'npm'),
        '#!/bin/sh\nprintf \'[{"location":{"path":"src/example.ts"}}]\\n\'\nexit 1\n',
        { mode: 0o755 },
      );
      const lint = createGitlabPipeline(config)['lint-code'] as { script: string[] };
      const result = spawnSync('bash', ['-ec', lint.script.join('\n')], {
        cwd: directory,
        env: { ...process.env, PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(JSON.parse(readFileSync(join(directory, 'test-results/code-quality.json'), 'utf8'))).toEqual([
        { location: { path: 'website/src/example.ts' } },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  test('fails dependency review on high severity findings instead of treating it as advisory', () => {
    const review = createGithubWorkflows(config, pins).security.jobs['dependency-review']!;
    expect(review.if).toBe("github.event_name == 'pull_request'");
    const action = review.steps.find(
      (step) => 'uses' in step && step.uses.startsWith('actions/dependency-review-action@'),
    );
    expect(action).toMatchObject({ with: { 'fail-on-severity': 'high' } });
    expect(action).not.toHaveProperty('continue-on-error');
  });
  test('bounds smoke tests and rejects a missing deployment URL before running them', () => {
    const smoke = createGithubWorkflows(config, pins).project.jobs['smoke-deployed']!;
    expect(smoke).toHaveProperty('timeout-minutes', 10);
    expect(smoke.steps.find((step) => 'run' in step && step.run.includes('npm run test:smoke'))).toMatchObject({
      run: 'test -n "$DEPLOYMENT_URL"\nnpm run test:smoke',
    });
    const gitlab = createGitlabPipeline({ ...config, primary: 'gitlab' });
    expect(gitlab['smoke-deployed']).toMatchObject({ timeout: '10m' });
    expect(gitlab['smoke-deployed']!.script).toContain('test -n "$CI_PAGES_URL"');
  });
  test('keeps deployment exclusive to the primary provider', () => {
    const github = createGithubWorkflows({ ...config, primary: 'gitlab' }, pins).project;
    expect(github.jobs.deploy!.if).toBe(false);
    expect(github.jobs['smoke-deployed']!.if).toBe(false);
    expect(
      github.jobs.build!.steps.find((step) => 'uses' in step && step.uses.startsWith('actions/upload-pages-artifact@'))!
        .if,
    ).toBe(false);
    const inactive = createGitlabPipeline(config);
    expect(inactive.deploy).toMatchObject({ rules: [{ when: 'never' }], pages: { publish: 'website/dist' } });
    expect(inactive['smoke-deployed']).toMatchObject({ rules: [{ when: 'never' }] });
    const active = createGitlabPipeline({ ...config, primary: 'gitlab' });
    expect(active.deploy).toMatchObject({
      needs: Object.keys(siteWork).map((job) => ({ job, artifacts: job === 'build' })),
    });
    expect(active.deploy).toHaveProperty('rules.0.if');
    expect(active['smoke-deployed']).toMatchObject({ needs: [{ job: 'deploy', artifacts: false }] });
    const { primary: _primary, ...validationOnly } = config;
    expect(createGithubWorkflows(validationOnly, pins).project.jobs.deploy!.if).toBe(false);
    expect(createGitlabPipeline(validationOnly).deploy).toMatchObject({ rules: [{ when: 'never' }] });
  });
  test('rejects malformed YAML, unknown provider fields, mutable actions, and dangling job dependencies', () => {
    expect(() => validateCiYaml(githubWorkflowSchema, 'name: one\nname: two\n')).toThrow(
      duplicateYamlKeyMessagePattern,
    );
    const workflow = createGithubWorkflows(config, pins).project;
    expect(() => githubWorkflowSchema.parse({ ...workflow, unexpected: true })).toThrow(
      invalidProviderDefinitionMessagePattern,
    );
    expect(() =>
      githubJobSchema.parse({ ...workflow.jobs.format, steps: [{ uses: 'actions/checkout@main' }] }),
    ).toThrow(invalidProviderDefinitionMessagePattern);
    expect(() =>
      githubWorkflowSchema.parse({
        ...workflow,
        jobs: { ...workflow.jobs, format: { ...workflow.jobs.format, needs: ['missing'] } },
      }),
    ).toThrow('Unknown job dependency');
  });
});

test('renders an explicit native deployment environment without enabling the mirrored target', () => {
  const githubConfig = generationOptionsSchema.parse({
    ...config,
    deployments: [{ name: 'staging', sourceBranch: 'dev', target: 'github-pages', url: 'https://staging.example.com' }],
  });
  const github = createGithubWorkflows(githubConfig, pins).project;
  expect(github.on.push).toEqual({ branches: ['main', 'dev'] });
  expect(github.jobs.deploy!.environment?.name).toBe('staging');
  expect(github.jobs.deploy!.if).toContain('refs/heads/dev');
  expect(github.jobs.deploy!.if).toContain("github.event_name == 'push'");
  expect(createGitlabPipeline(githubConfig)).not.toHaveProperty('deploy');
  const gitlabConfig = generationOptionsSchema.parse({
    ...config,
    primary: 'gitlab',
    deployments: [{ name: 'staging', sourceBranch: 'dev', target: 'gitlab-pages', url: 'https://staging.example.com' }],
  });
  const gitlab = createGitlabPipeline(gitlabConfig);
  expect(gitlab.deploy).toHaveProperty('environment.name', 'staging');
  expect(gitlab.deploy).toHaveProperty('environment.url', 'https://staging.example.com');
  expect(gitlab.deploy).toHaveProperty(
    'rules.0.if',
    '$CI_COMMIT_BRANCH == "dev" && ($CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "parent_pipeline")',
  );
  expect(createGithubWorkflows(gitlabConfig, pins).project.jobs).not.toHaveProperty('deploy');
});

test('an empty explicit deployment plan generates validation only', () => {
  const selected = generationOptionsSchema.parse({ ...config, deployments: [] });
  expect(createGithubWorkflows(selected, pins).project.jobs).not.toHaveProperty('deploy');
  expect(createGitlabPipeline(selected)).not.toHaveProperty('deploy');
});

test.each([
  ['!dev', '\\!dev'],
  ['release+site', 'release\\+site'],
])('escapes the exact branch %s in GitHub trigger filters', (sourceBranch, filter) => {
  const selected = generationOptionsSchema.parse({
    ...config,
    deployments: [{ name: 'staging', sourceBranch, target: 'github-pages' }],
  });
  const workflow = createGithubWorkflows(selected, pins).project;
  expect(workflow.on.push).toEqual({ branches: ['main', filter] });
  expect(workflow.jobs.deploy!.if).toContain(`refs/heads/${sourceBranch}`);
});

test('disables shared npm caches when project artifacts run on a custom deployment branch', () => {
  const selected = generationOptionsSchema.parse({
    ...config,
    deployments: [{ name: 'staging', sourceBranch: 'dev', target: 'github-pages' }],
  });
  const setupOptions = Object.values(createGithubWorkflows(selected, pins).project.jobs)
    .flatMap((job) => job.steps)
    .filter((step) => 'uses' in step && step.uses.startsWith('actions/setup-node@'))
    .map((step) => ('with' in step ? step.with : undefined));
  expect(setupOptions.length).toBeGreaterThan(0);
  for (const options of setupOptions) {
    expect(options).toHaveProperty('package-manager-cache', false);
    expect(options).not.toHaveProperty('cache');
  }
});

test.each(['github', 'gitlab'] as const)(
  'generates Cloudflare deploy and smoke jobs with %s as sole publisher',
  (primary) => {
    const selected = generationOptionsSchema.parse({
      ...config,
      primary,
      deployments: [
        {
          name: 'production',
          sourceBranch: 'main',
          target: 'cloudflare-pages',
          project: 'example-site',
          url: 'https://example.com',
        },
      ],
    });
    const github = createGithubWorkflows(selected, pins).project;
    const gitlab = createGitlabPipeline(selected);
    expect(github.jobs.deploy).toBeDefined();
    expect(gitlab.deploy).toBeDefined();
    expect(github.jobs.deploy!.if).toBe(
      primary === 'github' ? "github.event_name == 'push' && github.ref == 'refs/heads/main'" : false,
    );
    expect(gitlab.deploy).toHaveProperty(
      primary === 'gitlab' ? 'rules.0.if' : 'rules.0.when',
      primary === 'gitlab'
        ? '$CI_COMMIT_BRANCH == "main" && ($CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "parent_pipeline")'
        : 'never',
    );
    expect(github.jobs.deploy!.permissions).toEqual({ contents: 'read' });
    expect(github.jobs.deploy!.needs).toEqual(Object.keys(siteWork));
    expect(
      github.jobs.deploy!.steps.some((step) => 'uses' in step && step.uses.startsWith('actions/download-artifact@')),
    ).toBe(true);
    const commands = github.jobs.deploy!.steps.flatMap((step) => ('run' in step ? [step.run] : [])).join('\n');
    expect(commands).toContain("--project-name 'example-site'");
    expect(commands).toContain('node_modules/wrangler/bin/wrangler.js');
    expect(commands).not.toContain('npm run build');
    expect(gitlab.deploy).not.toHaveProperty('pages');
    expect(gitlab.deploy).toHaveProperty('resource_group', 'production-example-site');
    expect(gitlab['smoke-deployed']).toHaveProperty('variables.DEPLOYMENT_URL', 'https://example.com');
    expect(github.jobs['smoke-deployed']!.steps.some((step) => step.env?.CLOUDFLARE_API_TOKEN)).toBe(false);
  },
);

test('renders persistent prefixed GitLab Pages with matching smoke URL and branch gate', () => {
  const selected = generationOptionsSchema.parse({
    ...config,
    primary: 'gitlab',
    deployments: [
      {
        name: 'staging',
        sourceBranch: 'dev',
        target: 'gitlab-pages',
        pathPrefix: 'staging',
        url: 'https://example.gitlab.io/site/staging/',
      },
    ],
  });
  const pipeline = createGitlabPipeline(selected);
  expect(pipeline.deploy).toHaveProperty('pages.path_prefix', 'staging');
  expect(pipeline.deploy).toHaveProperty('pages.expire_in', 'never');
  expect(pipeline['smoke-deployed']).toHaveProperty(
    'variables.DEPLOYMENT_URL',
    'https://example.gitlab.io/site/staging/',
  );
  expect(pipeline.deploy).toHaveProperty(
    'rules.0.if',
    '$CI_COMMIT_BRANCH == "dev" && ($CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "parent_pipeline")',
  );
});

test.each(['github', 'gitlab'] as const)('validates once and gates named environments under primary %s', (primary) => {
  const selected = generationOptionsSchema.parse({
    ...config,
    primary,
    deployments: [
      {
        name: 'production',
        sourceBranch: 'main',
        target: 'cloudflare-pages',
        project: 'production-site',
        url: 'https://example.com',
      },
      {
        name: 'staging',
        sourceBranch: 'dev',
        target: 'cloudflare-pages',
        project: 'staging-site',
        url: 'https://staging.example.com',
      },
    ],
  });
  const github = createGithubWorkflows(selected, pins).project;
  const gitlab = createGitlabPipeline(selected);
  expect(github.jobs).not.toHaveProperty('deploy');
  expect(github.jobs['deploy-staging']).toHaveProperty('environment.name', 'staging');
  expect(github.jobs['smoke-staging']).toHaveProperty('needs', ['deploy-staging']);
  expect(github.jobs.build).toHaveProperty('env.PUBLIC_SITE_URL');
  expect(github.on.push?.branches).toEqual(['main', 'dev']);
  expect(gitlab['smoke-staging']).toHaveProperty('needs', [{ job: 'deploy-staging', artifacts: false }]);
  expect(gitlab.build).toHaveProperty('rules.1.variables.PUBLIC_SITE_URL', 'https://staging.example.com');
  expect(github.jobs['deploy-staging']).toHaveProperty(
    'if',
    primary === 'github' ? "github.event_name == 'push' && github.ref == 'refs/heads/dev'" : false,
  );
  expect(gitlab['deploy-staging']).toHaveProperty(
    primary === 'gitlab' ? 'rules.0.if' : 'rules.0.when',
    primary === 'gitlab'
      ? '$CI_COMMIT_BRANCH == "dev" && ($CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "parent_pipeline")'
      : 'never',
  );
});

test('combines Cloudflare and GitHub Pages without losing the native artifact upload', () => {
  const selected = generationOptionsSchema.parse({
    ...config,
    deployments: [
      {
        name: 'staging',
        sourceBranch: 'dev',
        target: 'cloudflare-pages',
        project: 'staging-site',
        url: 'https://staging.example.com',
      },
      { name: 'production', sourceBranch: 'main', target: 'github-pages', url: 'https://example.com' },
    ],
  });
  const workflows = createGithubWorkflows(selected, pins);
  expect(workflows.project.jobs['deploy-production']).toHaveProperty('environment.name', 'production');
  expect(
    workflows.project.jobs.build!.steps.filter(
      (step) => 'uses' in step && step.uses.startsWith('actions/upload-pages-artifact@'),
    ),
  ).toHaveLength(1);
  expect(workflows.security.on.pull_request?.branches).toEqual(['main', 'dev']);
  expect(workflows.automation.on.push?.paths).toEqual(['.github/**']);
});

test('combines root and prefixed GitLab Pages with independent persistent deployment jobs', () => {
  const selected = generationOptionsSchema.parse({
    ...config,
    primary: 'gitlab',
    deployments: [
      { name: 'production', sourceBranch: 'main', target: 'gitlab-pages', url: 'https://example.gitlab.io/site/' },
      {
        name: 'staging',
        sourceBranch: 'dev',
        target: 'gitlab-pages',
        pathPrefix: 'staging',
        url: 'https://example.gitlab.io/site/staging/',
      },
    ],
  });
  const pipeline = createGitlabPipeline(selected);
  expect(pipeline['deploy-production']).not.toHaveProperty('pages.path_prefix');
  expect(pipeline['deploy-staging']).toHaveProperty('pages.path_prefix', 'staging');
  expect(pipeline['deploy-staging']).toHaveProperty('pages.expire_in', 'never');
  expect(pipeline['deploy-staging']).toHaveProperty('resource_group', 'staging-gitlab-pages');
});

test.each([undefined, [{ name: 'production', sourceBranch: 'main', target: 'gitlab-pages' as const }], []])(
  'admits validation jobs into workflow-approved merge requests for single/default plans',
  (deployments) => {
    const selected = generationOptionsSchema.parse({ ...config, primary: 'gitlab', deployments });
    const pipeline = createGitlabPipeline(selected);
    for (const id of Object.keys(siteWork)) expect(pipeline[id]).toHaveProperty('rules', [{ when: 'on_success' }]);
    expect(pipeline.workflow.rules[0]).toHaveProperty('if', '$CI_PIPELINE_SOURCE == "merge_request_event"');
    expect(Boolean(pipeline.deploy)).toBe(deployments?.length !== 0);
  },
);

test('matches the pinned reference website build-once validation contract', () => {
  // rahul0705.github.io 871697a: eight source gates, one build, artifact-consuming verification.
  const pipeline = createGitlabPipeline(config);
  const build = pipeline.build as { needs: Array<{ job: string }>; artifacts: { paths: string[] } };
  expect(build.needs.map((need) => need.job).sort()).toEqual([
    'audit-unused',
    'format',
    'lint-code',
    'lint-markdown',
    'lint-styles',
    'spellcheck',
    'typecheck',
    'unit-tests',
  ]);
  expect(build.artifacts.paths).toEqual(['website/dist']);
  for (const id of ['browser-tests', 'lighthouse', 'validate-build'])
    expect(pipeline[id]).toHaveProperty('needs', [{ job: 'build', artifacts: true }]);
  expect(pipeline['unit-tests']).toHaveProperty('artifacts.reports.junit', 'website/test-results/unit.xml');
  expect(pipeline['lint-code']).toHaveProperty(
    'artifacts.reports.codequality',
    'website/test-results/code-quality.json',
  );
  expect(pipeline.deploy).toHaveProperty('rules', [{ when: 'never' }]);
  expect(pipeline['smoke-deployed']).toHaveProperty('rules', [{ when: 'never' }]);
});

test.each(['.', 'website'])('keeps native and Cloudflare smoke uploads scoped to evidence in %s', (directory) => {
  const native = createGithubWorkflows({ ...config, directory }, pins).project;
  const cloudflare = createGithubWorkflows(
    generationOptionsSchema.parse({
      ...config,
      directory,
      deployments: [
        {
          name: 'production',
          sourceBranch: 'main',
          target: 'cloudflare-pages',
          project: 'example-site',
          url: 'https://example.com',
        },
      ],
    }),
    pins,
  ).project;
  for (const project of [native, cloudflare]) {
    const uploads = project.jobs['smoke-deployed']!.steps.filter(
      (step) => 'uses' in step && step.uses.startsWith('actions/upload-artifact@'),
    );
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toHaveProperty('with.path', `${directory}/playwright-report\n${directory}/test-results`);
  }
});
