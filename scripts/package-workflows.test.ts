import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Step {
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
}
interface Job {
  if?: string;
  needs?: string;
  steps: Step[];
  strategy?: { matrix: { include: { 'node-version': string }[] } };
}
interface Workflow {
  on: Record<string, { paths?: string[] } | { cron: string }[] | null>;
  jobs: Record<string, Job>;
}

for (const name of ['content-model', 'markdownlint-frontmatter', 'browser-oxfmt']) {
  describe(`${name} workflow`, () => {
    const load = () =>
      parse(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8')) as Workflow;
    it('uses independent native filters and weekly/manual validation', () => {
      const workflow = load();
      for (const event of ['push', 'pull_request']) {
        const paths = (workflow.on[event] as { paths: string[] }).paths;
        expect(paths).toEqual(
          expect.arrayContaining([
            `packages/${name}/**`,
            'package-lock.json',
            'package.json',
            '.github/actions/setup-project/action.yml',
            `.github/workflows/${name}.yml`,
          ]),
        );
        expect(paths.filter((path) => path.startsWith('packages/'))).toEqual([`packages/${name}/**`]);
      }
      expect(workflow.on).toHaveProperty('workflow_dispatch');
      expect(workflow.on.schedule).toHaveLength(1);
      expect(workflow.jobs).not.toHaveProperty('impact');
      for (const job of Object.values(workflow.jobs)) {
        expect(job.if).toBeUndefined();
        for (const step of job.steps) {
          expect(step.uses ?? '').not.toContain('ci-impact');
          expect(step.run ?? '').not.toMatch(/unaffected|SELECTED|needs\.impact/);
        }
      }
    });
    it('publishes an inspected build once and checks four Linux runtimes', () => {
      const workflow = load();
      const primary = workflow.jobs.package!;
      const commands = primary.steps.map((step) => step.run ?? '').join('\n');
      for (const command of ['typecheck', 'test', ...(name === 'markdownlint-frontmatter' ? [] : ['build'])])
        expect(commands).toContain(
          `npm ${command === 'test' ? 'test' : `run ${command}`} --workspace @rm-industries/${name}`,
        );
      expect(commands).toContain('npm pack --ignore-scripts');
      expect(commands).toContain('tar -tzf');
      expect(primary.steps.some((step) => step.uses?.startsWith('actions/upload-artifact@'))).toBe(true);
      const runtime = workflow.jobs.compatibility!;
      expect(runtime.needs).toBe('package');
      expect(runtime.strategy?.matrix.include.map((lane) => lane['node-version'])).toEqual([
        '22.22.2',
        '22.x',
        '24.x',
        '26.x',
      ]);
      expect(runtime.steps.some((step) => step.uses?.startsWith('actions/download-artifact@'))).toBe(true);
      expect(runtime.steps.map((step) => step.run ?? '').join('\n')).not.toMatch(
        /npm run build|build:native|quality:native/,
      );
    });
  });
}

it('retains browser reproducibility and restores native assets for runtime lanes', () => {
  const workflow = parse(
    readFileSync(new URL('../.github/workflows/browser-oxfmt.yml', import.meta.url), 'utf8'),
  ) as Workflow;
  const commands = workflow.jobs.package!.steps.map((step) => step.run ?? '').join('\n');
  expect(commands.match(/npm run build:native/g)).toHaveLength(2);
  expect(commands).toContain('quality:native');
  expect(commands).toContain('test:browser');
  expect(commands).not.toContain('sveltia-serialization');
  expect(workflow.jobs.compatibility!.steps.map((step) => step.run ?? '').join('\n')).toContain('dist/generated');
});
