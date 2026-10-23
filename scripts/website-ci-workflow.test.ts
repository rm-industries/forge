import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { generationOptionsSchema } from '../packages/create-forge/src/ci/generation-options.ts';
import { createGithubWorkflows } from '../packages/create-forge/src/ci/github.ts';

interface Step {
  run?: string | undefined;
  uses?: string | undefined;
  with?: Record<string, unknown> | undefined;
}

interface Job {
  if?: string | boolean | undefined;
  outputs?: Record<string, string> | undefined;
  needs?: string | string[] | undefined;
  steps?: Step[] | undefined;
  uses?: string | undefined;
}

interface Workflow {
  on: {
    push?: { paths?: string[] | undefined } | null | undefined;
    pull_request?: { paths?: string[] | undefined } | null | undefined;
    schedule?: { cron: string }[] | undefined;
    workflow_dispatch?: null | undefined;
  };
  concurrency?:
    | {
        'cancel-in-progress'?: string | boolean | undefined;
      }
    | undefined;
  jobs: Record<string, Job>;
}

const readWorkflow = (path: string): Workflow =>
  parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Workflow;

const website = readWorkflow('../.github/workflows/website.yml');
const project = readWorkflow('../.github/workflows/project.yml');
const automation = readWorkflow('../.github/workflows/automation.yml');
const template = createGithubWorkflows(
  generationOptionsSchema.parse({
    directory: '.',
    repositoryRoot: '.',
    providers: ['github'],
    primary: 'github',
    securityMinute: 17,
    automationMinute: 43,
  }),
  (action) => ({ ref: `${action}@${'a'.repeat(40)}` }),
).project;

const dependencies = (job: Job): string[] => (Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : []);

const job = (workflow: Workflow, name: string): Job => {
  const selected = workflow.jobs[name];
  if (!selected) throw new Error(`Workflow job not found: ${name}`);
  return selected;
};

const steps = (workflow: Workflow, name: string): Step[] => job(workflow, name).steps ?? [];

const commands = (workflow: Workflow): string[] =>
  Object.values(workflow.jobs).flatMap((job) => (job.steps ?? []).flatMap((step) => (step.run ? [step.run] : [])));

const download = (workflow: Workflow, job: string, name: string, path: string) => {
  expect(
    steps(workflow, job).find((step) => step.uses?.startsWith('actions/download-artifact@') && step.with?.name === name)
      ?.with,
  ).toMatchObject({
    name,
    path,
  });
};

