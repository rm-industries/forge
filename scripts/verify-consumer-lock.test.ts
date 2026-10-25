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

test('rejects a CLI engine that differs from the browser package exact peer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-formatter-lock-'));
  try {
    for (const file of ['package.json', 'package-lock.json'])
      await copyFile(new URL(`../templates/default/${file}`, import.meta.url), join(directory, file));
    const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/oxfmt'].version = '0.75.0';
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    await expect(verifyConsumerLock(directory)).rejects.toThrow('Consumer CLI must match the browser engine peer');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('accepts a later paired patch but excludes browser 0.2', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-formatter-patch-'));
  try {
    for (const file of ['package.json', 'package-lock.json'])
      await copyFile(new URL(`../templates/default/${file}`, import.meta.url), join(directory, file));
    const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'));
    const browser = lock.packages['node_modules/@rm-industries/browser-oxfmt'];
    browser.version = '0.1.3';
    browser.peerDependencies.oxfmt = '0.75.0';
    lock.packages['node_modules/oxfmt'].version = '0.75.0';
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    await verifyConsumerLock(directory);
    browser.version = '0.2.0';
    await writeFile(join(directory, 'package-lock.json'), JSON.stringify(lock));
    await expect(verifyConsumerLock(directory)).rejects.toThrow('Consumer browser must satisfy its declaration');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
