import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

type Step = { uses?: string; run?: string; with?: Record<string, string> };
const read = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const project = read('../.github/workflows/project.yml');
const browser = read('../.github/workflows/browser-oxfmt.yml');
const security = read('../.github/workflows/security.yml');
const setup = read('../.github/actions/setup-project/action.yml');

test('checks Rust source and generates ignored native outputs in every clean build job', () => {
  expect(setup.inputs.native.default).toBe('false');
  for (const file of ['package-release', 'peer-upgrades', 'template-sync']) {
    const workflow = read(`../.github/workflows/${file}.yml`);
    const steps = Object.values(workflow.jobs).flatMap((job) => (job as { steps?: Step[] }).steps ?? []);
    expect(steps.find((step: Step) => step.uses === '$/.github/actions/setup-project')?.with?.native).toBe('true');
  }
  expect(project.jobs.build.needs).toContain('native');
  expect(
    project.jobs.native.steps.some(
      (step: Step) => step.run === 'npm run quality:native --workspace @rm-industries/browser-oxfmt',
    ),
  ).toBe(true);
  expect(
    project.jobs.build.steps.find((step: Step) => step.uses === '$/.github/actions/setup-project')?.with?.native,
  ).toBe('true');
  expect(
    browser.jobs.package.steps.find((step: Step) => step.uses === '$/.github/actions/setup-project')?.with?.native,
  ).toBe('true');
});

test('scans maintained Rust source while excluding downloaded upstream and generated bindings', () => {
  expect(security.jobs['code-analysis'].strategy.matrix.language).toContain('rust');
  const configuration = read('../.github/codeql-config.yml');
  expect(configuration['paths-ignore']).toEqual(
    expect.arrayContaining(['packages/browser-oxfmt/native/.upstream', 'packages/browser-oxfmt/src/generated']),
  );
});

test('runtime lanes restore the built engine before typechecking without installing Rust', () => {
  const steps = project.jobs.compatibility.steps as Step[];
  const restore = steps.findIndex((step) => step.run?.includes('src/generated'));
  const check = steps.findIndex((step) => step.run?.includes('typecheck:workspaces'));
  expect(restore).toBeGreaterThan(-1);
  expect(check).toBeGreaterThan(restore);
  expect(steps[restore]?.run).toContain('NOTICE.md');
  expect(steps.find((step) => step.uses === '$/.github/actions/setup-project')?.with?.native).toBeUndefined();
});
