import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

const read = (name: string) =>
  parse(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));
const peer = read('peer-upgrades');
const synchronize = read('template-sync');
const release = read('package-release');

test('prepares Friday updates with the target installed before quality checks', () => {
  expect(peer.on.schedule[0].cron).toBe('7 6 * * 5');
  const steps = peer.jobs.prepare.steps as { name: string; run?: string }[];
  const position = (name: string) => steps.findIndex((step) => step.name === name);
  expect(position('Install the proposed integration')).toBeGreaterThan(position('Regenerate workspace lockfile'));
  expect(position('Install the proposed integration')).toBeLessThan(position('Validate compatibility change'));
  expect(steps[position('Install the proposed integration')]!.run).toBe('npm ci');
  expect(peer.jobs['synchronize-compatible'].if).toContain("changed == 'false'");
  expect(peer.jobs['synchronize-compatible'].steps[0].run).toContain('template-sync.yml --ref main');
});

test('keeps manual publication gated while reviewed automatic patches use their own environment', () => {
  expect(release.on.push.branches).toEqual(['main']);
  expect(release.on.push.tags).toEqual(['content-model-v*', 'create-forge-v*']);
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
  const preparation = release.jobs.prepare.steps as { run?: string }[];
  expect(preparation.some((step) => step.run?.includes('npm run audit'))).toBe(false);
});

test('synchronizes and releases a generator patch behind normal required checks', () => {
  const steps = synchronize.jobs.synchronize.steps as { name: string; run?: string }[];
  expect(steps.find((step) => step.name === 'Refresh generator lockfile and dependencies')!.run).toContain(
    'npm ci --prefix templates/default',
  );
  expect(steps.find((step) => step.name === 'Push synchronization branch')!.run).toContain(
    'packages/create-forge/CHANGELOG.md',
  );
  expect(steps.find((step) => step.name === 'Enable checked synchronization auto-merge')!.run).toContain(
    '--auto --squash',
  );
  expect(steps.find((step) => step.name === 'Enable checked synchronization auto-merge')!.run).toContain(
    'prerelease(process.env.CONTENT_MODEL)',
  );
});

test('packs the planned release instead of inferring a package from the triggering branch', () => {
  const pack = release.jobs.prepare.steps.find((step: { name: string }) => step.name === 'Pack release artifact');
  expect(pack.env.RELEASE_TAG).toBe('${{ steps.plan.outputs.release-tag }}');
  expect(pack.run).toContain('--tag "$RELEASE_TAG"');
  expect(pack.run).not.toContain('GITHUB_REF_NAME');
  expect(pack.env).not.toHaveProperty('INPUT_PACKAGE');
});
