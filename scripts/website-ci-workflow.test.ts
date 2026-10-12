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
  needs?: string | string[] | undefined;
  steps?: Step[] | undefined;
  uses?: string | undefined;
}

interface Workflow {
  on: {
    push?: { paths?: string[] | undefined } | null | undefined;
    pull_request?: { paths?: string[] | undefined } | null | undefined;
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
const generator = readWorkflow('../.github/workflows/generator.yml');
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
  expect(steps(workflow, job).find((step) => step.uses?.startsWith('actions/download-artifact@'))?.with).toMatchObject({
    name,
    path,
  });
};

describe('generated website CI contract', () => {
  it('watches website content and automation build inputs without filtering required validation', () => {
    for (const event of ['push', 'pull_request'] as const) {
      expect(website.on[event]?.paths).toEqual([
        'website/**',
        'docs/**',
        '.github/workflows/website.yml',
        '.github/actions/setup-project/**',
      ]);
      expect(automation.on[event]?.paths).toEqual(['.github/**']);
      expect(generator.on[event]?.paths).toEqual(
        expect.arrayContaining([
          '.github/**',
          'templates/default/**',
          'packages/create-forge/scripts/**',
          'packages/create-forge/src/**',
          'packages/create-forge/*.config.ts',
          'packages/create-forge/tsconfig.json',
          'tsconfig.json',
          '**/package.json',
          '**/package-lock.json',
        ]),
      );
      expect(project.on[event]).not.toHaveProperty('paths');
      expect(template.on[event]).not.toHaveProperty('paths');
    }
  });
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
    for (const name of sourceJobs) expect(dependencies(job(template, name))).toEqual([]);
    expect(dependencies(job(template, 'build')).sort()).toEqual([...sourceJobs].sort());
    expect(steps(template, 'build').filter((step) => step.run === 'npm run build')).toHaveLength(1);
  });

  it('reuses the production artifact for every build consumer', () => {
    for (const consumer of ['validate-build', 'browser-tests', 'lighthouse']) {
      expect(dependencies(job(template, consumer))).toEqual(['build']);
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
  it('mirrors the generated workflow graph with website-scoped paths', () => {
    for (const name of ['build', 'validate-build', 'browser-tests', 'lighthouse']) {
      expect(dependencies(job(website, name)).sort()).toEqual(dependencies(job(template, name)).sort());
    }
    expect(commands(website).filter((command) => command.includes('npm run build'))).toEqual(['npm run build']);
    expect(website.concurrency?.['cancel-in-progress']).toBe("${{ github.event_name == 'pull_request' }}");
  });

  it('reuses one website artifact for every build consumer', () => {
    for (const consumer of ['validate-build', 'browser-tests', 'lighthouse']) {
      download(website, consumer, 'website-build', 'website/dist');
      expect(steps(website, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });
});

describe('repository template verification contract', () => {
  it('shares one primary template build with browser and Lighthouse consumers', () => {
    expect(dependencies(job(project, 'template-build')).sort()).toEqual(
      ['template-coverage', 'template-static-quality'].sort(),
    );
    for (const consumer of ['template-browser', 'template-lighthouse']) {
      expect(dependencies(job(project, consumer))).toEqual(['template-build']);
      download(project, consumer, 'template-build', '${{ runner.temp }}/forge-default-template/dist');
      expect(steps(project, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });
});

it('keeps disposable consumer checks separate from repository automation', () => {
  expect(commands(automation)).toEqual([]);
  expect(commands(generator)).toHaveLength(2);
  for (const command of commands(generator)) expect(command).toContain('--name ci-review-fixture');
  expect(steps(automation, 'security').at(-1)?.with?.inputs).toBe('.github');
  expect(steps(generator, 'security').at(-1)?.with?.inputs).toBe('.ci-review-fixture/.github');
});
