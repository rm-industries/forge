import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { verifyConsumerLock } from './verify-consumer-lock.ts';

const prepareConsumer = async (directory: string) => {
  await copyFile(new URL('../templates/default/package.json', import.meta.url), join(directory, 'package.json'));
  const packages = {
    'node_modules/@rm-industries/content-model': {
      version: '1.1.10',
      peerDependencies: { astro: '^7.4.0', '@sveltia/cms': '>=0.251.0 <1.0.0' },
    },
    'node_modules/@sveltia/cms': { version: '0.251.0' },
    'node_modules/astro': { version: '7.4.2' },
    'node_modules/@rm-industries/browser-oxfmt': { version: '0.1.2', peerDependencies: { oxfmt: '0.74.0' } },
    'node_modules/oxfmt': { version: '0.74.0' },
  };
  await writeFile(
    join(directory, 'package-lock.json'),
    JSON.stringify({
      lockfileVersion: 3,
      packages: Object.fromEntries(
        Object.entries(packages).map(([path, entry]) => [
          path,
          {
            ...entry,
            resolved: `https://registry.npmjs.org/${path.slice('node_modules/'.length)}/-/fixture.tgz`,
            integrity: 'sha512-fixture',
          },
        ]),
      ),
    }),
  );
};

test('accepts locked registry dependencies and rejects a substituted content-model', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-consumer-lock-'));
  try {
    await prepareConsumer(directory);
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
    await prepareConsumer(directory);
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
    await prepareConsumer(directory);
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

test('rejects a CLI engine that differs from the browser package exact peer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-formatter-lock-'));
  try {
    await prepareConsumer(directory);
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
    await prepareConsumer(directory);
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
