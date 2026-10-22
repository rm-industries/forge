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
  if?: string | undefined;
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
  expect(
    steps(workflow, job).find((step) => step.uses?.startsWith('actions/download-artifact@') && step.with?.name === name)
      ?.with,
  ).toMatchObject({
    name,
    path,
  });
};

describe('generated website CI contract', () => {
  it('watches website content and automation build inputs without filtering required validation', () => {
    for (const event of ['push', 'pull_request'] as const) {
      expect(website.on[event]).not.toHaveProperty('paths');
      expect(automation.on[event]?.paths).toEqual(['.github/**']);
      expect(generator.on[event]).not.toHaveProperty('paths');
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
  it('keeps content accessibility and budgets while scheduling broad browser coverage', () => {
    expect(website.on).toHaveProperty('workflow_dispatch');
    expect(website.on.schedule).toHaveLength(1);
    for (const name of [
      'format',
      'spellcheck',
      'lint-code',
      'lint-styles',
      'lint-markdown',
      'audit-unused',
      'typecheck',
      'unit-tests',
    ]) {
      expect(dependencies(job(website, name))).toEqual(['impact']);
      expect(job(website, name).if).toBe("needs.impact.outputs.website == 'true'");
    }
    expect(job(website, 'impact').outputs?.['full-browsers']).toBe('${{ steps.impact.outputs.website-full-browsers }}');
    expect(steps(website, 'browser-tests').find((step) => step.run?.includes('npm run test:e2e'))).toMatchObject({
      env: { FULL_BROWSERS: '${{ needs.impact.outputs.full-browsers }}' },
    });
    expect(commands(website).join('\n')).toContain('npm run test:e2e -- --project=chromium');
    expect(job(website, 'lighthouse').if).toBeUndefined();
    expect(job(website, 'deploy').if).toBe("github.event_name == 'push' && github.ref == 'refs/heads/main'");
  });

  it('selects website work before its production graph', () => {
    for (const name of ['build', 'validate-build', 'browser-tests', 'lighthouse']) {
      expect(
        dependencies(job(website, name))
          .filter((dependency) => dependency !== 'impact')
          .sort(),
      ).toEqual(dependencies(job(template, name)).sort());
    }
    expect(commands(website).filter((command) => command.includes('npm run build'))).toEqual(['npm run build']);
    expect(website.concurrency?.['cancel-in-progress']).toBe("${{ github.event_name == 'pull_request' }}");
  });

  it('matches consumer deployment gates, smoke safeguards and browser evidence policy', () => {
    expect(
      dependencies(job(website, 'deploy'))
        .filter((dependency) => dependency !== 'impact')
        .sort(),
    ).toEqual(dependencies(job(template, 'deploy')).sort());
    expect(job(website, 'smoke-deployed')).toHaveProperty('timeout-minutes', 10);
    expect(steps(website, 'smoke-deployed').find((step) => step.run?.includes('test:smoke'))?.run).toBe(
      'test -n "$DEPLOYMENT_URL"\nnpm run test:smoke\n',
    );
    const evidence = steps(website, 'browser-tests').find((step) => step.uses?.startsWith('actions/upload-artifact@'));
    expect(evidence).toMatchObject({ if: 'always()', with: { 'if-no-files-found': 'ignore' } });
  });

  it('reuses one website artifact for every build consumer', () => {
    for (const consumer of ['validate-build', 'browser-tests', 'lighthouse']) {
      download(website, consumer, 'website-build', 'website/dist');
      expect(steps(website, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });
});

it('keeps package correctness in project CI without repeating root checks or builds in runtime lanes', () => {
  expect(commands(project).filter((command) => command === 'npm run build')).toHaveLength(1);
  expect(steps(project, 'test').at(-1)?.run).toBe('npm run test:root');
  expect(steps(project, 'typecheck').at(-1)?.run).toBe('npm run typecheck:root');
  expect(dependencies(job(project, 'compatibility'))).toEqual(['impact', 'build']);
  expect(
    steps(project, 'compatibility').some((step) =>
      step.run?.includes('npm run typecheck:workspaces && npm run test:workspaces'),
    ),
  ).toBe(true);
  expect(
    steps(project, 'compatibility').some((step) => step.run?.includes('create-forge') && step.run.includes('--yes')),
  ).toBe(false);
});

describe('generator consumer verification contract', () => {
  it('bootstraps once per runtime and reuses the packaged CLI and primary artifacts', () => {
    expect(dependencies(job(generator, 'consumer-compatibility'))).toEqual(['impact', 'package']);
    expect(commands(generator).filter((command) => command.includes('--node-version "$NODE_MAJOR"'))).toHaveLength(1);
    for (const consumer of ['quality', 'validate-build', 'browser', 'lighthouse', 'security', 'syntax']) {
      expect(dependencies(job(generator, consumer))).toEqual(['impact', 'consumer-compatibility']);
      download(generator, consumer, 'consumer-source', '${{ runner.temp }}/consumer-artifacts');
      expect(steps(generator, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
    for (const consumer of ['validate-build', 'browser', 'lighthouse'])
      download(generator, consumer, 'consumer-build', '${{ runner.temp }}/forge-consumer/dist');
    expect(commands(generator).filter((command) => command.includes('npm run build --workspace'))).toHaveLength(1);
    expect(steps(generator, 'scenarios').find((step) => step.run?.includes('test-generator-e2e'))).toMatchObject({
      env: { FORGE_CLI_TARBALL: '${{ runner.temp }}/forge-packages/create-forge.tgz' },
    });
  });
});

it('keeps disposable consumer checks separate from repository automation', () => {
  expect(commands(automation)).toEqual([]);
  expect(project.jobs).not.toHaveProperty('project');
  expect(Object.keys(project.jobs).some((name) => name.startsWith('template-') || name.startsWith('generator-'))).toBe(
    false,
  );
  expect(steps(automation, 'security').at(-1)?.with?.inputs).toBe('.github');
  expect(steps(generator, 'security').at(-1)?.with?.inputs).toBe('.ci-consumer/.github');
});

it('restores generated scan inputs inside the workspace mounted by the Docker scanner', () => {
  const restore = steps(generator, 'security').find((step) => step.run?.includes('tar -xzf'));
  expect(restore?.run).toContain('mkdir -p .ci-consumer');
  expect(restore?.run).toContain('-C .ci-consumer');
  expect(steps(generator, 'security').at(-1)?.with?.inputs).toBe('.ci-consumer/.github');
});
