import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prerelease, valid } from 'semver';

type PackageSlug = 'content-model' | 'create-forge';

type PackageManifest = {
  name?: string;
  version?: string;
};

type PackResult = {
  filename?: string;
  integrity?: string;
  name?: string;
  shasum?: string;
  size?: number;
  unpackedSize?: number;
  version?: string;
};

const packageWorkspaces: Record<PackageSlug, string> = {
  'content-model': 'packages/content-model',
  'create-forge': 'packages/create-forge',
};

export type PackageReleasePlan = {
  gitSha: string;
  npmTag: 'latest' | 'next';
  packageName: string;
  packageSlug: PackageSlug;
  prerelease: boolean;
  releaseNotes: string;
  releaseTag: string;
  version: string;
  workspace: string;
  tarball?: {
    filename: string;
    integrity: string;
    shasum: string;
    size: number;
    unpackedSize: number;
  };
};

const requireValue = (value: string | undefined, field: string) => {
  if (!value) throw new Error(`${field} is required.`);
  return value;
};

const isPackageSlug = (value: string): value is PackageSlug => value in packageWorkspaces;

export const releaseNotesFor = (changelog: string, version: string) => {
  const heading = `## ${version}`;
  const start = changelog.indexOf(heading);
  if (start < 0) throw new Error(`Changelog does not contain a ${heading} release section.`);
  const next = changelog.indexOf('\n## ', start + heading.length);
  return changelog.slice(start, next < 0 ? undefined : next).trim();
};

export const createPackageReleasePlan = ({
  packageSlug,
  manifest,
  changelog,
  gitSha,
  releaseTag,
  packResult,
}: {
  packageSlug: string;
  manifest: PackageManifest;
  changelog: string;
  gitSha: string;
  releaseTag?: string;
  packResult?: PackResult;
}): PackageReleasePlan => {
  if (!isPackageSlug(packageSlug)) throw new Error(`Unsupported package ${packageSlug}.`);
  const packageName = requireValue(manifest.name, 'Package name');
  const version = requireValue(manifest.version, 'Package version');
  if (!valid(version)) throw new Error(`Package version ${version} is not valid semantic versioning.`);
  const expectedTag = `${packageSlug}-v${version}`;
  if (releaseTag && releaseTag !== expectedTag) {
    throw new Error(`Release tag ${releaseTag} does not match ${expectedTag}.`);
  }

  if (packResult && (packResult.name !== packageName || packResult.version !== version)) {
    throw new Error('Packed package identity does not match the release plan.');
  }

  const plan: PackageReleasePlan = {
    gitSha: requireValue(gitSha, 'Git SHA'),
    npmTag: prerelease(version) ? 'next' : 'latest',
    packageName,
    packageSlug,
    prerelease: Boolean(prerelease(version)),
    releaseNotes: releaseNotesFor(changelog, version),
    releaseTag: expectedTag,
    version,
    workspace: packageWorkspaces[packageSlug],
  };

  if (packResult) {
    plan.tarball = {
      filename: requireValue(packResult.filename, 'Tarball filename'),
      integrity: requireValue(packResult.integrity, 'Tarball integrity'),
      shasum: requireValue(packResult.shasum, 'Tarball shasum'),
      size: packResult.size ?? 0,
      unpackedSize: packResult.unpackedSize ?? 0,
    };
  }
  return plan;
};

const argumentAfter = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};

const run = async () => {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const tag = argumentAfter(args, '--tag');
  const requestedPackage = argumentAfter(args, '--package');
  const tagPackage = tag?.match(/^(content-model|create-forge)-v/)?.[1];
  const packageSlug = requireValue(requestedPackage ?? tagPackage, 'Package') as PackageSlug;
  if (!isPackageSlug(packageSlug)) throw new Error(`Unsupported package ${packageSlug}.`);
  const workspace = packageWorkspaces[packageSlug];
  const manifest = JSON.parse(await readFile(resolve(cwd, workspace, 'package.json'), 'utf8')) as PackageManifest;
  const changelog = await readFile(resolve(cwd, workspace, 'CHANGELOG.md'), 'utf8');
  const packResultPath = argumentAfter(args, '--pack-result');
  const packResults = packResultPath
    ? (JSON.parse(await readFile(resolve(cwd, packResultPath), 'utf8')) as PackResult[])
    : undefined;
  const plan = createPackageReleasePlan({
    packageSlug,
    manifest,
    changelog,
    gitSha: requireValue(argumentAfter(args, '--sha'), 'Git SHA'),
    ...(tag ? { releaseTag: tag } : {}),
    ...(packResults?.[0] ? { packResult: packResults[0] } : {}),
  });
  const output = `${JSON.stringify(plan, undefined, 2)}\n`;
  const outputPath = argumentAfter(args, '--output');
  if (outputPath) await writeFile(resolve(cwd, outputPath), output);
  else process.stdout.write(output);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
