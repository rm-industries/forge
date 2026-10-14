# `@rm-industries/create-forge`

The stable Forge project initializer. npm resolves the primary command to this
scoped package:

```sh
npm create @rm-industries/forge
```

The initializer accepts interactive answers, documented defaults through
`--yes`, or a fully specified set of flags. Run `create-forge --help` for the
complete input contract. Unless disabled with `--no-install` or `--no-git`, it
runs `npm install` and initializes a `main`-branch Git repository after files are
created. It never stages files, reads Git identity, or creates a commit.

By default, the destination is both the generated project root and repository
root. To add a Forge site to an existing repository without replacing unrelated
files, pass the site directory as the destination and identify the repository
root separately:

```sh
npm create @rm-industries/forge website -- --repository-root .
```

Forge writes the application into `website/`, places repository-owned GitHub
configuration in the root `.github/` directory, installs dependencies inside
`website/`, and initializes Git at the repository root when needed. Generated
workflow execution paths, artifact paths, and Dependabot settings
are adjusted for the nested project automatically. Workflow files are named
`website-project.yml`, `website-security.yml`, and `website-automation.yml` for
this example, leaving existing unprefixed workflows untouched. Override the
prefix with `--ci-prefix docs-site`. Prefixes contain lowercase letters, numbers,
and single hyphens, with a maximum length of 80 characters. A standalone project
keeps the unprefixed workflow names unless a prefix is explicitly provided.
Existing shared configuration, such as Dependabot settings, is preserved. Forge
reports the configuration it skipped so you can integrate it manually.

The selected template is copied with dotfiles and file modes intact. Forge
customizes only reviewed metadata files and refuses parent-traversal paths,
symbolic-link collisions, filesystem roots, and unconfirmed non-empty
destinations. If copying or customization fails, files created by that
invocation are removed and overwritten files are restored from temporary
backups. The error includes recovery guidance if automatic rollback is
incomplete.

Installation and Git commands inherit the terminal so their progress and errors
remain visible. A failed or interrupted command exits non-zero and leaves the
generated project in place with instructions to inspect and retry it.

After successful creation, Forge reports the created path, whether dependency
and Git setup ran or was skipped, and only the commands still needed to start
development. Output remains readable when color is disabled and contains no
telemetry or promotional messages.

## CI generation

Select providers during bootstrap with `--ci-providers github,gitlab` or
`--ci-providers gitlab`. `--primary-ci` selects the authoritative provider;
GitHub is primary when enabled unless overridden. Both providers include Pages
deployment and deployed-site smoke tests; the inactive provider retains these
jobs with native disabled conditions. Edit the native deployment conditions to
enable the selected provider. Enable Pages on that host and update the canonical site
URL before switching. GitLab Pages requires GitLab 17.9 or newer.

For an explicit native Pages environment, pass `--deployment` with a JSON object:

```sh
npm create @rm-industries/forge website -- \
  --ci-providers github,gitlab --primary-ci github \
  --deployment '{"name":"staging","sourceBranch":"dev","target":"github-pages","url":"https://example.com/site"}'
```

The environment name and source branch are independent. The optional deployment URL
also sets the generated site's canonical URL and build base path, then becomes the
smoke-test URL. Omit it to use `--url` for the site and the provider's deployment
URL for smoke tests. Configure custom domains on the hosting provider before
using them. GitHub environment approval and branch restrictions are configured
in repository settings separately; use a name that matches those settings.

Each deployment environment requires its own source branch and destination. Native Pages requires a matching primary
CI: `github-pages` with GitHub or `gitlab-pages` with GitLab. Explicit deployments
omit incompatible secondary-provider deployment jobs and explain why in generated
comments. The default without `--deployment` retains both native Pages standby
jobs. Validation includes main and the selected source branch; deployment only
runs for the selected branch after the project checks pass, never for pull requests.
GitLab deployments serialize using an environment/target resource group. GitHub
project workflows for a custom source branch disable npm caching to keep
artifact-producing installs independent.

The flag is repeatable, but multiple environments and parallel GitLab Pages remain
rejected until their subsequent implementation reviews. A friendlier
input syntax can replace JSON later without introducing a retained Forge config.

### Prefixed GitLab Pages

GitLab Premium or Ultimate projects with an available parallel deployment slot can
opt in to a persistent prefixed deployment:

```sh
npm create @rm-industries/forge website -- \
  --ci-providers github,gitlab --primary-ci gitlab \
  --deployment '{"name":"staging","sourceBranch":"dev","target":"gitlab-pages","pathPrefix":"staging","url":"https://example.gitlab.io/site/staging/"}'
```

Use the actual Pages URL, including the project path when applicable and the final
prefix. Forge uses this URL for the site's build paths and smoke tests. Prefixes
must be lowercase, at most 63 characters, and start/end with a letter or digit;
internal hyphens and periods are allowed. Forge rejects values GitLab would silently
normalize. Avoid prefixes that shadow existing routes in the main site.

