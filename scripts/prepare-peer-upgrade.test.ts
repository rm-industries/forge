import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { createPeerUpgradePlan, peerRangeFor, preparePeerUpgrade } from './prepare-peer-upgrade.ts';

const rootManifest = { devDependencies: { '@sveltia/cms': '^0.193.2', astro: '^7.2.4' } };
const contentModelManifest = {
  version: '0.1.0-alpha.0',
  peerDependencies: { '@sveltia/cms': '>=0.193.2 <0.194.0', astro: '^7.2.3' },
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe('peer upgrade preparation', () => {
  test('keeps a version already covered by the peer range unchanged', () => {
    expect(createPeerUpgradePlan(rootManifest, contentModelManifest, '@sveltia/cms', '0.193.9')).toMatchObject({
      changed: false,
      nextPackageVersion: '0.1.0-alpha.0',
      nextPeerRange: '>=0.193.2 <0.194.0',
    });
  });

  test('prepares a bounded pre-1.0 peer range and content-model prerelease', () => {
    expect(createPeerUpgradePlan(rootManifest, contentModelManifest, '@sveltia/cms', '0.197.1')).toMatchObject({
      changed: true,
      nextDevelopmentRange: '^0.197.1',
      nextPeerRange: '>=0.197.1 <0.198.0',
      nextPackageVersion: '0.2.0-alpha.0',
    });
  });

  test('uses a caret range for stable peers', () => {
    expect(peerRangeFor('8.1.2')).toBe('^8.1.2');
  });

  test('rejects undeclared peers', () => {
    expect(() => createPeerUpgradePlan(rootManifest, contentModelManifest, 'unknown', '1.0.0')).toThrow(
      /does not declare unknown/,
    );
  });

  test('writes only the root test range and content-model release metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-peer-upgrade-'));
    temporaryDirectories.push(directory);
    await mkdir(join(directory, 'packages/content-model'), { recursive: true });
    await writeFile(join(directory, 'package.json'), `${JSON.stringify(rootManifest, undefined, 2)}\n`);
    await writeFile(
      join(directory, 'packages/content-model/package.json'),
      `${JSON.stringify(contentModelManifest, undefined, 2)}\n`,
    );

    await preparePeerUpgrade({
      cwd: directory,
      dependency: '@sveltia/cms',
      targetVersion: '0.197.1',
      write: true,
    });

    const updatedRoot = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const updatedContentModel = JSON.parse(
      await readFile(join(directory, 'packages/content-model/package.json'), 'utf8'),
    );
    expect(updatedRoot).toEqual({ devDependencies: { '@sveltia/cms': '^0.197.1', astro: '^7.2.4' } });
    expect(updatedContentModel).toEqual({
      ...contentModelManifest,
      version: '0.2.0-alpha.0',
      peerDependencies: { '@sveltia/cms': '>=0.197.1 <0.198.0', astro: '^7.2.3' },
    });
  });
});
