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
    await expect(verifyConsumerLock(directory)).rejects.toThrow('Consumer model must satisfy its declaration');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects a workspace overlay hidden behind a registry manifest', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-consumer-overlay-'));
  try {
    for (const file of ['package.json', 'package-lock.json'])
      await copyFile(new URL(`../templates/default/${file}`, import.meta.url), join(directory, file));
    const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/@rm-industries/content-model'].resolved = '../content-model';
    lock.packages['node_modules/@rm-industries/content-model'].link = true;
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    await expect(verifyConsumerLock(directory)).rejects.toThrow(
      'Consumer lock must contain published registry packages',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects an installed Astro host outside the model package peer requirement', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-model-peer-'));
  try {
    for (const file of ['package.json', 'package-lock.json'])
      await copyFile(new URL(`../templates/default/${file}`, import.meta.url), join(directory, file));
    const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/astro'].version = '6.0.0';
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    await expect(verifyConsumerLock(directory)).rejects.toThrow(
      'Consumer Astro must satisfy the model peer requirement',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
