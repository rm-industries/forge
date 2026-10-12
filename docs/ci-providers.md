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
fields. Dependencies must exist and cannot form cycles. Serialization parses and
validates YAML before writing. Tests and actionlint/zizmor verify generated
consumer output; they do not generate or rewrite Forge's own workflows.

Validation jobs share build artifacts. GitHub Pages retains same-run deployment
following the aggregate validation gate. GitLab validation is supported here;
switchable Pages deployment is the next review. Namespaced GitLab output is a child pipeline:

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