describe('generated website CI contract', () => {
  const sourceJobs = [
    'format',
    'lint-code',
    'lint-styles',
    'lint-markdown',
    'spellcheck',
    'audit-unused',
    'typecheck',
    'unit-tests',
  ];

  it('runs source checks independently and builds only after they pass', () => {
    for (const name of sourceJobs) expect(dependencies(job(template, name))).toEqual(['select']);
    expect(dependencies(job(template, 'build')).sort()).toEqual(['select', ...sourceJobs].sort());
    expect(steps(template, 'build').filter((step) => step.run === 'npm run build')).toHaveLength(1);
  });

  it('reuses the production artifact for every build consumer', () => {
    for (const consumer of ['validate-build', 'browser-tests', 'lighthouse']) {
      expect(dependencies(job(template, consumer))).toEqual(['select', 'build']);
      download(template, consumer, 'build-dist', './dist');
      expect(steps(template, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });

  it('deploys only after all checks and smoke-tests the live site', () => {
    expect(template.jobs).not.toHaveProperty('project');
    expect(dependencies(job(template, 'deploy'))).toEqual(
      expect.arrayContaining([...sourceJobs, 'build', 'validate-build', 'browser-tests', 'lighthouse']),
    );
    expect(dependencies(job(template, 'smoke-deployed'))).toEqual(['deploy']);
    expect(template.concurrency?.['cancel-in-progress']).toBe("${{ github.event_name == 'pull_request' }}");
  });
});

describe('Forge website CI contract', () => {
  const sourceJobs = [
    'format',
    'spellcheck',
    'lint-code',
    'lint-styles',
    'lint-markdown',
    'audit-unused',
    'typecheck',
    'unit-tests',
  ];

  it('owns native website inputs and full browser validation', () => {
    for (const event of ['push', 'pull_request'] as const) {
      expect(website.on[event]?.paths).toEqual(
        expect.arrayContaining([
          'website/**',
          'docs/**',
          '.github/workflows/website.yml',
          '.github/actions/setup-project/**',
        ]),
      );
    }
    for (const name of sourceJobs) {
      expect(dependencies(job(website, name))).toEqual([]);
      expect(job(website, name).if).toBeUndefined();
    }
    expect(commands(website)).toContain('npx playwright install --with-deps chromium firefox webkit');
    expect(commands(website)).toContain('npm run test:e2e');
    expect(commands(website).join('\n')).not.toContain('--project=chromium');
    expect(dependencies(job(website, 'build')).sort()).toEqual([...sourceJobs].sort());
  });

  it('builds once and reuses the production artifact for every validation consumer', () => {
    expect(commands(website).filter((command) => command.includes('npm run build'))).toEqual(['npm run build']);
    for (const consumer of ['validate-build', 'browser-tests', 'lighthouse']) {
      expect(dependencies(job(website, consumer))).toEqual(['build']);
      download(website, consumer, 'website-build', 'website/dist');
      expect(steps(website, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });

  it('gates deployment on quality, build, browsers and budgets, then smoke-tests the live site', () => {
    expect(dependencies(job(website, 'deploy')).sort()).toEqual(
      [...sourceJobs, 'build', 'validate-build', 'browser-tests', 'lighthouse'].sort(),
    );
    const mainPush = "github.event_name == 'push' && github.ref == 'refs/heads/main'";
    expect(job(website, 'deploy').if).toBe(mainPush);
    expect(job(website, 'smoke-deployed').if).toBe(mainPush);
    expect(dependencies(job(website, 'smoke-deployed'))).toEqual(['deploy']);
    expect(job(website, 'smoke-deployed')).toHaveProperty('timeout-minutes', 10);
    expect(steps(website, 'smoke-deployed').find((step) => step.run?.includes('test:smoke'))?.run).toBe(
      'test -n "$DEPLOYMENT_URL"\nnpm run test:smoke\n',
    );
    const pages = steps(website, 'build').find((step) => step.uses?.startsWith('actions/upload-pages-artifact@'));
    expect(pages).toMatchObject({ if: mainPush, with: { path: 'website/dist' } });
    expect(job(website, 'deploy')).toMatchObject({
      permissions: { pages: 'write', 'id-token': 'write' },
      environment: { name: 'github-pages' },
    });
    expect(
      steps(website, 'browser-tests').find((step) => step.uses?.startsWith('actions/upload-artifact@')),
    ).toMatchObject({ if: 'always()', with: { 'if-no-files-found': 'ignore' } });
    expect(website.concurrency?.['cancel-in-progress']).toBe("${{ github.event_name == 'pull_request' }}");
  });
});

it('keeps repository automation scoped to maintained workflows', () => {
  expect(commands(automation)).toEqual([]);
  expect(steps(automation, 'security').at(-1)?.with?.inputs).toBe('.github');
  expect(project.jobs).not.toHaveProperty('project');
});

it('restores generated workflow scan inputs inside the Docker scanner workspace', () => {
  const cli = readWorkflow('../.github/workflows/create-forge.yml');
  const restore = steps(cli, 'security').find((step) => step.run?.includes('tar -xzf'));
  expect(restore?.run).toContain('mkdir -p .ci-consumer');
  expect(restore?.run).toContain('-C .ci-consumer');
  expect(steps(cli, 'security').at(-1)?.with?.inputs).toBe('.ci-consumer/.github');
});
