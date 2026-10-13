import { expect, test } from 'vitest';

import { resolveDeployments } from './deployment.ts';

const invalidDeploymentMessagePattern = /deployment|Deployment|Invalid|Unrecognized/i;

test('defaults to a native production deployment only when primary CI exists', () => {
  expect(resolveDeployments(undefined, 'github')).toEqual([
    { name: 'production', sourceBranch: 'main', target: 'github-pages' },
  ]);
  expect(resolveDeployments(undefined, 'gitlab')).toEqual([
    { name: 'production', sourceBranch: 'main', target: 'gitlab-pages' },
  ]);
  expect(resolveDeployments(undefined, undefined)).toEqual([]);
  expect(resolveDeployments([], 'github')).toEqual([]);
});

test('keeps environment, branch and public URL independent', () => {
  const deployment = {
    name: 'staging',
    sourceBranch: 'release/site',
    target: 'gitlab-pages',
    url: 'https://example.com/site',
  };
  expect(resolveDeployments([deployment], 'gitlab')).toEqual([deployment]);
});

test('rejects unsupported targets, duplicates and incompatible primary CI', () => {
  const deployment = { name: 'production', sourceBranch: 'main', target: 'github-pages' };
  for (const [input, primary] of [
    [[deployment, deployment], 'github'],
    [[deployment], 'gitlab'],
    [[deployment], undefined],
    [[{ ...deployment, target: 'cloudflare-pages', project: 'website' }], 'github'],
    [[{ ...deployment, secret: 'no-secret-inputs' }], 'github'],
  ] as const)
    expect(() => resolveDeployments([...input], primary)).toThrow(invalidDeploymentMessagePattern);
});

test('rejects invalid refs, expressions and URLs at the input boundary', () => {
  const deployment = { name: 'production', sourceBranch: 'main', target: 'github-pages' };
  for (const sourceBranch of [
    '',
    '-main',
    'refs/heads/main',
    'feature..main',
    'main.lock',
    'main/',
    'feature//site',
    'main@{x}',
    'main*',
    'main\n',
    '${{ secrets.TOKEN }}',
    '.hidden',
    'dev/.hidden',
    'dev.lock/site',
  ])
    expect(() => resolveDeployments([{ ...deployment, sourceBranch }], 'github')).toThrow(
      invalidDeploymentMessagePattern,
    );
  for (const url of ['file:///tmp/site', 'https://user:password@example.com', 'https://example.com/${{secrets.TOKEN}}'])
    expect(() => resolveDeployments([{ ...deployment, url }], 'github')).toThrow(invalidDeploymentMessagePattern);
});
