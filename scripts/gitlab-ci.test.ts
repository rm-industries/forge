import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

import { gitlabPipelineSchema } from '../packages/create-forge/src/ci/schema.ts';

const read = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const entry = read('../.gitlab-ci.yml');
const project = read('../.gitlab/ci/project.yml');
const generator = read('../.gitlab/ci/generator.yml');
const website = read('../.gitlab/ci/website.yml');

test('composes native GitLab includes with valid dependency graphs', () => {
  expect(entry.include.map((include: { local: string }) => include.local)).toEqual([
    '.gitlab/ci/project.yml',
    '.gitlab/ci/generator.yml',
    '.gitlab/ci/website.yml',
  ]);
  const jobs = { ...project, ...generator, ...website };
  const names = Object.keys(jobs);
  expect(names).toHaveLength(Object.keys(project).length + Object.keys(generator).length + Object.keys(website).length);
  for (const job of Object.values(jobs) as { stage: string; needs: { job: string }[]; script: string[] }[]) {
    expect(entry.stages).toContain(job.stage);
    expect(job.script.length).toBeGreaterThan(0);
    for (const dependency of job.needs) {
      expect(names).toContain(dependency.job);
      expect(entry.stages.indexOf(jobs[dependency.job].stage)).toBeLessThan(entry.stages.indexOf(job.stage));
    }
  }
  gitlabPipelineSchema.parse({
    workflow: entry.workflow,
    stages: entry.stages,
    default: { interruptible: true, before_script: ['npm ci'] },
    ...website,
  });
});

test('keeps GitHub primary and preserves website deployment safeguards', () => {
  expect(website['website-deploy']).toMatchObject({
    rules: [{ when: 'never' }],
    pages: { publish: 'website/dist' },
    before_script: [],
  });
  expect(website['website-smoke-deployed']).toMatchObject({
    rules: [{ when: 'never' }],
    timeout: '10m',
    needs: [{ job: 'website-deploy', artifacts: false }],
  });
  expect(website['website-smoke-deployed'].script).toContain('test -n "$CI_PAGES_URL"');
  expect(website['website-browser-tests'].needs).toEqual([{ job: 'website-build', artifacts: true }]);
  expect(website['website-build'].artifacts.paths).toEqual(['website/dist']);
  expect(project['project-compatibility'].parallel.matrix[0].NODE_VERSION).toEqual(['22.22.2', '22', '24', '26']);
  expect(generator['consumer-compatibility'].parallel.matrix).toEqual([
    { NODE_VERSION: ['22.22.2', '22'], NODE_MAJOR: '22' },
    { NODE_VERSION: '24', NODE_MAJOR: '24' },
  ]);
  expect(generator['consumer-primary'].variables.NODE_VERSION).toBe('26');
});

test('GitLab checks reuse the canonical consumer instead of regenerating it', () => {
  for (const id of ['quality', 'dependency-audit', 'validate-build', 'browser', 'lighthouse']) {
    const job = generator[`consumer-${id}`];
    expect(job.needs).toEqual([{ job: 'consumer-primary', artifacts: true }]);
    expect(job.before_script).toContain('tar -xzf .ci-consumer/consumer-source.tgz -C /tmp/forge-consumer');
    expect(
      job.script.some((command: string) => command.includes('create-forge') || command.includes('npm run build')),
    ).toBe(false);
  }
});
