import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Step {
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
}

interface Job {
  needs?: string | string[];
  steps?: Step[];
  uses?: string;
}

interface Workflow {
  concurrency?: {
    'cancel-in-progress'?: string;
  };
  jobs: Record<string, Job>;
}

const readWorkflow = (path: string): Workflow =>
  parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Workflow;

const website = readWorkflow('../.github/workflows/website.yml');
const project = readWorkflow('../.github/workflows/project.yml');
const template = readWorkflow('../templates/default/.github/workflows/project.yml');

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
    expect(commands(template).filter((command) => command.includes('npm run build'))).toEqual(['npm run build']);
  });

  it('reuses the production artifact for every build consumer', () => {
    for (const consumer of ['validate-build', 'browser-tests', 'lighthouse']) {
      expect(dependencies(job(template, consumer))).toEqual(['build']);
      download(template, consumer, 'site-build', 'dist');
      expect(steps(template, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });

  it('deploys only after all checks and smoke-tests the live site', () => {
    expect(dependencies(job(template, 'deploy')).sort()).toEqual(
      [...sourceJobs, 'build', 'validate-build', 'browser-tests', 'lighthouse'].sort(),
    );
    expect(template.jobs.project).toBeUndefined();
    expect(dependencies(job(template, 'smoke-deployed'))).toEqual(['deploy']);
    expect(template.concurrency?.['cancel-in-progress']).toBe("${{ github.event_name == 'pull_request' }}");
  });
});

describe('Forge website CI contract', () => {
  it('mirrors the generated workflow graph with website-scoped paths', () => {
    expect(Object.keys(website.jobs).sort()).toEqual(Object.keys(template.jobs).sort());
    for (const name of Object.keys(template.jobs)) {
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
      ['classify', 'template-coverage', 'template-static-quality'].sort(),
    );
    for (const consumer of ['template-browser', 'template-lighthouse']) {
      expect(dependencies(job(project, consumer))).toEqual(['template-build']);
      download(project, consumer, 'template-build', '${{ runner.temp }}/forge-default-template/dist');
      expect(steps(project, consumer).some((step) => step.run?.includes('npm run build'))).toBe(false);
    }
  });
});
