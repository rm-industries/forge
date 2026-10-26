# Generated CI

Forge maintains its own pipelines directly in YAML. The create-forge package
uses internal TypeScript builders and Zod schemas only to generate consumer CI
at bootstrap. These definitions are not shipped into generated projects.

## Consumer ownership

Bootstrap produces GitHub Actions, GitLab CI, or both. Consumers own the YAML and
edit it directly. There is no retained CI configuration file, TypeScript authoring
system, local pipeline runner, or regeneration command. Existing npm scripts
remain the local development interface.

The CLI accepts `--ci-providers github,gitlab`, `--primary-ci`, and `--ci-prefix`.
A project nested under `--repository-root` derives workflow names from its
relative directory unless a prefix is supplied. Working directories, output
names and schedule values are passed to the renderer in memory.

Existing shared Dependabot configuration and setup actions are preserved and
reported when skipped. Existing generated-filename conflicts require the normal
overwrite approval. Generation runs in staging, with rollback on failure.

## Validation and provider behavior

Small Zod schemas validate commands, images, work relationships and provider
fields. Dependencies must exist and cannot form cycles. Serialization formats
YAML with Oxfmt using template settings, then parses and
validates the formatted YAML before writing. Generated workflows participate in
normal consumer formatting checks. Tests and actionlint/zizmor verify generated
consumer output; they do not generate or rewrite Forge's own workflows.

Validation jobs share build artifacts. Both providers retain Pages deployment
and smoke tests; the inactive provider is disabled with native conditions. Enable
Pages and set the canonical site URL before switching provider. GitLab Pages
requires GitLab 17.9 or newer. Namespaced GitLab output is a child pipeline:

```yaml
forge-site:
  trigger:
    include:
      - local: .gitlab/ci/site.yml
    strategy: depend
```

## Action pins and updates

Packaging derives every required action SHA and version comment from Forge's
Dependabot-maintained YAML, including its setup action. Missing, mutable or
conflicting pins fail the build. The generated bootstrap pin snapshot belongs
to the create-forge package, not to the consumer template.

These are the latest pins tested and released by Forge, rather than versions
fetched from upstream during bootstrap. New upstream releases reach bootstrap
through a create-forge release. Consumer Dependabot then updates its own YAML
independently throughout the project's life.

GitHub Actions updates use `directory: /`, covering root workflow files even when
their names are prefixed for nested projects. npm updates use the consumer's
project directory. If an existing repository's Dependabot file is preserved,
review its coverage and add the appropriate updates manually.

[GitHub Dependabot documentation](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions)
explains action updates. GitLab instance and runner compatibility still require
server-side CI Lint and a live run. Zod validates the subset Forge emits; subsequent
consumer edits are checked by provider and workflow tools.

Consumers run one Node major in CI, selected with `--node-version 22`,
`--node-version 24`, or `--node-version 26` (the default). Forge retains its
compatibility matrices to verify the supported runtime range. Consumers do not
receive a compatibility job.

## Consumer dependency review

Generated GitHub security checks fail when a pull request introduces high or
critical dependency vulnerabilities. Require the individual dependency-review
check in branch protection to enforce it before merging; deployment does not
wait for the separate security workflow. CodeQL findings still require review.
Dependency review needs a public repository or eligible GitHub security plan;
if unavailable, disable that job in your owned YAML and maintain an appropriate
review process. Routine registry audit jobs are omitted from generated CI;
`npm run audit` remains available locally.

## Cloudflare Pages deployment

A `cloudflare-pages` deployment can use either primary CI. It requires an existing
Direct Upload project, an explicit public URL, and credentials configured on that
CI's deployment environment. Forge adds Wrangler to the site's development dependencies
and resolves its lockfile through npm, requiring registry access even with `--no-install`.
The deploy job installs those locked dependencies with lifecycle scripts disabled.
Both providers retain native disabled deployment jobs when secondary.
See [Cloudflare bootstrap options](../packages/create-forge/README.md#cloudflare-pages)
for setup and switching guidance. Multiple environments use separate branches and destinations.

## Persistent GitLab Pages prefixes

An explicit GitLab Pages deployment can set `pathPrefix` with a matching public URL.
This opts in to Premium/Ultimate parallel Pages and emits `pages.expire_in: never`.
The prefix can coexist with the root site; it must not shadow a route in that site.
The URL includes the prefix so build paths and smoke checks target the same deployment.
Standard unprefixed Pages remains unchanged. See
[prefixed Pages setup](../packages/create-forge/README.md#prefixed-gitlab-pages).

## Branch-specific environments

Multiple deployment inputs share one validation graph and select `PUBLIC_SITE_URL`
by source branch (or pull/merge-request target branch). Named deployment and smoke
jobs consume that branch's validated artifact and remain gated by primary CI.
Explicit URLs and unique names, branches and destinations prevent overwrites.
See [multiple environments](../packages/create-forge/README.md#multiple-deployment-environments).

## Consumer deployment guide

Bootstrap fills the consumer README deployment section with the selected plan and links to the generated
CI definitions, including repository-level paths for nested sites. Only selected
providers get setup instructions. The guide explains environment protection, secret
scope, Cloudflare Direct Upload prerequisites and GitLab parallel Pages requirements.
It is documentation to edit alongside the YAML, not configuration for future regeneration.

## Generated GitLab merge-request admission

Generated validation jobs have explicit rules so they participate in admitted
merge-request pipelines. Deployment and smoke jobs retain their separate
source-branch and primary-provider gates. Validate on your destination server
with CI Lint and a real runner; local schema validation does not prove server,
runner or protected-environment settings.

## Generated automation controls

Generated GitHub automation supports manual dispatch alongside its existing path-filtered
push/PR events and weekly schedule. Workflow-security and syntax jobs report independently;
no aggregate job is generated. Consumers choose which individual checks to require in
branch protection. Automation remains provider-local and does not gate site deployment.
