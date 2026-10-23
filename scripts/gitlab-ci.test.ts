import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

import { gitlabPipelineSchema } from '../packages/create-forge/src/ci/schema.ts';

const read = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const entry = read('../.gitlab-ci.yml');
const project = read('../.gitlab/ci/project.yml');
const generator = read('../.gitlab/ci/generator.yml');
const website = read('../.gitlab/ci/website.yml');

test('scopes Lighthouse Chrome root flags to the native GitLab audit jobs', () => {
  for (const job of [website['website-lighthouse'], generator['consumer-lighthouse']]) {
    expect(job.variables).toEqual({
      LHCI_COLLECT__SETTINGS__CHROME_FLAGS: '--no-sandbox --disable-dev-shm-usage --disable-gpu',
    });
    expect(job.script.join('\n')).toContain('export CHROME_PATH=');
  }
  expect(website['website-browser-tests']).not.toHaveProperty('variables');
});

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

test('retains independent GitLab consumer runtime and artifact contracts', () => {
  for (const id of ['consumer-primary', 'consumer-compatibility']) {
    expect(generator[id].script).toContain('npm run typecheck');
    expect(generator[id].script).toContain('npm run build');
    expect(generator[id].script).toContain('if [ "$PRIMARY" = true ]; then npm run test:coverage; else npm test; fi');
    expect(generator[id].needs).toEqual([{ job: 'generator-package', artifacts: true }]);
  }
  for (const id of ['consumer-quality', 'consumer-browser', 'consumer-lighthouse', 'consumer-validate-build'])
    expect(generator[id]).not.toHaveProperty('parallel');
  expect(website['website-build'].artifacts.when).toBe('on_success');
  for (const dependency of website['website-build'].needs) expect(dependency.artifacts).toBe(false);
  for (const pipeline of [project, generator, website])
    expect(Object.keys(pipeline).some((id) => id.includes('dependency-audit'))).toBe(false);
  for (const job of Object.values(generator) as { script: string[] }[])
    expect(job.script.some((command) => command.includes('content-model*.tgz'))).toBe(false);
});

test('admits merge requests, default pushes and broad scheduled/manual validation with failure propagation', () => {
  expect(entry.workflow.rules).toEqual([
    { if: '$CI_PIPELINE_SOURCE == "merge_request_event"' },
    { if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS && $CI_PIPELINE_SOURCE == "push"', when: 'never' },
    { if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && $CI_PIPELINE_SOURCE == "push"' },
    { if: '$CI_PIPELINE_SOURCE == "schedule" || $CI_PIPELINE_SOURCE == "web"' },
  ]);
  expect(entry['mirror-validation']).toMatchObject({
    needs: ['select-impact'],
    trigger: { include: [{ artifact: '.gitlab-child.json', job: 'select-impact' }], strategy: 'mirror' },
  });
  expect(entry['select-impact'].variables.GIT_DEPTH).toBe('0');
  expect(entry['select-impact'].script).toContain('node .gitlab/ci/select.ts');
});

test('selects a complete child graph from the shared consumption matrix', async () => {
  const { createMirrorPipeline } = await import('../.gitlab/ci/select.ts');
  for (const [paths, selected] of [
    [['docs/guide.md'], ['website-build']],
    [['website/src/pages/index.astro'], ['website-build']],
    [['packages/content-model/src/index.ts'], ['project-build']],
    [['packages/create-forge/src/index.ts'], ['project-build', 'generator-package']],
    [['templates/default/src/index.ts'], ['project-build', 'generator-package']],
    [['packages/browser-oxfmt/native/src/lib.rs'], ['project-build', 'project-native']],
    [['unknown/input'], ['project-build', 'project-native', 'generator-package', 'website-build']],
    [null, ['project-build', 'project-native', 'generator-package', 'website-build']],
    [[], ['project-build', 'project-native', 'generator-package', 'website-build']],
    [
      ['docs/deleted.md', 'packages/create-forge/src/renamed.ts'],
      ['project-build', 'generator-package', 'website-build'],
    ],
  ] as const) {
    const pipeline = createMirrorPipeline(paths ? [...paths] : null);
    for (const id of ['project-build', 'project-native', 'generator-package', 'website-build']) {
      expect(id in pipeline, `${paths}: ${id}`).toBe(selected.includes(id as never));
    }
    expect(pipeline).toHaveProperty('project-format');
    for (const [, job] of Object.entries(pipeline)) {
      if (!('needs' in (job as object))) continue;
      for (const need of (job as { needs: { job: string }[] }).needs) expect(pipeline).toHaveProperty(need.job);
    }
  }
});

test('builds and verifies the selected package artifacts without requiring unrelated native output', async () => {
  const { createMirrorPipeline } = await import('../.gitlab/ci/select.ts');
  const pipeline = createMirrorPipeline(['packages/markdownlint-frontmatter/src/index.ts']);
  expect(pipeline.variables).toMatchObject({ FORGE_PACKAGES: 'markdownlint-frontmatter', FORGE_NATIVE: 'false' });
  expect(project['project-build'].script.join('\n')).toContain('for package in $FORGE_PACKAGES');
  expect(project['project-compatibility'].script.join('\n')).toContain('for package in $FORGE_PACKAGES');
  expect(project['project-build'].before_script.join('\n')).toContain('if [ "$FORGE_NATIVE" = true ]');
  expect(project['project-compatibility'].script.join('\n')).toContain(
    'if [ -d packages/browser-oxfmt/dist/generated ]',
  );
  for (const name of ['select-impact', 'mirror-validation'])
    expect(entry[name].rules).toEqual([{ when: 'on_success' }]);
});

test('does not produce an accepting child artifact after a diff failure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-mirror-impact-'));
  try {
    const run = spawnSync(process.execPath, [new URL('../.gitlab/ci/select.ts', import.meta.url).pathname], {
      cwd: directory,
      env: { CI_PIPELINE_SOURCE: 'push', CI_COMMIT_BEFORE_SHA: 'a'.repeat(40), CI_COMMIT_SHA: 'b'.repeat(40) },
      encoding: 'utf8',
    });
    expect(run.status).not.toBe(0);
    expect(() => readFileSync(join(directory, '.gitlab-child.json'))).toThrow(/ENOENT/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('keeps vulnerability audits out of package publication commands', () => {
  const release = read('../.github/workflows/package-release.yml');
  const commands = Object.values(release.jobs)
    .flatMap((job) => (job as { steps: { run?: string }[] }).steps.flatMap((step) => (step.run ? [step.run] : [])))
    .join('\n');
  expect(commands).not.toContain('npm run audit');
});
