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

Use `npm run format:fix` to apply Oxfmt changes. Root formatting, Oxlint,
Markdown linting, spelling, and TypeScript checks cover the entire repository.
Package-specific type checking, tests, and builds are orchestrated through npm
workspaces.

The default template is deliberately outside the npm workspace. Validate it as
an independent project before requesting review:

```sh
cd templates/default
npm ci
npm run lint:css
npm test
npm run typecheck
npm run build
npm run test:e2e
```

## Continuous integration

Pull requests and pushes to `main` run the repository quality gate and validate
a copy of the default template outside the workspace on every supported Node.js
line. Changes under `.github/` also run workflow syntax and security checks.
These jobs use committed lockfiles and do not require globally installed project
tools.

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
