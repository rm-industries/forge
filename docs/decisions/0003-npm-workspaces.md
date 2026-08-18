# 0003: Use npm workspaces

- Status: Accepted
- Date: 2026-08-18
- Roadmap: [FGE-001](https://github.com/rm-industries/forge/issues/1)

## Context

Forge needs reproducible dependency installation and root-level orchestration
without requiring contributors to install a separate monorepo tool globally.

## Decision

Use a private root npm package with `packages/*` as its workspace pattern and a
committed root `package-lock.json`. The workspaces include
`@rm-industries/create-forge` and `@rm-industries/content-model`.
`templates/default/` remains a standalone project with its own package metadata
and lockfile rather than a root workspace.

The `packages/*` glob is the package boundary: each immediate child directory
with a package manifest joins the workspace, while nested fixtures and support
files do not. This avoids editing the root manifest whenever a package is added
or renamed. In exchange, every new immediate package directory must be reviewed
because it automatically participates in installation and workspace commands.

The template consumes `@rm-industries/content-model` as a normal versioned npm
dependency. Repository tests may arrange a packed local package for integration
testing, but the template must also be tested from a clean directory against
the exact dependency versions recorded in its lockfile.

Root scripts orchestrate formatting, linting, type checking, testing, building,
and packing. Repository-wide static tools such as formatting, Markdown linting,
and spelling run once from the root and include root files and workspaces.
Package-specific type checking, tests, builds, packing, and specialized checks
fan out through npm workspaces. A root command must not also invoke an
overlapping workspace command when both would scan the same files. Workspace
scripts remain runnable directly for focused work.

## Consequences

One standard npm installation manages repository tooling and publishable
packages. The template must be installed and tested separately, which proves
that generated output resolves the content-model package as a published
dependency rather than through workspace hoisting. Dependencies used by both
scopes may appear in both lockfiles.

The glob can enroll a mistakenly placed package manifest. CI must list the
resolved workspaces, and fixtures or examples that are not packages must live
outside the immediate `packages/*` boundary.

## Rejected alternatives

- pnpm, Yarn, and third-party monorepo orchestrators add tooling not required by
  the roadmap.
- Making the template a workspace can hide missing dependencies through
  hoisting and weaken isolation tests.
- Enumerating package paths makes membership explicit, but the list can drift
  when a package is added or renamed. The directory boundary plus manifest
  review provides one source of truth instead.
- Independent package repositories would make coordinated changes and template
  packaging harder.
