import { describe, expect, test } from 'vitest';

import { createPackageReleasePlan, releaseNotesFor } from './prepare-package-release.ts';

const changelog = `# Changelog

## 0.2.0-alpha.0

- Support a newer peer.

## 0.1.0-alpha.0

- Initial release.
`;

describe('package release preparation', () => {
  test('creates a package-scoped prerelease plan', () => {
    expect(
      createPackageReleasePlan({
        packageSlug: 'content-model',
        manifest: { name: '@rm-industries/content-model', version: '0.2.0-alpha.0' },
        changelog,
        gitSha: 'abc123',
        releaseTag: 'content-model-v0.2.0-alpha.0',
      }),
    ).toMatchObject({
      npmTag: 'next',
      prerelease: true,
      releaseNotes: '## 0.2.0-alpha.0\n\n- Support a newer peer.',
      workspace: 'packages/content-model',
    });
  });

  test('uses latest for a stable release', () => {
    const stableChangelog = '# Changelog\n\n## 1.0.0\n\n- Stable.\n';
    expect(
      createPackageReleasePlan({
        packageSlug: 'create-forge',
        manifest: { name: '@rm-industries/create-forge', version: '1.0.0' },
        changelog: stableChangelog,
        gitSha: 'abc123',
      }).npmTag,
    ).toBe('latest');
  });

  test('rejects a tag that does not match the manifest version', () => {
    expect(() =>
      createPackageReleasePlan({
        packageSlug: 'content-model',
        manifest: { name: '@rm-industries/content-model', version: '0.2.0-alpha.0' },
        changelog,
        gitSha: 'abc123',
        releaseTag: 'content-model-v0.3.0-alpha.0',
      }),
    ).toThrow(/does not match/);
  });

  test('rejects mismatched tarball identity', () => {
    expect(() =>
      createPackageReleasePlan({
        packageSlug: 'content-model',
        manifest: { name: '@rm-industries/content-model', version: '0.2.0-alpha.0' },
        changelog,
        gitSha: 'abc123',
        packResult: { name: '@rm-industries/create-forge', version: '0.2.0-alpha.0' },
      }),
    ).toThrow(/identity/);
  });

  test('requires an exact changelog section', () => {
    expect(() => releaseNotesFor(changelog, '0.3.0')).toThrow(/Changelog/);
  });
});
