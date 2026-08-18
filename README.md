# Forge

> An opinionated foundation for modern, content-driven websites.

Forge is an open-source starter maintained by **RM Industries** that combines a modern static-site architecture with production-ready tooling, security, and automation.

Instead of spending hours configuring a new repository, Forge provides sensible defaults so you can focus on building your website.

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
`quality`. Until repository tooling is added, these commands provide the
workspace orchestration smoke test and skip package scripts that do not exist.

Once static tooling is configured, repository-wide formatting, Markdown
linting, spelling, and similar checks run once from the root across both root
files and workspace files. Package-specific type checking, tests, builds,
packing, and specialized checks fan out through npm workspaces. We avoid running
the same formatter once at the root and again per workspace over overlapping
files.

```sh
npm run quality
```

The publishable package locations are:

- `packages/create-forge/` for the project generator; and
- `packages/content-model/` for the content-model core and bundled adapters.

## License

Licensed under the MIT License.
