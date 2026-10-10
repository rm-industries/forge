import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const readWorkflow = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const website = readWorkflow('../.github/workflows/website-project.yml');
const project = readWorkflow('../.github/workflows/project.yml');
const deployment = readWorkflow('../templates/default/.github/workflows/deployment.yml');

describe('native CI integration', () => {
  it('keeps website execution scoped and gives the root its own graph', () => {
    expect(website.jobs.build.needs).toContain('unitTests');
    expect(
      website.jobs.build.steps.some(
        (step: { run?: string }) => step.run === "npm --prefix 'website' run pipeline -- 'build'",
      ),
    ).toBe(true);
    expect(project.jobs.generatorCompatibility.strategy.matrix.os).toEqual(['ubuntu-latest', 'macos-latest']);
    expect(project.jobs.generatorCompatibility['runs-on']).toBe('${{ matrix.os }}');
    expect(project.jobs.project.needs).toContain('ciCheck');
  });

  it('retains editable Pages environment and outputs with a trusted validation trigger', () => {
    expect(deployment.on.workflow_run.workflows).toEqual(['Project Continuous Integration']);
    for (const condition of [
      "conclusion == 'success'",
      "event == 'push'",
      "head_branch == 'main'",
      'head_repository.full_name == github.repository',
    ]) {
      expect(deployment.jobs.deploy.if).toContain(condition);
    }
    expect(deployment.jobs.deploy.environment.name).toBe('github-pages');
    expect(deployment.jobs.deploy.outputs['page-url']).toBe('${{ steps.deployment.outputs.page_url }}');
    const download = deployment.jobs.deploy.steps.find((step: { uses?: string }) =>
      step.uses?.startsWith('actions/download-artifact@'),
    );
    expect(download.with).toMatchObject({ name: 'site-build', 'run-id': '${{ github.event.workflow_run.id }}' });
    expect(deployment.jobs['smoke-deployed'].needs).toEqual(['deploy']);
  });
});
