import { describe, expect, test } from 'vitest';

import { applyTemplateSync, createTemplateSyncPlan, prepareGeneratorPatch } from './prepare-template-sync.ts';

const templateManifest = {
  dependencies: {
    '@rm-industries/content-model': '0.1.0-alpha.0',
    '@sveltia/cms': '0.193.2',
    astro: '^7.2.3',
  },
};

const registryMetadata = {
  name: '@rm-industries/content-model',
  version: '0.2.0-alpha.0',
  peerDependencies: { '@sveltia/cms': '>=0.203.2 <0.204.0' },
  dist: {
    integrity: 'sha512-example',
    attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
  },
};

const publication = {
  packageName: '@rm-industries/content-model',
  version: '0.2.0-alpha.0',
  releaseTag: 'content-model-v0.2.0-alpha.0',
  publication: { registryIntegrity: 'sha512-example', verified: true },
};

describe('template publication synchronization', () => {
  test('prepares a generator patch only when the shipped template changes', () => {
    const plan = createTemplateSyncPlan({
      templateManifest,
      registryMetadata,
      integrationVersions: ['0.203.2'],
      publication,
    });
    const manifest = { version: '1.0.3' };
    const changelog = '# Changelog\n\n## 1.0.3\n\n- Previous release.\n';
    const release = prepareGeneratorPatch(manifest, changelog, plan);
    expect(release.manifest.version).toBe('1.0.4');
    expect(release.changelog).toContain('content-model 0.2.0-alpha.0 and Sveltia CMS 0.203.2');
    expect(prepareGeneratorPatch(manifest, changelog, { ...plan, changed: false })).toEqual({ manifest, changelog });
    expect(() => prepareGeneratorPatch(manifest, '# Empty changelog', plan)).toThrow('no release sections');
  });
  test('selects the latest published integration inside the declared peer range', () => {
    const plan = createTemplateSyncPlan({
      templateManifest,
      registryMetadata,
      integrationVersions: ['0.203.2', '0.203.5', '0.204.0-rc.1', '0.204.0'],
      publication,
    });

    expect(plan).toMatchObject({
      changed: true,
      contentModel: { previousVersion: '0.1.0-alpha.0', version: '0.2.0-alpha.0' },
      integration: { peerRange: '>=0.203.2 <0.204.0', version: '0.203.5' },
      releaseTag: 'content-model-v0.2.0-alpha.0',
    });
    expect(applyTemplateSync(templateManifest, plan)).toEqual({
      dependencies: {
        '@rm-industries/content-model': '0.2.0-alpha.0',
        '@sveltia/cms': '0.203.5',
        astro: '^7.2.3',
      },
    });
  });

  test('rejects an unverified publication result', () => {
    expect(() =>
      createTemplateSyncPlan({
        templateManifest,
        registryMetadata,
        integrationVersions: ['0.203.2'],
        publication: { ...publication, publication: { ...publication.publication, verified: false } },
      }),
    ).toThrow(/not verified/);
  });

  test('rejects registry integrity that differs from the publication', () => {
    expect(() =>
      createTemplateSyncPlan({
        templateManifest,
        registryMetadata,
        integrationVersions: ['0.203.2'],
        publication: {
          ...publication,
          publication: { ...publication.publication, registryIntegrity: 'sha512-other' },
        },
      }),
    ).toThrow(/integrity do not match/);
  });

  test('rejects a release tag that differs from the registry version', () => {
    expect(() =>
      createTemplateSyncPlan({
        templateManifest,
        registryMetadata,
        integrationVersions: ['0.203.2'],
        publication: { ...publication, releaseTag: 'content-model-v0.3.0-alpha.0' },
      }),
    ).toThrow(/release tag does not match/);
  });

  test('rejects integration versions outside the peer range', () => {
    expect(() =>
      createTemplateSyncPlan({
        templateManifest,
        registryMetadata,
        integrationVersions: ['0.204.0'],
        publication,
      }),
    ).toThrow(/No published/);
  });
});
