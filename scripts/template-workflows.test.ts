import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

test('template lanes install authoring tools before validating the isolated consumer', () => {
  const github = parse(readFileSync(new URL('../.github/workflows/template.yml', import.meta.url), 'utf8'));
  const steps = github.jobs.runtime.steps;
  const authoringInstall = steps.findIndex(
    (step: { name?: string }) => step.name === 'Install authoring verification dependencies',
  );
  const verify = steps.findIndex((step: { run?: string }) => step.run?.includes('scripts/verify-consumer-lock.ts'));
  expect(authoringInstall).toBeGreaterThan(-1);
  expect(authoringInstall).toBeLessThan(verify);
  expect(steps[authoringInstall].run).toBe('npm ci');
  expect(steps[authoringInstall]['working-directory'] ?? '.').toBe('.');

  const gitlab = parse(readFileSync(new URL('../.gitlab/ci/template.yml', import.meta.url), 'utf8'));
  const prepare = gitlab['template-primary'].before_script;
  expect(prepare[0]).toBe('npm ci');
  expect(prepare.indexOf('cd /tmp/forge-template')).toBeGreaterThan(0);
  expect(prepare.slice(prepare.indexOf('cd /tmp/forge-template') + 1)).toContain('npm ci');
});
