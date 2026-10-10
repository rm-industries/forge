import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { discoverCiFiles, discoverTargets } from '@zuke/core';
import { parse } from 'yaml';

import { loadPins } from './load.ts';
import { createSiteBuild, type SiteCiConfig } from './site.ts';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const pins = loadPins(projectRoot, projectRoot);
const config: SiteCiConfig = {
  directory: 'website',
  repositoryRoot: '/tmp/ci-test-output',
  prefix: 'website',
  providers: ['github', 'gitlab'],
  primary: 'github',
  securityMinute: 17,
  automationMinute: 43,
};

Deno.test('native target relationships drive hosted dependencies and project paths', () => {
  const Build = createSiteBuild(projectRoot, config, pins);
  const build = new Build();
  const targets = discoverTargets(build);
  const files = discoverCiFiles(build);
  const project = files.find((file) => file.path.endsWith('website-project.yml'))!;
  const workflow = parse(project.render());
  assert.equal(workflow.name, 'website: Project Continuous Integration');
  assert.deepEqual(
    workflow.jobs.build.needs.sort(),
    ['format', 'lintCode', 'lintStyles', 'lintMarkdown', 'spellcheck', 'auditUnused', 'typecheck', 'unitTests'].sort(),
  );
  for (const [name, job] of Object.entries(workflow.jobs) as Array<[string, { steps: Array<{ run?: string }> }]>) {
    assert.ok(targets.has(name), `Hosted job ${name} must use a local target`);
    if (name !== 'quality')
      assert.ok(job.steps.some((step) => step.run === `npm --prefix 'website' run pipeline -- '${name}'`));
  }
  assert.deepEqual(workflow.jobs.quality.needs.sort(), ['validateBuild', 'browserTests', 'lighthouse', 'audit'].sort());
  assert.equal(workflow.jobs.build.steps.at(-1).with.path, 'website/dist');
  assert.equal(workflow.jobs.build.steps.at(-1).with.name, 'site-build');
  assert.equal(workflow.concurrency.group, '${{ github.workflow_ref }}-${{ github.ref }}');
  assert.deepEqual(workflow.jobs.compatibility.strategy.matrix.node, ['22.22.2', '22', '24', '26']);
  const gitlab = parse(files.find((file) => file.provider === 'gitlab')!.render());
  assert.ok(JSON.stringify(gitlab).includes("npm --prefix 'website' run pipeline -- 'quality'"));
  const security = parse(files.find((file) => file.path.endsWith('website-security.yml'))!.render());
  assert.equal(security.on.schedule[0].cron, '17 5 * * 1');
});
