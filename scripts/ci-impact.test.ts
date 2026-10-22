import { expect, test } from 'vitest';

import { selectCiImpact } from './ci-impact.ts';

test('isolates website and docs while uncertain or shared changes retain validation', () => {
  expect(selectCiImpact(['website/src/pages/index.astro'])).toEqual({
    project: false,
    generator: false,
    website: true,
  });
  expect(selectCiImpact(['docs/guide.md'])).toEqual({ project: false, generator: false, website: true });
  for (const paths of [
    null,
    [],
    ['package-lock.json'],
    ['unknown'],
    ['website/a', 'packages/content-model/a'],
    ['.github/workflows/project.yml'],
  ]) {
    expect(selectCiImpact(paths)).toEqual({ project: true, generator: true, website: true });
  }
});

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
      if (
        id !== 'validation' &&
        !(
          workflow === 'project' && ['format', 'lint-code', 'lint-markdown', 'spellcheck', 'documentation'].includes(id)
        )
      ) {
        for (const step of job.steps.slice(2)) expect(step.if).toContain(`needs.impact.outputs.${workflow} == 'true'`);
      }
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
    expect(readFileSync(output, 'utf8')).toBe('project=true\ngenerator=true\nwebsite=true\n');
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
