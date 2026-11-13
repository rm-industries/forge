# Deploy your site

Build your owned project with `npm run build`; publish its `dist/` directory.
Configure the complete production URL in `astro.config.ts`, including the
project path. Astro resolves the deployment base for assets,
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

A subpath site’s `robots.txt` does not govern the origin’s root crawler policy.
Shared hosting must expose applicable robots directives at the origin root.

## Publish security.txt

Forge can publish an [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116.html)
vulnerability reporting file at `/.well-known/security.txt` on root-hosted HTTPS
sites. Enable it in the interactive setup or pass `--security-txt` and repeat
`--security-contact` in preference order. Use monitored `mailto:`, `tel:`, or
HTTPS contact URIs. A default scaffold leaves publication disabled.

Choose one expiration mode:

- `--security-rolling 6` sets `expiration: { months: 6 }` in
  `src/config/security.ts`. Each static build computes a fresh expiration in
  UTC, using the last day of the destination month when needed. Forge suggests
  six months and accepts 1 to 12 whole calendar months.
- `--security-expires 2028-02-29T18:00:00Z` publishes a fixed future RFC 3339
  timestamp. Update it, rebuild, and deploy before it lapses.

The canonical URL defaults to the configured site URL plus
`/.well-known/security.txt`. The generated configuration supports `canonical`,
`preferredLanguages`, `acknowledgments`, `encryption`, `hiring`, and `policy`.
The language and optional URI fields accept lists. Builds reject invalid or
expired settings and subpath deployments.

### Scheduled renewal

When GitHub Actions owns deployment, rolling mode adds a monthly production
build and deployment for GitHub Pages or Cloudflare Pages. An explicit
deployment plan needs an environment named `production`. The implicit GitHub
Pages deployment uses `main`. The production source branch must match the
repository default branch, where GitHub runs scheduled workflows. The weekly
schedule continues to validate the build. See
[GitHub's schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

For GitLab CI, create a monthly project schedule on the protected production
branch. Configure the production deploy and smoke rules to accept that
specific schedule, using a dedicated schedule variable and a rule without
`changes`. If deployment runs in a child pipeline, configure the parent
trigger and forward the schedule variable. See
[GitLab's pipeline schedule setup](https://docs.gitlab.com/ci/pipelines/schedules/).

For external deployment, schedule a monthly rebuild from the protected
production branch and publish the newly built output. Preserve
`dist/.well-known/` in custom deployment pipelines. Forge enables hidden
output in its generated GitHub Pages archive when the file is enabled.

You own the generated workflow and hosting configuration. Keep the contacts
monitored, check that renewal runs publish successfully, and verify that the
public HTTPS endpoint returns the current file as UTF-8 plain text.
