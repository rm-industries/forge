import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { maxSatisfying, satisfies, valid } from 'semver';

const contentModelName = '@rm-industries/content-model';
const integrationName = '@sveltia/cms';

type PackageManifest = {
  dependencies?: Record<string, string>;
};

type RegistryMetadata = {
  name?: string;
  version?: string;
  peerDependencies?: Record<string, string>;
  dist?: {
    integrity?: string;
    attestations?: {
      provenance?: {
        predicateType?: string;
      };
    };
  };
};

type PublicationResult = {
  packageName?: string;
  releaseTag?: string;
  version?: string;
  publication?: {
    registryIntegrity?: string;
    verified?: boolean;
  };
};

export type TemplateSyncPlan = {
  changed: boolean;
  contentModel: {
    integrity: string;
    previousVersion: string;
    version: string;
  };
  integration: {
    name: typeof integrationName;
    peerRange: string;
    previousVersion: string;
    version: string;
  };
  provenancePredicate: string;
  releaseTag: string;
};

const requireValue = (value: string | undefined, field: string) => {
  if (!value) throw new Error(`${field} is required.`);
  return value;
};

const requireVersion = (value: string | undefined, field: string) => {
  const version = requireValue(value, field);
  if (!valid(version)) throw new Error(`${field} must be an exact semantic version.`);
  return version;
};

export const createTemplateSyncPlan = ({
  templateManifest,
  registryMetadata,
  integrationVersions,
  publication,
}: {
  templateManifest: PackageManifest;
  registryMetadata: RegistryMetadata;
  integrationVersions: string[];
  publication?: PublicationResult;
}): TemplateSyncPlan => {
  if (registryMetadata.name !== contentModelName) throw new Error('Registry package identity is not content-model.');
  const version = requireVersion(registryMetadata.version, 'Registry package version');
  const integrity = requireValue(registryMetadata.dist?.integrity, 'Registry integrity');
  const peerRange = requireValue(registryMetadata.peerDependencies?.[integrationName], 'Sveltia peer range');
  const provenancePredicate = requireValue(
    registryMetadata.dist?.attestations?.provenance?.predicateType,
    'Registry provenance predicate',
  );
  if (provenancePredicate !== 'https://slsa.dev/provenance/v1') {
    throw new Error(`Unsupported registry provenance predicate ${provenancePredicate}.`);
  }
  const selectedIntegration = maxSatisfying(
    integrationVersions.filter((candidate) => Boolean(valid(candidate))),
    peerRange,
    { includePrerelease: true },
  );
  if (!selectedIntegration || !satisfies(selectedIntegration, peerRange, { includePrerelease: true })) {
    throw new Error(`No published ${integrationName} version satisfies ${peerRange}.`);
  }

  if (publication) {
    if (!publication.publication?.verified) throw new Error('Publication result is not verified.');
    if (publication.packageName !== contentModelName || publication.version !== version) {
      throw new Error('Publication result does not match registry package identity.');
    }
    if (publication.publication.registryIntegrity !== integrity) {
      throw new Error('Publication and registry integrity do not match.');
    }
    if (publication.releaseTag !== `content-model-v${version}`) {
      throw new Error('Publication release tag does not match the registry version.');
    }
  }

  const previousContentModel = requireVersion(
    templateManifest.dependencies?.[contentModelName],
    'Template content-model version',
  );
  const previousIntegration = requireVersion(
    templateManifest.dependencies?.[integrationName],
    'Template Sveltia version',
  );
  const releaseTag = publication?.releaseTag ?? `content-model-v${version}`;

  return {
    changed: previousContentModel !== version || previousIntegration !== selectedIntegration,
    contentModel: { integrity, previousVersion: previousContentModel, version },
    integration: {
      name: integrationName,
      peerRange,
      previousVersion: previousIntegration,
      version: selectedIntegration,
    },
    provenancePredicate,
    releaseTag,
  };
};

export const applyTemplateSync = (manifest: PackageManifest, plan: TemplateSyncPlan): PackageManifest => ({
  ...manifest,
  dependencies: {
    ...manifest.dependencies,
    [contentModelName]: plan.contentModel.version,
    [integrationName]: plan.integration.version,
  },
});

const argumentAfter = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};

const run = async () => {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const metadataPath = requireValue(argumentAfter(args, '--metadata'), 'Metadata path');
  const versionsPath = requireValue(argumentAfter(args, '--peer-versions'), 'Peer versions path');
  const publicationPath = argumentAfter(args, '--publication');
  const manifestPath = resolve(cwd, 'templates/default/package.json');
  const templateManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PackageManifest;
  const registryMetadata = JSON.parse(await readFile(resolve(cwd, metadataPath), 'utf8')) as RegistryMetadata;
  const versionsValue = JSON.parse(await readFile(resolve(cwd, versionsPath), 'utf8')) as string[] | string;
  const integrationVersions = Array.isArray(versionsValue) ? versionsValue : [versionsValue];
  const publication = publicationPath
    ? (JSON.parse(await readFile(resolve(cwd, publicationPath), 'utf8')) as PublicationResult)
    : undefined;
  const plan = createTemplateSyncPlan({
    templateManifest,
    registryMetadata,
    integrationVersions,
    ...(publication ? { publication } : {}),
  });

  if (args.includes('--write') && plan.changed) {
    await writeFile(manifestPath, `${JSON.stringify(applyTemplateSync(templateManifest, plan), undefined, 2)}\n`);
  }

  const output = `${JSON.stringify(plan, undefined, 2)}\n`;
  const outputPath = argumentAfter(args, '--output');
  if (outputPath) await writeFile(resolve(cwd, outputPath), output);
  else process.stdout.write(output);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