The generated job uses `pages.path_prefix` and `pages.expire_in: never`, so it can
remain deployed alongside the root site. Selecting a prefix explicitly asserts that
your GitLab plan supports parallel Pages. Ordinary Pages remains unchanged and
requires no paid parallel deployment feature. Repeat `--deployment` to generate several environments on separate branches.
See [GitLab parallel Pages](https://docs.gitlab.com/user/project/pages/parallel_deployments/)
for plan requirements, namespace slots, and route conflicts.

## Cloudflare Pages

Cloudflare Pages can use either GitHub or GitLab as primary CI:

```sh
npm create @rm-industries/forge website -- \
  --ci-providers github,gitlab --primary-ci github \
  --deployment '{"name":"production","sourceBranch":"main","target":"cloudflare-pages","project":"example-site","url":"https://example-site.pages.dev"}'
```

Create the Direct Upload project in Cloudflare first. Set its production branch to
match `sourceBranch`; otherwise Wrangler creates a preview deployment instead of
updating the project's production URL. Configure a custom domain before using it
as `url`. An explicit public URL is required for Cloudflare in this iteration and
sets the site's canonical build path as well as the smoke-test URL.

Configure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the primary CI. Use a
token with Cloudflare Pages Edit permission scoped to the intended account. On
GitHub, store these as secrets on the generated deployment environment and configure
its branch restrictions. On GitLab, use masked, protected, environment-scoped variables
for the deployment environment and protect its source branch. Do not expose the
token to pull/merge requests or validation jobs. The smoke job needs no token.

Wrangler's bootstrap version range comes from create-forge's development dependencies,
maintained by Forge's existing Dependabot configuration and captured during packaging.

When Cloudflare is selected, Forge adds Wrangler to the site's development dependencies
and asks npm to resolve the site's lockfile. This requires registry access even with
`--no-install`; that flag skips dependency installation, not lockfile resolution.
If resolution fails, Forge restores the files it changed. The existing npm Dependabot
entry covers Wrangler along with the site's other dependencies. A Wrangler-only Knip
exclusion accounts for the deployment job invoking its locked executable by path.

Deployment installs the locked site dependencies with lifecycle scripts disabled,
then uses Wrangler to upload the validated build artifact without rebuilding.

Both generated CIs contain the Cloudflare deploy and smoke jobs; the secondary CI
keeps them disabled with native conditions. To switch, enable its branch conditions
and disable the previous primary's deployment conditions. GitHub's publishing
workflow disables npm caching; GitLab serializes deployments per environment/project.
Wrangler metrics are disabled. The deploy job checks that the Pages project already exists as Direct Upload and
its production branch matches before uploading. Forge does not create or reconfigure projects.

See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
for project setup and [Direct Upload from CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
for credentials.

Generated projects receive validated YAML that they own and edit directly. CI
builders and Zod schemas stay internal to create-forge; no CI TypeScript, retained
configuration, regeneration commands, or authoring dependencies are delivered.
Existing npm scripts remain the local development interface.

Bootstrap action pins mirror Forge's Dependabot-maintained workflows at package
build time. Consumer Dependabot keeps the resulting YAML up to date independently.
See [CI generation](../../docs/ci-providers.md) for provider behavior, pin provenance
and nested repository ownership.

## Package verification

From the Forge repository root, build and inspect every workspace package:

```sh
npm run quality
```

To build this package, create its actual tarball, install it into an isolated OS
temporary directory, and exercise the installed executable:

```sh
npm run verify:package --workspace @rm-industries/create-forge
```

The verification confirms `--help`, `--version`, and packaged template assets,
then removes the temporary fixture.

To exercise the packed CLI across the complete generator fixture matrix:

```sh
npm run test:generator:e2e
```

This exercises default, fully specified, scoped-name, current-directory,
nested-project, GitLab-only, combined-provider, no-install, Cloudflare and conflict scenarios
in temporary directories. The Cloudflare scenario resolves dependencies through the registry,
verifies a locked install and unused-dependency checks, and runs the installed Wrangler
version command without accessing Cloudflare. The default and nested scenarios verify installation;
conflicts must preserve existing files. The nested custom-URL scenario gets one
targeted production build and artifact validation, without repeating the full
consumer quality suite. CI supplies the already packaged CLI
through `FORGE_CLI_TARBALL`, so these scenarios do not rebuild or repack it.

Generator CI builds and packages the CLI once. Each supported Node lane installs
that same package, bootstraps once with its selected Node major, and runs consumer
types, unit tests and a production build. The primary Node 26 lane records coverage
and shares its generated source and build artifacts with static quality, generated
workflow syntax/security, build validation, browser and Lighthouse checks. macOS
also exercises bootstrap and runtime checks. Content-model is installed from the
consumer lockfile; candidate content-model validation belongs to project CI.

Consumers run one Node major in CI, selected with `--node-version 22`,
`--node-version 24`, or `--node-version 26` (the default). Forge retains its
compatibility matrices to verify the supported runtime range. Consumers do not
receive a compatibility job.

## Multiple deployment environments

Repeat `--deployment` for production and staging on separate branches. Every name,
source branch and destination must be unique, and each environment needs an explicit
public URL. Cloudflare environments need separate existing Direct Upload projects;
GitLab Pages environments need distinct prefixes (one can use the root deployment).
GitHub Pages supports one destination per repository.

The project workflow validates once per branch. `PUBLIC_SITE_URL` selects that
branch's canonical URL and build base path for build, browser and Lighthouse checks.
Deploy and smoke jobs are named by environment, use the validated artifact, and run
only for their selected source branch on the primary CI. Pull/merge requests validate
against their target branch's URL but do not deploy. Other branches use the first
configured environment's URL. Local development also defaults to the first URL;
override `PUBLIC_SITE_URL` to exercise another environment locally.

Both CI definitions remain ordinary consumer-owned YAML. To change environments
later, edit their URL selection, branch conditions and named deploy/smoke jobs.

Generated sites include deployment setup in their `README.md` with their selected environments, source
branches, primary CI, workflow locations and provider setup requirements. The guide
records bootstrap choices; it is consumer-owned documentation, not retained Forge
configuration. Update it alongside the YAML when changing deployment behavior.
