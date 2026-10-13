import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inc, prerelease, valid } from 'semver';

const commitShaPattern = /^[a-f0-9]{40}$/;
type PullRequest = {
  merged: boolean;
  merge_commit_sha: string;
  user: { login: string };
  base: { ref: string; repo: { full_name: string } };
  head: { ref: string; repo: { full_name: string } | null };
};
const releaseSources = {
  'content-model': {
    branch: 'automation/peer-',
    files: [
      'package.json',
      'package-lock.json',
      'packages/content-model/package.json',
      'packages/content-model/CHANGELOG.md',
    ],
  },
  'create-forge': {
    branch: 'automation/template-content-model',
    files: [
      'package-lock.json',
      'packages/create-forge/package.json',
      'packages/create-forge/CHANGELOG.md',
      'templates/default/package.json',
      'templates/default/package-lock.json',
    ],
  },
} as const;

export function selectAutomaticRelease({
  pullRequest,
  repository,
  appLogin,
  sha,
  files,
  versions,
  templateVersions,
}: {
  pullRequest: PullRequest;
  repository: string;
  appLogin: string;
  sha: string;
  files: string[];
  versions: Record<'content-model' | 'create-forge', { previous: string; current: string }>;
  templateVersions: string[];
}) {
  if (!commitShaPattern.test(sha)) throw new Error('Release commit must be a full SHA.');
  if (
    !appLogin ||
    !pullRequest.merged ||
    pullRequest.merge_commit_sha !== sha ||
    pullRequest.user.login !== appLogin ||
    pullRequest.base.ref !== 'main' ||
    pullRequest.base.repo.full_name !== repository ||
    pullRequest.head.repo?.full_name !== repository
  )
    return undefined;
  for (const [slug, source] of Object.entries(releaseSources)) {
    const packageSlug = slug as keyof typeof releaseSources;
    const matchesBranch =
      packageSlug === 'content-model'
        ? pullRequest.head.ref.startsWith(source.branch)
        : pullRequest.head.ref === source.branch;
    if (!matchesBranch || !files.length || files.some((file) => !(source.files as readonly string[]).includes(file)))
      continue;
    if (
      packageSlug === 'create-forge' &&
      (templateVersions.length !== 2 || templateVersions.some((version) => !valid(version) || prerelease(version)))
    )
      return undefined;
    if (
      !files.includes(`packages/${packageSlug}/package.json`) ||
      !files.includes(`packages/${packageSlug}/CHANGELOG.md`)
    )
      continue;
    const { previous, current } = versions[packageSlug];
    if (
      !valid(previous) ||
      !valid(current) ||
      prerelease(previous) ||
      prerelease(current) ||
      inc(previous, 'patch') !== current
    )
      return undefined;
    return packageSlug;
  }
  return undefined;
}

export function requiresManualBaseline(slug: 'content-model' | 'create-forge', files: string[]) {
  const packageRoot = `packages/${slug}/`;
  const metadataFiles = ['package.json', 'CHANGELOG.md', 'README.md', 'vitest.config.ts'];
  return files.some((file) => {
    if (file.startsWith(packageRoot))
      return !metadataFiles.includes(file.slice(packageRoot.length)) && !file.endsWith('.test.ts');
    return (
      slug === 'create-forge' &&
      file.startsWith('templates/default/') &&
      !['templates/default/package.json', 'templates/default/package-lock.json'].includes(file)
    );
  });
}

function run() {
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  const appSlug = process.env.APP_SLUG;
  if (!repository || !sha || !appSlug || !commitShaPattern.test(sha))
    throw new Error('Repository, SHA and configured App identity are required.');
  const api = (path: string) =>
    JSON.parse(execFileSync('gh', ['api', `repos/${repository}/${path}`], { encoding: 'utf8' }));
  const associations = api(`commits/${sha}/pulls`) as { number: number; user: { login: string } }[];
  const candidates = associations.filter((pr) => pr.user.login === `${appSlug}[bot]`);
  if (candidates.length !== 1) {
    console.log('eligible=false');
    return;
  }
  const pullRequest = api(`pulls/${candidates[0]!.number}`) as PullRequest;
  const files = execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding: 'utf8' }).trim().split('\n');
  const versions = Object.fromEntries(
    Object.keys(releaseSources).map((slug) => {
      const path = `packages/${slug}/package.json`;
      const previous = JSON.parse(execFileSync('git', ['show', `HEAD^:${path}`], { encoding: 'utf8' }))
        .version as string;
      const current = JSON.parse(readFileSync(path, 'utf8')).version as string;
      return [slug, { previous, current }];
    }),
  ) as Parameters<typeof selectAutomaticRelease>[0]['versions'];
  const selected = selectAutomaticRelease({
    pullRequest,
    repository,
    appLogin: `${appSlug}[bot]`,
    sha,
    files,
    versions,
    templateVersions: (() => {
      const dependencies = JSON.parse(readFileSync('templates/default/package.json', 'utf8')).dependencies as Record<
        string,
        string
      >;
      return ['@rm-industries/content-model', '@sveltia/cms'].map((name) => dependencies[name] ?? '');
    })(),
  });
  if (selected) {
    const previousVersion = versions[selected].previous;
    const tag = `${selected}-v${previousVersion}`;
    let releasedSha: string;
    try {
      releasedSha = api(`commits/${tag}`).sha as string;
    } catch (error) {
      if (!(error instanceof Error) || !String((error as Error & { stderr?: string }).stderr).includes('HTTP 404'))
        throw error;
      console.error(`::notice title=Manual baseline required::Publish ${tag} before enabling another automatic patch.`);
      console.log('eligible=false');
      return;
    }
    if (!commitShaPattern.test(releasedSha)) throw new Error('Published tag must resolve to a full commit SHA.');
    execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', releasedSha], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const changes = execFileSync(
      'git',
      [
        'diff',
        '--name-only',
        releasedSha,
        'HEAD',
        '--',
        `packages/${selected}`,
        ...(selected === 'create-forge' ? ['templates/default'] : []),
      ],
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n');
    if (requiresManualBaseline(selected, changes)) {
      console.error(
        '::notice title=Manual baseline required::Unreleased implementation or template changes require a separate reviewed release.',
      );
      console.log('eligible=false');
      return;
    }
    const registryVersion = execFileSync('npm', ['view', `@rm-industries/${selected}@${previousVersion}`, 'version'], {
      encoding: 'utf8',
    }).trim();
    if (registryVersion !== previousVersion) throw new Error('The previous package version must already be published.');
  }
  console.log(`eligible=${Boolean(selected)}`);
  if (selected) console.log(`package=${selected}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
