import { describe, expect, test } from 'vitest';

import { createTemplateSyncPlan } from './prepare-template-sync.ts';

const templateManifest = {
  dependencies: {
    '@rm-industries/content-model': '^1.1.10',
    '@sveltia/cms': '>=0.251.0 <1.0.0',
    '@rm-industries/browser-oxfmt': '^0.1.2',
  },
  devDependencies: { oxfmt: '>=0.74.0 <1.0.0' },
};
const templateLock = {
  packages: {
    'node_modules/@rm-industries/content-model': { version: '1.1.10' },
    'node_modules/@sveltia/cms': { version: '0.251.0' },
    'node_modules/@rm-industries/browser-oxfmt': { version: '0.1.2' },
    'node_modules/oxfmt': { version: '0.74.0' },
  },
};
const registryMetadata = {
  name: '@rm-industries/content-model',
  version: '1.1.11',
  peerDependencies: { '@sveltia/cms': '>=0.251.0 <0.253.0' },
  dist: {
    integrity: 'sha512-example',
    attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
  },
};
const publication = {
  packageName: '@rm-industries/content-model',
  version: '1.1.11',
  releaseTag: 'content-model-v1.1.11',
  publication: { registryIntegrity: 'sha512-example', verified: true },
};
const input = {
  templateManifest,
  templateLock,
  registryMetadata,
  integrationVersions: ['0.251.0', '0.252.0', '1.0.0'],
  publication,
};

describe('compatible authoring refresh', () => {
  test('selects the verified model and newest host inside both unchanged ranges using lock selections', () => {
    expect(createTemplateSyncPlan(input)).toMatchObject({
      changed: true,
      package: { name: '@rm-industries/content-model', previousVersion: '1.1.10', version: '1.1.11' },
      integration: { name: '@sveltia/cms', previousVersion: '0.251.0', version: '0.252.0' },
    });
    expect(
      createTemplateSyncPlan({
        ...input,
        registryMetadata: { ...registryMetadata, version: '1.1.10' },
        publication: undefined,
        integrationVersions: ['0.251.0'],
      }).changed,
    ).toBe(false);
  });
  test('refreshes the browser package with its exact embedded engine inside the CLI range', () => {
    const plan = createTemplateSyncPlan({
      ...input,
      publication: undefined,
      registryMetadata: {
        ...registryMetadata,
        name: '@rm-industries/browser-oxfmt',
        version: '0.1.3',
        peerDependencies: { oxfmt: '0.75.0' },
      },
      integrationVersions: ['0.74.0', '0.75.0', '0.76.0'],
    });
    expect(plan).toMatchObject({
      package: { name: '@rm-industries/browser-oxfmt', version: '0.1.3' },
      integration: { name: 'oxfmt', section: 'devDependencies', version: '0.75.0' },
    });
  });
  test('rejects out-of-range publication, invalid provenance and disjoint peer constraints', () => {
    expect(() =>
      createTemplateSyncPlan({
        ...input,
        publication: undefined,
        registryMetadata: { ...registryMetadata, version: '2.0.0' },
      }),
    ).toThrow(/outside the template range/);
    expect(() =>
      createTemplateSyncPlan({
        ...input,
        registryMetadata: { ...registryMetadata, dist: { integrity: 'sha512-example' } },
      }),
    ).toThrow(/provenance/);
    expect(() => createTemplateSyncPlan({ ...input, integrationVersions: ['1.0.0'] })).toThrow(/No published/);
    expect(() =>
      createTemplateSyncPlan({ ...input, publication: { ...publication, publication: { verified: false } } }),
    ).toThrow(/not verified/);
    expect(() =>
      createTemplateSyncPlan({
        ...input,
        publication: { ...publication, publication: { verified: true, registryIntegrity: 'sha512-other' } },
      }),
    ).toThrow(/integrity do not match/);
    expect(() =>
      createTemplateSyncPlan({ ...input, publication: { ...publication, releaseTag: 'content-model-v1.1.12' } }),
    ).toThrow(/release tag/);
    expect(() =>
      createTemplateSyncPlan({
        ...input,
        publication: undefined,
        registryMetadata: {
          ...registryMetadata,
          name: '@rm-industries/browser-oxfmt',
          version: '0.2.0',
          peerDependencies: { oxfmt: '0.75.0' },
        },
        integrationVersions: ['0.75.0'],
      }),
    ).toThrow(/outside the template range/);
  });
  test('honors exact corrective pins and the host ceiling', () => {
    expect(
      createTemplateSyncPlan({
        ...input,
        templateManifest: { dependencies: { '@rm-industries/content-model': '1.1.11', '@sveltia/cms': '0.251.0' } },
      }).integration.version,
    ).toBe('0.251.0');
  });
});
