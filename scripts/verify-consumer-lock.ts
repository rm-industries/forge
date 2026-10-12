import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertStarterIsolation, findLocalDependencies } from './verify-template.ts';

export async function verifyConsumerLock(directory: string) {
  const template = JSON.parse(
    await readFile(new URL('../templates/default/package-lock.json', import.meta.url), 'utf8'),
  );
  const consumer = JSON.parse(await readFile(resolve(directory, 'package-lock.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  const contentModelPath = 'node_modules/@rm-industries/content-model';
  assert.ok(template.packages[contentModelPath], 'Template must lock content-model');
  assert.deepEqual(
    consumer.packages[contentModelPath],
    template.packages[contentModelPath],
    'Consumer must retain the template content-model lock entry',
  );
  assert.equal(
    manifest.dependencies['@rm-industries/content-model'],
    template.packages[''].dependencies['@rm-industries/content-model'],
    'Consumer must retain the declared content-model version',
  );
  assert.deepEqual(findLocalDependencies(manifest), [], 'Consumer dependencies must resolve from registries');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Provide the bootstrapped consumer directory');
  await verifyConsumerLock(process.argv[2]);
  await assertStarterIsolation(process.argv[2]);
}
