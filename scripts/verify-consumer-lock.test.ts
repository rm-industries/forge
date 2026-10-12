import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { verifyConsumerLock } from './verify-consumer-lock.ts';

test('accepts locked registry dependencies and rejects a substituted content-model', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-consumer-lock-'));
  try {
    for (const file of ['package.json', 'package-lock.json'])
      await copyFile(new URL(`../templates/default/${file}`, import.meta.url), join(directory, file));
    await verifyConsumerLock(directory);
    const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/@rm-industries/content-model'].version = '0.0.0';
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    await expect(verifyConsumerLock(directory)).rejects.toThrow(
      'Consumer must retain the template content-model lock entry',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
