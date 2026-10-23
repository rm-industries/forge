import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { generationOptionsSchema } from './generation-options.ts';
import { createGithubWorkflows } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';

const pins = (action: string) => ({ ref: `${action}@${'a'.repeat(40)}` });
const config = generationOptionsSchema.parse({
  directory: 'website',
  repositoryRoot: '..',
  prefix: 'site',
  providers: ['github', 'gitlab'],
  primary: 'github',
  securityMinute: 17,
  automationMinute: 43,
});

test('emitted GitHub selection observes site, root/shared, unrelated and uncertain changes', () => {
  const workflow = createGithubWorkflows(config, pins).project;
  const select = workflow.jobs.select!;
  expect(select).toBeDefined();
  const script = select.steps.flatMap((step) => ('run' in step ? [step.run] : [])).join('\n');
  const directory = mkdtempSync(join(tmpdir(), 'consumer-execution-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    writeFileSync(join(directory, '.git/info/exclude'), 'output\n');
    writeFileSync(join(directory, 'README.md'), 'baseline');
    git('add', '.');
    git('commit', '-qm', 'baseline');
    const base = git('rev-parse', 'HEAD');
    for (const [path, affected] of [
      ['other/file.txt', false],
      ['website/src/page.astro', true],
      ['package.json', true],
      ['.github/workflows/project.yml', true],
      ['scripts/check.ts', true],
      ['website/unknown.input', true],
    ] as const) {
      mkdirSync(join(directory, path, '..'), { recursive: true });
      writeFileSync(join(directory, path), 'changed');
      git('add', '.');
      git('commit', '-qm', 'change');
      const output = join(directory, 'output');
      writeFileSync(output, '');
      execFileSync('bash', ['-e', '-c', script], {
        cwd: directory,
        env: { ...process.env, BASE_SHA: git('rev-parse', 'HEAD^'), EVENT_NAME: 'pull_request', GITHUB_OUTPUT: output },
      });
      expect(readFileSync(output, 'utf8')).toBe(`affected=${affected}\n`);
    }
    git('mv', 'website/src/page.astro', 'other/moved.astro');
    git('commit', '-qm', 'move site page out of site');
    const renamedOutput = join(directory, 'output');
    writeFileSync(renamedOutput, '');
    execFileSync('bash', ['-e', '-c', script], {
      cwd: directory,
      env: {
        ...process.env,
        BASE_SHA: git('rev-parse', 'HEAD^'),
        EVENT_NAME: 'pull_request',
        GITHUB_OUTPUT: renamedOutput,
      },
    });
    expect(readFileSync(renamedOutput, 'utf8')).toBe('affected=true\n');
    expect(() =>
      execFileSync('bash', ['-e', '-c', script], {
        cwd: directory,
        env: { ...process.env, BASE_SHA: 'f'.repeat(40), EVENT_NAME: 'pull_request', GITHUB_OUTPUT: renamedOutput },
        stdio: 'pipe',
      }),
    ).toThrow('Command failed');
    const output = join(directory, 'output');
    writeFileSync(output, '');
    execFileSync('bash', ['-e', '-c', script], {
      cwd: directory,
      env: { ...process.env, BASE_SHA: base, EVENT_NAME: 'schedule', GITHUB_OUTPUT: output },
    });
    expect(readFileSync(output, 'utf8')).toBe('affected=true\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('emitted providers keep normal Chromium, scheduled broad coverage and Lighthouse before deployment', () => {
  const github = createGithubWorkflows(config, pins).project;
  expect(github.on.schedule).toBeDefined();
  expect(github.on.workflow_dispatch).toBeNull();
  expect(
    github.jobs['browser-tests']!.steps.some((step) => 'run' in step && step.run.includes('--project=chromium')),
  ).toBe(true);
  expect(github.jobs.lighthouse!.if).toContain("github.event_name != 'pull_request'");
  const gitlab = createGitlabPipeline(config);
  expect(gitlab.workflow.rules.some((rule) => rule.if?.includes('schedule'))).toBe(true);
  expect(gitlab['browser-tests']).toHaveProperty('script');
  expect(JSON.stringify(gitlab['browser-tests'])).toContain('--project=chromium');
});

test('emitted required result rejects failed selection, prerequisites, cancellation and unexpected skips', () => {
  const workflow = createGithubWorkflows(config, pins).project;
  const script = workflow.jobs.validation!.steps.flatMap((step) => ('run' in step ? [step.run] : [])).join('\n');
  const results = (affected: boolean, event: string) =>
    Object.fromEntries(
      workflow.jobs.validation!.needs!.map((id) => [
        id,
        id === 'select'
          ? { result: 'success', outputs: { affected: String(affected) } }
          : { result: !affected || (id === 'lighthouse' && event === 'pull_request') ? 'skipped' : 'success' },
      ]),
    );
  const execute = (needs: ReturnType<typeof results>, event = 'pull_request') =>
    execFileSync('bash', ['-e', '-c', script], {
      env: { ...process.env, NEEDS_JSON: JSON.stringify(needs), EVENT_NAME: event },
      stdio: 'pipe',
    });
  expect(() => execute(results(true, 'pull_request'))).not.toThrow();
  expect(() => execute(results(false, 'pull_request'))).not.toThrow();
  expect(() => execute(results(true, 'push'), 'push')).not.toThrow();
  for (const id of ['select', 'build', 'browser-tests', 'unit-tests'])
    for (const result of ['failure', 'cancelled', 'skipped']) {
      const needs = results(true, 'push');
      needs[id]!.result = result;
      expect(() => execute(needs, 'push')).toThrow('Command failed');
    }
  const malformed = results(false, 'pull_request');
  malformed.select!.outputs!.affected = 'unknown';
  expect(() => execute(malformed)).toThrow('Command failed');
});

test.each(['.', 'website'])(
  'GitLab %s selection keeps selected dependency and deployment graphs aligned',
  (directory) => {
    const pipeline = createGitlabPipeline({ ...config, directory, primary: 'gitlab' });
    const build = pipeline.build as {
      rules: Array<{ changes?: unknown }>;
      needs: Array<{ job: string }>;
      allow_failure?: boolean;
    };
    const selectedChanges = build.rules.find((rule) => rule.changes)?.changes;
    expect(selectedChanges).toBeDefined();
    for (const { job } of build.needs) {
      expect(pipeline[job]).toHaveProperty('rules', build.rules);
      expect(pipeline[job]).not.toHaveProperty('allow_failure', true);
    }
    expect(pipeline.deploy).toHaveProperty('rules.0.changes', selectedChanges);
    expect(pipeline['smoke-deployed']).toHaveProperty('rules.0.changes', selectedChanges);
    expect(pipeline.unaffected).toHaveProperty('before_script', []);
    expect(pipeline.lighthouse).toHaveProperty('rules.0', {
      if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
      when: 'never',
    });
  },
);
