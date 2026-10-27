# Contributing to Forge

Thank you for helping improve Forge. Contributions should be focused, tested,
and easy for another maintainer to review.

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- Use an issue to discuss changes that alter public APIs, architecture, package
  boundaries, or supported runtimes.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in every project space.
- Report vulnerabilities through the process in [SECURITY.md](SECURITY.md), not
  in a public issue.

## Local development

Use a Node.js and npm version listed in the
[support policy](docs/support-policy.md). Install the exact dependency graph
from the repository root:

```sh
npm ci
```

Run the complete local quality gate before requesting review:

```sh
npm run quality
```

The registry-backed dependency policy is intentionally separate from the
deterministic quality command. Run it before requesting review when a lockfile
or dependency manifest changes:

```sh
npm run audit
```

Use `npm run format:fix` to apply Oxfmt changes. Root formatting, Oxlint,
Markdown linting, spelling, and TypeScript checks cover the entire repository.
Package-specific type checking, tests, and builds are orchestrated through npm
workspaces.

The default template is deliberately outside the npm workspace. Validate it as
an independent project before requesting review:

```sh
cd templates/default
npm install
npm run lint:css
npm test
npm run typecheck
npm run build
npm run test:e2e
```

## Continuous integration

Pull requests and pushes to `main` run root formatting, code/Markdown lint,
spelling, documentation, types and tooling tests in parallel. `Repository quality`
requires all seven checks to pass. Project workflows use native path filters for their
own sources, consumed inputs and shared tooling; every project also offers weekly
and manual validation. Review affected project results before merge. Integration
tests have their own tooling triggers and weekly/manual workflow, without upstream
package source fan-out. The sole proposed required context is `Repository quality`;
replacing the historical 27 contexts remains a separately approved settings change.

Use `npm run test:contracts` for root contracts, `npm run test:integration` for the
model integration, and `npm run test:root` for both. Template customization uses
`npm run test:template:customization`. Native GitLab project includes follow the
same ownership through change rules; the old impact selector is removed.

Workflow syntax/security and source security keep their existing responsibilities.
Repository and package checks use committed lockfiles. Template checks resolve a
fresh graph and replay that generated lock across downstream jobs. No globally
installed project tools are required.
Consumer YAML belongs to the generated project after bootstrap. Scope, coverage,
evidence limits and safe rollback are documented in
[repository development and CI](README.md#development-and-ci).

Actions are pinned to immutable commits, workflow permissions are denied by
default, and superseded runs are cancelled. Keep these properties intact when
editing automation. Runtime coverage must remain aligned with the
[support policy](docs/support-policy.md).

## Pull requests

- Keep each pull request scoped to one coherent change.
- Add or update tests and documentation when behavior changes.
- Use a closing keyword such as `Closes #123` when the pull request completes an
  issue.
- Explain design decisions and any follow-up work in the description.
- Do not commit generated output, coverage, dependencies, local secrets, or
  editor state.

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).

Frontmatter ordering belongs to the [independent lint
package](packages/markdownlint-frontmatter/README.md). Test its public rule and packed consumer,
then the [CLI2 adoption and CMS gates](README.md#release-prerequisites). Keep Oxfmt formatting
and Astro schema validation separate. Do not add unpublished dependencies to the standalone starter.
