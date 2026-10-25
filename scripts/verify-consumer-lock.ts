import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { satisfies } from 'semver';

import { assertStarterIsolation, findLocalDependencies } from './verify-template.ts';

export async function verifyConsumerLock(directory: string) {
  const consumer = JSON.parse(await readFile(resolve(directory, 'package-lock.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  for (const [path, entry] of Object.entries(consumer.packages) as [
    string,
    { link?: boolean; resolved?: string; integrity?: string },
  ][]) {
    if (!path) continue;
    assert.ok(
      !entry.link && /^https?:\/\//u.test(entry.resolved ?? '') && entry.integrity,
      `Consumer lock must contain published registry packages: ${path}`,
    );
  }
  const model = consumer.packages['node_modules/@rm-industries/content-model'];
  const cms = consumer.packages['node_modules/@sveltia/cms'];
  assert.ok(model && cms, 'Consumer must lock published model and CMS packages');
  assert.ok(
    satisfies(model.version, manifest.dependencies['@rm-industries/content-model']),
    'Consumer model must satisfy its declaration',
  );
  assert.ok(satisfies(cms.version, manifest.dependencies['@sveltia/cms']));
  assert.ok(satisfies(cms.version, model.peerDependencies['@sveltia/cms']));
  assert.ok(
    satisfies(consumer.packages['node_modules/astro']?.version ?? '', model.peerDependencies.astro),
    'Consumer Astro must satisfy the model peer requirement',
  );
  const browser = consumer.packages['node_modules/@rm-industries/browser-oxfmt'];
  const cli = consumer.packages['node_modules/oxfmt'];
  assert.ok(browser && cli, 'Consumer must lock published browser and CLI formatter packages');
  assert.ok(
    satisfies(browser.version, manifest.dependencies['@rm-industries/browser-oxfmt']),
    'Consumer browser must satisfy its declaration',
  );
  assert.ok(satisfies(cli.version, manifest.devDependencies.oxfmt), 'Consumer CLI must satisfy its declaration');
  assert.equal(cli.version, browser.peerDependencies.oxfmt, 'Consumer CLI must match the browser engine peer');
  assert.deepEqual(findLocalDependencies(manifest), [], 'Consumer dependencies must resolve from registries');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Provide the bootstrapped consumer directory');
  await verifyConsumerLock(process.argv[2]);
  await assertStarterIsolation(process.argv[2]);
}
