import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

import { gitlabPipelineSchema } from '../packages/create-forge/src/ci/schema.ts';

const read = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const entry = read('../.gitlab-ci.yml');
const project = read('../.gitlab/ci/project.yml');
const generator = read('../.gitlab/ci/generator.yml');
const website = read('../.gitlab/ci/website.yml');

test('publishes native test and quality reports without mapping disposable coverage onto Forge', () => {
  expect(project['project-test'].artifacts.reports.junit).toBe('test-results/unit.xml');
  expect(project['project-compatibility'].artifacts.reports.junit).toEqual([
    'packages/content-model/test-results/unit.xml',
    'packages/create-forge/test-results/unit.xml',
  ]);
  expect(project['project-lint-code'].artifacts.reports.codequality).toBe('test-results/code-quality.json');
  expect(website['website-unit-tests'].artifacts.reports.coverage_report).toEqual({
    coverage_format: 'cobertura',
    path: 'website/coverage/cobertura-coverage.xml',
  });
  expect(website['website-lint-code'].script.join('\n')).toContain('"website/" + finding.location.path');
  for (const id of ['consumer-primary', 'consumer-compatibility', 'consumer-browser']) {
    expect(generator[id].artifacts.when).toBe('always');
    expect(generator[id].artifacts.reports).toHaveProperty('junit');
    expect(generator[id].artifacts.reports).not.toHaveProperty('coverage_report');
    expect(generator[id].after_script.join('\n')).toContain('test-results');
  }
});

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
  for (const id of ['quality', 'validate-build', 'browser', 'lighthouse']) {
    const job = generator[`consumer-${id}`];
    expect(job.needs).toEqual([{ job: 'consumer-primary', artifacts: true }]);
    expect(job.before_script).toContain('tar -xzf .ci-consumer/consumer-source.tgz -C /tmp/forge-consumer');
    expect(
      job.script.some((command: string) => command.includes('create-forge') || command.includes('npm run build')),
    ).toBe(false);
  }
});

const githubProject = read('../.github/workflows/project.yml');
const githubGenerator = read('../.github/workflows/generator.yml');
const githubWebsite = read('../.github/workflows/website.yml');
const dependencyNames = (job: { needs?: (string | { job: string })[] }, prefix = '') =>
  (job.needs ?? []).map((need) => (typeof need === 'string' ? need : need.job).slice(prefix.length)).sort();

test('mirrors project and website job coverage and dependency gates across providers', () => {
  for (const [github, gitlab, prefix] of [
    [githubProject.jobs, project, 'project-'],
    [githubWebsite.jobs, website, 'website-'],
  ] as const) {
    expect(
      Object.keys(gitlab)
        .map((id) => id.slice(prefix.length))
        .sort(),
    ).toEqual(Object.keys(github).sort());
    for (const [id, job] of Object.entries(github)) {
      expect(dependencyNames(gitlab[`${prefix}${id}`], prefix)).toEqual(dependencyNames(job as { needs?: string[] }));
      const commands = (job as { steps: { run?: string }[] }).steps
        .filter((step) => step.run?.startsWith('npm run ') || step.run === 'npm test')
        .map((step) => step.run?.replace(' -- --format github', ''));
      for (const command of commands) expect(gitlab[`${prefix}${id}`].script.join('\n')).toContain(command);
    }
  }
});

test('mirrors generator package and validation flows while security scans stay on GitHub', () => {
  const mirrors = {
    package: 'generator-package',
    quality: 'consumer-quality',
    'validate-build': 'consumer-validate-build',
    browser: 'consumer-browser',
    lighthouse: 'consumer-lighthouse',
    scenarios: 'generator-scenarios',
    'static-tool-regressions': 'consumer-quality-tool-regressions',
  };
  const dependencyMapping: Record<string, string> = {
    package: 'generator-package',
    'consumer-compatibility': 'consumer-primary',
  };
  for (const [githubId, gitlabId] of Object.entries(mirrors)) {
    const expected = dependencyNames(githubGenerator.jobs[githubId])
      .map((id) => dependencyMapping[id] ?? id)
      .sort();
    expect(dependencyNames(generator[gitlabId])).toEqual(expected);
  }
  expect(Object.keys(generator).sort()).toEqual(
    [...Object.values(mirrors), 'consumer-primary', 'consumer-compatibility'].sort(),
  );
  for (const id of ['consumer-primary', 'consumer-compatibility']) {
    expect(generator[id].script).toContain('npm run typecheck');
    expect(generator[id].script).toContain('npm run build');
    expect(generator[id].script).toContain('if [ "$PRIMARY" = true ]; then npm run test:coverage; else npm test; fi');
    expect(dependencyNames(generator[id])).toEqual(['generator-package']);
  }
  for (const pipeline of [project, generator, website])
    expect(Object.keys(pipeline).some((id) => id.includes('dependency-audit'))).toBe(false);
  for (const job of Object.values(generator) as { script: string[] }[])
    expect(job.script.some((command) => command.includes('content-model*.tgz'))).toBe(false);
});

test('mirrors supported Linux Node versions without multiplying one-time quality checks', () => {
  const normalizeTag = (version: string) => version.replace('.x', '');
  expect(project['project-compatibility'].parallel.matrix[0].NODE_VERSION).toEqual(
    githubProject.jobs.compatibility.strategy.matrix.include.map((lane: { 'node-version': string }) =>
      normalizeTag(lane['node-version']),
    ),
  );
  const githubLanes = githubGenerator.jobs['consumer-compatibility'].strategy.matrix.include
    .filter((lane: { os: string }) => lane.os === 'ubuntu-latest')
    .map((lane: { node: string; major: string }) => `${normalizeTag(lane.node)}:${lane.major}`);
  const gitlabLanes = generator['consumer-compatibility'].parallel.matrix.flatMap(
    (lane: { NODE_VERSION: string | string[]; NODE_MAJOR: string }) =>
      [lane.NODE_VERSION].flat().map((version) => `${version}:${lane.NODE_MAJOR}`),
  );
  gitlabLanes.push(
    `${generator['consumer-primary'].variables.NODE_VERSION}:${generator['consumer-primary'].variables.NODE_MAJOR}`,
  );
  expect(gitlabLanes.sort()).toEqual(githubLanes.sort());
  for (const id of ['consumer-quality', 'consumer-browser', 'consumer-lighthouse', 'consumer-validate-build'])
    expect(generator[id]).not.toHaveProperty('parallel');
  expect(website['website-build'].artifacts.when).toBe('on_success');
  for (const dependency of website['website-build'].needs) expect(dependency.artifacts).toBe(false);
});

test('retains blocking publication audits while normal mirrored workflows omit vulnerability audit jobs', () => {
  const release = read('../.github/workflows/package-release.yml');
  const commands = Object.values(release.jobs)
    .flatMap((job) => (job as { steps: { run?: string }[] }).steps.flatMap((step) => (step.run ? [step.run] : [])))
    .join('\n');
  expect(commands).toContain('npm run audit');
  expect(commands).toContain('npm run audit --prefix templates/default');
  for (const workflow of [githubProject, githubGenerator, githubWebsite])
    expect(workflow.jobs).not.toHaveProperty('dependency-audit');
});
