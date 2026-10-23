import { expect, test } from 'vitest';

import { selectCiImpact } from './ci-impact.ts';

test('routes actual local and copied inputs without changing registry-pinned consumers', () => {
  expect(selectCiImpact(['packages/content-model/src/index.ts'])).toMatchObject({
    packages: 'content-model',
    project: true,
    generator: false,
    website: false,
    native: false,
    frontmatterCandidate: false,
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
    packages: 'content-model',
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
    expect(readFileSync(output, 'utf8')).toContain('packages=content-model\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
