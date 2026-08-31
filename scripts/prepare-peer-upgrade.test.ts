import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  addPeerReleaseNotes,
  createPeerUpgradePlan,
  peerRangeFor,
  preparePeerUpgrade,
  resolveRegistryVersion,
} from './prepare-peer-upgrade.ts';

const rootManifest = { devDependencies: { '@sveltia/cms': '^0.193.2', astro: '^7.2.4' } };
const contentModelManifest = {
  version: '0.1.0-alpha.0',
  peerDependencies: { '@sveltia/cms': '>=0.193.2 <0.194.0', astro: '^7.2.3' },
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
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

  test('resolves scoped package versions from standard registry metadata', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ version: '0.203.2' })));

    await expect(resolveRegistryVersion('@sveltia/cms')).resolves.toBe('0.203.2');
    expect(fetchMock).toHaveBeenCalledWith('https://registry.npmjs.org/%40sveltia%2Fcms/latest', {
      headers: { accept: 'application/json' },
    });
  });

  test('adds idempotent compatibility release notes', () => {
    const plan = createPeerUpgradePlan(rootManifest, contentModelManifest, '@sveltia/cms', '0.197.1');
    const changelog = '# Changelog\n\nIntroduction.\n\n## 0.1.0-alpha.0\n\n- Initial release.\n';
    const updated = addPeerReleaseNotes(changelog, plan);
    expect(updated).toContain('## 0.2.0-alpha.0');
    expect(updated).toContain('`>=0.193.2 <0.194.0` to `>=0.197.1 <0.198.0`');
    expect(addPeerReleaseNotes(updated, plan)).toBe(updated);
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
    await writeFile(
      join(directory, 'packages/content-model/CHANGELOG.md'),
      '# Changelog\n\nIntroduction.\n\n## 0.1.0-alpha.0\n\n- Initial release.\n',
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
    await expect(readFile(join(directory, 'packages/content-model/CHANGELOG.md'), 'utf8')).resolves.toContain(
      '## 0.2.0-alpha.0',
    );
  });
});
