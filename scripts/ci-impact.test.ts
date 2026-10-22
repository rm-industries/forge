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
import { readFileSync } from 'node:fs';

import { parse } from 'yaml';

for (const workflow of ['project', 'generator']) {
  test(`${workflow} preserves required contexts and fails unsuccessful prerequisites closed`, () => {
    const document = parse(readFileSync(new URL(`../.github/workflows/${workflow}.yml`, import.meta.url), 'utf8'));
    const checked = new Set<string>();
    for (const [id, job] of Object.entries(document.jobs) as [string, any][]) {
      if (id === 'impact') continue;
      expect(job.if).toBe('always()');
      expect(job.needs).toContain('impact');
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
