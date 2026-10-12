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

Forge's native `generator.yml` now owns packed bootstrap, copied-template and
generator compatibility jobs. Both project and generator workflows run for every
pull request because their individual checks replace the root aggregate gate.

Generated files include ownership comments explaining where consumers should
edit jobs, triggers and schedules, and how action pins or runtime images evolve.

## Consumer dependency review

Generated GitHub security checks fail when a pull request introduces dependencies
with high or critical vulnerabilities, matching the reference website's policy.
The separate advisory npm audit remains unchanged. Require the dependency-review
check in branch protection to enforce it before merging; deployment does not
wait for the separate security workflow.

Dependency review is available for public repositories and eligible private
repositories with GitHub Code Security or Advanced Security enabled. Consumers
whose repositories do not support it must disable that job in their owned YAML.
See [GitHub's dependency review documentation](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).
