import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const workflow = async (name: string) => parse(await readFile(`.github/workflows/${name}.yml`, 'utf8'));
const commands = (job: { steps: { run?: string }[] }) => job.steps.map((step) => step.run ?? '').join('\n');

describe('Template and Create Forge ownership', () => {
  it('runs native filters and full Template consumers without rebuilding', async () => {
    const template = await workflow('template');
    expect(template.on.pull_request.paths).toContain('templates/default/**');
    expect(template.on.pull_request.paths).toContain('package-lock.json');
    expect(template.jobs.impact).toBeUndefined();
    expect(commands(template.jobs['runtime'])).toContain('prepare');
    expect(commands(template.jobs['runtime'])).toContain('npm run build');
    for (const id of ['browser', 'lighthouse', 'validate-build']) {
      expect(template.jobs[id].needs).toContain('runtime');
      expect(commands(template.jobs[id])).not.toMatch(/npm run build(?:\s|$)/u);
      expect(
        template.jobs[id].steps.some((step: { with?: { name?: string } }) => step.with?.name === 'template-build'),
      ).toBe(true);
    }
    expect(commands(template.jobs['runtime'])).toContain('-C "$RUNNER_TEMP/forge-template" .');
    expect(commands(template.jobs['runtime'])).toContain('-C "$RUNNER_TEMP/forge-template" dist');
    expect(commands(template.jobs.browser)).toContain('npm run test:e2e');
    expect(commands(template.jobs.lighthouse)).toContain('npm run lighthouse:ci');
    expect(commands(template.jobs.customization)).toContain('test:template:customization');
    expect(commands(template.jobs['static-tool-regressions'])).toContain('verify:template:static');
  });

  it('retains CLI runtime scenarios and packed smoke without template browsers', async () => {
    const cli = await workflow('create-forge');
    expect(cli.on.pull_request.paths).toEqual(
      expect.arrayContaining(['templates/default/**', 'packages/create-forge/**', 'package-lock.json']),
    );
    expect(cli.jobs.impact).toBeUndefined();
    expect(JSON.stringify(cli.jobs)).not.toMatch(/playwright|lighthouse:ci|test:template:customization/u);
    expect(
      cli.jobs.scenarios.strategy.matrix.include.map((lane: { node: string; os: string }) => [lane.node, lane.os]),
    ).toEqual([
      ['22.22.2', 'ubuntu-latest'],
      ['22.x', 'ubuntu-latest'],
      ['24.x', 'ubuntu-latest'],
      ['26.x', 'ubuntu-latest'],
      ['26.x', 'macos-latest'],
    ]);
    expect(JSON.stringify(cli.jobs).match(/npm pack --ignore-scripts/gu)).toHaveLength(1);
    expect(commands(cli.jobs.scenarios)).toContain('test-generator-e2e.ts');
    expect(
      cli.jobs.scenarios.steps.find((step: { env?: { FORGE_CLI_TARBALL?: string } }) => step.env?.FORGE_CLI_TARBALL),
    ).toBeDefined();
    const source = await readFile('packages/create-forge/scripts/test-generator-e2e.ts', 'utf8');
    expect(source).toContain("['ci']");
    expect(source).toContain("['run', 'build']");
    expect(source).toContain("['run', 'validate:build']");
    expect(source).not.toContain('runBrowser');
    expect(cli.jobs.syntax.steps.at(-1).uses).toMatch(/^raven-actions\/actionlint@/u);
    expect(cli.jobs.syntax.steps.at(-1).with.files).toContain('forge-consumer/.github/workflows/*.yml');
    expect(cli.jobs.security.steps.at(-1).with.inputs).toBe('.ci-consumer/.github');
    expect(cli.jobs.security).toBeDefined();
  });

  it('prepares an isolated canonical starter through its public command, including hidden files and starter tests', async () => {
    const root = await mkdtemp(join(tmpdir(), 'template-contract-'));
    const destination = join(root, 'starter');
    try {
      execFileSync(process.execPath, ['scripts/test-template.ts', 'prepare', destination], { stdio: 'pipe' });
      expect(await readFile(join(destination, '.gitignore'), 'utf8')).toContain('node_modules');
      expect(() =>
        execFileSync(process.execPath, ['scripts/test-template.ts', 'prepare', destination], { stdio: 'pipe' }),
      ).toThrow('Template destination already exists');
      expect(await readFile(join(destination, 'tests/starter-routes.spec.ts'), 'utf8')).toBeTruthy();
      expect(await readFile(join(destination, 'src/config/site.ts'), 'utf8')).toContain('https://example.com');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
