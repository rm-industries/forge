# Forge

> An opinionated foundation for modern, content-driven websites.

Forge is an open-source starter maintained by **RM Industries** that combines a
modern static-site architecture with production-ready tooling, security, and
automation.

Instead of spending hours configuring a new repository, Forge provides sensible
defaults so you can focus on building your website.

## Development

Forge uses the `packages/*` npm workspace glob, which includes each immediate
package directory under `packages/`. This keeps the root manifest stable when a
package is added or renamed; the tradeoff is that every immediate package
directory with a manifest is included automatically and must be reviewed as a
workspace boundary. Nested directories are not matched. See the
[support policy](docs/support-policy.md) for supported Node.js and npm versions.

Install dependencies from the repository root:

```sh
npm ci
```

Root scripts expose `format`, `lint`, `typecheck`, `test`, `build`, `pack`, and
`quality`. Repository-wide Oxfmt, Oxlint, Markdown, spelling, and TypeScript
checks run once from the root across both root files and workspace files.
Package-specific type checking, tests, and builds fan out through npm
workspaces. This keeps root-owned documentation and configuration covered
without scanning workspace files twice. Use `npm run format:fix` to apply Oxfmt
changes.

```sh
npm run quality
```

GitHub Actions runs this gate on the minimum supported Node.js release and the
latest release of every supported Node.js line. It separately copies and builds
the default template outside the workspace, ensuring root dependency hoisting
cannot hide template defects.

## Default template

`templates/default/` is a standalone Astro project rather than an npm
workspace. It owns its dependencies and lockfile so the same directory can be
copied outside this repository without relying on workspace hoisting. Run its
commands from the template directory:

```sh
cd templates/default
npm ci
npm run typecheck
npm run build
npm run preview
```

The publishable package locations are:

- `packages/create-forge/` for the project generator; and
- `packages/content-model/` for the content-model core and bundled adapters.

Each package uses the `files` field in its manifest as a publication allowlist.
Generated artifacts, dependencies, coverage, local environment files, and editor
state are excluded from Git, while source and documentation remain tracked. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the complete contributor workflow.

## License

Licensed under the MIT License.
