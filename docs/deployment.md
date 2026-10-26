# Deploy your site

Build your owned project with `npm run build`; publish its `dist/` directory.
Configure the complete production URL in `src/config/site.ts`, including the
project path. Existing URL helpers derive the deployment base for assets,
navigation, canonical metadata and sitemap output. Test with `npm run preview`
and `npm run validate:build` before enabling deployment.

## Select hosting and CI

During creation, `--ci-providers github,gitlab` emits native YAML for both
providers; `--primary-ci` selects the authoritative provider. Consumers own and
edit that YAML after bootstrap. There is no ongoing Forge configuration or
regeneration command. See [generated CI](ci-providers.md) and the
[initializer reference](../packages/create-forge/README.md) for exact flags.

- GitHub Pages: enable Actions as the Pages source and configure the environment
  approval and source-branch restrictions. The [generated Pages guide](../templates/default/docs/github-pages.md)
  covers custom domains, project paths and recovery.
- GitLab Pages: use GitLab 17.9 or later, configure runners and validate the
  generated pipeline with server-side CI Lint. Parallel prefixed deployments
  require the appropriate GitLab plan and a free deployment slot.
- Cloudflare Pages: create a Direct Upload project with its production branch
  matching the configured source branch. Configure the generated provider's
  account/token secrets; never commit secret values. The initializer adds the
  locked Wrangler dependency and documents required names in the generated YAML.

Use `--deployment` with the JSON contract in the initializer reference to choose
an environment, source branch, target and explicit public URL. Multiple
environments require unique names, branches and destinations. Configure custom
domains with the provider before using them. No local command configures shared
hosting permissions or authorizes production deployment.

## Validate and recover

Deployment follows the applicable source, unit, build, browser/accessibility and
Lighthouse gates. Build once and inspect the same artifact that is deployed.
Pull requests validate without publishing. Check the deployment environment and
smoke-test result after an authorized source-branch push.

When deployment fails, inspect the first failed check, URL/base configuration,
provider permissions and generated YAML. Fix source failures through review;
retry transient provider failures only after identifying the cause. To roll
back source, review a revert and let the normal pipeline build and deploy it.
Keep content edits separate from deployment or formatter rollback.
