# Architecture guide

Forge is a monorepo that publishes two packages and bundles one standalone site
template. This guide is the maintainer-oriented map; accepted architectural
decisions remain authoritative in the [ADR index](decisions/README.md).

## System map

```text
templates/default
      │ copied during create-forge build
      ▼
@rm-industries/create-forge ──generates──▶ owned Astro project
      │                                      │
      │ bundles                              │ installs
      ▼                                      ▼
template snapshot                    @rm-industries/content-model
                                             │
                                  core + Astro + Sveltia adapters

website ──generated once, then owned──▶ GitHub Pages project site
   │
   └── standalone install and lockfile; outside root workspaces
```

- `packages/create-forge/` owns CLI parsing, prompts, validation, safe
  materialization, project setup, reporting, and the bundled template snapshot.
- `packages/content-model/` owns integration-neutral model semantics and the
  Astro and Sveltia adapter entry points.
- `templates/default/` is a complete Astro repository outside the npm workspace.
  It owns its lockfile so standalone checks cannot pass through root hoisting.
- `scripts/` owns repository-level release, compatibility, synchronization, and
  template-isolation tooling.
- `.github/` owns repository automation; `templates/default/.github/` is copied
  into generated projects.
- `website/` will own the public Forge project site as an isolated generated
  consumer. It uses root workflows but retains its own installation, lockfile,
  application source, and tool configuration.

## Contract boundaries

The generator copies owned source. It does not create a managed installation or
update an existing generated project. The content-model package is the supported
upgrade path for shared model and adapter behavior; template source changes need
manual migration guidance.

The generator and content-model package use independent semantic versions. The
template has no independent package version: a generator release identifies the
exact template snapshot it contains. See the
[support policy](support-policy.md) and [versioning ADR](decisions/0006-versioning.md)
for breaking-change rules.

The project website has a separate deployment lifecycle. Merges affecting it
publish a static GitHub Pages artifact from `website/`; npm package tags do not
deploy it, and website deployments do not publish packages. Dependabot manages
its installed npm dependencies as a separate ecosystem. Generator releases can
only be adopted through selective, reviewed source migrations because the
generator is not an installed website dependency. See
[ADR 0007](decisions/0007-project-website.md) for the complete ownership,
publishing, and update flow.

## Data flow

Generator inputs become a validated `GeneratorOptions` value. Materialization
copies regular files, protects destination boundaries, backs up overwritten
files, customizes reviewed token locations, rejects unresolved tokens, then
optionally runs dependency installation and Git initialization.

In a generated site, `src/config/site.ts` owns site identity and URL data.
`src/config/content-models/` owns collection definitions. Astro and Sveltia
derive their respective configuration from the same model registry.

## Verification layers

- Root quality checks repository source and both npm workspaces.
- Template static verification copies the template, performs a clean install,
  runs its static gate, and exercises known-defect fixtures.
- Template isolation performs the complete non-browser standalone gate.
- Generator end-to-end tests pack the actual CLI and generate five independent
  fixtures outside the workspace.
- Browser, accessibility, coverage, Lighthouse, security, and dependency jobs
  retain their own evidence in CI.
- Package release dry runs inspect the exact tarball later consumed by protected
  publication.

## Accepted decisions

| Area                         | Decision                                               |
| ---------------------------- | ------------------------------------------------------ |
| Repository ownership         | [ADR 0001](decisions/0001-repository-layout.md)        |
| Template count               | [ADR 0002](decisions/0002-one-template-v1.md)          |
| Workspace discovery          | [ADR 0003](decisions/0003-npm-workspaces.md)           |
| Safe project materialization | [ADR 0004](decisions/0004-template-materialization.md) |
| Shared content model         | [ADR 0005](decisions/0005-shared-content-model.md)     |
| Package versioning           | [ADR 0006](decisions/0006-versioning.md)               |
| Project website              | [ADR 0007](decisions/0007-project-website.md)          |

Create a new ADR when changing an accepted decision materially. Do not rewrite
the history of an accepted record; mark the new record as superseding it and
update this index and the ADR index.

Continue with the [maintainer guide](maintaining.md) for change procedures and
the [release guide](releasing.md) for checkpoint and package releases.
