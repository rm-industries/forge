import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

const read = (name: string) =>
  parse(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));

const projects = ['website', 'template', 'content-model', 'create-forge', 'browser-oxfmt', 'markdownlint-frontmatter'];

test('project workflows own native filters and weekly/manual validation without GitHub selection', () => {
  for (const name of projects) {
    const workflow = read(name);
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    expect(workflow.on.schedule).toHaveLength(1);
    expect(workflow.on.pull_request.paths).toContain(`.github/workflows/${name}.yml`);
    expect(workflow.on.push.paths).toEqual(workflow.on.pull_request.paths);
    expect(workflow.jobs).not.toHaveProperty('impact');
    expect(workflow.jobs).not.toHaveProperty('validation');
  }
  expect(existsSync(new URL('../.github/workflows/generator.yml', import.meta.url))).toBe(false);
  expect(existsSync(new URL('../.github/actions/ci-impact', import.meta.url))).toBe(false);
  for (const name of readdirSync(new URL('../.github/workflows', import.meta.url))) {
    expect(readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8')).not.toContain('ci-impact');
  }
});

test('Repository quality always runs only root checks and contracts', () => {
  const workflow = read('project');
  for (const event of ['push', 'pull_request']) expect(workflow.on[event]).not.toHaveProperty('paths');
  expect(Object.keys(workflow.jobs)).toEqual(['quality']);
  const job = workflow.jobs.quality;
  expect(job.name).toBe('Repository quality');
  expect(job.if).toBeUndefined();
  expect(job.needs).toBeUndefined();
  const commands = job.steps.flatMap((step: { run?: string }) => (step.run ? [step.run] : [])).join('\n');
  for (const command of [
    'npm run format',
    'npm run lint:code',
    'npm run lint:markdown',
    'npm run spellcheck',
    'npm run docs:validate',
    'npm run test:contracts',
    'npx tsc --noEmit',
  ])
    expect(commands).toContain(command);
  expect(commands).not.toMatch(/--workspace|test:root|typecheck:root|build:native/);
  const scripts = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;
  expect(scripts['test:contracts']).toContain('--exclude scripts/verify-frontmatter-model.test.ts');
  expect(scripts['test:root']).not.toContain('--exclude');
  expect(scripts['test:template:customization']).toBe('node scripts/test-template.ts customization');
});

test('integration has its own tooling triggers without upstream source fan-out or production effects', () => {
  const workflow = read('integration');
  expect(workflow.on).toHaveProperty('workflow_dispatch');
  expect(workflow.on.schedule).toHaveLength(1);
  expect(workflow.on.push.paths).toEqual(workflow.on.pull_request.paths);
  expect(workflow.on.pull_request.paths).toEqual(
    expect.arrayContaining([
      'scripts/verify-frontmatter-model.test.ts',
      'packages/browser-oxfmt/test/sveltia-serialization.ts',
      '.github/workflows/integration.yml',
    ]),
  );
  expect(workflow.on.pull_request.paths.join('\n')).not.toMatch(/packages\/[^/]+\/\*\*/);
  const source = readFileSync(new URL('../.github/workflows/integration.yml', import.meta.url), 'utf8');
  expect(source).toContain('scripts/verify-frontmatter-model.test.ts');
  expect(source).toContain('packages/browser-oxfmt/test/sveltia-serialization.ts');
  expect(source).toContain('npm run build --workspace @rm-industries/content-model');
  expect(source).toContain("native: 'true'");
  expect(source).not.toMatch(/verify-frontmatter-cms|pages: write|id-token: write|npm publish/);
});

test('CLI native paths include every maintained YAML pin source', () => {
  const script = readFileSync(new URL('../packages/create-forge/scripts/write-ci-pins.ts', import.meta.url), 'utf8');
  const sources = [...script.matchAll(/'([.]github\/[^']+[.]yml)'/g)].map((match) => match[1]!);
  expect(sources).toHaveLength(5);
  expect(sources).not.toContain('.github/workflows/project.yml');
  const paths = read('create-forge').on.pull_request.paths;
  for (const source of sources) {
    expect(
      paths.some((path: string) => path === source || (path.endsWith('/**') && source.startsWith(path.slice(0, -2)))),
    ).toBe(true);
  }
});

test('proposed settings migration removes exactly the historical 27 contexts', () => {
  const baseline = readFileSync(new URL('../docs/reviews/ci-baseline-367.md', import.meta.url), 'utf8');
  const historical = baseline
    .split('\n')
    .filter((line) => line.startsWith('| `Tool Format`') || line.startsWith('| `Package generator candidate`'))
    .flatMap((line) => [...line.split('|')[1]!.matchAll(/`([^`]+)`/g)].map((match) => match[1]!));
  const migration = readFileSync(new URL('../docs/reviews/github-workflow-migration-367.md', import.meta.url), 'utf8');
  const replacements = [...migration.matchAll(/^\| +`([^`]+)` +\| +`([^`]+)` +\|$/gm)];
  expect(historical).toHaveLength(27);
  expect(replacements.map((match) => match[1])).toEqual(historical);
  expect(replacements.every((match) => match[2] === 'Repository quality')).toBe(true);
});
