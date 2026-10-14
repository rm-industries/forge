import { expect, test } from 'vitest';

import { generationOptionsSchema } from './ci/generation-options.ts';
import { createDeploymentGuide } from './deployment-docs.ts';

const config = generationOptionsSchema.parse({
  directory: 'website',
  repositoryRoot: '..',
  prefix: 'website',
  providers: ['github', 'gitlab'],
  primary: 'github',
  securityMinute: 7,
  automationMinute: 17,
});

test('documents native defaults and nested workflow ownership', () => {
  const guide = createDeploymentGuide(config);
  expect(guide).toContain('sourceBranch: main');
  expect(guide).toContain('target: github-pages');
  expect(guide).toContain('../.github/workflows/website-project.yml');
  expect(guide).toContain('GitHub Actions');
  expect(guide).not.toContain('CLOUDFLARE_API_TOKEN');
  expect(guide).toContain('name: github-pages');
  const gitlabGuide = createDeploymentGuide({ ...config, primary: 'gitlab' });
  expect(gitlabGuide).toContain('sourceBranch: $CI_DEFAULT_BRANCH');
  expect(gitlabGuide).toContain('name: gitlab-pages');
});

test('documents Cloudflare branch environments and credential scope', () => {
  const guide = createDeploymentGuide({
    ...config,
    deployments: [
      {
        name: 'production',
        sourceBranch: 'main',
        target: 'cloudflare-pages',
        project: 'production-site',
        url: 'https://example.com',
      },
      {
        name: 'staging',
        sourceBranch: 'dev',
        target: 'cloudflare-pages',
        project: 'staging-site',
        url: 'https://staging.example.com',
      },
    ],
  });
  for (const expected of [
    'production-site',
    'staging-site',
    'sourceBranch: dev',
    'PUBLIC_SITE_URL',
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'Direct Upload',
    'environment',
  ])
    expect(guide).toContain(expected);
  expect(guide).not.toContain('Premium');
});

test('explains persistent prefixed Pages and validation-only selection', () => {
  const guide = createDeploymentGuide({
    ...config,
    primary: 'gitlab',
    deployments: [
      {
        name: 'staging',
        sourceBranch: 'dev',
        target: 'gitlab-pages',
        pathPrefix: 'staging',
        url: 'https://example.gitlab.io/staging/',
      },
    ],
  });
  expect(guide).toContain('Premium or Ultimate');
  expect(guide).toContain('never');
  expect(guide).toContain('../.gitlab/ci/website.yml');
  expect(createDeploymentGuide({ ...config, deployments: [] })).toContain('No deployment jobs');
});
