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

## Repository workflow boundaries

`automation.yml` validates Forge's committed workflows and actions. `project.yml`
runs repository and package checks. `security.yml` covers project security, and
`website.yml` validates and deploys the website.

`generator.yml` owns disposable consumer CI validation. It builds create-forge,
bootstraps both providers without installation or Git setup, and scans only the
consumer's GitHub YAML. Generation validates both providers with Zod; actionlint
checks GitHub syntax and zizmor checks security patterns. Generator source,
template, build configuration, dependency and action-pin changes trigger it.

Forge's native `generator.yml` packages once, bootstraps once per supported
runtime and reuses the primary consumer source/build for output checks. Both project and generator workflows run for every
pull request because their individual checks replace the root aggregate gate.

Generated files include ownership comments explaining where consumers should
edit jobs, triggers and schedules, and how action pins or runtime images evolve.

## Consumer dependency review

Generated GitHub security checks fail when a pull request introduces dependencies
with high or critical vulnerabilities, matching the reference website's policy.
Routine dependency-audit jobs are omitted. Require the dependency-review
check in branch protection to enforce it before merging; deployment does not
wait for the separate security workflow.

Dependency review is available for public repositories and eligible private
repositories with GitHub Code Security or Advanced Security enabled. Consumers
whose repositories do not support it must disable that job in their owned YAML.
See [GitHub's dependency review documentation](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).

## Native GitLab validation

Forge's committed `.gitlab-ci.yml` admits merge-request pipelines and
pushes to the default branch. Branch pushes with an open merge request are
suppressed to avoid duplicate validation. Tags, schedules and manual pipelines
are not admitted by this native entrypoint. Each active project, generator and
website job has explicit admission rules: GitLab otherwise excludes jobs without
rules from merge-request pipelines. These job rules do not broaden the entrypoint's
allowed events.

The project include always runs. Generator and website includes use their existing
change filters. The website include watches website sources, imported documentation
and native GitLab CI configuration; it does not watch GitHub workflow or setup-action
changes. The generator include also watches GitHub YAML because it validates the
consumer workflows and derives bundled action pins from those files. That is a
generator input, not a coupling between website deployment providers.

GitLab uses Linux containers for root package and generated-consumer validation.
GitHub retains the additional platform qualification in its consumer matrix.
Both providers reuse their own tested build artifacts for downstream checks;
GitLab retains native test, coverage and quality reports for seven days.
GitHub owns CodeQL, dependency review, Dependabot, actionlint and zizmor scanning.
Those GitHub checks are not equivalent to native GitLab configuration validation;
GitLab source scanning and dependency update automation are not added here.
GitHub also owns website Pages deployment and package publication. Native GitLab
Pages and deployed smoke jobs remain disabled. Deployment-provider and environment
expansion is tracked separately in [issue #272](https://github.com/rm-industries/forge/issues/272).

Before relying on a GitLab mirror, use the destination server's CI Lint with
expanded local includes and a real Linux runner. Verify merge-request and
default-branch push admission, duplicate-push suppression, documentation-only and
CI-only changes, artifact reuse and inactive deployment. Forge's local schema and
existing CI tests verify the supported configuration structure; they do not prove
server, runner or protected-environment settings. GitHub workflow trigger filters
and deployment permissions remain unchanged.

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

Generated validation jobs have explicit `when: on_success` rules so they participate
in pipelines admitted by `workflow.rules`, including merge requests. Jobs without
rules would otherwise exclude merge requests. Multi-environment URL-selection rules
also admit validation; deployment and smoke retain their separate source-branch and
primary-provider gates. See the [reference evidence review](ci-comparison.md#issue-321-current-gitlab-reference-evidence)
for matching push-run evidence and the remaining live MR verification limit.

## Generated automation controls

Generated GitHub automation supports manual dispatch alongside its existing path-filtered
push/PR events and weekly schedule. Workflow-security and syntax jobs report independently;
no aggregate job is generated. Consumers choose which individual checks to require in
branch protection. Automation remains provider-local and does not gate site deployment.
