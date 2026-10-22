import { expect, test } from 'vitest';

import { selectCiImpact } from './ci-impact.ts';

test('routes actual local and copied inputs without changing registry-pinned consumers', () => {
  expect(selectCiImpact(['packages/content-model/src/index.ts'])).toMatchObject({
    packages: 'content-model markdownlint-frontmatter',
    project: true,
    generator: false,
    website: false,
    native: false,
    frontmatterCandidate: true,
    browserCandidate: true,
  });
  expect(selectCiImpact(['packages/markdownlint-frontmatter/src/index.ts'])).toMatchObject({
    packages: 'markdownlint-frontmatter',
    generator: false,
    website: false,
    frontmatterCandidate: true,
    browserCandidate: false,
  });
  expect(selectCiImpact(['packages/browser-oxfmt/native/Cargo.lock'])).toMatchObject({
    packages: 'browser-oxfmt',
    native: true,
    browserCandidate: true,
    generator: false,
    website: false,
  });
  expect(selectCiImpact(['templates/default/src/pages/index.astro'])).toMatchObject({
    packages: 'create-forge',
    generator: true,
    website: false,
    native: false,
    browserCandidate: true,
  });
  expect(selectCiImpact(['packages/create-forge/src/ci/github.ts'])).toMatchObject({
    packages: 'create-forge',
    generator: true,
    website: false,
  });
  for (const path of ['docs/guide.md', 'website/src/pages/index.astro'])
    expect(selectCiImpact([path])).toMatchObject({ project: false, generator: false, website: true, packages: '' });
  expect(selectCiImpact(['website/a', 'packages/content-model/deleted.ts'])).toMatchObject({
    packages: 'content-model markdownlint-frontmatter',
    generator: false,
    website: true,
  });
  for (const paths of [
    null,
    [],
    ['unknown'],
    ['package-lock.json'],
    ['.github/actions/setup-project/action.yml'],
    ['.github/workflows/project.yml'],
  ])
    expect(selectCiImpact(paths)).toMatchObject({
      packages: 'browser-oxfmt content-model create-forge markdownlint-frontmatter',
      project: true,
      generator: true,
      website: true,
      native: true,
      frontmatterCandidate: true,
      browserCandidate: true,
    });
});

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

for (const workflow of ['project', 'generator']) {
  test(`${workflow} preserves required contexts and fails unsuccessful prerequisites closed`, () => {
    const document = parse(readFileSync(new URL(`../.github/workflows/${workflow}.yml`, import.meta.url), 'utf8'));
    expect([...document.jobs.validation.needs].sort()).toEqual(
      Object.keys(document.jobs)
        .filter((id) => id !== 'validation')
        .sort(),
    );
    const checked = new Set<string>();
    for (const [id, job] of Object.entries(document.jobs) as [string, any][]) {
      if (id === 'impact') continue;
      expect(job.if).toBe('always()');
      expect(job.needs).toContain('impact');
      const conditionalSteps =
        id !== 'validation' &&
        !(
          workflow === 'project' && ['format', 'lint-code', 'lint-markdown', 'spellcheck', 'documentation'].includes(id)
        )
          ? job.steps.slice(2)
          : [];
      for (const step of conditionalSteps)
        expect(step.if).toMatch(/needs\.impact\.outputs\.(project|generator|native|frontmatterCandidate|packages)/);
      const guard = job.steps[0];
      const command = guard.run.match(/node -e '(.*)'/)[1];
      if (checked.has(command)) continue;
      checked.add(command);
      for (const result of ['failure', 'cancelled', 'skipped']) {
        const check = spawnSync(process.execPath, ['-e', command], {
          env: {
            ...process.env,
            NEEDS: JSON.stringify({ impact: { result: 'success' }, prerequisite: { result } }),
            SELECTED: 'false',
          },
        });
        expect(check.status).toBe(1);
      }
      for (const selected of ['true', 'false', '']) {
        const check = spawnSync(process.execPath, ['-e', command], {
          env: { ...process.env, NEEDS: JSON.stringify({ impact: { result: 'success' } }), SELECTED: selected },
        });
        expect(check.status).toBe(selected ? 0 : 1);
      }
    }
  });
}

