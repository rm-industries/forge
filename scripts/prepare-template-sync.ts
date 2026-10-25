import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { maxSatisfying, prerelease, satisfies, valid, validRange } from 'semver';

const pairs = {
  '@rm-industries/content-model': { slug: 'content-model', host: '@sveltia/cms', hostSection: 'dependencies' },
  '@rm-industries/browser-oxfmt': { slug: 'browser-oxfmt', host: 'oxfmt', hostSection: 'devDependencies' },
} as const;
type PackageManifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
type PackageLock = {
  packages: Record<
    string,
    {
      version?: string;
      integrity?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }
  >;
};
type RegistryMetadata = {
  name?: string;
  version?: string;
  peerDependencies?: Record<string, string>;
  dist?: { integrity?: string; attestations?: { provenance?: { predicateType?: string } } };
};
type PublicationResult = {
  packageName?: string;
  releaseTag?: string;
  version?: string;
  publication?: { registryIntegrity?: string; verified?: boolean };
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
  templateLock,
  registryMetadata,
  integrationVersions,
  publication,
}: {
  templateManifest: PackageManifest;
  templateLock: PackageLock;
  registryMetadata: RegistryMetadata;
  integrationVersions: string[];
  publication?: PublicationResult | undefined;
}) => {
  const name = registryMetadata.name as keyof typeof pairs;
  const pair = pairs[name];
  if (!pair) throw new Error('Registry package identity is not an approved refresh package.');
  const version = requireVersion(registryMetadata.version, 'Registry package version');
  const integrity = requireValue(registryMetadata.dist?.integrity, 'Registry integrity');
  const peerRange = requireValue(registryMetadata.peerDependencies?.[pair.host], 'Published peer range');
  const provenancePredicate = requireValue(
    registryMetadata.dist?.attestations?.provenance?.predicateType,
    'Registry provenance predicate',
  );
  if (provenancePredicate !== 'https://slsa.dev/provenance/v1')
    throw new Error(`Unsupported registry provenance predicate ${provenancePredicate}.`);
  if (publication) {
    if (!publication.publication?.verified) throw new Error('Publication result is not verified.');
    if (publication.packageName !== name || publication.version !== version)
      throw new Error('Publication result does not match registry package identity.');
    if (publication.publication.registryIntegrity !== integrity)
      throw new Error('Publication and registry integrity do not match.');
    if (publication.releaseTag !== `${pair.slug}-v${version}`)
      throw new Error('Publication release tag does not match the registry version.');
  }
  const packageRange = requireValue(templateManifest.dependencies?.[name], 'Template package range');
  const hostRange = requireValue(templateManifest[pair.hostSection]?.[pair.host], 'Template integration range');
  if (!validRange(packageRange) || !satisfies(version, packageRange))
    throw new Error(
      `Published ${name}@${version} is outside the template range ${packageRange}; reviewed range correction required.`,
    );
  if (!validRange(hostRange) || !validRange(peerRange))
    throw new Error('Template and peer ranges must be valid semantic version ranges.');
  const selectedIntegration = maxSatisfying(
    integrationVersions.filter(
      (candidate) => Boolean(valid(candidate)) && !prerelease(candidate) && satisfies(candidate, hostRange),
    ),
    peerRange,
  );
  if (!selectedIntegration)
    throw new Error(`No published ${pair.host} version satisfies both ${peerRange} and ${hostRange}.`);
  const previousVersion = requireVersion(
    templateLock.packages[`node_modules/${name}`]?.version,
    'Locked package version',
  );
  const previousIntegration = requireVersion(
    templateLock.packages[`node_modules/${pair.host}`]?.version,
    'Locked integration version',
  );
  return {
    changed: previousVersion !== version || previousIntegration !== selectedIntegration,
    package: { name, slug: pair.slug, integrity, previousVersion, version },
    integration: {
      name: pair.host,
      section: pair.hostSection,
      peerRange,
      previousVersion: previousIntegration,
      version: selectedIntegration,
    },
    provenancePredicate,
    releaseTag: publication?.releaseTag ?? `${pair.slug}-v${version}`,
  };
};
export type TemplateSyncPlan = ReturnType<typeof createTemplateSyncPlan>;

// Exact temporary inputs force npm to replace an old, still-satisfying lock selection.
async function refreshTemplateLock(directory: string, plan: TemplateSyncPlan) {
  const manifestPath = resolve(directory, 'package.json');
  const original = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(original) as PackageManifest;
  const lockPath = resolve(directory, 'package-lock.json');
  const originalLock = await readFile(lockPath, 'utf8');
  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          ...manifest,
          dependencies: { ...manifest.dependencies, [plan.package.name]: plan.package.version },
          [plan.integration.section]: {
            ...manifest[plan.integration.section],
            ...(plan.integration.section === 'dependencies' ? { [plan.package.name]: plan.package.version } : {}),
            [plan.integration.name]: plan.integration.version,
          },
        },
        undefined,
        2,
      )}\n`,
    );
    execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: directory,
      stdio: 'inherit',
    });
    const lock = JSON.parse(await readFile(lockPath, 'utf8')) as PackageLock;
    const selected = lock.packages[`node_modules/${plan.package.name}`];
    if (
      selected?.version !== plan.package.version ||
      selected.integrity !== plan.package.integrity ||
      lock.packages[`node_modules/${plan.integration.name}`]?.version !== plan.integration.version
    )
      throw new Error('Resolved lock does not match the verified publication and selected peer.');
    const root = lock.packages[''];
    if (!root) throw new Error('Resolved lock is missing root declarations.');
    if (manifest.dependencies) root.dependencies = manifest.dependencies;
    else delete root.dependencies;
    if (manifest.devDependencies) root.devDependencies = manifest.devDependencies;
    else delete root.devDependencies;
    await writeFile(lockPath, `${JSON.stringify(lock, undefined, 2)}\n`);
  } catch (error) {
    await writeFile(lockPath, originalLock);
    throw error;
  } finally {
    await writeFile(manifestPath, original);
  }
}
const argumentAfter = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};
const run = async () => {
  const args = process.argv.slice(2);
  const metadataPath = requireValue(argumentAfter(args, '--metadata'), 'Metadata path');
  const versionsPath = requireValue(argumentAfter(args, '--peer-versions'), 'Peer versions path');
  const publicationPath = argumentAfter(args, '--publication');
  const directory = resolve('templates/default');
  const versions = JSON.parse(await readFile(resolve(versionsPath), 'utf8')) as string[] | string;
  const plan = createTemplateSyncPlan({
    templateManifest: JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as PackageManifest,
    templateLock: JSON.parse(await readFile(resolve(directory, 'package-lock.json'), 'utf8')) as PackageLock,
    registryMetadata: JSON.parse(await readFile(resolve(metadataPath), 'utf8')) as RegistryMetadata,
    integrationVersions: Array.isArray(versions) ? versions : [versions],
    ...(publicationPath
      ? { publication: JSON.parse(await readFile(resolve(publicationPath), 'utf8')) as PublicationResult }
      : {}),
  });
  if (args.includes('--write') && plan.changed) await refreshTemplateLock(directory, plan);
  const output = `${JSON.stringify(plan, undefined, 2)}\n`;
  const outputPath = argumentAfter(args, '--output');
  if (outputPath) await writeFile(resolve(outputPath), output);
  else process.stdout.write(output);
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
