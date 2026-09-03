# Forge

![Forge logo](docs/assets/forge-logo.svg)

Forge creates an opinionated Astro website for publishing structured content.
The generated project includes a responsive article site, Sveltia CMS, RSS and
sitemap output, accessible navigation, quality checks, security automation, and
a gated GitHub Pages deployment.

Forge is maintained by [RM Industries](https://github.com/rm-industries).

## Requirements

- Node.js `22.22.2` or newer within the 22.x line, Node.js 24.x, or Node.js
  26.x;
- npm 10.9.x or 11.x; and
- Git, unless project initialization is disabled with `--no-git`.

Other package managers and older Node.js releases are not supported. See the
[compatibility and support policy](docs/support-policy.md) for operating-system,
browser, dependency, and prerelease support details.

## Create a site

Run the initializer from the directory that should contain the new project:

```sh
npm create @rm-industries/forge
```

The interactive flow asks for a destination, package and site metadata, and
whether to install dependencies and initialize Git. Forge creates a `main`
branch but does not stage files or create a commit.

For a non-interactive project using documented defaults:

```sh
npm create @rm-industries/forge -- my-site --yes
cd my-site
npm run dev
```

Pass `--help` to see every input, including site metadata, canonical URL,
repository, installation, and Git options:

```sh
npm create @rm-industries/forge -- --help
```

Generation refuses unsafe destination paths and requires confirmation before it
writes to a non-empty directory. If copying or customization fails, Forge
restores overwritten files when possible. A failed dependency installation or
Git command leaves the generated source in place and reports how to retry.

## What is generated

Each new project is an independent repository that contains:

- an Astro static site with home, about, article index, article detail, and 404
  pages;
- a shared content model that configures Astro collections and Sveltia CMS;
- example Markdown articles, draft filtering, pagination, RSS, sitemap,
  `robots.txt`, and a web app manifest;
- reusable layouts, metadata, navigation, cards, and Catppuccin-based light and
  dark themes built with DaisyUI and Tailwind CSS;
- local Fira Sans and Fira Code fonts without a remote font request;
- unit, browser, accessibility, build-output, and Lighthouse checks;
- formatting, code, CSS, Markdown, spelling, type, dependency, and unused-code
  checks; and
- GitHub Actions for continuous integration, security analysis, dependency
  updates, and quality-gated GitHub Pages deployment.

These claims are covered by the generator fixture suite and the standalone
template checks run by Forge continuous integration. See
[continuous integration](docs/continuous-integration.md) for the evidence model.

## Customize the generated project

Start with these files:

- `src/config/site.ts` defines the site name, description, author, canonical
  URL, repository, language, social image, navigation, and social links.
- `src/config/content-models/` defines structured collections once for both
  Astro and Sveltia.
- `src/content/articles/` contains the example Markdown articles.
- `src/pages/` contains routes, including the Sveltia editor at `/admin/`.
- `src/components/` and `src/layouts/` contain reusable presentation pieces.
- `src/styles/` and `src/themes/` contain global, print, font, and theme
  configuration.

The generated [project README](templates/default/README.md) explains the
starter defaults, content model, styling, fonts, and local commands. The
[GitHub Pages guide](templates/default/docs/github-pages.md) covers repository
settings, project-path URLs, custom domains, deployment evidence, and recovery.

Generated projects are owned source rather than managed Forge installations.
Running a newer generator does not update an existing project. Dependency
updates arrive through npm and Dependabot; source changes require a reviewed
manual migration.

## Generated-project commands

Run these inside the generated project:

| Command                     | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `npm run dev`               | Start the local Astro development server.                      |
| `npm run build`             | Create the production site in `dist/`.                         |
| `npm run preview`           | Serve the production build locally.                            |
| `npm run quality`           | Run the complete static, unit, build, browser, and performance |
|                             | gate.                                                          |
| `npm run quality:core`      | Run checks that do not require the browser suite.              |
| `npm run quality:static`    | Run formatting, linting, type, Astro, unused-code, and audit   |
|                             | checks.                                                        |
| `npm run format:fix`        | Apply Oxfmt formatting.                                        |
| `npm run lint:code:fix`     | Apply safe Oxlint fixes.                                       |
| `npm run lint:css:fix`      | Apply safe Stylelint fixes.                                    |
| `npm run lint:markdown:fix` | Apply safe Markdownlint fixes.                                 |
| `npm test`                  | Run unit tests.                                                |
| `npm run test:e2e`          | Run the Playwright browser suite.                              |
| `npm run test:a11y`         | Run the focused browser accessibility suite.                   |
| `npm run test:coverage`     | Run unit tests with coverage enforcement.                      |
| `npm run lighthouse:ci`     | Build and run the Lighthouse budgets.                          |
| `npm run audit`             | Check the installed dependency graph against audit policy.     |

The committed lockfile makes `npm ci` the supported installation command.
Browser checks require the Playwright browsers installed by the generated
workflow or by `npx playwright install` locally.

## Generated-project structure

```text
.
├── .github/                # CI, security, dependency, and deployment automation
├── docs/                   # Accessibility, performance, and deployment guidance
├── public/                 # Static assets copied unchanged to the build
├── scripts/                # Production-build validation
├── src/
│   ├── components/         # Navigation, metadata, theme, and UI primitives
│   ├── config/             # Site, deployment, and shared content models
│   ├── content/            # Markdown content managed by Astro and Sveltia
│   ├── integrations/       # Sveltia configuration and preview adapters
│   ├── layouts/            # Shared document layout
│   ├── lib/                # Article, navigation, and path helpers
│   ├── pages/              # Astro routes, feeds, manifest, robots, and CMS
│   ├── styles/             # Global and print styles
│   └── themes/             # Catppuccin theme definitions
└── tests/                  # Browser, accessibility, navigation, and theme tests
```

## Packages and versioning

Forge publishes two independently versioned packages:

- [`@rm-industries/create-forge`](packages/create-forge/README.md) is the
  project initializer and bundles the reviewed template snapshot.
- [`@rm-industries/content-model`](packages/content-model/README.md) provides
  integration-neutral models plus Astro and Sveltia adapters.

Stable releases use npm's `latest` tag, while prereleases use `next`. Generated
projects pin the content-model version proven with their template. The
[package release guide](docs/package-releases.md) documents tags, protected
publication, provenance, dry runs, and recovery.

## Contributing

This repository uses npm workspaces for `packages/*`; `templates/default/` is a
standalone project with its own lockfile so tests cannot rely on workspace
hoisting. To validate repository changes:

```sh
npm ci
npm run quality
npm run audit
npm run verify:template
```

`npm run quality` covers formatting, linting, spelling, types, tests, builds,
and package contents. The registry-backed audit and isolated template check are
explicit because they have different network and runtime requirements.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the review workflow, CI expectations,
and template-specific checks. The
[documentation validation guide](docs/documentation-validation.md) explains
link and critical-command checks. Architecture decisions live in
[`docs/decisions/`](docs/decisions/README.md).

## Support and security

- Use [GitHub Issues](https://github.com/rm-industries/forge/issues) for
  reproducible defects and feature proposals.
- Read the [support policy](docs/support-policy.md) before reporting a runtime,
  platform, browser, or dependency compatibility problem.
- Follow [SECURITY.md](SECURITY.md) to report vulnerabilities privately. Do not
  disclose security issues in a public issue.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) when participating in the
  project.

## License

Forge is licensed under the [MIT License](LICENSE).
