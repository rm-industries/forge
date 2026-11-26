# Working on Forge

- `packages/` holds the npm workspaces. [`create-forge`](packages/create-forge/README.md)
  bundles and ships the default site template. The other packages provide the
  shared content model, browser formatter, and Markdown frontmatter lint rule.
- [`templates/default/`](templates/default/README.md) is a standalone Astro
  project outside the npm workspace. Read its README for the stack, site
  conventions, and project-local checks.
- [`website/`](website/README.md) is the Forge documentation site and has its own
  dependencies and lockfile.

## Focused verification

After installing root dependencies with `npm ci`, run these commands from the
repository root:

- **Template changes:** `npm run verify:template` and
  `npm run test:template:customization`.
- **Generator changes:** `npm run verify:package --workspace @rm-industries/create-forge`
  and `npm run test:generator:e2e`. Run these checks for template changes that
  affect what the generator ships or scaffolds.
- **Documentation changes:** `npm run docs:check`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development and review workflow
and [Package releases](README.md#package-releases) for release preparation and
publication.
