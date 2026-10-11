# CI providers

Forge defines site work in TypeScript and renders GitHub Actions or GitLab CI.
Everything runs with the existing Node and npm setup. The implementation is
internal to Forge; it does not introduce another runtime or published package.

## Shared work and native provider behavior

`templates/default/scripts/ci/model.ts` defines commands, dependencies, artifacts,
and browser requirements. `defineWork` validates those pieces with small Zod
schemas, rejects missing dependencies and cycles, and provides types for callers.
The local command and both renderers consume that definition.

The GitHub renderer owns permissions, actions, matrices, concurrency, environments,
and outputs. Security and repository automation are explicit GitHub definitions.
The GitLab renderer owns images, rules, stages, dependencies and artifact transfer.
The schemas validate the fields Forge emits; they are not complete implementations
of either platform's specification. Unknown fields are rejected so additions must
extend the appropriate schema. Serialization parses and validates the resulting
YAML before writing it.

GitHub Pages deployment remains in the project workflow, after the aggregate
validation job. It uses that run's Pages artifact and preserves the environment,
deployment output and deployed-site smoke test. No `workflow_run` trigger is used.
Only the primary GitHub provider deploys. GitLab currently provides validation;
it does not provision Pages, CodeQL, or GitHub repository automation. Selecting
GitLab as primary does not manufacture an equivalent deployment integration.

The repository root and Forge website retain their existing native workflows.
They are not copied into generated projects. Migrating their authoring into
TypeScript is separate work; this change removes the experimental runtime and
restores their artifact-sharing behavior. Root checks run on every change and
retain the sparse runtime compatibility matrices.

## Bootstrap and regeneration

The template stores TypeScript definitions and shared GitHub configuration, with
no workflow YAML. Bootstrap renders into staging and applies the same collision,
symlink and rollback rules as other generated files. Generated repositories commit
the resulting YAML so platform tools and dependency updates can inspect it.

Change owned jobs in the TypeScript definitions. YAML edits other than action
pin updates are reported as drift and are replaced during regeneration.

Generated projects can run:

```sh
npm run pipeline -- quality --dry-run
npm run pipeline -- quality
npm run pipeline -- browser-tests
npm run ci:generate
npm run ci:check
```

Local execution runs dependencies once in order and stops on failure, including
security audit findings. Hosted dependency audits remain advisory to allow
remediation. Local execution does not emulate hosted permissions, containers,
runtime matrices, secrets, or deployment; npm scripts remain available directly.

Use `--ci-providers github,gitlab` and optionally `--primary-ci github` during
bootstrap. Later, edit `scripts/ci/config.json` to select `providers`, optionally `primary`, and
schedule minutes. Both providers may validate the same project. Removing a
provider does not delete already committed workflows; remove those deliberately.

Standalone GitHub workflow filenames are `project.yml`, `security.yml`, and
`automation.yml`. With `--repository-root`, the project directory supplies the
prefix automatically; `--ci-prefix` overrides it. Existing shared configuration
is preserved and skipped files are reported. Inline setup means an existing
repository's setup action is not a dependency of the generated workflow.

Standalone GitLab output is `.gitlab-ci.yml`. Namespaced output is
`.gitlab/ci/<prefix>.yml`, which the repository owner must invoke as a child pipeline from their
existing root GitLab configuration. Forge does not overwrite or merge that file.
A child pipeline keeps generated stages, rules, defaults and job identifiers
separate from the existing root pipeline:

```yaml
forge-site:
  trigger:
    include:
      - local: .gitlab/ci/site.yml
    strategy: depend
```

Use the prefix-derived filename for `local`. The dependent trigger reports the
child pipeline result to its parent. Generated rules accept `parent_pipeline` in
addition to standalone push and merge-request events.

## Action pins and Dependabot

`createCiPinResolver` reads full action SHAs and version comments from committed
GitHub workflows. Existing workflow pins take priority over bootstrap defaults.
Regeneration therefore preserves Dependabot updates rather than overwriting them.
Malformed or mutable references and conflicting pins across workflows fail with
a diagnostic. Update every occurrence of a shared action together.

`npm run ci:check` detects other generated-output drift. A Dependabot action bump
alone passes when its occurrences remain consistent. This verifies generation
compatibility, not the behavior of the new action; the normal checks still run.

When the Forge package is built, `copy-template.ts` refreshes the packaged
`actions.json` defaults from the repository's Dependabot-maintained workflows and
setup action. New consumers receive those pins without a second manual pin update.
The template's source defaults support development and tests; published bootstrap
defaults are refreshed at build time. Updating action compatibility still requires
review and a Forge release to reach new consumers.

## Validation

Tests cover graph validation, native deployment fields, artifact reuse, provider
selection, serialization, action updates, drift and conflicts. Packed CLI fixtures
exercise standalone and nested bootstrap, no-install use, regeneration and rollback.
GitHub actionlint and zizmor remain the hosted syntax and security checks. The
repository automation workflow renders fresh template workflows using packaged
action defaults before scanning them, and watches the TypeScript CI sources.

Provider references:
[GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
and [GitLab CI syntax](https://docs.gitlab.com/ci/yaml/).
GitLab's server-side CI Lint remains necessary to verify an installed instance's
feature support and runner configuration; local schema validation cannot replace it.
