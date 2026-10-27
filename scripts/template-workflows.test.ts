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
  expect(prepare.slice(prepare.indexOf('cd /tmp/forge-template') + 1)).toContain('npm install');
});

test('template dependencies resolve freshly without scheduled npm update PRs', () => {
  const github = parse(readFileSync(new URL('../.github/workflows/template.yml', import.meta.url), 'utf8'));
  const steps = github.jobs.runtime.steps;
  const resolve = steps.findIndex((step: { name?: string }) => step.name === 'Resolve fresh template dependencies');
  const archive = steps.findIndex((step: { name?: string }) => step.name === 'Archive canonical source');
  expect(resolve).toBeGreaterThan(-1);
  expect(resolve).toBeLessThan(archive);
  expect(steps[resolve].run).toContain('npm install --package-lock-only');
  const dependabot = parse(readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8'));
  expect(
    dependabot.updates.some(
      (update: { 'package-ecosystem': string; directory?: string }) =>
        update['package-ecosystem'] === 'npm' && update.directory === '/templates/default',
    ),
  ).toBe(false);
});
