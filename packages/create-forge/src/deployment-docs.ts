import { posix } from 'node:path';

import { stringify } from 'yaml';

import { resolveDeployments } from './ci/deployment.ts';
import { generationOptionsSchema, workflowPath, type CiGenerationOptions } from './ci/generation-options.ts';

export const deploymentGuidePlaceholder = '<!-- Forge inserts the selected deployment plan here during bootstrap. -->';

export function createDeploymentGuide(input: CiGenerationOptions): string {
  const config = generationOptionsSchema.parse(input);
  const deployments = resolveDeployments(config.deployments, config.primary);
  const providerName = config.primary === 'github' ? 'GitHub Actions' : 'GitLab CI';
  const sections: string[] = [];
  const link = (path: string) => posix.join('..', config.repositoryRoot, path);
  if (config.providers.includes('github'))
    sections.push(`[GitHub project workflow](${link(workflowPath('project', config))})`);
  if (config.providers.includes('gitlab'))
    sections.push(`[GitLab pipeline](${link(config.prefix ? `.gitlab/ci/${config.prefix}.yml` : '.gitlab-ci.yml')})`);
  sections.push('');
  if (!deployments.length)
    return [...sections, 'No deployment jobs are enabled. These pipelines validate the project only.'].join('\n');
  sections.push(
    '## Your environments',
    '',
    `Deployment is owned by ${providerName}. The secondary CI does not publish this site.`,
    '',
    'This is a record of the bootstrap choices, not configuration that Forge reads later.',
    'Edit the linked YAML and update this guide when changing branches, targets or URLs.',
    '',
    '```yaml',
    stringify(
      deployments.map((deployment) =>
        config.deployments === undefined
          ? {
              ...deployment,
              name: `${config.primary}-pages`,
              ...(config.primary === 'gitlab' ? { sourceBranch: '$CI_DEFAULT_BRANCH' } : {}),
            }
          : deployment,
      ),
    ).trimEnd(),
    '```',
    '',
    'Pushes to a configured source branch validate its build before deployment. Pull/merge',
    'requests validate without deploying. Each branch uses one validation graph and artifact;',
    'its named deploy and smoke jobs run only after validation succeeds.',
    '',
    'For multiple environments, `PUBLIC_SITE_URL` selects the canonical URL and build base',
    'path for the branch (or pull/merge-request target branch). Local development defaults',
    'to the first environment; set `PUBLIC_SITE_URL` locally to exercise another URL.',
    '',
    'Check the canonical URL in [site configuration](../src/config/site.ts) before publishing.',
    "If no explicit URL is listed above, use the hosting provider's Pages URL or your custom domain.",
    '',
    'Explicit public URLs must already point to their deployment destinations. Configure',
    'custom domains and DNS with the hosting provider before relying on smoke checks.',
  );
  if (deployments.some((deployment) => deployment.target === 'github-pages'))
    sections.push(
      '',
      '## GitHub Pages setup',
      '',
      'Select GitHub Actions as the Pages publishing source in repository settings.',
      'Configure the named deployment environment with source-branch restrictions and any',
      'required reviewers. Publishing uses the workflow token; no separate API secret is needed.',
      'A repository supports one GitHub Pages destination. See [the Pages guide](github-pages.md)',
      'for project paths, custom domains and troubleshooting.',
    );
  if (deployments.some((deployment) => deployment.target === 'gitlab-pages')) {
    sections.push(
      '',
      '## GitLab Pages setup',
      '',
      'Enable Pages for the GitLab project and confirm its actual URL, including the project',
      'path when applicable. Native Pages publishing requires no separate API token. Protect',
      'deployment source branches and use deployment environment protection where available.',
    );
    if (deployments.some((deployment) => deployment.target === 'gitlab-pages' && deployment.pathPrefix))
      sections.push(
        '',
        'Prefixed Pages requires Premium or Ultimate and an available parallel deployment slot.',
        'The generated Pages expiry is `never`, keeping these environments persistent. Avoid',
        'prefixes that shadow routes in the root site. Standard unprefixed Pages does not require',
        'this paid capability. See [GitLab parallel Pages](https://docs.gitlab.com/user/project/pages/parallel_deployments/).',
      );
  }
  if (deployments.some((deployment) => deployment.target === 'cloudflare-pages'))
    sections.push(
      '',
      '## Cloudflare Pages setup',
      '',
      'Create each listed project as an existing Direct Upload project in Cloudflare.',
      'Set its production branch to the corresponding source branch above. Separate environments',
      'need separate projects; the deploy preflight rejects missing or Git-integrated projects',
      'and mismatched production branches. Forge does not create or reconfigure cloud resources.',
      '',
      'Configure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for each deployment environment.',
      'Use a token with Pages Edit permission scoped to the intended account. On GitHub, use',
      'environment secrets with source-branch restrictions. On GitLab, use masked, protected,',
      'environment-scoped variables and protect the source branch. Keep credentials out of',
      'pull/merge requests, validation jobs and this guide. Smoke checks need no token.',
      '',
      'Wrangler lives in the site development dependencies and lockfile. Dependabot updates',
      'that dependency. Bootstrap resolves its lockfile through npm even with `--no-install`.',
      'Deploy jobs install locked dependencies with lifecycle scripts disabled and publish the',
      'validated artifact without rebuilding. Retained source Functions/config are not uploaded.',
      'See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).',
    );
  sections.push(
    '',
    '## Switching primary CI',
    '',
    "Keep only one authoritative deployment path. Enable the selected provider's native",
    "deployment conditions and disable the previous provider's conditions for every environment.",
    'Move environment credentials and branch restrictions before pushing a deployment branch.',
    'Native Pages also requires its matching CI provider; selecting another CI requires changing',
    'the hosting target. Cloudflare Pages can publish from either CI.',
  );
  return sections.join('\n');
}