test('revision uncertainty requests broad work but an actual diff failure emits no selection', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-impact-'));
  const output = join(directory, 'output');
  const script = new URL('./ci-impact.ts', import.meta.url);
  try {
    const unknown = spawnSync(process.execPath, [fileURLToPath(script)], {
      env: { ...process.env, GITHUB_OUTPUT: output, CI_BASE_SHA: '0'.repeat(40), CI_HEAD_SHA: '1'.repeat(40) },
    });
    expect(unknown.status).toBe(0);
    expect(readFileSync(output, 'utf8')).toContain('project=true\ngenerator=true\nwebsite=true\n');
    rmSync(output);
    const failed = spawnSync(process.execPath, [fileURLToPath(script)], {
      env: { ...process.env, GITHUB_OUTPUT: output, CI_BASE_SHA: '1'.repeat(40), CI_HEAD_SHA: '2'.repeat(40) },
    });
    expect(failed.status).not.toBe(0);
    expect(existsSync(output)).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('package jobs execute only selected workspaces and pack those tested candidates', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-workspaces-'));
  const log = join(directory, 'commands');
  try {
    writeFileSync(join(directory, 'npm'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$COMMAND_LOG"\n', { mode: 0o755 });
    const project = parse(readFileSync(new URL('../.github/workflows/project.yml', import.meta.url), 'utf8'));
    const commands = [...project.jobs.build.steps, ...project.jobs.compatibility.steps]
      .filter((step: { env?: { PACKAGES?: string } }) => step.env?.PACKAGES)
      .map((step: { run: string }) => step.run);
    for (const command of commands) {
      const result = spawnSync('bash', ['-e', '-c', command], {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          PACKAGES: 'content-model markdownlint-frontmatter',
          COMMAND_LOG: log,
          RUNNER_TEMP: directory,
        },
      });
      expect(result.status).toBe(0);
    }
    const executed = readFileSync(log, 'utf8').trim().split('\n');
    expect(executed).toEqual([
      'run build --workspace @rm-industries/content-model',
      'run build --workspace @rm-industries/markdownlint-frontmatter',
      `pack --ignore-scripts --workspace @rm-industries/content-model --pack-destination ${directory}/forge-packages`,
      `pack --ignore-scripts --workspace @rm-industries/markdownlint-frontmatter --pack-destination ${directory}/forge-packages`,
      'run typecheck --workspace @rm-industries/content-model',
      'test --workspace @rm-industries/content-model',
      'run typecheck --workspace @rm-industries/markdownlint-frontmatter',
      'test --workspace @rm-industries/markdownlint-frontmatter',
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('renames crossing ownership boundaries select both old and new consumers', () => {
  const directory = mkdtempSync(join(tmpdir(), 'forge-rename-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  try {
    git('init', '--quiet');
    mkdirSync(join(directory, 'docs'));
    writeFileSync(join(directory, 'docs/a.md'), '# Page\n');
    git('add', '.');
    git('-c', 'user.name=CI test', '-c', 'user.email=ci@example.invalid', 'commit', '--quiet', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    mkdirSync(join(directory, 'packages/content-model'), { recursive: true });
    git('mv', 'docs/a.md', 'packages/content-model/a.md');
    git('-c', 'user.name=CI test', '-c', 'user.email=ci@example.invalid', 'commit', '--quiet', '-m', 'rename');
    const output = join(directory, 'output');
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./ci-impact.ts', import.meta.url))], {
      cwd: directory,
      env: { ...process.env, GITHUB_OUTPUT: output, CI_BASE_SHA: base, CI_HEAD_SHA: git('rev-parse', 'HEAD') },
    });
    expect(result.status).toBe(0);
    expect(readFileSync(output, 'utf8')).toContain('website=true\n');
    expect(readFileSync(output, 'utf8')).toContain('packages=content-model markdownlint-frontmatter\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
