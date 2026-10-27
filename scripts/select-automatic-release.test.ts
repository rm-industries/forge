import { expect, test } from 'vitest';

import { requiresManualBaseline, selectAutomaticRelease } from './select-automatic-release.ts';

const input = {
  repository: 'rm-industries/forge',
  appLogin: 'forge-updates[bot]',
  sha: 'a'.repeat(40),
  pullRequest: {
    merged: true,
    merge_commit_sha: 'a'.repeat(40),
    user: { login: 'forge-updates[bot]' },
    base: { ref: 'main', repo: { full_name: 'rm-industries/forge' } },
    head: { ref: 'automation/peer--sveltia-cms', repo: { full_name: 'rm-industries/forge' } },
  },
  files: [
    'package.json',
    'package-lock.json',
    'packages/content-model/package.json',
    'packages/content-model/CHANGELOG.md',
  ],
  versions: {
    'content-model': { previous: '1.1.5', current: '1.1.6' },
    'create-forge': { previous: '1.0.3', current: '1.0.3' },
  },
};

test('selects only a stable patch from the configured App compatibility PR', () => {
  expect(selectAutomaticRelease(input)).toBe('content-model');
  for (const current of ['1.1.5', '1.1.7', '1.2.0', '2.0.0', '1.1.6-rc.1']) {
    expect(
      selectAutomaticRelease({
        ...input,
        versions: { ...input.versions, 'content-model': { previous: '1.1.5', current } },
      }),
    ).toBeUndefined();
  }
});
test('rejects unmerged, foreign, untrusted or source-changing PRs', () => {
  for (const pullRequest of [
    { ...input.pullRequest, merged: false },
    { ...input.pullRequest, merge_commit_sha: 'b'.repeat(40) },
    { ...input.pullRequest, user: { login: 'dependabot[bot]' } },
    { ...input.pullRequest, head: { ...input.pullRequest.head, repo: { full_name: 'fork/forge' } } },
    { ...input.pullRequest, base: { ...input.pullRequest.base, ref: 'other' } },
    { ...input.pullRequest, head: { ...input.pullRequest.head, ref: 'arbitrary-branch' } },
  ])
    expect(selectAutomaticRelease({ ...input, pullRequest })).toBeUndefined();
  expect(
    selectAutomaticRelease({ ...input, files: [...input.files, 'packages/content-model/src/index.ts'] }),
  ).toBeUndefined();
  expect(() => selectAutomaticRelease({ ...input, sha: 'main' })).toThrow('full SHA');
});
test('does not publish a generator from the obsolete synchronization release intent', () => {
  expect(
    selectAutomaticRelease({
      ...input,
      pullRequest: {
        ...input.pullRequest,
        head: { ...input.pullRequest.head, ref: 'automation/template-content-model' },
      },
      files: [
        'package-lock.json',
        'packages/create-forge/package.json',
        'packages/create-forge/CHANGELOG.md',
        'templates/default/package.json',
        'templates/default/package-lock.json',
      ],
      versions: { ...input.versions, 'create-forge': { previous: '1.0.3', current: '1.0.4' } },
    }),
  ).toBeUndefined();
});
test('keeps prerelease template dependencies out of automatic generator publication', () => {
  expect(
    selectAutomaticRelease({
      ...input,
      pullRequest: {
        ...input.pullRequest,
        head: { ...input.pullRequest.head, ref: 'automation/template-content-model' },
      },
      files: [
        'packages/create-forge/package.json',
        'packages/create-forge/CHANGELOG.md',
        'templates/default/package.json',
      ],
      versions: { ...input.versions, 'create-forge': { previous: '1.0.3', current: '1.0.4' } },
    }),
  ).toBeUndefined();
});
test('requires a manual baseline for unreleased code or shipped template behavior', () => {
  expect(requiresManualBaseline('content-model', ['packages/content-model/src/model.ts'])).toBe(true);
  expect(
    requiresManualBaseline('content-model', [
      'packages/content-model/src/model.test.ts',
      'packages/content-model/package.json',
    ]),
  ).toBe(false);
  expect(requiresManualBaseline('create-forge', ['templates/default/src/config/site.ts'])).toBe(true);
  expect(
    requiresManualBaseline('create-forge', [
      'templates/default/package.json',
      'templates/default/package-lock.json',
      'packages/create-forge/CHANGELOG.md',
    ]),
  ).toBe(false);
});

test('keeps browser formatter changes out of the automatic peer release path', () => {
  expect(
    selectAutomaticRelease({
      ...input,
      files: ['packages/browser-oxfmt/package.json', 'packages/browser-oxfmt/CHANGELOG.md'],
    }),
  ).toBeUndefined();
});

test('keeps frontmatter releases outside reviewed automatic sources', () => {
  expect(
    selectAutomaticRelease({
      ...input,
      pullRequest: {
        ...input.pullRequest,
        head: { ...input.pullRequest.head, ref: 'automation/markdownlint-frontmatter' },
      },
      files: ['packages/markdownlint-frontmatter/package.json', 'packages/markdownlint-frontmatter/CHANGELOG.md'],
    }),
  ).toBeUndefined();
});
