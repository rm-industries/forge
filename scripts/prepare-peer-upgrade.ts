import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inc, major, minor, satisfies, valid } from 'semver';

type PackageManifest = {
  name?: string;
  version?: string;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export type PeerUpgradePlan = {
  changed: boolean;
  dependency: string;
  previousDevelopmentRange: string;
  nextDevelopmentRange: string;
  previousPeerRange: string;
  nextPeerRange: string;
  previousPackageVersion: string;
  nextPackageVersion: string;
  targetVersion: string;
};

const requireVersion = (value: string | undefined, field: string) => {
  if (!value || !valid(value)) throw new Error(`${field} must be a valid semantic version.`);
  return value;
};

export const peerRangeFor = (version: string) => {
  const target = requireVersion(version, 'Target version');
  if (major(target) > 0) return `^${target}`;
  return `>=${target} <0.${minor(target) + 1}.0`;
};

export const createPeerUpgradePlan = (
  rootManifest: PackageManifest,
  contentModelManifest: PackageManifest,
  dependency: string,
  targetVersion: string,
): PeerUpgradePlan => {
  const target = requireVersion(targetVersion, 'Target version');
  const packageVersion = requireVersion(contentModelManifest.version, 'Content-model package version');
  const developmentRange = rootManifest.devDependencies?.[dependency];
  const peerRange = contentModelManifest.peerDependencies?.[dependency];
  if (!developmentRange) throw new Error(`Root devDependencies does not declare ${dependency}.`);
  if (!peerRange) throw new Error(`Content-model peerDependencies does not declare ${dependency}.`);

  const changed = !satisfies(target, peerRange, { includePrerelease: true });
  const nextPackageVersion = changed ? inc(packageVersion, 'preminor', 'alpha') : packageVersion;
  if (!nextPackageVersion) throw new Error(`Could not calculate a prerelease after ${packageVersion}.`);

  return {
    changed,
    dependency,
    previousDevelopmentRange: developmentRange,
    nextDevelopmentRange: changed ? `^${target}` : developmentRange,
    previousPeerRange: peerRange,
    nextPeerRange: changed ? peerRangeFor(target) : peerRange,
    previousPackageVersion: packageVersion,
    nextPackageVersion,
    targetVersion: target,
  };
};

const readManifest = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as PackageManifest;
const writeManifest = async (path: string, manifest: PackageManifest) =>
  writeFile(path, `${JSON.stringify(manifest, undefined, 2)}\n`);

export const addPeerReleaseNotes = (changelog: string, plan: PeerUpgradePlan) => {
  const heading = `## ${plan.nextPackageVersion}`;
  if (changelog.includes(heading)) return changelog;
  const firstRelease = changelog.indexOf('\n## ');
  if (firstRelease < 0) throw new Error('Content-model changelog has no release sections.');
  const notes = `${heading}\n\n- Validate ${plan.dependency} ${plan.targetVersion} and update its supported peer range from \`${plan.previousPeerRange}\` to \`${plan.nextPeerRange}\`.\n`;
  return `${changelog.slice(0, firstRelease + 1)}${notes}\n${changelog.slice(firstRelease + 1)}`;
};

export const preparePeerUpgrade = async ({
  cwd,
  dependency,
  targetVersion,
  write,
}: {
  cwd: string;
  dependency: string;
  targetVersion: string;
  write: boolean;
}) => {
  const rootPath = resolve(cwd, 'package.json');
  const contentModelPath = resolve(cwd, 'packages/content-model/package.json');
  const contentModelChangelogPath = resolve(cwd, 'packages/content-model/CHANGELOG.md');
  const rootManifest = await readManifest(rootPath);
  const contentModelManifest = await readManifest(contentModelPath);
  const plan = createPeerUpgradePlan(rootManifest, contentModelManifest, dependency, targetVersion);

  if (write && plan.changed) {
    rootManifest.devDependencies = { ...rootManifest.devDependencies, [dependency]: plan.nextDevelopmentRange };
    contentModelManifest.peerDependencies = {
      ...contentModelManifest.peerDependencies,
      [dependency]: plan.nextPeerRange,
    };
    contentModelManifest.version = plan.nextPackageVersion;
    const changelog = await readFile(contentModelChangelogPath, 'utf8');
    await writeManifest(rootPath, rootManifest);
    await writeManifest(contentModelPath, contentModelManifest);
    await writeFile(contentModelChangelogPath, addPeerReleaseNotes(changelog, plan));
  }

  return plan;
};

const run = async () => {
  const args = process.argv.slice(2);
  const versionIndex = args.indexOf('--version');
  const targetVersion = versionIndex >= 0 ? args[versionIndex + 1] : undefined;
  if (!targetVersion) throw new Error('--version requires a semantic version.');
  const dependency = args[0]?.startsWith('--') === false ? args[0] : '@sveltia/cms';
  const plan = await preparePeerUpgrade({
    cwd: process.cwd(),
    dependency,
    targetVersion,
    write: args.includes('--write'),
  });
  process.stdout.write(`${JSON.stringify(plan)}\n`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
