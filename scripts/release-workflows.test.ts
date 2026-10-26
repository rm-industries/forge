import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

const read = (name: string) =>
  parse(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));
const release = read('package-release');

test('keeps manual publication gated while reviewed automatic patches use their own environment', () => {
  expect(release.jobs.publish.if).toBe("needs.prepare.outputs.publish == 'true'");
  expect(release.jobs.publish.environment).toBe('${{ needs.prepare.outputs.release-environment }}');
  expect(release.jobs.prepare.outputs['release-environment']).toBe(
    "${{ steps.automatic.outputs.eligible == 'true' && 'npm-release-auto' || 'npm-release' }}",
  );
  expect(release.jobs.prepare.outputs.publish).toContain("github.event_name == 'push'");
  const steps = release.jobs.publish.steps as { name: string; run?: string }[];
  const tag = steps.find((step) => step.name === 'Ensure immutable package tag')!;
  expect(tag.run).toContain('test "$existing_sha" = "$GITHUB_SHA"');
  expect(tag.run).not.toContain('--force');
});

test('packs the planned release instead of inferring a package from the triggering branch', () => {
  const pack = release.jobs.prepare.steps.find((step: { name: string }) => step.name === 'Pack release artifact');
  expect(pack.env.RELEASE_TAG).toBe('${{ steps.plan.outputs.release-tag }}');
  expect(pack.run).toContain('--tag "$RELEASE_TAG"');
  expect(pack.run).not.toContain('GITHUB_REF_NAME');
  expect(pack.env).not.toHaveProperty('INPUT_PACKAGE');
});

test('engine updates validate native and browser behavior before creating a reviewed PR', () => {
  const workflow = read('oxfmt-upgrades');
  const steps = workflow.jobs.prepare.steps as { name: string; run?: string }[];
  const validation = steps.findIndex((step) => step.name === 'Validate proposed engine');
  expect(steps[validation]!.run).toContain('npm run quality');
  expect(steps[validation]!.run).toContain('test:browser');
  expect(steps[validation]!.run).toContain('sveltia-serialization.ts');
  expect(steps.findIndex((step) => step.name === 'Create GitHub App token')).toBeGreaterThan(validation);
  const push = steps.find((step) => step.name === 'Push engine upgrade branch')!.run!;
  expect(push).toContain('git ls-remote');
  expect(push).not.toContain('--force');
  expect(JSON.stringify(workflow)).not.toContain('--auto');
  expect(JSON.stringify(workflow)).not.toContain('npm publish');
});

test('limits publication permissions and retains provenance', () => {
  expect(release.jobs.prepare.outputs.publish).toContain("github.event_name == 'push'");
  expect(release.jobs.publish.permissions['id-token']).toBe('write');
  expect(release.jobs.prepare.permissions).not.toHaveProperty('id-token');
  const steps = release.jobs.publish.steps as { name: string; run?: string; if?: string }[];
  expect(steps.find((step) => step.name === 'Publish with provenance')!.run).toContain('--provenance');
});

test('fresh monitoring shares one selection across daily and weekly coverage with retained reports', () => {
  const workflow = read('fresh-consumer');
  expect(workflow.on.schedule).toContainEqual({ cron: '23 7 * * 1' });
  expect(workflow.on.workflow_dispatch.inputs.coverage.options).toEqual(['daily', 'weekly']);
  const consumer = workflow.jobs.consumer;
  expect(consumer.needs).toBe('select');
  expect(consumer.strategy['fail-fast']).toBe(false);
  expect(consumer.strategy.matrix).toBe('${{ fromJSON(needs.select.outputs.matrix) }}');
  const steps = consumer.steps as { name?: string; uses?: string; run?: string; with?: Record<string, unknown> }[];
  expect(steps.find((step) => step.uses?.startsWith('actions/download-artifact@'))!.with!.name).toBe('fresh-selection');
  expect(steps.find((step) => step.name === 'Validate isolated public consumer')!.run).toContain('"$PROBE"');
  const reports = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'))!;
  expect(reports.with!['include-hidden-files']).toBe(true);
  expect(reports.with!.path).toContain('/consumer/.lighthouseci');
  expect(workflow.permissions).toEqual({});
});
