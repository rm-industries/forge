import { describe, expect, test } from 'vitest';

import { applyTemplateSync, createTemplateSyncPlan } from './prepare-template-sync.ts';

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
  test('selects the latest published integration inside the declared peer range', () => {
    const plan = createTemplateSyncPlan({
      templateManifest,
      registryMetadata,
      integrationVersions: ['0.203.2', '0.203.5', '0.204.0'],
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
